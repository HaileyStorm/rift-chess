import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { createPiece, disposePieceAssets, type PieceFamily, type MaterialStyle } from './pieces';
import { buildWorld, type BuiltWorld } from './world';
import { loadStoneTexture, applyStoneDetail } from './surfaces';
import type { Position, Action } from '../engine/types';
import { squareIndex, macroIndex, macroOfSquare, macroSquares, inCheck } from '../engine/position';

type CameraPreset = 'white' | 'black' | 'overview' | 'top';
type Theme = 'gallery' | 'nocturne' | 'daylight';
type Quality = 'low' | 'balanced' | 'high';
interface Appearance { theme: Theme; family: PieceFamily; material: MaterialStyle; quality: Quality; reducedMotion: boolean }
interface Highlights { selectedSquare: number | null; selectedTile: number | null; legalActions: Action[]; showMoves: boolean; focusSquare: number | null }
const TILE_FINISHES = {
  gallery: { light: 0xbacdc6, dark: 0x344957, edge: 0x303c45, trim: 0xbd9e60, fill: 0x84bcd4 },
  nocturne: { light: 0xa6bbd1, dark: 0x263650, edge: 0x202838, trim: 0x8c99c1, fill: 0x8093ff },
  daylight: { light: 0xc5d4cb, dark: 0x476b65, edge: 0x705138, trim: 0xb89354, fill: 0xe2f5ff },
};
const point = (square: number, y = 0) => new THREE.Vector3((square % 8) - 3.5, y, 3.5 - Math.floor(square / 8));
const tilePoint = (tile: number, y = 0) => new THREE.Vector3((tile % 4) * 2 - 3, y, 3 - Math.floor(tile / 4) * 2);
const ease = (v: number) => v * v * (3 - 2 * v);

/** Renders committed board states. Picking returns coordinate IDs, never legal moves. */
export class BoardScene {
  readonly renderer: THREE.WebGLRenderer;
  private rendererName: string;
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
  private tileShells: Array<{ mesh: THREE.InstancedMesh; parts: Array<{ tile: number; local: THREE.Matrix4 }> }> = [];
  private shellPositions = new Map<number, THREE.Vector3>();
  private shellMatrix = new THREE.Matrix4();
  private changedShells = new Set<number>();
  private world: BuiltWorld | null = null;
  private stoneTexture: THREE.Texture;
  private surfaceReady: Promise<void>;
  private surfaceLoaded = false;
  private reflectionCache = new Map<string, THREE.WebGLRenderTarget>();
  private assetError: string | null = null;
  private effects = new THREE.Group();
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private materialCache = new Map<string, THREE.Material>();
  private fadeMaterials = new Map<THREE.Material, Array<{ material: THREE.Material; busy: boolean }>>();
  private fadeWarmups: THREE.Mesh[] = [];
  private highlightKey = '';
  private hoveredTile: number | null = null;
  private availableTiles = new Set<number>();
  private exhibiting = false;
  private cameraMode: 'play' | 'showcase' = 'play';
  private showcaseStarted = 0;
  private riftPulse = 0;
  private checkPulse: { start: number | null; ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> } | null = null;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private fxaa: ShaderPass;
  private cameraTravel: { start: number | null; duration: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; target: THREE.Vector3; fromFov: number; toFov: number } | null = null;
  private appearance: Appearance = { theme: 'gallery', family: 'classic', material: 'ceramic', quality: 'balanced', reducedMotion: false };
  private highlightState: Highlights = { selectedSquare: null, selectedTile: null, legalActions: [], showMoves: false, focusSquare: null };
  private frame = 0;
  private resizeObserver: ResizeObserver;
  private disposed = false;
  private pressed: { x: number; y: number; pointerId: number } | null = null;
  private dragged = false;
  private cameraInteracting = false;
  private animation: { start: number | null; duration: number; update: (t: number) => void; finish: () => void } | null = null;
  private environment: THREE.WebGLRenderTarget;
  private preset: CameraPreset = 'white';
  private lastFrame = 0;
  private frameTimes: number[] = [];
  private shadowFrames = 0;
  private skippedAnimations = 0;
  private renderedFrames = 0;
  private lastRenderedAt = 0;
  private cpuFrameTimes: number[] = [];
  private sceneReady: Promise<void> = Promise.resolve();
  private readyAfterFrame: Array<() => void> = [];
  private resizePending = true;
  private drawingSize = '';
  private warmAllPrograms = false;

