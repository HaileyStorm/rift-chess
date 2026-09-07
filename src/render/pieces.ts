import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type PieceFamily = 'classic' | 'faceted';
export type MaterialStyle = 'ceramic' | 'metal' | 'wood';

type PieceKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
type Part = { geometry: THREE.BufferGeometry; position?: THREE.Vector3; rotation?: THREE.Euler; name: string };

const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new Map<string, THREE.MeshPhysicalMaterial>();

const pieceKind = (code: number): PieceKind => {
  switch (Math.abs(code)) {
    case 1: case 7: return 'pawn';
    case 2: return 'knight';
    case 3: return 'bishop';
    case 4: return 'rook';
    case 5: return 'queen';
    case 6: return 'king';
    default: throw new RangeError(`Unknown chess piece code: ${code}`);
  }
};

const lathe = (profile: Array<[number, number]>, family: PieceFamily) =>
  new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius, y)), family === 'classic' ? 40 : 10);

const vector = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const rotation = (x: number, y: number, z: number) => new THREE.Euler(x, y, z);

function extrude(shape: THREE.Shape, family: PieceFamily, depth: number): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: family === 'classic',
    bevelThickness: family === 'classic' ? 0.012 : 0,
    bevelSize: family === 'classic' ? 0.008 : 0,
    bevelSegments: family === 'classic' ? 2 : 0,
    curveSegments: family === 'classic' ? 8 : 2,
  });
}

function bishopMitre(family: PieceFamily): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.17, 0.57);
  shape.quadraticCurveTo(-0.18, 0.80, 0, 0.98);
  shape.quadraticCurveTo(0.18, 0.80, 0.17, 0.57);
  shape.quadraticCurveTo(0, 0.51, -0.17, 0.57);
  const slash = new THREE.Path();
  slash.moveTo(-0.115, 0.70);
  slash.lineTo(0.105, 0.875);
  slash.lineTo(0.122, 0.815);
  slash.lineTo(-0.098, 0.64);
  slash.closePath();
  shape.holes.push(slash);
  return extrude(shape, family, family === 'classic' ? 0.20 : 0.24);
}

function horseProfile(family: PieceFamily): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.13, 0.28);
  shape.lineTo(-0.19, 0.42);
  shape.lineTo(-0.16, 0.58);
  shape.lineTo(-0.20, 0.70);
  shape.lineTo(-0.13, 0.72);
  shape.lineTo(-0.17, 0.84);
  shape.lineTo(-0.08, 0.77);
  shape.lineTo(-0.025, 0.91);
  shape.lineTo(0.035, 0.79);
  shape.lineTo(0.12, 0.77);
  shape.lineTo(0.22, 0.68);
  shape.lineTo(0.22, 0.59);
  shape.lineTo(0.31, 0.54);
  shape.lineTo(0.32, 0.46);
  shape.lineTo(0.23, 0.41);
  shape.lineTo(0.10, 0.43);
  shape.lineTo(0.055, 0.34);
  shape.lineTo(0.08, 0.28);
  shape.closePath();
  return extrude(shape, family, family === 'classic' ? 0.22 : 0.26);
}

function horseMane(family: PieceFamily): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.11, 0.34);
  shape.lineTo(-0.21, 0.43);
  shape.lineTo(-0.17, 0.49);
  shape.lineTo(-0.23, 0.56);
  shape.lineTo(-0.17, 0.63);
  shape.lineTo(-0.22, 0.71);
  shape.lineTo(-0.14, 0.75);
  shape.lineTo(-0.105, 0.64);
  shape.lineTo(-0.13, 0.54);
  shape.closePath();
  return extrude(shape, family, family === 'classic' ? 0.12 : 0.15);
}

