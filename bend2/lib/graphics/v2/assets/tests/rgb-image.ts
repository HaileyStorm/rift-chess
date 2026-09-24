import assert from 'node:assert/strict';
import RgbImage from '../RgbImage.bend';

type BendList = { $: 'Nil' } | { $: 'Con'; head: number; tail: BendList };
type Image = { $: 'Pix'; color: number } | {
  $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image;
};

function asBendList(bytes: ArrayLike<number>): BendList {
  let tail: BendList = { $: 'Nil' };
  for (let i = bytes.length - 1; i >= 0; i -= 1)
    tail = { $: 'Con', head: bytes[i], tail };
  return tail;
}

function decode(bytes: ArrayLike<number>) {
  return RgbImage.decode_bytes(asBendList(bytes)) as
    | { $: 'Decoded'; depth: number; pixels: Image }
    | { $: 'Rejected'; reason: { $: string } };
}

function sample(image: Image, side: number, x: number, y: number): number {
  while (image.$ === 'Qua') {
    side >>= 1;
    const right = x >= side;
    const bottom = y >= side;
    image = bottom ? (right ? image.br : image.bl) : (right ? image.tr : image.tl);
    if (right) x -= side;
    if (bottom) y -= side;
  }
  return image.color;
}

function payloadFor(depth: number): Uint8Array {
  const side = 1 << depth;
  const raw = new Uint8Array(side * side * 3);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const at = (y * side + x) * 3;
      raw[at] = (x * 17 + y * 31 + depth * 7) & 255;
      raw[at + 1] = (x * 43 + y * 11 + depth * 13) & 255;
      raw[at + 2] = (x * 5 + y * 67 + depth * 19) & 255;
    }
  }
  return raw;
}

function fullBytes(depth: number, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(5 + payload.length);
  bytes.set([82, 71, 65, 49, depth]);
  bytes.set(payload, 5);
  return bytes;
}

function rejected(bytes: ArrayLike<number>, reason: string, label: string) {
  const result = decode(bytes);
  assert.equal(result.$, 'Rejected', `${label}: result tag`);
  if (result.$ === 'Rejected') assert.equal(result.reason.$, reason, label);
}

function collectBeforeLargestFixture(): boolean {
  const runtime = globalThis as unknown as {
    Bun?: { gc?: (force?: boolean) => void };
  };
  if (typeof runtime.Bun?.gc !== 'function') return false;
  runtime.Bun.gc(true);
  return true;
}

function maxRssRaw(): number | null {
  const processWithUsage = process as unknown as {
    resourceUsage?: () => { maxRSS?: number };
  };
  const usage = processWithUsage.resourceUsage?.();
  return usage?.maxRSS ?? null;
}

let finitePixels = 0;
const depth9Ms: number[] = [];
let depth9ListMs = 0;
let depth9GcAvailable = false;
let depth9RssBeforeInput = 0;
let depth9RssAfterInput = 0;
let depth9RssAfterList = 0;
let depth9RssAfterDecode = 0;
let depth9RssAfterRepeats = 0;
let depth9RssAfterOverlength = 0;
let depth9MaxRssBeforeRaw: number | null = null;
let depth9MaxRssAfterWork: number | null = null;
let depth9List: BendList | undefined;
let depth9Bytes: Uint8Array | undefined;

assert.equal(RgbImage.max_depth(), 9);
assert.equal(RgbImage.max_pixels(), 262144);
assert.equal(RgbImage.max_bytes(), 786437);

// The exact byte fixtures from the six DRAFT endpoint/error Laws.
assert.deepEqual(decode([82, 71, 65, 49, 0, 18, 52, 86]), {
  $: 'Decoded', depth: 0, pixels: { $: 'Pix', color: 0x123456 },
});
assert.deepEqual(decode([82, 71, 65, 49, 1,
  17, 17, 17, 34, 34, 34, 51, 51, 51, 68, 68, 68]), {
  $: 'Decoded', depth: 1,
  pixels: {
    $: 'Qua', tl: { $: 'Pix', color: 0x111111 },
    tr: { $: 'Pix', color: 0x222222 },
    bl: { $: 'Pix', color: 0x333333 },
    br: { $: 'Pix', color: 0x444444 },
  },
});
assert.deepEqual(decode([82, 71, 65, 49, 1,
  18, 52, 86, 18, 52, 86, 18, 52, 86, 18, 52, 86]), {
  $: 'Decoded', depth: 1, pixels: { $: 'Pix', color: 0x123456 },
}, 'uniform output may use the equivalent compact Pix form');
rejected([88, 71, 65, 49, 0, 18, 52, 86], 'BadMagic', 'bad magic');
rejected([82, 71, 65, 49, 0, 18, 52, 86, 0], 'BadLength', 'trailing byte');
rejected([82, 71, 65, 49, 10], 'BadDepth', 'depth 10');
rejected([82, 71, 65, 49, 0, 256, 52, 86], 'NonByte', 'non-byte payload');
for (let length = 0; length < 5; length += 1)
  rejected([82, 71, 65, 49, 0].slice(0, length), 'BadLength', `short header ${length}`);
