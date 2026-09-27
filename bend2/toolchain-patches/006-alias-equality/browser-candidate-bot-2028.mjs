// Real Chrome online/cold-offline bot route proof against one nonce-private
// Bend 2.0.28 diagnostic candidate. Never targets hosted or pinned art.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runnerPath = fileURLToPath(import.meta.url);
const candidateRoot = path.resolve(root, '.artifacts/bend2/toolchain-patches/browser-2028-candidate');
const dist = path.resolve(process.env.BEND_CANDIDATE_DIST || '');
if (!process.env.BEND_CANDIDATE_DIST || !dist.startsWith(`${candidateRoot}${path.sep}`) ||
    path.basename(dist) !== 'dist' || !fs.lstatSync(dist).isDirectory() ||
    fs.lstatSync(dist).isSymbolicLink() || fs.lstatSync(path.dirname(dist)).isSymbolicLink() ||
    !fs.realpathSync(dist).startsWith(`${fs.realpathSync(candidateRoot)}${path.sep}`)) {
  throw new Error('BEND_CANDIDATE_DIST must be the real dist directory of a nonce-scoped candidate run.');
}
const runRoot = path.dirname(dist);
if (!/^run-[A-Za-z0-9-]+$/.test(path.basename(runRoot)))
  throw new Error('Candidate dist parent must use the isolated run-* workspace name.');

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileSha = (file) => sha256(fs.readFileSync(file));
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
const runnerSha256 = fileSha(runnerPath);
const buildPath = path.join(dist, 'build.json');
const buildBytes = fs.readFileSync(buildPath);
const build = JSON.parse(buildBytes.toString('utf8'));
const buildReceiptPath = path.join(runRoot, 'receipt.json');
const buildReceiptBytes = fs.readFileSync(buildReceiptPath);
const buildReceipt = JSON.parse(buildReceiptBytes.toString('utf8'));
assert.equal(build.candidate, true);
assert.equal(build.draft, true);
assert.equal(build.sourceDirty, true);
assert.ok(build.sourceRevision);
assert.equal(build.compiler?.version, '2.0.28');
assert.equal(build.compiler?.baseCommit, 'bc178404f4778704fa5584a73fcdf72bcdf9f32c');
assert.equal(build.compiler?.patch006?.sha256, 'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344');
const diagnostic = build.diagnosticBotRoute;
assert.equal(diagnostic?.schema, 'rift-bend-candidate-browser-bot-route-diagnostic/1',
  'Candidate dist lacks the source-bound browser bot-route diagnostic build');
assert.equal(diagnostic.nonce, buildReceipt.nonce);
assert.equal(diagnostic.sourceRevision, build.sourceRevision);
assert.match(diagnostic.inputBuildVersion ?? '', /^[0-9a-f]{20}$/);
assert.equal(diagnostic.worker?.nonce, diagnostic.nonce);
assert.match(diagnostic.worker?.sourceSha256 ?? '', /^[0-9a-f]{64}$/);
assert.match(diagnostic.worker?.abiTransformedSha256 ?? '', /^[0-9a-f]{64}$/);
assert.match(diagnostic.worker?.diagnosticTransformedSha256 ?? '', /^[0-9a-f]{64}$/);
assert.deepEqual(diagnostic.worker?.diagnosticAnchors,
  ['diagnostic-emitter', 'session-ready', 'worker-session-choice-capture', 'worker-choice',
    'worker-choice-applied', 'serial-fallback']);
assert.equal(diagnostic.worker?.sourceSha256,
  buildReceipt.sourceInputs.files['bend2/platform/browser/worker-v2.ts']);
assert.equal(diagnostic.worker?.abiTransformedSha256,
  build.browserBridge?.sources?.find((item) => item.sourcePath === 'bend2/platform/browser/worker-v2.ts')?.transformedSha256);
assert.equal(diagnostic.chromeRunnerSha256, runnerSha256);
assert.equal(diagnostic.buildHelperPath,
  'bend2/toolchain-patches/006-alias-equality/browser-candidate-bot-diagnostic-build-2028.ts');
assert.equal(diagnostic.diagnosticTransformPath,
  'bend2/toolchain-patches/006-alias-equality/browser-candidate-bot-diagnostic-transform-2028.ts');
