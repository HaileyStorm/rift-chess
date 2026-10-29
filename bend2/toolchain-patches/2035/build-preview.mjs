// Repackage reviewed current emissions. Historical creation/proof guards stay unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const self = fileURLToPath(import.meta.url), root = path.resolve(path.dirname(self), '../../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const within = (parent, file) => { const relative = path.relative(parent, file); return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); };
const plain = name => typeof name === 'string' && name && !path.isAbsolute(name) && !name.includes('\\') && !name.includes(':') && name.split('/').every(p => p && p !== '.' && p !== '..');
const one = (text, before, after) => { assert.equal(text.split(before).length - 1, 1); return text.replace(before, after); };

export async function buildPreview2035({ inputPath, inputSha256, artifactRoot, outputDirectory }) {
  assert.ok(typeof Bun !== 'undefined' && typeof Bun.build === 'function', 'use the local Bun runtime');
  assert.match(inputSha256, /^[0-9a-f]{64}$/);
  const artifacts = path.resolve(artifactRoot), out = path.resolve(outputDirectory), fences = new Map();
  assert.notEqual(artifacts, path.parse(artifacts).root, 'artifact scope must be a specific directory');
  assert.equal(fs.realpathSync(artifacts), artifacts); assert.ok(fs.lstatSync(artifacts).isDirectory());
  assert.ok(within(artifacts, out), 'output escaped artifact scope');
  assert.equal(fs.realpathSync(path.dirname(out)), path.dirname(out));
  assert.ok(!fs.existsSync(out), 'output already exists; retain the original attempt');
  const file = name => { const result = path.isAbsolute(name) ? path.resolve(name) : path.resolve(root, name); assert.ok(within(root, result) || within(artifacts, result), 'input escaped declared roots'); return result; };
  function read(name, max = 16 * 2 ** 20) {
    const target = file(name); assert.equal(fs.realpathSync(target), target);
    const before = fs.lstatSync(target, { bigint: true }); assert.ok(before.isFile() && !before.isSymbolicLink() && before.size > 0n && before.size <= BigInt(max));
    const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    try {
      const bytes = fs.readFileSync(fd), held = fs.fstatSync(fd, { bigint: true }), after = fs.lstatSync(target, { bigint: true });
      for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) { assert.equal(held[key], before[key]); assert.equal(after[key], before[key]); }
      assert.equal(fs.realpathSync(target), target); return bytes;
    } finally { fs.closeSync(fd); }
  }
  function checked(name, digest, max = 16 * 2 ** 20) { const target = file(name), bytes = read(target, max); assert.equal(sha(bytes), digest, target); fences.set(target, { digest, max }); return bytes; }
  const ref = (row, max) => { assert.match(row.sha256, /^[0-9a-f]{64}$/); const bytes = checked(row.path, row.sha256, max); assert.equal(bytes.length, row.bytes); return bytes; };
  const binding = JSON.parse(checked(path.resolve(inputPath), inputSha256, 512 * 2 ** 10));
  assert.equal(binding.schema, 'rift-source-bound-preview-input/3'); assert.match(binding.sourceRevision, /^[0-9a-f]{40}$/);
  assert.equal(file(binding.builder.path), self); ref(binding.builder);
  assert.equal(process.execPath, file(binding.runtime.path)); assert.equal(Bun.version, binding.runtime.version); ref(binding.runtime, 128 * 2 ** 20);
  assert.equal(process.env.BEND_NO_TELEMETRY, '1');
  assert.ok(Number.isSafeInteger(binding.maxPackageBytes) && binding.maxPackageBytes > 0 && binding.maxPackageBytes <= 8 * 2 ** 20);
  const baseRoot = path.dirname(file(binding.base.path)), base = JSON.parse(ref(binding.base));
  assert.deepEqual(Object.keys(binding.modules).sort(), ['controller', 'menu', 'scene']);
  // All three bundles are rebuilt; every consumed browser source is explicit.
  assert.ok(Array.isArray(binding.ports));
  assert.deepEqual(binding.ports.map(row => row.path).sort(), ['worker-v2.ts', 'sprite-helper.ts', 'pose-port.ts', 'asset-port.ts', 'image-port.ts', 'bitmap-surface.ts', 'sw.js', 'host.ts', 'ports.ts', 'input-queue.ts', 'telemetry.ts'].map(name => 'bend2/platform/browser/' + name).sort());
  for (const row of binding.ports) ref(row);
  assert.ok(Array.isArray(binding.retainedSources));
  // An explicit stylesheet input is rebuilt; other retained sources stay
  // byte-identical to their admitted base rather than silently drifting.
  const stylesheet = binding.stylesheet ?? null;
  if (stylesheet) {
    assert.equal(stylesheet.path, 'bend2/platform/browser/platform.css');
    ref(stylesheet);
    assert.deepEqual(binding.retainedSources.find(row => row.path === stylesheet.path), stylesheet);
  }
  for (const name of ['bend2/platform/browser/platform.css', 'bend2/platform/browser/index.html', 'bend2/assets/MANIFEST.json'])
    assert.equal(binding.retainedSources.filter(row => row.path === name).length, 1, 'missing unrebuilt source binding: ' + name);
  for (const row of binding.retainedSources) {
    if (base.retainedSources && row.path !== stylesheet?.path) {
      const previous = base.retainedSources.filter(old => old.path === row.path);
      assert.equal(previous.length, 1, 'unrebuilt source absent from base: ' + row.path);
      assert.deepEqual(row, previous[0], 'unrebuilt base source changed: ' + row.path);
    }
    ref(row);
  }
  const hostModules = binding.hostModules ?? [];
  assert.deepEqual(hostModules.map(row => row.path).sort(),
    ['bend2/lib/graphics/v2/host/CanvasPreview.mjs', 'bend2/lib/graphics/v2/host/ImageBuffer.mjs'].sort());
  for (const row of hostModules) ref(row);
  const selected = {}, provenance = {};
  for (const key of ['controller', 'scene', 'menu']) {
    const record = binding.modules[key], manifest = JSON.parse(ref(record.manifest));
    assert.ok(manifest.ok && manifest.wholeBookValid && manifest.holes === 0 && manifest.sourceFencesPassed);
    assert.equal(manifest.networkCalls, 0); assert.equal(manifest.subprocessCalls, 0); assert.equal(manifest.entry, record.entry);
    assert.equal(manifest.output.sha256, record.output.sha256); assert.equal(manifest.output.bytes, record.output.bytes); assert.equal(manifest.output.file, path.basename(record.output.path));
    for (const row of manifest.sources) {
      const lineage = base.retainedEmissionCommentLineage;
      if (lineage && row.path === lineage.current.path && row.sha256 === lineage.preimage.sha256)
        assert.equal(one(ref(lineage.preimage).toString(), lineage.from, lineage.to), ref(lineage.current).toString());
      else ref(row);
    }
    let hostEntry = record.entry;
    if (record.hostEntry) {
      assert.equal(binding.schema, 'rift-source-bound-preview-input/3');
      assert.equal(key, 'controller');
      assert.equal(record.entry, 'bend2/CanvasBrowserControl.bend');
      assert.equal(record.hostEntry.path, 'bend2/ApplicationControl.bend');
      ref(record.hostEntry);
      assert.ok(manifest.sources.some(row => row.path === record.hostEntry.path && row.sha256 === record.hostEntry.sha256));
      hostEntry = record.hostEntry.path;
    }
    selected[key] = { entry: record.entry, hostEntry, bytes: ref(record.output) }; provenance[key] = record;
  }
  const copied = {};
  for (const [name, digest] of Object.entries(base.files)) { assert.ok(plain(name)); copied[name] = checked(path.join(baseRoot, name), digest, 8 * 2 ** 20); }
  const only = prefix => { const names = Object.keys(copied).filter(name => name.startsWith(prefix) && name.endsWith('.js')); assert.equal(names.length, 1); return names[0]; };
  const oldHost = only('host-audio-'), oldWorker = only('worker-v2-'), oldHelper = only('sprite-helper-');
  const oldStyle = stylesheet ? Object.keys(copied).filter(name => /^style-[0-9a-f]+\.css$/.test(name)) : [];
  if (stylesheet) assert.equal(oldStyle.length, 1, 'expected one base stylesheet');
  const boundaryPath = file(binding.boundary.path); assert.equal(boundaryPath, path.join(root, 'bend2/toolchain-patches/2035/browser-tag-boundary.mjs')); ref(binding.boundary);
  assert.ok(Array.isArray(binding.boundaryDependencies));
  for (const name of ['bend2/toolchain-patches/2035/selected-binding.mjs', 'bend2/tools/selected-modules.mjs'])
    assert.equal(binding.boundaryDependencies.filter(row => row.path === name).length, 1, 'missing consumed boundary dependency: ' + name);
  for (const row of binding.boundaryDependencies) ref(row);
  const ground = base.preparedGround; assert.ok(ground && plain(ground.assetFile) && plain(ground.metadataFile));
  assert.equal(base.files[ground.assetFile], ground.assetSha256); assert.equal(base.files[ground.metadataFile], ground.metadataSha256);
  const savedFetch = globalThis.fetch, methods = ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'];
  const savedProcesses = Object.fromEntries(methods.map(name => [name, childProcess[name]])), savedBunSpawn = Bun.spawn, savedBunSpawnSync = Bun.spawnSync;
  let networkCalls = 0, subprocessCalls = 0;
  const denyProcess = () => { subprocessCalls++; throw Error('preview repack denies compiler/subprocess execution'); };
  globalThis.fetch = async () => { networkCalls++; throw Error('preview repack denies fetch'); };
  for (const name of methods) childProcess[name] = denyProcess;
  Bun.spawn = Bun.spawnSync = denyProcess;
  try {
    const { transformBrowserTags2035 } = await import(pathToFileURL(boundaryPath).href), transforms = [], seen = new Set();
    const plugin = { name: 'source-bound-current-preview', setup(build) {
      build.onLoad({ filter: /\.bend$/ }, args => { const key = Object.keys(selected).find(name => file(selected[name].hostEntry) === path.resolve(args.path)); assert.ok(key, 'unselected Bend import'); seen.add(key); return { contents: selected[key].bytes.toString(), loader: 'js' }; });
      build.onLoad({ filter: /\.mjs$/ }, args => {
        const name = path.relative(root, args.path).split(path.sep).join('/');
        const row = hostModules.find(item => item.path === name);
        assert.ok(row, 'unbound host module: ' + name);
        return { contents: ref(row).toString(), loader: 'js' };
      });
      build.onLoad({ filter: /\.ts$/ }, args => {
        const name = path.relative(root, args.path).split(path.sep).join('/'), row = binding.ports.find(item => item.path === name); assert.ok(row, 'unbound browser source: ' + name); const bytes = ref(row);
        if (name.endsWith('/bitmap-surface.ts')) return { contents: bytes.toString(), loader: 'ts' };
        if (name.endsWith('/telemetry.ts')) {
          const text = bytes.toString();
          assert.ok(!/\$\s*(?::|===|!==)\s*['"]|switch\s*\([^)]*\.\$/.test(text), 'unreviewed candidate browser tag port: ' + name);
          return { contents: text, loader: 'ts' };
        }
        const transformed = transformBrowserTags2035(name, bytes); transforms.push(transformed.metadata); return { contents: transformed.contents, loader: 'ts' };
      });
    } };
    const bundle = async (entry, define) => {
      const result = await Bun.build({ entrypoints: [path.join(root, entry)], target: 'browser', format: 'esm', minify: true, splitting: false, plugins: [plugin], define });
      assert.ok(result.success, JSON.stringify(result.logs)); assert.equal(result.outputs.length, 1); const bytes = Buffer.from(await result.outputs[0].arrayBuffer()); assert.ok(bytes.length < 2 * 2 ** 20); return bytes;
    };
    const sceneHash = binding.modules.scene.output.sha256;
    const helperBytes = await bundle('bend2/platform/browser/sprite-helper.ts', { __BEND_SPRITE_SOURCE__: JSON.stringify(sceneHash), __BEND_PREPARED_GROUND_PATH__: JSON.stringify(ground.assetPath), __BEND_PREPARED_GROUND_SHA__: JSON.stringify(ground.assetSha256), __BEND_PREPARED_PLATE_SHA__: JSON.stringify(ground.plateSha256), __BEND_PREPARED_FRAME_JSON__: JSON.stringify(ground.frameJson) });
    const helper = 'sprite-helper-' + sha(helperBytes).slice(0, 12) + '.js';
    const workerBytes = await bundle('bend2/platform/browser/worker-v2.ts', { __BEND_SPRITE_SOURCE__: JSON.stringify(sceneHash), __BEND_SPRITE_HELPER__: JSON.stringify('./' + helper) });
    assert.deepEqual([...seen].sort(), ['controller', 'menu', 'scene']);
    const worker = 'worker-v2-' + sha(workerBytes).slice(0, 12) + '.js';
    const hostBytes = await bundle('bend2/platform/browser/host.ts', { __BEND_WORKER__: JSON.stringify('./' + worker) }), host = 'host-audio-' + sha(hostBytes).slice(0, 12) + '.js';
    fs.mkdirSync(out); const files = {}; let total = 0;
    const put = (name, bytes) => { assert.ok(plain(name)); total += bytes.length; assert.ok(total < binding.maxPackageBytes && bytes.length < 8 * 2 ** 20); const target = path.join(out, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' }); assert.equal(sha(read(target)), sha(bytes)); files[name] = sha(bytes); };
    for (const [name, bytes] of Object.entries(copied)) if (![oldHost, oldWorker, oldHelper, ...oldStyle, 'index.html', 'sw.js'].includes(name)) put(name, bytes);
    let html = one(copied['index.html'].toString(), './' + oldHost, './' + host);
    let rebuiltStylesheet = null;
    if (stylesheet) {
      const bytes = ref(stylesheet), name = 'style-' + sha(bytes).slice(0, 12) + '.css';
      put(name, bytes); html = one(html, './' + oldStyle[0], './' + name);
      rebuiltStylesheet = { file: name, source: stylesheet };
    }
    put(helper, helperBytes); put(worker, workerBytes); put(host, hostBytes); put('index.html', Buffer.from(html));
    const version = sha(JSON.stringify(files)).slice(0, 20), sw = ref(binding.ports.find(row => row.path.endsWith('/sw.js'))).toString();
    put('sw.js', Buffer.from(one(one(sw, '__BEND_BUILD__', version), '__BEND_ASSETS__', JSON.stringify(['./', './build.json', ...Object.keys(files).sort().map(name => './' + name)]))));
    for (const [name, bound] of fences) assert.equal(sha(read(name, bound.max)), bound.digest, name);
    assert.equal(networkCalls, 0); assert.equal(subprocessCalls, 0);
    const manifest = { schema: binding.schema.replace('-input', ''), builtAt: new Date().toISOString(), version, files, selected: provenance, sources: binding.ports, retainedSources: binding.retainedSources,
      sourceRevision: binding.sourceRevision, hostModules, basePackage: binding.base, preparedGround: ground, rebuiltStylesheet, browserBoundary: { canonical: binding.boundary, transformations: transforms },
      retainedEmissionCommentLineage: base.retainedEmissionCommentLineage, retainedControllerExecution: base.retainedControllerExecution,
      packageInputSha256: inputSha256, runtime: binding.runtime, builder: binding.builder, rebuiltHelper: helper, rebuiltBundles: { helper, worker, host }, networkCalls, subprocessCalls, compilerExecutions: 0, draft: true, adopted: false,
      scope: 'All three browser bundles rebuilt from exact bound TypeScript and retained checked Bend emissions; base assets and prepared ground retained. No Bend compiler emission, proof/kernel/native/GPU/performance or adoption acceptance.' };
    const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n'); assert.ok(bytes.length <= 512 * 2 ** 10 && total + bytes.length <= binding.maxPackageBytes); fs.writeFileSync(path.join(out, 'build.json'), bytes, { flag: 'wx' }); assert.equal(sha(read(path.join(out, 'build.json'))), sha(bytes));
    const result = { ok: true, out, version, buildSha256: sha(bytes), bytes: total + bytes.length, networkCalls, subprocessCalls, compilerExecutions: 0 }; console.log(JSON.stringify(result)); return result;
  } finally {
    globalThis.fetch = savedFetch; for (const name of methods) childProcess[name] = savedProcesses[name]; Bun.spawn = savedBunSpawn; Bun.spawnSync = savedBunSpawnSync;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  assert.equal(process.argv.length, 6, 'usage: build-preview.mjs <input.json> <sha256> <artifact-root> <exclusive-output>');
  await buildPreview2035({ inputPath: process.argv[2], inputSha256: process.argv[3], artifactRoot: process.argv[4], outputDirectory: process.argv[5] });
}