rejected([82, 300], 'BadLength', 'short header takes precedence over non-byte');
rejected([82, 300, 65, 49, 0], 'NonByte', 'header byte range precedes magic');
rejected([88, 71, 65, 49, 10], 'BadMagic', 'magic takes precedence over depth');
rejected([82, 71, 65, 49, 256], 'NonByte', 'depth byte range precedes depth domain');
rejected([82, 71, 65, 49, 0, 18, 52], 'BadLength', 'short pixel');

for (let depth = 0; depth <= 9; depth += 1) {
  const side = 1 << depth;
  if (depth === 9) {
    depth9GcAvailable = collectBeforeLargestFixture();
    depth9RssBeforeInput = process.memoryUsage().rss;
    depth9MaxRssBeforeRaw = maxRssRaw();
  }
  const payload = payloadFor(depth);
  const bytes = fullBytes(depth, payload);
  if (depth === 9) depth9RssAfterInput = process.memoryUsage().rss;
  let beforeList = performance.now();
  const byteList = asBendList(bytes);
  const afterList = performance.now();
  if (depth === 9) depth9RssAfterList = process.memoryUsage().rss;
  const started = performance.now();
  const result = RgbImage.decode_bytes(byteList) as
    | { $: 'Decoded'; depth: number; pixels: Image }
    | { $: 'Rejected'; reason: { $: string } };
  const finished = performance.now();
  assert.equal(result.$, 'Decoded', `valid depth ${depth}`);
  if (result.$ === 'Rejected') throw new Error(`valid depth ${depth}: ${result.reason.$}`);
  assert.equal(result.depth, depth, `reported depth ${depth}`);

  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const at = (y * side + x) * 3;
      const expected = (payload[at] << 16) | (payload[at + 1] << 8) | payload[at + 2];
      assert.equal(sample(result.pixels, side, x, y), expected,
        `row-major pixel depth=${depth} x=${x} y=${y}`);
      finitePixels += 1;
    }
  }
  if (depth === 9) {
    depth9ListMs = afterList - beforeList;
    depth9Ms.push(finished - started);
    depth9RssAfterDecode = process.memoryUsage().rss;
    depth9List = byteList;
    depth9Bytes = bytes;
  }
}

// The full-pixel check above is the first depth-9 sample. Two repetitions on
// the same immutable list expose warm decoder cost without timing transport.
if (depth9List === undefined || depth9Bytes === undefined)
  throw new Error('depth-9 fixture was not built');
assert.equal(depth9Bytes.length, RgbImage.max_bytes(), 'exact maximum valid asset length');
for (let repeat = 0; repeat < 2; repeat += 1) {
  const started = performance.now();
  const result = RgbImage.decode_bytes(depth9List) as
    | { $: 'Decoded'; depth: number; pixels: Image }
    | { $: 'Rejected'; reason: { $: string } };
  depth9Ms.push(performance.now() - started);
  assert.equal(result.$, 'Decoded', 'repeated valid depth 9');
  if (result.$ === 'Rejected') throw new Error(`depth 9: ${result.reason.$}`);
  depth9RssAfterRepeats = Math.max(depth9RssAfterRepeats,
    process.memoryUsage().rss);
}

// Exact-size acceptance at depth 9 plus an extra terminal byte must reject.
const oversized = new Uint8Array(depth9Bytes.length + 1);
oversized.set(depth9Bytes);
rejected(oversized, 'BadLength', 'depth-9 trailing byte');
depth9RssAfterOverlength = process.memoryUsage().rss;
depth9MaxRssAfterWork = maxRssRaw();

const sorted = [...depth9Ms].sort((a, b) => a - b);
const p90Index = Math.ceil(sorted.length * 0.9) - 1;
console.log(JSON.stringify({
  ok: true,
  finitePixels,
  depth9: {
    listBuildMs: Number(depth9ListMs.toFixed(2)),
    decodeMedianMs: Number(sorted[Math.floor(sorted.length / 2)]?.toFixed(2) ?? 0),
    decodeP90Ms: Number(sorted[p90Index]?.toFixed(2) ?? 0),
    gcAvailable: depth9GcAvailable,
    rssBeforeInputBytes: depth9RssBeforeInput,
    rssAfterInputBytes: depth9RssAfterInput,
    rssAfterBendListBytes: depth9RssAfterList,
    rssAfterDecodeBytes: depth9RssAfterDecode,
    rssAfterRepeatsBytes: depth9RssAfterRepeats,
    rssAfterOverlengthBytes: depth9RssAfterOverlength,
    decoderSnapshotDeltaBytes: depth9RssAfterDecode - depth9RssAfterList,
    maxRssRawBeforeDepth9: depth9MaxRssBeforeRaw,
    maxRssRawAfterWork: depth9MaxRssAfterWork,
    inputBytes: RgbImage.max_bytes(),
    outputPixels: RgbImage.max_pixels(),
  },
  claim: 'Independent finite row-major RGB reference; not native/GPU/browser evidence',
}));