function kingCross(family: PieceFamily): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.04, 0.97); shape.lineTo(0.04, 0.97);
  shape.lineTo(0.04, 1.08); shape.lineTo(0.105, 1.08);
  shape.lineTo(0.105, 1.16); shape.lineTo(0.04, 1.16);
  shape.lineTo(0.04, 1.30); shape.lineTo(-0.04, 1.30);
  shape.lineTo(-0.04, 1.16); shape.lineTo(-0.105, 1.16);
  shape.lineTo(-0.105, 1.08); shape.lineTo(-0.04, 1.08);
  shape.closePath();
  return extrude(shape, family, family === 'classic' ? 0.105 : 0.13);
}

function profile(kind: PieceKind, family: PieceFamily): Array<[number, number]> {
  const f = family === 'faceted';
  const taper = f ? 0.93 : 1;
  const base: Array<[number, number]> = [[0.25, 0], [0.295, 0.035], [0.29, 0.10], [0.23, 0.15], [0.21, 0.19]];
  const shapes: Record<Exclude<PieceKind, 'knight'>, Array<[number, number]>> = {
    pawn: [[0.17, 0.25], [0.12, 0.34], [0.12, 0.41], [0.075, 0.45]],
    bishop: [[0.18, 0.26], [0.13, 0.45], [0.11, 0.57]],
    rook: [[0.19, 0.30], [0.16, 0.52], [0.18, 0.67]],
    queen: [[0.20, 0.30], [0.14, 0.53], [0.12, 0.76], [0.17, 0.86]],
    king: [[0.20, 0.30], [0.145, 0.55], [0.12, 0.82], [0.17, 0.95]],
  };
  const chosen = kind === 'knight' ? [[0.18, 0.27], [0.14, 0.33], [0.15, 0.38]] : shapes[kind];
  return [...base, ...chosen].map(([r, y]) => [r * taper, y] as [number, number]);
}

function partsFor(kind: PieceKind, family: PieceFamily): readonly Part[] {
  const part = (geometry: THREE.BufferGeometry, name: string, position?: THREE.Vector3, rotationValue?: THREE.Euler): Part =>
    ({ geometry, name, position, rotation: rotationValue });
  const parts: Part[] = [part(lathe(profile(kind, family), family), 'turned-body')];
  const segments = family === 'classic' ? 28 : 10;

  if (kind === 'pawn') {
    parts.push(part(new THREE.SphereGeometry(0.115, segments, family === 'classic' ? 14 : 6), 'pawn-head', vector(0, 0.56)));
  } else if (kind === 'knight') {
    parts.push(part(horseProfile(family), 'knight-horse-profile-ears-and-muzzle', vector(0, 0, family === 'classic' ? -0.11 : -0.13)));
    parts.push(part(horseMane(family), 'knight-sculpted-mane', vector(0, 0, family === 'classic' ? -0.06 : -0.075)));
  } else if (kind === 'bishop') {
    parts.push(part(bishopMitre(family), 'bishop-mitre-with-diagonal-gap', vector(0, 0, family === 'classic' ? -0.10 : -0.12), rotation(0, Math.PI / 5, 0)));
  } else if (kind === 'rook') {
    parts.push(part(new THREE.CylinderGeometry(0.19, 0.19, 0.075, segments), 'rook-crown-ring', vector(0, 0.695)));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push(part(new THREE.BoxGeometry(0.10, 0.10, 0.10), `rook-merlon-${i}`, vector(Math.cos(a) * 0.16, 0.79, Math.sin(a) * 0.16), rotation(0, -a, 0)));
    }
  } else if (kind === 'queen') {
    parts.push(part(new THREE.TorusGeometry(0.168, 0.029, family === 'classic' ? 8 : 4, segments), 'queen-coronet', vector(0, 0.89), rotation(Math.PI / 2, 0, 0)));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const point = new THREE.ConeGeometry(0.048, family === 'classic' ? 0.16 : 0.18, family === 'classic' ? 8 : 4);
      parts.push(part(point, `queen-crown-point-${i}`, vector(Math.cos(a) * 0.168, 0.99, Math.sin(a) * 0.168), rotation(0, -a, 0)));
    }
    parts.push(part(new THREE.SphereGeometry(0.075, segments, family === 'classic' ? 8 : 4), 'queen-crown-orb', vector(0, 1.08)));
  } else if (kind === 'king') {
    parts.push(part(new THREE.TorusGeometry(0.145, 0.026, family === 'classic' ? 8 : 4, segments), 'king-collar', vector(0, 0.96), rotation(Math.PI / 2, 0, 0)));
    const finial = kingCross(family); finial.translate(0, -1.04, 0); finial.scale(1.2, 1.12, 1.2); finial.translate(0, 1.04, 0);
    parts.push(part(finial, 'king-cross-finial', vector(0, 0, family === 'classic' ? -0.063 : -0.078)));
  }
  return parts;
}

