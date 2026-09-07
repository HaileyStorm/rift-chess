import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type PieceFamily = 'classic' | 'faceted';
export type MaterialStyle = 'ceramic' | 'metal' | 'wood';

type PieceKind = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
type AssetPart = {
  geometry: THREE.BufferGeometry;
  name: string;
  tint?: number;
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

function clipSolid(geometry: THREE.BufferGeometry, plane: THREE.Plane): THREE.BufferGeometry {
  const position = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), index = geometry.getIndex();
  type Vertex = { p: THREE.Vector3; n: THREE.Vector3 };
  const points: number[] = [], directions: number[] = [], rim = new Map<string, THREE.Vector3>();
  const vertex = (offset: number): Vertex => { const i = index ? index.getX(offset) : offset; return { p: new THREE.Vector3().fromBufferAttribute(position, i), n: new THREE.Vector3().fromBufferAttribute(normals, i) }; };
  const emit = (a: Vertex, b: Vertex, c: Vertex) => {
    if (b.p.clone().sub(a.p).cross(c.p.clone().sub(a.p)).lengthSq() < 1e-26) return;
    for (const value of [a, b, c]) { points.push(...value.p.toArray()); directions.push(...value.n.toArray()); }
  };
  for (let offset = 0; offset < (index?.count ?? position.count); offset += 3) {
    const triangle = [vertex(offset), vertex(offset + 1), vertex(offset + 2)], clipped: Vertex[] = [];
    for (let edge = 0; edge < 3; edge++) {
      const a = triangle[edge], b = triangle[(edge + 1) % 3];
      const da = plane.distanceToPoint(a.p), db = plane.distanceToPoint(b.p);
      if (da <= 0) clipped.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const t = da / (da - db), p = a.p.clone().lerp(b.p, t), n = a.n.clone().lerp(b.n, t).normalize();
        clipped.push({ p, n }); rim.set(p.toArray().map(v => v.toFixed(7)).join(','), p);
      }
    }
    for (let i = 1; i + 1 < clipped.length; i++) emit(clipped[0], clipped[i], clipped[i + 1]);
  }
  // The source and all subsequent half-space intersections are convex, so an ordered cap fan is exact.
  if (rim.size >= 3) {
    const boundary = [...rim.values()], center = boundary.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / boundary.length);
    const normal = plane.normal.clone().normalize(), u = new THREE.Vector3(Math.abs(normal.x) < .8 ? 1 : 0, Math.abs(normal.x) < .8 ? 0 : 1, 0).cross(normal).normalize(), v = normal.clone().cross(u);
    boundary.sort((a, b) => Math.atan2(a.clone().sub(center).dot(v), a.clone().sub(center).dot(u)) - Math.atan2(b.clone().sub(center).dot(v), b.clone().sub(center).dot(u)));
    for (let i = 0; i < boundary.length; i++) emit({ p: center, n: normal }, { p: boundary[i], n: normal }, { p: boundary[(i + 1) % boundary.length], n: normal });
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3)).setAttribute('normal', new THREE.Float32BufferAttribute(directions, 3));
}

