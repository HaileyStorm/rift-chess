import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { applyStoneDetail } from './surfaces';

export type WorldTheme = 'gallery' | 'nocturne' | 'daylight';
export type WorldQuality = 'low' | 'balanced' | 'high';

export interface BuiltWorld {
  group: THREE.Group;
  lights: THREE.Group;
  background: THREE.Color;
  fog: THREE.Fog;
  exposure: number;
  environmentIntensity: number;
  tick: (seconds: number, reducedMotion: boolean) => void;
  react: (amount: number) => void;
  dispose: () => void;
}

type Palette = {
  background: number; fog: number; stone: number; darkStone: number; bronze: number;
  brass: number; energy: number; fill: number; floor: number; key: number;
};

const PALETTES: Record<WorldTheme, Palette> = {
  gallery: {
    background: 0x120f19, fog: 0x2b2432, stone: 0xb09b7d, darkStone: 0x2e2c3a,
    bronze: 0x7d4d2f, brass: 0xe2b86d, energy: 0x67d8d7, fill: 0x7594bd,
    floor: 0x211f2e, key: 0xffbd82,
  },
  nocturne: {
    background: 0x03040d, fog: 0x070a1e, stone: 0x384363, darkStone: 0x11152b,
    bronze: 0x3e3b70, brass: 0xaebdff, energy: 0x69ddff, fill: 0x6877dd,
    floor: 0x0c1029, key: 0xd6e0ff,
  },
  daylight: {
    background: 0xb7d2cd, fog: 0xb7cdc8, stone: 0xcfc09f, darkStone: 0x5d756f,
    bronze: 0x935e37, brass: 0xe8c56e, energy: 0x4dc9ad, fill: 0xe1f8ef,
    floor: 0xa4c3b8, key: 0xffdca1,
  },
};

const qualityValue = (quality: WorldQuality, low: number, balanced: number, high: number) =>
  quality === 'low' ? low : quality === 'high' ? high : balanced;

class Resources {
  readonly geometries: THREE.BufferGeometry[] = [];
  readonly materials: THREE.Material[] = [];

  geometry<T extends THREE.BufferGeometry>(geometry: T): T { this.geometries.push(geometry); return geometry; }
  material<T extends THREE.Material>(material: T): T { this.materials.push(material); return material; }
  dispose() {
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
  }
}

class WorldCraft {
  readonly group = new THREE.Group();
  readonly lights = new THREE.Group();
  readonly rift = new THREE.Group();
  readonly movingParts = new THREE.Group();
  readonly resources = new Resources();
  readonly mats: Record<string, THREE.MeshStandardMaterial>;
  readonly segmentCount: number;
  private readonly shadowLights: THREE.DirectionalLight[] = [];
  private readonly geometryCache = new Map<string, THREE.BufferGeometry>();
  private readonly staticInstances: THREE.InstancedMesh[] = [];
  private volumeTime = { value: 0 };
  private volumePulse = { value: 0 };

