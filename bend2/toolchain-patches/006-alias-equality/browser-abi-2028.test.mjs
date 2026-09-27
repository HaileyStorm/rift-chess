// Candidate-only, bounded constructor probes for three emitted browser books
// and BotAdapter's source constructor table. Run with local Bun and disposable
// 2.0.28+006; no production/browser/GPU code is loaded by this test.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PresentedInputQueue } from '../../platform/browser/input-queue.ts';
import * as ABI from './browser-abi-2028.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const candidate = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2');
const baseline = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
process.env.BEND_NO_TELEMETRY = '1';
process.env.BEND_HUB = 'http://127.0.0.1:9';
globalThis.fetch = async () => { throw new Error('Candidate ABI probes forbid remote fetch'); };

assert.equal(execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' }).trim(), 'bc178404f4778704fa5584a73fcdf72bcdf9f32c');
assert.equal(sha(fs.readFileSync(path.join(candidate, 'bend.ts'))),
  '801ded73801a15a767f6b593bd09f73f510b77ca2c261b7a1e0e87a00f1e2298');
assert.equal(sha(fs.readFileSync(path.join(candidate, 'comp.ts'))),
  'a8dfc1b8ca96e779e781410643b23f6d7ac5115df7a04f48300aeb5c191d4adc');
assert.equal(sha(fs.readFileSync(path.join(here, '006-after-004-2.0.28.patch'))),
  'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344');

const Bend = await import(pathToFileURL(path.join(candidate, 'bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(candidate, 'comp.ts')).href);
const emitted = {};

async function compileBook(entry, exports) {
  const file = path.resolve(root, entry).replaceAll('\\', '/');
  assert.ok(file.startsWith(root.replaceAll('\\', '/') + '/'));
  const book = Bend.book_nil();
  await Bend.book_load(book, file, '', new Map());
  const oldLog = console.log, oldError = console.error, oldWarn = console.warn;
  // Compiler diagnostics are retained only as bounded text. An upstream
  // structured error can otherwise print the entire loaded book to the console.
  const diagnostics = [];
  const capture = (...args) => {
    if (diagnostics.length < 20) diagnostics.push(args.map(value =>
      typeof value === 'string' ? value.slice(0, 300) : `[${typeof value}]`).join(' '));
  };
  console.log = capture; console.error = capture; console.warn = capture;
  try { Bend.book_valid(book); }
  finally { console.log = oldLog; console.error = oldError; console.warn = oldWarn; }
  assert.equal(book.hols + book.open, 0, `${entry}: incomplete candidate book`);
  for (const name of exports) assert.ok(book.tlds[name], `${entry}: missing ${name}`);
  const constructors = Object.keys(book.ctrs).sort();
  const code = Comp.js_lib(book, exports, exports);
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const api = module.default;
  for (const name of exports) assert.equal(typeof api[name], 'function', `${entry}: missing emitted ${name}`);
  emitted[entry] = { sha256: sha(Buffer.from(code)), exports: [...exports] };
  return { api, constructors };
}

async function probeConstructors(entry) {
  const file = path.resolve(root, entry).replaceAll('\\', '/');
  assert.ok(file.startsWith(root.replaceAll('\\', '/') + '/'));
  const book = Bend.book_nil();
  await Bend.book_load(book, file, '', new Map());
  return Object.keys(book.ctrs).sort();
}

// Per-book roots stay deliberately small: these are the concrete constructors
// at the host seams, not an application build or graphics benchmark.
const controllerProbe = await compileBook('bend2/ApplicationControl.bend', [
  'boot_reads', 'dispatch_at_web', 'bot_job', 'audio_samples']);
const boardProbe = await compileBook('bend2/graphics/v2game/BoardScene.bend', [
  'asset_ids', 'load_plates', 'sprite_asset_ids', 'load_sprite_pages',
  'sprite_same_placement']);
const menuProbe = await compileBook('bend2/ui/v2/MenuAA.bend', [
  'play', 'same_base', 'same_static']);
const botConstructors = await probeConstructors('bend2/platform/worker/BotAdapter.bend');
const controller = controllerProbe.api, board = boardProbe.api, menu = menuProbe.api;

function hasConstructors(actual, expected, book) {
  for (const tag of expected) assert.ok(actual.includes(tag), `${book}: missing source tag ${tag}`);
  return expected;
}
const constructorProbes = {
  controller: hasConstructors(controllerProbe.constructors, [
    ...Object.values(ABI.hostInputTags),
    ...['Store', 'Download', 'PickFile', 'Sound', 'OpenUrl', 'Exit'].map(tag => `ui/Types.${tag}`),
    'graphics/Scene.Frame', 'core/Model.Pos', 'graphics/Camera.View',
    'ui/v2/ChromeData.Presentation', 'ui/v2/ChromePlan.Plan',
    'ui/v2/ChromePlan.Rect', 'ui/v2/ChromePlan.Control'], 'ApplicationControl'),
  board: hasConstructors(boardProbe.constructors, [
    '../Scene.Frame', '../../core/Model.Pos', '../Camera.View',
    'Assets.AssetRequest', 'Assets.AssetResponse', 'Assets.Astral', 'Assets.Stone',
    'PieceAssets.AssetRequest', 'PieceAssets.AssetResponse'], 'BoardScene'),
  menu: hasConstructors(menuProbe.constructors, [
    'ChromeData.Presentation', 'ChromePlan.Plan', 'ChromePlan.Rect',
    'ChromePlan.Control'], 'MenuAA'),
  bot: hasConstructors(botConstructors, ['../../core/Model.Pos'], 'BotAdapter'),
};

function list(items) {
  return items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
}
function values(value, limit = 256) {
  const result = [];
  while (value?.$ === 'Con') {
    assert.ok(result.length < limit, `Bend list exceeded probe limit ${limit}`);
    result.push(value.head);
    value = value.tail;
  }
  assert.equal(value?.$, 'Nil', 'malformed or overlong Base.List');
  return result;
}
function collectTags(value, limit = 5000) {
  const tags = new Set(), seen = new WeakSet();
  let nodes = 0;
  const visit = item => {
    if (item === null || typeof item !== 'object') return;
    assert.ok(++nodes <= limit, `constructor probe exceeded ${limit} object nodes`);
    assert.ok(!seen.has(item), 'candidate constructor probe produced a cyclic value');
    seen.add(item);
    if (typeof item.$ === 'string') tags.add(item.$);
    for (const key of Object.keys(item)) if (key !== '$') visit(item[key]);
    seen.delete(item);
  };
  visit(value);
  return [...tags].sort();
}

const boot = controller.boot_reads('', '', true, true, 1280, 800);
assert.equal(boot.presentation.menu, 0);
const controllerTags = collectTags({ frame: boot.snapshot.frame,
  chromeData: boot.chromeData, plan: boot.plan });
assert.ok(controllerTags.includes('ui/v2/ChromeData.Presentation'));
assert.ok(controllerTags.includes('ui/v2/ChromePlan.Plan'));
assert.ok(controllerTags.includes('ui/v2/ChromePlan.Rect'));
assert.ok(controllerTags.includes('ui/v2/ChromePlan.Control'));
assert.ok(controllerTags.includes('graphics/Scene.Frame'));
assert.ok(controllerTags.includes('core/Model.Pos'));
assert.ok(controllerTags.includes('graphics/Camera.View'));
assert.ok(controllerTags.includes('Con'));
assert.ok(controllerTags.includes('Nil'));

const hostInputs = [
  { $: 'PointerDown', x: 10, y: 20, button: 0, alt: false },
  { $: 'PointerMove', x: 11, y: 21 },
  { $: 'PointerUp', x: 12, y: 22, button: 0 },
  { $: 'Wheel', x: 15, y: 25, delta: -1.5 },
  { $: 'KeyInput', code: 13, down: true, alt: false, ctrl: false, shift: false },
  { $: 'Activate', id: 56 },
  { $: 'Tick', ms: 16 },
  { $: 'Resize', width: 1280, height: 800 },
  { $: 'QualityProbe', portrait: false, physicalEdge: 4096, timingValid: true,
    sampleCount: 8, measuredScale: 1, mainP90Us: 18000, workerP90Us: 17000 },
  { $: 'FileText', text: 'candidate input' },
  { $: 'PortError', kind: 9002 },
];
assert.equal(hostInputs.length, Object.keys(ABI.hostInputTags).length);
for (const input of hostInputs) {
  const mapped = ABI.toControllerInput(input);
  assert.equal(mapped.$, `ui/Types.${input.$}`);
  assert.deepEqual({ ...mapped, $: input.$ }, input, `${input.$}: fields changed`);
}
assert.throws(() => ABI.toControllerInput({ $: 'ui/Types.Activate', id: 56 }), /unsupported constructor/);
assert.throws(() => ABI.toControllerInput({ $: 'FutureInput' }), /unsupported constructor/);
for (const hostileTag of ['__proto__', 'constructor', 'toString']) {
  assert.throws(() => ABI.toControllerInput({ $: hostileTag }), /unsupported constructor/);
  assert.throws(() => ABI.toHostEffect({ $: hostileTag }), /unsupported constructor/);
}
const inheritedTag = Object.create({ $: 'Activate' });
assert.throws(() => ABI.toControllerInput(inheritedTag), /plain constructor record/);
for (const internal of ['PresentedMove', 'PresentedUp', 'SquareInput'])
  assert.throws(() => ABI.toControllerInput({ $: internal }), /unsupported constructor/,
    `${internal} is not a host-authored input`);
assert.throws(() => ABI.toControllerInput(null), /constructor record/);

// The actual host queue runs before conversion. PointerMove coalescing remains
// adjacent-only, preserves the last point, and stops at every non-move input.
{
  const shown = { revision: 4 };
  const queue = new PresentedInputQueue();
  queue.enqueue(hostInputs[1], shown);
  queue.enqueue({ ...hostInputs[1], x: 22, y: 32 }, shown);
  queue.enqueue(hostInputs[0], shown);
  queue.enqueue({ ...hostInputs[1], x: 33, y: 43 }, shown);
  queue.enqueue(hostInputs[2], shown);
  queue.enqueue({ ...hostInputs[1], x: 44, y: 54 }, shown);
  const batch = queue.takeBatch();
  assert.equal(queue.length, 0);
  const adapted = ABI.toControllerBatch(batch);
  assert.equal(adapted.presentation, shown);
  assert.deepEqual(adapted.events.map(event => event.$), [
    'ui/Types.PointerMove', 'ui/Types.PointerDown',
    'ui/Types.PointerMove', 'ui/Types.PointerUp', 'ui/Types.PointerMove']);
  assert.deepEqual(adapted.events.filter(event => event.$ === 'ui/Types.PointerMove')
    .map(event => [event.x, event.y]), [[22, 32], [33, 43], [44, 54]]);
}
for (const barrier of hostInputs.filter(input => input.$ !== 'PointerMove')) {
  const shown = {};
  const queue = new PresentedInputQueue();
  queue.enqueue(hostInputs[1], shown);
  queue.enqueue(barrier, shown);
  queue.enqueue({ ...hostInputs[1], x: 99, y: 98 }, shown);
  const batch = ABI.toControllerBatch(queue.takeBatch());
  assert.deepEqual(batch.events.map(event => event.$), [
    'ui/Types.PointerMove', `ui/Types.${barrier.$}`, 'ui/Types.PointerMove'],
    `${barrier.$} must remain a PointerMove coalescing barrier`);
  assert.equal(batch.events[0].x, 11);
  assert.equal(batch.events[2].x, 99);
}
{
  const queue = new PresentedInputQueue();
  queue.enqueue(hostInputs[1], {});
  queue.enqueue({ ...hostInputs[1], x: 99 }, {});
  assert.equal(ABI.toControllerBatch(queue.takeBatch()).events.length, 1);
  assert.equal(ABI.toControllerBatch(queue.takeBatch()).events[0].x, 99,
    'distinct presentation identity is a queue boundary');
}
assert.throws(() => ABI.toControllerBatch({ events: [{ $: 'Unknown' }] }), /unsupported constructor/);

// Candidate controller constructor probe: exact source-derived tag success is
// distinguished from the misleading bare host spelling.
const bareActivate = controller.dispatch_at_web(list([{ $: 'Activate', id: 56 }]),
  boot.presentation, boot.session);
assert.equal(bareActivate.presentation.menu, 0, 'candidate Controller must reject bare Activate');
const exactActivate = controller.dispatch_at_web(list([
  ABI.toControllerInput({ $: 'Activate', id: 56 })]), boot.presentation, boot.session);
assert.equal(exactActivate.presentation.menu, 11, 'exact ui/Types.Activate opens View');

const controllerEffects = [
  ['Store', { slot: 0, text: 'save' }], ['Download', { name: 'match.json', text: '{}' }],
  ['PickFile', {}], ['Sound', { notes: list([]) }], ['OpenUrl', { url: 'https://example.invalid/' }],
  ['Exit', {}],
];
for (const [tag, fields] of controllerEffects) {
  const input = { $: `ui/Types.${tag}`, ...fields };
  const host = ABI.toHostEffect(input);
  assert.equal(host.$, tag);
  assert.deepEqual({ ...host, $: input.$ }, input);
  if (tag === 'Sound') assert.equal(host.notes, input.notes, 'effect payload remains available to audio synthesis');
}
assert.throws(() => ABI.toHostEffect({ $: 'Store' }), /unsupported constructor/);

// Cross-book frame, ChromeData/ChromePlan, and bot-position probes use values
// returned by the actual candidate Controller, not hand-authored aliases.
const boardFrame = ABI.frameForBoardScene(boot.snapshot.frame);
assert.equal(boardFrame.$, '../Scene.Frame');
assert.equal(board.sprite_same_placement(boardFrame, boardFrame), true);
const chrome = ABI.chromeForMenuAA(boot.chromeData, boot.plan);
assert.equal(chrome.data.$, 'ChromeData.Presentation');
assert.equal(chrome.plan.$, 'ChromePlan.Plan');
assert.equal(menu.same_base(chrome.data, chrome.plan, chrome.data, chrome.plan), true);
assert.equal(menu.same_static(chrome.data, chrome.plan, chrome.data, chrome.plan), true);
let longHistory = { $: 'Nil' };
for (let index = 0; index < 1200; index++)
  longHistory = { $: 'Con', head: `history-${index}`, tail: longHistory };
const longHistoryData = { ...boot.chromeData, history: longHistory };
const longChrome = ABI.chromeForMenuAA(longHistoryData, boot.plan);
assert.equal(longChrome.data.history, longHistory,
  'long Controller history is preserved by identity, not traversed or cloned');
assert.equal(menu.same_base(longChrome.data, longChrome.plan,
  longChrome.data, longChrome.plan), true,
  'MenuAA same_base safely ignores a 1,200-entry history');
assert.equal(menu.same_static(longChrome.data, longChrome.plan,
  longChrome.data, longChrome.plan), true,
  'MenuAA same_static safely ignores a 1,200-entry history');
assert.throws(() => ABI.chromeForMenuAA({ ...boot.chromeData,
  history: { $: 'Future.List' } }, boot.plan), /expected Base.List root/);
const missingChromeField = { ...boot.chromeData };
delete missingChromeField.context;
assert.throws(() => ABI.chromeForMenuAA(missingChromeField, boot.plan), /exact Presentation schema/);
assert.throws(() => ABI.chromeForMenuAA({ ...boot.chromeData, theme: '0' }, boot.plan), /theme: expected U32/);

const botJob = controller.bot_job(boot.session);
const legalIds = values(botJob.ids, 256);
assert.ok(legalIds.length > 0 && legalIds.length <= 256, 'bounded opening legal-ID probe');
const botPosition = ABI.positionForBotAdapter(botJob.position);
assert.equal(botPosition.$, '../../core/Model.Pos');
assert.ok(constructorProbes.bot.includes(botPosition.$), 'BotAdapter source owns the exact target tag');

// Each BoardScene resource module gets its own response constructor namespace.
const plateRequest = values(board.asset_ids(0), 4);
const spriteRequests = values(board.sprite_asset_ids(), 4);
assert.equal(plateRequest.length, 1);
assert.equal(plateRequest[0].$ , 'Assets.AssetRequest');
assert.deepEqual(collectTags(plateRequest[0]), ['Assets.AssetRequest', 'Assets.Astral']);
assert.equal(spriteRequests.length, 3);
assert.ok(spriteRequests.every(request => request.$ === 'PieceAssets.AssetRequest'));
const emptyPlateBytes = { $: 'Nil' };
const plateResponses = ABI.responsesForBoardScene([{
  $: 'AssetResponse', id: plateRequest[0].id, bytes: emptyPlateBytes, ok: false,
}], 'plates');
assert.equal(plateResponses[0].$, 'Assets.AssetResponse');
assert.equal(plateResponses[0].id, plateRequest[0].id, 'plate AssetId identity is preserved');
assert.equal(plateResponses[0].bytes, emptyPlateBytes, 'plate bytes are passed through by identity');
const plates = board.load_plates(list(plateResponses));
assert.equal(plates.$, 'Assets.ObservatoryPlates');
const spriteResponses = ABI.responsesForBoardScene(spriteRequests.map(request => ({
  $: 'AssetResponse', id: request.id, bytes: { $: 'Nil' }, ok: false,
})), 'pieces');
assert.ok(spriteResponses.every(response => response.$ === 'PieceAssets.AssetResponse'));
assert.equal(board.load_sprite_pages(list(spriteResponses)).$, 'None');
assert.throws(() => ABI.responsesForBoardScene([{ $: 'Assets.AssetResponse' }], 'plates'),
  /expected AssetResponse/);

// The recursive graph bridge preserves the Base constructors used by Image
// and Maybe. This synthetic nested value is only an adapter regression fixture.
const baseGraph = { ...boot.snapshot.frame, probeBase: { $: 'Some', value: {
  $: 'Qua', tl: { $: 'Pix', color: 1 }, tr: { $: 'Pix', color: 2 },
  bl: { $: 'Pix', color: 3 }, br: { $: 'Pix', color: 4 },
} } };
const preserved = ABI.frameForBoardScene(baseGraph);
assert.equal(preserved.probeBase.$, 'Some');
assert.equal(preserved.probeBase.value.$, 'Qua');
assert.equal(preserved.probeBase.value.tl.$, 'Pix');
assert.equal(baseGraph.$, boot.snapshot.frame.$, 'input graph is not mutated');
assert.throws(() => ABI.frameForBoardScene({
  ...boot.snapshot.frame, probeBase: { $: 'Some', value: { $: 'Future.Image' } },
}), /unsupported constructor Future.Image/);
assert.throws(() => ABI.frameForBoardScene({
  ...boot.snapshot.frame, probeBase: { $: 'Some', value: { $: 'toString' } },
}), /unsupported constructor toString/);
for (const hostileKey of ['__proto__', 'constructor', 'toString']) {
  const hostileFrame = { ...boot.snapshot.frame };
  Object.defineProperty(hostileFrame, hostileKey, {
    value: { pollutionProbe: true }, enumerable: true,
  });
  assert.throws(() => ABI.frameForBoardScene(hostileFrame), /forbidden field/);
}
assert.equal(({}).pollutionProbe, undefined, 'hostile own keys cannot pollute Object.prototype');
let deepBytes = { $: 'Nil' };
for (let index = 0; index < 10_000; index++)
  deepBytes = { $: 'Con', head: index & 255, tail: deepBytes };
const deepResponse = { $: 'AssetResponse', id: plateRequest[0].id,
  bytes: deepBytes, ok: true };
const deepMapped = ABI.responsesForBoardScene([deepResponse], 'plates')[0];
assert.equal(deepMapped.$, 'Assets.AssetResponse');
assert.equal(deepMapped.bytes, deepBytes, 'large Base.List bytes are passed through by identity');
assert.equal(deepMapped.id, deepResponse.id, 'asset identifier is passed through by identity');
assert.throws(() => ABI.responsesForBoardScene([{
  ...deepResponse, extra: { $: 'Future.Graph' },
}], 'plates'), /unsupported field extra/);
assert.throws(() => ABI.frameForBoardScene({
  ...boot.snapshot.frame,
  position: { ...boot.snapshot.frame.position, board: { $: 'Con', head: 1,
    tail: { $: 'Future.Board', value: 0 } } },
}), /unsupported constructor Future.Board/);
assert.throws(() => ABI.chromeForMenuAA(boot.chromeData,
  { ...boot.plan, extra: { $: 'Future.ChromePlan' } }), /unsupported constructor Future.ChromePlan/);
assert.throws(() => ABI.positionForBotAdapter({ ...botJob.position,
  board: { $: 'Con', head: 1, tail: { $: 'Future.Position' } },
}), /unsupported constructor Future.Position/);

console.log(JSON.stringify({
  schema: 'rift-bend-2028-candidate-browser-abi/1',
  candidateTag: 'bc178404f4778704fa5584a73fcdf72bcdf9f32c + 006',
  compilerBendSha256: sha(fs.readFileSync(path.join(candidate, 'bend.ts'))),
  compilerCompSha256: sha(fs.readFileSync(path.join(candidate, 'comp.ts'))),
  emitted,
  constructorProbes,
  controllerConstructorTags: controllerTags,
  controllerInputVariants: hostInputs.length,
  queuePointerMoveAndBarrierCases: hostInputs.filter(input => input.$ !== 'PointerMove').length,
  boardPlateRequestTag: plateRequest[0].$,
  boardSpriteRequestTag: spriteRequests[0].$,
  observed: {
    activateBareMenu: bareActivate.presentation.menu,
    activateExactMenu: exactActivate.presentation.menu,
    boardFrame: boardFrame.$,
    menuData: chrome.data.$,
    menuPlan: chrome.plan.$,
    botPosition: botPosition.$,
    plates: plates.$,
    spritePages: 'None',
  },
  passed: true,
}));
