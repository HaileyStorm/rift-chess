import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { packageWorkerLibrary, workerPrecachePaths } from '../tools/build.ts';

const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function makeLibrary(directory, identity = '1'.repeat(64)) {
  fs.mkdirSync(directory, { recursive: true });
  const prefix = `bend-${identity.slice(0, 16)}`;
  const manifest = {
    protocol: 1,
    program: identity,
    backend: 'bend-web-workers-2',
    mode: 'required-only',
    policy: 'strict',
    exports: { choose: 0 },
    functions: [{ name: 'choose' }],
    artifacts: {
      entry: 'index.mjs',
      program: `${prefix}.program.mjs`,
      worker: `${prefix}.worker.mjs`,
      runtime: `${prefix}.runtime.mjs`,
      manifest: 'manifest.json',
    },
  };
  const files = {
    'index.mjs': `import * as program from "./${manifest.artifacts.program}";\n` +
      `import {createWorkerSession} from "./${manifest.artifacts.runtime}";\n` +
      'export const manifest = program.manifest;\n' +
      'export function createSession(options = {}) {\n' +
      `  return createWorkerSession(program, new URL("./${manifest.artifacts.worker}", import.meta.url), options);\n}\n`,
    [manifest.artifacts.program]: `import {web_call, web_tail, web_fork, freezeProgramData} from "./${manifest.artifacts.runtime}";\n` +
      `export const manifest = freezeProgramData(${JSON.stringify(manifest)});\n`,
    [manifest.artifacts.worker]: `import * as program from "./${manifest.artifacts.program}";\n` +
      `import {serveWorker} from "./${manifest.artifacts.runtime}";\nserveWorker(program);\n`,
    [manifest.artifacts.runtime]: 'export function createWorkerSession() {}\nexport function serveWorker() {}\n',
    'manifest.json': `${JSON.stringify(manifest, null, 2)}\n`,
  };
  for (const [name, contents] of Object.entries(files)) fs.writeFileSync(path.join(directory, name), contents, { flag: 'wx' });
  return { manifest, files };
}

const compilerContext = {
  baseCommit: 'a'.repeat(40),
  sourceTreeSha256: 'b'.repeat(64),
};
const botWorkerExpectation = {
  library: 'bot',
  sourceRoot: 'bend2/platform/worker/BotAdapter.bend',
  exports: ['choose'],
  mode: 'required-only',
  policy: 'strict',
};

function makeWorkspace(directory) {
  const entry = path.join(directory, 'bend2', 'platform', 'worker', 'BotAdapter.bend');
  const rules = path.join(directory, 'bend2', 'core', 'Rules.bend');
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  fs.mkdirSync(path.dirname(rules), { recursive: true });
  fs.writeFileSync(entry, 'import ../../core/Rules.bend as Rules\n\ndef choose(x: U32) -> U32:\n  Rules.identity(x)\n');
  fs.writeFileSync(rules, 'def identity(x: U32) -> U32:\n  x\n');
  fs.mkdirSync(path.join(directory, 'bend2'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'bend2', 'TOOLCHAIN.json'), JSON.stringify({ bendCommit: compilerContext.baseCommit }));
  return directory;
}

function bindSource(directory, fixture, workspace) {
  const sources = ['bend2/platform/worker/BotAdapter.bend', 'bend2/core/Rules.bend']
    .map(sourcePath => ({ path: sourcePath, sha256: digest(fs.readFileSync(path.join(workspace, sourcePath))) }))
    .sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const binding = {
    schema: 'rift-bend-worker-source-binding/1',
    library: 'bot',
    sourceRoot: 'bend2/platform/worker/BotAdapter.bend',
    exports: ['choose'],
    mode: 'required-only',
    policy: 'strict',
    compiler: compilerContext,
    sources,
    artifacts: Object.fromEntries(Object.entries(fixture.files).map(([name]) =>
      [name, digest(fs.readFileSync(path.join(directory, name)))])),
  };
  fs.writeFileSync(path.join(directory, 'source-binding.json'), `${JSON.stringify(binding, null, 2)}\n`, { flag: 'wx' });
  return { repositoryRoot: workspace, expectedCompiler: compilerContext, expectedLibrary: botWorkerExpectation };
}

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-worker-package-'));
  t.after(() => {
    const target = path.resolve(directory);
    const tempRoot = path.resolve(os.tmpdir());
    assert.ok(target.startsWith(`${tempRoot}${path.sep}`), 'test cleanup target stays inside the OS temp directory');
    fs.rmSync(target, { recursive: true, force: true });
  });
  return directory;
}

