import { performance } from 'node:perf_hooks';
import Camera from '../graphics/Camera.bend';
import Model from '../core/Model.bend';
import Picking from '../graphics/Picking.bend';
import Sprites from '../graphics/Sprites.bend';

type ViewValue = { $: 'View'; yaw: number; pitch: number; zoom: number };
type BendList = { $: 'Nil' } | { $: 'Con'; head: any; tail: BendList };

const view = (yaw: number, pitch: number, zoom: number): ViewValue => ({
  $: 'View', yaw, pitch, zoom,
});

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function close(actual: number, expected: number, tolerance: number, label: string): void {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    fail(`${label}: expected ${expected}, got ${actual}`);
  }
}

function listValues(value: BendList): any[] {
  const values: any[] = [];
  let current: BendList = value;
  while (current.$ === 'Con') {
    values.push(current.head);
    current = current.tail;
  }
  return values;
}

function listOf(values: number[]): BendList {
  let result: BendList = { $: 'Nil' };
  for (let index = values.length - 1; index >= 0; index -= 1) {
    result = { $: 'Con', head: values[index], tail: result };
  }
  return result;
}

const f32 = Math.fround;
const PI = f32(3.14159265);

function normalized(v: ViewValue): ViewValue {
  return view(((v.yaw % 360) + 360) % 360, Math.max(35, Math.min(90, v.pitch)),
    Math.max(75, Math.min(115, v.zoom)));
}

function reference(v: ViewValue, file: number, row: number): { x: number; y: number } {
  const n = normalized(v);
  const yawAngle = f32(f32(n.yaw) * f32(PI / 180));
  const pitchAngle = f32(f32(n.pitch) * f32(PI / 180));
  const cosYaw = f32(Math.cos(yawAngle));
  const sinYaw = f32(Math.sin(yawAngle));
  const sinPitch = f32(Math.sin(pitchAngle));
  const axis = f32(f32(Math.abs(cosYaw)) + f32(Math.abs(sinYaw)));
  const scale = f32(f32(360 / f32(8 * axis)) * f32(n.zoom) / 100);
  const df = f32(file - 3.5);
  const dr = f32(row - 3.5);
  const horizontal = f32(f32(cosYaw * df) - f32(sinYaw * dr));
  const vertical = f32(f32(sinYaw * df) + f32(cosYaw * dr));
  return {
    x: f32(256 + f32(scale * horizontal)),
    y: f32(274 + f32(f32(scale * sinPitch) * vertical)),
  };
}

function roundedPixel(value: number): number {
  return Math.max(0, Math.floor(f32(value + 0.5)));
}

function squareRow(square: number): number {
  return 7 - Math.floor(square / 8);
}

function boardWithPieces(pieces: Record<number, number>): any {
  const start = Model.start(false) as any;
  return { ...start, board: listOf(Array.from({ length: 64 }, (_, i) => pieces[i] ?? 0)) };
}

function boardWithSinglePiece(code: number, square: number): any {
  return boardWithPieces({ [square]: code });
}

const started = performance.now();
let checks = 0;
const check = (condition: unknown, message: string): void => {
  assert(condition, message);
  checks += 1;
};

const fallback = Camera.default_view() as any;
check(fallback.$ === 'View' && fallback.yaw === 0 && fallback.pitch === 65 && fallback.zoom === 100,
  'default camera view');
const clamped = Camera.normalize(view(721, 12, 500)) as any;
check(clamped.yaw === 1 && clamped.pitch === 35 && clamped.zoom === 115, 'view normalization');

const views = [
  view(0, 35, 75), view(0, 65, 100), view(0, 90, 115),
  view(45, 35, 100), view(90, 65, 100), view(135, 90, 75),
  view(180, 35, 115), view(225, 65, 100), view(270, 90, 100),
  view(315, 35, 75), view(359, 90, 115),
];
const samples = [[0, 0], [3.5, 3.5], [7, 7], [-0.485, 7.485], [2.25, 5.75]];

