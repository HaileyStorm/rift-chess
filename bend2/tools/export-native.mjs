import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, digest, verifyFreeze } from './freeze.mjs';
import { verifyV2 } from './freeze-v2.mjs';
import { verifyLibrary } from './verify-library.mjs';
import { emitNativeC, nativeEmitterRuntime } from './native-c-emitter.mjs';

const native = path.join(root, 'bend2/Native.bend');
const toolchain = path.join(root, 'bend2/TOOLCHAIN.json');
const emitter = path.join(root, 'bend2/tools/native-c-emitter.mjs');
const proofRuntime = path.join(root, 'bend2/core/v2/proof-runtime.json');
const ignoredOut = path.join(root, '.artifacts/bend2/native');

function fail(message) {
  throw new Error(`native export: ${message}`);
}

function compilerPin() {
  const pin = JSON.parse(fs.readFileSync(toolchain, 'utf8'));
  const compilerRoot = path.join(root, '.artifacts/toolchains/bend');
  const head = spawnSync('git', ['-C', compilerRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (head.status !== 0 || head.stdout.trim() !== pin.bendCommit) {
    fail(`Bend compiler revision differs from TOOLCHAIN.json (expected ${pin.bendCommit}).`);
  }
  return { pin, compilerRoot };
}

function checkedPath(file) {
  const absolute = path.resolve(file);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`import escapes the repository: ${file}`);
  }
  return absolute;
}

