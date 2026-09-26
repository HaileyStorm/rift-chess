// Locally portable compiler resources, including the worker runtime. This is
// a deployment smoke, not an upstream release installer or a native binary.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilerSourceTreeHash } from './emit-worker-libs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const compiler = path.join(root, '.artifacts/bend2/toolchain-patches/workers-stage2-20260925');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const variant = JSON.parse(fs.readFileSync(path.join(root, 'bend2/toolchain-patches/004-web-workers/VARIANT.json'), 'utf8'));
const scratch = path.join(root, '.artifacts/bend2/toolchain-patches');
const out = path.resolve(process.argv[2] || path.join(scratch, 'portable-worker-toolchain'));
assert.ok(out.startsWith(scratch + path.sep), 'Portable output must stay in the ignored toolchain artifact tree');
assert.ok(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Use a new or empty package destination');
assert.equal(execFileSync('git', ['-C', compiler, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), variant.baseCommit);
assert.equal(compilerSourceTreeHash(compiler), variant.sourceTreeSha256);
const source = path.join(compiler, 'bend2');
const dest = path.join(out, 'bend2');
fs.mkdirSync(dest, { recursive: true });
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files = {};
for (const file of fs.readdirSync(source, { recursive: true, withFileTypes: true })) {
  if (!file.isFile()) continue;
  const relative = path.join(file.parentPath.slice(source.length + 1), file.name);
  const input = path.join(source, relative);
  const output = path.join(dest, relative);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(input, output, fs.constants.COPYFILE_EXCL);
  files[relative.replaceAll('\\', '/')] = sha(output);
}
assert.ok(files['web_runtime.js'], 'Missing installed worker runtime');
assert.ok(files['base.bend'] && files['main.ts'] && files['comp.ts']);
const program = path.join(root, '.artifacts/bend2/toolchain-patches/workers-stage2-20260925/tests/workers/policies.bend');
const library = path.join(out, 'smoke');
const result = spawnSync(bun, [path.join(dest, 'main.ts'), program,
  '--web-workers=required-only', '--web-policy=strict', '--web-exports=require_tree', '-o', library],
  { cwd: dest, env: { ...process.env, BEND_NO_TELEMETRY: '1' }, encoding: 'utf8', timeout: 120000 });
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr);
assert.ok(fs.existsSync(path.join(library, 'manifest.json')));
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ schema: 'rift-bend-worker-portable/1',
  baseCommit: variant.baseCommit, sourceTreeSha256: variant.sourceTreeSha256,
  files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en'))),
  smoke: 'source-bound Bend worker artifact emitted from relocated resource tree' }, null, 2) + '\n');
console.log(JSON.stringify({ out, files: Object.keys(files).length, smoke: true,
  workerRuntimeSha256: files['web_runtime.js'] }));