assert.equal(diagnostic.abiBridgePluginPath,
  'bend2/toolchain-patches/006-alias-equality/browser-abi-transform-2028.ts');
assert.equal(diagnostic.abiAdapterPath,
  'bend2/toolchain-patches/006-alias-equality/browser-abi-2028.ts');
assert.match(diagnostic.worker?.bundlePath ?? '', /^[A-Za-z0-9_-]+\.js$/);
assert.equal(diagnostic.buildHelperSha256, fileSha(path.join(root, ...diagnostic.buildHelperPath.split('/'))));
assert.equal(diagnostic.diagnosticTransformSha256,
  fileSha(path.join(root, ...diagnostic.diagnosticTransformPath.split('/'))));
assert.equal(diagnostic.abiBridgePluginSha256,
  fileSha(path.join(root, ...diagnostic.abiBridgePluginPath.split('/'))));
assert.equal(diagnostic.abiAdapterSha256,
  fileSha(path.join(root, ...diagnostic.abiAdapterPath.split('/'))));
assert.equal(diagnostic.worker?.diagnosticSourceSha256, diagnostic.diagnosticTransformSha256);
assert.equal(build.files?.[diagnostic.worker.bundlePath], diagnostic.worker.bundleSha256);
assert.equal(diagnostic.worker.bundleSha256, fileSha(candidatePathFromBuild(diagnostic.worker.bundlePath)));
const instrumentedWorkerSource = fs.readFileSync(candidatePathFromBuild(diagnostic.worker.bundlePath), 'utf8');
assert.ok(instrumentedWorkerSource.includes(diagnostic.nonce), 'Instrumented worker bundle lacks its diagnostic nonce');
assert.ok(instrumentedWorkerSource.includes('candidate-bot-diagnostic'), 'Instrumented worker bundle lacks its route probe');
assert.equal(build.bot?.status, 'candidate');
assert.equal(build.bot?.available, true);
assert.equal(build.workerLibraries?.bot?.status, 'candidate');
assert.equal(buildReceipt.status, 'success');
assert.equal(path.resolve(buildReceipt.dist), dist);
assert.equal(buildReceipt.buildVersion, build.version);
assert.equal(buildReceipt.sourceRevision, build.sourceRevision);
assert.deepEqual(buildReceipt.buildFiles, build.files);
assert.equal(buildReceipt.bot?.status, 'candidate');
assert.equal(buildReceipt.bot?.sourceBindingSha256, build.bot.sourceBindingSha256);
assert.equal(buildReceipt.bot?.smokeReceiptSha256, build.bot.smokeReceiptSha256);
assert.match(buildReceipt.sourceInputs?.sha256 ?? '', /^[0-9a-f]{64}$/,
  'Candidate build receipt lacks its source-closure binding');
const boardSceneAtBuildSha256 = buildReceipt.sourceInputs.files['bend2/graphics/v2game/BoardScene.bend'];
assert.match(boardSceneAtBuildSha256 ?? '', /^[0-9a-f]{64}$/,
  'Candidate build receipt lacks the BoardScene bytes used at build time');

