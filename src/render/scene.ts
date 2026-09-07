import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createPiece, disposePieceAssets, type PieceFamily, type MaterialStyle } from './pieces';
import type { Position, Action } from '../engine/types';
import { squareIndex, macroIndex, macroOfSquare, macroSquares, inCheck } from '../engine/position';

type CameraPreset = 'white' | 'black' | 'overview' | 'top';
type Theme = 'gallery' | 'nocturne' | 'daylight';
type Quality = 'low' | 'balanced' | 'high';
interface Appearance { theme: Theme; family: PieceFamily; material: MaterialStyle; quality: Quality; reducedMotion: boolean }
interface Highlights { selectedSquare: number | null; selectedTile: number | null; legalActions: Action[]; showMoves: boolean; showShifts: boolean; focusSquare: number | null }
const THEMES = {
  gallery: { background: 0x0a121a, floor: 0x101c26, light: 0xbacdc6, dark: 0x344957, edge: 0x303c45, trim: 0xbd9e60, key: 0xfff1d6, fill: 0x84bcd4 },
  nocturne: { background: 0x060914, floor: 0x11172b, light: 0xa6bbd1, dark: 0x263650, edge: 0x202838, trim: 0x8c99c1, key: 0xcbdcff, fill: 0x8093ff },
  daylight: { background: 0xc9d4d4, floor: 0xb5c4c5, light: 0xe6d6b7, dark: 0x5c5548, edge: 0x705138, trim: 0xb89354, key: 0xfff0d4, fill: 0xe2f5ff },
};
const point = (square: number, y = 0) => new THREE.Vector3((square % 8) - 3.5, y, 3.5 - Math.floor(square / 8));
const tilePoint = (tile: number, y = 0) => new THREE.Vector3((tile % 4) * 2 - 3, y, 3 - Math.floor(tile / 4) * 2);
const ease = (v: number) => v * v * (3 - 2 * v);

