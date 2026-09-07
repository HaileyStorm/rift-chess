import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type PieceFamily = 'classic' | 'faceted';
export type MaterialStyle = 'ceramic' | 'metal' | 'wood';

type PieceKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
type AssetPart = {
  geometry: THREE.BufferGeometry;
  name: string;
  intentionalOpenings?: readonly string[];
};

type CachedPieceAsset = {
  geometry: THREE.BufferGeometry;
  components: readonly AssetPart[];
};

const geometryCache = new Map<string, CachedPieceAsset>();
const materialCache = new Map<string, THREE.MeshStandardMaterial>();

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

function closedRevolution(profile: ReadonlyArray<readonly [number, number]>, segments: number): THREE.BufferGeometry {
  if (profile.length < 2 || profile.some(([radius]) => radius <= 0)) throw new RangeError('A closed revolution needs positive profile radii.');
  const positions: number[] = [0, profile[0][1], 0];
  for (const [radius, y] of profile) {
    for (let side = 0; side < segments; side++) {
      const angle = side * Math.PI * 2 / segments;
      positions.push(radius * Math.cos(angle), y, radius * Math.sin(angle));
    }
  }
  const topCenter = positions.length / 3;
  positions.push(0, profile.at(-1)![1], 0);
  const indices: number[] = [];
  const ring = (index: number, side: number) => 1 + index * segments + (side + segments) % segments;
  for (let side = 0; side < segments; side++) {
    const next = (side + 1) % segments;
    indices.push(0, ring(0, side), ring(0, next));
  }
  for (let level = 0; level < profile.length - 1; level++) {
    for (let side = 0; side < segments; side++) {
      const next = (side + 1) % segments;
      indices.push(ring(level, side), ring(level + 1, side), ring(level, next));
      indices.push(ring(level, next), ring(level + 1, side), ring(level + 1, next));
    }
  }
  for (let side = 0; side < segments; side++) {
    const next = (side + 1) % segments;
    indices.push(topCenter, ring(profile.length - 1, next), ring(profile.length - 1, side));
  }
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)).setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function closedYLoft(rings: ReadonlyArray<readonly [number, number, number, number]>, segments: number): THREE.BufferGeometry {
  if (rings.length < 2 || rings.some(([, , xRadius, zRadius]) => xRadius <= 0 || zRadius <= 0)) throw new RangeError('A closed loft needs positive ring radii.');
  const positions: number[] = [rings[0][0], rings[0][1], 0];
  for (const [x, y, xRadius, zRadius] of rings) {
    for (let side = 0; side < segments; side++) {
      const angle = side * Math.PI * 2 / segments;
      positions.push(x + xRadius * Math.cos(angle), y, zRadius * Math.sin(angle));
    }
  }
  const topCenter = positions.length / 3;
  positions.push(rings.at(-1)![0], rings.at(-1)![1], 0);
  const indices: number[] = [];
  const ring = (index: number, side: number) => 1 + index * segments + (side + segments) % segments;
  for (let side = 0; side < segments; side++) {
    const next = (side + 1) % segments;
    indices.push(0, ring(0, side), ring(0, next));
  }
  for (let level = 0; level < rings.length - 1; level++) {
    for (let side = 0; side < segments; side++) {
      const next = (side + 1) % segments;
      indices.push(ring(level, side), ring(level + 1, side), ring(level, next));
      indices.push(ring(level, next), ring(level + 1, side), ring(level + 1, next));
    }
  }
  for (let side = 0; side < segments; side++) {
    const next = (side + 1) % segments;
    indices.push(topCenter, ring(rings.length - 1, next), ring(rings.length - 1, side));
  }
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)).setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function closedXLoft(rings: ReadonlyArray<readonly [number, number, number, number]>, segments: number): THREE.BufferGeometry {
  if (rings.length < 2 || rings.some(([, , yRadius, zRadius]) => yRadius <= 0 || zRadius <= 0)) throw new RangeError('A closed loft needs positive ring radii.');
  const positions: number[] = [rings[0][0], rings[0][1], 0];
  for (const [x, y, yRadius, zRadius] of rings) {
    for (let side = 0; side < segments; side++) {
      const angle = side * Math.PI * 2 / segments;
      positions.push(x, y + yRadius * Math.cos(angle), zRadius * Math.sin(angle));
    }
  }
  const endCenter = positions.length / 3;
  positions.push(rings.at(-1)![0], rings.at(-1)![1], 0);
  const indices: number[] = [];
  const ring = (index: number, side: number) => 1 + index * segments + (side + segments) % segments;
  for (let side = 0; side < segments; side++) {
    const next = (side + 1) % segments;
    indices.push(0, ring(0, next), ring(0, side));
  }
  for (let level = 0; level < rings.length - 1; level++) {
    for (let side = 0; side < segments; side++) {
      const next = (side + 1) % segments;
      indices.push(ring(level, side), ring(level, next), ring(level + 1, side));
      indices.push(ring(level, next), ring(level + 1, next), ring(level + 1, side));
    }
  }
  for (let side = 0; side < segments; side++) {
    const next = (side + 1) % segments;
    indices.push(endCenter, ring(rings.length - 1, side), ring(rings.length - 1, next));
  }
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)).setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function solidExtrusion(points: ReadonlyArray<readonly [number, number]>, depth: number, bevel: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.7,
    bevelSegments: bevel > 0 ? 2 : 0,
    curveSegments: bevel > 0 ? 8 : 1,
  });
}