const entries = Object.entries(build.files || {});
assert.ok(entries.length > 0, 'Candidate build has no manifest-bound files');
function candidateFile(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(name) ||
      name.split('/').some((part) => !part || part === '.' || part === '..'))
    throw new Error(`Unsafe candidate manifest path: ${name}`);
  const file = path.resolve(dist, ...name.split('/'));
  const stat = fs.lstatSync(file);
  if (!file.startsWith(`${dist}${path.sep}`) || !fs.realpathSync(file).startsWith(`${fs.realpathSync(dist)}${path.sep}`) ||
      !stat.isFile() || stat.isSymbolicLink())
    throw new Error(`Candidate manifest file escaped dist or is not plain: ${name}`);
  return file;
}
function candidatePathFromBuild(name) { return candidateFile(name); }
function plainTreeHashes(directory) {
  const result = {};
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const file = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Diagnostic source tree contains a symlink: ${file}`);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) result[path.relative(directory, file).replaceAll('\\', '/')] = fileSha(file);
      else throw new Error(`Diagnostic source tree contains a special entry: ${file}`);
    }
  };
  visit(directory);
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, 'en')));
}
const originDist = path.resolve(root, ...diagnostic.inputDist.split('/'));
  if (!originDist.startsWith(`${candidateRoot}${path.sep}`) || path.basename(originDist) !== 'dist' ||
      !/^run-[A-Za-z0-9-]+$/.test(path.basename(path.dirname(originDist))))
    throw new Error('Diagnostic build origin is not an earlier nonce-private candidate dist.');
const originRunRoot = path.dirname(originDist);
const originBuildPath = path.join(originDist, 'build.json');
const originBuildBytes = fs.readFileSync(originBuildPath);
const originBuild = JSON.parse(originBuildBytes.toString('utf8'));
const originReceiptPath = path.join(originRunRoot, 'receipt.json');
const originReceiptBytes = fs.readFileSync(originReceiptPath);
const originReceipt = JSON.parse(originReceiptBytes.toString('utf8'));
assert.equal(sha256(originBuildBytes), diagnostic.inputBuildSha256);
assert.equal(sha256(originReceiptBytes), diagnostic.inputBuildReceiptSha256);
assert.equal(originBuild.version, diagnostic.inputBuildVersion);
assert.equal(originReceipt.status, 'success');
assert.equal(path.resolve(originReceipt.dist), originDist);
assert.equal(originReceipt.buildVersion, originBuild.version);
assert.equal(originReceipt.sourceRevision, diagnostic.sourceRevision);
assert.deepEqual(originReceipt.buildFiles, originBuild.files);
assert.match(diagnostic.predecessor?.hostPath ?? '', /^host-[A-Za-z0-9_-]+\.js$/);
assert.match(diagnostic.predecessor?.workerPath ?? '', /^worker-v2-[A-Za-z0-9_-]+\.js$/);
assert.equal(originBuild.files[diagnostic.predecessor.hostPath] !== undefined, true);
assert.equal(originBuild.files[diagnostic.predecessor.workerPath] !== undefined, true);
const expectedExcludedPredecessors = new Map();
for (const name of [diagnostic.predecessor.hostPath, diagnostic.predecessor.workerPath]) {
  expectedExcludedPredecessors.set(name, { path: name, sha256: originBuild.files[name],
    reason: 'replaced by the nonce-private diagnostic bundle' });
  for (const candidateName of Object.keys(originBuild.files)) {
    if (candidateName === `${name}.map` || candidateName === `${name.replace(/\.js$/, '')}.map`) {
      expectedExcludedPredecessors.set(candidateName, { path: candidateName,
        sha256: originBuild.files[candidateName], reason: 'source map for replaced predecessor bundle' });
    }
  }
}
const expectedExcludedRecords = [...expectedExcludedPredecessors.values()]
  .sort((a, b) => a.path.localeCompare(b.path, 'en'));
assert.deepEqual(diagnostic.excludedPredecessorBundles, expectedExcludedRecords,
  'Diagnostic build did not account for every predecessor host/worker bundle and source map');
for (const item of expectedExcludedRecords) {
  assert.equal(Object.hasOwn(build.files, item.path), false,
    `Obsolete predecessor bundle remains in the diagnostic manifest: ${item.path}`);
  const obsoletePath = path.resolve(dist, ...item.path.split('/'));
  assert.equal(fs.existsSync(obsoletePath), false,
    `Obsolete predecessor bundle remains in the diagnostic dist: ${item.path}`);
}
const diagnosticServiceWorker = fs.readFileSync(candidatePathFromBuild('sw.js'), 'utf8');
for (const item of expectedExcludedRecords)
  assert.equal(diagnosticServiceWorker.includes(JSON.stringify(`./${item.path}`)), false,
    `Obsolete predecessor bundle remains in the service-worker precache: ${item.path}`);
const originCacheManifestPath = path.join(originRunRoot, 'selected-js/manifest.json');
assert.equal(fileSha(originCacheManifestPath), diagnostic.inputSelectedCacheManifestSha256);
assert.deepEqual(plainTreeHashes(path.join(runRoot, 'selected-js')), diagnostic.selectedCacheHashes,
  'Diagnostic private selected-book cache differs from its immutable receipt');
const diagnosticTransformPath = path.join(root, ...diagnostic.diagnosticTransformPath.split('/'));
const diagnosticBuildHelperPath = path.join(root, ...diagnostic.buildHelperPath.split('/'));
const bridgePluginPath = path.join(root, ...diagnostic.abiBridgePluginPath.split('/'));
const adapterPath = path.join(root, ...diagnostic.abiAdapterPath.split('/'));
const inputEntries = Object.entries(originBuild.files || {});
function verifyOrigin() {
  assert.equal(fileSha(originBuildPath), diagnostic.inputBuildSha256,
    'Original non-diagnostic candidate build.json changed');
  assert.equal(fileSha(originReceiptPath), diagnostic.inputBuildReceiptSha256,
    'Original non-diagnostic candidate receipt changed');
  for (const [name, expected] of inputEntries) {
    if (typeof name !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(name) ||
        name.split('/').some((part) => !part || part === '.' || part === '..'))
      throw new Error(`Unsafe original candidate manifest path: ${name}`);
    const file = path.resolve(originDist, ...name.split('/'));
    if (!file.startsWith(`${originDist}${path.sep}`) || !fs.lstatSync(file).isFile() ||
        fs.lstatSync(file).isSymbolicLink() ||
        !fs.realpathSync(file).startsWith(`${fs.realpathSync(originDist)}${path.sep}`))
      throw new Error(`Original candidate manifest file escaped dist or is not plain: ${name}`);
    assert.equal(fileSha(file), expected,
      `Original non-diagnostic candidate dist changed: ${name}`);
  }
  assert.deepEqual(plainTreeHashes(path.join(runRoot, 'selected-js')), diagnostic.selectedCacheHashes,
    'Diagnostic selected-book cache changed during Chrome smoke');
  assert.equal(fileSha(diagnosticTransformPath), diagnostic.diagnosticTransformSha256,
    'Diagnostic transform source changed during Chrome smoke');
  assert.equal(fileSha(diagnosticBuildHelperPath), diagnostic.buildHelperSha256,
    'Diagnostic build helper changed during Chrome smoke');
  assert.equal(fileSha(bridgePluginPath), diagnostic.abiBridgePluginSha256,
    'Candidate ABI bridge plugin changed during Chrome smoke');
  assert.equal(fileSha(adapterPath), diagnostic.abiAdapterSha256,
    'Candidate ABI adapter changed during Chrome smoke');
}
verifyOrigin();
function verifyManifest() {
  for (const [name, expected] of entries) {
    assert.match(expected, /^[0-9a-f]{64}$/, `Invalid candidate file digest: ${name}`);
    assert.equal(fileSha(candidateFile(name)), expected, `Candidate dist file changed: ${name}`);
  }
  assert.equal(fileSha(buildPath), sha256(buildBytes), 'Candidate build.json changed during Chrome smoke');
  assert.equal(fileSha(buildReceiptPath), sha256(buildReceiptBytes), 'Candidate build receipt changed during Chrome smoke');
  assert.equal(fileSha(bindingPath), bindingSha256, 'Candidate worker source binding changed during Chrome smoke');
  assert.equal(fileSha(initialBotReceiptPath), initialBotReceiptSha256, 'Prior candidate bot receipt changed during Chrome smoke');
  assert.equal(fileSha(runnerPath), runnerSha256, 'Candidate Chrome runner changed during smoke');
  verifyOrigin();
}
const botManifestPath = path.join(dist, 'worker-libs/bot/manifest.json');
const botManifest = JSON.parse(fs.readFileSync(botManifestPath, 'utf8'));
assert.equal(botManifest.backend, 'bend-web-workers-2');
assert.equal(botManifest.mode, 'required-only');
assert.equal(botManifest.policy, 'strict');
assert.deepEqual(Object.keys(botManifest.exports).sort(), ['choose']);
assert.equal(botManifest.program, build.bot.program);
const workerArtifacts = Object.values(botManifest.artifacts).sort();
assert.deepEqual(workerArtifacts, build.bot.files);
const workerHashes = Object.fromEntries(workerArtifacts.map((name) => {
  const key = `worker-libs/bot/${name}`;
  assert.ok(Object.hasOwn(build.files, key), `Bot artifact absent from candidate file manifest: ${key}`);
  return [name, build.files[key]];
}));
const bindingPath = path.join(runRoot, 'bot-library-raw/source-binding.json');
const bindingBytes = fs.readFileSync(bindingPath);
const binding = JSON.parse(bindingBytes.toString('utf8'));
assert.equal(sha256(bindingBytes), build.bot.sourceBindingSha256);
assert.equal(binding.schema, 'rift-bend-worker-source-binding/1');
assert.equal(binding.library, 'bot');
assert.equal(binding.sourceRoot, 'bend2/platform/worker/BotAdapter.bend');
assert.equal(binding.compiler.baseCommit, build.compiler.baseCommit);
assert.equal(binding.compiler.sourceTreeSha256, build.compiler.workerContractSourceTreeSha256);
assert.deepEqual(binding.artifacts, workerHashes);
const initialBotReceiptPath = path.resolve(root, ...buildReceipt.bot.smokeReceipt.split('/'));
const initialBotReceiptBytes = fs.readFileSync(initialBotReceiptPath);
assert.equal(sha256(initialBotReceiptBytes), build.bot.smokeReceiptSha256);
assert.equal(JSON.parse(initialBotReceiptBytes.toString('utf8')).status, 'success');
const bindingSha256 = sha256(bindingBytes);
const initialBotReceiptSha256 = sha256(initialBotReceiptBytes);
verifyManifest();

const allowedFiles = new Set(['build.json', ...entries.map(([name]) => name)]);
const nonce = crypto.randomUUID();
const smokeDirectory = path.join(runRoot, 'chrome-bot-online-offline');
await fsp.mkdir(smokeDirectory, { recursive: true });
const receiptPath = path.join(smokeDirectory, `${Date.now()}-${nonce}.json`);
const receipt = {
  schema: 'rift-bend-browser-2028-candidate-bot-chrome/2', nonce,
  at: new Date().toISOString(), status: 'running', dist, version: build.version,
  sourceRevision: build.sourceRevision, compiler: build.compiler,
  builtAt: build.builtAt, sourceInputsSha256: buildReceipt.sourceInputs.sha256,
  boardSceneAtBuildSha256,
  runnerSha256, buildSha256: sha256(buildBytes), buildReceiptSha256: sha256(buildReceiptBytes),
  diagnosticBotRoute: diagnostic,
  workerBindingSha256: sha256(bindingBytes), workerFiles: workerHashes,
  priorNodeSmokeReceiptSha256: sha256(initialBotReceiptBytes),
  checks: [], pageErrors: [], onlineModules: [], offlineModules: [], workerBundleResponses: [],
  botRouteProofs: { online: null, offline: null },
  onlineActions: null, offlineActions: null,
};

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.rga': 'application/octet-stream',
  '.txt': 'text/plain; charset=utf-8',
};
const modules = [];
const errors = receipt.pageErrors;
const workerBundleResponsePromises = [];
let server, browser, context, page;
let offline = false;

function assertBotModuleResponses(records, fromServiceWorker = undefined) {
  const paths = new Set(records.map((item) => item.path));
  const required = workerArtifacts.filter((name) => name.endsWith('.mjs'))
    .map((name) => `/worker-libs/bot/${name}`);
  for (const requiredPath of required)
    assert.ok(paths.has(requiredPath), `Bot module was not requested: ${requiredPath}`);
  for (const response of records) {
    assert.equal(response.status, 200, `${response.path} response status`);
    assert.match(response.type, /javascript/i, `${response.path} module MIME`);
    if (fromServiceWorker !== undefined)
      assert.equal(response.fromServiceWorker, fromServiceWorker,
        `${response.path} ${fromServiceWorker ? 'came from' : 'did not come from'} the service worker`);
  }
}

async function ready() {
  await page.waitForFunction(() => window.__fault ||
    (window.__shown && document.querySelector('canvas')?.dataset.ready === 'true' &&
      document.querySelector('canvas')?.getAttribute('aria-busy') === 'false'),
  null, { timeout: 90000 });
  const fault = await page.evaluate(() => window.__fault);
  if (fault) throw new Error(`Bend worker fault: ${fault}`);
}

async function afterInput(beforeReply) {
  await page.waitForFunction((before) => window.__replyId > before || window.__fault,
    beforeReply, { timeout: 60000 });
  await ready();
}

async function logicalClick(x, y) {
  const before = await page.evaluate(() => window.__replyId || 0);
  const point = await page.locator('canvas').evaluate((canvas, logical) => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + logical.x * rect.width / canvas.width,
      y: rect.top + logical.y * rect.height / canvas.height };
  }, { x, y });
  await page.mouse.click(point.x, point.y);
  await afterInput(before);
}

async function control(id) {
  const button = page.locator(`[data-control="${id}"]`);
  assert.equal(await button.count(), 1, `Bend control ${id} exists`);
  assert.equal(await button.isDisabled(), false, `Bend control ${id} is enabled`);
  const rect = JSON.parse(await button.getAttribute('data-rect'));
  const box = await page.locator('canvas').boundingBox();
  const size = await page.locator('canvas').evaluate((canvas) => [canvas.width, canvas.height]);
  const before = await page.evaluate(() => window.__replyId || 0);
  await page.mouse.click(box.x + (rect.x + rect.width / 2) * box.width / size[0],
    box.y + (rect.y + rect.height / 2) * box.height / size[1]);
  await afterInput(before);
}

async function square(file, rank, piece = false) {
  const point = await page.evaluate(({ file, rank, piece }) => {
    const shown = window.__shown;
    const yaw = shown.view.yaw * Math.PI / 180;
    const projection = 45 / (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) * shown.view.zoom / 100;
    const u = file - 3.5, r = 3.5 - rank;
    return {
      x: shown.plan.board.x + (256 + projection * (Math.cos(yaw) * u - Math.sin(yaw) * r)) * shown.plan.scale,
      y: shown.plan.board.y + (274 + projection * Math.sin(shown.view.pitch * Math.PI / 180) *
        (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0)) * shown.plan.scale,
    };
  }, { file, rank, piece });
  await logicalClick(point.x, point.y);
}

async function commandCount(count) {
  await page.waitForFunction((target) => {
    const record = JSON.parse(localStorage.getItem('rift-bend-lab/save-v1') || 'null');
    return record?.commands?.length === target || window.__fault;
  }, count, { timeout: 90000 });
  const fault = await page.evaluate(() => window.__fault);
  if (fault) throw new Error(`Bend worker fault before ${count} commands: ${fault}`);
}

async function botTurn() {
  await control(2); // New Match
  await control(31); // Human White / local Black opponent
  await control(29); // Start
  await commandCount(0);
  await square(4, 1, true); // e2 pawn body
  await square(4, 3); // e4
  await commandCount(1);
  await commandCount(2); // Bend worker chose and applied Black's reply
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1')));
  assert.equal(record.commands.length, 2);
  assert.equal(record.commands[0].$, 'MoveCommand');
  assert.equal(record.commands[1].$, 'MoveCommand');
  return record.commands.map((command) => command.action);
}

function assertWorkerRouteProof(phase, diagnostics, actions) {
  const rows = diagnostics.filter((item) => item.phase === phase);
  assert.ok(rows.length > 0, `${phase}: browser worker emitted no route diagnostics`);
  for (const item of rows) assert.equal(item.nonce, diagnostic.nonce,
    `${phase}: worker diagnostic nonce does not match the source-bound build`);
  const readyRows = rows.filter((item) => item.op === 'session-ready');
  const choices = rows.filter((item) => item.op === 'choose');
  const applied = rows.filter((item) => item.op === 'applied');
  const fallback = rows.filter((item) => item.op === 'fallback');
  assert.equal(readyRows.length, 1, `${phase}: expected one successfully warmed browser bot session`);
  assert.equal(choices.length, 1, `${phase}: expected one completed worker choose call`);
  assert.equal(applied.length, 1, `${phase}: expected one applied worker choice`);
  assert.equal(fallback.length, 0, `${phase}: serial bot fallback was used`);
  const readyIndex = rows.indexOf(readyRows[0]);
  const choiceIndex = rows.indexOf(choices[0]);
  const appliedIndex = rows.indexOf(applied[0]);
  assert.ok(readyIndex < choiceIndex && choiceIndex < appliedIndex,
    `${phase}: session, choose, and apply diagnostics arrived out of order`);
  const choice = choices[0];
  const workerStats = choice.workerStats;
  assert.ok(Number.isSafeInteger(workerStats?.completed) && workerStats.completed > 0,
    `${phase}: browser bot call recorded no completed worker work`);
  assert.ok(Number.isSafeInteger(workerStats?.remoteJobs) && workerStats.remoteJobs > 0,
    `${phase}: browser bot call recorded no remote worker jobs`);
  assert.ok(Number.isSafeInteger(workerStats?.requiredWitnesses) && workerStats.requiredWitnesses > 0,
    `${phase}: browser bot call recorded no required worker witnesses`);
  assert.ok(Number.isSafeInteger(choice.revision), `${phase}: worker choice has no job revision`);
  assert.ok(Number.isSafeInteger(choice.id), `${phase}: worker choice has no numeric move ID`);
  assert.ok(Array.isArray(choice.legalIds) && choice.legalIds.includes(choice.id),
    `${phase}: browser worker choice is not in that exact job's legal IDs`);
  const appliedChoice = applied[0];
  assert.equal(appliedChoice.revision, choice.revision, `${phase}: applied revision differs from worker job`);
  assert.equal(appliedChoice.id, choice.id, `${phase}: applied move ID differs from worker result`);
  assert.equal(appliedChoice.baseRevision, choice.revision,
    `${phase}: application did not use the worker job's base revision`);
  assert.equal(appliedChoice.via, 'bot_apply_at', `${phase}: worker result did not use bot_apply_at`);
  assert.equal(appliedChoice.nextRevision, appliedChoice.baseRevision + 1,
    `${phase}: worker choice was not accepted as one revision transition`);
  assert.equal(actions[1], choice.id,
    `${phase}: persisted bot command does not equal the chosen worker move ID`);
  return {
    schema: 'rift-bend-candidate-browser-worker-route-proof/1', phase,
    diagnosticNonce: diagnostic.nonce,
    revision: choice.revision, choiceId: choice.id, legalIds: choice.legalIds,
    workerStats: { completed: workerStats.completed, remoteJobs: workerStats.remoteJobs,
      requiredWitnesses: workerStats.requiredWitnesses },
    applied: { via: appliedChoice.via, id: appliedChoice.id,
      baseRevision: appliedChoice.baseRevision, nextRevision: appliedChoice.nextRevision,
      persistedAction: actions[1] },
    eventOrder: rows.map((item) => item.op),
  };
}

