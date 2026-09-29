// Candidate-only 2.0.32 layout-report gate, applied after patch 001.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const pin = path.join(root, '.artifacts/toolchains/bend');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const runtime = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const onePatch = path.join(root, 'bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch');
const twoPatch = path.join(here, '0002-after-001-2.0.32.patch');
const version = '573002f01ec6c52416d44489543f69a9625facf8';
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const git = (dir, ...args) => {
  const p = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', timeout: 30000 });
  assert.equal(p.error, undefined, String(p.error));
  assert.equal(p.status, 0, p.stderr);
  return p.stdout.trim();
};
const run = (binary, args, cwd, env = {}, timeout = 60000) => {
  const p = spawnSync(binary, args, { cwd,
    env: { ...process.env, BEND_NO_TELEMETRY: '1', ...env },
    encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(p.error, undefined, String(p.error));
  return p;
};
const runAsync = (binary, args, cwd, env = {}) => new Promise((resolve, reject) => {
  const child = spawn(binary, args, { cwd,
    env: { ...process.env, BEND_NO_TELEMETRY: '1', ...env },
    stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  const timer = setTimeout(() => child.kill(), 30000);
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', status => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
});
const hash = file => sha(fs.readFileSync(file));
const cli = (tree, args, env = {}, timeout = 60000) => run(runtime,
  [path.join(tree, 'bend2/main.ts'), ...args], path.join(tree, 'bend2'), env, timeout);
const ok = p => {
  assert.equal(p.status, 0, p.stderr);
  return p.stdout;
};
const decl = (report, name) => {
  const found = report.declarations.find(d => d.name === name);
  assert.ok(found, 'missing declaration ' + name);
  return found;
};
const expectSourceHashes = tree => {
  for (const [file, expected] of Object.entries({
    'bend.ts': 'dcae4da6b687c96e3a2bd6c7e98ee00140857ef41cdce68c8bd16c887b9e592f',
    'comp.ts': '0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7',
    'main.ts': 'df8839e6f77d657f67e7f47022ac5c8f2ca90dc4cd7bae9af0982c574267bd9e',
  })) {
    assert.equal(hash(path.join(tree, 'bend2', file)), expected, file + ' drifted');
  }
};

assert.equal(git(scout, 'rev-parse', 'HEAD'), version);
assert.equal(git(derived, 'rev-parse', 'HEAD'), version);
assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(pin, 'status', '--porcelain'), '', 'canonical pin must stay clean');
assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=no'),
  ['M bend2/bend.ts', ' M bend2/comp.ts', ' M bend2/main.ts'].join('\n'));
assert.equal(hash(onePatch), '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db');
assert.equal(hash(twoPatch), '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d');
assert.equal(ok(run(runtime, ['--version'], root)).trim(), '1.4.2');
expectSourceHashes(derived);

const tempRoot = fs.realpathSync(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(tempRoot, 'bend2-layout-2032-'));
const baseline = path.join(scratch, 'baseline-001');
const candidate = path.join(scratch, 'candidate-001-002');
let trapRequests = 0;
const trap = http.createServer((req, res) => {
  trapRequests += 1;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ver: '2.0.32', notice: '' }));
});
await new Promise((resolve, reject) => {
  trap.once('error', reject);
  trap.listen(0, '127.0.0.1', resolve);
});
const trapUrl = `http://127.0.0.1:${trap.address().port}`;
const output = path.join(scratch, 'output');
fs.mkdirSync(output);
const copyCompiler = target => {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(path.join(scout, 'bend2'), path.join(target, 'bend2'), { recursive: true });
};
const applyPatch = (dir, file) => {
  const patchFile = path.resolve(file);
  const checked = run('git', ['apply', '--check', patchFile], dir);
  assert.equal(checked.status, 0, checked.stderr);
  const applied = run('git', ['apply', patchFile], dir);
  assert.equal(applied.status, 0, applied.stderr);
};

