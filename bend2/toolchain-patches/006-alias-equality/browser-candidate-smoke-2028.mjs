import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const candidateRoot = path.join(root, '.artifacts/bend2/toolchain-patches/browser-2028-candidate');
const dist = path.resolve(process.env.BEND_CANDIDATE_DIST || '');
if (!process.env.BEND_CANDIDATE_DIST || !dist.startsWith(`${candidateRoot}${path.sep}`) ||
    !fs.lstatSync(dist).isDirectory() || fs.lstatSync(dist).isSymbolicLink() ||
    fs.lstatSync(path.dirname(dist)).isSymbolicLink() ||
    !fs.realpathSync(dist).startsWith(`${fs.realpathSync(candidateRoot)}${path.sep}`)) {
  throw new Error('BEND_CANDIDATE_DIST must be a generated directory inside the isolated candidate workspace.');
}
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const runnerSha256 = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
const buildBytes = fs.readFileSync(path.join(dist, 'build.json'));
const build = JSON.parse(buildBytes);
const buildReceiptPath = path.join(path.dirname(dist), 'receipt.json');
const buildReceiptBytes = fs.readFileSync(buildReceiptPath);
const buildReceipt = JSON.parse(buildReceiptBytes);
if (build.candidate !== true || typeof build.sourceDirty !== 'boolean' || build.draft !== true ||
    !build.sourceRevision || !build.compiler?.baseCommit) {
  throw new Error('Candidate build must identify its source and compiler and cannot masquerade as a release.');
}
assert.equal(buildReceipt.status, 'success');
assert.equal(path.resolve(buildReceipt.dist), dist);
assert.equal(buildReceipt.buildVersion, build.version);
assert.equal(buildReceipt.sourceRevision, build.sourceRevision);
assert.equal(buildReceipt.candidateCompiler.baseCommit, build.compiler.baseCommit);
assert.deepEqual(buildReceipt.buildFiles, build.files);
const entries = Object.entries(build.files || {});
assert.ok(entries.length > 0, 'Candidate build has no manifest-bound static files');
function candidateFile(name) {
  if (typeof name !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(name) ||
      name.split('/').some(part => !part || part === '.' || part === '..'))
    throw new Error(`Unsafe candidate manifest path: ${name}`);
  const file = path.resolve(dist, ...name.split('/'));
  if (!file.startsWith(`${dist}${path.sep}`) ||
      !fs.realpathSync(file).startsWith(`${fs.realpathSync(dist)}${path.sep}`) ||
      !fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink())
    throw new Error(`Candidate file escapes dist or is not a plain file: ${name}`);
  return file;
}
function verifyManifest() {
  for (const [name, expected] of entries) {
    assert.match(expected, /^[0-9a-f]{64}$/, `Invalid candidate digest: ${name}`);
    assert.equal(sha(fs.readFileSync(candidateFile(name))), expected,
      `Candidate file differs from build manifest: ${name}`);
  }
  assert.equal(sha(fs.readFileSync(path.join(dist, 'build.json'))), sha(buildBytes),
    'Candidate build manifest changed during smoke');
  assert.equal(sha(fs.readFileSync(buildReceiptPath)), sha(buildReceiptBytes),
    'Candidate build receipt changed during smoke');
  assert.equal(sha(fs.readFileSync(fileURLToPath(import.meta.url))), runnerSha256,
    'Candidate smoke runner changed during smoke');
}
verifyManifest();
const allowedFiles = new Set(['build.json', ...entries.map(([name]) => name)]);
const run = `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${crypto.randomUUID().slice(0, 8)}`;
const out = path.join(path.dirname(dist), 'smoke', run);
await fsp.mkdir(out, { recursive: true });
const receipt = { schema: 'rift-bend-browser-2028-candidate-smoke/1', at: new Date().toISOString(),
  buildVersion: build.version, sourceRevision: build.sourceRevision, compiler: build.compiler,
  dist, runnerSha256, buildSha256: sha(buildBytes), buildReceiptSha256: sha(buildReceiptBytes),
  manifestFiles: entries.length, checks: [], errors: [], captures: [], ok: false };
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.rga': 'application/octet-stream' };
const server = http.createServer(async (request, response) => {
  try {
    const target = new URL(request.url || '/', 'http://127.0.0.1');
    const name = decodeURIComponent(target.pathname).replace(/^\//, '') || 'index.html';
    if (!allowedFiles.has(name)) throw new Error('Static path not listed in candidate manifest');
    const file = candidateFile(name);
    const bytes = await fsp.readFile(file);
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    response.end(bytes);
  } catch (error) {
    response.writeHead(404); response.end(String(error));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const url = `http://127.0.0.1:${address.port}/`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__shown = null;
  window.__fault = null;
  window.__refinements = [];
  window.addEventListener('rift-bend-sprite-refined', event =>
    window.__refinements.push(event.detail));
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'fault') window.__fault = event.data.message;
        if (event.data.kind === 'frame' && (event.data.image || event.data.bitmap))
          window.__shown = event.data.presentation;
      });
    }
  };
});
async function ready() {
  await page.waitForFunction(() => window.__fault ||
    (document.querySelector('canvas')?.dataset.ready === 'true' &&
     document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' && window.__shown),
  null, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__fault), null);
}
async function square(file, rank, piece = false) {
  const { view, plan } = await page.evaluate(() => window.__shown);
  const yaw = view.yaw * Math.PI / 180;
  const scale = 45 / (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) * view.zoom / 100;
  const u = file - 3.5, r = 3.5 - rank;
  const x = 256 + scale * (Math.cos(yaw) * u - Math.sin(yaw) * r);
  const y = 274 + scale * Math.sin(view.pitch * Math.PI / 180) *
    (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0);
  const box = await page.locator('canvas').boundingBox();
  const dimensions = await page.locator('canvas').evaluate(canvas => [canvas.width, canvas.height]);
  return { x: box.x + (plan.board.x + x * plan.scale) * box.width / dimensions[0],
    y: box.y + (plan.board.y + y * plan.scale) * box.height / dimensions[1] };
}
async function control(id) {
  const button = page.locator(`[data-control="${id}"]`);
  assert.equal(await button.count(), 1, `Bend control ${id} exists`);
  assert.equal(await button.isDisabled(), false, `Bend control ${id} is enabled`);
  const rect = JSON.parse(await button.getAttribute('data-rect'));
  const box = await page.locator('canvas').boundingBox();
  const size = await page.locator('canvas').evaluate(canvas => [canvas.width, canvas.height]);
  await page.mouse.click(box.x + (rect.x + rect.width / 2) * box.width / size[0],
    box.y + (rect.y + rect.height / 2) * box.height / size[1]);
}
async function capture(name) {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file });
  receipt.captures.push({ file: path.basename(file), sha256: crypto.createHash('sha256').update(await fsp.readFile(file)).digest('hex') });
}
try {
  const publicBuild = await (await page.request.get(`${url}build.json`)).json();
  assert.equal(publicBuild.version, build.version);
  receipt.checks.push('Served isolated candidate build identity');
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready();
  assert.deepEqual(await page.locator('canvas').evaluate(canvas => [canvas.width, canvas.height]), [1024, 640]);
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.spriteRoundTripMs,
    null, { timeout: 60000 });
  await capture('initial');
  receipt.checks.push('Rendered desktop boot and sprite-helper refinement');
  await control(1);
  await page.waitForFunction(() => window.__shown?.menu !== 0, null, { timeout: 15000 });
  await control(28);
  await page.waitForFunction(() => window.__shown?.menu === 0, null, { timeout: 15000 });
  receipt.checks.push('Preferences opens and closes through real browser input');
  const refinementsBeforeMove = await page.evaluate(() => window.__refinements.length);
  const pawn = await square(4, 1, true);
  await page.mouse.click(pawn.x, pawn.y);
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Pawn e2'),
    null, { timeout: 15000 });
  const destination = await square(4, 3);
  await page.mouse.click(destination.x, destination.y);
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Black to move'),
    null, { timeout: 30000 });
  await ready();
  await page.waitForFunction(before => window.__refinements.length > before,
    refinementsBeforeMove, { timeout: 60000 });
  await capture('after-e4');
  receipt.checks.push('Rendered e2-e4 advances to Black to move and refines its sprites');
  assert.deepEqual(receipt.errors, []);
  receipt.ok = true;
} catch (error) {
  receipt.failure = String(error.stack || error);
  try { await capture('FAIL'); } catch (captureError) { receipt.captureError = String(captureError); }
} finally {
  await context.close();
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  try { verifyManifest(); } catch (error) {
    receipt.ok = false;
    receipt.failure = `${receipt.failure || ''}\nPost-run provenance: ${String(error.stack || error)}`.trim();
  }
  receipt.finishedAt = new Date().toISOString();
  await fsp.writeFile(path.join(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
}
console.log(JSON.stringify({ out, ok: receipt.ok, checks: receipt.checks, errors: receipt.errors,
  failure: receipt.failure || null }));
if (!receipt.ok) process.exitCode = 1;
