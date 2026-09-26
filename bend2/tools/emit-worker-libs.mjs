// Emit the source-bound Bend bot library with the reviewed, disposable worker
// compiler. This script never changes the clean upstream pin or browser code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const compiler = path.join(root, '.artifacts/bend2/toolchain-patches/workers-stage2-20260925');
const pin = path.join(root, '.artifacts/toolchains/bend');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const parent = path.join(root, '.artifacts/bend2/v2-preview/worker-libs');
const target = path.join(parent, 'bot');
const entry = 'bend2/platform/worker/BotAdapter.bend';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const relative = (file) => path.relative(root, file).replaceAll('\\', '/');
const sourceHash = (file) => digest(fs.readFileSync(file));

function sourceClosure(file, seen = new Map()) {
  const absolute = fs.realpathSync(path.join(root, file));
  assert.ok(absolute.startsWith(root + path.sep), `Bend import escaped workspace: ${file}`);
  if (seen.has(absolute)) return seen;
  const source = fs.readFileSync(absolute, 'utf8');
  seen.set(absolute, { path: relative(absolute), sha256: digest(Buffer.from(source)) });
  for (const line of source.split(/\r?\n/)) {
    const imported = /^\s*import\s+(\S+)(?:\s+as\s+\w+)?\s*$/.exec(line)?.[1];
    if (!imported || imported === 'Base') continue;
    assert.ok(imported.startsWith('./') || imported.startsWith('../'), `Nonlocal Bend import: ${imported}`);
    sourceClosure(relative(path.resolve(path.dirname(absolute), imported)), seen);
  }
  return seen;
}

export function compilerSourceTreeHash(dir) {
  const files = ['bend.ts', 'comp.ts', 'main.ts', 'web_runtime.js', 'base.bend']
    .map((name) => `bend2/${name}`);
  files.push(...fs.readdirSync(path.join(dir, 'bend2/effs'))
    .filter((name) => name.endsWith('.js')).map((name) => `bend2/effs/${name}`));
  // Git's Windows autocrlf changes only line endings in replayed source. The
  // compiler identity binds canonical source text; patch hashes bind exact
  // reviewed bytes, and generated artifacts retain their exact byte hashes.
  const listing = files.sort().map((name) => `${name}\0${digest(Buffer.from(
    fs.readFileSync(path.join(dir, name), 'utf8').replace(/\r\n/g, '\n')))}\n`).join('');
  return digest(Buffer.from(listing));
}

export function bindWorkerLibrary(directory, options = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(manifest.backend, 'bend-web-workers-2');
  assert.equal(manifest.mode, 'required-only');
  assert.equal(manifest.policy, 'strict');
  const names = Object.values(manifest.artifacts);
  assert.deepEqual([...new Set(names)].sort(), fs.readdirSync(directory).sort(),
    'Unexpected files in the emitted worker library');
  const artifacts = Object.fromEntries(names.sort().map((name) =>
    [name, sourceHash(path.join(directory, name))]));
  return { schema: 'rift-bend-worker-source-binding/1', library: 'bot',
    sourceRoot: entry, exports: ['choose'], mode: 'required-only', policy: 'strict',
    compiler: { baseCommit: options.baseCommit,
      sourceTreeSha256: options.sourceTreeSha256 },
    sources: [...sourceClosure(entry).values()].sort((a,b) => a.path.localeCompare(b.path, 'en')),
    artifacts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const expected = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
  const variant = JSON.parse(fs.readFileSync(path.join(root, 'bend2/toolchain-patches/004-web-workers/VARIANT.json'), 'utf8'));
  const head = execFileSync('git', ['-C', compiler, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const pinHead = execFileSync('git', ['-C', pin, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(head, expected.bendCommit);
  assert.equal(pinHead, expected.bendCommit);
  assert.equal(variant.baseCommit, head);
  const sourceTreeSha256 = compilerSourceTreeHash(compiler);
  assert.equal(sourceTreeSha256, variant.sourceTreeSha256, 'Unreviewed worker compiler variant');
  assert.equal(spawnSync(bun, ['--version'], { encoding: 'utf8' }).stdout.trim(), expected.bunVersion);
  fs.mkdirSync(parent, { recursive: true });
  const staging = path.join(parent, `.bot-stage-${process.pid}-${Date.now()}`);
  const result = spawnSync(bun, [path.join(compiler, 'bend2/main.ts'), path.join(root, entry),
    '--web-workers=required-only', '--web-policy=strict', '--web-exports=choose', '-o', staging],
    { cwd: path.join(compiler, 'bend2'), encoding: 'utf8', timeout: 120000,
      env: { ...process.env, BEND_NO_TELEMETRY: '1' } });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  const binding = bindWorkerLibrary(staging, { baseCommit: head, sourceTreeSha256 });
  fs.writeFileSync(path.join(staging, 'source-binding.json'), JSON.stringify(binding, null, 2) + '\n', { flag: 'wx' });
  if (fs.existsSync(target)) {
    const backup = path.join(parent, `.bot-previous-${process.pid}-${Date.now()}`);
    assert.ok(path.relative(parent, target) === 'bot' && path.relative(parent, backup).startsWith('.bot-previous-'));
    fs.renameSync(target, backup);
    try { fs.renameSync(staging, target); }
    catch (error) { fs.renameSync(backup, target); throw error; }
    console.log(JSON.stringify({ target, previous: backup, sourceTreeSha256, program: binding.artifacts }));
  } else {
    fs.renameSync(staging, target);
    console.log(JSON.stringify({ target, sourceTreeSha256, program: binding.artifacts }));
  }
}