function sculptedBishopHead(family: PieceFamily): AssetPart[] {
  const faceted = family === 'faceted';
  const head = closedRevolution([[.10, .64], [.15, .73], [.185, .83], [.20, .93], [.17, 1.03], [.10, 1.12], [.015, 1.18]], faceted ? 12 : 48);
  head.scale(1, 1, .90);
  const length = Math.hypot(.65, 1), normal = new THREE.Vector3(-.65, 1, 0).normalize();
  const lowerPlane = new THREE.Plane(normal, -.987 / length);
  const upperPlane = new THREE.Plane(normal.clone().negate(), 1.033 / length);
  const lower = clipSolid(head, lowerPlane), upper = clipSolid(head, upperPlane);
  const middleA = clipSolid(head, lowerPlane.clone().negate());
  const middleB = clipSolid(middleA, upperPlane.clone().negate());
  const bridge = clipSolid(middleB, new THREE.Plane(new THREE.Vector3(0, 0, 1), .071));
  head.dispose(); middleA.dispose(); middleB.dispose();
  return [
    { geometry: lower, name: `${family}-bishop-closed-carved-mitre-lower` },
    { geometry: upper, name: `${family}-bishop-closed-carved-mitre-upper` },
    { geometry: bridge, name: `${family}-bishop-closed-carved-mitre-bridge` },
  ];
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

function bevelledBlock(width: number, height: number, depth: number, bevel: number): THREE.ExtrudeGeometry {
  const geometry = solidExtrusion([[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]], depth, bevel);
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function maneRidge(family: PieceFamily): THREE.BufferGeometry {
  const faceted = family === 'faceted';
  return closedYLoft(faceted
    ? [[-0.12, 0.42, 0.09, 0.065], [-0.19, 0.55, 0.085, 0.06], [-0.18, 0.69, 0.075, 0.058], [-0.11, 0.84, 0.06, 0.05], [-0.04, 0.96, 0.04, 0.035]]
    : [[-0.11, 0.41, 0.085, 0.06], [-0.17, 0.50, 0.08, 0.058], [-0.19, 0.62, 0.075, 0.055], [-0.16, 0.75, 0.07, 0.052], [-0.10, 0.87, 0.058, 0.045], [-0.035, 0.98, 0.038, 0.032]], faceted ? 8 : 24);
}

function crossParts(family: PieceFamily): AssetPart[] {
  const faceted = family === 'faceted';
  const bevel = faceted ? 0 : 0.016;
  const upright = bevelledBlock(0.10, 0.41, 0.13, bevel);
  upright.translate(0, 1.10, 0);
  const xArm = bevelledBlock(0.29, 0.09, 0.13, bevel);
  xArm.translate(0, 1.17, 0);
  const zArm = bevelledBlock(0.29, 0.09, 0.13, bevel);
  zArm.rotateY(Math.PI / 2); zArm.translate(0, 1.17, 0);
  return [
    { geometry: upright, name: `${family}-king-cross-upright` },
    { geometry: xArm, name: `${family}-king-cross-x-arm` },
    { geometry: zArm, name: `${family}-king-cross-z-arm` },
  ];
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
      ? [[0, .34, .19, .17], [-.07, .53, .17, .15], [-.10, .75, .13, .13], [-.055, .96, .12, .135], [.02, 1.05, .125, .145]]
      : [[0, .35, .18, .16], [-.07, .50, .17, .14], [-.10, .68, .135, .12], [-.085, .83, .115, .12], [-.04, .98, .11, .135], [.035, 1.06, .12, .14]], sides),
    name: `${family}-knight-curved-volumetric-neck`,
  });
  parts.push({
    geometry: closedXLoft(faceted
      ? [[-.06, 1.055, .10, .12], [.02, 1.10, .12, .145], [.12, 1.06, .11, .15], [.22, .985, .075, .105], [.315, .95, .065, .085]]
      : [[-.06, 1.055, .10, .12], [0, 1.095, .12, .145], [.095, 1.08, .12, .15], [.18, 1.01, .09, .115], [.27, .965, .075, .09], [.315, .95, .065, .085]], sides),
    name: `${family}-knight-dimensional-head-and-muzzle`,
  });
  const ear = new THREE.ConeGeometry(faceted ? .042 : .035, .15, faceted ? 4 : 12);
  ear.rotateZ(.12); ear.translate(-.025, 1.235, -.09);
  const secondEar = ear.clone(); secondEar.translate(0, 0, .18);
  parts.push({ geometry: ear, name: `${family}-knight-left-ear` }, { geometry: secondEar, name: `${family}-knight-right-ear` });
  parts.push({ geometry: maneRidge(family), name: `${family}-knight-continuous-dimensional-mane` });
  for (const sign of [-1, 1]) {
    const eye = new THREE.SphereGeometry(.022, faceted ? 8 : 16, 10); eye.scale(1, 1, .45); eye.translate(.035, 1.125, sign * .137);
    const nostril = new THREE.SphereGeometry(.014, 10, 8); nostril.scale(.45, .75, 1); nostril.translate(.315, .965, sign * .043);
    parts.push({ geometry: eye, name: `${family}-knight-eye-${sign}`, tint: 0x303030 }, { geometry: nostril, name: `${family}-knight-nostril-${sign}`, tint: 0x303030 });
  }
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
      : [[0.035, 0.455], [0.085, 0.505], [0.125, 0.54], [0.15, 0.59], [0.158, 0.645], [0.145, 0.70], [0.11, 0.745], [0.065, 0.77], [0.028, 0.78]], faceted ? 8 : 48), name: `${family}-pawn-crowned-head` });
  } else if (kind === 'bishop') {
    parts.push(...sculptedBishopHead(family));
  } else if (kind === 'rook') {
    const crown = closedRevolution(faceted ? [[0.22, 0.74], [0.25, 0.78], [0.25, 0.86], [0.21, 0.89]] : [[0.20, 0.69], [0.23, 0.73], [0.23, 0.80], [0.20, 0.84]], faceted ? 8 : 32);
    parts.push({ geometry: crown, name: `${family}-rook-solid-crown-drum` });
    const count = faceted ? 4 : 6;
    for (let index = 0; index < count; index++) {
      const angle = index * Math.PI * 2 / count;
      const merlon = faceted ? new THREE.BoxGeometry(0.16, 0.16, 0.16) : bevelledBlock(0.115, 0.13, 0.115, 0.014);
      merlon.rotateY(-angle); merlon.translate(Math.cos(angle) * (faceted ? 0.18 : 0.17), faceted ? 0.92 : 0.90, Math.sin(angle) * (faceted ? 0.18 : 0.17));
      parts.push({ geometry: merlon, name: `${family}-rook-closed-merlon-${index + 1}` });
    }
  } else if (kind === 'queen') {
    const crown = closedRevolution(faceted ? [[0.22, 0.80], [0.24, 0.84], [0.17, 0.91], [0.13, 0.93]] : [[0.18, 0.80], [0.21, 0.85], [0.18, 0.90], [0.15, 0.92]], faceted ? 8 : 32);
    parts.push({ geometry: crown, name: `${family}-queen-coronet-base` });
    const count = faceted ? 5 : 7;
    parts.push({ geometry: closedRevolution([[0.035, 0.89], [0.055, 0.95], [0.05, 1.04], [0.032, 1.12]], faceted ? 8 : 32), name: `${family}-queen-continuous-orb-stem` });
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
    parts.push(...crossParts(family));
  }
  return parts;
}

