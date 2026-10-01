// Pure, platform-independent controls for the interactive gate; no X11, ALSA,
// package, compiler, or native executable is touched.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import {
  CANDIDATE_COMMIT, CANDIDATE_TREE, CANONICAL_COMMIT, EXPECTED_PACKAGE_PATHS,
  NATIVE_PATCHED_SHA256, SCOUT_COMMIT,
} from '../common.mjs';
import {
  assertMaskedRasterEqual, assertOutputRootIgnored, assertPackageReceiptShape, assertPcmMoveEvidence,
  assertWindowProperties, assertZoomDirection, decodePng, expectedMoveActionId,
  assertNativeProcessBinding, parseArguments, parseStoreFile, parseWindowInfo, pcmRms16Stereo,
  assertPcmCaptureDuration, assertPcmCaptureOverlapsMove, assertRootBindingUnchanged,
  awaitNativeClose, observeCapturePromise, observeNativeChild, processGroupState,
  requireCapturePending, withObservedCapture,
  classifyInteractiveAcceptance, readLogicalSlot, relaunchRimMask, squareInputPoint,
  validatePersistedState, windowIdForOwnedSession,
} from './run.mjs';

const hash = (text) => createHash('sha256').update(text).digest('hex');
const candidatePath = path.resolve('candidate-fixture');
const packageReceiptPath = path.resolve('package-receipt-fixture.json');

assert.deepEqual(parseArguments(['--candidate', candidatePath, '--package', packageReceiptPath,
  '--package-sha256', 'a'.repeat(64)]), {
  candidate: candidatePath, packageReceipt: packageReceiptPath, packageReceiptSha256: 'a'.repeat(64),
});
assert.throws(() => parseArguments([]), /usage:/);
assert.throws(() => parseArguments(['--candidate', 'relative', '--package', packageReceiptPath,
  '--package-sha256', 'a'.repeat(64)]), /absolute/);
assert.throws(() => parseArguments(['--candidate', candidatePath, '--package', packageReceiptPath,
  '--package-sha256', 'A'.repeat(64)]), /lowercase SHA/);
let ignoreProbe = null;
assert.equal(assertOutputRootIgnored((executable, args, options) => {
  ignoreProbe = { executable, args, options }; return { status: 0 };
}, '/workspace', '.artifacts/bend2/native-v2-2032-linux'), true);
assert.deepEqual(ignoreProbe, { executable: 'git',
  args: ['-C', '/workspace', 'check-ignore', '--quiet', '--', '.artifacts/bend2/native-v2-2032-linux'],
  options: { stdio: 'ignore', timeout: 10_000 } });
assert.throws(() => assertOutputRootIgnored(() => ({ status: 1 }), '/workspace', '.artifacts/not-ignored'), /must remain Git-ignored/);
assert.throws(() => assertOutputRootIgnored(() => ({ status: null, error: new Error('spawn fault') }),
  '/workspace', '.artifacts/unknown'), /spawn fault/);
const cleanRoot = { commit: 'a'.repeat(40), tree: 'b'.repeat(40), status: '' };
assert.equal(assertRootBindingUnchanged(cleanRoot, { ...cleanRoot }), true);
assert.throws(() => assertRootBindingUnchanged(cleanRoot, { ...cleanRoot, tree: 'c'.repeat(40) }), /drifted/);
assert.equal(processGroupState(null), 'not-created');
assert.equal(processGroupState(0), 'not-created');
const firstWindowOwner = {}; const relaunchOwner = {};
assert.equal(windowIdForOwnedSession('4194307', firstWindowOwner, relaunchOwner), null,
  'a failed relaunch map must not reuse the first process XID for cleanup');
assert.equal(windowIdForOwnedSession('4194309', relaunchOwner, relaunchOwner), '4194309');
const mockChild = new EventEmitter();
const mockSession = { pid: null, exit: null, exitObserved: false };
observeNativeChild(mockSession, mockChild);
mockChild.emit('error', new Error('mock spawn ENOENT'));
const spawnOutcome = await mockSession.completionPromise;
assert.equal(spawnOutcome.kind, 'spawn-error');
assert.equal(mockSession.spawnError.message, 'mock spawn ENOENT');
assert.equal(mockSession.exitObserved, false);
mockChild.emit('close', null, null);
assert.deepEqual(await awaitNativeClose(mockSession, 100), { status: null, signal: null,
  observedAt: mockSession.close.observedAt });