for (const current of views) {
  const basis = Camera.basis(current);
  for (const [file, row] of samples) {
    const expected = reference(current, file, row);
    close(Camera.project_x(basis, file, row), expected.x, 0.02,
      `project x ${current.yaw}/${current.pitch}/${current.zoom}/${file}/${row}`);
    close(Camera.project_y(basis, file, row), expected.y, 0.02,
      `project y ${current.yaw}/${current.pitch}/${current.zoom}/${file}/${row}`);
    checks += 2;
  }
  const order = listValues(Camera.depth_order(basis)) as number[];
  check(order.length === 64, `depth order length at ${current.yaw}/${current.pitch}`);
  check(new Set(order).size === 64 && order.every((id) => id >= 0 && id < 64),
    `depth order IDs at ${current.yaw}/${current.pitch}`);
  const expectedOrder = Array.from({ length: 64 }, (_, square) => square)
    .sort((a, b) => {
      const ay = roundedPixel(reference(current, a % 8, squareRow(a)).y);
      const by = roundedPixel(reference(current, b % 8, squareRow(b)).y);
      return ay - by || a - b;
    });
  check(order.every((square, index) => square === expectedOrder[index]),
    `depth order sort at ${current.yaw}/${current.pitch}/${current.zoom}`);
  for (let square = 0; square < 64; square += 1) {
    const file = square % 8;
    const row = squareRow(square);
    const expected = reference(current, file, row);
    const cx = Camera.center_x(square, basis);
    const cy = Camera.center_y(square, basis);
    check(cx === roundedPixel(expected.x) && cy === roundedPixel(expected.y),
      `center ${square} at ${current.yaw}/${current.pitch}/${current.zoom}`);
    check(Camera.square_at(cx, cy, basis) === square,
      `inverse center ${square} at ${current.yaw}/${current.pitch}/${current.zoom}`);
    check(Picking.square_at(cx, cy, basis) === square,
      `picking inverse center ${square} at ${current.yaw}/${current.pitch}/${current.zoom}`);
  }
  check(Camera.square_at(512, 0, basis) === 64 && Camera.square_at(0, 512, basis) === 64,
    `outside image at ${current.yaw}/${current.pitch}`);
  check(Camera.extrusion(basis) >= 0 && Camera.extrusion(basis) <= 8,
    `extrusion bounds at ${current.yaw}/${current.pitch}`);
}

const pieceSquare = 27;
const pieceCode = 1;
const position = boardWithSinglePiece(pieceCode, pieceSquare);
let opaque: [number, number] | null = null;
let transparent: [number, number] | null = null;
for (let y = 0; y < 36 && (!opaque || !transparent); y += 1) {
  for (let x = 0; x < 24 && (!opaque || !transparent); x += 1) {
    if (Sprites.alpha(pieceCode, x, y)) {
      if (!opaque) opaque = [x, y];
    } else if (!transparent) {
      transparent = [x, y];
    }
  }
}
assert(opaque && transparent, 'sprite needs opaque and transparent samples');
for (const current of [views[0], views[3], views[4], views[8], views[10]]) {
  const basis = Camera.basis(current);
  const cx = Camera.center_x(pieceSquare, basis);
  const cy = Camera.center_y(pieceSquare, basis);
  const [opaqueX, opaqueY] = opaque;
  const [transparentX, transparentY] = transparent;
  check(Picking.pick(position, cx - 12 + opaqueX, cy - 32 + opaqueY, basis) === pieceSquare,
    `opaque sprite pick at ${current.yaw}/${current.pitch}`);
  const transparentPointerX = cx - 12 + transparentX;
  const transparentPointerY = cy - 32 + transparentY;
  check(Picking.pick(position, transparentPointerX, transparentPointerY, basis)
    === Camera.square_at(transparentPointerX, transparentPointerY, basis),
  `transparent sprite pass-through at ${current.yaw}/${current.pitch}`);
  check(Picking.pick(position, 512, 512, basis) === 64,
    `outside image pick at ${current.yaw}/${current.pitch}`);
}

const overlapPosition = boardWithPieces({ 27: 6, 35: 6 });
for (const current of [view(0, 35, 100), view(180, 35, 100)]) {
  const basis = Camera.basis(current);
  const order = listValues(Camera.depth_order(basis)) as number[];
  const centers = [27, 35].map((square) => [Camera.center_x(square, basis), Camera.center_y(square, basis)]);
  const left = Math.max(0, Math.min(...centers.map(([x]) => x)) - 16);
  const right = Math.min(511, Math.max(...centers.map(([x]) => x)) + 16);
  const top = Math.max(0, Math.min(...centers.map(([, y]) => y)) - 36);
  const bottom = Math.min(511, Math.max(...centers.map(([, y]) => y)) + 4);
  let overlapChecks = 0;
  for (let y = top; y <= bottom && overlapChecks < 4; y += 1) {
    for (let x = left; x <= right && overlapChecks < 4; x += 1) {
      const hits = order.filter((square) => {
        if (square !== 27 && square !== 35) return false;
        const centerX = Camera.center_x(square, basis);
        const centerY = Camera.center_y(square, basis);
        return Sprites.alpha(6, (x - (centerX - 12)) >>> 0, (y - (centerY - 32)) >>> 0);
      });
      if (hits.length >= 2) {
        check(Picking.pick(overlapPosition, x, y, basis) === hits[hits.length - 1],
          `overlap draw-order pick at ${current.yaw}/${current.pitch}`);
        overlapChecks += 1;
      }
    }
  }
  check(overlapChecks > 0, `overlap sample exists at ${current.yaw}/${current.pitch}`);
}

console.log(JSON.stringify({ ok: true, checks,
  classification: 'camera projection/inverse, rounded depth order, and rotated opaque/transparent sprite picking',
  elapsedMs: performance.now() - started }));
