import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createPiece, disposePieceAssets, type PieceFamily, type MaterialStyle } from './pieces';
import { buildWorld, type BuiltWorld } from './world';
import type { Position, Action } from '../engine/types';
import { squareIndex, macroIndex, macroOfSquare, macroSquares, inCheck } from '../engine/position';

type CameraPreset = 'white' | 'black' | 'overview' | 'top';
type Theme = 'gallery' | 'nocturne' | 'daylight';
type Quality = 'low' | 'balanced' | 'high';
interface Appearance { theme: Theme; family: PieceFamily; material: MaterialStyle; quality: Quality; reducedMotion: boolean }
interface Highlights { selectedSquare: number | null; selectedTile: number | null; legalActions: Action[]; showMoves: boolean; showShifts: boolean; focusSquare: number | null }
const TILE_FINISHES = {
  gallery: { light: 0xbacdc6, dark: 0x344957, edge: 0x303c45, trim: 0xbd9e60, fill: 0x84bcd4 },
  nocturne: { light: 0xa6bbd1, dark: 0x263650, edge: 0x202838, trim: 0x8c99c1, fill: 0x8093ff },
  daylight: { light: 0xe6d6b7, dark: 0x5c5548, edge: 0x705138, trim: 0xb89354, fill: 0xe2f5ff },
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
  private world: BuiltWorld | null = null;
  private effects = new THREE.Group();
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private materialCache = new Map<string, THREE.Material>();
  private highlightKey = '';
  private hoveredTile: number | null = null;
  private availableTiles = new Set<number>();
  private exhibiting = false;
  private showcaseStarted = 0;
  private riftPulse = 0;
  private composer: EffectComposer | null = null;
  private cameraTravel: { start: number; duration: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; target: THREE.Vector3 } | null = null;
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

  constructor(private container: HTMLElement, private onPick: (square: number, tile: number, kind?: 'piece' | 'tile' | 'shift') => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.className = 'board-canvas';
    container.append(this.renderer.domElement);
    this.scene.add(this.board, this.furniture, this.highlights, this.effects);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.4;
    room.dispose();
    pmrem.dispose();
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }); target.samples = 2;
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), .32, .35, 1.3));
    this.composer.addPass(new OutputPass());
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.enablePan = false;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 28;
    this.controls.minPolarAngle = 0.015;
    this.controls.maxPolarAngle = Math.PI * 0.43;
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
  private cameraGesture = () => { this.dragged = true; this.cameraTravel = null; this.exhibiting = false; };
  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) { this.pressed = null; this.dragged = true; return; }
    this.pressed = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    this.dragged = false;
  };
  private pointerMove = (event: PointerEvent) => {
    if (this.pressed && Math.hypot(event.clientX - this.pressed.x, event.clientY - this.pressed.y) > 6) this.dragged = true;
    if (!this.pressed && !this.animation) {
      const hit = this.hit(event.clientX, event.clientY); this.hoveredTile = hit && this.availableTiles.has(hit.tile) ? hit.tile : null;
      this.renderer.domElement.style.cursor = hit?.kind === 'piece' || hit?.kind === 'shift' || this.hoveredTile !== null ? 'pointer' : 'default';
    }
  };
  private pointerCancel = () => { this.pressed = null; this.dragged = true; };
  private pointerUp = (event: PointerEvent) => {
    const press = this.pressed;
    this.pressed = null;
    if (!press || event.button !== 0 || event.pointerId !== press.pointerId || this.dragged || this.animation) return;
    const hit = this.hit(event.clientX, event.clientY); if (hit) this.onPick(hit.square, hit.tile, hit.kind);
  };
  private hit(x: number, y: number): { square: number; tile: number; kind: 'piece' | 'tile' | 'shift' } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), this.camera);
    for (const hit of this.ray.intersectObjects([this.highlights, this.board], true)) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.hitKind === 'shift') { const tile = object.userData.tile as number; return { square: macroSquares(tile)[0]!, tile, kind: 'shift' }; }
        if (Number.isInteger(object.userData.square)) { const square = object.userData.square as number; return { square, tile: macroOfSquare(square), kind: object.userData.hitKind === 'piece' ? 'piece' : 'tile' }; }
        if (Number.isInteger(object.userData.tile)) { const tile = object.userData.tile as number; return { square: macroSquares(tile)[0]!, tile, kind: 'tile' }; }
        object = object.parent;
      }
    }
    const intersection = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (intersection && Math.abs(intersection.x) < 4 && Math.abs(intersection.z) < 4) {
      const square = Math.floor(3.999 - intersection.z) * 8 + Math.floor(intersection.x + 4);
      return { square, tile: macroOfSquare(square), kind: 'tile' };
    }
    return null;
  }

  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    const maxRatio = this.appearance.quality === 'low' ? 1 : this.appearance.quality === 'high' ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio));
    this.renderer.setSize(width, height);
    this.composer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxRatio)); this.composer?.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.fov = width / height < 0.9 ? 49 : 37;
    this.camera.updateProjectionMatrix();
  }

  private renderFrame = (now: number) => {
    if (this.disposed) return;
    if (this.lastFrame) {
      const dt = now - this.lastFrame;
      if (dt > 0 && !document.hidden) { this.frameTimes.push(dt); if (this.frameTimes.length > 1800) this.frameTimes.shift(); }
    }
    this.lastFrame = now;
    if (this.animation) {
      const transaction = this.animation;
      const t = Math.min(1, (now - transaction.start) / transaction.duration);
      transaction.update(t);
      if (t === 1 && this.animation === transaction) { this.animation = null; transaction.finish(); }
    } else {
      for (const [tile, group] of this.tiles) { const lift = this.appearance.reducedMotion ? 0 : tile === this.highlightState.selectedTile ? .11 : tile === this.hoveredTile ? .025 : 0; group.position.y += (lift - group.position.y) * .20; }
    }
    if (this.cameraTravel) { const travel = this.cameraTravel; const t = ease(Math.min(1, (now - travel.start) / travel.duration)); this.camera.position.lerpVectors(travel.from, travel.to, t); this.controls.target.lerpVectors(travel.fromTarget, travel.target, t); if (t === 1) this.cameraTravel = null; }
    else if (this.exhibiting && !this.appearance.reducedMotion) { const a = .48 + (now - this.showcaseStarted) * .000027; this.camera.position.set(Math.sin(a) * 18.2, 6.8, Math.cos(a) * 18.2); this.controls.target.set(0, -.50, 0); }
    this.world?.tick(now / 1000, this.appearance.reducedMotion);
    const riftLight = this.world?.lights.children.find(light => light.userData.riftLight) as THREE.PointLight | undefined; if (riftLight) riftLight.intensity += this.riftPulse * 24;
    this.controls.update();
    this.renderer.info.reset();
    if (this.composer && this.appearance.quality !== 'low') this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.renderFrame);
  };

  private material(color: number, metalness = 0, roughness = 0.5) {
    const key = `${color}:${metalness}:${roughness}`; let material = this.materialCache.get(key) as THREE.MeshStandardMaterial | undefined;
    if (!material) { material = new THREE.MeshStandardMaterial({ color, metalness, roughness }); this.materialCache.set(key, material); } return material;
  }
  private box(width: number, height: number, depth: number, material: THREE.Material, radius = 0.03) {
    const key = `box:${width}:${height}:${depth}:${radius}`; let geometry = this.geometryCache.get(key); if (!geometry) { geometry = new RoundedBoxGeometry(width, height, depth, 2, radius); this.geometryCache.set(key, geometry); }
    const mesh = new THREE.Mesh(geometry, material); mesh.userData.rendererShared = true;
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private clear(group: THREE.Group) {
    group.traverse(object => {
      if (object.userData.sharedPieceAsset || object.userData.rendererShared) return;
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
    if (this.world) { this.scene.remove(this.world.group, this.world.lights); this.world.dispose(); }
    this.clear(this.furniture);
    this.world = buildWorld(this.appearance.theme, this.appearance.quality);
    this.scene.add(this.world.group, this.world.lights);
    this.scene.background = this.world.background; this.scene.fog = this.world.fog;
    this.renderer.toneMappingExposure = this.world.exposure; this.scene.environmentIntensity = this.world.environmentIntensity;
    const labelColor = this.appearance.theme === 'daylight' ? '#59432b' : '#dfc897';
    for (let i = 0; i < 8; i++) for (const far of [false, true]) {
      const file = this.label(String.fromCharCode(97 + i), labelColor); file.position.set(i - 3.5, .02, far ? -4.26 : 4.26); if (far) file.rotation.z = Math.PI; this.furniture.add(file);
      const rank = this.label(String(i + 1), labelColor); rank.position.set(far ? 4.26 : -4.26, .02, 3.5 - i); this.furniture.add(rank);
    }
  }

  private buildBoard(position: Position) {
    this.clear(this.board); this.pieces.clear(); this.tiles.clear();
    const colors = TILE_FINISHES[this.appearance.theme];
    for (let tile = 0; tile < 16; tile++) {
      if (position.holes & (1 << tile)) continue;
      const group = new THREE.Group(); group.position.copy(tilePoint(tile)); group.userData.tile = tile;
      const base = this.box(1.95, .40, 1.95, this.material(colors.edge, .46, .34), .07); base.position.y = -.31; group.add(base);
      const topLip = this.box(1.98, .05, 1.98, this.material(colors.trim, .65, .32), .04); topLip.position.y = -.11; group.add(topLip);
      const lowerTrim = this.box(1.88, .04, 1.88, this.material(colors.trim, .62, .35), .025); lowerTrim.position.y = -.52; group.add(lowerTrim);
      const undercarriage = this.box(1.58, .15, 1.58, this.material(0x16282e, .6, .48), .09); undercarriage.position.y = -.615; group.add(undercarriage);
      for (const z of [-.968, .968]) { const seam = this.box(1.45, .026, .015, this.material(0x71c8c1, .4, .25), .004); seam.position.set(0, -.28, z); group.add(seam); }
      for (const square of macroSquares(tile)) {
        const center = point(square).sub(tilePoint(tile));
        const light = (square % 8 + Math.floor(square / 8)) % 2 !== 0;
        const surface = this.box(.958, .09, .958, this.material(light ? colors.light : colors.dark, .1, .48), .018);
        surface.position.copy(center).multiplyScalar(.972); surface.position.y = -.045; surface.userData.square = square; group.add(surface);
        const code = position.board[square];
        if (code) {
          const piece = createPiece(code, this.appearance.family, this.appearance.material);
          piece.position.copy(center); piece.userData.square = square; piece.userData.hitKind = 'piece';
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
    const from = action.type === 'shift' ? macroIndex(action.from) : squareIndex(action.from);
    const to = action.type === 'shift' ? macroIndex(action.to) : squareIndex(action.to);
    const moving = action.type === 'shift' ? this.tiles.get(from) : this.pieces.get(from);
    if (!moving) { this.buildBoard(position); return; }
    if (action.type === 'move') this.board.attach(moving);
    const start = moving.position.clone();
    const end = action.type === 'shift' ? tilePoint(to) : point(to);
    const knight = action.type === 'move' && Math.abs(previous.board[from]) === 2;
    const victimSquare = action.en_passant ? previous.ep_pawn : action.type === 'move' ? to : -1;
    const victim = this.pieces.get(victimSquare);
    if (victim && victim !== moving) this.board.attach(victim);
    const rookSquare = action.castle ? (previous.side === 1 ? 0 : 56) + (action.castle === 1 ? 7 : 0) : -1;
    const rook = this.pieces.get(rookSquare);
    if (rook) this.board.attach(rook);
    const rookStart = rook?.position.clone();
    const rookEnd = rook ? point((previous.side === 1 ? 0 : 56) + (action.castle === 1 ? 5 : 3)) : null;
    const passenger = action.type === 'shift' && macroSquares(from).some(square => previous.board[square] !== 0);
    const duration = action.type === 'shift' ? passenger ? 780 : 700 : knight ? 340 : victim || action.promotion ? 330 : 280;
    const victimStart = victim?.position.clone();
    const victimFade = victim && victim !== moving ? this.fadePiece(victim) : null;
    const capture = victimStart ? this.captureEffect(victimStart) : null;
    const promotion = action.promotion ? this.promotionEffect(previous, position, action, moving) : null;
    const shift = action.type === 'shift' ? this.shiftEffect(start, end) : null;
    if (shift) this.bumpRift(passenger ? .72 : .48);
    if (capture) this.bumpRift(.88);
    return new Promise<void>(resolve => {
      let finished = false;
      this.animation = {
        start: performance.now(), duration,
        update: t => {
          const progress = ease(t);
          if (shift) {
            const travel = ease(THREE.MathUtils.clamp((t - .10) / .80, 0, 1));
            const lift = t < .18 ? ease(t / .18) : t > .82 ? ease((1 - t) / .18) : 1;
            moving.position.lerpVectors(start, end, travel); moving.position.y += .25 * lift;
            shift.update(t);
            this.riftPulse = Math.max(.08, (t < .18 || t > .78 ? .72 : .22) * (1 - Math.abs(.5 - t)));
          } else {
            moving.position.lerpVectors(start, end, progress);
            moving.position.y += Math.sin(Math.PI * t) * (knight ? .86 : .13);
          }
          if (victimFade) {
            const fade = THREE.MathUtils.clamp((t - .10) / .65, 0, 1);
            victimFade.opacity(1 - fade);
            if (victim) { victim.position.y = victimStart!.y + fade * .12; victim.rotation.z = fade * -.16; }
            capture?.update(fade);
          }
          if (rook && rookStart && rookEnd) rook.position.lerpVectors(rookStart, rookEnd, progress);
          promotion?.update(t);
        },
        finish: () => {
          if (finished) return;
          finished = true;
          victimFade?.restore(); promotion?.restore(); this.riftPulse = 0;
          this.clear(this.effects); this.buildBoard(position); resolve();
        },
      };
    });
  }

  private fadePiece(piece: THREE.Group) {
    const restores: Array<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[]; clones: THREE.Material[] }> = [];
    piece.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material as THREE.Material | THREE.Material[];
      const originals = Array.isArray(material) ? material : [material];
      const clones = originals.map(original => {
        const clone = original.clone() as THREE.Material & { opacity: number; transparent: boolean; depthWrite: boolean };
        clone.transparent = true; clone.depthWrite = false; clone.opacity = 1;
        return clone;
      });
      object.material = Array.isArray(material) ? clones : clones[0]!;
      restores.push({ mesh: object, material, clones });
    });
    return {
      opacity: (value: number) => restores.forEach(({ clones }) => clones.forEach(clone => (clone as THREE.Material & { opacity: number }).opacity = value)),
      restore: () => restores.forEach(({ mesh, material, clones }) => { mesh.material = material; clones.forEach(clone => clone.dispose()); }),
    };
  }

  private shiftEffect(start: THREE.Vector3, end: THREE.Vector3) {
    const group = new THREE.Group(); const materials: Array<THREE.Material & { opacity: number }> = [];
    const colors = TILE_FINISHES[this.appearance.theme];
    const energy = (opacity: number) => {
      const material = new THREE.MeshBasicMaterial({ color: colors.fill, transparent: true, opacity, depthWrite: false });
      materials.push(material); return material;
    };
    const delta = end.clone().sub(start); const length = delta.length(); const direction = delta.normalize();
    const side = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(.63);
    const center = start.clone().lerp(end, .5); center.y = -.52;
    for (const sign of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, length), energy(.08));
      rail.position.copy(center).addScaledVector(side, sign); rail.rotation.y = Math.atan2(direction.x, direction.z); group.add(rail);
    }
    for (const point of [start, end]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.54, .027, 8, 36), energy(.38));
      ring.rotation.x = Math.PI / 2; ring.position.copy(point); ring.position.y = -.37; group.add(ring);
    }
    this.effects.add(group);
    return { update: (t: number) => {
      const glow = .12 + Math.sin(Math.PI * t) * .34;
      materials.forEach(material => material.opacity = glow);
      group.children.slice(-2).forEach((ring, index) => ring.scale.setScalar(.72 + (index === 1 ? t : 1 - t) * .42));
    } };
  }

  private captureEffect(origin: THREE.Vector3) {
    const group = new THREE.Group(); const materials: Array<THREE.Material & { opacity: number }> = [];
    const colors = TILE_FINISHES[this.appearance.theme];
    const material = (color: number, opacity: number) => {
      const value = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }); materials.push(value); return value;
    };
    const pulse = new THREE.Mesh(new THREE.TorusGeometry(.18, .028, 8, 32), material(colors.trim, .92));
    pulse.rotation.x = Math.PI / 2; pulse.position.copy(origin); pulse.position.y += .045; group.add(pulse);
    const wisps: THREE.Mesh[] = [];
    for (let index = 0; index < 6; index++) {
      const wisp = new THREE.Mesh(new THREE.CylinderGeometry(.012, .035, .3, 6), material(index % 2 ? colors.trim : colors.fill, .78));
      const angle = index / 6 * Math.PI * 2; wisp.position.copy(origin).add(new THREE.Vector3(Math.cos(angle) * .14, .12, Math.sin(angle) * .14)); wisp.rotation.z = Math.sin(angle) * .24;
      wisps.push(wisp); group.add(wisp);
    }
    this.effects.add(group);
    return { update: (t: number) => {
      pulse.scale.setScalar(.7 + t * 2.2); materials.forEach(value => value.opacity = Math.max(0, .88 * (1 - t)));
      wisps.forEach((wisp, index) => { wisp.position.y = origin.y + .12 + t * (.42 + index * .035); wisp.rotation.y = t * (index % 2 ? -1.8 : 1.8); });
    } };
  }

  private promotionEffect(previous: Position, position: Position, action: Action, moving: THREE.Group) {
    const fromTile = action.type === 'shift' ? macroIndex(action.from) : -1;
    const toTile = action.type === 'shift' ? macroIndex(action.to) : -1;
    const deltaFile = (toTile % 4 - fromTile % 4) * 2;
    const deltaRank = (Math.floor(toTile / 4) - Math.floor(fromTile / 4)) * 2;
    const source = action.type === 'move' ? squareIndex(action.from) : macroSquares(fromTile).find(square => {
      const piece = Math.abs(previous.board[square]);
      return (piece === 1 || piece === 7) && Math.floor(square / 8) + deltaRank === (previous.board[square] > 0 ? 7 : 0);
    });
    const destination = action.type === 'move' ? squareIndex(action.to) : source === undefined ? -1 : source + deltaFile + deltaRank * 8;
    if (source === undefined || !previous.board[source] || !position.board[destination]) return null;
    let pawn: THREE.Group | undefined;
    moving.traverse(object => { if (object.userData.square === source) pawn = object as THREE.Group; });
    const pawnFade = pawn ? this.fadePiece(pawn) : null;
    const revealed = createPiece(position.board[destination], this.appearance.family, this.appearance.material);
    revealed.position.copy(point(destination)); if (position.board[destination] < 0) revealed.rotation.y = Math.PI;
    const revealFade = this.fadePiece(revealed); revealFade.opacity(0); this.board.add(revealed);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.22, .025, 8, 36), new THREE.MeshBasicMaterial({ color: TILE_FINISHES[this.appearance.theme].trim, transparent: true, opacity: .9, depthWrite: false }));
    ring.rotation.x = Math.PI / 2; ring.position.copy(point(destination, .04)); this.effects.add(ring);
    return {
      update: (t: number) => {
        const reveal = THREE.MathUtils.clamp((t - .63) / .28, 0, 1); pawnFade?.opacity(1 - reveal); revealFade.opacity(reveal);
        ring.scale.setScalar(.7 + reveal * 2.1); (ring.material as THREE.MeshBasicMaterial).opacity = (1 - reveal) * .9;
      },
      restore: () => { pawnFade?.restore(); revealFade.restore(); revealed.removeFromParent(); },
    };
  }

  private bumpRift(amount: number) {
    this.riftPulse = Math.max(this.riftPulse, amount);
  }

  skipAnimation() {
    if (this.animation) { const transaction = this.animation; this.animation = null; transaction.finish(); }
  }

  setHighlights(highlights: Highlights) {
    const key = `${highlights.selectedSquare}:${highlights.selectedTile}:${highlights.showMoves}:${highlights.showShifts}:${highlights.focusSquare}:${highlights.legalActions.map(action => action.id).join(',')}`;
    this.highlightState = highlights; this.availableTiles = new Set(highlights.legalActions.filter(a => a.type === 'shift').map(a => macroIndex(a.from)));
    if (key !== this.highlightKey) { this.highlightKey = key; if (!this.animation) this.drawHighlights(); }
  }

  private ring(square: number, color: number, radius: number, width: number) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(radius - width, radius, 48), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.copy(point(square, 0.015)); mesh.renderOrder = 5; this.highlights.add(mesh);
  }

  private tileOutline(tile: number, color: number, opacity: number, width = 0.027) {
    const center = tilePoint(tile, this.highlightState.selectedTile === tile ? .15 : .042);
    for (const side of [-1, 1]) {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      const x = new THREE.Mesh(new THREE.BoxGeometry(width, 0.018, 1.9), material); x.position.copy(center).add(new THREE.Vector3(side * 0.956, 0, 0)); this.highlights.add(x);
      const z = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.018, width), material.clone()); z.position.copy(center).add(new THREE.Vector3(0, 0, side * 0.956)); this.highlights.add(z);
    }
  }

  private arrow(from: number, to: number, strong: boolean) {
    const start = tilePoint(from, strong ? .17 : .055); const end = tilePoint(to, strong ? .17 : .055);
    const direction = end.clone().sub(start).normalize();
    const center = start.addScaledVector(direction, 0.8);
    const shape = new THREE.Shape(); shape.moveTo(-0.115, -0.1); shape.lineTo(0.115, -0.1); shape.lineTo(0, 0.15); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: strong ? 0xf1d190 : 0x7ae1cb, side: THREE.DoubleSide, transparent: true, opacity: strong ? 1 : 0.72, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = Math.atan2(direction.x, -direction.z) * -1;
    mesh.position.copy(center); this.highlights.add(mesh);
  }

  private shiftHandle(tile: number) {
    const handle = new THREE.Group(); handle.position.copy(tilePoint(tile, this.highlightState.selectedTile === tile ? .19 : .075));
    handle.userData.hitKind = 'shift'; handle.userData.tile = tile;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .035, 24), new THREE.MeshBasicMaterial({ color: 0x143e3e })); handle.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.15, .014, 6, 24), new THREE.MeshBasicMaterial({ color: 0xa7ffe5 })); rim.rotation.x = Math.PI / 2; rim.position.y = .02; handle.add(rim);
    for (const direction of [-1, 1]) {
      const shape = new THREE.Shape(); shape.moveTo(-.06, -.035); shape.lineTo(.01, -.035); shape.lineTo(.01, -.07); shape.lineTo(.09, 0); shape.lineTo(.01, .07); shape.lineTo(.01, .035); shape.lineTo(-.06, .035); shape.closePath();
      const arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xe1fff4 })); arrow.rotation.x = -Math.PI / 2; arrow.rotation.z = direction < 0 ? Math.PI : 0; arrow.position.set(0, .025, direction * .053); handle.add(arrow);
    }
    this.highlights.add(handle);
  }

  private drawHighlights() {
    this.clear(this.highlights);
    if (!this.position) return;
    const { selectedSquare, selectedTile, legalActions, showMoves, showShifts, focusSquare } = this.highlightState;
    if (showShifts) {
      const done = new Set<number>(); const arrows = new Set<string>();
      for (const action of legalActions) if (action.type === 'shift') {
        const tile = macroIndex(action.from); const dest = macroIndex(action.to);
        if (!done.has(tile)) { this.tileOutline(tile, 0x75e9d1, .8, .034); this.shiftHandle(tile); done.add(tile); }
        const key = `${tile}-${dest}`;
        if (!arrows.has(key)) { this.arrow(tile, dest, tile === selectedTile); arrows.add(key); }
      }
    }
    if (selectedTile !== null) {
      this.tileOutline(selectedTile, 0xffd68e, 1, .056);
      const holes = new Set<number>();
      for (const action of legalActions) if (action.type === 'shift' && macroIndex(action.from) === selectedTile) holes.add(macroIndex(action.to));
      for (const hole of holes) {
        this.tileOutline(hole, 0xffd68e, 1, .046);
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 1.78), new THREE.MeshBasicMaterial({ color: 0x57dcbf, transparent: true, opacity: .20, depthWrite: false }));
        pad.rotation.x = -Math.PI / 2; pad.position.copy(tilePoint(hole, -.035)); this.highlights.add(pad);
      }
    }
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
    this.exhibiting = false; this.cameraTravel = null;
    this.preset = preset;
    const vectors: Record<CameraPreset, [number, number, number]> = { white: [0, 10.8, 9.3], black: [0, 10.8, -9.3], overview: [8.6, 11.8, 8.6], top: [0, 16.2, 2.7] };
    this.camera.position.set(...vectors[preset]); this.controls.target.set(0, 0.15, 0); this.controls.update();
  }

  orbit(dx: number, dy: number, zoom = 0) {
    this.exhibiting = false; this.cameraTravel = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += dx; spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy, this.controls.minPolarAngle, this.controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius + zoom, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); this.controls.update();
  }

  showcase(): void {
    this.cameraTravel = null; this.exhibiting = true; this.showcaseStarted = performance.now();
    this.camera.position.set(8.4, 6.8, 16.1); this.controls.target.set(0, -.50, 0); this.controls.update();
  }

  enterPlay(duration = 900): void {
    const from = this.camera.position.clone(); const fromTarget = this.controls.target.clone();
    this.setCamera(this.preset); const to = this.camera.position.clone(); const target = this.controls.target.clone();
    if (duration <= 0 || this.appearance.reducedMotion) return;
    this.camera.position.copy(from); this.controls.target.copy(fromTarget);
    this.cameraTravel = { start: performance.now(), duration, from, to, fromTarget, target };
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
      p99Ms: frames[Math.floor(frames.length * .99)] ?? null, maxMs: frames.at(-1) ?? null,
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), quality: this.appearance.quality,
      width: this.renderer.domElement.width, height: this.renderer.domElement.height, memory: { ...this.renderer.info.memory }, calls: this.renderer.info.render.calls, callsScope: 'complete scene, shadows and postprocessing', preset: this.preset, shiftTiles: [...this.availableTiles], cameraDistance: this.camera.position.distanceTo(this.controls.target) };
  }

  resetMetrics() { this.frameTimes.length = 0; this.lastFrame = 0; }

  dispose() {
    this.skipAnimation(); this.disposed = true; cancelAnimationFrame(this.frame); this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown); this.renderer.domElement.removeEventListener('pointermove', this.pointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.pointerUp); this.renderer.domElement.removeEventListener('pointercancel', this.pointerCancel);
    this.renderer.domElement.removeEventListener('contextmenu', this.contextMenu); this.controls.removeEventListener('start', this.cameraGesture);
    this.controls.dispose(); this.clear(this.board); this.clear(this.furniture); this.clear(this.highlights);
    this.world?.dispose(); this.clear(this.effects);
    this.geometryCache.forEach(geometry => geometry.dispose()); this.materialCache.forEach(material => material.dispose()); this.geometryCache.clear(); this.materialCache.clear();
    if (this.composer) { for (const pass of this.composer.passes) pass.dispose(); this.composer.dispose(); }
    disposePieceAssets(); this.environment.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