function bishopMitre(family: PieceFamily): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.18, 0.70); shape.quadraticCurveTo(-0.17, 0.99, 0, 1.17);
  shape.quadraticCurveTo(0.17, 0.99, 0.18, 0.70); shape.quadraticCurveTo(0, 0.65, -0.18, 0.70);
  const slot = new THREE.Path();
  slot.moveTo(-0.12, 0.78); slot.lineTo(0.115, 1.02); slot.lineTo(0.115, 0.94); slot.lineTo(-0.08, 0.74); slot.closePath();
  shape.holes.push(slot);
  return new THREE.ExtrudeGeometry(shape, {
    depth: family === 'classic' ? 0.24 : 0.30,
    bevelEnabled: family === 'classic',
    bevelThickness: family === 'classic' ? 0.012 : 0,
    bevelSize: family === 'classic' ? 0.008 : 0,
    bevelSegments: family === 'classic' ? 2 : 0,
    curveSegments: family === 'classic' ? 8 : 1,
  });
}

function classicBody(kind: Exclude<PieceKind, 'knight'>): THREE.BufferGeometry {
  const stem: Record<Exclude<PieceKind, 'knight'>, ReadonlyArray<readonly [number, number]>> = {
    pawn: [[0.31, 0.025], [0.325, 0.055], [0.315, 0.105], [0.275, 0.145], [0.225, 0.17], [0.205, 0.21], [0.16, 0.25], [0.135, 0.36], [0.13, 0.43], [0.10, 0.47]],
    bishop: [[0.32, 0.025], [0.335, 0.06], [0.32, 0.12], [0.27, 0.16], [0.23, 0.20], [0.20, 0.29], [0.16, 0.38], [0.145, 0.55], [0.12, 0.66]],
    rook: [[0.325, 0.025], [0.34, 0.06], [0.325, 0.12], [0.28, 0.16], [0.24, 0.19], [0.22, 0.29], [0.19, 0.40], [0.18, 0.65], [0.20, 0.70]],
    queen: [[0.33, 0.025], [0.34, 0.06], [0.32, 0.13], [0.275, 0.17], [0.24, 0.22], [0.21, 0.31], [0.16, 0.47], [0.145, 0.70], [0.18, 0.80]],
    king: [[0.33, 0.025], [0.34, 0.065], [0.32, 0.13], [0.28, 0.17], [0.245, 0.22], [0.215, 0.34], [0.165, 0.52], [0.145, 0.82], [0.18, 0.92]],
  };
  return closedRevolution(stem[kind], 40);
}