function mergedGeometry(components: readonly AssetPart[]): THREE.BufferGeometry {
  const copies = components.map(({ geometry, tint }) => {
    const copy = geometry.clone();
    const color = new THREE.Color(tint ?? 0xffffff), colors = new Float32Array(copy.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) { colors[i] = color.r; colors[i + 1] = color.g; colors[i + 2] = color.b; }
    copy.setAttribute('color', new THREE.BufferAttribute(colors, 3));
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
  const ground = Math.min(...components.map(({ geometry }) => { geometry.computeBoundingBox(); return geometry.boundingBox!.min.y; }));
  for (const { geometry } of components) geometry.translate(0, -ground, 0);
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
    ceramic: { color: white ? 0xe7dcc4 : 0x345477, metalness: 0.05, roughness: 0.38 },
    metal: { color: white ? 0xdce3e6 : 0x7189a2, metalness: 0.62, roughness: 0.48 },
    wood: { color: white ? 0xe0af78 : 0x986746, metalness: 0.02, roughness: 0.43 },
  }[style];
  const finish = new THREE.MeshStandardMaterial({ ...palette, flatShading: family === 'faceted', vertexColors: true });
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
  group.userData.geometryAudit = { family, kind, componentPolicy: 'each merged source component is a closed solid' };
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
    closed: true,
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
