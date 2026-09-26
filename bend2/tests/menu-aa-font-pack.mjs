// Exact pinned-compiler emission and negative checks for the app font codec.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as Bend from '../../.artifacts/toolchains/bend/bend2/bend.ts';
import * as Comp from '../../.artifacts/toolchains/bend/bend2/comp.ts';
import { resolveBaseForeignImports } from '../tools/loader-v2.ts';

process.env.BEND_NO_TELEMETRY = '1';
const root = path.resolve(import.meta.dirname, '../..');
const book = Bend.book_nil();
const began = performance.now();
await Bend.book_load(book, path.join(root, 'bend2/ui/v2/fonts/FontPack.bend').replaceAll('\\','/'),
  '', new Map());
resolveBaseForeignImports(book);
Bend.book_valid(book);
assert.equal(book.hols + book.open, 0);
const file = path.join(root, '.artifacts/bend2/v2-preview/menu-aa-font-pack.mjs');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, Comp.js_lib(book, ['decode', 'glyph', 'asset_path', 'byte_cap'],
  ['decode', 'glyph', 'asset_path', 'byte_cap']));
const api = (await import(pathToFileURL(file).href + `?b=${Date.now()}`)).default;
function parse(source, override) {
  const bytes = new Uint8Array(2 ** Math.ceil(Math.log2(Math.max(1,source.length))));
  bytes.set(source);
  return api.decode(bytes, override ?? source.length);
}
const single = Uint8Array.from([82,70,78,84,1,1,0,63,10,128,128,0,0,255]);
const small = parse(single);
assert.equal(small.$, 'Some', String(small.$));
assert.equal(api.glyph(small.value,0,63).advance,10);
assert.equal(api.glyph(small.value,0,63).coverage.color,255 << 16);
assert.equal(parse(Uint8Array.from([0,...single.subarray(1)])).$, 'None');
assert.equal(parse(single,single.length - 1).$, 'None');
assert.equal(parse(Uint8Array.from([...single,0])).$, 'None');
assert.equal(parse(Uint8Array.from([...single.subarray(0,12),1,255])).$, 'None');
assert.equal(api.decode(Uint8Array.from(single),single.length).$, 'None',
  'non-power-of-two backing must fail before wrapped Array.get');
const nonByte = [ ...single,0,0 ]; nonByte[13] = 300;
assert.equal(api.decode(nonByte,single.length).$, 'None');
assert.equal(api.decode(Uint8Array.from([0,0,0,0]),262145).$, 'None');
const bytes = fs.readFileSync(path.join(root,'bend2/assets/runtime/rift-observatory-font.rga'));
const manifest = JSON.parse(fs.readFileSync(path.join(root,'bend2/ui/v2/fonts/packed-manifest.json')));
assert.equal(bytes.length,manifest.bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.output_sha256);
assert.ok(bytes.length < api.byte_cap());
const start = performance.now();
const decoded = parse(bytes);
assert.equal(decoded.$,'Some','pinned font pack must decode');
for (const tier of [0,1,2,3]) {
  const question = api.glyph(decoded.value,tier,63);
  assert.ok(question.advance > 0);
  assert.ok(question.coverage.$ === 'Qua' || question.coverage.$ === 'Pix');
}
const smooth = (node) => node.$ === 'Pix'
  ? ((node.color >>> 16) & 255) > 0 && ((node.color >>> 16) & 255) < 255
  : [node.tl,node.tr,node.bl,node.br].some(smooth);
assert.ok(smooth(api.glyph(decoded.value,3,63).coverage),
  'large glyph must retain intermediate 8-bit edge coverage');
console.log(JSON.stringify({ok:true,bytes:bytes.length,records:manifest.records,
  checkedMs:Math.round(performance.now()-began),decodeMs:Math.round(performance.now()-start),
  backing:'padded Uint8Array',sourceBound:true}));