function facetedBody(kind: Exclude<PieceKind, 'knight'>): THREE.BufferGeometry {
  const silhouette: Record<Exclude<PieceKind, 'knight'>, ReadonlyArray<readonly [number, number]>> = {
    pawn: [[0.32, 0.025], [0.32, 0.11], [0.25, 0.15], [0.22, 0.25], [0.145, 0.30], [0.145, 0.48], [0.105, 0.53]],
    bishop: [[0.33, 0.025], [0.33, 0.12], [0.27, 0.16], [0.24, 0.28], [0.17, 0.34], [0.16, 0.65], [0.12, 0.69]],
    rook: [[0.34, 0.025], [0.34, 0.13], [0.28, 0.17], [0.25, 0.29], [0.20, 0.34], [0.20, 0.70], [0.22, 0.75]],
    queen: [[0.34, 0.025], [0.34, 0.13], [0.28, 0.18], [0.25, 0.31], [0.18, 0.37], [0.18, 0.74], [0.22, 0.80]],
    king: [[0.34, 0.025], [0.34, 0.13], [0.29, 0.18], [0.25, 0.34], [0.19, 0.40], [0.19, 0.88], [0.22, 0.94]],
  };
  return closedRevolution(silhouette[kind], 8);
}

function addClassicCollars(parts: AssetPart[], y: number, radius: number): void {
  const collar = new THREE.TorusGeometry(radius, 0.018, 8, 32);
  collar.rotateX(Math.PI / 2); collar.translate(0, y, 0);
  parts.push({ geometry: collar, name: 'classic-segmented-collar' });
}

function makeKnight(family: PieceFamily): AssetPart[] {
  const faceted = family === 'faceted';
  const sides = faceted ? 6 : 20;
  const parts: AssetPart[] = [{
    geometry: closedRevolution(faceted
      ? [[0.34, 0.025], [0.34, 0.13], [0.27, 0.18], [0.22, 0.31], [0.18, 0.37]]
      : [[0.33, 0.025], [0.34, 0.06], [0.32, 0.13], [0.275, 0.17], [0.23, 0.21], [0.20, 0.31], [0.17, 0.39]], faceted ? 8 : 40),
    name: `${family}-knight-stepped-plinth`,
  }];
  if (!faceted) addClassicCollars(parts, 0.355, 0.18);
  parts.push({
    geometry: closedYLoft(faceted
      ? [[0, 0.34, 0.16, 0.15], [-0.02, 0.54, 0.14, 0.14], [0.015, 0.70, 0.12, 0.13], [0.10, 0.84, 0.105, 0.12]]
      : [[0, 0.35, 0.15, 0.14], [-0.035, 0.51, 0.145, 0.135], [-0.005, 0.68, 0.125, 0.13], [0.10, 0.83, 0.10, 0.115]], sides),
    name: `${family}-knight-curved-volumetric-neck`,
  });
  parts.push({
    geometry: closedXLoft(faceted
      ? [[0.055, 0.86, 0.12, 0.12], [0.16, 0.90, 0.15, 0.135], [0.28, 0.89, 0.115, 0.105], [0.34, 0.86, 0.065, 0.07]]
      : [[0.055, 0.86, 0.115, 0.11], [0.16, 0.91, 0.14, 0.13], [0.27, 0.90, 0.105, 0.10], [0.34, 0.875, 0.055, 0.06]], sides),
    name: `${family}-knight-dimensional-head-and-muzzle`,
  });
  const ear = new THREE.ConeGeometry(faceted ? 0.052 : 0.045, faceted ? 0.18 : 0.15, faceted ? 4 : 8);
  ear.rotateZ(-0.13); ear.translate(0.12, 1.07, -0.075);
  const secondEar = ear.clone(); secondEar.translate(0, 0, 0.15);
  parts.push({ geometry: ear, name: `${family}-knight-left-ear` }, { geometry: secondEar, name: `${family}-knight-right-ear` });
  const mane = solidExtrusion([[-0.13, 0.42], [-0.23, 0.51], [-0.19, 0.60], [-0.24, 0.70], [-0.17, 0.80], [-0.12, 0.95], [-0.06, 0.91], [-0.09, 0.69], [-0.07, 0.51]], faceted ? 0.15 : 0.12, faceted ? 0 : 0.006);
  mane.translate(0, 0, faceted ? -0.075 : -0.06);
  parts.push({ geometry: mane, name: `${family}-knight-carved-mane` });
  return parts;
}

