import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadStoneTexture } from '../../src/render/surfaces';
import { buildWorld, type BuiltWorld, type WorldQuality, type WorldTheme } from '../../src/render/world';

export type ReflectionTheme = WorldTheme;
export type ReflectionQuality = WorldQuality;

/**
 * Build-time source for the world-only CubeUV reflections. The returned target remains
 * producer-owned: consume it before the next produce call or dispose call, both of which
 * dispose the previous target.
 */
export class ReflectionBakeProducer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly ready: Promise<void>;

  private readonly stoneTexture: THREE.Texture;
  private readonly baseRoom: THREE.WebGLRenderTarget;
  private world: BuiltWorld | null = null;
  private output: THREE.WebGLRenderTarget | null = null;
  private surfaceReady = false;
  private disposed = false;

  constructor() {
    const stone = loadStoneTexture();
    this.stoneTexture = stone.texture;
    this.ready = stone.ready.then(() => { this.surfaceReady = true; });
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.info.autoReset = false;

    const generator = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    try {
      this.baseRoom = generator.fromScene(room, 0.04);
    } finally {
      room.dispose();
      generator.dispose();
    }
    this.scene.environment = this.baseRoom.texture;
    this.scene.environmentIntensity = 0.4;
  }

  produce(theme: ReflectionTheme, quality: ReflectionQuality): THREE.WebGLRenderTarget {
    if (this.disposed) throw new Error('ReflectionBakeProducer is disposed.');
    if (!this.surfaceReady) throw new Error('Await ReflectionBakeProducer.ready before producing a reflection.');
    if (this.output) { this.output.dispose(); this.output = null; }
    if (this.world) {
      this.scene.remove(this.world.group, this.world.lights);
      this.world.dispose();
      this.world = null;
    }

    const world = buildWorld(theme, quality, this.stoneTexture);
    this.world = world;
    this.scene.add(world.group, world.lights);
    this.scene.background = world.background;
    this.scene.fog = world.fog;
    this.renderer.toneMappingExposure = world.exposure;
    this.scene.environmentIntensity = world.environmentIntensity;
    this.scene.environment = this.baseRoom.texture;
    world.tick(0, true);
    world.react(0);
    this.renderer.shadowMap.needsUpdate = true;

    const generator = new THREE.PMREMGenerator(this.renderer);
    try {
      this.output = generator.fromScene(this.scene, .035, .15, 100, {
        size: quality === 'high' ? 256 : 128,
        position: new THREE.Vector3(0, 1.2, 0),
      });
      return this.output;
    } finally {
      generator.dispose();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.output?.dispose();
    this.output = null;
    if (this.world) {
      this.scene.remove(this.world.group, this.world.lights);
      this.world.dispose();
      this.world = null;
    }
    this.baseRoom.dispose();
    this.stoneTexture.dispose();
    this.renderer.dispose();
  }
}
