import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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
  dispose: () => void;
}

type Palette = {
  background: number; fog: number; stone: number; darkStone: number; bronze: number;
  brass: number; energy: number; fill: number; floor: number; key: number;
};

const PALETTES: Record<WorldTheme, Palette> = {
  gallery: {
    background: 0x0c171d, fog: 0x1a3039, stone: 0x9c9f91, darkStone: 0x263b40,
    bronze: 0x805b31, brass: 0xd7af68, energy: 0x86cad3, fill: 0x9dbdc4,
    floor: 0x15282b, key: 0xffdfaf,
  },
  nocturne: {
    background: 0x050817, fog: 0x0b1230, stone: 0x28334c, darkStone: 0x10172b,
    bronze: 0x45547c, brass: 0xa6b5e8, energy: 0x77dfff, fill: 0x788cc4,
    floor: 0x101936, key: 0xc7d7ff,
  },
  daylight: {
    background: 0xb9d1d6, fog: 0xc6d9d7, stone: 0xb9aa8b, darkStone: 0x716752,
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

  constructor(readonly theme: WorldTheme, readonly quality: WorldQuality, readonly palette: Palette) {
    this.segmentCount = qualityValue(quality, 10, 16, 24);
    const material = (color: number, metalness: number, roughness: number, emissive = 0, emissiveIntensity = 0) =>
      this.resources.material(new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity }));
    this.mats = {
      stone: material(palette.stone, 0.04, 0.72),
      darkStone: material(palette.darkStone, 0.1, 0.7),
      bronze: material(palette.bronze, 0.78, 0.28),
      brass: material(palette.brass, 0.88, 0.2),
      energy: material(palette.energy, 0.45, 0.22, palette.energy, 1.45),
      mutedEnergy: material(palette.energy, 0.3, 0.34, palette.energy, 0.34),
      floor: material(palette.floor, 0.04, 0.84),
      black: material(0x060a10, 0.2, 0.78),
    };
    this.mats.floor.roughness = theme === 'daylight' ? .64 : .32;
    this.mats.floor.metalness = theme === 'daylight' ? .06 : .24;
    for (const [name, finish] of Object.entries(this.mats)) {
      if (!['floor', 'stone', 'darkStone'].includes(name)) continue;
      finish.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 vCraftPosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCraftPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = 'varying vec3 vCraftPosition;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          vec3 cp = vCraftPosition;
          float flowing = sin(cp.x * 1.45 + cp.z * .52 + sin(cp.x * .44 - cp.z * .61) * 2.3 + sin(cp.z * 2.8) * .27);
          float vein = pow(.5 + .5 * sin(flowing * 3.8 + cp.x * 2.1 + cp.y * .7), 22.0);
          float fleck = fract(sin(dot(floor(cp.xz * 145.0), vec2(12.9898,78.233))) * 43758.5453);
          diffuseColor.rgb *= .91 + .11 * flowing + .055 * fleck;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.45, vein * .28);
          ${name === 'floor' ? 'diffuseColor.rgb *= .47 + .53 * smoothstep(5.0, 15.0, length(cp.xz));' : ''}
        `);
      };
      finish.customProgramCacheKey = () => `rift-architectural-stone-${theme}-${name}`;
    }
  }

  private rounded(width: number, height: number, depth: number, radius = 0.06) {
    return this.resources.geometry(new RoundedBoxGeometry(width, height, depth, 2, radius));
  }
  private box(width: number, height: number, depth: number, material: THREE.Material, radius = 0.06) {
    const mesh = new THREE.Mesh(this.rounded(width, height, depth, radius), material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private cylinder(top: number, bottom: number, height: number, material: THREE.Material, radial = this.segmentCount) {
    const mesh = new THREE.Mesh(this.resources.geometry(new THREE.CylinderGeometry(top, bottom, height, radial)), material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
  private torus(radius: number, tube: number, material: THREE.Material, radial = this.segmentCount, tubular = this.segmentCount * 2) {
    const mesh = new THREE.Mesh(this.resources.geometry(new THREE.TorusGeometry(radius, tube, radial, tubular)), material);
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
    voidBase.position.y = -2.62;
    const underPlate = this.add(this.box(6.9, 0.14, 6.9, this.mats.darkStone, 0.12), this.rift);
    underPlate.position.y = -2.78;
    for (let i = 0; i < 3; i++) {
      const ring = this.add(this.torus(1.25 + i * 0.61, 0.043 + i * 0.008, i === 1 ? this.mats.energy : this.mats.brass), this.movingParts);
      ring.position.y = -2.5 + i * 0.12; ring.rotation.x = Math.PI / 2;
      ring.userData.riftSpin = (i % 2 ? -1 : 1) * (0.18 + i * 0.06);
      ring.userData.riftBaseZ = ring.rotation.z;
    }
    const iris = this.add(this.torus(.59, .038, this.mats.energy, 12, 64), this.movingParts);
    iris.position.y = -2.40; iris.rotation.x = Math.PI / 2;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const fin = this.add(this.box(.05, .18, .34, i % 4 === 0 ? this.mats.energy : this.mats.bronze, .015), this.rift);
      fin.position.set(Math.cos(a) * .82, -2.43, Math.sin(a) * .82); fin.rotation.y = -a + Math.PI / 2;
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
      const strut = this.add(this.cylinder(0.11, 0.18, 2.05, this.mats.darkStone), this.rift);
      strut.position.set(x, -1.63, z); strut.rotation.z = x < 0 ? -0.16 : 0.16;
      const socket = this.add(this.torus(0.19, 0.035, this.mats.brass), this.rift);
      socket.position.set(x, -0.88, z); socket.rotation.x = Math.PI / 2;
    }
    this.group.add(this.rift, this.movingParts);
  }

  private floor(radius: number) {
    const floor = new THREE.Mesh(this.resources.geometry(new THREE.CircleGeometry(radius, this.segmentCount * 4)), this.mats.floor);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -3.3; floor.receiveShadow = true;
    this.add(floor);
    for (const radiusValue of [9.8, 13.8, radius - 0.5]) {
      const line = this.add(this.torus(radiusValue, 0.035, this.mats.darkStone, this.segmentCount, this.segmentCount * 3));
      line.position.y = -3.26; line.rotation.x = Math.PI / 2;
    }
    const innerBand = this.add(this.torus(6.5, .022, this.mats.brass, 10, 128)); innerBand.position.y = -3.275; innerBand.rotation.x = Math.PI / 2;
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2; const length = i % 4 === 0 ? .45 : .16;
      const tick = this.add(this.box(.025, .012, length, i % 4 === 0 ? this.mats.brass : this.mats.darkStone, .003));
      tick.position.set(Math.cos(a) * 6.75, -3.275, Math.sin(a) * 6.75); tick.rotation.y = -a + Math.PI / 2; tick.castShadow = false;
    }
  }

  private galleryFloor() {
    const base = this.add(this.box(25.6, .28, 40, this.mats.floor, .12));
    base.position.set(0, -3.44, -15.1);
    const aisle = this.add(this.box(10.8, .045, 34.5, this.mats.darkStone, .025));
    aisle.position.set(0, -3.275, -16.8);
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
      for (const y of [2.2, 6.4]) {
        const connector = this.add(this.tube([new THREE.Vector3(x, y, -12), new THREE.Vector3(x, y, -20), new THREE.Vector3(x, y, -28)], .12, this.mats.bronze));
        connector.castShadow = false;
      }
    }
    for (const x of [-7.2, 7.2]) {
      for (const y of [5.2, 8.35]) {
        this.add(this.tube([new THREE.Vector3(x, y, -12), new THREE.Vector3(x, y, -20), new THREE.Vector3(x, y, -28)], .14, this.mats.stone));
      }
    }

    const windowZ = -34.15;
    const warm = this.resources.material(new THREE.MeshStandardMaterial({ color: 0xffad59, emissive: 0xff8f3d, emissiveIntensity: 1.8, metalness: .05, roughness: .38 }));
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

    for (const [x, z, sx, sz] of [[-4.38, -4.38, -8.9, -9.7], [4.38, -4.38, 8.9, -9.7], [-4.38, 4.38, -9.4, -5.7], [4.38, 4.38, 9.4, -5.7]] as const) {
      const cable = this.add(this.tube([new THREE.Vector3(x, -.72, z), new THREE.Vector3((x + sx) / 2, -1.68, (z + sz) / 2), new THREE.Vector3(sx, -2.96, sz)], .055, this.mats.bronze));
      cable.castShadow = false;
      const anchor = this.add(this.cylinder(.21, .29, .24, this.mats.brass)); anchor.position.set(sx, -3.06, sz);
    }
  }

  buildNocturne() {
    this.floor(25);
    const axis = this.add(this.cylinder(0.28, 0.44, 10.4, this.mats.bronze)); axis.position.set(0, 2.05, -24);
    for (let i = 0; i < 4; i++) {
      const ring = this.add(this.torus(5.7 + i * 1.55, 0.075, i === 3 ? this.mats.energy : this.mats.brass, this.segmentCount, this.segmentCount * 3));
      ring.position.set(0, 3.0, -24);
      ring.rotation.set(i % 2 ? Math.PI / 2.45 : Math.PI / 2.95, i * 0.57, 0);
      ring.userData.riftSpin = (i % 2 ? -1 : 1) * (0.025 + i * 0.009);
      ring.userData.riftBaseZ = ring.rotation.z;
      this.movingParts.add(ring);
    }
    const planet = this.add(new THREE.Mesh(this.resources.geometry(new THREE.IcosahedronGeometry(1.22, qualityValue(this.quality, 1, 2, 3))), this.mats.energy));
    planet.position.set(0, 4.2, -24); planet.userData.riftPulse = 0.025; this.movingParts.add(planet);
    const crescent = this.add(this.torus(2.05, 0.12, this.mats.bronze, this.segmentCount, this.segmentCount * 3));
    crescent.position.set(10.5, 5.4, -22); crescent.rotation.set(0.3, 0.35, 0.9);
    for (const [x, z, height] of [[-15, -10, 8], [15, -10, 9], [-12, 12, 6], [12, 12, 7]] as const) {
      const mast = this.add(this.cylinder(0.2, 0.52, height, this.mats.darkStone)); mast.position.set(x, -3.3 + height / 2, z);
      const beacon = this.add(this.cylinder(0.14, 0.14, 0.3, this.mats.energy)); beacon.position.set(x, -3.3 + height + 0.14, z);
    }
    if (this.quality !== 'low') {
      const stars = new Float32Array(qualityValue(this.quality, 0, 180, 360));
      for (let i = 0; i < stars.length / 3; i++) {
        const angle = i * 2.399963229728653;
        const elevation = ((i * 37) % 100) / 100 * 0.78 + 0.12;
        const radius = 20 + (i % 7) * 1.1;
        stars[i * 3] = Math.cos(angle) * radius;
        stars[i * 3 + 1] = 1 + elevation * 17;
        stars[i * 3 + 2] = Math.sin(angle) * radius;
      }
      const geometry = this.resources.geometry(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
      const material = this.resources.material(new THREE.PointsMaterial({ color: 0xcbdcff, size: 0.06, transparent: true, opacity: 0.72, depthWrite: false }));
      this.add(new THREE.Points(geometry, material));
    }
  }

  buildDaylight() {
    this.floor(26);
    for (const [x, z, height, width] of [[-14, -12, 10, 1.4], [14, -12, 10, 1.4], [-14, 12, 8, 1.2], [14, 12, 8, 1.2]] as const) {
      const monolith = this.add(this.box(width, height, width, this.mats.stone, 0.16)); monolith.position.set(x, -3.3 + height / 2, z);
      const cut = this.add(this.box(width + 0.04, 0.075, width + 0.04, this.mats.brass, 0.02)); cut.position.set(x, -3.3 + height * 0.63, z);
      const cap = this.add(this.cylinder(width * 0.58, width * 0.78, 0.44, this.mats.darkStone)); cap.position.set(x, -3.3 + height + 0.18, z);
    }
    const archZ = -25;
    for (const x of [-7.2, 7.2]) {
      const pier = this.add(this.box(1.32, 8.4, 1.5, this.mats.stone, 0.14)); pier.position.set(x, 0.9, archZ);
      const inset = this.add(this.box(0.18, 6.4, 0.16, this.mats.brass, 0.02)); inset.position.set(x + (x < 0 ? 0.62 : -0.62), 1.0, archZ - 0.78);
    }
    const lintel = this.add(this.box(15.8, 1.25, 1.55, this.mats.stone, 0.16)); lintel.position.set(0, 5.12, archZ);
    const arch = this.add(this.torus(7.12, 0.31, this.mats.darkStone, this.segmentCount, this.segmentCount * 3));
    arch.position.set(0, 4.4, archZ);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      const planter = this.add(this.cylinder(0.5, 0.66, 0.88, this.mats.darkStone)); planter.position.set(Math.cos(a) * 12.2, -2.86, Math.sin(a) * 12.2);
      const crown = this.add(new THREE.Mesh(this.resources.geometry(new THREE.IcosahedronGeometry(0.62, qualityValue(this.quality, 0, 1, 2))), this.mats.mutedEnergy));
      crown.position.set(Math.cos(a) * 12.2, -1.95, Math.sin(a) * 12.2); crown.scale.y = 1.45;
    }
    const sunDisc = this.add(this.torus(3.5, 0.1, this.mats.brass, this.segmentCount, this.segmentCount * 3));
    sunDisc.position.set(-12.5, 9.4, -17.5); sunDisc.rotation.set(0.2, 0.35, 0.2);
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(this.palette.fill, this.palette.floor, this.theme === 'daylight' ? .85 : .48);
    this.lights.add(hemi);
    const key = new THREE.DirectionalLight(this.palette.key, this.theme === 'daylight' ? 2.2 : 1.85);
    key.position.set(-4.5, 10.5, 5.5); key.castShadow = true;
    const resolution = qualityValue(this.quality, 512, 1024, 2048);
    key.shadow.mapSize.set(resolution, resolution);
    key.shadow.camera.left = -5.5; key.shadow.camera.right = 5.5; key.shadow.camera.top = 5.5; key.shadow.camera.bottom = -5.5;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 24;
    key.shadow.bias = 0.00015; key.shadow.normalBias = 0.03; key.shadow.radius = 1.65;
    this.lights.add(key); this.shadowLights.push(key);
    const rim = new THREE.DirectionalLight(this.palette.fill, this.theme === 'nocturne' ? 1.45 : 1.05);
    rim.position.set(6.5, 6, -8); this.lights.add(rim);
    const riftLight = new THREE.PointLight(this.palette.energy, this.theme === 'nocturne' ? 16 : 10, 10, 2);
    riftLight.position.set(0, -1.65, 0); riftLight.userData.riftLight = true; this.lights.add(riftLight);
  }

  tick(seconds: number, reducedMotion: boolean) {
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
    this.group.clear(); this.lights.clear(); this.resources.dispose();
  }
}

export function buildWorld(theme: WorldTheme, quality: WorldQuality): BuiltWorld {
  const palette = PALETTES[theme];
  const craft = new WorldCraft(theme, quality, palette);
  craft.buildInstrument();
  if (theme === 'gallery') craft.buildGallery();
  if (theme === 'nocturne') craft.buildNocturne();
  if (theme === 'daylight') craft.buildDaylight();
  craft.buildLights();
  return {
    group: craft.group,
    lights: craft.lights,
    background: new THREE.Color(palette.background),
    fog: new THREE.Fog(palette.fog, theme === 'daylight' ? 36 : 30, theme === 'daylight' ? 70 : 58),
    exposure: theme === 'daylight' ? .94 : theme === 'gallery' ? .92 : .98,
    environmentIntensity: theme === 'daylight' ? .60 : theme === 'gallery' ? .44 : .52,
    tick: (seconds, reducedMotion) => craft.tick(seconds, reducedMotion),
    dispose: () => craft.dispose(),
  };
}