const exitChild = new EventEmitter();
const exitSession = { pid: null, exit: null, exitObserved: false };
observeNativeChild(exitSession, exitChild);
exitChild.emit('spawn'); exitChild.emit('exit', 0, null);
const exitOutcome = await exitSession.completionPromise;
assert.equal(exitOutcome.kind, 'exit'); assert.equal(exitSession.closeObserved, false);
exitChild.emit('close', 0, null);
assert.deepEqual(await awaitNativeClose(exitSession, 100), exitSession.close);
const lostCloseSession = { closeObserved: false, closePromise: new Promise(() => {}) };
await assert.rejects(awaitNativeClose(lostCloseSession, 5), /close event not observed/);

const assetFiles = Object.fromEntries(EXPECTED_PACKAGE_PATHS.map((name) => [name, {
  bytes: 1, sha256: hash(name), sourcePath: `fixture/${name}`, manifest: 'fixture.json',
  kind: name.startsWith('assets/') ? 'runtime' : 'license',
}]));
const receipt = {
  schema: 'rift-native-v2-2032-linux-cpu-package/1', ok: true,
  evidenceClass: 'source-bound-Linux-C-emission-and-ELF-link',
  candidate: { commit: CANDIDATE_COMMIT, tree: CANDIDATE_TREE,
    sourceSha256: { 'bend2/NativeV2.bend': NATIVE_PATCHED_SHA256 } },
  compiler: { scout: { head: SCOUT_COMMIT },
    derived: { head: SCOUT_COMMIT, compiler: { eol: 'lf' } },
    canonical: { head: CANONICAL_COMMIT, status: '' } },
  source: { schema: 'rift-native-v2-2032-linux-source-check/1', ok: true,
    candidate: { commit: CANDIDATE_COMMIT, tree: CANDIDATE_TREE,
      entrySha256: NATIVE_PATCHED_SHA256 }, networkFetches: 0 },
  clang: { dependencyProbe: { exitCode: 0, signal: null }, link: { exitCode: 0, signal: null } },
  emittedC: { file: '../NativeV2.c', bytes: 3, sha256: hash('c'), newlineMode: 'LF' },
  binary: { path: 'bin/rift-chess-native-v2', bytes: 3, sha256: hash('elf'),
    elf: { class: 2, dataEncoding: 1, machine: 62 } },
  launcher: { path: 'run-native-v2.sh' },
  runtimeAssets: { files: assetFiles,
    runtimeManifest: { path: 'runtime-assets.json', bytes: 3, sha256: hash('manifest') } },
  root: { status: '', head: '1'.repeat(40), tree: '2'.repeat(40) },
};
assert.equal(assertPackageReceiptShape(receipt, 'b'.repeat(64)), true);
assert.throws(() => assertPackageReceiptShape({ ...receipt, root: {
  status: '', commit: receipt.root.head, tree: receipt.root.tree,
} }, 'b'.repeat(64)), (error) => error.code === 'ERR_ASSERTION');
assert.throws(() => assertPackageReceiptShape({ ...receipt, candidate: { ...receipt.candidate,
  commit: '0'.repeat(40) } }, 'b'.repeat(64)), /strictly equal/);
assert.throws(() => assertPackageReceiptShape({ ...receipt, binary: { ...receipt.binary,
  elf: { class: 1, dataEncoding: 1, machine: 62 } } }, 'b'.repeat(64)), /strictly deep-equal/);

assert.equal(expectedMoveActionId(12, 28), 3980); // e2-e4
assert.equal(expectedMoveActionId(52, 36), 16820); // e7-e5
assert.equal(expectedMoveActionId(12, 28, 4), 3984);
assert.throws(() => expectedMoveActionId(64, 0), /assert/);
assert.deepEqual(squareInputPoint(12, { spriteHit: true }), { x: 368, y: 443 });
assert.deepEqual(squareInputPoint(28), { x: 346, y: 384 });
assert.deepEqual(squareInputPoint(52, { spriteHit: true }), { x: 313, y: 255 });
assert.deepEqual(squareInputPoint(36), { x: 335, y: 346 });
const recentMoveMask = relaunchRimMask({ yaw: 345, pitch: 67, zoom: 115 }, 1024, 640);
const recentPieceCenter = squareInputPoint(52);
const recentMoveMaskPixels = recentMoveMask.reduce((sum, value) => sum + value, 0);
assert.ok(recentMoveMaskPixels > 0 && recentMoveMaskPixels < 1024 * 640 / 20);
assert.equal(recentMoveMask[recentPieceCenter.y * 1024 + recentPieceCenter.x], 0,
  'known rim mask must not hide the moved piece interior');