function assertWorkerBundleResponses(records) {
  for (const phase of ['online', 'offline']) {
    const phaseRecords = records.filter((item) => item.phase === phase);
    assert.equal(phaseRecords.length, 1, `${phase}: expected exactly one request for the instrumented browser worker bundle`);
    const response = phaseRecords[0];
    assert.equal(response.status, 200, `${phase}: instrumented browser worker bundle status`);
    assert.match(response.type, /javascript/i, `${phase}: instrumented browser worker bundle MIME`);
    assert.equal(response.sha256, diagnostic.worker.bundleSha256,
      `${phase}: browser loaded different bytes than the source-bound instrumented worker bundle`);
    if (phase === 'offline') assert.equal(response.fromServiceWorker, true,
      'offline: instrumented browser worker bundle did not come from the service worker');
  }
}

try {
  server = http.createServer(async (request, response) => {
    try {
      const target = new URL(request.url || '/', 'http://127.0.0.1');
      const name = decodeURIComponent(target.pathname).replace(/^\/+/, '') || 'index.html';
      if (!/^[A-Za-z0-9._/-]+$/.test(name) || name.split('/').some((part) => !part || part === '.' || part === '..') ||
          !allowedFiles.has(name)) throw new Error('Static path is not in the candidate manifest');
      const file = candidateFile(name);
      const bytes = await fsp.readFile(file);
      response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      response.end(bytes);
    } catch (error) {
      response.writeHead(404);
      response.end(String(error));
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}/`;
  receipt.url = url;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => {
    const responsePath = new URL(response.url()).pathname;
    if (responsePath.startsWith('/worker-libs/bot/')) {
      modules.push({ phase: offline ? 'offline' : 'online',
        path: responsePath, status: response.status(),
        type: response.headers()['content-type'] || '', fromServiceWorker: response.fromServiceWorker() });
    }
    if (responsePath === `/${diagnostic.worker.bundlePath}`) {
      const phase = offline ? 'offline' : 'online';
      workerBundleResponsePromises.push((async () => ({
        phase, path: responsePath, status: response.status(),
        type: response.headers()['content-type'] || '', fromServiceWorker: response.fromServiceWorker(),
        sha256: sha256(await response.body()),
      }))().catch((error) => ({ phase, path: responsePath, status: response.status(),
        type: response.headers()['content-type'] || '', fromServiceWorker: response.fromServiceWorker(),
        bodyFailure: String(error) })));
    }
  });
  await page.addInitScript((expectedNonce) => {
    const OriginalWorker = window.Worker;
    window.__shown = null;
    window.__fault = null;
    window.__replyId = 0;
    window.__candidateBotPhase = 'online';
    window.__candidateBotDiagnostics = [];
    window.Worker = class extends OriginalWorker {
      constructor(...args) {
        super(...args);
        this.addEventListener('message', (event) => {
          if (event.data?.kind === 'candidate-bot-diagnostic') {
            window.__candidateBotDiagnostics.push({ ...event.data,
              phase: window.__candidateBotPhase, receivedAt: performance.now() });
            event.stopImmediatePropagation();
            return;
          }
          if (event.data.kind === 'fault') window.__fault = event.data.message;
          if (event.data.kind === 'frame') {
            window.__replyId = Math.max(window.__replyId, event.data.id || 0);
            if (event.data.image || event.data.bitmap) window.__shown = event.data.presentation;
          }
        });
      }
    };
  }, diagnostic.nonce);

  const servedBuild = await (await page.request.get(`${url}build.json`)).json();
  assert.equal(servedBuild.version, build.version);
  receipt.checks.push('served source-bound candidate build identity');
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready();
  assert.deepEqual(await page.locator('canvas').evaluate((canvas) => [canvas.width, canvas.height]), [1024, 640]);
  receipt.checks.push('real Chrome candidate boot');
  receipt.onlineActions = await botTurn();
  receipt.botRouteProofs.online = assertWorkerRouteProof('online',
    await page.evaluate(() => window.__candidateBotDiagnostics), receipt.onlineActions);
  assertBotModuleResponses(modules.filter((item) => item.phase === 'online'));
  receipt.onlineModules = modules.filter((item) => item.phase === 'online');
  receipt.checks.push('online human move plus candidate worker bot reply');

  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30000 });
  offline = true;
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await page.evaluate(() => { window.__candidateBotPhase = 'offline'; });
  receipt.checks.push('service-worker-controlled offline reload');
  receipt.offlineActions = await botTurn();
  receipt.botRouteProofs.offline = assertWorkerRouteProof('offline',
    await page.evaluate(() => window.__candidateBotDiagnostics), receipt.offlineActions);
  assert.deepEqual(receipt.offlineActions, receipt.onlineActions,
    'Cold offline candidate bot turn differs from the online turn');
  const offlineModules = modules.filter((item) => item.phase === 'offline');
  assertBotModuleResponses(offlineModules, true);
  receipt.offlineModules = offlineModules;
  receipt.workerBundleResponses = await Promise.all(workerBundleResponsePromises);
  assertWorkerBundleResponses(receipt.workerBundleResponses);
  receipt.checks.push('instrumented browser worker bundle hash served online and offline');
  receipt.checks.push('cold offline human move plus candidate worker bot reply');
  assert.deepEqual(errors, []);
  receipt.status = 'success';
} catch (error) {
  receipt.status = 'failed';
  receipt.failure = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
  receipt.pageErrors = errors;
  receipt.workerResponses = modules;
  receipt.diagnostic = await page?.evaluate(() => ({ fault: window.__fault,
    aria: document.querySelector('canvas')?.getAttribute('aria-label'),
    record: localStorage.getItem('rift-bend-lab/save-v1'), menu: window.__shown?.menu,
    replyId: window.__replyId, candidateBotDiagnostics: window.__candidateBotDiagnostics })).catch(() => null);
} finally {
  try { await context?.close(); } catch { /* retain test verdict */ }
  try { await browser?.close(); } catch { /* retain test verdict */ }
  if (server) await new Promise((resolve) => server.close(resolve));
  try { verifyManifest(); } catch (error) {
    receipt.status = 'failed';
    receipt.postRunFailure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
  receipt.finishedAt = new Date().toISOString();
  receipt.workerResponses ??= modules;
  receipt.pageErrors = errors;
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
}
console.log(JSON.stringify({ receipt: receiptPath, status: receipt.status,
  onlineActions: receipt.onlineActions, offlineActions: receipt.offlineActions,
  modules: modules.length, routeProofs: receipt.botRouteProofs, errors,
  failure: receipt.failure ?? receipt.postRunFailure ?? null }));
if (receipt.status !== 'success') process.exitCode = 1;
