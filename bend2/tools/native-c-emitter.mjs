import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runtimeFile = path.join(root, 'bend2/core/v2/proof-runtime.json');
const toolchainFile = path.join(root, 'bend2/TOOLCHAIN.json');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function runtimeMetadata() {
  const metadata = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
  if (process.version !== metadata.runtime.version
    || process.platform !== metadata.runtime.platform
    || process.arch !== metadata.runtime.arch
    || digest(fs.readFileSync(process.execPath)) !== metadata.runtime.sha256) {
    throw new Error('The native C emitter Node runtime differs from proof-runtime.json.');
  }
  return metadata;
}

function assertPinnedCompiler() {
  const pin = JSON.parse(fs.readFileSync(toolchainFile, 'utf8'));
  const compilerRoot = path.join(root, '.artifacts/toolchains/bend');
  const head = spawnSync('git', ['-C', compilerRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const dirty = spawnSync('git', ['-C', compilerRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
  if (head.status !== 0 || head.stdout.trim() !== pin.bendCommit
    || dirty.status !== 0 || dirty.stdout.trim()) {
    throw new Error('Pinned Bend compiler commit/cleanliness check failed.');
  }
  return pin;
}

function bunRuntime() {
  const pin = JSON.parse(fs.readFileSync(toolchainFile, 'utf8'));
  const raw = process.env.BUN_BIN;
  const executable = raw
    ? path.resolve(root, raw)
    : path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
  if (!fs.existsSync(executable)) throw new Error(`Pinned Bun executable is missing: ${executable}`);
  const version = spawnSync(executable, ['--version'], { encoding: 'utf8' });
  if (version.status !== 0 || version.stdout.trim() !== pin.bunVersion) {
    throw new Error('Bun runtime version differs from TOOLCHAIN.json.');
  }
  const relative = path.relative(root, executable);
  return {
    version: version.stdout.trim(),
    executable: relative && !relative.startsWith('..') && !path.isAbsolute(relative)
      ? relative.replaceAll('\\', '/') : 'BUN_BIN',
    executableSha256: digest(fs.readFileSync(executable)),
  };
}

function boundedTimeout(value) {
  const timeout = Number(value ?? process.env.BEND_TIMEOUT_MS ?? 600000);
  if (!Number.isSafeInteger(timeout) || timeout < 1000 || timeout > 900000) {
    throw new Error('Invalid bounded native C emission timeout.');
  }
  return timeout;
}

export function nativeEmitterRuntime() {
  const metadata = runtimeMetadata();
  return {
    name: metadata.runtime.name,
    version: process.version,
    executableSha256: metadata.runtime.sha256,
    platform: process.platform,
    arch: process.arch,
    workerStackSizeMb: metadata.worker.stackSizeMb,
    workerExecArgv: metadata.worker.execArgv,
    api: 'pinned Bend book_load + book_valid + book_owned(SYNTH) + compile_book',
  };
}

export function emitNativeC(input, output, options = {}) {
  const metadata = runtimeMetadata();
  const pin = assertPinnedCompiler();
  const timeout = boundedTimeout(options.timeoutMs);
  const source = path.resolve(input).replaceAll('\\', '/');
  const destination = path.resolve(output);
  if (!fs.existsSync(source)) throw new Error(`Missing Bend input: ${source}`);
  if (fs.existsSync(destination)) throw new Error(`C output already exists: ${destination}`);
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--threaded-emit', source, destination], {
    cwd: path.join(root, '.artifacts/toolchains/bend/bend2'),
    env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_TIMEOUT_MS: String(timeout) },
    encoding: 'utf8',
    timeout: timeout + 10000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Pinned Node C emitter failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Pinned Node C emitter failed: ${result.stderr || result.stdout}`);
  let emitted;
  try {
    emitted = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Pinned Node C emitter returned an invalid receipt: ${result.stdout}`);
  }
  if (!emitted.ok || !fs.existsSync(destination)) throw new Error('Pinned Node C emitter reported no C source.');
  const cSource = fs.readFileSync(destination);
  if (cSource.length !== emitted.bytes || digest(cSource) !== emitted.sha256) {
    throw new Error('Pinned Node C emitter output changed after worker completion.');
  }
  return { ...emitted, runtime: nativeEmitterRuntime(), bendCommit: pin.bendCommit, timeoutMs: timeout };
}

if (!isMainThread) {
  let Bend;
  try {
    const compiler = path.join(root, '.artifacts/toolchains/bend/bend2');
    Bend = await import(pathToFileURL(path.join(compiler, 'bend.ts')).href);
    const Comp = await import(pathToFileURL(path.join(compiler, 'comp.ts')).href);
    const book = Bend.book_nil();
    await Bend.book_load(book, workerData.source, '', new Map());
    Bend.book_valid(book);
    Comp.book_owned(book, Comp.SYNTH);
    const holes = book.hols + book.open;
    if (holes > 0) throw new Error(`${holes} TODOs found; refusing C emission.`);
    const source = Comp.compile_book(book);
    const temporary = `${workerData.destination}.worker-tmp`;
    fs.writeFileSync(temporary, source, { flag: 'wx' });
    fs.renameSync(temporary, workerData.destination);
    parentPort.postMessage({
      ok: true,
      bytes: Buffer.byteLength(source),
      sha256: digest(fs.readFileSync(workerData.destination)),
    });
  } catch (error) {
    const detail = error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.stack || String(error);
    parentPort.postMessage({ ok: false, error: detail });
  }
} else if (process.argv[2] === '--threaded-emit') {
  const source = process.argv[3];
  const destination = process.argv[4];
  try {
    if (!source || !destination) throw new Error('Usage: native-c-emitter.mjs --threaded-emit INPUT OUTPUT');
    const metadata = runtimeMetadata();
    const pin = assertPinnedCompiler();
    const timeout = boundedTimeout();
    const result = await new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), {
        workerData: { source, destination },
        resourceLimits: { stackSizeMb: metadata.worker.stackSizeMb },
        execArgv: metadata.worker.execArgv,
      });
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        void worker.terminate();
        reject(new Error(`Pinned Node C emission timed out after ${timeout} ms.`));
      }, timeout);
      worker.once('message', (message) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!message.ok) reject(new Error(message.error));
        else resolve(message);
      });
      worker.once('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
      worker.once('exit', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Pinned Node C emitter exited without a result (code ${code}).`));
      });
    });
    console.log(JSON.stringify({ ok: true, ...result, runtime: nativeEmitterRuntime(), bendCommit: pin.bendCommit, timeoutMs: timeout }));
  } catch (error) {
    console.error(error.stack || String(error));
    process.exitCode = 1;
  }
}

function writeImmutable(file, bytes) {
  fs.writeFileSync(file, bytes, { flag: 'wx' });
}

function stamp() {
  return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

function compileWithBun(input, output, log) {
  const result = spawnSync(process.execPath, [path.join(root, 'bend2/tools/bend.mjs'),
    path.resolve(input).replaceAll('\\', '/'), '-o', path.resolve(output).replaceAll('\\', '/')], {
    cwd: root,
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  writeImmutable(log, `${result.stdout || ''}${result.stderr || ''}`);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Pinned Bun C comparison failed; see ${path.relative(root, log)}.`);
}