function geometryFor(kind: PieceKind, family: PieceFamily): THREE.BufferGeometry {
  const key = `${family}:${kind}`; const cached = geometryCache.get(key); if (cached) return cached;
  const pieces = partsFor(kind, family).map(part => {
    const geometry = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    const matrix = new THREE.Matrix4().compose(part.position ?? new THREE.Vector3(), new THREE.Quaternion().setFromEuler(part.rotation ?? new THREE.Euler()), new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix); part.geometry.dispose(); return geometry;
  });
  const merged = mergeGeometries(pieces, false); pieces.forEach(geometry => geometry.dispose());
  if (!merged) throw new Error('Unable to assemble chess geometry');
  geometryCache.set(key, merged); return merged;
}

function material(style: MaterialStyle, side: 1 | -1, family: PieceFamily): THREE.MeshPhysicalMaterial {
  const key = `${style}:${side}:${family}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  const white = side > 0;
  const palette = {
    ceramic: { color: white ? 0xd7c9ac : 0x343f4d, metalness: 0.04, roughness: 0.46, clearcoat: 0.12 },
    metal: { color: white ? 0xd3d9df : 0x626e7c, metalness: 0.72, roughness: 0.38, clearcoat: 0.08 },
    wood: { color: white ? 0xc58a58 : 0x65412e, metalness: 0.0, roughness: 0.5, clearcoat: 0.08 },
  }[style];
  const result = new THREE.MeshPhysicalMaterial({ ...palette, flatShading: family === 'faceted' });
  if (style === 'wood') {
    result.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 vWoodPosition;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWoodPosition = position;');
      shader.fragmentShader = 'varying vec3 vWoodPosition;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat grain = sin(vWoodPosition.y * 95.0 + 4.0 * sin(vWoodPosition.x * 16.0 + vWoodPosition.z * 9.0));\ndiffuseColor.rgb *= 0.95 + 0.05 * grain;');
    };
    result.customProgramCacheKey = () => `rift-wood-grain-${family}`;
  }
  materialCache.set(key, result);
  return result;
}

/** Build a y-up, square-centred chessman. Codes 1 and 7 both mean pawn. */
export function createPiece(code: number, family: PieceFamily, style: MaterialStyle): THREE.Group {
  const kind = pieceKind(code);
  const side: 1 | -1 = code > 0 ? 1 : -1;
  const group = new THREE.Group();
  group.name = `${family}-${style}-${side > 0 ? 'white' : 'black'}-${kind}`;
  group.userData.piece = code;
  group.userData.pieceKind = kind;
  group.userData.sharedPieceAsset = true;
  const finish = material(style, side, family);
  {
    const mesh = new THREE.Mesh(geometryFor(kind, family), finish);
    mesh.name = `${family}-${kind}-sculpture`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.piece = code;
    mesh.userData.sharedPieceAsset = true;
    group.add(mesh);
  }
  return group;
}

/** Detach an instance; geometry and materials remain owned by the shared caches. */
export function disposePiece(group: THREE.Group): void {
  group.removeFromParent();
  group.clear();
}

/** Call only after all piece groups made by createPiece have been removed. */
export function disposePieceAssets(): void {
  for (const geometry of geometryCache.values()) geometry.dispose();
  for (const finish of materialCache.values()) finish.dispose();
  geometryCache.clear();
  materialCache.clear();
}
