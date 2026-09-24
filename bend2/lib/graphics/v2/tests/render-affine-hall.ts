import fs from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import AffineHall from '../examples/AffineHall.bend';
import RgbImage from '../assets/RgbImage.bend';

type Image = { $: 'Pix'; color: number } | { $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image };
const size = Number(process.argv[2] ?? 1024);
const selection = process.argv[3] ?? '';
const textured = selection === 'texture';
const variant = process.argv[4] ?? (textured ? 'v1' : selection);
if (![1024, 2048, 4096].includes(size)) throw new Error('Use a 1024, 2048 or 4096 pixel tier');
if (variant && !/^[a-z0-9-]+$/.test(variant)) throw new Error('Use an alphanumeric variant label');
const depth = Math.log2(size);
const root = path.resolve('.artifacts/bend2/graphics-v2');
let source: Image | undefined,sourceDepth=0;
let listMs=0,decodeMs=0;
if (textured) {
  const raw=fs.readFileSync('bend2/lib/graphics/v2/examples/materials/limestone-v1-256.rga');
  if(raw.length>RgbImage.max_bytes())throw new Error('RGA1 exceeds Bend byte-list cap');
  const listStart=performance.now();
  let bytes:unknown={$:'Nil'};
  for(let i=raw.length-1;i>=0;i--)
    bytes={$:'Con',head:raw[i],tail:bytes};
  listMs=performance.now()-listStart;
  const decodeStart=performance.now();
  const decoded=RgbImage.decode_bytes(bytes) as
    {$:'Decoded';depth:number;pixels:Image}|{$:'Rejected';reason:unknown};
  decodeMs=performance.now()-decodeStart;
  if(decoded.$!=='Decoded')throw new Error(`RGA1 decode rejected ${JSON.stringify(decoded.reason)}`);
  source=decoded.pixels;sourceDepth=decoded.depth;
}
const t0 = performance.now();
const image = (textured
  ?AffineHall.screen_textured(BigInt(depth),size,
    BigInt(sourceDepth),2**sourceDepth,source)
  :AffineHall.screen(BigInt(depth), size)) as Image;
const renderedMs = performance.now() - t0;
const rgba = Buffer.allocUnsafe(size * size * 4);
let visited = 0;
const unique = new WeakSet<object>();
let uniqueNodes = 0;
function blit(node: Image, x: number, y: number, span: number): void {
  visited++;
  if (!unique.has(node)) { unique.add(node); uniqueNodes++; }
  if (node.$ === 'Qua') {
    const half = span / 2;
    if (half < 1) throw new Error('Malformed Image: Qua at a single pixel');
    blit(node.tl, x, y, half); blit(node.tr, x + half, y, half);
    blit(node.bl, x, y + half, half); blit(node.br, x + half, y + half, half);
    return;
  }
  const color = node.color;
  for (let row = y; row < y + span; row++) {
    let offset = (row * size + x) * 4;
    for (let column = 0; column < span; column++, offset += 4) {
      rgba[offset] = (color >>> 16) & 255;
      rgba[offset + 1] = (color >>> 8) & 255;
      rgba[offset + 2] = color & 255;
      rgba[offset + 3] = 255;
    }
  }
}
blit(image, 0, 0, size);
const blitMs = performance.now() - t0 - renderedMs;
const pngStart = performance.now();
const raw = Buffer.allocUnsafe((size * 4 + 1) * size);
for (let y = 0; y < size; y++) {
  const offset = y * (size * 4 + 1);
  raw[offset] = 0;
  rgba.copy(raw, offset + 1, y * size * 4, (y + 1) * size * 4);
}
let crcTable: Uint32Array | undefined;
function crc32(bytes: Buffer): number {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, index) => {
    let c = index;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  let c = 0xFFFFFFFF;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(tag: string, data: Buffer): Buffer {
  const kind = Buffer.from(tag);
  const length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([kind, data])));
  return Buffer.concat([length, kind, data, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8; ihdr[9] = 6;
const compressed = deflateSync(raw, { level: 6 });
const png = Buffer.concat([Buffer.from('89504E470D0A1A0A', 'hex'),
  chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
fs.mkdirSync(root, { recursive: true });
const output = path.join(root, `affine-hall-${textured?'texture-':''}${size}${variant ? `-${variant}` : ''}.png`);
fs.writeFileSync(output, png);
console.log(JSON.stringify({ ok: true, output, size, renderedMs: +renderedMs.toFixed(2),
  listMs:+listMs.toFixed(2),decodeMs:+decodeMs.toFixed(2),
  blitMs: +blitMs.toFixed(2), pngMs: +(performance.now() - pngStart).toFixed(2),
  visitedNodes: visited, uniqueNodes, bytes: png.length }));