function sourceClosure(entry) {
  const found = new Set();
  const visit = (file) => {
    const absolute = checkedPath(file);
    if (found.has(absolute)) return;
    if (!fs.existsSync(absolute)) fail(`missing imported source ${path.relative(root, absolute)}`);
    found.add(absolute);
    const source = fs.readFileSync(absolute, 'utf8');
    for (const match of source.matchAll(/^\s*import\s+([^\s#]+)/gm)) {
      const spec = match[1].replace(/^['"]|['"]$/g, '');
      if (spec === 'Base' || !spec.startsWith('.')) continue;
      const imported = path.resolve(path.dirname(absolute), spec.endsWith('.bend') ? spec : `${spec}.bend`);
      visit(imported);
    }
  };
  visit(entry);
  return [...found].sort((a, b) => a.localeCompare(b));
}

function hashInputs(files) {
  return Object.fromEntries(files.map((file) => [path.relative(root, file).replaceAll('\\', '/'), digest(fs.readFileSync(file))]));
}

function runBend(args, label, logPath) {
  const result = spawnSync(process.execPath, [path.join(root, 'bend2/tools/bend.mjs'), ...args], {
    cwd: root,
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
    encoding: 'utf8',
    timeout: Number(process.env.BEND_TIMEOUT_MS || 600000),
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  fs.writeFileSync(logPath, output, { flag: 'wx' });
  if (result.error) fail(`${label} failed to start: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} failed; see ${path.relative(root, logPath)}`);
  return { output, status: result.status };
}

function compareEmitters(logPath, pin) {
  const result = spawnSync(process.execPath, [emitter, '--compare'], {
    cwd: root,
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
    encoding: 'utf8',
    timeout: 160000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  fs.writeFileSync(logPath, output, { flag: 'wx' });
  if (result.error) fail(`Bun/Node C-emitter comparison failed: ${result.error.message}`);
  if (result.status !== 0) fail(`Bun/Node C-emitter comparison failed; see ${path.relative(root, logPath)}`);
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    fail(`Bun/Node C-emitter comparison returned invalid JSON; see ${path.relative(root, logPath)}`);
  }
  if (report.schema !== 'rift-bend-c-emitter-parity/1' || report.byteIdentical !== true
    || report.compilerCommit !== pin.bendCommit) {
    fail('Bun/Node C-emitter parity receipt does not match the pinned compiler.');
  }
  const receiptPath = checkedPath(path.join(root, report.directory, 'parity.json'));
  const receiptBytes = fs.readFileSync(receiptPath);
  const receipt = JSON.parse(receiptBytes);
  if (receipt.byteIdentical !== true || receipt.compilerCommit !== pin.bendCommit
    || receipt.nodeRuntime?.executableSha256 !== report.nodeRuntime?.executableSha256) {
    fail('Bun/Node C-emitter parity receipt is inconsistent.');
  }
  return {
    path: path.relative(root, receiptPath).replaceAll('\\', '/'),
    file: receiptPath,
    sha256: digest(receiptBytes),
    receipt,
  };
}

function uniqueStamp() {
  const base = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  let suffix = '';
  let n = 0;
  while (fs.existsSync(path.join(ignoredOut, `${base}${suffix}`))) suffix = `-${++n}`;
  return `${base}${suffix}`;
}

function writeImmutable(file, bytes) {
  fs.writeFileSync(file, bytes, { flag: 'wx' });
}

function main() {
  if (!process.argv.includes('--experimental-gui-c')) {
    console.error('The graphical Native C emitter timed out after 600 seconds; this route is experimental. Use bend2/tools/export-native-cli.mjs for the supported text CLI C export. Pass --experimental-gui-c only to retry the bounded diagnostic.');
    process.exitCode = 2;
    return;
  }
  if (!fs.existsSync(native)) fail(`missing ${path.relative(root, native)}; write the Native entrypoint first.`);
  const { pin, compilerRoot } = compilerPin();
  const draft = process.argv.includes('--draft');
  const semantic = verifyFreeze('core');
  const pixels = verifyFreeze('graphics');
  const v2 = draft ? null : verifyV2();
  const library = verifyLibrary();
  const sources = sourceClosure(native);
  const sourceInputs = hashInputs(sources);
  const inputs = { ...sourceInputs };
  inputs['bend2/TOOLCHAIN.json'] = digest(fs.readFileSync(toolchain));
  inputs['bend2/core/v2/proof-runtime.json'] = digest(fs.readFileSync(proofRuntime));
  inputs['bend2/tools/native-c-emitter.mjs'] = digest(fs.readFileSync(emitter));
  inputs['bend2/tools/export-native.mjs'] = digest(fs.readFileSync(fileURLToPath(import.meta.url)));

  fs.mkdirSync(ignoredOut, { recursive: true });
  const stamp = uniqueStamp();
  const out = path.join(ignoredOut, stamp);
  fs.mkdirSync(out, { recursive: false });
  const cFile = path.join(out, 'rift-chess-native.c');
  const checkLog = path.join(out, 'check-only.log');
  const emitLog = path.join(out, 'emit-c.log');
  const parityLog = path.join(out, 'emitter-parity.log');
  const inputPath = path.relative(root, native).replaceAll('\\', '/');
  const absoluteNative = native.replaceAll('\\', '/');

  runBend([absoluteNative, '--check-only'], 'source check', checkLog);
  const parity = compareEmitters(parityLog, pin);
  writeImmutable(path.join(out, 'emitter-parity.json'), fs.readFileSync(parity.file));
  const emitTimeout = Number(process.env.BEND_TIMEOUT_MS || 600000);
  let emitResult;
  try {
    emitResult = emitNativeC(native, cFile, { timeoutMs: emitTimeout });
  } catch (error) {
    writeImmutable(emitLog, `${JSON.stringify({
      schema: 'rift-bend-native-c-emission-failure/1',
      phase: 'pinned Bend C emission via book_load + book_valid + book_owned(SYNTH) + compile_book',
      nativeInput: inputPath,
      bendCommit: pin.bendCommit,
      nodeRuntime: nativeEmitterRuntime(),
      timeoutMs: emitTimeout,
      sourceCheckLog: path.relative(root, checkLog).replaceAll('\\', '/'),
      parityReceiptSha256: parity.sha256,
      cSourceWritten: fs.existsSync(cFile),
      error: error?.stack || String(error),
    }, null, 2)}\n`, { flag: 'wx' });
    throw error;
  }
  fs.writeFileSync(emitLog, `${JSON.stringify(emitResult, null, 2)}\n`, { flag: 'wx' });
  if (!fs.existsSync(cFile)) fail('compiler reported success without emitting C source.');
  const after = hashInputs(sources);
  if (JSON.stringify(after) !== JSON.stringify(sourceInputs)) fail('input source changed during export; discard this receipt.');
  for (const [relative, hash] of Object.entries(inputs)) {
    if (digest(fs.readFileSync(path.join(root, relative))) !== hash) {
      fail(`export input changed during C emission; discard this receipt: ${relative}`);
    }
  }

  const manifest = {
    schema: 'rift-chess-native-export/1',
    createdAt: new Date().toISOString(),
    input: inputPath,
    compiler: {
      bendVersion: pin.bendVersion,
      bendCommit: pin.bendCommit,
      compilerRoot: path.relative(root, compilerRoot).replaceAll('\\', '/'),
      bunVersion: pin.bunVersion,
      telemetry: 'BEND_NO_TELEMETRY=1',
    },
    emitter: {
      tool: path.relative(root, emitter).replaceAll('\\', '/'),
      toolSha256: inputs['bend2/tools/native-c-emitter.mjs'],
      runtime: emitResult.runtime,
      method: '64 MiB pinned Node worker; pinned compiler book_load + book_valid + book_owned(SYNTH) + compile_book',
      comparisonBunRuntime: parity.receipt.bunRuntime,
      parityReceipt: 'emitter-parity.json',
      parityReceiptSha256: parity.sha256,
      parityDiagnosticPath: parity.path,
    },
    frozen: {
      semanticManifestSha256: semantic.sha256,
      pixelManifestSha256: pixels.sha256,
      v2ManifestSha256: v2 ? v2.sha256 : null,
      v2Draft: draft,
      graphicsLibraryVerificationSha256: digest(fs.readFileSync(path.join(root, 'bend2/lib/graphics/VERIFICATION.json'))),
      graphicsLibrary: library,
    },
    inputs,
    exporterSha256: inputs['bend2/tools/export-native.mjs'],
    cSource: 'rift-chess-native.c',
    cSourceSha256: digest(fs.readFileSync(cFile)),
    runtime: 'portable C emission only; native window/audio execution is unverified',
  };
  const manifestFile = path.join(out, 'manifest.json');
  writeImmutable(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  const manifestSha = digest(fs.readFileSync(manifestFile));
  writeImmutable(path.join(out, 'manifest.sha256'), `${manifestSha}  manifest.json\n`);
  writeImmutable(path.join(out, 'rift-chess-native.c.sha256'), `${manifest.cSourceSha256}  rift-chess-native.c\n`);
  console.log(JSON.stringify({
    manifest: path.relative(root, manifestFile).replaceAll('\\', '/'),
    manifestSha256: manifestSha,
    cSource: path.relative(root, cFile).replaceAll('\\', '/'),
    cSourceSha256: manifest.cSourceSha256,
    emitterRuntime: emitResult.runtime,
    parityReceipt: parity.path,
    parityReceiptSha256: parity.sha256,
    inputCount: Object.keys(inputs).length,
    runtime: manifest.runtime,
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
