// Source-bound visual smoke test for the new Bend-owned menu. Artifacts are
// ignored; inspect the PNGs before claiming visual acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as Bend from '../../.artifacts/toolchains/bend/bend2/bend.ts';
import * as Comp from '../../.artifacts/toolchains/bend/bend2/comp.ts';
import { resolveBaseForeignImports } from '../tools/loader-v2.ts';
import { PixelPort } from '../platform/browser/image-port.ts';
import { writePng } from '../lib/graphics/v2/tools/png.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(root, '.artifacts/bend2/v2-preview/menu-aa');
fs.mkdirSync(output, { recursive: true });
const book = Bend.book_nil();
const began = performance.now();
await Bend.book_load(book, path.join(root, 'bend2/ui/v2/MenuAASpecimen.bend').replaceAll('\\', '/'),
  '', new Map());
resolveBaseForeignImports(book);
Bend.book_valid(book);
assert.equal(book.hols + book.open, 0);
console.log(`checked ${book.order.length} definitions in ${Math.round(performance.now() - began)}ms`);
const controlsOnly = process.argv.includes('--controls-only');
const exports = controlsOnly ? ['decoded','base_prepared','controls_from_base',
  'destinations_from_base','destination_selected'] : ['decoded', 'desktop', 'prepared', 'static_prepared',
  'base_prepared','controls_from_base','destinations_from_base',
  'destination_selected',
  'selected_dynamic', 'empty_dynamic', 'reuse_on_text_change',
  'reuse_base_on_destination_change', 'composed',
  'preferences', 'mobile', 'view', 'match_actions'];
const code = Comp.js_lib(book, exports, exports);
const emitted = path.join(output, 'specimen.mjs');
fs.writeFileSync(emitted, code);
console.log(`emitted ${Buffer.byteLength(code)} bytes in ${Math.round(performance.now() - began)}ms`);
const api = (await import(pathToFileURL(emitted).href + `?b=${Date.now()}`)).default;
const packed = fs.readFileSync(path.join(root, 'bend2/assets/runtime/rift-observatory-font.rga'));
const bytes = new Uint8Array(2 ** Math.ceil(Math.log2(packed.length)));
bytes.set(packed);
const parsed = api.decoded(bytes,packed.length);
assert.equal(parsed.$,'Some','packaged font must decode in Bend');
const fonts = parsed.value;
if (controlsOnly) {
  const base = api.base_prepared(fonts);
  const times = [];
  let destinationImage;
  for (let i=0;i<40;i++) {
    const start=performance.now();
    destinationImage=api.destinations_from_base(fonts,base);
    times.push(performance.now()-start);
  }
  writePng(path.join(output,'destinations.png'),1024,640,
    new Uint8Array(new PixelPort().render(api.destination_selected(fonts,destinationImage),1024,640,1024)));
  times.sort((a,b)=>a-b);
  console.log(JSON.stringify({case:'12 destination controls',iterations:40,
    p50Ms:+times[19].toFixed(2),p90Ms:+times[35].toFixed(2),
    maxMs:+times[39].toFixed(2),compiledMs:Math.round(performance.now()-began)}));
  process.exit(0);
}
assert.equal(api.reuse_on_text_change(),true,
  'Bend exact static predicate must exclude only dynamic text');
assert.equal(api.reuse_base_on_destination_change(),true,
  'Bend base predicate reuses geometry but rejects changed control layer');
let directDesktop;
for (const [name, width, height] of [['desktop', 1024, 640],
  ['preferences', 1024, 640], ['mobile', 512, 1024],
  ['view', 1024, 640], ['match_actions', 1024, 640]]) {
  const at = performance.now();
  const image = api[name](fonts);
  assert.ok(image.$ === 'Pix' || image.$ === 'Qua');
  const rgba = new Uint8Array(new PixelPort().render(image, width, height, 1024));
  if (name === 'desktop') directDesktop = rgba;
  const file = path.join(output, `${name}.png`);
  writePng(file, width, height, rgba);
  console.log(JSON.stringify({ name, width, height, ms: Math.round(performance.now() - at), file }));
}
const chromeStart = performance.now();
const chrome = api.prepared(fonts);
const chromeMs = performance.now() - chromeStart;
const times = [];
let composed;
for (let i = 0; i < 30; i++) {
  const start = performance.now();
  composed = api.composed(chrome);
  times.push(performance.now() - start);
}
const cachedDesktop = new Uint8Array(new PixelPort().render(composed,1024,640,1024));
assert.deepEqual(cachedDesktop,directDesktop,
  'cached chrome then board must match full render pixel-for-pixel');
times.sort((a,b)=>a-b);
console.log(JSON.stringify({cachedChromeMs:+chromeMs.toFixed(2),
  composeP50Ms:+times[14].toFixed(2),composeP90Ms:+times[26].toFixed(2),
  composeMaxMs:+times[29].toFixed(2),iterations:times.length,
  exactOutput:true}));
const staticStart = performance.now();
const staticImage = api.static_prepared(fonts);
const staticMs = performance.now() - staticStart;
const dynamicTimes = [];
let selected;
for (let i=0;i<30;i++) {
  const start = performance.now();
  selected = i%2 ? api.selected_dynamic(fonts,staticImage)
    : api.empty_dynamic(fonts,staticImage);
  dynamicTimes.push(performance.now()-start);
}
const selectedFull = api.selected_dynamic(fonts,staticImage);
const selectedComposed = api.composed(selectedFull);
const selectedPixels = new Uint8Array(new PixelPort().render(selectedComposed,1024,640,1024));
assert.deepEqual(selectedPixels,directDesktop,
  'static+dynamic+board must equal full render pixel-for-pixel');
dynamicTimes.sort((a,b)=>a-b);
console.log(JSON.stringify({staticMs:+staticMs.toFixed(2),
  dynamicP50Ms:+dynamicTimes[14].toFixed(2),
  dynamicP90Ms:+dynamicTimes[26].toFixed(2),
  dynamicMaxMs:+dynamicTimes[29].toFixed(2),
  iterations:dynamicTimes.length,exactOutput:true}));
const baseAt = performance.now();
const baseImage = api.base_prepared(fonts);
const baseMs = performance.now()-baseAt;
const controlTimes=[], destinationTimes=[];
let controlsImage;
for(let i=0;i<30;i++){
  let at=performance.now();
  controlsImage=api.controls_from_base(fonts,baseImage);
  controlTimes.push(performance.now()-at);
  at=performance.now();
  api.destinations_from_base(fonts,baseImage);
  destinationTimes.push(performance.now()-at);
}
assert.deepEqual(new Uint8Array(new PixelPort().render(
  api.composed(api.selected_dynamic(fonts,controlsImage)),1024,640,1024)),directDesktop,
  'base+controls+dynamic+board must equal full render');
controlTimes.sort((a,b)=>a-b);destinationTimes.sort((a,b)=>a-b);
console.log(JSON.stringify({baseMs:+baseMs.toFixed(2),
  playControlsP90Ms:+controlTimes[26].toFixed(2),
  twelveDestinationsP90Ms:+destinationTimes[26].toFixed(2),
  iterations:30,exactOutput:true}));