assertZoomDirection(115, 117, 'in'); assertZoomDirection(117, 114, 'out');
assert.throws(() => assertZoomDirection(115, 114, 'in'), /zoom-in/);
assert.throws(() => assertZoomDirection(115, 117, 'out'), /zoom-out/);
assert.throws(() => assertZoomDirection(100, 100, 'sideways'), /unknown zoom/);
const processBinding = { executable: '/opt/package/bin/rift-chess-native-v2',
  executableSha256: 'c'.repeat(64), expectedExecutableSha256: 'c'.repeat(64),
  argv: ['/opt/package/bin/rift-chess-native-v2', '--gpu', 'off'], cwd: '/opt/package',
  dataDirectory: '/tmp/isolated-data', telemetry: '1', processGroup: 42 };
assert.equal(assertNativeProcessBinding(processBinding, { pid: 42,
  binaryPath: '/opt/package/bin/rift-chess-native-v2', packageDirectory: '/opt/package',
  dataDirectory: '/tmp/isolated-data' }), true);
assert.throws(() => assertNativeProcessBinding({ ...processBinding,
  argv: processBinding.argv.map((arg, index) => index === 2 ? 'on' : arg) }, { pid: 42,
  binaryPath: processBinding.executable, packageDirectory: processBinding.cwd,
  dataDirectory: processBinding.dataDirectory }), /CPU-only/);
const guiPassedGates = { firstFrame: true, pieceSelectionAndMove: true,
  secondMoveForSaveRotation: true, orbit: true, wheelButton4ZoomIn: true,
  wheelButton5ZoomOut: true, wmDeleteCleanExit: true, sameDataDirectoryRelaunch: true,
  persistedMovesAndPreferences: true };
assert.deepEqual(classifyInteractiveAcceptance({ ...guiPassedGates, routedPcm: 'not-configured' }), {
  guiRestartPassed: true, nativeGuiPcmAcceptance: false, status: 'partial-pcm-capture-not-configured',
});
assert.deepEqual(classifyInteractiveAcceptance({ ...guiPassedGates, routedPcm: { status: 'passed' } }), {
  guiRestartPassed: true, nativeGuiPcmAcceptance: true, status: 'passed',
});
assert.equal(classifyInteractiveAcceptance({ ...guiPassedGates,
  routedPcm: { status: 'pending' }, orbit: false }).nativeGuiPcmAcceptance, false);

const mockXwininfo = `xwininfo: Window id: 0x400003 \"Rift Chess Bend2\"\n\n  Absolute upper-left X:  120\n  Absolute upper-left Y:  80\n  Width: 1024\n  Height: 640\n  Map State: IsViewable\n`;
assert.deepEqual(parseWindowInfo(mockXwininfo), { width: 1024, height: 640, mapState: 'IsViewable' });
assert.throws(() => parseWindowInfo(mockXwininfo.replace('Width: 1024', 'Width: 800')), /1024x640/);
assert.deepEqual(assertWindowProperties(`WM_NAME(STRING) = \"Rift Chess Bend2\"\nWM_PROTOCOLS(ATOM) = WM_DELETE_WINDOW, WM_TAKE_FOCUS\n`), {
  wmName: 'Rift Chess Bend2', wmDeleteWindow: true,
});
assert.throws(() => assertWindowProperties('WM_NAME(STRING) = "Rift Chess Bend2"\nWM_PROTOCOLS(ATOM) = WM_TAKE_FOCUS\n'), /WM_DELETE_WINDOW/);

