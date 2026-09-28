// Draft next-version checker for unchanged frozen v2 proof sources. Unlike the
// frozen v2 entry point, this uses the candidate-compatible compiler-owned
// guard and a separately hash-bound whole-book dependency verdict.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runtimeFile = path.join(root, 'bend2/core/v3/proof-runtime.json');
const authorityFile = path.join(root, 'bend2/core/v3/proof-authority.mjs');
const compiler = path.join(root, '.artifacts/toolchains/bend');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function localSources(file, found = new Map()) {
  const real = fs.realpathSync(file);
  if (!real.startsWith(fs.realpathSync(root) + path.sep) ||
      !real.endsWith('.bend')) throw Error(`Proof source escaped local Bend tree: ${real}`);
  if (found.has(real)) return found;
  const bytes = fs.readFileSync(real);
  found.set(real, sha(bytes));
  const text = bytes.toString('utf8');
  // book_load trims each line and processes imports only before the first
  // non-comment declaration. A function-body foreign import is not a book import.
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^import[ \t]+([^ \t#]+)(?:[ \t]+as[ \t]+[A-Za-z_][A-Za-z0-9_]*)?[ \t]*(?:#.*)?$/);
    if (!match) break;
    const spec = match[1];
    if (spec === 'Base') continue;
    if (!spec.startsWith('./') && !spec.startsWith('../'))
      throw Error(`Proof import is not local: ${real} -> ${spec}`);
    localSources(path.resolve(path.dirname(real), spec), found);
  }
  return found;
}

if (isMainThread) {
  process.env.BEND_NO_TELEMETRY = '1';
  const runtimeBytes = fs.readFileSync(runtimeFile);
  const metadata = JSON.parse(runtimeBytes);
  if (metadata.schema !== 'rift-bend-v3-proof-runtime-draft/1' ||
      process.version !== metadata.runtime.version ||
      process.platform !== metadata.runtime.platform ||
      process.arch !== metadata.runtime.arch ||
      sha(fs.readFileSync(process.execPath)) !== metadata.runtime.sha256)
    throw Error('Draft proof runtime does not match proof-runtime.json.');
  if (sha(fs.readFileSync(authorityFile)) !== metadata.authoritySha256)
    throw Error('Draft proof authority changed without runtime review.');
  const pinFile = path.join(root, 'bend2/TOOLCHAIN.json');
  const pinBytes = fs.readFileSync(pinFile);
  const pin = JSON.parse(pinBytes);
  const head = spawnSync('git', ['-C', compiler, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const dirty = spawnSync('git', ['-C', compiler, 'status', '--porcelain', '--untracked-files=no'],
    { encoding: 'utf8' });
  if (head.status !== 0 || head.stdout.trim() !== pin.bendCommit ||
      dirty.status !== 0 || dirty.stdout.trim())
    throw Error('Pinned Bend compiler commit/cleanliness check failed.');
  const input = process.argv[2];
  if (!input) throw Error('Usage: node bend2/core/v3/node-check.mjs file.bend');
  const file = path.resolve(input).replaceAll('\\', '/');
  const sources = Object.fromEntries(localSources(file));
  const aggregate = fs.realpathSync(file) ===
    fs.realpathSync(path.join(root, 'bend2/core/v2/CHECK.bend'));
  const semanticFile = path.join(root, 'bend2/laws/semantic-v2.json');
  if (aggregate) {
    const semanticBytes = fs.readFileSync(semanticFile);
    if (sha(semanticBytes) !== metadata.frozenSemanticV2Sha256)
      throw Error('Frozen v2 semantic manifest changed.');
    const frozen = JSON.parse(semanticBytes);
    if (Object.keys(sources).length !== 56 ||
        Object.entries(sources).some(([name, digest]) =>
          frozen.files[path.relative(root, name).replaceAll('\\', '/')] !== digest))
      throw Error('Frozen v2 aggregate proof source closure changed.');
  }
  const checkerSha256 = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
  const timeout = Number(process.env.BEND_TIMEOUT_MS || 300000);
  if (!Number.isSafeInteger(timeout) || timeout < 1000 || timeout > 900000)
    throw Error('Invalid bounded proof timeout.');
  const closureEntries = Object.entries(sources)
    .map(([name, digest]) => [path.relative(root, name).replaceAll('\\', '/'), digest])
    .sort(([a], [b]) => a.localeCompare(b));
  if (process.argv.includes('--preflight-only')) {
    console.log(JSON.stringify({ draft: true, aggregate, sources: Object.keys(sources).length,
      closureSha256: sha(Buffer.from(JSON.stringify(closureEntries), 'utf8')),
      pin: pin.bendCommit, authoritySha256: metadata.authoritySha256 }));
  } else {
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { file, sources, authoritySha256: metadata.authoritySha256 },
    resourceLimits: { stackSizeMb: metadata.worker.stackSizeMb,
      maxOldGenerationSizeMb: metadata.worker.maxOldGenerationSizeMb },
    execArgv: metadata.worker.execArgv,
  });
  let verdict = null, failed = false, timedOut = false;
  const timer = setTimeout(() => {
    console.error('Error: bounded draft proof check timed out.');
    timedOut = true;
    process.exitCode = 1;
    void worker.terminate();
  }, timeout);
  worker.on('message', message => {
    if (verdict !== null) failed = true;
    verdict = message;
  });
  worker.on('error', error => {
    console.error(error.stack || String(error));
    failed = true;
    process.exitCode = 1;
  });
  worker.on('exit', code => {
    clearTimeout(timer);
    const afterHead = spawnSync('git', ['-C', compiler, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    const afterDirty = spawnSync('git', ['-C', compiler, 'status', '--porcelain', '--untracked-files=no'],
      { encoding: 'utf8' });
    const stable = sha(fs.readFileSync(authorityFile)) === metadata.authoritySha256 &&
      sha(fs.readFileSync(runtimeFile)) === sha(runtimeBytes) &&
      sha(fs.readFileSync(pinFile)) === sha(pinBytes) &&
      Object.entries(sources).every(([name, digest]) => sha(fs.readFileSync(name)) === digest) &&
      (!aggregate || sha(fs.readFileSync(semanticFile)) === metadata.frozenSemanticV2Sha256) &&
      sha(fs.readFileSync(fileURLToPath(import.meta.url))) === checkerSha256 &&
      afterHead.status === 0 && afterHead.stdout.trim() === pin.bendCommit &&
      afterDirty.status === 0 && !afterDirty.stdout.trim();
    if (!timedOut && !failed && code === 0 && verdict?.ok && stable) {
      console.log('All terms check.');
    } else {
      if (verdict && !verdict.ok) console.error(verdict.error);
      else if (!stable) console.error('Error: draft proof inputs or compiler changed during check.');
      else if (!timedOut && !failed) console.error(`Error: proof worker exited ${code} without a clean verdict.`);
      process.exitCode = 1;
    }
  });
  }
} else {
  let Bend;
  let deniedFetches = 0;
  globalThis.fetch = async () => { deniedFetches++; throw Error('Draft proof network fetch denied'); };
  try {
    if (sha(fs.readFileSync(authorityFile)) !== workerData.authoritySha256)
      throw Error('Draft proof authority changed before worker import.');
    const { proofVerdict } = await import(pathToFileURL(authorityFile).href);
    Bend = await import(pathToFileURL(path.join(compiler, 'bend2/bend.ts')).href);
    const Comp = await import(pathToFileURL(path.join(compiler, 'bend2/comp.ts')).href);
    const book = Bend.book_nil(), seen = new Map();
    await Bend.book_load(book, workerData.file, '', seen);
    const base = fs.realpathSync(path.join(compiler, 'bend2/base.bend'));
    const loaded = [];
    for (const name of seen.keys()) {
      const real = fs.realpathSync(name);
      if (real === base) continue;
      if (!real.startsWith(fs.realpathSync(root) + path.sep) ||
          real.startsWith(fs.realpathSync(compiler) + path.sep))
        throw Error(`Loaded proof source escaped bound local closure: ${real}`);
      loaded.push(real);
    }
    loaded.sort();
    const expected = Object.keys(workerData.sources).sort();
    if (JSON.stringify(loaded) !== JSON.stringify(expected) ||
        expected.some(name => sha(fs.readFileSync(name)) !== workerData.sources[name]))
      throw Error('Loaded proof import closure differs from bound source bytes.');
    const laws = path.join(path.dirname(workerData.file), 'LAWS.bend');
    if (path.basename(workerData.file) === 'PROOF.bend' &&
        fs.existsSync(laws) && !seen.has(fs.realpathSync(laws)))
      throw Error('PROOF.bend must import ./LAWS.bend');
    Bend.book_valid(book);
    Comp.js_lib(book, [], [], { internal: true });
    proofVerdict(Bend, book);
    if (deniedFetches) throw Error(`${deniedFetches} remote fetch attempts denied`);
    parentPort.postMessage({ ok: true });
  } catch (error) {
    parentPort.postMessage({ ok: false,
      error: error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.stack || String(error) });
  }
}