/** Renders committed board states. Picking returns coordinate IDs, never legal moves. */
export class BoardScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  private controls: OrbitControls;
  private board = new THREE.Group();
  private furniture = new THREE.Group();
  private highlights = new THREE.Group();
  private ray = new THREE.Raycaster();
  private position: Position | null = null;
  private pieces = new Map<number, THREE.Group>();
  private tiles = new Map<number, THREE.Group>();
  private lights = new THREE.Group();
  private appearance: Appearance = { theme: 'gallery', family: 'classic', material: 'ceramic', quality: 'balanced', reducedMotion: false };
  private highlightState: Highlights = { selectedSquare: null, selectedTile: null, legalActions: [], showMoves: false, showShifts: true, focusSquare: null };
  private frame = 0;
  private resizeObserver: ResizeObserver;
  private disposed = false;
  private pressed: { x: number; y: number; pointerId: number } | null = null;
  private dragged = false;
  private animation: { start: number; duration: number; update: (t: number) => void; finish: () => void } | null = null;
  private environment: THREE.WebGLRenderTarget;
  private preset: CameraPreset = 'white';
  private lastFrame = 0;
  private frameTimes: number[] = [];

  constructor(private container: HTMLElement, private onPick: (square: number, tile: number) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(THEMES.gallery.background);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.className = 'board-canvas';
    container.append(this.renderer.domElement);
    this.scene.add(this.board, this.furniture, this.highlights, this.lights);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.4;
    room.dispose();
    pmrem.dispose();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 24;
    this.controls.minPolarAngle = 0.015;
    this.controls.maxPolarAngle = Math.PI * 0.36;
    this.controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } as unknown as typeof this.controls.mouseButtons;
    this.controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE } as unknown as typeof this.controls.touches;
    this.controls.target.set(0, 0, 0);
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.pointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.pointerCancel);
    this.renderer.domElement.addEventListener('contextmenu', this.contextMenu);
    this.controls.addEventListener('start', this.cameraGesture);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    document.addEventListener('visibilitychange', this.visibilityChange);
    this.buildEnvironment();
    this.setCamera('white');
    this.resize();
    this.renderFrame(performance.now());
  }

  private contextMenu = (event: Event) => event.preventDefault();
  private visibilityChange = () => { this.lastFrame = 0; };
  private cameraGesture = () => { this.dragged = true; };
  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) { this.pressed = null; this.dragged = true; return; }
    this.pressed = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    this.dragged = false;
  };
  private pointerMove = (event: PointerEvent) => {
    if (this.pressed && Math.hypot(event.clientX - this.pressed.x, event.clientY - this.pressed.y) > 6) this.dragged = true;
  };
  private pointerCancel = () => { this.pressed = null; this.dragged = true; };
  private pointerUp = (event: PointerEvent) => {
    const press = this.pressed;
    this.pressed = null;
    if (!press || event.button !== 0 || event.pointerId !== press.pointerId || this.dragged || this.animation) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), this.camera);
    for (const hit of this.ray.intersectObjects(this.board.children, true)) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (Number.isInteger(object.userData.square)) { const square = object.userData.square as number; this.onPick(square, macroOfSquare(square)); return; }
        object = object.parent;
      }
    }
    const intersection = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (intersection && Math.abs(intersection.x) < 4 && Math.abs(intersection.z) < 4) {
      const square = Math.floor(3.999 - intersection.z) * 8 + Math.floor(intersection.x + 4);
      this.onPick(square, macroOfSquare(square));
    }
  };

  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    const maxRatio = this.appearance.quality === 'low' ? 1 : this.appearance.quality === 'high' ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.fov = width / height < 0.9 ? 49 : 37;
    this.camera.updateProjectionMatrix();
  }

  private renderFrame = (now: number) => {
    if (this.disposed) return;
    if (this.lastFrame) {
      const dt = now - this.lastFrame;
      if (dt > 0 && !document.hidden) { this.frameTimes.push(dt); if (this.frameTimes.length > 600) this.frameTimes.shift(); }
    }
    this.lastFrame = now;
    if (this.animation) {
      const transaction = this.animation;
      const t = Math.min(1, (now - transaction.start) / transaction.duration);
      transaction.update(t);
      if (t === 1 && this.animation === transaction) { this.animation = null; transaction.finish(); }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.renderFrame);
  };

  private material(color: number, metalness = 0, roughness = 0.5) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness });
  }
  private box(width: number, height: number, depth: number, material: THREE.Material, radius = 0.03) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, radius), material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private clear(group: THREE.Group) {
    group.traverse(object => {
      if (object.userData.sharedPieceAsset) return;
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const map = (material as THREE.MeshStandardMaterial).map;
        if (map) map.dispose();
        material.dispose();
      }
    });
    group.clear();
  }

  private label(text: string, color: string) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d')!;
    context.font = '500 76px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = color;
    context.fillText(text, 64, 67);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  private buildEnvironment() {
    this.clear(this.furniture);
    this.lights.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.map?.dispose(); });
    this.lights.clear();
    const colors = THEMES[this.appearance.theme];
    this.scene.background = new THREE.Color(colors.background);
    this.scene.fog = new THREE.Fog(colors.background, 24, 52);
    this.renderer.toneMappingExposure = this.appearance.theme === 'daylight' ? 0.83 : 0.86;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), this.material(colors.floor, 0.12, 0.82));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.08; floor.receiveShadow = true; this.furniture.add(floor);
    const cavity = this.box(8.12, 0.12, 8.12, this.material(0x080f15, 0.12, 0.88), 0.06);
    cavity.position.y = -0.93; this.furniture.add(cavity);
    const falloffCanvas = document.createElement('canvas'); falloffCanvas.width = falloffCanvas.height = 128;
    const context = falloffCanvas.getContext('2d')!; const falloff = context.createRadialGradient(64, 64, 12, 64, 64, 86);
    falloff.addColorStop(0, '#060b10'); falloff.addColorStop(1, '#243946'); context.fillStyle = falloff; context.fillRect(0, 0, 128, 128);
    const falloffTexture = new THREE.CanvasTexture(falloffCanvas); falloffTexture.colorSpace = THREE.SRGBColorSpace;
    const cavityFloor = new THREE.Mesh(new THREE.PlaneGeometry(8.08, 8.08), new THREE.MeshBasicMaterial({ map: falloffTexture, transparent: true, opacity: 0.6 }));
    cavityFloor.rotation.x = -Math.PI / 2; cavityFloor.position.y = -0.862; this.furniture.add(cavityFloor);
    for (const x of [-4.22, 4.22]) { const rail = this.box(0.3, 0.28, 8.76, this.material(colors.edge, 0.65, 0.36)); rail.position.set(x, -0.16, 0); this.furniture.add(rail); }
    for (const z of [-4.22, 4.22]) { const rail = this.box(8.76, 0.28, 0.3, this.material(colors.edge, 0.65, 0.36)); rail.position.set(0, -0.16, z); this.furniture.add(rail); }
    for (const x of [-4.22, 4.22]) for (const z of [-4.22, 4.22]) {
      const foot = this.box(0.38, 0.75, 0.38, this.material(colors.trim, 0.7, 0.38), 0.07); foot.position.set(x, -0.69, z); this.furniture.add(foot);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 16), this.material(colors.trim, 0.7, 0.3)); pin.position.set(x, 0, z); this.furniture.add(pin);
    }
    const labelColor = this.appearance.theme === 'daylight' ? '#403b32' : '#d6c396';
    for (let i = 0; i < 8; i++) {
      for (const far of [false, true]) {
        const file = this.label(String.fromCharCode(97 + i), labelColor); file.position.set(i - 3.5, 0.012, far ? -4.23 : 4.23); if (far) file.rotation.z = Math.PI; this.furniture.add(file);
        const rank = this.label(String(i + 1), labelColor); rank.position.set(far ? 4.23 : -4.23, 0.012, 3.5 - i); this.furniture.add(rank);
      }
    }
    const hemi = new THREE.HemisphereLight(colors.fill, colors.floor, 0.65); this.lights.add(hemi);
    const key = new THREE.DirectionalLight(colors.key, 2.2); key.position.set(-4, 10, 5); key.castShadow = true;
    const resolution = this.appearance.quality === 'low' ? 512 : this.appearance.quality === 'high' ? 2048 : 1024;
    key.shadow.mapSize.set(resolution, resolution); key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 28; key.shadow.normalBias = 0.015; key.shadow.bias = -0.00008; key.shadow.radius = 2;
    this.lights.add(key);
    const rim = new THREE.DirectionalLight(colors.fill, this.appearance.theme === 'nocturne' ? 1.7 : 1.2); rim.position.set(5, 7, -7); this.lights.add(rim);
    const bounce = new THREE.PointLight(colors.trim, 9, 12, 2); bounce.position.set(-5, 2, -2); this.lights.add(bounce);
    if (this.appearance.theme === 'nocturne' && this.appearance.quality !== 'low') {
      const points = new Float32Array(84);
      for (let i = 0; i < 28; i++) { const a = i * 2.399963; points[i * 3] = Math.cos(a) * (15 + (i % 4)); points[i * 3 + 1] = 1 + i % 7; points[i * 3 + 2] = Math.sin(a) * (15 + (i % 4)); }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
      this.furniture.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x7a95b5, size: 0.045, transparent: true, opacity: 0.55 })));
    }
  }

  private buildBoard(position: Position) {
    this.clear(this.board); this.pieces.clear(); this.tiles.clear();
    const colors = THEMES[this.appearance.theme];
    for (let tile = 0; tile < 16; tile++) {
      if (position.holes & (1 << tile)) continue;
      const group = new THREE.Group(); group.position.copy(tilePoint(tile)); group.userData.tile = tile;
      const base = this.box(1.97, 0.4, 1.97, this.material(colors.edge, 0.4, 0.44), 0.065); base.position.y = -0.26; group.add(base);
      const lowerTrim = this.box(1.92, 0.035, 1.92, this.material(colors.trim, 0.62, 0.38), 0.025); lowerTrim.position.y = -0.46; group.add(lowerTrim);
      for (const square of macroSquares(tile)) {
        const center = point(square).sub(tilePoint(tile));
        const light = (square % 8 + Math.floor(square / 8)) % 2 !== 0;
        const surface = this.box(0.958, 0.09, 0.958, this.material(light ? colors.light : colors.dark, 0.06, 0.55), 0.018);
        surface.position.copy(center).multiplyScalar(0.972); surface.position.y = -0.045; surface.userData.square = square; group.add(surface);
        const code = position.board[square];
        if (code) {
          const piece = createPiece(code, this.appearance.family, this.appearance.material);
          piece.position.copy(center); piece.userData.square = square;
          if (code < 0) piece.rotation.y = Math.PI;
          group.add(piece); this.pieces.set(square, piece);
        }
      }
      this.tiles.set(tile, group); this.board.add(group);
    }
    this.drawHighlights();
  }

  async setPosition(position: Position, transition?: { previous: Position; action: Action }): Promise<void> {
    this.skipAnimation();
    this.position = { ...position, board: [...position.board] };
    if (!transition || this.appearance.reducedMotion) { this.buildBoard(position); return; }
    this.buildBoard(transition.previous);
    this.clear(this.highlights);
    const { previous, action } = transition;
    const moving = action.type === 'shift' ? this.tiles.get(macroIndex(action.from)) : this.pieces.get(squareIndex(action.from));
    if (!moving) { this.buildBoard(position); return; }
    if (action.type === 'move') this.board.attach(moving);
    const start = moving.position.clone();
    const end = action.type === 'shift' ? tilePoint(macroIndex(action.to)) : point(squareIndex(action.to));
    const knight = action.type === 'move' && Math.abs(previous.board[squareIndex(action.from)]) === 2;
    const victimSquare = action.en_passant ? previous.ep_pawn : action.type === 'move' ? squareIndex(action.to) : -1;
    const victim = this.pieces.get(victimSquare);
    if (victim && victim !== moving) this.board.attach(victim);
    const rookSquare = action.castle ? (previous.side === 1 ? 0 : 56) + (action.castle === 1 ? 7 : 0) : -1;
    const rook = this.pieces.get(rookSquare);
    if (rook) this.board.attach(rook);
    const rookStart = rook?.position.clone();
    const rookEnd = rook ? point((previous.side === 1 ? 0 : 56) + (action.castle === 1 ? 5 : 3)) : null;
    const duration = action.type === 'shift' ? 490 : knight ? 330 : victim || action.promotion ? 360 : 250;
    return new Promise<void>(resolve => {
      this.animation = {
        start: performance.now(), duration,
        update: t => {
          const progress = ease(t);
          moving.position.lerpVectors(start, end, progress);
          moving.position.y += Math.sin(Math.PI * t) * (action.type === 'shift' ? 0.11 : knight ? 0.9 : 0.14);
          if (victim && victim !== moving) {
            const fade = Math.min(1, Math.max(0, (t - 0.12) / 0.78));
            victim.rotation.z = fade * -0.85;
            victim.position.y = -fade * 0.35;
            victim.scale.setScalar(Math.max(0.01, 1 - fade));
          }
          if (rook && rookStart && rookEnd) rook.position.lerpVectors(rookStart, rookEnd, progress);
          if (action.promotion && t > 0.75) moving.scale.setScalar(1 - (t - 0.75) * 2.8);
        },
        finish: () => { this.buildBoard(position); resolve(); },
      };
    });
  }

  skipAnimation() {
    if (this.animation) { const transaction = this.animation; this.animation = null; transaction.finish(); }
  }

  setHighlights(highlights: Highlights) { this.highlightState = highlights; if (!this.animation) this.drawHighlights(); }

  private ring(square: number, color: number, radius: number, width: number) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(radius - width, radius, 48), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.copy(point(square, 0.015)); mesh.renderOrder = 5; this.highlights.add(mesh);
  }

  private tileOutline(tile: number, color: number, opacity: number, width = 0.027) {
    const center = tilePoint(tile, 0.018);
    for (const side of [-1, 1]) {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      const x = new THREE.Mesh(new THREE.BoxGeometry(width, 0.018, 1.9), material); x.position.copy(center).add(new THREE.Vector3(side * 0.956, 0, 0)); this.highlights.add(x);
      const z = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.018, width), material.clone()); z.position.copy(center).add(new THREE.Vector3(0, 0, side * 0.956)); this.highlights.add(z);
    }
  }

  private arrow(from: number, to: number, strong: boolean) {
    const start = tilePoint(from, 0.035); const end = tilePoint(to, 0.035);
    const direction = end.clone().sub(start).normalize();
    const center = start.addScaledVector(direction, 0.8);
    const shape = new THREE.Shape(); shape.moveTo(-0.115, -0.1); shape.lineTo(0.115, -0.1); shape.lineTo(0, 0.15); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: strong ? 0xf1d190 : 0x7ae1cb, side: THREE.DoubleSide, transparent: true, opacity: strong ? 1 : 0.72, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = Math.atan2(direction.x, -direction.z) * -1;
    mesh.position.copy(center); this.highlights.add(mesh);
  }

  private drawHighlights() {
    this.clear(this.highlights);
    if (!this.position) return;
    const { selectedSquare, selectedTile, legalActions, showMoves, showShifts, focusSquare } = this.highlightState;
    if (showShifts) {
      const done = new Set<number>(); const arrows = new Set<string>();
      for (const action of legalActions) if (action.type === 'shift') {
        const tile = macroIndex(action.from); const dest = macroIndex(action.to);
        if (!done.has(tile)) { this.tileOutline(tile, 0x74d7c2, 0.38); done.add(tile); }
        const key = `${tile}-${dest}`;
        if (!arrows.has(key)) { this.arrow(tile, dest, tile === selectedTile); arrows.add(key); }
      }
    }
    if (selectedTile !== null) this.tileOutline(selectedTile, 0xf2cc83, 1, 0.048);
    if (selectedSquare !== null) this.ring(selectedSquare, 0xf2cc83, 0.42, 0.035);
    if (focusSquare !== null && focusSquare !== selectedSquare) this.ring(focusSquare, 0xffffff, 0.45, 0.016);
    if (showMoves && selectedSquare !== null) {
      const seen = new Set<number>();
      for (const action of legalActions) if (action.type === 'move' && squareIndex(action.from) === selectedSquare) {
        const dest = squareIndex(action.to); if (seen.has(dest)) continue; seen.add(dest);
        this.ring(dest, 0x81e3cc, this.position.board[dest] || action.en_passant ? 0.42 : 0.14, this.position.board[dest] ? 0.045 : 0.11);
      }
    }
    if (inCheck(this.position, this.position.side)) {
      const king = this.position.board.indexOf(this.position.side * 6);
      if (king >= 0) this.ring(king, 0xff6e63, 0.46, 0.055);
    }
  }

  setCamera(preset: CameraPreset) {
    this.preset = preset;
    const vectors: Record<CameraPreset, [number, number, number]> = { white: [0, 11.8, 9.7], black: [0, 11.8, -9.7], overview: [9.6, 13, 9.6], top: [0, 17.2, 4.6] };
    this.camera.position.set(...vectors[preset]); this.controls.target.set(0, 0.15, 0); this.controls.update();
  }

  orbit(dx: number, dy: number, zoom = 0) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += dx; spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy, this.controls.minPolarAngle, this.controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius + zoom, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); this.controls.update();
  }

  configure(options: Partial<Appearance>) {
    this.skipAnimation();
    const next = { ...this.appearance, ...options };
    const changed = JSON.stringify(next) !== JSON.stringify(this.appearance);
    this.appearance = next;
    if (changed) { this.buildEnvironment(); if (this.position) this.buildBoard(this.position); this.resize(); }
  }

  /** Read-only instrumentation: test clicks still pass through the real canvas. */
  squareScreenPosition(square: number): { x: number; y: number } {
    const value = point(square, this.position?.board[square] ? 0.3 : 0.02).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + (value.x + 1) * rect.width / 2, y: rect.top + (1 - value.y) * rect.height / 2 };
  }

  metrics() {
    const frames = [...this.frameTimes].sort((a, b) => a - b);
    const gl = this.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { samples: frames.length, medianMs: frames[Math.floor(frames.length * 0.5)] ?? null, p95Ms: frames[Math.floor(frames.length * 0.95)] ?? null,
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), quality: this.appearance.quality,
      width: this.renderer.domElement.width, height: this.renderer.domElement.height, memory: { ...this.renderer.info.memory }, calls: this.renderer.info.render.calls, preset: this.preset };
  }

  resetMetrics() { this.frameTimes.length = 0; this.lastFrame = 0; }

  dispose() {
    this.skipAnimation(); this.disposed = true; cancelAnimationFrame(this.frame); this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown); this.renderer.domElement.removeEventListener('pointermove', this.pointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.pointerUp); this.renderer.domElement.removeEventListener('pointercancel', this.pointerCancel);
    this.renderer.domElement.removeEventListener('contextmenu', this.contextMenu); this.controls.removeEventListener('start', this.cameraGesture);
    this.controls.dispose(); this.clear(this.board); this.clear(this.furniture); this.clear(this.highlights);
    this.lights.traverse(object => { if (object instanceof THREE.DirectionalLight) object.shadow.map?.dispose(); });
    disposePieceAssets(); this.environment.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