function makeAssets(kind: PieceKind, family: PieceFamily): readonly AssetPart[] {
  if (kind === 'knight') return makeKnight(family);
  const faceted = family === 'faceted';
  const segments = faceted ? 8 : 32;
  const body = faceted ? facetedBody(kind) : classicBody(kind);
  const parts: AssetPart[] = [{ geometry: body, name: `${family}-${kind}-${faceted ? 'architectural-body' : 'turned-sculptural-body'}` }];
  if (!faceted) addClassicCollars(parts, kind === 'pawn' ? 0.46 : kind === 'bishop' ? 0.63 : 0.73, kind === 'pawn' ? 0.115 : 0.14);

  if (kind === 'pawn') {
    parts.push({ geometry: closedRevolution(faceted
      ? [[0.105, 0.52], [0.16, 0.57], [0.16, 0.68], [0.105, 0.73]]
      : [[0.07, 0.50], [0.125, 0.54], [0.15, 0.62], [0.14, 0.70], [0.09, 0.77]], faceted ? 8 : 32), name: `${family}-pawn-crowned-head` });
  } else if (kind === 'bishop') {
    const mitre = bishopMitre(family); mitre.translate(0, 0, faceted ? -0.15 : -0.12);
    parts.push({ geometry: mitre, name: `${family}-bishop-sculpted-mitre-slot`, intentionalOpenings: ['diagonal mitre slot is a deliberate open cut'] });
  } else if (kind === 'rook') {
    const crown = closedRevolution(faceted ? [[0.22, 0.74], [0.25, 0.78], [0.25, 0.86], [0.21, 0.89]] : [[0.20, 0.69], [0.23, 0.73], [0.23, 0.80], [0.20, 0.84]], faceted ? 8 : 32);
    parts.push({ geometry: crown, name: `${family}-rook-solid-crown-drum` });
    const count = faceted ? 4 : 6;
    for (let index = 0; index < count; index++) {
      const angle = index * Math.PI * 2 / count;
      const merlon = new THREE.BoxGeometry(faceted ? 0.16 : 0.115, faceted ? 0.16 : 0.13, faceted ? 0.16 : 0.115);
      merlon.rotateY(-angle); merlon.translate(Math.cos(angle) * (faceted ? 0.18 : 0.17), faceted ? 0.92 : 0.90, Math.sin(angle) * (faceted ? 0.18 : 0.17));
      parts.push({ geometry: merlon, name: `${family}-rook-closed-merlon-${index + 1}` });
    }
  } else if (kind === 'queen') {
    const crown = closedRevolution(faceted ? [[0.22, 0.80], [0.24, 0.84], [0.17, 0.91], [0.13, 0.93]] : [[0.18, 0.80], [0.21, 0.85], [0.18, 0.90], [0.15, 0.92]], faceted ? 8 : 32);
    parts.push({ geometry: crown, name: `${family}-queen-coronet-base` });
    const count = faceted ? 5 : 7;
    for (let index = 0; index < count; index++) {
      const angle = index * Math.PI * 2 / count;
      const point = new THREE.ConeGeometry(faceted ? 0.065 : 0.045, faceted ? 0.25 : 0.20, faceted ? 4 : 8);
      point.translate(Math.cos(angle) * (faceted ? 0.18 : 0.16), faceted ? 1.04 : 1.01, Math.sin(angle) * (faceted ? 0.18 : 0.16));
      parts.push({ geometry: point, name: `${family}-queen-coronet-point-${index + 1}` });
    }
    parts.push({ geometry: closedRevolution(faceted ? [[0.06, 1.10], [0.09, 1.15], [0.06, 1.20]] : [[0.04, 1.08], [0.07, 1.13], [0.04, 1.18]], faceted ? 8 : 20), name: `${family}-queen-crown-orb` });
  } else {
    const collar = new THREE.TorusGeometry(faceted ? 0.18 : 0.155, faceted ? 0.026 : 0.022, faceted ? 4 : 8, segments);
    collar.rotateX(Math.PI / 2); collar.translate(0, faceted ? 0.96 : 0.94, 0);
    parts.push({ geometry: collar, name: `${family}-king-finial-collar` });
    const cross = solidExtrusion([[-0.05, 0.98], [0.05, 0.98], [0.05, 1.10], [0.13, 1.10], [0.13, 1.20], [0.05, 1.20], [0.05, 1.34], [-0.05, 1.34], [-0.05, 1.20], [-0.13, 1.20], [-0.13, 1.10], [-0.05, 1.10]], faceted ? 0.18 : 0.13, faceted ? 0 : 0.008);
    cross.translate(0, 0, faceted ? -0.09 : -0.065);
    parts.push({ geometry: cross, name: `${family}-king-solid-cross-finial` });
  }
  return parts;
}