test('copies the exact five static ESM artifacts and binds them into nested offline precache', async t => {
  const root = temporary(t);
  const source = path.join(root, 'generated', 'bot');
  const output = path.join(root, 'site', 'worker-libs', 'bot');
  const workspace = makeWorkspace(path.join(root, 'workspace'));
  const fixture = makeLibrary(source);
  const context = bindSource(source, fixture, workspace);

  const packaged = packageWorkerLibrary(source, output, 'worker-libs/bot', context);
  assert.equal(packaged.entry, 'worker-libs/bot/index.mjs');
  assert.deepEqual(Object.keys(packaged.files).sort(), Object.keys(fixture.files).map(name => `worker-libs/bot/${name}`).sort());
  for (const [name, expected] of Object.entries(fixture.files)) {
    const actual = fs.readFileSync(path.join(output, name));
    assert.equal(actual.toString('utf8'), expected, `${name} is copied byte-for-byte`);
    assert.equal(packaged.files[`worker-libs/bot/${name}`], digest(actual));
  }
  assert.deepEqual(fs.readdirSync(output).sort(), Object.keys(fixture.files).sort(), 'no sidecars or stale files enter the library directory');

  const files = { 'worker-v2.js': digest('host'), ...packaged.files };
  const precache = workerPrecachePaths(files);
  for (const name of Object.keys(packaged.files)) assert.ok(precache.includes(`./${name}`));
  assert.ok(precache.includes('./build.json'));

  const version = 'test-build';
  const swSource = fs.readFileSync(new URL('../platform/browser/sw.js', import.meta.url), 'utf8')
    .replace('__BEND_BUILD__', version).replace('__BEND_ASSETS__', JSON.stringify(precache));
  assert.ok(!swSource.includes('__BEND_'), 'the built service worker has no unresolved asset placeholders');

  const listeners = new Map();
  const records = new Map();
  const cacheName = `rift-bend-v1-${version}`;
  const cache = {
    async addAll(requests) {
      for (const request of requests) records.set(request.url, new Response(`cached:${new URL(request.url).pathname}`));
    },
    async match(request) {
      const response = records.get(typeof request === 'string' ? request : request.url);
      return response?.clone();
    },
  };
  const swContext = {
    URL,
    Request,
    Response,
    caches: {
      async open(name) { assert.equal(name, cacheName); return cache; },
      async keys() { return [cacheName]; },
      async delete() { return true; },
    },
    fetch: async () => { throw new Error('network unavailable in the offline test'); },
    self: {
      location: { href: 'https://game.example/releases/bend-preview/sw.js' },
      registration: { scope: 'https://game.example/releases/bend-preview/' },
      clients: { async claim() {} },
      addEventListener(name, listener) { listeners.set(name, listener); },
      async skipWaiting() {},
    },
  };
  vm.runInNewContext(swSource, swContext, { filename: 'packaged-sw.js' });
  const installWaits = [];
  listeners.get('install')({ waitUntil(promise) { installWaits.push(promise); } });
  await Promise.all(installWaits);

  const base = 'https://game.example/releases/bend-preview/';
  const cachedWorkerEntry = await cache.match(new Request(`${base}worker-libs/bot/index.mjs`));
  assert.equal(await cachedWorkerEntry.text(), 'cached:/releases/bend-preview/worker-libs/bot/index.mjs');
  const cachedArtifacts = [...records.keys()].filter(url => url.includes('/worker-libs/bot/'));
  assert.equal(cachedArtifacts.length, 5);
  assert.ok(cachedArtifacts.every(url => url.startsWith(base)), 'all five helper modules are cached under the nested deployment scope');

  let offlineResponse;
  listeners.get('fetch')({
    request: new Request(`${base}worker-libs/bot/${fixture.manifest.artifacts.worker}`),
    respondWith(promise) { offlineResponse = promise; },
  });
  const workerResponse = await offlineResponse;
  assert.equal(await workerResponse.text(), `cached:/releases/bend-preview/worker-libs/bot/${fixture.manifest.artifacts.worker}`);
});

