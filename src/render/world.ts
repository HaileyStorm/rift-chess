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
    background: 0x0c171d, fog: 0x1a3039, stone: 0x9c9f91, darkStone: 0x344d50,
    bronze: 0x805b31, brass: 0xd7af68, energy: 0x86cad3, fill: 0x9dbdc4,
    floor: 0x293e40, key: 0xffdfaf,
  },
  nocturne: {
    background: 0x050817, fog: 0x0b1230, stone: 0x28334c, darkStone: 0x10172b,
    bronze: 0x45547c, brass: 0xa6b5e8, energy: 0x77dfff, fill: 0x788cc4,
    floor: 0x101936, key: 0xc7d7ff,
  },
  daylight: {
    background: 0x829eaa, fog: 0x829ca4, stone: 0xb9aa8b, darkStone: 0x716752,
    bronze: 0x806041, brass: 0xd3aa5c, energy: 0x75c5bb, fill: 0xd9f4ee,
    floor: 0xa6b6ae, key: 0xffefc9,
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

  private domePanel(phiStart: number, phiLength: number) {
    const steps = this.segmentCount;
    const row = steps + 1;
    const sheetSize = row * row;
    const positions: number[] = [], indices: number[] = [];
    for (const radius of [13.2, 12.94]) {
      for (let j = 0; j <= steps; j++) for (let i = 0; i <= steps; i++) {
        const theta = .08 + j / steps * (Math.PI / 2 - .08);
        const phi = phiStart + i / steps * phiLength;
        positions.push(-radius * Math.cos(phi) * Math.sin(theta), radius * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta));
      }
    }
    for (let j = 0; j < steps; j++) for (let i = 0; i < steps; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      indices.push(a, c, b, b, c, d);
      indices.push(a + sheetSize, b + sheetSize, c + sheetSize, b + sheetSize, d + sheetSize, c + sheetSize);
    }
    // Close all four panel edges; interior surfaces have their own outward winding.
    const edge: number[] = [];
    for (let i = 0; i <= steps; i++) edge.push(i);
    for (let j = 1; j <= steps; j++) edge.push(j * row + steps);
    for (let i = steps - 1; i >= 0; i--) edge.push(steps * row + i);
    for (let j = steps - 1; j > 0; j--) edge.push(j * row);
    for (let i = 0; i < edge.length; i++) {
      const a = edge[i], b = edge[(i + 1) % edge.length];
      indices.push(a, b, a + sheetSize, b, b + sheetSize, a + sheetSize);
    }
    const geometry = this.resources.geometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, this.mats.stone); mesh.name = 'observatory-dome-panel';
    return mesh;
  }

  private water(width: number, depth: number, x: number, y: number, z: number, night = false) {
    const material = this.resources.material(new THREE.ShaderMaterial({
      uniforms: { uTime: this.volumeTime, uNight: { value: night ? 1 : 0 } },
      vertexShader: `uniform float uTime; varying vec3 vWater; varying vec2 vWavePosition;
        void main() {
          vec3 p = position;
          float a = p.x * 1.15 + p.y * .48 + uTime * .42;
          float b = p.x * -.35 + p.y * 1.62 - uTime * .31;
          p.z += sin(a) * .025 + sin(b) * .016;
          vWavePosition = position.xy;
          vWater = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWater, 1.0);
        }`,
      fragmentShader: `uniform float uTime; uniform float uNight; varying vec3 vWater; varying vec2 vWavePosition;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main() {
          if (max(abs(vWater.x), abs(vWater.z)) < 4.2) discard;
          vec3 view = normalize(cameraPosition - vWater);
          float a = vWavePosition.x * 1.15 + vWavePosition.y * .48 + uTime * .42;
          float b = vWavePosition.x * -.35 + vWavePosition.y * 1.62 - uTime * .31;
          vec3 n = normalize(vec3(-cos(a)*.02875 + cos(b)*.0056, 1.0, cos(a)*.012 + cos(b)*.02592));
          float fresnel = pow(1.0 - max(dot(n, view), 0.0), 3.0);
          float glint = pow(max(dot(reflect(normalize(vec3(.6,-1.0,-.3)), n), view), 0.0), 130.0);
          vec2 p = vWater.xz;
          float caustic = pow(.5 + .5 * sin(p.x * 2.4 + sin(p.y * 1.7 + uTime * .2)) * sin(p.y * 2.1 - uTime * .16), 9.0);
          vec3 day = mix(vec3(.055,.20,.18), vec3(.53,.72,.70), fresnel) + vec3(.47,.65,.42) * caustic * .16;
          vec3 night = mix(vec3(.003,.008,.022), vec3(.025,.045,.10), fresnel);
          vec2 cell = floor(p * .7); vec2 f = fract(p * .7) - .5;
          float star = exp(-dot(f,f)*180.0) * step(.982, hash(cell));
          night += vec3(.19,.31,.54) * star * (.65 + .35 * sin(uTime * .35 + hash(cell) * 6.28));
          gl_FragColor = vec4(mix(day, night, uNight) + glint * mix(vec3(1.4,1.05,.6),vec3(.012,.022,.035),uNight), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    const subdivisions = qualityValue(this.quality, 24, 48, 72);
    const mesh = this.add(new THREE.Mesh(this.resources.geometry(new THREE.PlaneGeometry(width, depth, subdivisions, subdivisions)), material));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z);
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
          vec3 night = mix(vec3(.032,.047,.085), vec3(.002,.004,.016), pow(altitude,.35));
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

  private galleryFloor() {
    this.piercedSlab(25.6, 54, .28, this.mats.floor, 0, -3.44, -11);
    // The aisle terminates at the shaft: its three joined bays leave the front aperture open.
    for (const x of [-4.8, 4.8]) {
      const edgeBay = this.add(this.box(1.2, .045, 34.5, this.mats.darkStone, .018)); edgeBay.position.set(x, -3.275, -16.8);
    }
    const aisle = this.add(this.box(8.4, .045, 29.85, this.mats.darkStone, .018)); aisle.position.set(0, -3.275, -19.125);
    for (const [z, width, depth, height] of [[-28.2, 24.2, 4.7, .42], [-32.4, 22.2, 3.8, .72]] as const) {
      const terrace = this.add(this.box(width, height, depth, this.mats.stone, .1));
      terrace.position.set(0, -3.3 + height / 2, z);
      const nosing = this.add(this.box(width - .4, .08, .12, this.mats.brass, .02));
      nosing.position.set(0, -3.3 + height + .02, z + depth / 2 - .12);
    }
    for (const x of [-5.65, 5.65]) {
      const edge = this.add(this.box(.16, .07, 35, this.mats.brass, .02));
      edge.position.set(x, -3.23, -16.8);
    }
    for (const z of [-8, -16, -24, -28.2]) {
      const seam = this.add(this.box(10.55, .026, .07, this.mats.bronze, .01));
      seam.position.set(0, -3.242, z);
    }
  }

  private galleryRib(z: number) {
    const points = [
      new THREE.Vector3(-10, -3.3, z), new THREE.Vector3(-10, .8, z),
      new THREE.Vector3(-9.5, 5.3, z), new THREE.Vector3(-7.2, 8.35, z),
      new THREE.Vector3(-3.9, 9.75, z), new THREE.Vector3(0, 10.15, z),
      new THREE.Vector3(3.9, 9.75, z), new THREE.Vector3(7.2, 8.35, z),
      new THREE.Vector3(9.5, 5.3, z), new THREE.Vector3(10, .8, z), new THREE.Vector3(10, -3.3, z),
    ];
    this.add(this.tube(points, .34, this.mats.stone));
    const bronzePoints = points.map(point => point.clone().add(new THREE.Vector3(0, 0, .29)));
    this.add(this.tube(bronzePoints, .075, this.mats.bronze, this.segmentCount * 2));
    for (const x of [-10, 10]) {
      const plinth = this.add(this.box(1.85, .62, 2.2, this.mats.darkStone, .12));
      plinth.position.set(x, -2.99, z);
      const pier = this.add(this.box(1.14, 4.2, 1.25, this.mats.stone, .1));
      pier.position.set(x, -1.2, z);
      const belt = this.add(this.box(1.28, .16, 1.38, this.mats.bronze, .025));
      belt.position.set(x, .86, z);
      const capital = this.add(this.box(1.5, .34, 1.58, this.mats.darkStone, .08));
      capital.position.set(x, 1.04, z);
    }
  }

  buildGallery() {
    this.galleryFloor();
    for (const z of [-12, -20, -28]) this.galleryRib(z);
    for (const x of [-10, 10]) {
      const wall = this.add(this.box(.72, 5.4, 32.8, this.mats.darkStone, .1));
      wall.position.set(x + (x < 0 ? -1.72 : 1.72), -.6, -20);
      for (const z of [-12, -20, -28]) {
        const buttress = this.add(this.box(2.15, 1.05, 1.9, this.mats.stone, .1));
        buttress.position.set(x + (x < 0 ? -1.08 : 1.08), -2.78, z);
      }
      const connector = this.add(this.tube([new THREE.Vector3(x, .8, -12), new THREE.Vector3(x, .8, -20), new THREE.Vector3(x, .8, -28)], .12, this.mats.bronze));
      connector.castShadow = false;
    }
    for (const x of [-7.2, 7.2]) {
      this.add(this.tube([new THREE.Vector3(x, 8.35, -12), new THREE.Vector3(x, 8.35, -20), new THREE.Vector3(x, 8.35, -28)], .14, this.mats.stone));
    }

    const windowZ = -34.15;
    const warm = this.resources.material(new THREE.MeshStandardMaterial({ color: 0xb9976b, emissive: 0xb4834b, emissiveIntensity: .38, metalness: .05, roughness: .58 }));
    const windowWall = this.add(this.box(19.8, 13.6, .74, this.mats.darkStone, .13)); windowWall.position.set(0, 3.45, windowZ);
    const aperture = this.add(new THREE.Mesh(this.resources.geometry(new THREE.CircleGeometry(4.25, this.segmentCount * 3)), warm));
    aperture.position.set(0, 5.25, windowZ + .4);
    const oculus = this.add(this.torus(4.65, .36, this.mats.stone, this.segmentCount, this.segmentCount * 3));
    oculus.position.set(0, 5.25, windowZ + .52);
    const innerOculus = this.add(this.torus(2.25, .12, this.mats.bronze, this.segmentCount, this.segmentCount * 3));
    innerOculus.position.set(0, 5.25, windowZ + .6);
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      const spoke = this.add(this.box(.09, 4.05, .13, this.mats.bronze, .015));
      spoke.position.set(Math.sin(angle) * 1.95, 5.25 + Math.cos(angle) * 1.95, windowZ + .67); spoke.rotation.z = angle;
    }
    for (const x of [-7.05, 7.05]) {
      const jamb = this.add(this.box(1.18, 12.8, 1.02, this.mats.stone, .12)); jamb.position.set(x, 3.1, windowZ);
      const inset = this.add(this.box(.18, 9.8, .13, this.mats.brass, .02)); inset.position.set(x + (x < 0 ? .47 : -.47), 3.4, windowZ + .56);
    }
    const sill = this.add(this.box(15.2, .72, 1.42, this.mats.stone, .12)); sill.position.set(0, -2.94, windowZ);
    const lintel = this.add(this.box(15.2, .78, 1.42, this.mats.stone, .12)); lintel.position.set(0, 9.25, windowZ);

    for (const [x, y, z, color, intensity] of [[-6, 5.5, -15, 0xc6dadd, 140], [5, 5.5, -24, 0xefd2a9, 170], [-4, 4.5, -31, 0xc6dadd, 85]] as const) {
      const light = new THREE.PointLight(color, intensity, 24, 2); light.position.set(x, y, z); this.lights.add(light);
    }

    for (const [x, z, sx, sz] of [[-4.38, -4.38, -8.9, -9.7], [4.38, -4.38, 8.9, -9.7], [-4.38, 4.38, -9.4, -5.7], [4.38, 4.38, 9.4, -5.7]] as const) {
      const cable = this.add(this.tube([new THREE.Vector3(x, -.72, z), new THREE.Vector3((x + sx) / 2, -1.68, (z + sz) / 2), new THREE.Vector3(sx, -2.96, sz)], .055, this.mats.bronze));
      cable.castShadow = false;
      const anchor = this.add(this.cylinder(.21, .29, .24, this.mats.brass)); anchor.position.set(sx, -3.06, sz);
    }
  }

  buildNocturne() {
    this.sky(true);
    this.water(150, 150, 0, -4.12, -20, true);
    // A narrow approach and an octagonal landing anchor the instrument above the star sea.
    this.piercedSlab(15.3, 15.3, .5, this.mats.darkStone, 0, -3.55, 0, true);
    this.piercedSlab(15.44, 15.44, .055, this.mats.bronze, 0, -3.84, 0, true);
    const approach = this.add(this.box(4.8, .48, 31.2, this.mats.darkStone, .12)); approach.position.set(0, -3.54, -21.9);
    for (const x of [-2.29, 2.29]) {
      const edge = this.add(this.box(.1, .05, 31.05, this.mats.brass, .018)); edge.position.set(x, -3.275, -21.9);
    }
    for (const z of [-8, -11.5, -15, -18.5, -22, -25.5, -29, -32.5]) {
      const joint = this.add(this.box(4.52, .018, .065, this.mats.bronze, .008)); joint.position.set(0, -3.29, z);
    }
    for (const x of [-4.31, 4.31]) for (const z of [-4.31, 4.31]) {
      const foot = this.add(this.cylinder(.37, .67, .30, this.mats.bronze)); foot.position.set(x, -3.14, z);
      const support = this.add(this.cylinder(.17, .3, 1.8, this.mats.darkStone)); support.position.set(x, -2.2, z);
    }

    const centerZ = -38;
    const foundation = this.add(this.cylinder(13.7, 14.1, .65, this.mats.darkStone, this.segmentCount * 3));
    foundation.position.set(0, -3.625, centerZ);
    // Each hemisphere panel has a gap at its meridian, revealing the metal rib and the sky.
    for (let i = 0; i < 8; i++) {
      const phi = Math.PI + i * Math.PI / 8;
      const shell = this.add(this.domePanel(phi + .035, Math.PI / 8 - .07));
      shell.position.set(0, -3.3, centerZ);
      // Solid curved meridians carry the dome shell down to radial foundation blocks.
      const ribPoints: THREE.Vector3[] = [];
      for (let j = 0; j <= 12; j++) {
        const theta = .07 + j / 12 * (Math.PI / 2 - .07);
        ribPoints.push(new THREE.Vector3(-13.23 * Math.cos(phi) * Math.sin(theta), -3.3 + 13.23 * Math.cos(theta), centerZ + 13.23 * Math.sin(phi) * Math.sin(theta)));
      }
      this.add(this.tube(ribPoints, .12, this.mats.brass, this.segmentCount * 3));
      const shoe = this.add(this.box(1.25, .6, 1.25, this.mats.bronze, .1));
      shoe.position.set(-13.23 * Math.cos(phi), -3.05, centerZ + 13.23 * Math.sin(phi)); shoe.rotation.y = -phi;
    }
    const domeLip = this.add(this.archStone(13.08, 13.38, 0, Math.PI, .3, this.mats.bronze));
    domeLip.position.set(0, -3.3, centerZ);

    // The outer meridian is bolted to two bearings; the tilted equator shares its central axis.
    const instrumentCenter = new THREE.Vector3(0, 5.25, centerZ + 1.5);
    for (const x of [-9.6, 9.6]) {
      const base = this.add(this.box(3.3, .6, 3.3, this.mats.bronze, .16)); base.position.set(x, -3, centerZ + 1.5);
      const pier = this.add(this.box(1.55, 7.95, 1.95, this.mats.darkStone, .15)); pier.position.set(x, .975, centerZ + 1.5);
      const capital = this.add(this.box(2.4, .55, 2.65, this.mats.stone, .1)); capital.position.set(x, 4.96, centerZ + 1.5);
      const bearing = this.add(this.cylinder(.53, .53, 1.5, this.mats.brass)); bearing.rotation.z = Math.PI / 2; bearing.position.set(x, 5.25, centerZ + 1.5);
      const bearingInset = this.add(this.torus(.38, .065, this.mats.bronze)); bearingInset.rotation.y = Math.PI / 2; bearingInset.position.set(x + (x < 0 ? -.76 : .76), 5.25, centerZ + 1.5);
    }
    const meridian = this.add(this.torus(8.8, .17, this.mats.brass, this.segmentCount, this.segmentCount * 5)); meridian.position.copy(instrumentCenter);
    const innerMeridian = this.add(this.torus(8.47, .045, this.mats.energy, 8, this.segmentCount * 5)); innerMeridian.position.copy(instrumentCenter);
    const equator = new THREE.Group(); equator.position.copy(instrumentCenter); equator.rotation.set(1.02, -.3, -.3); this.group.add(equator);
    this.add(this.torus(7.85, .12, this.mats.bronze, this.segmentCount, this.segmentCount * 5), equator);
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2;
      const mark = this.add(this.box(i % 4 ? .065 : .105, i % 4 ? .19 : .39, .09, this.mats.brass, .012));
      mark.position.set(Math.sin(a) * 8.62, 5.25 + Math.cos(a) * 8.62, centerZ + 1.7); mark.rotation.z = -a;
    }
    const planetMaterial = this.resources.material(new THREE.ShaderMaterial({
      uniforms: { uTime: this.volumeTime },
      vertexShader: `varying vec3 vPlanet; varying vec3 vNormal;
        void main() { vPlanet = position; vNormal = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; varying vec3 vPlanet; varying vec3 vNormal;
        void main() {
          vec3 p = normalize(vPlanet); float longitude = atan(p.z,p.x) + uTime*.012;
          float turbulence = sin(longitude*7.0 + p.y*24.0)*.16 + sin(longitude*13.0 - p.y*8.0)*.06;
          float band = .5 + .5*sin(p.y*29.0 + turbulence*4.0);
          vec3 surface = mix(vec3(.065,.16,.26), vec3(.43,.63,.67), smoothstep(.15,.88,band));
          float warmBand = smoothstep(.76,.93,.5+.5*sin(p.y*13.0+.4));
          surface = mix(surface, vec3(.62,.34,.17), warmBand*.8);
          float lighting = max(dot(normalize(vNormal),normalize(vec3(-.8,.7,1.0))),0.0);
          float rim = pow(1.0 - abs(p.z),3.0);
          gl_FragColor = vec4(surface*(.13+lighting*1.55) + vec3(.065,.17,.24)*rim,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    const planet = this.add(new THREE.Mesh(this.resources.geometry(new THREE.SphereGeometry(3.05, this.segmentCount * 3, this.segmentCount * 2)), planetMaterial));
    planet.position.copy(instrumentCenter); planet.rotation.z = -.27;
    const arm = this.add(this.cylinder(.15, .15, 17.4, this.mats.bronze)); arm.position.copy(instrumentCenter); arm.rotation.z = -.27;
    for (const sign of [-1, 1]) {
      const end = this.add(this.cylinder(.32, .32, .27, this.mats.brass));
      end.position.set(Math.sin(.27) * sign * 8.68, 5.25 + Math.cos(.27) * sign * 8.68, centerZ + 1.5); end.rotation.z = -.27;
    }
    const observatoryLight = new THREE.PointLight(0x9aaeff, 210, 32, 2); observatoryLight.position.set(-4, 8, centerZ + 9); this.lights.add(observatoryLight);
  }

  buildDaylight() {
    this.sky(false);
    const sand = this.resources.material(new THREE.MeshStandardMaterial({ color: 0xbba67e, roughness: .84, metalness: .025 }));
    applyStoneDetail(sand, this.stoneTexture, .22, .7);
    const terracotta = this.resources.material(new THREE.MeshStandardMaterial({ color: 0xa56844, roughness: .79, metalness: .035 }));
    applyStoneDetail(terracotta, this.stoneTexture, .16, .7);
    const garden = this.resources.material(new THREE.MeshStandardMaterial({ color: 0x46624b, roughness: .93 }));
    this.piercedSlab(180, 160, .5, this.mats.darkStone, 0, -4.36, -40);
    this.water(178, 158, 0, -3.86, -40);

    // The instrument island sits within a reflecting court, connected by a limestone causeway.
    this.piercedSlab(12.8, 12.8, .56, sand, 0, -3.58, 0);
    this.piercedSlab(13.05, 13.05, .14, this.mats.darkStone, 0, -3.83, 0);
    const causeway = this.add(this.box(5.4, .6, 16.4, sand, .12)); causeway.position.set(0, -3.6, -14.35);
    for (const x of [-6.1, 6.1]) {
      const joint = this.add(this.box(.075, .015, 12.1, this.mats.bronze, .01)); joint.position.set(x, -3.292, 0);
    }
    for (const z of [-6.1, 6.1]) {
      const joint = this.add(this.box(12.1, .015, .075, this.mats.bronze, .01)); joint.position.set(0, -3.292, z);
    }
    for (const x of [-4.31, 4.31]) for (const z of [-4.31, 4.31]) {
      const foot = this.add(this.box(.94, .24, .94, this.mats.bronze, .10)); foot.position.set(x, -3.18, z);
      const leg = this.add(this.cylinder(.19, .34, 1.8, this.mats.darkStone)); leg.position.set(x, -2.18, z);
    }

    // Broad, offset terraces form the garden's banks; open water remains between them.
    for (const [x, z, w, d, rise] of [[-17.2, -11.2, 12.1, 16, .25], [16, -17.5, 10, 30, .55], [-13.3, -28, 20, 13, 1.15], [7.8, -34, 30, 13, 1.75]] as const) {
      const terrace = this.add(this.box(w, rise + .9, d, sand, .14)); terrace.position.set(x, -3.86 + (rise + .9) / 2 - .45, z);
      const coping = this.add(this.box(w + .24, .18, d + .24, this.mats.stone, .075)); coping.position.set(x, -3.32 + rise, z);
      const seam = this.add(this.box(w - .15, .09, .08, terracotta, .02)); seam.position.set(x, -3.42 + rise, z + d / 2 + .08);
    }
    for (let i = 0; i < 5; i++) {
      const step = this.add(this.box(6.1, .19, 1.2, sand, .04)); step.position.set(0, -3.205 + i * .19, -21.6 - i * 1.05);
    }
    // Water descends from the upper reservoir through a narrow, wall-mounted spillway.
    const reservoir = this.add(this.box(14.6, 1.18, 6.2, terracotta, .12)); reservoir.position.set(-8.5, -2.46, -28.8);
    this.water(13.8, 5.45, -8.5, -1.84, -28.8);
    for (const x of [-15.7, -1.3]) {
      const curb = this.add(this.box(.26, .32, 6.2, sand, .05)); curb.position.set(x, -1.76, -28.8);
    }
    const backCurb = this.add(this.box(14.6, .32, .25, sand, .05)); backCurb.position.set(-8.5, -1.76, -31.78);
    for (const x of [-12.3, -4.7]) {
      const lip = this.add(this.box(1.6, .17, .72, this.mats.darkStone, .04)); lip.position.set(x, -1.91, -25.61);
      const fallMaterial = this.resources.material(new THREE.MeshStandardMaterial({ color: 0x83b5a5, metalness: .38, roughness: .2, transparent: true, opacity: .74 }));
      const fall = this.add(this.box(1.36, 1.64, .1, fallMaterial, .02)); fall.position.set(x, -2.75, -25.30); fall.castShadow = false;
    }

    // Barrel vaults have solid curved roofs, true open archways, piers, spring courses and footings.
    for (const [cx, z, depth, spring, radius] of [[18.8, -32.0, 7.8, 1.3, 4.2], [18.8, -43.4, 7.8, 2.1, 4.2], [-9.1, -42.6, 5.4, 2.0, 5.5]] as const) {
      const footY = cx < 0 ? -1.65 : -1.45;
      const foundation = this.add(this.box(radius * 2 + 3.2, footY + 4.35, depth + 2.3, sand, .12));
      foundation.position.set(cx, -4.35 + (footY + 4.35) / 2, z);
      const roof = this.add(this.archStone(radius, radius + .35, 0, Math.PI, depth, sand)); roof.position.set(cx, spring, z);
      for (const edgeZ of [z - depth / 2, z + depth / 2]) {
        for (let i = 0; i < 11; i++) {
          const voussoir = this.add(this.archStone(radius - .07, radius + .46, i * Math.PI / 11 + .009, (i + 1) * Math.PI / 11 - .009, .46, i === 5 ? terracotta : this.mats.stone));
          voussoir.position.set(cx, spring, edgeZ);
        }
        for (const sign of [-1, 1]) {
          const x = cx + sign * (radius + .15);
          const height = spring - footY;
          const footing = this.add(this.box(1.55, .3, 1.7, this.mats.stone, .08)); footing.position.set(x, footY + .15, edgeZ);
          const pier = this.add(this.box(.80, height, .94, sand, .07)); pier.position.set(x, footY + height / 2, edgeZ);
          const capital = this.add(this.box(1.22, .24, 1.36, terracotta, .055)); capital.position.set(x, spring - .10, edgeZ);
        }
      }
      for (const sign of [-1, 1]) {
        const eave = this.add(this.box(.59, .22, depth + .55, terracotta, .06)); eave.position.set(cx + sign * (radius + .15), spring, z);
      }
    }

    // Planting belongs to two long recessed beds, with a low, wind-shaped silhouette.
    for (const [x, z, length] of [[-19.2, -11.4, 12.7], [20, -26.3, 17.0]] as const) {
      const bed = this.add(this.box(2.4, .45, length, terracotta, .12)); bed.position.set(x, -2.78, z);
      const soil = this.add(this.box(2.12, .07, length - .28, this.mats.darkStone, .04)); soil.position.set(x, -2.52, z);
      const stemGeometry = this.resources.geometry(new THREE.CylinderGeometry(.055, .08, 1.15, 6));
      const leafGeometry = this.resources.geometry(new THREE.SphereGeometry(.6, 10, 8));
      for (let i = 0; i < 7; i++) {
        const plantZ = z - length * .4 + i * length * .8 / 6;
        const stem = this.add(new THREE.Mesh(stemGeometry, terracotta)); stem.position.set(x, -2.06, plantZ); stem.rotation.z = -.13;
        const crown = this.add(new THREE.Mesh(leafGeometry, garden)); crown.position.set(x + .1, -1.46, plantZ); crown.scale.set(1.4, .65, 1.2);
        crown.castShadow = true;
      }
    }
    // One eroded shoreline rises continuously out of the pool bed into the distant limestone ridge.
    const terrain = this.resources.geometry(new THREE.PlaneGeometry(170, 54, qualityValue(this.quality, 56, 84, 112), qualityValue(this.quality, 18, 27, 36)));
    terrain.rotateX(-Math.PI / 2); terrain.translate(0, 0, -77);
    const positions = terrain.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      const inland = -z - 50 + Math.sin(x * .09) * 3.3 + Math.sin(x * .27) * 1.1;
      const ascent = THREE.MathUtils.smoothstep(inland, 1, 19);
      const ridge = 8.2 + Math.sin(x * .072) * 3.1 + Math.sin(x * .21 + .8) * 1.2 + Math.sin(x * .61) * .42;
      const erosion = Math.sin(x * .48 + z * .16) * .55 + Math.sin(x * .95 - z * .28) * .20;
      positions.setY(i, -4.12 + ascent * (ridge + 4.12) + erosion * ascent * (1 - ascent));
    }
    terrain.computeVertexNormals();
    const escarpment = this.add(new THREE.Mesh(terrain, sand)); escarpment.name = 'connected-limestone-shore';
    escarpment.castShadow = true; escarpment.receiveShadow = true;
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(this.palette.fill, this.palette.floor, this.theme === 'daylight' ? .46 : .48);
    this.lights.add(hemi);
    const key = new THREE.DirectionalLight(this.palette.key, this.theme === 'daylight' ? 1.15 : 1.85);
    key.position.set(-4.5, 10.5, 5.5); key.castShadow = true;
    const resolution = qualityValue(this.quality, 512, 1024, 2048);
    key.shadow.mapSize.set(resolution, resolution);
    key.shadow.camera.left = -5.5; key.shadow.camera.right = 5.5; key.shadow.camera.top = 5.5; key.shadow.camera.bottom = -5.5;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 24;
    key.shadow.bias = 0.00025; key.shadow.normalBias = 0.003; key.shadow.radius = 1.65;
    this.lights.add(key); this.shadowLights.push(key);
    const rim = new THREE.DirectionalLight(this.palette.fill, this.theme === 'nocturne' ? 1.45 : this.theme === 'daylight' ? .45 : 1.05);
    rim.position.set(6.5, 6, -8); this.lights.add(rim);
    const riftLight = new THREE.PointLight(this.palette.energy, this.theme === 'nocturne' ? 16 : 10, 10, 2);
    riftLight.position.set(0, -1.65, 0); riftLight.userData.riftLight = true; this.lights.add(riftLight);
    if (this.theme === 'daylight') {
      // A separate shadow volume covers the garden; enlarging the board map would sacrifice piece contact detail.
      const sun = new THREE.DirectionalLight(0xffe1aa, 1.15); sun.position.set(-18, 23, -19);
      sun.target.position.set(6, -1, -37); sun.castShadow = true;
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
    if (riftLight) riftLight.intensity = (this.theme === 'nocturne' ? 16 : 10) * (reducedMotion ? 1 : 0.9 + Math.sin(seconds * 1.7) * 0.1);
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
    fog: new THREE.Fog(palette.fog, theme === 'daylight' ? 60 : theme === 'nocturne' ? 52 : 36, theme === 'daylight' ? 125 : theme === 'nocturne' ? 108 : 78),
    exposure: theme === 'daylight' ? .85 : theme === 'gallery' ? .95 : .98,
    environmentIntensity: theme === 'daylight' ? .42 : theme === 'gallery' ? .50 : .52,
    tick: (seconds, reducedMotion) => craft.tick(seconds, reducedMotion),
    react: amount => craft.react(amount),
    dispose: () => craft.dispose(),
  };
}