function mergedGeometry(components: readonly AssetPart[]): THREE.BufferGeometry {
  const copies = components.map(({ geometry }) => {
    const copy = geometry.clone();
    copy.deleteAttribute('uv');
    if (!copy.getAttribute('normal')) copy.computeVertexNormals();
    if (!copy.getIndex()) copy.setIndex([...Array(copy.getAttribute('position').count).keys()]);
    return copy;
  });
  const merged = mergeGeometries(copies, false);
  copies.forEach(copy => copy.dispose());
  if (!merged || !merged.getIndex()) throw new Error('Unable to merge chess sculpture components into an indexed geometry.');
  merged.computeBoundingSphere();
  return merged;
}

function assetsFor(kind: PieceKind, family: PieceFamily): CachedPieceAsset {
  const key = `${family}:${kind}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const components = makeAssets(kind, family);
  const asset = { geometry: mergedGeometry(components), components };
  geometryCache.set(key, asset);
  return asset;
}

function material(style: MaterialStyle, side: 1 | -1, family: PieceFamily): THREE.MeshStandardMaterial {
  const key = `${style}:${side}:${family}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  const white = side > 0;
  const palette = {
    ceramic: { color: white ? 0xe7dcc4 : 0x10263e, metalness: 0.05, roughness: 0.38 },
    metal: { color: white ? 0xdce3e6 : 0x2d4057, metalness: 0.78, roughness: 0.31 },
    wood: { color: white ? 0xc2824e : 0x3b241d, metalness: 0.02, roughness: 0.43 },
  }[style];
  const finish = new THREE.MeshStandardMaterial({ ...palette, flatShading: family === 'faceted' });
  if (style === 'wood') {
    finish.onBeforeCompile = shader => {
      shader.vertexShader = `varying vec3 vRiftWoodPosition;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRiftWoodPosition = position;');
      shader.fragmentShader = `varying vec3 vRiftWoodPosition;\n${shader.fragmentShader}`.replace('#include <color_fragment>', '#include <color_fragment>\nfloat riftGrain = sin(vRiftWoodPosition.y * 72.0 + 5.0 * sin(vRiftWoodPosition.x * 15.0 + vRiftWoodPosition.z * 11.0));\ndiffuseColor.rgb *= 0.91 + 0.09 * riftGrain;');
    };
    finish.customProgramCacheKey = () => `rift-dimensional-wood-${family}`;
  }
  materialCache.set(key, finish);
  return finish;
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
  group.userData.geometryAudit = { family, kind, componentPolicy: 'each child mesh is a closed solid except the declared bishop slot' };
  const finish = material(style, side, family);
  const asset = assetsFor(kind, family);
  const mesh = new THREE.Mesh(asset.geometry, finish);
  mesh.name = `${family}-${kind}-sculpture`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.piece = code;
  mesh.userData.sharedPieceAsset = true;
  mesh.userData.geometryAudit = { componentCount: asset.components.length, merged: true };
  group.userData.geometryAudit.components = asset.components.map(component => ({
    name: component.name,
    geometry: component.geometry,
    closed: !component.intentionalOpenings,
    intentionalOpenings: component.intentionalOpenings ?? [],
  }));
  group.add(mesh);
  return group;
}

/** Detach an instance; geometry and materials remain owned by the shared caches. */
export function disposePiece(group: THREE.Group): void {
  group.removeFromParent();
  group.clear();
}

/** Call only after all piece groups made by createPiece have been removed. */
export function disposePieceAssets(): void {
  for (const asset of geometryCache.values()) {
    asset.geometry.dispose();
    for (const component of asset.components) component.geometry.dispose();
  }
  for (const finish of materialCache.values()) finish.dispose();
  geometryCache.clear();
  materialCache.clear();
}
