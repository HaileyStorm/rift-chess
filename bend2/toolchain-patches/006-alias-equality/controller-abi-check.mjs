// Candidate-only browser host input ABI probe. This checks a real View menu
// transition, not a complete application build or browser acceptance.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyV2 } from '../../tools/freeze-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const here = path.dirname(fileURLToPath(import.meta.url));
const candidate = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2');
const baseline = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const semantic = verifyV2();
const runnerSha256 = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
assert.equal(execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' }).trim(), 'bc178404f4778704fa5584a73fcdf72bcdf9f32c');
const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
const pinned = path.join(root, '.artifacts/toolchains/bend');
assert.equal(execFileSync('git', ['-C', pinned, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' }).trim(), pin.bendCommit);
assert.equal(execFileSync('git', ['-C', pinned, 'status', '--porcelain', '--untracked-files=no'],
  { encoding: 'utf8' }).trim(), '');
const patchSha256 = sha(fs.readFileSync(path.join(here, '006-after-004-2.0.28.patch')));
assert.equal(patchSha256, 'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344');
const compiler = Object.fromEntries(['bend.ts', 'comp.ts', 'main.ts', 'base.bend', 'web_runtime.js']
  .map(name => [name, sha(fs.readFileSync(path.join(candidate, name)))]));
const canonical = name => sha(fs.readFileSync(path.join(candidate, name), 'utf8').replace(/\r\n/g, '\n'));
assert.equal(canonical('bend.ts'), '359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8');
assert.equal(canonical('comp.ts'), '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b');
assert.equal(canonical('main.ts'), '5303e55d5b240d173f78c6c2f0b2e626a276482541a5d80fd1a22e986d1ab430');
assert.equal(compiler['base.bend'], '722a76eaa91732b3c50299f91769ae6ba97ad80705013209b816f5204536aebb');
assert.equal(compiler['base.bend'], sha(fs.readFileSync(path.join(baseline, 'bend2/base.bend'))));
assert.equal(spawnSync(bun, ['--version'], { encoding: 'utf8' }).stdout.trim(), pin.bunVersion);
function closure(file, found = new Set()) {
  file = fs.realpathSync(file);
  assert.ok(file.startsWith(root + path.sep), `Controller input escaped project: ${file}`);
  if (found.has(file)) return found;
  found.add(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*(?:#.*)?$/gm)) {
    if (match[1] === 'Base') continue;
    assert.ok(match[1].startsWith('./') || match[1].startsWith('../'));
    closure(path.resolve(path.dirname(file), match[1]), found);
  }
  return found;
}
const sources = [...closure(path.join(root, 'bend2/ApplicationControl.bend'))];
for (const name of ['controller-tag-probe.ts', 'controller-symbols-2028.ts',
  'loader-2028.ts', '006-after-004-2.0.28.patch']) sources.push(path.join(here, name));
const inputs = sources.sort().map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) }));
const env = { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9' };
function run(executable, args, extra = {}, timeout = 300000) {
  const start = Date.now();
  const result = spawnSync(executable, args, { cwd: root, env: { ...env, ...extra },
    encoding: 'utf8', timeout, maxBuffer: 2e6 });
  return { status: result.status, error: result.error?.message ?? null,
    stdout: (result.stdout || '').trim(), stderr: (result.stderr || '').trim(),
    elapsedMs: Date.now() - start };
}
const probe = path.join(here, 'controller-tag-probe.ts');
const preload = ['--preload', path.join(here, 'loader-2028.ts'), probe];
const pinnedResult = run(process.execPath, ['bend2/tools/bend.mjs', '--run', probe]);
const bare = run(bun, preload);
const namespaced = run(bun, preload, { BEND_DIAGNOSTIC_INPUT_PREFIX: 'ui/Types.' });
const symbols = run(bun, [path.join(here, 'controller-symbols-2028.ts')]);
function parsed(record) {
  if (record.status !== 0 || record.error || record.stderr) return null;
  try { return JSON.parse(record.stdout); } catch { return null; }
}
const pinnedJson = parsed(pinnedResult), bareJson = parsed(bare);
const namespacedJson = parsed(namespaced), symbolsJson = parsed(symbols);
const observed = pinnedJson?.before === 0 && pinnedJson.after === 11 &&
  pinnedJson.eventTag === 'Activate' && bareJson?.before === 0 && bareJson.after === 0 &&
  bareJson.eventTag === 'Activate' && namespacedJson?.before === 0 &&
  namespacedJson.after === 11 && namespacedJson.eventTag === 'ui/Types.Activate' &&
  JSON.stringify(symbolsJson?.activateKeys) === JSON.stringify(['ui/Types.Activate']) &&
  symbolsJson.generated.some(line => line.includes('_e_0.$ === "ui/Types.Activate"'));
const unchanged = verifyV2().sha256 === semantic.sha256 &&
  inputs.every(item => sha(fs.readFileSync(path.join(root, item.path))) === item.sha256) &&
  Object.entries(compiler).every(([name, hash]) => sha(fs.readFileSync(path.join(candidate, name))) === hash) &&
  sha(fs.readFileSync(fileURLToPath(import.meta.url))) === runnerSha256;
const passed = unchanged && observed;
const receipt = { schema: 'rift-bend-2028-candidate-controller-abi/1', at: new Date().toISOString(),
  sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  semanticSha256: semantic.sha256, compiler, patchSha256, runnerSha256,
  inputs, pinnedResult, bare, namespaced, symbols, observed, unchanged, passed,
  scope: 'One host-authored Activate event through candidate controller; not all input types, cross-book ABI, browser or pin acceptance' };
const output = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028-controller-abi');
fs.mkdirSync(output, { recursive: true });
const file = path.join(output, `receipt-${Date.now()}-${crypto.randomUUID()}.json`);
fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file, passed, pinned: pinnedJson?.after ?? null,
  bare: bareJson?.after ?? null, namespaced: namespacedJson?.after ?? null,
  key: symbolsJson?.activateKeys?.[0] ?? null,
  statuses: [pinnedResult.status, bare.status, namespaced.status, symbols.status] }));
if (!passed) process.exitCode = 1;