  constructor(private container: HTMLElement, private onPick: (square: number, tile: number, kind?: 'piece' | 'tile' | 'shift') => void) {
    const stone = loadStoneTexture(); this.stoneTexture = stone.texture;
    this.surfaceReady = stone.ready.then(() => { this.surfaceLoaded = true; if (!this.disposed) { this.applyWorldReflection(); return this.prepareScene(); } });
    void this.surfaceReady.catch(error => { this.assetError = error.message; });
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    const gl = this.renderer.getContext(), rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
    this.rendererName = rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Light transforms are fixed; only board changes and moving casters invalidate their maps.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
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
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .20, .35, 1.8);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.fxaa = new ShaderPass(FXAAShader); this.composer.addPass(this.fxaa);
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
    this.controls.addEventListener('end', this.cameraGestureEnd);
    this.resizeObserver = new ResizeObserver(() => { this.resizePending = true; });
    this.resizeObserver.observe(container);
    document.addEventListener('visibilitychange', this.visibilityChange);
    this.buildEnvironment();
    this.setCamera('white');
    this.resize();
    this.renderFrame(performance.now());
  }

  private contextMenu = (event: Event) => event.preventDefault();
  private visibilityChange = () => { this.lastFrame = 0; if (document.hidden) this.cameraInteracting = false; };
  private cameraGesture = () => { this.dragged = true; this.cameraInteracting = true; this.hoveredTile = null; this.cameraTravel = null; this.exhibiting = false; };
  private cameraGestureEnd = () => { this.cameraInteracting = false; };
  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) { this.pressed = null; this.dragged = true; return; }
    this.pressed = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    this.dragged = false;
  };
  private pointerMove = (event: PointerEvent) => {
    if (this.pressed && Math.hypot(event.clientX - this.pressed.x, event.clientY - this.pressed.y) > 6) this.dragged = true;
    if (!this.pressed && !this.animation && !this.cameraInteracting) {
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
    this.camera.updateMatrixWorld(); this.board.updateMatrixWorld(); this.highlights.updateMatrixWorld();
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), this.camera);
    const intersection = this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    const square = intersection && Math.abs(intersection.x) < 4 && Math.abs(intersection.z) < 4
      ? Math.floor(3.999 - intersection.z) * 8 + Math.floor(intersection.x + 4) : null;
    const hole = square !== null && this.position && (this.position.holes & (1 << macroOfSquare(square)))
      ? { square, tile: macroOfSquare(square), kind: 'tile' as const } : null;
    const holeDistance = hole ? this.ray.ray.origin.distanceTo(intersection!) : Infinity;
    for (const hit of this.ray.intersectObjects([this.highlights, this.board], true)) {
      // Visible pieces/handles above the board still win; geometry seen through a hole must not
      // steal its input merely because the adjacent platform has a deeper side or undercarriage.
      if (hole && hit.distance > holeDistance + .001) return hole;
      const shellTile = hit.instanceId === undefined ? undefined : hit.object.userData.instanceTiles?.[hit.instanceId];
      if (Number.isInteger(shellTile)) return { square: macroSquares(shellTile)[0]!, tile: shellTile, kind: 'tile' };
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.hitKind === 'shift') { const tile = object.userData.tile as number; return { square: macroSquares(tile)[0]!, tile, kind: 'shift' }; }
        if (Number.isInteger(object.userData.square)) { const square = object.userData.square as number; return { square, tile: macroOfSquare(square), kind: object.userData.hitKind === 'piece' ? 'piece' : 'tile' }; }
        if (Number.isInteger(object.userData.tile)) { const tile = object.userData.tile as number; return { square: macroSquares(tile)[0]!, tile, kind: 'tile' }; }
        object = object.parent;
      }
    }
    if (square !== null) return { square, tile: macroOfSquare(square), kind: 'tile' };
    return null;
  }

  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    const maxRatio = this.appearance.quality === 'low' ? 1 : this.appearance.quality === 'high' ? 2 : 1.5;
    const nextRatio = Math.min(window.devicePixelRatio || 1, maxRatio);
    const size = `${width}:${height}:${nextRatio}:${this.appearance.quality}`;
    this.resizePending = false;
    if (size === this.drawingSize) return;
    this.drawingSize = size;
    if (this.renderer.getPixelRatio() !== nextRatio) this.renderer.setPixelRatio(nextRatio);
    this.renderer.setSize(width, height);
    this.composer?.setPixelRatio(nextRatio); this.composer?.setSize(width, height);
    const bloomScale = this.appearance.quality === 'high' ? 1 : .5;
    const ratio = this.renderer.getPixelRatio(); this.bloom?.setSize(width * ratio * bloomScale, height * ratio * bloomScale);
    if (this.fxaa) { this.fxaa.enabled = this.appearance.quality !== 'high'; this.fxaa.uniforms.resolution!.value.set(1 / (width * ratio), 1 / (height * ratio)); }
    const samples = this.appearance.quality === 'high' ? 4 : 0;
    for (const target of this.composer ? [this.composer.renderTarget1, this.composer.renderTarget2] : []) if (target.samples !== samples) { target.samples = samples; target.dispose(); }
    this.camera.aspect = width / height;
    const lens = this.lensForAspect();
    this.camera.fov = lens;
    if (this.cameraTravel) { this.cameraTravel.toFov = lens; const t = this.cameraTravel.start === null ? 0 : ease(THREE.MathUtils.clamp((performance.now() - this.cameraTravel.start) / this.cameraTravel.duration, 0, 1)); this.camera.fov = THREE.MathUtils.lerp(this.cameraTravel.fromFov, lens, t); }
    this.camera.updateProjectionMatrix();
  }

  private renderFrame = (now: number) => {
    if (this.disposed) return;
    // Warm only the finished lighting/material setup. Drawing before the texture/reflection
    // arrives compiles an entire interim scene and delays the first useful frame.
    if (!this.surfaceLoaded) { this.frame = requestAnimationFrame(this.renderFrame); return; }
    const cpuStart = performance.now();
    // Canvas resizing clears its buffer; do it immediately before the replacement draw.
    if (this.resizePending) this.resize();
    if (this.lastFrame) {
      const dt = now - this.lastFrame;
      if (dt > 0 && !document.hidden) { this.frameTimes.push(dt); if (this.frameTimes.length > 1800) this.frameTimes.shift(); }
    }
    this.lastFrame = now;
    const drawnAnimation = this.animation;
    if (this.animation) {
      this.renderer.shadowMap.needsUpdate = true;
      const transaction = this.animation;
      const t = transaction.start === null ? 0 : THREE.MathUtils.clamp((now - transaction.start) / transaction.duration, 0, 1);
      transaction.update(t);
      if (t === 1 && this.animation === transaction) { this.animation = null; transaction.finish(); }
    } else {
      for (const [tile, group] of this.tiles) {
        const lift = this.appearance.reducedMotion ? 0 : tile === this.highlightState.selectedTile ? .11 : tile === this.hoveredTile ? .025 : 0;
        const delta = lift - group.position.y;
        if (delta !== 0) { group.position.y = this.appearance.reducedMotion || Math.abs(delta) < .0002 ? lift : group.position.y + delta * .20; this.renderer.shadowMap.needsUpdate = true; }
      }
    }
    this.updateTileShells();
    if (this.cameraTravel) { const travel = this.cameraTravel; const t = travel.start === null ? 0 : ease(THREE.MathUtils.clamp((now - travel.start) / travel.duration, 0, 1)); this.camera.position.lerpVectors(travel.from, travel.to, t); this.controls.target.lerpVectors(travel.fromTarget, travel.target, t); this.camera.fov = THREE.MathUtils.lerp(travel.fromFov, travel.toFov, t); this.camera.updateProjectionMatrix(); if (t === 1) { this.cameraTravel = null; this.showcaseStarted = now; } }
    else if (this.exhibiting && !this.appearance.reducedMotion) { const a = .13 + Math.sin((now - this.showcaseStarted) * .00006) * .11; this.camera.position.set(Math.sin(a) * 20.5, 6.8, Math.cos(a) * 20.5); this.controls.target.set(-Math.cos(a) * 2.5, -.50, Math.sin(a) * 2.5); }
    if (this.checkPulse) {
      const t = this.checkPulse.start === null ? 0 : THREE.MathUtils.clamp((now - this.checkPulse.start) / 800, 0, 1);
      this.checkPulse.ring.scale.setScalar(.9 + ease(t) * .7);
      this.checkPulse.ring.material.opacity = Math.sin(Math.PI * t) * .9;
      this.riftPulse = Math.sin(Math.PI * t) * .22;
      if (t === 1) this.clearCheckPulse();
    }
    this.world?.tick(now / 1000, this.appearance.reducedMotion);
    this.world?.react(this.riftPulse);
    const riftLight = this.world?.lights.children.find(light => light.userData.riftLight) as THREE.PointLight | undefined; if (riftLight) riftLight.intensity += this.riftPulse * 24;
    this.controls.update();
    this.renderer.info.reset();
    if (this.renderer.shadowMap.needsUpdate) this.shadowFrames++;
    const culled: THREE.Object3D[] | null = this.warmAllPrograms ? [] : null;
    if (culled) {
      this.warmAllPrograms = false;
      this.scene.traverse(object => { if (object.frustumCulled) { object.frustumCulled = false; culled.push(object); } });
    }
    try {
      if (this.composer && this.appearance.quality !== 'low') this.composer.render(); else this.renderer.render(this.scene, this.camera);
    } finally { culled?.forEach(object => { object.frustumCulled = true; }); }
    this.lastRenderedAt = performance.now(); this.renderedFrames++;
    this.fadeWarmups.splice(0).forEach(mesh => mesh.removeFromParent());
    if (drawnAnimation && this.animation === drawnAnimation && drawnAnimation.start === null) drawnAnimation.start = this.lastRenderedAt;
    if (this.cameraTravel?.start === null) this.cameraTravel.start = this.lastRenderedAt;
    if (this.checkPulse?.start === null) this.checkPulse.start = this.lastRenderedAt;
    this.readyAfterFrame.splice(0).forEach(resolve => resolve());
    this.cpuFrameTimes.push(this.lastRenderedAt - cpuStart); if (this.cpuFrameTimes.length > 1800) this.cpuFrameTimes.shift();
    this.frame = requestAnimationFrame(this.renderFrame);
  };

  private material(color: number, metalness = 0, roughness = 0.5, stone = false) {
    const key = `${color}:${metalness}:${roughness}:${stone}`; let material = this.materialCache.get(key) as THREE.MeshStandardMaterial | undefined;
    if (!material) { material = new THREE.MeshStandardMaterial({ color, metalness, roughness }); if (stone) applyStoneDetail(material, this.stoneTexture, .7, .32); this.materialCache.set(key, material); } return material;
  }
  private basicMaterial(options: THREE.MeshBasicMaterialParameters) {
    const key = `basic:${JSON.stringify(options)}`;
    let material = this.materialCache.get(key) as THREE.MeshBasicMaterial | undefined;
    if (!material) { material = new THREE.MeshBasicMaterial(options); material.userData.rendererOwned = true; this.materialCache.set(key, material); }
    return material;
  }
  private geometry(key: string, create: () => THREE.BufferGeometry) {
    let geometry = this.geometryCache.get(key);
    if (!geometry) { geometry = create(); geometry.userData.rendererOwned = true; this.geometryCache.set(key, geometry); }
    return geometry;
  }
  private box(width: number, height: number, depth: number, material: THREE.Material, radius = 0.03) {
    const geometry = this.geometry(`box:${width}:${height}:${depth}:${radius}`, () => new RoundedBoxGeometry(width, height, depth, 2, radius));
    const mesh = new THREE.Mesh(geometry, material); mesh.userData.rendererShared = true;
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private clear(group: THREE.Group) {
    group.traverse(object => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object.userData.sharedPieceAsset || object.userData.rendererShared) return;
      const mesh = object as THREE.Mesh;
      if (mesh.geometry && !mesh.geometry.userData.rendererOwned) mesh.geometry.dispose();
      if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (material.userData.rendererOwned) continue;
        const map = (material as THREE.MeshStandardMaterial).map;
        if (map) map.dispose();
        material.dispose();
      }
    });
    group.clear();
  }

  private label(color: string) {
    const cell = 128, canvas = document.createElement('canvas'); canvas.width = cell * 4; canvas.height = cell * 4;
    const context = canvas.getContext('2d')!;
    context.font = '500 76px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = color;
    const glyphs = [...'abcdefgh', ...'12345678'];
    glyphs.forEach((glyph, index) => context.fillText(glyph, (index % 4) * cell + cell / 2, (3 - Math.floor(index / 4)) * cell + 67));
    const geometry = (glyph: number, x: number, z: number, rotate = false) => {
      const plane = new THREE.PlaneGeometry(.28, .28), uv = plane.getAttribute('uv');
      const column = glyph % 4, row = Math.floor(glyph / 4);
      for (let index = 0; index < uv.count; index++) uv.setXY(index, (column + uv.getX(index)) / 4, (row + uv.getY(index)) / 4);
      if (rotate) plane.rotateZ(Math.PI); plane.rotateX(-Math.PI / 2); plane.translate(x, .02, z);
      return plane;
    };
    const placements: THREE.BufferGeometry[] = [];
    for (let index = 0; index < 8; index++) for (const far of [false, true]) {
      placements.push(geometry(index, index - 3.5, far ? -4.26 : 4.26, far));
      placements.push(geometry(index + 8, far ? 4.26 : -4.26, 3.5 - index));
    }
    const merged = mergeGeometries(placements);
    placements.forEach(geometry => geometry.dispose());
    if (!merged) throw new Error('Coordinate label geometry could not be merged.');
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  }

  private buildEnvironment() {
    this.renderer.shadowMap.needsUpdate = true;
    if (this.world) { this.scene.remove(this.world.group, this.world.lights); this.world.dispose(); }
    this.clear(this.furniture);
    this.world = buildWorld(this.appearance.theme, this.appearance.quality, this.stoneTexture);
    this.scene.add(this.world.group, this.world.lights);
    this.scene.background = this.world.background; this.scene.fog = this.world.fog;
    this.renderer.toneMappingExposure = this.world.exposure; this.scene.environmentIntensity = this.world.environmentIntensity;
    const labelColor = this.appearance.theme === 'daylight' ? '#59432b' : '#dfc897';
    this.furniture.add(this.label(labelColor));
    if (this.surfaceLoaded) this.applyWorldReflection();
  }

  private applyWorldReflection() {
    const key = `${this.appearance.theme}:${this.appearance.quality}`;
    let reflection = this.reflectionCache.get(key);
    if (!reflection) {
      const excluded = [this.board, this.furniture, this.highlights, this.effects]; const visibility = excluded.map(group => group.visible);
      excluded.forEach(group => { group.visible = false; }); this.scene.environment = this.environment.texture;
      this.world?.tick(0, true); this.world?.react(0);
      const generator = new THREE.PMREMGenerator(this.renderer);
      try {
        reflection = generator.fromScene(this.scene, .035, .15, 100, { size: this.appearance.quality === 'high' ? 256 : 128, position: new THREE.Vector3(0, 1.2, 0) });
        this.reflectionCache.set(key, reflection);
      } finally { excluded.forEach((group, index) => { group.visible = visibility[index]!; }); this.renderer.shadowMap.needsUpdate = true; generator.dispose(); }
    }
    this.scene.environment = reflection.texture;
  }

  private buildBoard(position: Position) {
    this.renderer.shadowMap.needsUpdate = true;
    this.clear(this.board); this.pieces.clear(); this.tiles.clear(); this.tileShells = []; this.shellPositions.clear();
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
        const surface = this.box(.958, .09, .958, this.material(light ? colors.light : colors.dark, .1, .48, true), .018);
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
    this.batchTileShells(); this.drawHighlights(); this.prepareFadeWarmups();
  }

  private batchTileShells() {
    const batches = new Map<string, Array<{ tile: number; mesh: THREE.Mesh }>>();
    for (const [tile, group] of this.tiles) {
      group.updateMatrix(); this.shellPositions.set(tile, group.position.clone());
      for (const child of group.children) {
        if (!(child instanceof THREE.Mesh) || !child.userData.rendererShared || Number.isInteger(child.userData.square) || Array.isArray(child.material)) continue;
        const key = `${child.geometry.uuid}:${child.material.uuid}:${child.castShadow}:${child.receiveShadow}`;
        const list = batches.get(key) ?? []; list.push({ tile, mesh: child }); batches.set(key, list);
      }
    }
    for (const batch of batches.values()) {
      const first = batch[0]!.mesh;
      const mesh = new THREE.InstancedMesh(first.geometry, first.material, batch.length);
      mesh.userData.rendererShared = true; mesh.userData.instanceTiles = batch.map(part => part.tile);
      mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow;
      const parts = batch.map(({ tile, mesh: original }, index) => {
        original.updateMatrix(); const local = original.matrix.clone();
        mesh.setMatrixAt(index, this.shellMatrix.multiplyMatrices(this.tiles.get(tile)!.matrix, local));
        original.removeFromParent(); return { tile, local };
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); this.board.add(mesh); this.tileShells.push({ mesh, parts });
    }
  }

  private updateTileShells() {
    this.changedShells.clear();
    for (const [tile, group] of this.tiles) {
      const previous = this.shellPositions.get(tile)!;
      if (!previous.equals(group.position)) { previous.copy(group.position); group.updateMatrix(); this.changedShells.add(tile); }
    }
    if (!this.changedShells.size) return;
    for (const { mesh, parts } of this.tileShells) {
      let changed = false;
      parts.forEach(({ tile, local }, index) => {
        if (!this.changedShells.has(tile)) return;
        mesh.setMatrixAt(index, this.shellMatrix.multiplyMatrices(this.tiles.get(tile)!.matrix, local)); changed = true;
      });
      if (changed) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }
    }
  }

  async setPosition(position: Position, transition?: { previous: Position; action: Action }): Promise<void> {
    this.skipAnimation();
    this.clearCheckPulse();
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
    const duration = action.type === 'shift' ? passenger ? 1040 : 920 : knight ? 620 : victim || action.promotion ? 620 : action.castle ? 560 : 360;
    const victimStart = victim?.position.clone();
    const victimFade = victim && victim !== moving ? this.fadePiece(victim) : null;
    const capture = victimStart ? this.captureEffect(victimStart) : null;
    const promotion = action.promotion ? this.promotionEffect(previous, position, action, moving) : null;
    const shift = action.type === 'shift' ? this.shiftEffect(start, end) : null;
    if (shift) this.bumpRift(passenger ? .72 : .48);
    if (capture) this.bumpRift(.88);
    // Queue the effect programs now; start the visual clock only after the first actual draw.
    this.renderer.compile(this.scene, this.camera);
    return new Promise<void>(resolve => {
      let finished = false;
      this.animation = {
        start: null, duration,
        update: t => {
          const progress = ease(t);
          if (shift) {
            const travel = ease(THREE.MathUtils.clamp((t - .16) / .58, 0, 1));
            const lift = t < .18 ? ease(t / .18) : t > .70 ? 1 - ease(Math.min(1, (t - .70) / .12)) : 1;
            moving.position.lerpVectors(start, end, travel); moving.position.y += .25 * lift;
            shift.update(t);
            this.riftPulse = Math.max(.08, (t < .18 || t > .78 ? .72 : .22) * (1 - Math.abs(.5 - t)));
          } else if (knight) {
            const travel = ease(THREE.MathUtils.clamp((t - .20) / .60, 0, 1));
            const lift = t < .28 ? ease(t / .28) : t > .72 ? ease((1 - t) / .28) : 1;
            moving.position.lerpVectors(start, end, travel); moving.position.y += lift * 1.65;
          } else {
            const contact = Math.max(0, 1 - .62 / start.distanceTo(end));
            const travel = victim ? t < .52 ? ease(t / .52) * contact : t < .72 ? contact : contact + ease((t - .72) / .28) * (1 - contact) : progress;
            moving.position.lerpVectors(start, end, travel); moving.position.y += Math.sin(Math.PI * t) * .10;
          }
          if (victimFade) {
            const fade = THREE.MathUtils.clamp((t - .48) / .30, 0, 1);
            victimFade.opacity(1 - fade);
            if (victim) { victim.position.y = victimStart!.y + fade * .12; victim.rotation.z = fade * -.16; }
            capture?.update(fade, t >= .48);
          }
          if (rook && rookStart && rookEnd) rook.position.lerpVectors(rookStart, rookEnd, progress);
          promotion?.update(t);
        },
        finish: () => {
          if (finished) return;
          finished = true;
          victimFade?.restore(); promotion?.restore(); this.riftPulse = 0;
          this.clear(this.effects); this.buildBoard(position);
          if (!this.appearance.reducedMotion && inCheck(position, position.side)) this.showCheckPulse(position.board.indexOf(position.side * 6));
          resolve();
        },
      };
    });
  }

  private borrowFadeMaterial(original: THREE.Material) {
    const pool = this.fadeMaterials.get(original) ?? [];
    let lease = pool.find(entry => !entry.busy);
    if (!lease) {
      const clone = original.clone(); clone.onBeforeCompile = original.onBeforeCompile; clone.customProgramCacheKey = original.customProgramCacheKey;
      clone.transparent = true; clone.depthWrite = false;
      lease = { material: clone, busy: false }; pool.push(lease); this.fadeMaterials.set(original, pool);
    }
    lease.busy = true; lease.material.opacity = 1; return lease;
  }

  private prepareFadeWarmups() {
    this.fadeWarmups.splice(0).forEach(mesh => mesh.removeFromParent());
    if (this.appearance.reducedMotion) return;
    const geometry = this.geometry('fade-warmup', () => {
      const plane = new THREE.PlaneGeometry(1, 1); plane.deleteAttribute('uv');
      plane.setAttribute('color', new THREE.Float32BufferAttribute(Array(plane.getAttribute('position').count * 3).fill(1), 3)); return plane;
    });
    const seen = new Set<THREE.Material>();
    for (const piece of this.pieces.values()) piece.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const original of Array.isArray(object.material) ? object.material : [object.material]) {
        if (seen.has(original)) continue; seen.add(original);
        const lease = this.borrowFadeMaterial(original); lease.material.opacity = 0; lease.busy = false;
        const warmup = new THREE.Mesh(geometry, lease.material);
        // The ordinary renderer draw warms the real transparent piece programs before readiness.
        // This triangle pair is clipped beyond every camera and never casts a shadow or takes input.
        warmup.position.y = -1000; warmup.frustumCulled = false; warmup.receiveShadow = true; warmup.userData.rendererShared = true;
        this.effects.add(warmup); this.fadeWarmups.push(warmup);
      }
    });
  }

  private fadePiece(piece: THREE.Group) {
    const restores: Array<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[]; leases: Array<{ material: THREE.Material; busy: boolean }> }> = [];
    piece.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material as THREE.Material | THREE.Material[];
      const originals = Array.isArray(material) ? material : [material];
      const leases = originals.map(original => this.borrowFadeMaterial(original));
      const clones = leases.map(lease => lease.material);
      object.material = Array.isArray(material) ? clones : clones[0]!;
      restores.push({ mesh: object, material, leases });
    });
    return {
      opacity: (value: number) => restores.forEach(({ leases }) => leases.forEach(lease => lease.material.opacity = value)),
      restore: () => restores.forEach(({ mesh, material, leases }) => { mesh.material = material; leases.forEach(lease => { lease.busy = false; }); }),
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
    const guideRings: THREE.Mesh[] = [];
    for (const point of [start, end]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.54, .027, 8, 36), energy(.38));
      ring.rotation.x = Math.PI / 2; ring.position.copy(point); ring.position.y = -.37; group.add(ring); guideRings.push(ring);
    }
    const seatMaterial = energy(0);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(.84, .04, 8, 48), seatMaterial);
    seat.rotation.x = Math.PI / 2; seat.position.copy(end); seat.position.y = .025; group.add(seat);
    this.effects.add(group);
    return { update: (t: number) => {
      const glow = .12 + Math.sin(Math.PI * t) * .34;
      materials.forEach(material => material.opacity = glow);
      guideRings.forEach((ring, index) => ring.scale.setScalar(.72 + (index === 1 ? t : 1 - t) * .42));
      const seated = THREE.MathUtils.clamp((t - .78) / .22, 0, 1);
      seat.scale.setScalar(.9 + seated * .30); seatMaterial.opacity = Math.sin(Math.PI * seated) * .92;
    } };
  }

  private captureEffect(origin: THREE.Vector3) {
    const group = new THREE.Group(); const materials: Array<THREE.Material & { opacity: number }> = [];
    const colors = TILE_FINISHES[this.appearance.theme];
    const material = (color: number, opacity: number) => {
      const value = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }); materials.push(value); return value;
    };
    const pulse = new THREE.Mesh(new THREE.TorusGeometry(.26, .035, 8, 32), material(colors.trim, .92));
    pulse.rotation.x = Math.PI / 2; pulse.position.copy(origin); pulse.position.y += .045; group.add(pulse);
    const wisps: THREE.Mesh[] = [];
    for (let index = 0; index < 6; index++) {
      const wisp = new THREE.Mesh(new THREE.CylinderGeometry(.012, .035, .3, 6), material(index % 2 ? colors.trim : colors.fill, .78));
      const angle = index / 6 * Math.PI * 2; wisp.position.copy(origin).add(new THREE.Vector3(Math.cos(angle) * .14, .12, Math.sin(angle) * .14)); wisp.rotation.z = Math.sin(angle) * .24;
      wisps.push(wisp); group.add(wisp);
    }
    this.effects.add(group);
    group.visible = false;
    return { update: (t: number, visible = true) => {
      group.visible = visible;
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

  private showCheckPulse(square: number) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.46, .022, 6, 48), new THREE.MeshBasicMaterial({ color: 0xff6e63, transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(point(square, .025)); this.effects.add(ring);
    this.checkPulse = { start: null, ring };
  }

  private clearCheckPulse() {
    if (!this.checkPulse) return;
    const { ring } = this.checkPulse; ring.removeFromParent(); ring.geometry.dispose(); ring.material.dispose();
    this.checkPulse = null; this.riftPulse = 0;
  }

  skipAnimation() {
    if (this.animation) { const transaction = this.animation; this.animation = null; this.skippedAnimations++; transaction.finish(); }
  }

  setHighlights(highlights: Highlights) {
    const key = `${highlights.selectedSquare}:${highlights.selectedTile}:${highlights.showMoves}:${highlights.focusSquare}:${highlights.legalActions.map(action => action.id).join(',')}`;
    this.highlightState = highlights; this.availableTiles = new Set(highlights.legalActions.filter(a => a.type === 'shift').map(a => macroIndex(a.from)));
    if (key !== this.highlightKey) { this.highlightKey = key; if (!this.animation) this.drawHighlights(); }
  }

  private ring(square: number, color: number, radius: number, width: number) {
    const mesh = new THREE.Mesh(this.geometry(`ring:${radius}:${width}`, () => new THREE.RingGeometry(radius - width, radius, 48)), this.basicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.copy(point(square, 0.015)); mesh.renderOrder = 5; this.highlights.add(mesh);
  }

  private tileOutline(tile: number, color: number, opacity: number, width = 0.027) {
    const center = tilePoint(tile, this.highlightState.selectedTile === tile ? .15 : .042);
    for (const side of [-1, 1]) {
      const material = this.basicMaterial({ color, transparent: true, opacity, depthWrite: false });
      const x = new THREE.Mesh(this.geometry(`outline-x:${width}`, () => new THREE.BoxGeometry(width, 0.018, 1.9)), material); x.position.copy(center).add(new THREE.Vector3(side * 0.956, 0, 0)); this.highlights.add(x);
      const z = new THREE.Mesh(this.geometry(`outline-z:${width}`, () => new THREE.BoxGeometry(1.9, 0.018, width)), material); z.position.copy(center).add(new THREE.Vector3(0, 0, side * 0.956)); this.highlights.add(z);
    }
  }

  private arrow(from: number, to: number, strong: boolean) {
    const start = tilePoint(from, strong ? .17 : .055); const end = tilePoint(to, strong ? .17 : .055);
    const direction = end.clone().sub(start).normalize();
    const center = start.addScaledVector(direction, 0.8);
    const geometry = this.geometry('shift-direction', () => { const shape = new THREE.Shape(); shape.moveTo(-0.115, -0.1); shape.lineTo(0.115, -0.1); shape.lineTo(0, 0.15); shape.closePath(); return new THREE.ShapeGeometry(shape); });
    const mesh = new THREE.Mesh(geometry, this.basicMaterial({ color: strong ? 0xf1d190 : 0x7ae1cb, side: THREE.DoubleSide, transparent: true, opacity: strong ? 1 : 0.72, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = Math.atan2(direction.x, -direction.z) * -1;
    mesh.position.copy(center); this.highlights.add(mesh);
  }

  private shiftHandle(tile: number) {
    const handle = new THREE.Group(); handle.position.copy(tilePoint(tile, this.highlightState.selectedTile === tile ? .19 : .075));
    handle.userData.hitKind = 'shift'; handle.userData.tile = tile;
    const base = new THREE.Mesh(this.geometry('handle-base', () => new THREE.CylinderGeometry(.16, .16, .035, 24)), this.basicMaterial({ color: 0x143e3e })); handle.add(base);
    const rim = new THREE.Mesh(this.geometry('handle-rim', () => new THREE.TorusGeometry(.15, .014, 6, 24)), this.basicMaterial({ color: 0xa7ffe5 })); rim.rotation.x = Math.PI / 2; rim.position.y = .02; handle.add(rim);
    for (const direction of [-1, 1]) {
      const geometry = this.geometry('handle-arrow', () => { const shape = new THREE.Shape(); shape.moveTo(-.06, -.035); shape.lineTo(.01, -.035); shape.lineTo(.01, -.07); shape.lineTo(.09, 0); shape.lineTo(.01, .07); shape.lineTo(.01, .035); shape.lineTo(-.06, .035); shape.closePath(); return new THREE.ShapeGeometry(shape); });
      const arrow = new THREE.Mesh(geometry, this.basicMaterial({ color: 0xe1fff4 })); arrow.rotation.x = -Math.PI / 2; arrow.rotation.z = direction < 0 ? Math.PI : 0; arrow.position.set(0, .025, direction * .053); handle.add(arrow);
    }
    this.highlights.add(handle);
  }

  private drawHighlights() {
    this.clear(this.highlights);
    if (!this.position) return;
    const { selectedSquare, selectedTile, legalActions, showMoves, focusSquare } = this.highlightState;
    {
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
        const pad = new THREE.Mesh(this.geometry('destination-pad', () => new THREE.PlaneGeometry(1.78, 1.78)), this.basicMaterial({ color: 0x57dcbf, transparent: true, opacity: .20, depthWrite: false }));
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

  private lensForAspect(): number {
    const vertical = this.cameraMode === 'showcase' ? 52 : 37;
    const horizontal = this.cameraMode === 'showcase' ? 52 : this.preset === 'overview' ? 46 : this.preset === 'top' ? 34 : 42;
    return Math.max(vertical, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(horizontal) / 2) / this.camera.aspect)));
  }

  setCamera(preset: CameraPreset) {
    this.preset = preset;
    this.hoveredTile = null;
    this.exhibiting = false; this.cameraTravel = null; this.cameraMode = 'play'; this.camera.fov = this.lensForAspect(); this.camera.updateProjectionMatrix();
    const vectors: Record<CameraPreset, [number, number, number]> = { white: [0, 10.8, 9.3], black: [0, 10.8, -9.3], overview: [8.6, 11.8, 8.6], top: [0, 16.2, 2.7] };
    this.camera.position.set(...vectors[preset]); this.controls.target.set(0, 0.15, 0); this.controls.update();
  }

  orbit(dx: number, dy: number, zoom = 0) {
    this.hoveredTile = null;
    this.exhibiting = false; this.cameraTravel = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += dx; spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy, this.controls.minPolarAngle, this.controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius + zoom, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); this.controls.update();
  }

  showcase(entrance = false): void {
    this.cameraTravel = null; this.exhibiting = true; this.cameraMode = 'showcase'; this.camera.fov = this.lensForAspect(); this.camera.updateProjectionMatrix(); this.showcaseStarted = performance.now();
    this.camera.position.set(2.66, 6.8, 20.33); this.controls.target.set(-2.48, -.50, .324); this.controls.update();
    if (entrance && !this.appearance.reducedMotion) {
      const to = this.camera.position.clone(), target = this.controls.target.clone();
      const from = new THREE.Vector3(-7.5, 5.2, 23.5), fromTarget = new THREE.Vector3(-.8, -.8, 0);
      this.camera.position.copy(from); this.controls.target.copy(fromTarget); this.controls.update();
      this.cameraTravel = { start: null, duration: 2600, from, to, fromTarget, target, fromFov: this.camera.fov, toFov: this.camera.fov };
    }
  }

  enterPlay(duration = 900): void {
    const from = this.camera.position.clone(); const fromTarget = this.controls.target.clone(); const fromFov = this.camera.fov;
    this.setCamera(this.preset); const to = this.camera.position.clone(); const target = this.controls.target.clone();
    if (duration <= 0 || this.appearance.reducedMotion) return;
    const toFov = this.camera.fov; this.camera.position.copy(from); this.controls.target.copy(fromTarget); this.camera.fov = fromFov; this.camera.updateProjectionMatrix();
    this.cameraTravel = { start: null, duration, from, to, fromTarget, target, fromFov, toFov };
  }

  configure(options: Partial<Appearance>) {
    const next = { ...this.appearance, ...options };
    const worldChanged = next.theme !== this.appearance.theme || next.quality !== this.appearance.quality;
    const boardChanged = next.theme !== this.appearance.theme || next.family !== this.appearance.family || next.material !== this.appearance.material;
    const motionChanged = next.reducedMotion !== this.appearance.reducedMotion;
    this.appearance = next;
    if (worldChanged || boardChanged || motionChanged) {
      this.skipAnimation();
      this.clearCheckPulse();
      this.controls.enableDamping = !next.reducedMotion;
      if (motionChanged && next.reducedMotion) {
        if (this.cameraTravel) {
          this.camera.position.copy(this.cameraTravel.to); this.controls.target.copy(this.cameraTravel.target);
          this.camera.fov = this.cameraTravel.toFov; this.camera.updateProjectionMatrix(); this.cameraTravel = null;
        }
        for (const tile of this.tiles.values()) tile.position.y = 0;
        this.renderer.shadowMap.needsUpdate = true;
      }
      if (worldChanged) { this.buildEnvironment(); this.resizePending = true; }
      if (boardChanged && this.position) this.buildBoard(this.position);
      if (motionChanged && !next.reducedMotion && !boardChanged) this.prepareFadeWarmups();
      if (worldChanged || boardChanged) {
        this.sceneReady = this.surfaceLoaded ? this.prepareScene() : this.surfaceReady;
      } else if (motionChanged) this.sceneReady = this.surfaceLoaded ? this.afterNextFrame() : this.surfaceReady;
      void this.sceneReady.catch(error => { if (!this.disposed) this.assetError = error.message; });
    }
  }

  private async prepareScene(): Promise<void> {
    if (this.disposed) throw new DOMException('Renderer disposed before frame readiness.', 'AbortError');
    // compileAsync polls material properties after disposal during rapid UI changes. A completed
    // render submission warms the current scene without retaining a stale set of materials.
    // Submit off-camera materials once too; otherwise a later orbit can block on their first use.
    this.warmAllPrograms = true;
    this.renderer.compile(this.scene, this.camera);
    await this.afterNextFrame();
  }

  private async afterNextFrame(): Promise<void> {
    if (this.disposed) throw new DOMException('Renderer disposed before frame readiness.', 'AbortError');
    await new Promise<void>(resolve => this.readyAfterFrame.push(resolve));
    if (this.disposed) throw new DOMException('Renderer disposed before frame readiness.', 'AbortError');
  }

  /** Read-only instrumentation: test clicks still pass through the real canvas. */
  squareScreenPosition(square: number): { x: number; y: number } {
    this.camera.updateMatrixWorld();
    const value = point(square, this.position?.board[square] ? 0.3 : 0.02).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + (value.x + 1) * rect.width / 2, y: rect.top + (1 - value.y) * rect.height / 2 };
  }

  metrics() {
    const frames = [...this.frameTimes].sort((a, b) => a - b);
    const cpu = [...this.cpuFrameTimes].sort((a, b) => a - b);
    return { samples: frames.length, renderedFrames: this.renderedFrames, lastRenderedAt: this.lastRenderedAt,
      cameraTravelling: this.cameraTravel !== null, cameraPosition: this.camera.position.toArray(), cameraTravelDestination: this.cameraTravel?.to.toArray() ?? null,
      checkPulseActive: this.checkPulse !== null,
      maxTileLift: Math.max(0, ...Array.from(this.tiles.values(), tile => tile.position.y)), reducedMotion: this.appearance.reducedMotion, pendingSceneReadiness: this.readyAfterFrame.length,
      medianMs: frames[Math.floor(frames.length * 0.5)] ?? null, p95Ms: frames[Math.floor(frames.length * 0.95)] ?? null,
      p99Ms: frames[Math.floor(frames.length * .99)] ?? null, maxMs: frames.at(-1) ?? null, cpuMedianMs: cpu[Math.floor(cpu.length * .5)] ?? null, cpuP95Ms: cpu[Math.floor(cpu.length * .95)] ?? null, cpuMaxMs: cpu.at(-1) ?? null, skippedAnimations: this.skippedAnimations,
      renderer: this.rendererName, quality: this.appearance.quality,
      shellDraws: this.tileShells.length, shellInstances: this.tileShells.reduce((sum, batch) => sum + batch.parts.length, 0),
      programs: this.renderer.info.programs?.length ?? 0, cachedFadeMaterials: [...this.fadeMaterials.values()].reduce((sum, pool) => sum + pool.length, 0), activeFadeMaterials: [...this.fadeMaterials.values()].reduce((sum, pool) => sum + pool.filter(lease => lease.busy).length, 0),
      width: this.renderer.domElement.width, height: this.renderer.domElement.height, memory: { ...this.renderer.info.memory }, calls: this.renderer.info.render.calls, callsScope: 'complete scene, shadows and postprocessing', shadowFrames: this.shadowFrames, preset: this.preset, focusSquare: this.highlightState.focusSquare, moveHints: this.highlightState.showMoves, shiftTiles: [...this.availableTiles], cameraDistance: this.camera.position.distanceTo(this.controls.target), assetError: this.assetError };
  }

  resetMetrics() { this.frameTimes.length = 0; this.cpuFrameTimes.length = 0; this.lastFrame = 0; this.shadowFrames = 0; }
  async whenReady(): Promise<void> {
    await this.surfaceReady; await this.sceneReady;
    if (this.disposed) throw new DOMException('Renderer disposed before frame readiness.', 'AbortError');
  }

  dispose() {
    this.skipAnimation(); this.clearCheckPulse(); this.disposed = true; cancelAnimationFrame(this.frame); this.resizeObserver.disconnect();
    this.readyAfterFrame.splice(0).forEach(resolve => resolve());
    document.removeEventListener('visibilitychange', this.visibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown); this.renderer.domElement.removeEventListener('pointermove', this.pointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.pointerUp); this.renderer.domElement.removeEventListener('pointercancel', this.pointerCancel);
    this.renderer.domElement.removeEventListener('contextmenu', this.contextMenu); this.controls.removeEventListener('start', this.cameraGesture); this.controls.removeEventListener('end', this.cameraGestureEnd);
    this.controls.dispose(); this.clear(this.board); this.clear(this.furniture); this.clear(this.highlights);
    this.world?.dispose(); this.clear(this.effects);
    this.fadeWarmups.length = 0;
    this.geometryCache.forEach(geometry => geometry.dispose()); this.materialCache.forEach(material => material.dispose()); this.geometryCache.clear(); this.materialCache.clear();
    this.fadeMaterials.forEach(pool => pool.forEach(lease => lease.material.dispose())); this.fadeMaterials.clear();
    if (this.composer) { for (const pass of this.composer.passes) pass.dispose(); this.composer.dispose(); }
    this.reflectionCache.forEach(reflection => reflection.dispose()); this.reflectionCache.clear();
    disposePieceAssets(); this.environment.dispose(); this.stoneTexture.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