try {
  copyCompiler(baseline);
  applyPatch(baseline, onePatch);
  assert.equal(hash(path.join(baseline, 'bend2/comp.ts')),
    'a067bd0fae6111e500f16db33697ed7f1347be7e20c4fb90d9996484489a1038');
  fs.cpSync(baseline, candidate, { recursive: true });
  applyPatch(candidate, twoPatch);
  expectSourceHashes(candidate);
  for (const file of ['bend.ts', 'comp.ts', 'main.ts']) {
    assert.equal(hash(path.join(candidate, 'bend2', file)),
      hash(path.join(derived, 'bend2', file)), file + ' patch output differs from derived source');
  }

  const fixture = path.join(root, 'bend2/toolchain-patches/002-layout/fixture.bend');
  const small = path.join(root, 'bend2/toolchain-patches/002-layout/imports.bend');
  const original = path.join(root, 'bend2/toolchain-patches/002-layout/module.bend');
  const before = [hash(fixture), hash(small), hash(original)];
  ok(cli(baseline, [fixture, '--check-only']));
  ok(cli(derived, [fixture, '--check-only']));

  const reportText = ok(cli(derived, [fixture, '--explain-layout']));
  assert.equal(reportText, ok(cli(derived, [fixture, '--explain-layout'])), 'report is nondeterministic');
  const report = JSON.parse(reportText);
  assert.equal(report.schema, 'bend-layout-v1');
  assert.equal(report.target, 'native-C');
  assert.deepEqual(decl(report, 'Wide').value.kinds, ['w32', 'w32', 'w32', 'w32']);
  assert.equal(decl(report, 'Tree').value.boxed, true);
  assert.deepEqual(decl(report, 'Tree').constructors[1].node.kinds, ['box', 'box']);
  assert.deepEqual(decl(report, 'fork').sites,
    [{ kind: 'parallel-let', calls: ['leaf', 'leaf'], branches: 2,
      resultWords: [1, 1], totalResultWords: 2 }]);
  assert.deepEqual(decl(report, 'main').sites,
    [{ kind: 'bang-call', callee: 'fork', argumentWords: [1], resultWords: 1 }]);
  assert.ok(!reportText.includes(root) && !reportText.includes('\\'), 'report leaked host paths');

  const moved = path.join(output, 'moved');
  fs.mkdirSync(moved);
  fs.copyFileSync(fixture, path.join(moved, 'fixture.bend'));
  const movedReport = ok(cli(derived, [path.join(moved, 'fixture.bend'), '--explain-layout']));
  assert.equal(movedReport, reportText,
    'absolute checkout location changed standalone report bytes');

  const invalid = path.join(root, 'bend2/toolchain-patches/002-layout/invalid.bend');
  const isolatedHome = path.join(output, 'isolated-home');
  const privateLib = path.join(output, 'isolated-lib');
  const isolated = { BEND_LIB: privateLib, USERPROFILE: isolatedHome,
    BEND_HUB: trapUrl, BEND_ORIGIN: trapUrl, BEND_NO_TELEMETRY: '' };
  for (const [tag, source] of [
    ['absolute', 'import /private/absolute/module.bend as M'],
    ['windows-absolute', 'import C:/private/absolute/module.bend as M'],
    ['named', 'import abcdefghijkl@1.0.0.0/file.bend as M'],
    ['hash', 'import 0x0123456789abcdef0123456789abcdef/file.bend as M'],
    ['backslash', 'import folder\\module.bend as M'],
  ]) {
    const input = path.join(output, tag + '.bend');
    fs.writeFileSync(input, source + '\n\ndef main() -> U32:\n  1\n', { flag: 'wx' });
    const rejected = cli(derived, [input, '--explain-layout'], isolated);
    assert.equal(rejected.status, 1, tag + ' import unexpectedly accepted');
    assert.equal(rejected.stdout, '', tag + ' failure printed a report');
    assert.match(rejected.stderr, /--explain-layout accepts local relative imports only/);
    assert.ok(!rejected.stderr.includes(source.split(' ')[1]), tag + ' path leaked in diagnostics');
  }
  const relativeToLib = path.join(output, 'relative-to-lib.bend');
  fs.writeFileSync(relativeToLib,
    'import Base\nimport ./isolated-lib/named/module.bend as M\n\ndef main() -> U32:\n  1\n',
    { flag: 'wx' });
  const deniedRelativeLib = cli(derived, [relativeToLib, '--explain-layout'], isolated);
  assert.equal(deniedRelativeLib.status, 1, 'relative BEND_LIB import unexpectedly accepted');
  assert.equal(deniedRelativeLib.stdout, '', 'relative BEND_LIB failure printed a report');
  assert.match(deniedRelativeLib.stderr, /--explain-layout accepts local files only/);
  assert.ok(!deniedRelativeLib.stderr.includes('isolated-lib/named/module.bend'),
    'relative BEND_LIB path leaked in diagnostics');
  assert.equal(trapRequests, 0, 'relative BEND_LIB import contacted provider trap');
  assert.ok(!fs.existsSync(privateLib), 'relative BEND_LIB import created package cache');
  fs.mkdirSync(privateLib);
  const underLib = path.join(privateLib, 'private-entry.bend');
  fs.copyFileSync(fixture, underLib);
  const rootRejected = cli(derived, [underLib, '--explain-layout'], isolated);
  assert.equal(rootRejected.status, 1, 'BEND_LIB entry unexpectedly accepted');
  assert.equal(rootRejected.stdout, '');
  assert.match(rootRejected.stderr, /--explain-layout accepts local files only/);
  assert.equal(trapRequests, 0, 'layout mode contacted provider or version-check trap');
  assert.ok(!fs.existsSync(path.join(privateLib, 'names'))
    && !fs.existsSync(path.join(isolatedHome, '.bend', 'check.json')),
  'layout mode wrote Bend package or version cache');

  const ordinary = await runAsync(runtime, [path.join(derived, 'bend2/main.ts'), invalid,
    '-o', '--explain-layout'], path.join(derived, 'bend2'), isolated);
  assert.equal(ordinary.status, 1, 'invalid source unexpectedly emitted');
  assert.ok(fs.existsSync(path.join(isolatedHome, '.bend', 'check.json')),
    'output filename spelling incorrectly suppressed normal version check');
  assert.ok(trapRequests > 0, 'ordinary CLI did not retain its version check');

  assert.equal(cli(derived, [fixture, '--explain-layout', '-o', path.join(output, 'blocked.js')]).status, 1);
  assert.ok(!fs.existsSync(path.join(output, 'blocked.js')));
  assert.equal(cli(derived, [invalid, '--explain-layout']).status, 1);
  assert.equal(cli(derived, [fixture, '--check-only', '--explain-layout']).status, 1);
  assert.deepEqual([hash(fixture), hash(small), hash(original)], before, 'source fixtures changed');

  for (const ext of ['.js', '.c']) {
    const a = path.join(output, 'baseline' + ext);
    const b = path.join(output, 'candidate' + ext);
    ok(cli(baseline, [fixture, '-o', a]));
    ok(cli(derived, [fixture, '-o', b]));
    assert.deepEqual(fs.readFileSync(b), fs.readFileSync(a), ext + ' output changed after 002');
    console.log(ext + ' unchanged: ' + hash(a));
  }
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=no'), '');
  assert.equal(git(pin, 'status', '--porcelain'), '');
  console.log('2.0.32+001 -> +002 report, import fence, CLI isolation and emitter parity passed');
} finally {
  await new Promise(resolve => trap.close(resolve));
  const exactScratch = fs.realpathSync(scratch);
  assert.equal(path.dirname(exactScratch), tempRoot, 'scratch cleanup escaped OS temp');
  assert.match(path.basename(exactScratch), /^bend2-layout-2032-[^\\/]+$/);
  fs.rmSync(exactScratch, { recursive: true, force: true });
}
