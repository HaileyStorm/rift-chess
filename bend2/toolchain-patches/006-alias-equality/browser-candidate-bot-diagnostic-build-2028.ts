/**
 * Re-bundle only the nonce-private Bend 2.0.28 candidate browser artifacts,
 * adding an in-memory worker-route probe. This reuses the original candidate's
 * hashed 2.0.28 selected-book cache and never invokes the production builder,
 * Bend compiler, canonical cache, or pinned preview output.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BunPlugin } from 'bun';
import { candidateBridgeEvidence, candidateBridgePlugin } from './browser-abi-transform-2028.ts';
import {
  candidateBotDiagnosticAnchors,
  candidateBotDiagnosticPlugin,
} from './browser-candidate-bot-diagnostic-transform-2028.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runnerPath = path.join(root, 'bend2/toolchain-patches/006-alias-equality/browser-candidate-bot-2028.mjs');
const candidateStore = path.join(root, '.artifacts/bend2/toolchain-patches/browser-2028-candidate');
const sha256 = (bytes: Uint8Array | string): string => crypto.createHash('sha256').update(bytes).digest('hex');
const rel = (file: string): string => path.relative(root, file).replaceAll('\\', '/');
const sourceHash = (file: string): string => sha256(readPlainFile(file));

function readPlainFile(file: string): Buffer {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a plain file: ${file}`);
  return fs.readFileSync(file);
}

function hashTree(directory: string): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  const visit = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Candidate input contains a symlink: ${full}`);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) result[path.relative(directory, full).replaceAll('\\', '/')] = sourceHash(full);
      else throw new Error(`Candidate input contains a special filesystem entry: ${full}`);
    }
  };
  visit(directory);
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

function safePath(directory: string, relative: string): string {
  if (typeof relative !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(relative) ||
      relative.split('/').some((part) => !part || part === '.' || part === '..'))
    throw new Error(`Unsafe candidate-relative path: ${relative}`);
  const target = path.resolve(directory, ...relative.split('/'));
  const relPath = path.relative(directory, target);
  if (!relPath || relPath.startsWith(`..${path.sep}`) || relPath === '..' || path.isAbsolute(relPath))
    throw new Error(`Candidate-relative path escaped its directory: ${relative}`);
  return target;
}

function copyBoundFile(source: string, targetRoot: string, relative: string): string {
  const bytes = readPlainFile(source);
  const target = safePath(targetRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  return sha256(bytes);
}

function writeCandidateFile(targetRoot: string, relative: string, bytes: Uint8Array): string {
  const target = safePath(targetRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  return sha256(bytes);
}

function assertRealCandidateDist(dist: string): string {
  if (!process.env.BEND_CANDIDATE_DIST || path.basename(dist) !== 'dist' ||
      !dist.startsWith(`${candidateStore}${path.sep}`))
    throw new Error('BEND_CANDIDATE_DIST must name a real prior nonce-private candidate dist.');
  const storeStat = fs.lstatSync(candidateStore);
  if (!storeStat.isDirectory() || storeStat.isSymbolicLink()) throw new Error('Candidate store is not a plain directory.');
  const distStat = fs.lstatSync(dist);
  if (!distStat.isDirectory() || distStat.isSymbolicLink() ||
      !fs.realpathSync(dist).startsWith(`${fs.realpathSync(candidateStore)}${path.sep}`))
    throw new Error('Prior candidate dist is not a real directory below the candidate store.');
  const runRoot = path.dirname(dist);
  if (!/^run-[A-Za-z0-9-]+$/.test(path.basename(runRoot)))
    throw new Error('Prior candidate dist parent must use its isolated run-* workspace name.');
  return runRoot;
}

function verifyCandidateFiles(dist: string, files: Record<string, string>): void {
  const realDist = fs.realpathSync(dist);
  for (const [name, expected] of Object.entries(files)) {
    assert.match(expected, /^[0-9a-f]{64}$/, `Invalid prior candidate digest: ${name}`);
    const file = safePath(dist, name);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || !fs.realpathSync(file).startsWith(`${realDist}${path.sep}`))
      throw new Error(`Prior candidate file is not a plain in-dist file: ${name}`);
    assert.equal(sourceHash(file), expected, `Prior candidate dist changed: ${name}`);
  }
}

function sortedMap(map: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

function selectedBookPlugin(cache: string, records: any[]): BunPlugin {
  const byEntry = new Map(records.map((record) => [path.resolve(root, record.entry),
    path.join(cache, `${record.name}.js`)]));
  return {
    name: 'rift-bend-2-0-28-candidate-diagnostic-selected-books',
    setup(build) {
      build.onLoad({ filter: /\.bend$/ }, ({ path: file }) => {
        const compiled = byEntry.get(path.resolve(file));
        if (!compiled) throw new Error(`Diagnostic bundle reached an unselected Bend book: ${file}`);
        return { contents: readPlainFile(compiled).toString('utf8'), loader: 'js' };
      });
    },
  };
}

// Kept separate so build outputs are fully materialized before they enter the
// fresh candidate dist; no Bun.build write targets overlap the prior run.
async function bundleRecord(result: Awaited<ReturnType<typeof Bun.build>>, label: string) {
  if (!result.success) throw new Error(`${label} diagnostic bundle failed:\n${result.logs.map(String).join('\n')}`);
  const output = result.outputs.filter((file) => file.path.endsWith('.js'));
  assert.equal(output.length, 1, `${label} diagnostic bundle must produce one JavaScript file`);
  const bytes = Buffer.from(await output[0].arrayBuffer());
  return { name: path.basename(output[0].path), bytes, sha256: sha256(bytes) };
}

async function main(): Promise<void> {
  if (typeof Bun === 'undefined') throw new Error('Run with the repository-pinned Bun 1.4.2 executable.');
  const pin = JSON.parse(readPlainFile(path.join(root, 'bend2/TOOLCHAIN.json')).toString('utf8'));
  assert.equal(Bun.version, pin.bunVersion, 'Diagnostic candidate re-bundle must use pinned Bun 1.4.2.');
  process.env.BEND_NO_TELEMETRY = '1';
  process.env.BEND_HUB = 'http://127.0.0.1:9';

  const inputDist = path.resolve(process.env.BEND_CANDIDATE_DIST || '');
  const inputRunRoot = assertRealCandidateDist(inputDist);
  const inputBuildPath = path.join(inputDist, 'build.json');
  const inputBuildBytes = readPlainFile(inputBuildPath);
  const inputBuild = JSON.parse(inputBuildBytes.toString('utf8'));
  const inputReceiptPath = path.join(inputRunRoot, 'receipt.json');
  const inputReceiptBytes = readPlainFile(inputReceiptPath);
  const inputReceipt = JSON.parse(inputReceiptBytes.toString('utf8'));
  assert.equal(inputBuild.candidate, true);
  assert.equal(inputBuild.draft, true);
  assert.equal(inputBuild.sourceDirty, true);
  assert.equal(inputBuild.compiler?.version, '2.0.28');
  assert.equal(inputBuild.compiler?.baseCommit, 'bc178404f4778704fa5584a73fcdf72bcdf9f32c');
  assert.equal(inputBuild.compiler?.patch006?.sha256, 'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344');
  assert.equal(inputReceipt.status, 'success');
  assert.equal(path.resolve(inputReceipt.dist), inputDist);
  assert.equal(inputReceipt.buildVersion, inputBuild.version);
  assert.deepEqual(inputReceipt.buildFiles, inputBuild.files);
  assert.match(inputReceipt.sourceInputs?.sha256 ?? '', /^[0-9a-f]{64}$/);
  verifyCandidateFiles(inputDist, inputBuild.files);

  const sourceBindings = [
    'bend2/platform/browser/worker-v2.ts',
    'bend2/platform/browser/sprite-helper.ts',
    'bend2/platform/browser/host.ts',
    'bend2/toolchain-patches/006-alias-equality/browser-abi-transform-2028.ts',
    'bend2/toolchain-patches/006-alias-equality/browser-abi-2028.ts',
  ];
  const currentSourceHashes: Record<string, string> = Object.create(null);
  for (const source of sourceBindings) {
    const expected = inputReceipt.sourceInputs.files?.[source];
    assert.match(expected ?? '', /^[0-9a-f]{64}$/, `Original source closure lacks ${source}`);
    currentSourceHashes[source] = sourceHash(path.join(root, ...source.split('/')));
    assert.equal(currentSourceHashes[source], expected, `Diagnostic input source drifted since candidate build: ${source}`);
  }

  const cacheSource = path.join(inputRunRoot, 'selected-js');
  const inputCacheManifestPath = path.join(cacheSource, 'manifest.json');
  const inputCacheManifestBytes = readPlainFile(inputCacheManifestPath);
  const inputCacheManifest = JSON.parse(inputCacheManifestBytes.toString('utf8'));
  assert.equal(inputCacheManifest.schema, 'rift-bend-2028-candidate-selected-cache/1');
  assert.equal(inputCacheManifest.compiler?.baseCommit, inputBuild.compiler.baseCommit);
  assert.equal(inputCacheManifest.compiler?.sourceTreeSha256, inputBuild.compiler.sourceTreeSha256);
  assert.equal(inputCacheManifest.compiler?.workerContractSourceTreeSha256,
    inputBuild.compiler.workerContractSourceTreeSha256);
  assert.equal(inputCacheManifest.compiler?.patch006Sha256, inputBuild.compiler.patch006.sha256);
  assert.deepEqual(inputCacheManifest.books, inputBuild.selectedBooks);
  for (const book of inputBuild.selectedBooks) {
    const compiled = path.join(cacheSource, `${book.name}.js`);
    assert.equal(sourceHash(compiled), book.sha256, `Selected-book cache changed: ${book.name}`);
  }
  const cacheHashesBefore = hashTree(cacheSource);

  const bindingSource = path.join(inputRunRoot, 'bot-library-raw/source-binding.json');
  const bindingBytes = readPlainFile(bindingSource);
  const bindingSha256 = sha256(bindingBytes);
  assert.equal(bindingSha256, inputBuild.bot.sourceBindingSha256);
  const binding = JSON.parse(bindingBytes.toString('utf8'));
  assert.equal(binding.compiler.baseCommit, inputBuild.compiler.baseCommit);
  assert.equal(binding.compiler.sourceTreeSha256, inputBuild.compiler.workerContractSourceTreeSha256);

  const nonce = crypto.randomUUID();
  const runRoot = path.join(candidateStore, `run-${Date.now()}-${nonce}`);
  const dist = path.join(runRoot, 'dist');
  const cache = path.join(runRoot, 'selected-js');
  const bundleStage = path.join(runRoot, 'diagnostic-bundles');
  fs.mkdirSync(runRoot, { recursive: false });
  const noncePath = path.join(runRoot, 'receipt.json');
  const receipt: Record<string, any> = {
    schema: 'rift-bend-browser-2028-candidate-bot-diagnostic-build/1',
    nonce, startedAt: new Date().toISOString(), status: 'running',
    dist, sourceRevision: inputBuild.sourceRevision,
    sourceDirty: true, compiler: inputBuild.compiler,
    inputDist, inputBuildSha256: sha256(inputBuildBytes), inputBuildReceiptSha256: sha256(inputReceiptBytes),
    inputSelectedCacheManifestSha256: sha256(inputCacheManifestBytes), selectedCacheHashes: cacheHashesBefore,
    sourceInputs: inputReceipt.sourceInputs, bot: inputReceipt.bot,
    network: { BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9', fetches: 0 },
  };
  failureReceiptPath = noncePath;
  failureReceipt = receipt;
  fs.mkdirSync(dist, { recursive: false });
  fs.mkdirSync(bundleStage, { recursive: false });
  fs.cpSync(cacheSource, cache, { recursive: true, errorOnExist: true, force: false });
  assert.deepEqual(hashTree(cache), cacheHashesBefore, 'Private diagnostic selected-cache copy differs from source.');
  fs.mkdirSync(path.join(runRoot, 'bot-library-raw'), { recursive: false });
  copyBoundFile(bindingSource, runRoot, 'bot-library-raw/source-binding.json');
  assert.equal(sourceHash(path.join(runRoot, 'bot-library-raw/source-binding.json')), bindingSha256);

  const builderSha256 = sourceHash(fileURLToPath(import.meta.url));
  const runnerSha256 = sourceHash(runnerPath);
  const diagnosticTransformPath = path.join(root,
    'bend2/toolchain-patches/006-alias-equality/browser-candidate-bot-diagnostic-transform-2028.ts');
  const diagnosticTransformSha256 = sourceHash(diagnosticTransformPath);
  const diagnosticPlugin = candidateBotDiagnosticPlugin(nonce);
  const bridgePluginHash = sourceHash(path.join(root,
    'bend2/toolchain-patches/006-alias-equality/browser-abi-transform-2028.ts'));
  const adapterHash = sourceHash(path.join(root,
    'bend2/toolchain-patches/006-alias-equality/browser-abi-2028.ts'));
  const buildPlugin = selectedBookPlugin(cache, inputBuild.selectedBooks);
  const scene = inputBuild.selectedBooks.find((book: any) => book.name === 'scene');
  assert.ok(scene?.sha256, 'Candidate scene selected-book binding is missing.');
  const common = { outdir: bundleStage, target: 'browser' as const, format: 'esm' as const,
    naming: '[name]-[hash].[ext]', minify: true, sourcemap: 'none' as const, splitting: false };

  const helperResult = await Bun.build({ ...common,
    entrypoints: [path.join(root, 'bend2/platform/browser/sprite-helper.ts')],
    define: { __BEND_SPRITE_SOURCE__: JSON.stringify(scene.sha256) },
    plugins: [candidateBridgePlugin, buildPlugin],
  });
  const helperOutput = await bundleRecord(helperResult, 'Sprite helper');
  const helperInputName = Object.keys(inputBuild.files).find((name) => /^sprite-helper-.+\.js$/.test(name));
  assert.ok(helperInputName, 'Prior candidate manifest lacks the sprite-helper bundle.');
  if (helperOutput.name === helperInputName)
    assert.equal(helperOutput.sha256, inputBuild.files[helperInputName], 'Diagnostic sprite helper unexpectedly differs.');

  const diagnosticProbe = await import('./browser-candidate-bot-diagnostic-transform-2028.ts');
  const probe = diagnosticProbe.transformCandidateBotWorker(
    readPlainFile(path.join(root, 'bend2/platform/browser/worker-v2.ts')).toString('utf8'), nonce);
  assert.deepEqual(probe.evidence.diagnosticAnchors, candidateBotDiagnosticAnchors);
  assert.equal(probe.evidence.sourceSha256, currentSourceHashes['bend2/platform/browser/worker-v2.ts']);
  assert.equal(probe.evidence.diagnosticSourceSha256, diagnosticTransformSha256);

  const workerResult = await Bun.build({ ...common,
    entrypoints: [path.join(root, 'bend2/platform/browser/worker-v2.ts')],
    define: { __BEND_SPRITE_HELPER__: JSON.stringify(`./${helperOutput.name}`),
      __BEND_SPRITE_SOURCE__: JSON.stringify(scene.sha256) },
    plugins: [diagnosticPlugin.plugin, buildPlugin],
  });
  const workerOutput = await bundleRecord(workerResult, 'Instrumented browser worker');
  const oldWorkerName = Object.keys(inputBuild.files).find((name) => /^worker-v2-.+\.js$/.test(name));
  assert.ok(oldWorkerName, 'Prior candidate manifest lacks the browser worker bundle.');
  assert.notEqual(workerOutput.name, oldWorkerName,
    'Diagnostic worker bundle unexpectedly matches the non-instrumented output name.');

  const hostResult = await Bun.build({ ...common,
    entrypoints: [path.join(root, 'bend2/platform/browser/host.ts')],
    define: { __BEND_WORKER__: JSON.stringify(`./${workerOutput.name}`) },
    plugins: [buildPlugin],
  });
  const hostOutput = await bundleRecord(hostResult, 'Browser host');
  const oldHostName = Object.keys(inputBuild.files).find((name) => /^host-.+\.js$/.test(name));
  assert.ok(oldHostName, 'Prior candidate manifest lacks the browser host bundle.');
  assert.notEqual(hostOutput.name, oldHostName, 'Diagnostic host bundle unexpectedly points to the old worker.');

  const predecessorBundleNames = [oldHostName, oldWorkerName];
  const excludedPredecessorBundles = new Map<string, { path: string; sha256: string; reason: string }>();
  for (const name of predecessorBundleNames) {
    excludedPredecessorBundles.set(name, { path: name, sha256: inputBuild.files[name],
      reason: 'replaced by the nonce-private diagnostic bundle' });
    const extensionless = name.replace(/\.js$/, '');
    for (const candidateName of Object.keys(inputBuild.files)) {
      if (candidateName === `${name}.map` || candidateName === `${extensionless}.map`) {
        excludedPredecessorBundles.set(candidateName, { path: candidateName,
          sha256: inputBuild.files[candidateName], reason: 'source map for replaced predecessor bundle' });
      }
    }
  }
  const excludedPredecessorBundleRecords = [...excludedPredecessorBundles.values()]
    .sort((a, b) => a.path.localeCompare(b.path, 'en'));

  const bridgeEvidence = candidateBridgeEvidence();
  const botDiagnosticEvidence = diagnosticPlugin.evidence();
  assert.equal(botDiagnosticEvidence.nonce, nonce);
  assert.equal(botDiagnosticEvidence.diagnosticSourceSha256, diagnosticTransformSha256);
  assert.equal(sourceHash(diagnosticTransformPath), diagnosticTransformSha256,
    'Diagnostic transform changed while bundling.');
  assert.equal(sourceHash(fileURLToPath(import.meta.url)), builderSha256,
    'Diagnostic build helper changed while bundling.');
  assert.equal(sourceHash(runnerPath), runnerSha256, 'Chrome route runner changed while bundling.');
  assert.equal(sourceHash(path.join(root, 'bend2/toolchain-patches/006-alias-equality/browser-abi-transform-2028.ts')),
    bridgePluginHash, 'Candidate ABI bridge plugin changed while bundling.');
  assert.equal(sourceHash(path.join(root, 'bend2/toolchain-patches/006-alias-equality/browser-abi-2028.ts')),
    adapterHash, 'Candidate ABI adapter changed while bundling.');
  assert.deepEqual(hashTree(cache), cacheHashesBefore, 'Selected-book cache changed during diagnostic bundling.');

  for (const [name, expected] of Object.entries(inputBuild.files)) {
    if (name === 'index.html' || name === 'sw.js' || excludedPredecessorBundles.has(name)) continue;
    const source = safePath(inputDist, name);
    const bytes = readPlainFile(source);
    writeCandidateFile(dist, name, bytes);
    assert.equal(sha256(bytes), expected, `Copied candidate input differs: ${name}`);
  }
  const files: Record<string, string> = Object.fromEntries(Object.entries(inputBuild.files)
    .filter(([name]) => name !== 'index.html' && name !== 'sw.js' && !excludedPredecessorBundles.has(name)));
  for (const bundle of [helperOutput, workerOutput, hostOutput]) {
    const target = safePath(dist, bundle.name);
    if (fs.existsSync(target)) {
      assert.equal(sourceHash(target), bundle.sha256,
        `Existing candidate file collides with diagnostic bundle: ${bundle.name}`);
    } else {
      writeCandidateFile(dist, bundle.name, bundle.bytes);
    }
    files[bundle.name] = bundle.sha256;
  }

  const indexBytes = readPlainFile(path.join(inputDist, 'index.html'));
  const oldIndexSha256 = sha256(indexBytes);
  let index = indexBytes.toString('utf8');
  assert.equal(index.split(`./${oldHostName}`).length - 1, 1, 'Prior index must reference the bound candidate host once.');
  index = index.replace(`./${oldHostName}`, `./${hostOutput.name}`);
  const updatedIndexBytes = Buffer.from(index, 'utf8');
  writeCandidateFile(dist, 'index.html', updatedIndexBytes);
  files['index.html'] = sha256(updatedIndexBytes);

  const sortedFiles = sortedMap(Object.fromEntries(Object.entries(files).filter(([name]) => name !== 'sw.js')));
  const version = sha256(JSON.stringify(sortedFiles)).slice(0, 20);
  const precache = ['./', './build.json', ...Object.keys(sortedFiles).map((name) => `./${name}`)];
  const swTemplatePath = path.join(root, 'bend2/platform/browser/sw.js');
  const swTemplateBytes = readPlainFile(swTemplatePath);
  let sw = swTemplateBytes.toString('utf8');
  assert.equal(sw.split('__BEND_BUILD__').length - 1, 1, 'Service worker template requires one build token.');
  assert.equal(sw.split('__BEND_ASSETS__').length - 1, 1, 'Service worker template requires one assets token.');
  sw = sw.replace('__BEND_BUILD__', version).replace('__BEND_ASSETS__', JSON.stringify(precache));
  const swBytes = Buffer.from(sw, 'utf8');
  writeCandidateFile(dist, 'sw.js', swBytes);
  files['sw.js'] = sha256(swBytes);

  const diagnosticBuild = {
    schema: 'rift-bend-candidate-browser-bot-route-diagnostic/1', nonce,
    inputDist: rel(inputDist), inputBuildVersion: inputBuild.version,
    inputBuildSha256: sha256(inputBuildBytes),
    inputBuildReceiptSha256: sha256(inputReceiptBytes),
    inputSelectedCacheManifestSha256: sha256(inputCacheManifestBytes),
    sourceRevision: inputBuild.sourceRevision, sourceDirty: true,
    selectedCacheHashes: cacheHashesBefore,
    predecessor: { buildVersion: inputBuild.version,
      hostPath: oldHostName, workerPath: oldWorkerName },
    excludedPredecessorBundles: excludedPredecessorBundleRecords,
    selectedBooks: inputBuild.selectedBooks,
    worker: {
      ...botDiagnosticEvidence,
      bundlePath: workerOutput.name, bundleSha256: workerOutput.sha256,
    },
    browserBridge: bridgeEvidence,
    buildHelperPath: rel(fileURLToPath(import.meta.url)), buildHelperSha256: builderSha256,
    diagnosticTransformPath: rel(diagnosticTransformPath), diagnosticTransformSha256,
    chromeRunnerPath: rel(runnerPath), chromeRunnerSha256: runnerSha256,
    abiBridgePluginPath: bridgeEvidence.adapterPath.replace('browser-abi-2028.ts', 'browser-abi-transform-2028.ts'),
    abiBridgePluginSha256: bridgePluginHash,
    abiAdapterPath: bridgeEvidence.adapterPath, abiAdapterSha256: adapterHash,
    staticInputs: { priorIndexSha256: oldIndexSha256,
      serviceWorkerTemplatePath: rel(swTemplatePath), serviceWorkerTemplateSha256: sha256(swTemplateBytes) },
    helper: { path: helperOutput.name, sha256: helperOutput.sha256 },
    host: { path: hostOutput.name, sha256: hostOutput.sha256 },
    workerLibraries: inputBuild.workerLibraries,
  };

  const build = structuredClone(inputBuild);
  build.builtAt = new Date().toISOString();
  build.sourceDirty = true;
  build.draft = true;
  build.candidate = true;
  build.version = version;
  build.application = 'Nonce-private diagnostic re-bundle of a Bend 2.0.28 candidate; bot route probe only, not pinned or published.';
  build.browserBridge = bridgeEvidence;
  build.diagnosticBotRoute = diagnosticBuild;
  build.files = { ...sortedFiles, 'sw.js': files['sw.js'] };
  const buildBytes = Buffer.from(`${JSON.stringify(build, null, 2)}\n`, 'utf8');
  writeCandidateFile(dist, 'build.json', buildBytes);

  assert.equal(sourceHash(inputBuildPath), sha256(inputBuildBytes), 'Prior candidate build.json changed during diagnostic build.');
  assert.equal(sourceHash(inputReceiptPath), sha256(inputReceiptBytes), 'Prior candidate receipt changed during diagnostic build.');
  verifyCandidateFiles(inputDist, inputBuild.files);
  verifyCandidateFiles(dist, build.files);
  assert.equal(sourceHash(path.join(dist, 'build.json')), sha256(buildBytes));

  receipt.status = 'success';
  receipt.finishedAt = new Date().toISOString();
  receipt.buildVersion = version;
  receipt.buildSha256 = sha256(buildBytes);
  receipt.buildFiles = build.files;
  // Keep the successful build receipt's complete BotAdapter evidence, including
  // the path to the immutable prior Node warmup/call receipt. build.json carries
  // the reduced browser-facing bot manifest separately.
  receipt.diagnosticBotRoute = diagnosticBuild;
  receipt.excludedPredecessorBundles = excludedPredecessorBundleRecords;
  receipt.browserBridge = bridgeEvidence;
  receipt.bundleOutputs = { helper: helperOutput, worker: workerOutput, host: hostOutput };
  receipt.deniedFetches = [];
  receipt.dist = dist;
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  fs.writeFileSync(noncePath, receiptBytes, { flag: 'wx' });
  console.log(JSON.stringify({ status: 'success', dist, receipt: noncePath, version,
    diagnosticNonce: nonce, workerPath: workerOutput.name, workerSha256: workerOutput.sha256,
    sourceSha256: botDiagnosticEvidence.sourceSha256,
    diagnosticTransformedSha256: botDiagnosticEvidence.diagnosticTransformedSha256,
    selectedCacheManifestSha256: sha256(inputCacheManifestBytes) }));
}

let failureReceiptPath: string | null = null;
let failureReceipt: Record<string, any> | null = null;
try {
  await main();
} catch (error) {
  const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
  if (failureReceipt && failureReceiptPath && !fs.existsSync(failureReceiptPath)) {
    failureReceipt.status = 'failed';
    failureReceipt.failure = message.slice(0, 16000);
    failureReceipt.finishedAt = new Date().toISOString();
    try { fs.writeFileSync(failureReceiptPath, `${JSON.stringify(failureReceipt, null, 2)}\n`, { flag: 'wx' }); }
    catch (receiptError) { console.error(`Could not preserve diagnostic failure receipt: ${String(receiptError)}`); }
  }
  console.error(JSON.stringify({ status: 'failed', failure: message.slice(0, 16000) }));
  process.exitCode = 1;
}
