import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const pin = path.join(root, '.artifacts/toolchains/bend');
const patched = path.join(root, '.artifacts/bend2/toolchain-patches/layout/compiler');
const out = path.join(root, '.artifacts/bend2/toolchain-patches/layout/test-output');
const expected = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));

function run(binary, args, timeout = 30000, extraEnv = {}) {
  const result = spawnSync(binary, args, {
    cwd: path.join(patched, 'bend2'),
    env: { ...process.env, BEND_NO_TELEMETRY: '1', ...extraEnv },
    encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024,
  });
  assert.ifError(result.error);
  return result;
}
function cli(tree, args, timeout) {
  return run(bun, [path.join(tree, 'bend2/main.ts'), ...args], timeout);
}
function hash(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function ok(result) {
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
function decl(report, name) {
  const value = report.declarations.find((d) => d.name === name);
  assert.ok(value, 'missing ' + name);
  return value;
}

assert.equal(ok(run('git', ['-C', pin, 'rev-parse', 'HEAD'])).trim(), expected.bendCommit);
assert.equal(ok(run('git', ['-C', patched, 'rev-parse', 'HEAD'])).trim(), expected.bendCommit);
assert.equal(ok(run('git', ['-C', pin, 'status', '--porcelain=v1'])).trim(), '');
assert.equal(ok(run('git', ['-C', patched, 'status', '--porcelain=v1', '--untracked-files=no']))
  .trim().split('\n').map((line) => line.trim()).join('\n'),
  ['M bend2/bend.ts', 'M bend2/comp.ts', 'M bend2/main.ts'].join('\n'));
for (const [file, sha] of Object.entries({
  'bend.ts': 'b49da491247ce3cbfd919b9a043f050af391d1cb6c274551f571e9c73a3de1e3',
  'comp.ts': '09e1c8352eca894cde43aee8510381abbd4ed5dd8259ae6c0fe809cd793ed44e',
  'main.ts': '4563db66ed2243506320c5e04d56fa840c568d5c07bc7db601d6199641cc8cb8',
})) {
  assert.equal(hash(path.join(patched, 'bend2', file)), sha, file + ' drifted');
}
assert.equal(ok(run(bun, ['--version'])).trim(), expected.bunVersion);
fs.mkdirSync(out, { recursive: true });

const small = path.join(here, 'fixture.bend').replaceAll('\\', '/');
const wide = path.join(here, 'wide.bend').replaceAll('\\', '/');
const before = [hash(small), hash(wide)];
for (const input of [small, wide]) {
  ok(cli(pin, [input, '--check-only']));
  ok(cli(patched, [input, '--check-only']));
}
const one = ok(cli(patched, [small, '--explain-layout']));
assert.equal(one, ok(cli(patched, [small, '--explain-layout'])));
const report = JSON.parse(one);
assert.equal(report.schema, 'bend-layout-v1');
assert.equal(report.target, 'native-C');
assert.deepEqual(decl(report, 'Wide').value.kinds, ['w32', 'w32', 'w32', 'w32']);
assert.equal(decl(report, 'Tree').value.boxed, true);
assert.deepEqual(decl(report, 'Tree').constructors[1].node.kinds, ['box', 'box']);
assert.deepEqual(decl(report, 'pass').parameters[0].layout.kinds,
  ['w32', 'w32', 'w32', 'w32']);
assert.deepEqual(decl(report, 'fork').sites,
  [{ kind: 'parallel-let', calls: ['leaf', 'leaf'], branches: 2,
    resultWords: [1, 1], totalResultWords: 2 }]);
assert.deepEqual(decl(report, 'main').sites,
  [{ kind: 'bang-call', callee: 'fork', argumentWords: [1], resultWords: 1 }]);
assert.ok(!one.includes(root), 'report must omit absolute source paths');
const wideReport = JSON.parse(ok(cli(patched, [wide, '--explain-layout'])));
assert.equal(decl(wideReport, 'Huge').value.words, 65);
assert.deepEqual(decl(wideReport, 'Huge').value.kinds, Array(65).fill('box'));
assert.equal(decl(wideReport, 'Huge').constructors[0].fields.length, 65);
assert.deepEqual(decl(wideReport, 'keep').parameters[0].layout.kinds,
  Array(65).fill('box'));
assert.deepEqual([hash(small), hash(wide)], before);

const imported = path.join(here, 'imports.bend');
const module = path.join(here, 'module.bend');
const moved = path.join(out, 'different-absolute-location');
fs.mkdirSync(moved, { recursive: true });
fs.copyFileSync(imported, path.join(moved, 'imports.bend'));
fs.copyFileSync(module, path.join(moved, 'module.bend'));
const importsA = ok(cli(patched, [imported.replaceAll('\\', '/'), '--explain-layout']));
const importsB = ok(cli(patched, [path.join(moved, 'imports.bend').replaceAll('\\', '/'),
  '--explain-layout']));
assert.equal(importsA, importsB, 'different checkout paths changed report bytes');
assert.ok(!importsA.includes(root) && !importsA.includes('\\'), 'report contains host path');
assert.ok(decl(JSON.parse(importsA), 'module.inc'));
const names = JSON.parse(importsA).declarations.flatMap((d) => [d.name,
  ...d.kind === 'type' ? d.constructors.map((c) => c.name) : d.sites.flatMap((s) =>
    s.kind === 'parallel-let' ? s.calls : [s.callee])]);
for (const name of names) {
  assert.ok(!name.includes('\\') && !name.startsWith('/') && !/^[a-z]:/i.test(name),
    'absolute/path name leaked: ' + name);
}

const privateLib = path.join(out, 'never-create-lib');
const privateHome = path.join(out, 'never-create-home');
const isolated = { BEND_LIB: privateLib, USERPROFILE: privateHome,
  BEND_HUB: 'http://127.0.0.1:9', BEND_ORIGIN: 'http://127.0.0.1:9',
  BEND_NO_TELEMETRY: '' };
for (const [tag, source] of [
  ['absolute', 'import /private/absolute/module.bend as M'],
  ['windows-absolute', 'import C:/private/absolute/module.bend as M'],
  ['named', 'import abcdefghijkl@1.0.0.0/file.bend as M'],
  ['hash', 'import 0x0123456789abcdef0123456789abcdef/file.bend as M'],
  ['backslash', 'import folder\\module.bend as M'],
]) {
  const file = path.join(out, tag + '.bend');
  fs.writeFileSync(file, source + '\n\ndef main() -> U32:\n  1\n');
  const response = run(bun, [path.join(patched, 'bend2/main.ts'),
    file.replaceAll('\\', '/'), '--explain-layout'], 30000, isolated);
  assert.equal(response.status, 1, tag + ' unexpectedly accepted');
  assert.equal(response.stdout, '', tag + ' printed a report');
  assert.match(response.stderr, /--explain-layout accepts local relative imports only/);
  assert.ok(!response.stderr.includes(source.split(' ')[1]), tag + ' leaked rejected path');
  assert.ok(!fs.existsSync(privateLib)
    && !fs.existsSync(path.join(privateHome, '.bend', 'check.json')),
  tag + ' wrote Bend package/telemetry cache');
}
for (const [tag, source] of [
  ['named', 'import abcdefghijkl@1.0.0.0/file.bend as M'],
  ['hash', 'import 0x0123456789abcdef0123456789abcdef/file.bend as M'],
  ['absolute', 'import /private/absolute/module.bend as M'],
]) {
  const dir = path.join(out, 'nested-' + tag);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'inner.bend'), source + '\n');
  const outer = path.join(dir, 'outer.bend');
  fs.writeFileSync(outer, 'import Base\nimport ./inner.bend as Inner\n\ndef main() -> U32:\n  1\n');
  const response = run(bun, [path.join(patched, 'bend2/main.ts'),
    outer.replaceAll('\\', '/'), '--explain-layout'], 30000, isolated);
  assert.equal(response.status, 1, 'nested ' + tag + ' unexpectedly accepted');
  assert.equal(response.stdout, '', 'nested ' + tag + ' printed a report');
  assert.match(response.stderr, /--explain-layout accepts local relative imports only/);
  assert.ok(!response.stderr.includes(source.split(' ')[1]), 'nested ' + tag + ' leaked path');
  assert.ok(!fs.existsSync(privateLib)
    && !fs.existsSync(path.join(privateHome, '.bend', 'check.json')),
  'nested ' + tag + ' wrote Bend package/telemetry cache');
}

const ordinary = run(bun, [path.join(patched, 'bend2/main.ts'),
  path.join(here, 'invalid.bend').replaceAll('\\', '/'), '-o', '--explain-layout'],
30000, isolated);
assert.equal(ordinary.status, 1);
assert.equal(ordinary.stdout, '');
assert.ok(fs.existsSync(path.join(privateHome, '.bend', 'check.json')),
  '-o filename incorrectly suppressed normal version check');

const forbidden = path.join(out, 'should-not-exist.js');
assert.equal(cli(patched, [small, '--explain-layout', '-o', forbidden]).status, 1);
assert.ok(!fs.existsSync(forbidden));
assert.equal(cli(patched, [path.join(here, 'invalid.bend'), '--explain-layout']).status, 1);

for (const ext of ['js', 'c']) {
  const from = path.join(out, 'pin.' + ext);
  const to = path.join(out, 'patched.' + ext);
  ok(cli(pin, [small, '-o', from.replaceAll('\\', '/')], 30000));
  ok(cli(patched, [small, '-o', to.replaceAll('\\', '/')], 30000));
  assert.equal(hash(from), hash(to), ext + ' output changed');
  console.log(ext + ' unchanged: ' + hash(to));
}
console.log('layout reports/checker/CLI isolation passed');