test('never overwrites a valid older build or silently sweeps untracked output', t => {
  const root = temporary(t);
  const source = path.join(root, 'source');
  const output = path.join(root, 'site', 'worker-libs', 'bot');
  const workspace = makeWorkspace(path.join(root, 'workspace'));
  const first = makeLibrary(source, '2'.repeat(64));
  const context = bindSource(source, first, workspace);
  packageWorkerLibrary(source, output, 'worker-libs/bot', context);

  const nextSource = path.join(root, 'next-source');
  const next = makeLibrary(nextSource, '3'.repeat(64));
  bindSource(nextSource, next, workspace);
  assert.throws(() => packageWorkerLibrary(nextSource, output, 'worker-libs/bot', context), /different valid artifact set/);
  assert.deepEqual(fs.readdirSync(output).sort(), Object.keys(first.files).sort(), 'a direct package call never replaces an existing generated set');
  assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8')).program, '2'.repeat(64));

  fs.writeFileSync(path.join(output, 'old-sidecar.js'), 'must not be silently swept away');
  assert.throws(() => packageWorkerLibrary(source, output, 'worker-libs/bot', context), /exactly these files/);
  assert.equal(fs.readFileSync(path.join(output, 'old-sidecar.js'), 'utf8'), 'must not be silently swept away');
});

test('rejects missing, extra, mixed-generation, tampered and non-strict artifacts before copying', t => {
  const root = temporary(t);
  const output = path.join(root, 'site', 'worker-libs', 'bot');
  const workspace = makeWorkspace(path.join(root, 'workspace'));
  const missing = path.join(root, 'missing');
  const missingFixture = makeLibrary(missing);
  bindSource(missing, missingFixture, workspace);
  fs.unlinkSync(path.join(missing, 'manifest.json'));
  assert.throws(() => packageWorkerLibrary(missing, output, 'worker-libs/bot', compilerContextFor(workspace)), /Invalid worker library manifest|no such file/i);
  assert.equal(fs.existsSync(output), false);

  const extra = path.join(root, 'extra');
  const extraFixture = makeLibrary(extra);
  bindSource(extra, extraFixture, workspace);
  fs.writeFileSync(path.join(extra, 'diagnostics.json'), '{}');
  assert.throws(() => packageWorkerLibrary(extra, output, 'worker-libs/bot', compilerContextFor(workspace)), /exactly these files/);

  const mixed = path.join(root, 'mixed');
  const mixedFixture = makeLibrary(mixed, '4'.repeat(64));
  bindSource(mixed, mixedFixture, workspace);
  const mixedManifest = JSON.parse(fs.readFileSync(path.join(mixed, 'manifest.json'), 'utf8'));
  mixedManifest.program = '5'.repeat(64);
  fs.writeFileSync(path.join(mixed, 'manifest.json'), JSON.stringify(mixedManifest));
  assert.throws(() => packageWorkerLibrary(mixed, output, 'worker-libs/bot', compilerContextFor(workspace)), /invalid program artifact name/);

  const tampered = path.join(root, 'tampered');
  const tamperedFixture = makeLibrary(tampered, '6'.repeat(64));
  bindSource(tampered, tamperedFixture, workspace);
  fs.appendFileSync(path.join(tampered, 'index.mjs'), '\n// changed after generation\n');
  assert.throws(() => packageWorkerLibrary(tampered, output, 'worker-libs/bot', compilerContextFor(workspace)), /changed after source binding/);

  const permissive = path.join(root, 'permissive');
  const fixture = makeLibrary(permissive, '7'.repeat(64));
  fixture.manifest.policy = 'permissive';
  fs.writeFileSync(path.join(permissive, 'manifest.json'), JSON.stringify(fixture.manifest));
  assert.throws(() => packageWorkerLibrary(permissive, output, 'worker-libs/bot', compilerContextFor(workspace)), /reviewed scheduling policy/);

  const staleSource = path.join(root, 'stale-source');
  const staleFixture = makeLibrary(staleSource, '8'.repeat(64));
  bindSource(staleSource, staleFixture, workspace);
  fs.appendFileSync(path.join(workspace, 'bend2/platform/worker/BotAdapter.bend'), '\n# changed after emission\n');
  assert.throws(() => packageWorkerLibrary(staleSource, output, 'worker-libs/bot', compilerContextFor(workspace)), /current Bend import closure/);

  const staleCompiler = path.join(root, 'stale-compiler');
  const compilerFixture = makeLibrary(staleCompiler, '9'.repeat(64));
  bindSource(staleCompiler, compilerFixture, workspace);
  assert.throws(() => packageWorkerLibrary(staleCompiler, output, 'worker-libs/bot', {
    repositoryRoot: workspace,
    expectedCompiler: { ...compilerContext, sourceTreeSha256: 'c'.repeat(64) },
    expectedLibrary: botWorkerExpectation,
  }), /stale or unreviewed Bend compiler variant/);
  assert.equal(fs.existsSync(output), false);
});

function compilerContextFor(repositoryRoot) {
  return { repositoryRoot, expectedCompiler: compilerContext, expectedLibrary: botWorkerExpectation };
}
