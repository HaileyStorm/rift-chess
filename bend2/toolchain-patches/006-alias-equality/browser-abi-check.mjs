// Source-bound diagnostic for a candidate-only browser ABI adapter. Never
// changes the pinned compiler, production host, browser package or frozen Law.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyV2 } from '../../tools/freeze-v2.mjs';
import { verifyLibrary } from '../../tools/verify-library.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const here = path.dirname(fileURLToPath(import.meta.url));
const candidate = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2');
const baseline = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const runnerSha256 = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
const semantic = verifyV2(), graphics = verifyLibrary({ check: false });
assert.ok(graphics.sourceFreeze);
const tag = execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(tag, 'bc178404f4778704fa5584a73fcdf72bcdf9f32c');
execFileSync('git', ['-C', baseline, 'diff', '--check']);
const patchSha256 = sha(fs.readFileSync(path.join(here, '006-after-004-2.0.28.patch')));
assert.equal(patchSha256, 'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344');
const compiler = Object.fromEntries(['bend.ts', 'comp.ts', 'main.ts', 'base.bend', 'web_runtime.js']
  .map(name => [name, sha(fs.readFileSync(path.join(candidate, name)))]));
const canonical = name => sha(fs.readFileSync(path.join(candidate, name), 'utf8').replace(/\r\n/g, '\n'));
assert.equal(canonical('bend.ts'), '359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8');
assert.equal(canonical('comp.ts'), '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b');
assert.equal(canonical('main.ts'), '5303e55d5b240d173f78c6c2f0b2e626a276482541a5d80fd1a22e986d1ab430');
assert.equal(canonical('web_runtime.js'), '5def0b7c33be027416c869adbf16a26cc98a0008461b11c2e49453c955ad97d6');
assert.equal(compiler['base.bend'], '722a76eaa91732b3c50299f91769ae6ba97ad80705013209b816f5204536aebb');
assert.equal(compiler['base.bend'], sha(fs.readFileSync(path.join(baseline, 'bend2/base.bend'))));
const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
const pinned = path.join(root, '.artifacts/toolchains/bend');
assert.equal(execFileSync('git', ['-C', pinned, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), pin.bendCommit);
assert.equal(execFileSync('git', ['-C', pinned, 'status', '--porcelain', '--untracked-files=no'],
  { encoding: 'utf8' }).trim(), '');
assert.equal(spawnSync(bun, ['--version'], { encoding: 'utf8' }).stdout.trim(), pin.bunVersion);

function closure(file, found = new Set()) {
  file = fs.realpathSync(file);
  assert.ok(file.startsWith(root + path.sep), `Candidate ABI source escaped project: ${file}`);
  if (found.has(file)) return found;
  found.add(file);
  if (!file.endsWith('.bend')) return found;
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*(?:#.*)?$/gm)) {
    if (match[1] === 'Base') continue;
    assert.ok(match[1].startsWith('./') || match[1].startsWith('../'));
    closure(path.resolve(path.dirname(file), match[1]), found);
  }
  return found;
}
const entries = ['bend2/ApplicationControl.bend', 'bend2/graphics/v2game/BoardScene.bend',
  'bend2/ui/v2/MenuAA.bend', 'bend2/platform/worker/BotAdapter.bend'];
const files = new Set();
for (const entry of entries) closure(path.join(root, entry), files);
for (const source of ['bend2/platform/browser/host.ts', 'bend2/platform/browser/input-queue.ts',
  'bend2/platform/browser/ports.ts', 'bend2/platform/browser/asset-port.ts',
  'bend2/platform/browser/worker-v2.ts', 'bend2/platform/browser/sprite-helper.ts',
  'bend2/TOOLCHAIN.json', 'bend2/toolchain-patches/006-alias-equality/browser-abi-2028.ts',
  'bend2/toolchain-patches/006-alias-equality/browser-abi-2028.test.mjs',
  'bend2/toolchain-patches/006-alias-equality/006-after-004-2.0.28.patch'])
  files.add(path.join(root, source));
const inputs = [...files].sort().map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) }));
const started = Date.now();
const run = spawnSync(bun, [path.join(here, 'browser-abi-2028.test.mjs')], {
  cwd: root, env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9' },
  encoding: 'utf8', timeout: 300000, maxBuffer: 2e6 });
const stdout = (run.stdout || '').trim(), stderr = (run.stderr || '').trim();
let verdict = null;
try { verdict = JSON.parse(stdout); } catch { /* malformed output is a failed gate */ }
const unchanged = verifyV2().sha256 === semantic.sha256 &&
  JSON.stringify(verifyLibrary({ check: false })) === JSON.stringify(graphics) &&
  inputs.every(input => sha(fs.readFileSync(path.join(root, input.path))) === input.sha256) &&
  Object.entries(compiler).every(([name, hash]) => sha(fs.readFileSync(path.join(candidate, name))) === hash) &&
  sha(fs.readFileSync(fileURLToPath(import.meta.url))) === runnerSha256;
const passed = run.status === 0 && !run.error && !stderr && unchanged &&
  verdict?.passed === true && verdict.controllerInputVariants === 11 &&
  verdict.queuePointerMoveAndBarrierCases === 10 &&
  verdict.observed?.activateBareMenu === 0 && verdict.observed?.activateExactMenu === 11 &&
  verdict.observed?.boardFrame === '../Scene.Frame' &&
  verdict.observed?.menuData === 'ChromeData.Presentation' &&
  verdict.observed?.menuPlan === 'ChromePlan.Plan' &&
  verdict.observed?.botPosition === '../../core/Model.Pos' &&
  verdict.observed?.plates === 'Assets.ObservatoryPlates' &&
  verdict.observed?.spritePages === 'None' &&
  Object.keys(verdict.emitted || {}).length === 3;
const receipt = { schema: 'rift-bend-2028-candidate-browser-abi-bound/1',
  at: new Date().toISOString(), sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'],
    { cwd: root, encoding: 'utf8' }).trim(), candidateTag: tag, patchSha256, compiler,
  semanticSha256: semantic.sha256, graphicsSourceFreezeSha256: graphics.sourceFreeze,
  runnerSha256, inputs, elapsedMs: Date.now() - started, status: run.status,
  error: run.error?.message ?? null, stdout, stderr, unchanged, passed,
  scope: 'Candidate-only selected-book constructor and host boundary diagnostic; not a full browser/offline/native or pin acceptance gate' };
const output = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028-browser-abi');
fs.mkdirSync(output, { recursive: true });
const file = path.join(output, `receipt-${Date.now()}-${crypto.randomUUID()}.json`);
fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file, passed, unchanged, status: run.status, error: receipt.error,
  inputVariants: verdict?.controllerInputVariants ?? null,
  selectedBooks: Object.keys(verdict?.emitted || {}).length }));
if (!passed) process.exitCode = 1;
