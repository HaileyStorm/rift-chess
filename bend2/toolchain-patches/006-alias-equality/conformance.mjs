// Finite reference differential on the disposable 2.0.28 alias trial.
// This does not alter the pinned project wrapper, compiler or frozen inputs.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyV2 } from '../../tools/freeze-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const here = path.dirname(fileURLToPath(import.meta.url));
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const semantic = verifyV2();
const candidate = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2');
const baseline = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const fixtureRun = spawnSync(process.execPath, [path.join(here, 'test.mjs')], {
  cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 1048576 });
assert.equal(fixtureRun.status, 0, fixtureRun.stderr || fixtureRun.error?.message);
const fixtureReceiptFile = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028-fixtures/receipt.json');
const fixtureReceipt = JSON.parse(fs.readFileSync(fixtureReceiptFile, 'utf8'));
assert.equal(fixtureReceipt.passed, true);
const fixtureReceiptSha256 = sha(fs.readFileSync(fixtureReceiptFile));
const patchSha256 = sha(fs.readFileSync(path.join(here, '006-after-004-2.0.28.patch')));
assert.equal(fixtureReceipt.patchSha256, patchSha256);

function resolveLocal(parent, spec) {
  const base = path.resolve(path.dirname(parent), spec);
  const options = [base, `${base}.ts`, `${base}.js`, `${base}.mjs`, `${base}.json`,
    path.join(base, 'index.ts')];
  const file = options.find(option => fs.statSync(option, { throwIfNoEntry: false })?.isFile());
  assert.ok(file, `Missing local import ${spec} from ${parent}`);
  return file;
}
function closure(file, found = new Set()) {
  file = fs.realpathSync(file);
  assert.ok(file.startsWith(root + path.sep), `Source escaped workspace: ${file}`);
  if (found.has(file)) return found;
  found.add(file);
  // Compiler sources contain generated JavaScript template strings with
  // apparent `from './${...}'` text, not runtime imports. Bind their exact
  // bytes separately rather than parsing the emitted source as module syntax.
  if (file.startsWith(candidate + path.sep)) return found;
  const source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.bend')) {
    for (const match of source.matchAll(/^\s*import\s+(\.\.?(?:\/[^\s]+)+)\s+as\s+\w+/gm))
      closure(resolveLocal(file, match[1]), found);
  } else if (/\.(?:ts|mjs|js)$/.test(file)) {
    for (const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))
      closure(resolveLocal(file, match[1]), found);
  }
  return found;
}
const loadedFiles = closure(path.join(root, 'bend2/core/v2/conformance.ts'));
for (const file of [path.join(here, 'interop-2028.ts'), path.join(here, 'loader-2028.ts'),
  path.join(here, 'test.mjs'), path.join(here, '006-after-004-2.0.28.patch'),
  path.join(root, 'fixtures/conformance.json'),
  path.join(candidate, 'base.bend'), ...fs.readdirSync(path.join(candidate, 'effs'))
    .filter(name => name.endsWith('.js')).map(name => path.join(candidate, 'effs', name))])
  closure(file, loadedFiles);
const sources = [...loadedFiles].sort().map(file => ({
  path: path.relative(root, file).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(file)) }));
const compiler = Object.fromEntries(['bend.ts', 'comp.ts', 'main.ts', 'web_runtime.js', 'base.bend']
  .map(name => [name, sha(fs.readFileSync(path.join(candidate, name)))]));
assert.equal(execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' }).trim(), fixtureReceipt.baselineTag);
const loader = path.join(here, 'loader-2028.ts');
const runnerSha256 = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
const loaderSha256 = sha(fs.readFileSync(loader));
const adapterSha256 = sha(fs.readFileSync(path.join(here, 'interop-2028.ts')));
assert.equal(spawnSync(bun, ['--version'], { encoding: 'utf8' }).stdout.trim(), '1.4.2');
const started = Date.now();
const run = spawnSync(bun, ['--preload', loader, path.join(root, 'bend2/core/v2/conformance.ts')], {
  cwd: root, encoding: 'utf8', timeout: 240000, maxBuffer: 2e6,
  env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9' },
});
const stdout = (run.stdout || '').trim(), stderr = (run.stderr || '').trim();
let verdict = null;
try { verdict = JSON.parse(stdout); } catch {}
const unchanged = sources.every(source => sha(fs.readFileSync(path.join(root, source.path))) === source.sha256)
  && Object.entries(compiler).every(([name, digest]) => sha(fs.readFileSync(path.join(candidate, name))) === digest)
  && sha(fs.readFileSync(fixtureReceiptFile)) === fixtureReceiptSha256
  && verifyV2().sha256 === semantic.sha256
  && sha(fs.readFileSync(loader)) === loaderSha256
  && sha(fs.readFileSync(path.join(here, 'interop-2028.ts'))) === adapterSha256
  && sha(fs.readFileSync(fileURLToPath(import.meta.url))) === runnerSha256;
const passed = run.status === 0 && !run.error && !stderr && unchanged &&
  verdict?.ok === true && verdict.fixtures === 14 && verdict.acceptedSuccessors === 223;
const receipt = { schema: 'rift-bend-2028-candidate-finite-conformance/1',
  at: new Date().toISOString(), sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'],
    { cwd: root, encoding: 'utf8' }).trim(), sources, semanticSha256: semantic.sha256,
  compiler, candidateTag: fixtureReceipt.baselineTag, patchSha256,
  fixtureReceiptSha256, loaderSha256, runnerSha256,
  adapterSha256,
  compiler: 'disposable 2.0.28 001+002+005+004+006 alias trial, bound by loader-2028.ts',
  elapsedMs: Date.now() - started, status: run.status, error: run.error?.message ?? null,
  stdout, stderr, unchanged, passed,
  scope: '14-position/223-successor reference differential via compiled Bend JS; not proof, browser, native or pin acceptance' };
const output = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028-conformance');
fs.mkdirSync(output, { recursive: true });
const file = path.join(output, 'receipt.json');
fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ file, passed, elapsedMs: receipt.elapsedMs,
  status: run.status, error: receipt.error, verdict, stderr: stderr.slice(0, 600) }));
if (!passed) process.exitCode = 1;