  constructor(readonly theme: WorldTheme, readonly quality: WorldQuality, readonly palette: Palette, readonly stoneTexture: THREE.Texture) {
    this.segmentCount = qualityValue(quality, 10, 16, 24);
    const material = (color: number, metalness: number, roughness: number, emissive = 0, emissiveIntensity = 0) =>
      this.resources.material(new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity }));
    this.mats = {
      stone: material(palette.stone, 0.04, 0.72),
      darkStone: material(palette.darkStone, 0.1, 0.7),
      bronze: material(palette.bronze, 0.78, 0.44),
      brass: material(palette.brass, 0.88, 0.52),
      energy: material(palette.energy, 0.45, 0.22, palette.energy, 1.45),
      mutedEnergy: material(palette.energy, 0.3, 0.34, palette.energy, 0.34),
      floor: material(palette.floor, 0.04, 0.84),
      black: material(0x060a10, 0.2, 0.78),
    };
    this.mats.floor.roughness = theme === 'daylight' ? .64 : .50;
    this.mats.floor.metalness = theme === 'daylight' ? .06 : theme === 'gallery' ? .10 : .15;
    for (const name of ['floor', 'stone', 'darkStone']) applyStoneDetail(this.mats[name], this.stoneTexture, name === 'floor' ? .15 : .38, name === 'floor' ? .8 : .55);
  }

  private cachedGeometry<T extends THREE.BufferGeometry>(key: string, create: () => T): T {
    const cached = this.geometryCache.get(key);
    if (cached) return cached as T;
    const geometry = this.resources.geometry(create());
    this.geometryCache.set(key, geometry);
    return geometry;
  }
  private rounded(width: number, height: number, depth: number, radius = 0.06) {
    return this.cachedGeometry(`rounded:${width}:${height}:${depth}:${radius}`, () => new RoundedBoxGeometry(width, height, depth, 2, radius));
  }
  private box(width: number, height: number, depth: number, material: THREE.Material, radius = 0.06) {
    const mesh = new THREE.Mesh(this.rounded(width, height, depth, radius), material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private cylinder(top: number, bottom: number, height: number, material: THREE.Material, radial = this.segmentCount) {
    const geometry = this.cachedGeometry(`cylinder:${top}:${bottom}:${height}:${radial}`, () => new THREE.CylinderGeometry(top, bottom, height, radial));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private torus(radius: number, tube: number, material: THREE.Material, radial = this.segmentCount, tubular = this.segmentCount * 2) {
    const geometry = this.cachedGeometry(`torus:${radius}:${tube}:${radial}:${tubular}`, () => new THREE.TorusGeometry(radius, tube, radial, tubular));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private tube(points: THREE.Vector3[], radius: number, material: THREE.Material, segments = this.segmentCount * 3) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const mesh = new THREE.Mesh(this.resources.geometry(new THREE.TubeGeometry(curve, segments, radius, this.segmentCount, false)), material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private add(object: THREE.Object3D, target: THREE.Object3D = this.group) { target.add(object); return object; }

  private batchStaticMeshes(parent: THREE.Object3D) {
    if (parent === this.movingParts || !parent.children.length) return;
    for (const child of parent.children) this.batchStaticMeshes(child);

    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || child.name || Array.isArray(child.material) || child.material.transparent || child.material instanceof THREE.ShaderMaterial) continue;
      const key = [child.geometry.uuid, child.material.uuid, child.castShadow, child.receiveShadow, child.renderOrder, child.frustumCulled, child.layers.mask, child.visible].join('|');
      const batch = batches.get(key);
      if (batch) batch.push(child); else batches.set(key, [child]);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 3) continue;
      const first = meshes[0]!;
      const instances = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
      instances.castShadow = first.castShadow; instances.receiveShadow = first.receiveShadow;
      instances.renderOrder = first.renderOrder; instances.frustumCulled = first.frustumCulled;
      instances.layers.mask = first.layers.mask; instances.visible = first.visible;
      for (let index = 0; index < meshes.length; index++) {
        const mesh = meshes[index]!;
        mesh.updateMatrix();
        instances.setMatrixAt(index, mesh.matrix);
      }
      instances.instanceMatrix.needsUpdate = true;
      instances.computeBoundingSphere();
      parent.add(instances);
      for (const mesh of meshes) parent.remove(mesh);
      this.staticInstances.push(instances);
    }
  }

  finalizeStaticMeshes() {
    this.group.updateMatrixWorld(true);
    this.batchStaticMeshes(this.group);
  }

  buildInstrument() {
    // The frame deliberately begins outside the movable 8 x 8 tile footprint.
    const frameY = -0.34;
    for (const x of [-4.31, 4.31]) {
      const rail = this.add(this.box(0.32, 0.32, 8.8, this.mats.bronze, 0.08));
      rail.position.set(x, frameY, 0);
      const inlay = this.add(this.box(0.055, 0.055, 8.38, this.mats.brass, 0.02));
      inlay.position.set(x + (x < 0 ? 0.02 : -0.02), -0.145, 0);
    }
    for (const z of [-4.31, 4.31]) {
      const rail = this.add(this.box(8.8, 0.32, 0.32, this.mats.bronze, 0.08));
      rail.position.set(0, frameY, z);
      const inlay = this.add(this.box(8.38, 0.055, 0.055, this.mats.brass, 0.02));
      inlay.position.set(0, -0.145, z + (z < 0 ? 0.02 : -0.02));
    }
    for (const x of [-4.31, 4.31]) for (const z of [-4.31, 4.31]) {
      const pedestal = this.add(this.cylinder(0.27, 0.37, 0.94, this.mats.bronze));
      pedestal.position.set(x, -0.71, z);
      const collar = this.add(this.torus(0.27, 0.035, this.mats.brass));
      collar.position.set(x, -0.34, z); collar.rotation.x = Math.PI / 2;
      const fastener = this.add(this.cylinder(0.078, 0.078, 0.055, this.mats.brass));
      fastener.position.set(x, -0.14, z);
    }

    // Everything below this line is below the tile bottoms, so moving holes stay visibly open.
    const voidBase = this.add(this.box(7.78, 0.18, 7.78, this.mats.black, 0.12), this.rift);
    voidBase.position.y = -9.45; voidBase.name = 'shaft-bottom';
    this.buildShaft();
    this.buildRiftVolume();
    for (let i = 0; i < 3; i++) {
      const ring = this.add(this.torus(3.18 - i * .67, .065 - i * .012, i === 1 ? this.mats.mutedEnergy : this.mats.brass), this.movingParts);
      ring.position.y = -3.15 - i * 2.1; ring.rotation.x = Math.PI / 2;
      ring.castShadow = false;
      ring.userData.riftSpin = (i % 2 ? -1 : 1) * (0.18 + i * 0.06);
      ring.userData.riftBaseZ = ring.rotation.z;
    }
    const iris = this.add(this.torus(.59, .038, this.mats.energy, 12, 64), this.movingParts);
    iris.position.y = -8.65; iris.rotation.x = Math.PI / 2;
    iris.castShadow = false;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const fin = this.add(this.box(.05, .18, .34, i % 4 === 0 ? this.mats.energy : this.mats.bronze, .015), this.rift);
      fin.position.set(Math.cos(a) * .82, -8.67, Math.sin(a) * .82); fin.rotation.y = -a + Math.PI / 2;
    }
    for (const axis of [-1, 1]) {
      const trackA = this.add(this.box(7.05, 0.13, 0.18, this.mats.bronze, 0.04), this.rift);
      trackA.position.set(0, -1.28, axis * 2.55);
      const trackB = this.add(this.box(0.18, 0.13, 7.05, this.mats.bronze, 0.04), this.rift);
      trackB.position.set(axis * 2.55, -1.41, 0);
      for (const offset of [-2.9, -1.45, 0, 1.45, 2.9]) {
        const couplerA = this.add(this.cylinder(0.105, 0.105, 0.16, this.mats.brass), this.rift);
        couplerA.position.set(offset, -1.17, axis * 2.55);
        const couplerB = this.add(this.cylinder(0.105, 0.105, 0.16, this.mats.brass), this.rift);
        couplerB.position.set(axis * 2.55, -1.3, offset);
      }
    }
    for (const x of [-3.72, 3.72]) for (const z of [-3.72, 3.72]) {
      const strut = this.add(this.cylinder(0.11, 0.18, 1.76, this.mats.darkStone), this.rift);
      strut.position.set(x, -1.74, z); strut.rotation.z = x < 0 ? -0.16 : 0.16;
      const socket = this.add(this.torus(0.19, 0.035, this.mats.brass), this.rift);
      socket.position.set(x, -0.88, z); socket.rotation.x = Math.PI / 2;
    }
    this.group.add(this.rift, this.movingParts);
  }

  private buildRiftVolume() {
    const material = this.resources.material(new THREE.ShaderMaterial({
      uniforms: { uTime: this.volumeTime, uPulse: this.volumePulse, uTint: { value: new THREE.Color(this.palette.energy) } },
      vertexShader: `varying vec3 vRiftWorld;
        void main() { vRiftWorld = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; uniform float uPulse; uniform vec3 uTint; varying vec3 vRiftWorld;
        float hash21(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
        void main() {
          vec3 ray = normalize(vRiftWorld - cameraPosition);
          vec3 light = vec3(.003, .008, .015);
          for (int layer = 0; layer < ${this.quality === 'low' ? 3 : 5}; layer++) {
            float depth = 1.2 + float(layer) * 1.65;
            vec3 samplePosition = vRiftWorld + ray * depth / max(.15, -ray.y);
            vec2 p = samplePosition.xz * (.8 + float(layer) * .17) + vec2(uTime * .025, -uTime * .012);
            vec2 cell = floor(p * 7.0), f = fract(p * 7.0) - .5;
            float seed = hash21(cell + float(layer) * 17.3);
            float star = exp(-dot(f,f) * 210.0) * step(.975, seed);
            float wave = sin(p.x * .7 + sin(p.y * .53 + uTime * .08) * 2.1 + float(layer));
            float filament = pow(.5 + .5 * sin(p.y * 1.3 + wave * 2.7), 12.0);
            light += uTint * (star * (3.2 - float(layer) * .35) + filament * .037) * exp(-float(layer) * .13);
          }
          float edge = 1.0 - smoothstep(3.4, 4.02, max(abs(vRiftWorld.x),abs(vRiftWorld.z)));
          light *= edge * (1.0 + uPulse * .8);
          gl_FragColor = vec4(light, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    const window = this.add(new THREE.Mesh(this.resources.geometry(new THREE.PlaneGeometry(7.78, 7.78)), material), this.rift);
    window.rotation.x = -Math.PI / 2; window.position.y = -9.34; window.name = 'shaft-terminal-volume';
  }

  private buildShaft() {
    // Four continuous walls occlude the lower machinery naturally; the foundations share this opening.
    for (const sign of [-1, 1]) {
      const side = this.add(this.box(.2, 6, 8.28, this.mats.darkStone, .04), this.rift);
      side.position.set(sign * 4.04, -6.38, 0); side.name = 'shaft-wall';
      const end = this.add(this.box(7.88, 6, .2, this.mats.darkStone, .04), this.rift);
      end.position.set(0, -6.38, sign * 4.04); end.name = 'shaft-wall';
    }
    for (let level = 0; level < 4; level++) {
      const y = -1.78 - level * 2.04;
      for (const sign of [-1, 1]) {
        const ledgeX = this.add(this.box(.23, .19, 7.84, this.mats.bronze, .035), this.rift);
        ledgeX.position.set(sign * 3.81, y, 0);
        const ledgeZ = this.add(this.box(7.84, .19, .23, this.mats.bronze, .035), this.rift);
        ledgeZ.position.set(0, y, sign * 3.81);
        const lightX = this.add(this.box(.036, .042, 6.9, this.mats.mutedEnergy, .008), this.rift);
        lightX.position.set(sign * 3.675, y - .055, 0);
        const lightZ = this.add(this.box(6.9, .042, .036, this.mats.mutedEnergy, .008), this.rift);
        lightZ.position.set(0, y - .055, sign * 3.675);
      }
      for (const x of [-3.52, 3.52]) for (const z of [-3.52, 3.52]) {
        const riser = this.add(this.box(.15, 1.85, .15, this.mats.bronze, .025), this.rift);
        riser.position.set(x, y - 1, z);
      }
    }
    for (const y of [-3.4, -6.5]) {
      const lamp = new THREE.PointLight(this.palette.energy, 7, 6, 2); lamp.position.set(0, y, 0); this.lights.add(lamp);
    }
  }

  private piercedSlab(width: number, depth: number, height: number, material: THREE.Material, x: number, y: number, z: number, octagonal = false) {
    const outline = new THREE.Shape();
    if (octagonal) {
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + i / 8 * Math.PI * 2;
        const px = Math.cos(a) * width / 2, py = Math.sin(a) * depth / 2;
        if (i === 0) outline.moveTo(px, py); else outline.lineTo(px, py);
      }
    } else {
      outline.moveTo(-width / 2, -depth / 2); outline.lineTo(width / 2, -depth / 2);
      outline.lineTo(width / 2, depth / 2); outline.lineTo(-width / 2, depth / 2);
    }
    outline.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-x - 4.2, z - 4.2); hole.lineTo(-x - 4.2, z + 4.2);
    hole.lineTo(-x + 4.2, z + 4.2); hole.lineTo(-x + 4.2, z - 4.2); hole.closePath(); outline.holes.push(hole);
    const geometry = this.resources.geometry(new THREE.ExtrudeGeometry(outline, { depth: height, bevelEnabled: true, bevelSize: .035, bevelThickness: .025, bevelSegments: 1, steps: 1 }));
    geometry.translate(0, 0, -height / 2); geometry.rotateX(-Math.PI / 2);
    const mesh = this.add(new THREE.Mesh(geometry, material)); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'foundation-with-shaft-opening';
  }

  private archStone(inner: number, outer: number, start: number, end: number, depth: number, material: THREE.Material) {
    const geometry = this.cachedGeometry(`arch:${inner}:${outer}:${start}:${end}:${depth}:${this.segmentCount}`, () => {
      const section = new THREE.Shape();
      section.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
      section.absarc(0, 0, outer, start, end, false);
      section.lineTo(Math.cos(end) * inner, Math.sin(end) * inner);
      section.absarc(0, 0, inner, end, start, true);
      section.closePath();
      const result = new THREE.ExtrudeGeometry(section, {
        depth, bevelEnabled: true, bevelThickness: .035, bevelSize: .035, bevelSegments: 1,
        curveSegments: this.segmentCount,
      });
      result.translate(0, 0, -depth / 2);
      return result;
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }

  private squarePillar(x: number, z: number, height: number, width: number, depth: number, shaft: THREE.Material, cap: THREE.Material = this.mats.stone) {
    const base = -3.3;
    const plinth = this.add(this.box(width * 1.55, .34, depth * 1.55, cap, .08));
    plinth.position.set(x, base + .17, z);
    const shaftMesh = this.add(this.box(width, height, depth, shaft, .07));
    shaftMesh.position.set(x, base + .34 + height / 2, z);
    const capital = this.add(this.box(width * 1.35, .28, depth * 1.35, cap, .06));
    capital.position.set(x, base + .34 + height + .14, z);
    return shaftMesh;
  }

  private starCluster(points: Array<[number, number, number]>, links: Array<[number, number]>) {
    const starGeometry = this.cachedGeometry('constellation-star', () => new THREE.SphereGeometry(.13, this.segmentCount, Math.max(6, Math.floor(this.segmentCount / 2))));
    const constellation = new THREE.Group(); constellation.name = 'restrained-constellation';
    for (const [x, y, z] of points) {
      const star = new THREE.Mesh(starGeometry, this.mats.energy);
      star.position.set(x, y, z); star.castShadow = false; star.receiveShadow = false; constellation.add(star);
    }
    for (const [from, to] of links) {
      const a = new THREE.Vector3(...points[from]!); const b = new THREE.Vector3(...points[to]!);
      const mid = a.clone().add(b).multiplyScalar(.5); const length = a.distanceTo(b);
      const link = this.add(this.box(.025, .025, length, this.mats.mutedEnergy, .008), constellation);
      link.position.copy(mid); link.lookAt(b); link.castShadow = false; link.receiveShadow = false;
    }
    this.group.add(constellation);
  }

  private sky(night: boolean) {
    const material = this.resources.material(new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uTime: this.volumeTime, uNight: { value: night ? 1 : 0 } },
      vertexShader: `varying vec3 vDirection;
        void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform float uTime; uniform float uNight; varying vec3 vDirection;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vDirection); float altitude = max(0.0,d.y);
          vec3 day = mix(vec3(.38,.53,.58), vec3(.105,.28,.43), pow(altitude,.5));
          float cloud = pow(.5 + .5 * sin(d.x * 14.0 + sin(d.z*17.0)) * sin(d.z*12.0 + d.y*25.0), 7.0);
          day += vec3(.15,.14,.10) * cloud * smoothstep(.1,.4,d.y);
          vec3 night = mix(vec3(.012,.018,.045), vec3(.001,.003,.014), pow(altitude,.35));
          vec2 uv = vec2(atan(d.z,d.x), asin(d.y)) * 150.0;
          vec2 f = fract(uv)-.5; float seed = hash(floor(uv));
          float star = exp(-dot(f,f)*120.0) * step(.982,seed);
          night += mix(vec3(.32,.51,.84),vec3(.95,.78,.53),seed) * star * (.8 + .2*sin(uTime*.3+seed*60.0));
          float galaxy = exp(-pow((d.y - .30 - d.x*.2) * 10.0,2.0));
          night += vec3(.016,.014,.038)*galaxy*(.5+.5*sin(d.x*38.0+sin(d.z*51.0)));
          gl_FragColor = vec4(mix(day,night,uNight),1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    const mesh = this.add(new THREE.Mesh(this.resources.geometry(new THREE.SphereGeometry(90, 32, 20)), material));
    mesh.renderOrder = -10;
  }

  buildGallery() {
    const velvet = this.resources.material(new THREE.MeshStandardMaterial({ color: 0x251d2d, roughness: .92, metalness: .02 }));
    const plaster = this.resources.material(new THREE.MeshStandardMaterial({ color: 0xc1a982, roughness: .68, metalness: .04 }));
    applyStoneDetail(plaster, this.stoneTexture, .32, .42);
    const warmGlass = this.resources.material(new THREE.MeshStandardMaterial({ color: 0x7b4730, emissive: 0xd17a46, emissiveIntensity: .78, roughness: .5 }));

    // A dark, pierced stage turns the two holes into the only real void in the room.
    this.piercedSlab(30, 52, .34, this.mats.floor, 0, -3.47, 0);
    const aisle = this.add(this.box(8.7, .045, 26, velvet, .02)); aisle.position.set(0, -3.275, -20);
    for (const x of [-6.1, 6.1]) {
      const edge = this.add(this.box(.14, .07, 36, this.mats.brass, .02)); edge.position.set(x, -3.23, -15.5);
    }
    for (const [z, width, depth, height] of [[-26, 24, 4.6, .42], [-30.3, 21.5, 3.8, .78]] as const) {
      const step = this.add(this.box(width, height, depth, plaster, .1)); step.position.set(0, -3.3 + height / 2, z);
      const nosing = this.add(this.box(width - .45, .09, .13, this.mats.brass, .02)); nosing.position.set(0, -3.3 + height + .03, z + depth / 2 - .12);
    }

    // Thick arch ribs establish depth while keeping the board as the stage's clear protagonist.
    for (const [z, inner, outer] of [[-11.5, 7.5, 8.25], [-21, 7.7, 8.55], [-30, 7.9, 8.75]] as const) {
      const arch = this.add(this.archStone(inner, outer, 0, Math.PI, .9, plaster)); arch.position.set(0, -3.12, z);
      const inset = this.add(this.archStone(inner + .18, inner + .34, 0, Math.PI, .18, this.mats.brass)); inset.position.set(0, -3.02, z + .49);
      for (const x of [-outer, outer]) this.squarePillar(x, z, 4.8, 1.3, 1.55, this.mats.stone, this.mats.darkStone);
    }

    // Side chapels are offset in depth so their mass frames, rather than crowds, the board.
    for (const side of [-1, 1]) {
      const wall = this.add(this.box(1.25, 7.6, 22, this.mats.darkStone, .1)); wall.position.set(side * 11.8, .1, -20);
      // The near pair sits just beyond the board rails so the temple reads in the default play view.
      this.squarePillar(side * 5.35, -6.2, 4.8, 1.0, 1.2, plaster, this.mats.darkStone);
      this.squarePillar(side * 5.8, -14.5, 6.5, 1.3, 1.6, this.mats.stone, this.mats.darkStone);
      this.squarePillar(side * 10.2, -27.2, 8.8, 2.1, 2.7, this.mats.stone, this.mats.darkStone);
      const relief = this.add(this.box(2.1, 4.5, .2, this.mats.bronze, .04)); relief.position.set(side * 10.15, .5, -20.4); relief.rotation.z = side * .08;
      const banner = this.add(this.box(.42, 4.8, .16, velvet, .025)); banner.position.set(side * 6.4, 2.45, -14.5); banner.rotation.z = side * .1;
      const crest = this.add(this.cylinder(.32, .42, .18, this.mats.brass, 8)); crest.position.set(side * 6.4, 5.06, -14.5);
    }

    // The rear apse is a physical set piece: a glowing oculus behind a broad stone portal.
    const apseWall = this.add(this.box(22, 10.2, .78, this.mats.darkStone, .12)); apseWall.position.set(0, 1.45, -34.2);
    const aperture = this.add(new THREE.Mesh(this.resources.geometry(new THREE.CircleGeometry(5.35, this.segmentCount * 3)), warmGlass)); aperture.position.set(0, 3.2, -33.72);
    const oculus = this.add(this.torus(5.85, .42, plaster, this.segmentCount, this.segmentCount * 3)); oculus.position.set(0, 3.2, -33.58);
    const innerOculus = this.add(this.torus(3.45, .13, this.mats.brass, this.segmentCount, this.segmentCount * 3)); innerOculus.position.set(0, 3.2, -33.42);
    for (const side of [-1, 1]) {
      this.squarePillar(side * 7.2, -33.6, 8.9, 1.45, 1.7, plaster, this.mats.stone);
      const inset = this.add(this.box(.16, 7.2, .12, this.mats.brass, .02)); inset.position.set(side * 6.7, .2, -33.1);
    }
    const apseCap = this.add(this.box(17.4, .72, 1.35, plaster, .1)); apseCap.position.set(0, 6.85, -33.5);

    // Warm practicals and cool spill are visible in the architecture, then echoed by buildLights().
    const lantern = this.resources.material(new THREE.MeshStandardMaterial({ color: 0xd18751, emissive: 0xf29b55, emissiveIntensity: 1.1, roughness: .42 }));
    for (const [x, y, z] of [[-8.9, 3.8, -14], [8.9, 4.2, -22], [-9.4, 3.5, -28]] as const) {
      const shade = this.add(this.cylinder(.34, .24, .52, this.mats.bronze, 8)); shade.position.set(x, y, z);
      const glow = this.add(this.box(.22, .36, .22, lantern, .035)); glow.position.set(x, y - .38, z);
    }
  }

  buildNocturne() {
    this.sky(true);
    this.piercedSlab(13.8, 18.5, .4, this.mats.floor, 0, -3.52, 0, true);
    const rim = this.add(this.torus(6.35, .15, this.mats.brass, this.segmentCount, this.segmentCount * 3)); rim.rotation.x = -Math.PI / 2; rim.position.set(0, -3.08, 0); rim.castShadow = false;
    const approach = this.add(this.box(5.2, .36, 29, this.mats.darkStone, .1)); approach.position.set(0, -3.36, -18.8);
    for (const x of [-2.42, 2.42]) { const edge = this.add(this.box(.08, .05, 28.8, this.mats.energy, .015)); edge.position.set(x, -3.14, -18.8); edge.castShadow = false; }
    for (const z of [-9, -14, -19, -24, -29]) { const seam = this.add(this.box(4.9, .02, .055, this.mats.bronze, .006)); seam.position.set(0, -3.15, z); seam.castShadow = false; }

    // Monumental fragments hang over a star sea, with the playable board left in a quiet aperture.
    const monoliths: Array<[number, number, number, number, number]> = [
      [-5.45, -7.2, 4.6, 1.0, .85], [5.45, -7.2, 4.6, 1.0, .85], [-10.5, -17.5, 7.7, 2.5, .9], [10.7, -19.5, 9.2, 2.2, 1.0], [-7.5, -30, 5.4, 1.8, .75], [7.8, -32, 7.1, 2.4, .85], [0, -36, 11.5, 2.4, 1.0],
    ];
    for (const [x, z, height, width, depth] of monoliths) {
      const slab = this.add(this.box(width, height, depth, this.mats.darkStone, .12)); slab.position.set(x, .9 + height / 2, z); slab.rotation.y = (x * .021) % .16;
      const crown = this.add(this.cylinder(width * .56, width * .70, .24, this.mats.bronze, 5)); crown.position.set(x, .9 + height + .12, z); crown.rotation.y = .2;
      const seam = this.add(this.box(.07, height * .72, .045, this.mats.energy, .01)); seam.position.set(x + (x < 0 ? width * .25 : -width * .25), .9 + height * .52, z - depth * .53); seam.castShadow = false;
    }
    // Split the suspended arc into side fragments; the board remains an unobstructed rift aperture.
    const leftArc = this.add(this.tube([
      new THREE.Vector3(-9.2, -1.1, -18), new THREE.Vector3(-8.7, 1.6, -13), new THREE.Vector3(-7.5, 5.0, -9), new THREE.Vector3(-6.1, 8.2, -5.5),
    ], .23, this.mats.brass, this.segmentCount * 2)); leftArc.castShadow = true;
    const rightArc = this.add(this.tube([
      new THREE.Vector3(9.2, -1.1, -18), new THREE.Vector3(8.7, 1.6, -13), new THREE.Vector3(7.5, 5.0, -9), new THREE.Vector3(6.1, 8.2, -5.5),
    ], .23, this.mats.brass, this.segmentCount * 2)); rightArc.castShadow = true;
    const leftGlow = this.add(this.tube([
      new THREE.Vector3(-9.0, -1.0, -18.25), new THREE.Vector3(-8.5, 1.7, -13.1), new THREE.Vector3(-7.35, 5.05, -9.1), new THREE.Vector3(-6.0, 8.1, -5.6),
    ], .045, this.mats.energy, this.segmentCount * 2)); leftGlow.castShadow = false;
    const rightGlow = this.add(this.tube([
      new THREE.Vector3(9.0, -1.0, -18.25), new THREE.Vector3(8.5, 1.7, -13.1), new THREE.Vector3(7.35, 5.05, -9.1), new THREE.Vector3(6.0, 8.1, -5.6),
    ], .045, this.mats.energy, this.segmentCount * 2)); rightGlow.castShadow = false;
    const crossArc = this.add(this.tube([
      new THREE.Vector3(-11, 2.4, -29), new THREE.Vector3(-6.8, 7.1, -30.4), new THREE.Vector3(-1.2, 10.2, -31.4),
      new THREE.Vector3(5.2, 8.8, -30.3), new THREE.Vector3(10.5, 3.8, -28.7),
    ], .2, this.mats.bronze, this.segmentCount * 2)); crossArc.rotation.z = -.08;

    this.starCluster([
      [-10.5, 8.4, -34], [-6.5, 10.2, -32], [-2.2, 8.9, -34.8], [2.7, 11.4, -33], [7.3, 9.1, -35.2],
      [10.2, 11.2, -31.2], [6.0, 13.1, -25.8], [0.2, 13.8, -27.3], [-5.2, 12.1, -26.2], [-9.4, 11.2, -28],
    ], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0]]);

    const anchor = this.add(this.cylinder(1.7, 2.2, .45, this.mats.bronze, this.segmentCount * 2)); anchor.position.set(0, -2.9, -25); anchor.castShadow = false;
    const anchorRing = this.add(this.torus(1.25, .08, this.mats.energy, this.segmentCount, this.segmentCount * 2)); anchorRing.rotation.x = -Math.PI / 2; anchorRing.position.set(0, -2.58, -25); anchorRing.castShadow = false;
  }

  buildDaylight() {
    this.sky(false);
    const limestone = this.resources.material(new THREE.MeshStandardMaterial({ color: 0xe0d3b3, roughness: .8, metalness: .025 }));
    applyStoneDetail(limestone, this.stoneTexture, .24, .58);
    const terracotta = this.resources.material(new THREE.MeshStandardMaterial({ color: 0xa86945, roughness: .76, metalness: .03 }));
    applyStoneDetail(terracotta, this.stoneTexture, .18, .52);

    // A clean courtyard plane and a single opening keep every piece silhouetted against light stone.
    this.piercedSlab(74, 96, .46, this.mats.floor, 0, -3.66, 0);
    for (const side of [-1, 1]) {
      const court = this.add(this.box(5.8, .5, 30, limestone, .12)); court.position.set(side * 6.2, -3.42, -10.5);
      const inset = this.add(this.box(2.65, .035, 25.6, this.mats.darkStone, .05)); inset.position.set(side * 6.2, -3.14, -10.5);
      const border = this.add(this.box(1.2, .12, 29, terracotta, .04)); border.position.set(side * 8.1, -3.11, -10.5);
    }
    const rearCourt = this.add(this.box(17.8, .5, 11, limestone, .12)); rearCourt.position.set(0, -3.42, -24.4);
    const rearInset = this.add(this.box(13.4, .035, 9.2, this.mats.darkStone, .05)); rearInset.position.set(0, -3.14, -24.4);

    // Close stepped markers sit outside the rails, so the court's monumentality survives the play camera.
    for (const side of [-1, 1]) {
      const plinth = this.add(this.box(1.45, .55, 6.4, limestone, .1)); plinth.position.set(side * 5.35, -3.02, -7.2);
      const cap = this.add(this.box(1.75, .16, 6.7, this.mats.stone, .06)); cap.position.set(side * 5.35, -2.68, -7.2);
      const marker = this.add(this.box(.72, 3.8, 1.05, terracotta, .08)); marker.position.set(side * 5.42, -.72, -9.1); marker.rotation.z = side * .04;
      const markerBand = this.add(this.box(.84, .16, 1.18, this.mats.brass, .04)); markerBand.position.set(side * 5.42, .52, -9.1); markerBand.rotation.z = side * .04;
    }

    // Offset terraces read as monumental geometry while leaving a broad central sightline.
    const terraces: Array<[number, number, number, number, number]> = [
      [-13.5, -12, 10.5, 12, .55], [13.2, -16.5, 11.8, 17, .85], [-14.4, -26, 15, 9.2, 1.35], [14.2, -29.5, 16.5, 10, 1.95],
    ];
    for (const [x, z, width, depth, height] of terraces) {
      const lower = this.add(this.box(width, height, depth, limestone, .11)); lower.position.set(x, -3.3 + height / 2, z);
      const upper = this.add(this.box(width - .65, .22, depth - .52, this.mats.stone, .07)); upper.position.set(x, -3.3 + height + .11, z);
      const seam = this.add(this.box(width - 1.0, .075, .10, terracotta, .02)); seam.position.set(x, -3.17 + height, z + depth / 2 - .18);
    }
    for (let i = 0; i < 6; i++) {
      const step = this.add(this.box(6.8 - i * .24, .18, 1.1, limestone, .035)); step.position.set(0, -3.05 + i * .18, -20.3 - i * 1.02);
    }

    // A far colonnade gives the court scale without placing a wall behind the board.
    const colonnadeZ = -34.5;
    for (const side of [-1, 1]) {
      this.squarePillar(side * 10.1, colonnadeZ, 8.3, 2.35, 2.8, limestone, this.mats.stone);
      this.squarePillar(side * 6.8, colonnadeZ, 6.5, 1.55, 2.1, terracotta, limestone);
    }
    const lintel = this.add(this.box(20.8, 1.05, 2.9, limestone, .12)); lintel.position.set(0, 5.6, colonnadeZ);
    const lintelInset = this.add(this.box(16.6, .17, .18, this.mats.brass, .025)); lintelInset.position.set(0, 5.1, colonnadeZ - 1.48);
    const sunDial = this.add(this.cylinder(1.0, 1.35, 7.3, this.mats.darkStone, 5)); sunDial.position.set(0, .42, -32.9); sunDial.rotation.y = Math.PI / 4;
    const dialCap = this.add(this.cylinder(1.35, 1.05, .32, terracotta, 5)); dialCap.position.set(0, 4.23, -32.9); dialCap.rotation.y = Math.PI / 4;
    const dialLine = this.add(this.box(.11, 5.7, .12, this.mats.brass, .025)); dialLine.position.set(0, .55, -31.35); dialLine.rotation.z = -.26; dialLine.castShadow = false;

    // Side buttresses and shade slabs complete the court's stepped silhouette.
    for (const side of [-1, 1]) {
      const buttress = this.add(this.box(2.35, 4.3, 4.1, limestone, .1)); buttress.position.set(side * 10.9, -1.05, -24.2); buttress.rotation.y = side * .12;
      const shade = this.add(this.box(8.5, .42, 2.25, limestone, .09)); shade.position.set(side * 11.4, 3.8, -27.7); shade.rotation.z = side * .07;
      const trim = this.add(this.box(7.5, .11, .16, terracotta, .025)); trim.position.set(side * 11.4, 3.56, -28.82); trim.rotation.z = side * .07;
    }
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(this.theme === 'nocturne' ? 0x9aabc8 : this.palette.fill, this.palette.floor, this.theme === 'daylight' ? .58 : this.theme === 'gallery' ? .38 : .38);
    this.lights.add(hemi);
    const keyColor = this.theme === 'gallery' ? 0xffb477 : this.theme === 'nocturne' ? 0xffdfba : this.palette.key;
    const keyIntensity = this.theme === 'gallery' ? 2.15 : this.theme === 'nocturne' ? 1.55 : 1.42;
    const key = new THREE.DirectionalLight(keyColor, keyIntensity);
    key.position.set(this.theme === 'gallery' ? -8.5 : -5.5, this.theme === 'daylight' ? 13.5 : 11.5, this.theme === 'gallery' ? 7.5 : 6.5); key.castShadow = true;
    const resolution = qualityValue(this.quality, 512, 1024, 2048);
    key.shadow.mapSize.set(resolution, resolution);
    key.shadow.camera.left = -5.5; key.shadow.camera.right = 5.5; key.shadow.camera.top = 5.5; key.shadow.camera.bottom = -5.5;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 24;
    key.shadow.bias = 0.00025; key.shadow.normalBias = 0.003; key.shadow.radius = 1.65;
    this.lights.add(key); this.shadowLights.push(key);
    const rimColor = this.theme === 'gallery' ? 0x80a9d2 : this.theme === 'nocturne' ? 0x6878df : 0xc7f2e5;
    const rim = new THREE.DirectionalLight(rimColor, this.theme === 'nocturne' ? 1.25 : this.theme === 'daylight' ? .52 : .92);
    rim.position.set(this.theme === 'gallery' ? 9 : 7, 7, -10); this.lights.add(rim);
    const riftBaseIntensity = this.theme === 'nocturne' ? 13 : this.theme === 'gallery' ? 9 : 7;
    const riftLight = new THREE.PointLight(this.palette.energy, riftBaseIntensity, 10, 2);
    riftLight.position.set(0, -1.65, 0); riftLight.userData.riftLight = true; riftLight.userData.riftBaseIntensity = riftBaseIntensity; this.lights.add(riftLight);
    if (this.theme === 'gallery') {
      const footWarm = new THREE.PointLight(0xffa05b, 86, 28, 2); footWarm.position.set(-8.5, 3.6, -17); this.lights.add(footWarm);
      const footCool = new THREE.PointLight(0x64b9d4, 105, 30, 2); footCool.position.set(8.5, 4.2, -24); this.lights.add(footCool);
      const apseWarm = new THREE.PointLight(0xe9884b, 125, 36, 2); apseWarm.position.set(0, 4, -31); this.lights.add(apseWarm);
    }
    if (this.theme === 'nocturne') {
      const skyGlow = new THREE.PointLight(0x5479ff, 36, 42, 2); skyGlow.position.set(-4, 10, -24); this.lights.add(skyGlow);
      const cyanGlow = new THREE.PointLight(0x51dfff, 24, 26, 2); cyanGlow.position.set(7, 5, -18); this.lights.add(cyanGlow);
    }
    if (this.theme === 'daylight') {
      // A separate shadow volume covers the far court; enlarging the board map would sacrifice piece contact detail.
      const sun = new THREE.DirectionalLight(0xffe1aa, 1.28); sun.position.set(-20, 24, -17);
      sun.target.position.set(0, -1, -26); sun.castShadow = true;
      sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true;
      sun.shadow.mapSize.set(resolution, resolution); sun.shadow.camera.left = -28; sun.shadow.camera.right = 28;
      sun.shadow.camera.top = 23; sun.shadow.camera.bottom = -23; sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
      sun.shadow.bias = .00015; sun.shadow.normalBias = .04; sun.shadow.radius = 1.3;
      this.lights.add(sun, sun.target); this.shadowLights.push(sun);
    }
  }

  tick(seconds: number, reducedMotion: boolean) {
    this.volumeTime.value = reducedMotion ? 0 : seconds;
    if (!reducedMotion) {
      this.movingParts.children.forEach((part, index) => {
        const spin = part.userData.riftSpin as number | undefined;
        if (spin) part.rotation.z = (part.userData.riftBaseZ as number) + seconds * spin;
        const pulse = part.userData.riftPulse as number | undefined;
        if (pulse) part.scale.setScalar(1 + Math.sin(seconds * 1.45 + index) * pulse);
      });
    }
    const riftLight = this.lights.children.find(object => object.userData.riftLight) as THREE.PointLight | undefined;
    if (riftLight) {
      const base = (riftLight.userData.riftBaseIntensity as number | undefined) ?? (this.theme === 'nocturne' ? 13 : 7);
      riftLight.intensity = base * (reducedMotion ? 1 : 0.9 + Math.sin(seconds * 1.7) * 0.1);
    }
  }

  dispose() {
    for (const light of this.shadowLights) light.shadow.map?.dispose();
    for (const instances of this.staticInstances) instances.dispose();
    this.group.clear(); this.lights.clear(); this.resources.dispose();
  }

  react(amount: number) { this.volumePulse.value = THREE.MathUtils.clamp(amount, 0, 1); }
}

export function buildWorld(theme: WorldTheme, quality: WorldQuality, stoneTexture: THREE.Texture): BuiltWorld {
  const palette = PALETTES[theme];
  const craft = new WorldCraft(theme, quality, palette, stoneTexture);
  craft.buildInstrument();
  if (theme === 'gallery') craft.buildGallery();
  if (theme === 'nocturne') craft.buildNocturne();
  if (theme === 'daylight') craft.buildDaylight();
  craft.buildLights();
  craft.finalizeStaticMeshes();
  return {
    group: craft.group,
    lights: craft.lights,
    background: new THREE.Color(palette.background),
    fog: new THREE.Fog(palette.fog, theme === 'daylight' ? 58 : theme === 'nocturne' ? 44 : 30, theme === 'daylight' ? 138 : theme === 'nocturne' ? 132 : 72),
    exposure: theme === 'daylight' ? .92 : theme === 'gallery' ? .98 : .94,
    environmentIntensity: theme === 'daylight' ? .46 : theme === 'gallery' ? .42 : .38,
    tick: (seconds, reducedMotion) => craft.tick(seconds, reducedMotion),
    react: amount => craft.react(amount),
    dispose: () => craft.dispose(),
  };
}