function pngChunk(type, data) {
  const head = Buffer.from(type, 'ascii'); const contents = Buffer.concat([head, data]);
  const crcTable = pngChunk.crcTable ??= Array.from({ length: 256 }, (_, n) => {
    let crc = n;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    return crc >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of contents) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  crc = (crc ^ 0xffffffff) >>> 0;
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc);
  return Buffer.concat([length, head, data, checksum]);
}
function makePng(width, height) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; header[12] = 0;
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4); row[0] = 0;
    for (let x = 0; x < width; x++) {
      const at = 1 + x * 4; row[at] = x & 255; row[at + 1] = y & 255;
      row[at + 2] = (x + y) & 255; row[at + 3] = 255;
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
const pngInfo = decodePng(makePng(32, 24));
assert.equal(pngInfo.width, 32); assert.equal(pngInfo.height, 24);
assert.equal(pngInfo.rasterBytes, 32 * 24 * 4); assert.ok(pngInfo.uniqueSampledColors > 20);
assert.throws(() => decodePng(Buffer.from('not-png')), /not a PNG/);
assert.throws(() => decodePng(makePng(32, 24).subarray(0, 16)), /truncated PNG/);
const rasterBefore = { width: 2, height: 1, channels: 4, raster: Buffer.from([1, 2, 3, 4, 9, 9, 9, 9]) };
const rasterAfter = { ...rasterBefore, raster: Buffer.from([0, 0, 0, 0, 9, 9, 9, 9]) };
assert.deepEqual(assertMaskedRasterEqual(rasterBefore, rasterAfter, new Uint8Array([1, 0])), {
  comparedPixels: 1, maskedPixels: 1, differingPixels: 0, firstDifference: null,
});
assert.throws(() => assertMaskedRasterEqual(rasterBefore,
  { ...rasterBefore, raster: Buffer.from([1, 2, 3, 4, 8, 9, 9, 9]) }, new Uint8Array([1, 0])), /differs outside/);

function escapeStore(text) {
  return [...text].map((char) => char === '\\' ? '\\\\' : char === '\n' ? '\\n'
    : char === '\r' ? '\\r' : char).join('');
}
function storeFrame(sequence, value) {
  return `RIFT-NATIVE-BEGIN ${sequence}\n~${escapeStore(JSON.stringify(value))}\nRIFT-NATIVE-END ${sequence}\n`;
}
const record1 = { schema: 'rift-bend-record/1', layout: 'B', policy: 0,
  commands: [{ $: 'MoveCommand', expected: 0, action: 3980 }] };
const record2 = { ...record1, commands: [...record1.commands,
  { $: 'MoveCommand', expected: 1, action: 16820 }] };
const prefs1 = { mode: 'hotseat', sound: true, view: { yaw: 345, pitch: 67, zoom: 115 } };
const prefs2 = { ...prefs1, view: { yaw: 315, pitch: 58, zoom: 115 } };
assert.deepEqual(parseStoreFile(storeFrame(1, { text: 'quotes: "\\"\nline two' }).trimEnd())
  .map((row) => row.sequence), [1]);
assert.throws(() => parseStoreFile('RIFT-NATIVE-BEGIN 1\n~{}\nRIFT-NATIVE-END 2\n'), /sequence mismatch/);
assert.throws(() => parseStoreFile('RIFT-NATIVE-BEGIN 1\n{}\nRIFT-NATIVE-END 1\n'), /guard missing/);

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-native-v2-2032-interactive-test-'));
let fixtureSafeToRemove = false;
try {
  const files = [
    ['.rift-chess-bend2-save.json.b', storeFrame(1, record1)],
    ['.rift-chess-bend2-save.json', storeFrame(2, record2)],
    ['.rift-chess-bend2-preferences.json.b', storeFrame(1, prefs1)],
    ['.rift-chess-bend2-preferences.json', storeFrame(3, prefs2)],
  ];
  for (const [name, content] of files) fs.writeFileSync(path.join(fixture, name), content, { flag: 'wx' });
  const saveSlot = readLogicalSlot(fixture, '.rift-chess-bend2-save.json');
  assert.equal(saveSlot.newest.sequence, 2); assert.equal(saveSlot.records.length, 2);
  const state = validatePersistedState(fixture);
  assert.deepEqual(state.save.commands.map((row) => row.action), [3980, 16820]);
  assert.deepEqual(state.preferences.view, prefs2.view);
  assert.throws(() => validatePersistedState(path.join(fixture, 'missing')),
    /rotating slot file is missing/);
  const duplicateFrames = path.join(fixture, 'duplicate-frames'); fs.mkdirSync(duplicateFrames);
  fs.writeFileSync(path.join(duplicateFrames, '.rift-chess-bend2-save.json'),
    storeFrame(2, record2) + storeFrame(3, record2), { flag: 'wx' });
  fs.writeFileSync(path.join(duplicateFrames, '.rift-chess-bend2-save.json.b'),
    storeFrame(1, record1), { flag: 'wx' });
  assert.throws(() => validatePersistedState(duplicateFrames), /exactly one complete latest slot frame/);
  const missingBackup = path.join(fixture, 'missing-backup'); fs.mkdirSync(missingBackup);
  fs.writeFileSync(path.join(missingBackup, '.rift-chess-bend2-save.json'), storeFrame(2, record2), { flag: 'wx' });
  assert.throws(() => validatePersistedState(missingBackup), /rotating slot file is missing/);
  fixtureSafeToRemove = true;
} finally {
  if (fixtureSafeToRemove) fs.rmSync(fixture, { recursive: true, force: true });
  else process.stderr.write(`Interactive pure-test fixture retained: ${fixture}\n`);
}

const idlePcm = pcmRms16Stereo(Buffer.alloc(48_000));
assert.deepEqual(assertPcmCaptureDuration(Buffer.alloc(192_000), 1), {
  seconds: 1, frames: 48_000, sampleRate: 48_000, channels: 2, format: 'S16_LE',
});
assert.throws(() => assertPcmCaptureDuration(Buffer.alloc(4), 1), /shorter/);
const moveOverlap = assertPcmCaptureOverlapsMove({
  startedAt: '2026-10-01T12:00:00.000Z', completedAt: '2026-10-01T12:00:03.000Z',
}, '2026-10-01T12:00:00.250Z');
assert.equal(moveOverlap.moveAfterCaptureStartMs, 250);
assert.throws(() => assertPcmCaptureOverlapsMove({
  startedAt: '2026-10-01T12:00:00.000Z', completedAt: '2026-10-01T12:00:03.000Z',
}, '2026-10-01T11:59:59.900Z'), /inside/);
let moveAttemptedBeforeCaptureFailed = false;
const observedFastFailure = withObservedCapture(async (captureState) => {
  await Promise.resolve();
  requireCapturePending(captureState);
  moveAttemptedBeforeCaptureFailed = true;
}, Promise.reject(new Error('mock arecord route open failed')));
await assert.rejects(observedFastFailure, /mock arecord route open failed/);
assert.equal(moveAttemptedBeforeCaptureFailed, false,
  'failed arecord startup must be observed before dispatching the move');
const movingBytes = Buffer.alloc(48_000);
for (let i = 0; i < movingBytes.length / 2; i++) movingBytes.writeInt16LE(Math.round(Math.sin(i / 11) * 2500), i * 2);
const movingPcm = pcmRms16Stereo(movingBytes);
assert.equal(idlePcm.rms, 0); assert.ok(movingPcm.rms > 0.01);
const pcmEvidence = assertPcmMoveEvidence(idlePcm, movingPcm);
assert.ok(pcmEvidence.deltaRms > 0); assert.match(pcmEvidence.interpretation, /not evidence of physical audibility/);
assert.throws(() => assertPcmMoveEvidence(idlePcm, idlePcm), /no captured PCM/);

process.stdout.write(`${JSON.stringify({ schema: 'rift-native-v2-2032-linux-interactive-controls/1',
  passed: true, platformIndependent: true,
  controls: ['exact-package-receipt-shape', 'x11-title-size-delete-protocol',
    'source-derived-e2-e4-and-e7-e5-input-coordinates', 'button4-button5-zoom-direction',
    'png-dimension-and-raster-decoding', 'source-native-journal-save-preferences-replay',
    'exact-primary-backup-slot-files', 'relaunch-window-owner-isolation',
    'spawn-error-completion-observation', 'child-close-before-log-publication',
    'unchanged-root-binding', 'masked-relaunch-raster-equality-except-last-move-rims',
    'routed-pcm-idle-move-rms-and-overlap-policy'],
  nativeProcessLaunched: false, X11Contacted: false, ALSAContacted: false })}\n`);