async function compareEmitters() {
  assertPinnedCompiler();
  const runtime = nativeEmitterRuntime();
  const bun = bunRuntime();
  const directory = path.join(root, `.artifacts/bend2/native/emitter-parity-${stamp()}`);
  fs.mkdirSync(directory, { recursive: false });
  const sample = path.join(directory, 'sample.bend');
  const bunC = path.join(directory, 'bun.c');
  const nodeC = path.join(directory, 'node.c');
  writeImmutable(sample, 'import Base\ndef main() -> IO(Unit):\n  IO.print("native C emitter parity")\n');
  compileWithBun(sample, bunC, path.join(directory, 'bun.log'));
  const nodeResult = await emitNativeC(sample, nodeC, { timeoutMs: 120000 });
  const bunBytes = fs.readFileSync(bunC);
  const nodeBytes = fs.readFileSync(nodeC);
  if (!bunBytes.equals(nodeBytes)) throw new Error('Bun and Node C emitter outputs differ for the parity sample.');
  const receipt = {
    schema: 'rift-bend-c-emitter-parity/1',
    checkedAt: new Date().toISOString(),
    compilerCommit: nodeResult.bendCommit,
    sampleSha256: digest(fs.readFileSync(sample)),
    bunCSourceSha256: digest(bunBytes),
    nodeCSourceSha256: digest(nodeBytes),
    byteIdentical: true,
    bunRuntime: bun,
    nodeRuntime: runtime,
    note: 'Small pinned C-emitter parity only; does not prove the full application emits or executes.',
  };
  writeImmutable(path.join(directory, 'parity.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ directory: path.relative(root, directory).replaceAll('\\', '/'), ...receipt }, null, 2));
}

if (isMainThread && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--compare')) compareEmitters().catch((error) => {
    console.error(error.stack || String(error));
    process.exitCode = 1;
  });
}
