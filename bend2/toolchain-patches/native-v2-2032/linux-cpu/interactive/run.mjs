// Source-bound, Linux/X11-only interactive acceptance for an existing 2.0.32 package.
// This runner never builds, edits, or replaces the package it consumes.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  CANDIDATE_COMMIT, CANDIDATE_TREE, CANONICAL_COMMIT, EXPECTED_PACKAGE_PATHS,
  NATIVE_PATCHED_SHA256, SCOUT_COMMIT,
  OUTPUT_RELATIVE, ROOT, assertLinuxNode, assertRealDirectory,
  elfIdentity, gitText, OwnedProcessError, readJson, runOwnedProcess, sha256File,
  snapshotCandidate,
} from '../common.mjs';

const SCRIPT = fileURLToPath(import.meta.url);
const SCRIPT_SHA256 = sha256File(SCRIPT);
const WINDOW_TITLE = 'Rift Chess Bend2';
const DATA_FILES = Object.freeze({
  save: '.rift-chess-bend2-save.json',
  preferences: '.rift-chess-bend2-preferences.json',
});
const EXPECTED_MOVES = Object.freeze([
  { from: 12, to: 28, action: 3980, san: 'e2-e4' },
  { from: 52, to: 36, action: 16820, san: 'e7-e5' },
]);
const MAX_TOOL_TIMEOUT_MS = 15_000;
const APP_READY_TIMEOUT_MS = 150_000;
const APP_EXIT_TIMEOUT_MS = 30_000;
const STABLE_FRAME_TIMEOUT_MS = 60_000;
const MAX_STABILITY_SAMPLES = 24;

function digest(data) { return createHash('sha256').update(data).digest('hex'); }
function requireSha(value, label) {
  assert.match(value ?? '', /^[0-9a-f]{64}$/, `${label} must be a lowercase SHA-256`);
  return value;
}
function safeAbsolute(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.ok(path.isAbsolute(value), `${label} must be absolute`);
  assert.equal(path.resolve(value), value, `${label} must be normalized`);
  return value;
}
function relativeInside(root, candidate, label) {
  const relative = path.relative(root, candidate);
  assert.ok(relative && !relative.startsWith(`..${path.sep}`) && relative !== '..'
    && !path.isAbsolute(relative), `${label} escaped its bound directory`);
  return relative;
}
function readRegular(file, label = file) {
  const stat = fs.lstatSync(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a non-symlink regular file`);
  return fs.readFileSync(file);
}
function writeJsonExclusive(file, value) {
  assert.equal(fs.existsSync(file), false, `refuse to overwrite evidence: ${file}`);
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
  assert.equal(sha256File(file), digest(bytes));
  return { path: file, bytes: bytes.length, sha256: digest(bytes) };
}

export function parseArguments(args) {
  assert.ok(Array.isArray(args));
  assert.equal(args.length, 6,
    'usage: node run.mjs --candidate <absolute-event-checkout> --package <absolute-receipt.json> --package-sha256 <64-hex>');
  assert.equal(args[0], '--candidate'); assert.equal(args[2], '--package');
  assert.equal(args[4], '--package-sha256');
  const candidate = safeAbsolute(args[1], '--candidate');
  const packageReceipt = safeAbsolute(args[3], '--package');
  const packageReceiptSha256 = requireSha(args[5], '--package-sha256');
  return { candidate, packageReceipt, packageReceiptSha256 };
}

export function assertPackageReceiptShape(receipt, packageReceiptSha256) {
  requireSha(packageReceiptSha256, 'selected package receipt SHA-256');
  assert.equal(receipt?.schema, 'rift-native-v2-2032-linux-cpu-package/1');
  assert.equal(receipt.ok, true);
  assert.equal(receipt.evidenceClass, 'source-bound-Linux-C-emission-and-ELF-link');
  assert.equal(receipt.candidate?.commit, CANDIDATE_COMMIT);
  assert.equal(receipt.candidate?.tree, CANDIDATE_TREE);
  assert.equal(receipt.compiler?.scout?.head, SCOUT_COMMIT);
  assert.equal(receipt.compiler?.derived?.head, SCOUT_COMMIT);
  assert.equal(receipt.compiler?.derived?.compiler?.eol, 'lf');
  assert.equal(receipt.compiler?.canonical?.head, CANONICAL_COMMIT);
  assert.equal(receipt.compiler?.canonical?.status, '');
  assert.equal(receipt.candidate?.sourceSha256?.['bend2/NativeV2.bend'], NATIVE_PATCHED_SHA256);
  assert.equal(receipt.source?.schema, 'rift-native-v2-2032-linux-source-check/1');
  assert.equal(receipt.source?.ok, true);
  assert.equal(receipt.source?.candidate?.commit, CANDIDATE_COMMIT);
  assert.equal(receipt.source?.candidate?.tree, CANDIDATE_TREE);
  assert.equal(receipt.source?.candidate?.entrySha256, NATIVE_PATCHED_SHA256);
  assert.equal(receipt.source?.networkFetches, 0);
  assert.equal(receipt.clang?.dependencyProbe?.exitCode, 0);
  assert.equal(receipt.clang?.dependencyProbe?.signal, null);
  assert.equal(receipt.clang?.link?.exitCode, 0);
  assert.equal(receipt.clang?.link?.signal, null);
  assert.equal(receipt.emittedC?.newlineMode, 'LF');
  assert.ok(Number.isSafeInteger(receipt.emittedC?.bytes) && receipt.emittedC.bytes > 0);
  requireSha(receipt.emittedC?.sha256, 'emitted C SHA-256');
  assert.equal(receipt.binary?.path, 'bin/rift-chess-native-v2');
  assert.ok(Number.isSafeInteger(receipt.binary?.bytes) && receipt.binary.bytes > 0);
  requireSha(receipt.binary?.sha256, 'ELF SHA-256');
  assert.deepEqual(receipt.binary?.elf, { class: 2, dataEncoding: 1, machine: 62 });
  assert.equal(receipt.launcher?.path, 'run-native-v2.sh');
  const assetFiles = receipt.runtimeAssets?.files;
  assert.ok(assetFiles && typeof assetFiles === 'object' && !Array.isArray(assetFiles));
  assert.deepEqual(Object.keys(assetFiles).sort(), [...EXPECTED_PACKAGE_PATHS].sort());
  for (const [name, asset] of Object.entries(assetFiles)) {
    assert.ok(!path.posix.isAbsolute(name) && name.split('/').every((part) => part && part !== '.' && part !== '..'));
    assert.ok(Number.isSafeInteger(asset.bytes) && asset.bytes > 0, `${name} must have positive byte count`);
    requireSha(asset.sha256, `${name} SHA-256`);
  }
  assert.equal(receipt.runtimeAssets.runtimeManifest?.path, 'runtime-assets.json');
  assert.ok(Number.isSafeInteger(receipt.runtimeAssets.runtimeManifest.bytes)
    && receipt.runtimeAssets.runtimeManifest.bytes > 0);
  requireSha(receipt.runtimeAssets.runtimeManifest.sha256, 'runtime manifest SHA-256');
  assert.equal(receipt.root?.status, '');
  assert.match(receipt.root?.head ?? '', /^[0-9a-f]{40}$/);
  assert.match(receipt.root?.tree ?? '', /^[0-9a-f]{40}$/);
  return true;
}

function checkedPackageFile(packageDirectory, relative, binding, label) {
  assert.ok(typeof relative === 'string' && relative && !path.posix.isAbsolute(relative)
    && !relative.includes('\\') && relative.split('/').every((part) => part && part !== '.' && part !== '..'),
  `${label} has unsafe relative path`);
  const file = path.resolve(packageDirectory, ...relative.split('/'));
  relativeInside(packageDirectory, file, label);
  const bytes = readRegular(file, label);
  assert.equal(bytes.length, binding.bytes, `${label} size differs from package receipt`);
  assert.equal(digest(bytes), binding.sha256, `${label} SHA-256 differs from package receipt`);
  return { file, bytes };
}

export function verifyPackageOnDisk({ candidate, packageReceipt, packageReceiptSha256 }) {
  safeAbsolute(candidate, 'candidate'); safeAbsolute(packageReceipt, 'package receipt');
  const receiptBytes = readRegular(packageReceipt, 'package receipt');
  assert.equal(digest(receiptBytes), packageReceiptSha256, 'selected package receipt bytes changed');
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  assertPackageReceiptShape(receipt, packageReceiptSha256);
  const packageDirectory = fs.realpathSync(path.dirname(packageReceipt));
  assert.equal(packageDirectory, path.resolve(path.dirname(packageReceipt)),
    'package directory path was redirected through a symlink');
  assert.equal(path.basename(packageReceipt), 'receipt.json');
  const buildRunDirectory = path.dirname(packageDirectory);
  assert.match(path.basename(buildRunDirectory), /^run-[A-Za-z0-9_-]+$/);
  assert.equal(path.dirname(buildRunDirectory), path.join(ROOT, OUTPUT_RELATIVE),
    'package receipt is outside the exact ignored build output root');
  assertRealDirectory(packageDirectory); assertRealDirectory(buildRunDirectory);
  const successPath = path.join(buildRunDirectory, 'process-success.json');
  const success = readJson(successPath);
  assert.equal(success.schema, 'rift-native-v2-2032-linux-cpu-process/1');
  assert.equal(success.ok, true);
  assert.equal(success.runDirectory, buildRunDirectory);
  assert.equal(success.packageReceiptSha256, packageReceiptSha256);

  const actualCandidate = snapshotCandidate(candidate);
  assert.deepEqual(actualCandidate, receipt.candidate, 'event-patched candidate changed since package build');
  assert.equal(actualCandidate.sourceSha256['bend2/NativeV2.bend'], NATIVE_PATCHED_SHA256);

  const sourceCommitTree = gitText(ROOT, ['show', '-s', '--format=%T', receipt.root.head]);
  assert.equal(sourceCommitTree, receipt.root.tree, 'package root commit/tree binding is not in current Git object database');
  assert.equal(receipt.binary.path, 'bin/rift-chess-native-v2');
  const { file: binaryPath, bytes: binaryBytes } = checkedPackageFile(packageDirectory,
    receipt.binary.path, receipt.binary, 'NativeV2 ELF');
  assert.deepEqual(elfIdentity(binaryBytes.subarray(0, 20)), receipt.binary.elf);
  assert.equal(receipt.emittedC.file, '../NativeV2.c');
  checkedPackageFile(buildRunDirectory, 'NativeV2.c', receipt.emittedC, 'emitted C');
  for (const [relative, binding] of Object.entries(receipt.runtimeAssets.files))
    checkedPackageFile(packageDirectory, relative, binding, `runtime asset ${relative}`);
  checkedPackageFile(packageDirectory, receipt.runtimeAssets.runtimeManifest.path,
    receipt.runtimeAssets.runtimeManifest, 'runtime asset manifest');
  const runtimeManifest = readJson(path.join(packageDirectory, receipt.runtimeAssets.runtimeManifest.path));
  assert.equal(runtimeManifest.schema, 'rift-native-v2-2032-linux-runtime-assets/1');
  assert.deepEqual(runtimeManifest.files, Object.fromEntries(Object.entries(receipt.runtimeAssets.files)
    .filter(([relative]) => relative.startsWith('assets/'))));
  return { receipt, packageDirectory, buildRunDirectory, binaryPath,
    packageReceiptSha256, candidate: actualCandidate,
    verifiedFiles: [
      { path: packageReceipt, bytes: receiptBytes.length, sha256: packageReceiptSha256 },
      { path: binaryPath, bytes: binaryBytes.length, sha256: receipt.binary.sha256 },
      { path: path.join(buildRunDirectory, 'NativeV2.c'), bytes: receipt.emittedC.bytes,
        sha256: receipt.emittedC.sha256 },
      ...Object.entries(receipt.runtimeAssets.files).map(([name, asset]) => ({
        path: path.join(packageDirectory, name), bytes: asset.bytes, sha256: asset.sha256,
      })),
    ] };
}

export function expectedMoveActionId(from, to, promotion = 0) {
  assert.ok(Number.isInteger(from) && from >= 0 && from < 64);
  assert.ok(Number.isInteger(to) && to >= 0 && to < 64);
  assert.ok(Number.isInteger(promotion) && promotion >= 0 && promotion <= 4);
  return 5 * (64 * from + to) + promotion;
}

export function parseWindowInfo(text) {
  const width = Number(/^\s*Width:\s+(\d+)\s*$/m.exec(text)?.[1]);
  const height = Number(/^\s*Height:\s+(\d+)\s*$/m.exec(text)?.[1]);
  const mapState = /^\s*Map State:\s+(.*?)\s*$/m.exec(text)?.[1];
  assert.deepEqual({ width, height, mapState }, { width: 1024, height: 640, mapState: 'IsViewable' },
    'actual mapped X11 frame differs from NativeV2 1024x640 contract');
  return { width, height, mapState };
}

export function assertWindowProperties(text) {
  assert.match(text, /WM_NAME\(STRING\)\s*=\s*"Rift Chess Bend2"/);
  assert.match(text, /WM_PROTOCOLS\(ATOM\).*WM_DELETE_WINDOW/s,
    'window has no WM_DELETE_WINDOW protocol; no force-close fallback is permitted');
  return { wmName: WINDOW_TITLE, wmDeleteWindow: true };
}

export function windowIdForOwnedSession(windowId, windowOwner, session) {
  if (!windowId || !session || windowOwner !== session) return null;
  return windowId;
}

export function assertZoomDirection(before, after, direction) {
  assert.ok(Number.isInteger(before) && Number.isInteger(after));
  if (direction === 'in') assert.ok(after > before, `zoom-in did not increase zoom (${before} -> ${after})`);
  else if (direction === 'out') assert.ok(after < before, `zoom-out did not decrease zoom (${before} -> ${after})`);
  else throw new TypeError(`unknown zoom direction: ${direction}`);
  return { before, after, direction };
}

export function assertMaskedRasterEqual(before, after, masks = new Uint8Array(0)) {
  assert.ok(Buffer.isBuffer(before?.raster) && Buffer.isBuffer(after?.raster));
  assert.equal(before.width, after.width); assert.equal(before.height, after.height);
  assert.equal(before.channels, after.channels);
  const bytesPerPixel = before.channels; const pixels = before.width * before.height;
  assert.equal(before.raster.length, pixels * bytesPerPixel);
  assert.equal(after.raster.length, pixels * bytesPerPixel);
  assert.ok(masks instanceof Uint8Array && masks.length === pixels,
    'raster mask must have one byte per pixel');
  let comparedPixels = 0; let maskedPixels = 0; let differingPixels = 0; let firstDifference = null;
  for (let pixel = 0; pixel < pixels; pixel++) {
    if (masks[pixel]) { maskedPixels++; continue; }
    comparedPixels++;
    const offset = pixel * bytesPerPixel;
    let same = true;
    for (let channel = 0; channel < bytesPerPixel; channel++)
      if (before.raster[offset + channel] !== after.raster[offset + channel]) { same = false; break; }
    if (!same) { differingPixels++; if (firstDifference === null) firstDifference = pixel; }
  }
  assert.equal(differingPixels, 0,
    `relaunch raster differs outside the known last-move floor outlines (${differingPixels} pixels)`);
  return { comparedPixels, maskedPixels, differingPixels, firstDifference };
}

function cameraValues(view) {
  const radians = fmul(f32(view.yaw), fdiv(f32(Math.PI), f32(180)));
  const pitchRadians = fmul(f32(view.pitch), fdiv(f32(Math.PI), f32(180)));
  const cosYaw = f32(Math.cos(radians)); const sinYaw = f32(Math.sin(radians));
  const sinPitch = f32(Math.sin(pitchRadians));
  const axis = fadd(Math.abs(cosYaw), Math.abs(sinYaw));
  const baseScale = fdiv(360, fmul(8, axis));
  const scale = fdiv(fmul(baseScale, view.zoom), 100);
  return { cosYaw, sinYaw, sinPitch, scale };
}

export function relaunchRimMask(view, width, height) {
  assert.deepEqual([width, height], [1024, 640]);
  const { cosYaw, sinYaw, sinPitch, scale } = cameraValues(view);
  const masks = new Uint8Array(width * height);
  const affected = [52, 36].map((square) => ({ file: square % 8,
    row: 7 - Math.floor(square / 8) }));
  for (let y = 96; y < 608; y++) for (let x = 64; x < 576; x++) {
    const dx = fdiv(fsub(x - 64, 256), scale);
    const dy = fdiv(fsub(y - 96, 274), fmul(scale, sinPitch));
    const file = fadd(3.5, fadd(fmul(cosYaw, dx), fmul(sinYaw, dy)));
    const row = fadd(3.5, fadd(fmul(f32(-sinYaw), dx), fmul(cosYaw, dy)));
    const marked = affected.some((square) => {
      const fileDelta = Math.abs(file - square.file); const rowDelta = Math.abs(row - square.row);
      const nearEdge = Math.abs(fileDelta - 0.5) <= 0.075 || Math.abs(rowDelta - 0.5) <= 0.075;
      return fileDelta <= 0.56 && rowDelta <= 0.56 && nearEdge;
    });
    if (marked) masks[y * width + x] = 1;
  }
  return masks;
}

export function assertRelaunchFrameMatch(before, after, view) {
  requireSha(before?.rasterSha256, 'pre-relaunch raster SHA-256');
  requireSha(after?.rasterSha256, 'post-relaunch raster SHA-256');
  assert.ok(view && ['yaw', 'pitch', 'zoom'].every((key) => Number.isInteger(view[key])),
    'saved camera must be used to normalize known post-replay highlights');
  const beforeRaster = decodePng(readRegular(before.path), { includeRaster: true });
  const afterRaster = decodePng(readRegular(after.path), { includeRaster: true });
  const masks = relaunchRimMask(view, beforeRaster.width, beforeRaster.height);
  const comparison = assertMaskedRasterEqual(beforeRaster, afterRaster, masks);
  assert.ok(comparison.maskedPixels < beforeRaster.width * beforeRaster.height / 20,
    'last-move normalization mask is unexpectedly broad');
  return { ...comparison, fullRasterSha256Equal: before.rasterSha256 === after.rasterSha256,
    ignoredPixels: 'only the two last-move square rim bands (e7/e5); piece interiors and remaining frame are exact' };
}

export function classifyInteractiveAcceptance(gates) {
  const guiRestartPassed = Boolean(gates?.firstFrame && gates?.pieceSelectionAndMove
    && gates?.secondMoveForSaveRotation && gates?.orbit && gates?.wheelButton4ZoomIn
    && gates?.wheelButton5ZoomOut && gates?.wmDeleteCleanExit
    && gates?.sameDataDirectoryRelaunch && gates?.persistedMovesAndPreferences);
  const nativeGuiPcmAcceptance = guiRestartPassed && gates?.routedPcm?.status === 'passed';
  return { guiRestartPassed, nativeGuiPcmAcceptance,
    status: nativeGuiPcmAcceptance ? 'passed' : guiRestartPassed
      ? 'partial-pcm-capture-not-configured' : 'failed' };
}

function f32(value) { return Math.fround(value); }
function fadd(a, b) { return f32(f32(a) + f32(b)); }
function fsub(a, b) { return f32(f32(a) - f32(b)); }
function fmul(a, b) { return f32(f32(a) * f32(b)); }
function fdiv(a, b) { return f32(f32(a) / f32(b)); }
export function squareInputPoint(square, { yaw = 345, pitch = 67, zoom = 115,
  left = 64, top = 96, spriteHit = false } = {}) {
  assert.ok(Number.isInteger(square) && square >= 0 && square < 64);
  const radians = fmul(f32(yaw), fdiv(f32(Math.PI), f32(180)));
  const pitchRadians = fmul(f32(pitch), fdiv(f32(Math.PI), f32(180)));
  const cy = f32(Math.cos(radians)); const sy = f32(Math.sin(radians));
  const sp = f32(Math.sin(pitchRadians));
  const axis = fadd(Math.abs(cy), Math.abs(sy));
  const baseScale = fdiv(360, fmul(8, axis));
  const scale = fdiv(fmul(baseScale, zoom), 100);
  const file = square % 8; const rank = Math.floor(square / 8); const row = 7 - rank;
  const df = fsub(file, 3.5); const dr = fsub(row, 3.5);
  const projectedX = fadd(256, fmul(scale, fsub(fmul(cy, df), fmul(sy, dr))));
  const projectedY = fadd(274, fmul(fmul(scale, sp), fadd(fmul(sy, df), fmul(cy, dr))));
  return { x: left + Math.max(0, Math.round(projectedX)),
    y: top + Math.max(0, Math.round(projectedY) - (spriteHit ? 16 : 0)) };
}

function paeth(a, b, c) {
  const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}
function pngCrc32(bytes) {
  const table = pngCrc32.table ??= Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++)
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    return value >>> 0;
  });
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export function decodePng(bytes, { includeRaster = false } = {}) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.subarray(0, 8).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'capture is not a PNG');
  let offset = 8; let width; let height; let bitDepth; let colorType; let interlace;
  const imageChunks = [];
  let sawEnd = false;
  while (offset < bytes.length) {
    assert.ok(offset + 12 <= bytes.length, 'truncated PNG chunk');
    const length = bytes.readUInt32BE(offset); offset += 4;
    const type = bytes.toString('ascii', offset, offset + 4); offset += 4;
    assert.ok(offset + length + 4 <= bytes.length, `truncated PNG ${type} chunk`);
    const data = bytes.subarray(offset, offset + length);
    const crcExpected = bytes.readUInt32BE(offset + length);
    assert.equal(pngCrc32(bytes.subarray(offset - 4, offset + length)), crcExpected,
      `PNG ${type} chunk checksum mismatch`);
    offset += length + 4;
    if (type === 'IHDR') {
      assert.equal(width, undefined, 'duplicate PNG IHDR');
      assert.equal(length, 13, 'PNG IHDR has incorrect length');
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') imageChunks.push(data);
    else if (type === 'IEND') { sawEnd = true; break; }
  }
  assert.equal(sawEnd, true); assert.equal(offset, bytes.length, 'bytes follow PNG IEND');
  assert.ok(width > 0 && height > 0);
  assert.equal(bitDepth, 8, 'only 8-bit X11 screenshot PNGs are accepted');
  assert.ok(colorType === 2 || colorType === 6, 'screenshot must be truecolor RGB/RGBA');
  assert.equal(interlace, 0, 'interlaced PNG capture is unsupported');
  const channels = colorType === 6 ? 4 : 3; const stride = width * channels;
  const decoded = inflateSync(Buffer.concat(imageChunks));
  assert.equal(decoded.length, height * (stride + 1), 'PNG decoded byte count mismatch');
  const raster = Buffer.alloc(height * stride);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = decoded[src++]; const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const raw = decoded[src++]; const left = x >= channels ? raster[rowStart + x - channels] : 0;
      const above = y ? raster[rowStart + x - stride] : 0;
      const upperLeft = y && x >= channels ? raster[rowStart + x - stride - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paeth(left, above, upperLeft);
      else assert.equal(filter, 0, `unsupported PNG filter ${filter}`);
      raster[rowStart + x] = (raw + predictor) & 255;
    }
  }
  const colors = new Set();
  for (let y = 0; y < height; y += 4) for (let x = 0; x < width; x += 4) {
    const at = (y * width + x) * channels;
    colors.add(`${raster[at]},${raster[at + 1]},${raster[at + 2]}`);
  }
  return { width, height, channels, uniqueSampledColors: colors.size,
    rasterSha256: digest(raster), rasterBytes: raster.length,
    ...(includeRaster ? { raster } : {}) };
}

function unescapeStore(text) {
  let result = ''; let escaped = false;
  for (const char of text) {
    if (!escaped && char === '\\') { escaped = true; continue; }
    if (escaped) {
      result += char === 'n' ? '\n' : char === 'r' ? '\r' : char;
      escaped = false;
    } else result += char;
  }
  assert.equal(escaped, false, 'store payload ends in an incomplete escape');
  return result;
}
export function parseStoreFile(text) {
  assert.equal(typeof text, 'string'); assert.ok(!text.includes('\r'), 'Native Linux store file must use LF');
  const lines = text.split('\n'); const frames = [];
  for (let index = 0; index < lines.length;) {
    const begin = /^RIFT-NATIVE-BEGIN ([0-9]+)$/.exec(lines[index]);
    if (!begin) { assert.equal(lines[index], '', 'unexpected bytes outside a complete native store frame'); index++; continue; }
    const sequence = Number(begin[1]); const payload = [];
    index++;
    while (index < lines.length && lines[index] !== `RIFT-NATIVE-END ${sequence}`) {
      assert.ok(!/^RIFT-NATIVE-END /.test(lines[index]), 'store frame end sequence mismatch');
      payload.push(lines[index++]);
    }
    assert.ok(index < lines.length, 'unterminated native store frame');
    assert.ok(payload.length > 0 && payload[0].startsWith('~'), 'store frame payload guard missing');
    payload[0] = payload[0].slice(1);
    const decoded = unescapeStore(payload.join('\n'));
    frames.push({ sequence, value: JSON.parse(decoded), sha256: digest(Buffer.from(decoded, 'utf8')) });
    index++;
  }
  assert.ok(frames.length > 0, 'no complete native store frames');
  return frames;
}

export function readLogicalSlot(directory, basename) {
  const records = [];
  for (const suffix of ['', '.b']) {
    const file = path.join(directory, `${basename}${suffix}`);
    if (!fs.existsSync(file)) continue;
    const bytes = readRegular(file, `${basename}${suffix}`);
    for (const frame of parseStoreFile(bytes.toString('utf8')))
      records.push({ ...frame, file: path.basename(file), fileSha256: digest(bytes) });
  }
  assert.ok(records.length > 0, `no valid ${basename} primary or backup slot`);
  records.sort((a, b) => a.sequence - b.sequence);
  return { newest: records.at(-1), records };
}

export function readRotatingSlot(directory, basename) {
  const records = [];
  for (const suffix of ['', '.b']) {
    const name = `${basename}${suffix}`;
    const file = path.join(directory, name);
    assert.ok(fs.existsSync(file), `rotating slot file is missing: ${name}`);
    const bytes = readRegular(file, name);
    const frames = parseStoreFile(bytes.toString('utf8'));
    assert.equal(frames.length, 1, `${name} must contain exactly one complete latest slot frame`);
    records.push({ ...frames[0], file: name, fileSha256: digest(bytes) });
  }
  assert.notEqual(records[0].sequence, records[1].sequence,
    `${basename} primary and backup slot sequences must differ`);
  records.sort((a, b) => a.sequence - b.sequence);
  assert.ok(records[1].sequence > records[0].sequence,
    `${basename} newest slot sequence must be greater than its backup`);
  return { newest: records[1], records };
}

export function validatePersistedState(dataDirectory) {
  const saved = readRotatingSlot(dataDirectory, DATA_FILES.save);
  const preferences = readRotatingSlot(dataDirectory, DATA_FILES.preferences);
  const record = saved.newest.value;
  assert.equal(record.schema, 'rift-bend-record/1');
  assert.deepEqual(record.commands?.map((command) => command.action), EXPECTED_MOVES.map((move) => move.action));
  assert.deepEqual(record.commands?.map((command) => command.$), ['MoveCommand', 'MoveCommand']);
  assert.deepEqual(record.commands?.map((command) => command.expected), [0, 1]);
  const view = preferences.newest.value.view;
  assert.ok(view && Number.isInteger(view.yaw) && Number.isInteger(view.pitch) && Number.isInteger(view.zoom));
  assert.ok(view.yaw !== 345 || view.pitch !== 67, 'saved view does not include the orbit');
  assert.ok(view.zoom >= 75 && view.zoom <= 130);
  return { save: { files: saved.records, newestSequence: saved.newest.sequence,
    commands: record.commands }, preferences: { files: preferences.records,
    newestSequence: preferences.newest.sequence, view } };
}

export function pcmRms16Stereo(bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.length >= 4 && bytes.length % 4 === 0,
    'PCM capture must be nonempty signed 16-bit stereo');
  let sum = 0; let peak = 0; let samples = 0; let nonzero = 0;
  for (let offset = 0; offset < bytes.length; offset += 2) {
    const sample = bytes.readInt16LE(offset); sum += sample * sample;
    peak = Math.max(peak, Math.abs(sample)); if (sample !== 0) nonzero++; samples++;
  }
  return { bytes: bytes.length, frames: bytes.length / 4, samples, nonzeroSamples: nonzero,
    rms: Math.sqrt(sum / samples) / 32768, peak: peak / 32768, sha256: digest(bytes) };
}
export function assertPcmCaptureDuration(bytes, seconds) {
  assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 10);
  assert.ok(Buffer.isBuffer(bytes) && bytes.length % 4 === 0);
  const frames = bytes.length / 4;
  const minimumFrames = Math.floor(seconds * 48_000 * 0.75);
  assert.ok(frames >= minimumFrames,
    `ALSA capture was shorter than 75% of the requested ${seconds}-second interval (${frames} frames)`);
  return { seconds, frames, sampleRate: 48_000, channels: 2, format: 'S16_LE' };
}
export function observeCapturePromise(promise) {
  const state = { settled: false, outcome: null };
  state.promise = Promise.resolve(promise).then(
    (value) => { state.settled = true; state.outcome = { ok: true, value }; return state.outcome; },
    (error) => { state.settled = true; state.outcome = { ok: false, error }; return state.outcome; },
  );
  return state;
}
export function requireCapturePending(state) {
  assert.ok(state && state.promise, 'capture observation is required');
  if (!state.settled) return true;
  if (!state.outcome?.ok) throw state.outcome?.error ?? new Error('PCM capture failed before move input');
  throw new Error('PCM capture completed before move input; PCM/move overlap was not observed');
}
export async function requireCaptureSuccess(state) {
  const outcome = await state.promise;
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}
export async function withObservedCapture(operation, capturePromise) {
  const observation = observeCapturePromise(capturePromise);
  try {
    const result = await operation(observation);
    return { result, capture: await requireCaptureSuccess(observation) };
  } catch (error) {
    const outcome = await observation.promise;
    if (!outcome.ok && outcome.error !== error && error instanceof Error)
      error.captureError = String(outcome.error?.message ?? outcome.error);
    throw error;
  }
}
export function assertPcmCaptureOverlapsMove(capture, moveInputAt) {
  const startedAt = Date.parse(capture?.startedAt ?? '');
  const movedAt = Date.parse(moveInputAt ?? '');
  const completedAt = Date.parse(capture?.completedAt ?? '');
  assert.ok(Number.isFinite(startedAt) && Number.isFinite(movedAt) && Number.isFinite(completedAt));
  assert.ok(startedAt <= movedAt && movedAt < completedAt,
    'e2-e4 input was not inside the supervised routed PCM capture interval');
  assert.ok(movedAt - startedAt <= 1000,
    'routed PCM capture did not begin promptly before the move input');
  return { startedAt: capture.startedAt, moveInputAt, completedAt: capture.completedAt,
    moveAfterCaptureStartMs: movedAt - startedAt, moveBeforeCaptureEndMs: completedAt - movedAt };
}
export function assertPcmMoveEvidence(idle, moving) {
  assert.ok(idle.nonzeroSamples === 0 || idle.rms < 0.02,
    `idle PCM contains substantial unrelated signal (rms=${idle.rms})`);
  assert.ok(moving.nonzeroSamples > 0 && moving.peak > 0,
    'move interval contains no captured PCM signal');
  assert.ok(moving.rms > Math.max(idle.rms * 1.25, 0.00001),
    `move PCM did not rise above idle (idle=${idle.rms}, move=${moving.rms})`);
  return { idleRms: idle.rms, moveRms: moving.rms, peak: moving.peak,
    deltaRms: moving.rms - idle.rms,
    interpretation: 'routed PCM capture only; not evidence of physical audibility' };
}

function resolveExecutable(name) {
  const paths = String(process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const directory of paths) {
    const candidate = path.resolve(directory, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      const resolved = fs.realpathSync(candidate); const stat = fs.statSync(resolved);
      assert.ok(stat.isFile(), `${name} resolves to a non-file`);
      return { name, configuredPath: candidate, path: resolved,
        bytes: stat.size, sha256: sha256File(resolved) };
    } catch { /* continue through PATH; no installation or substitute is attempted */ }
  }
  return null;
}

function parseWindowIds(output) {
  const ids = output.trim().split(/\s+/).filter(Boolean);
  assert.ok(ids.every((id) => /^[0-9]+$/.test(id)), 'xdotool returned malformed XIDs');
  return [...new Set(ids)];
}

function procStat(pid) {
  const text = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
  const end = text.lastIndexOf(')'); assert.ok(end >= 0, 'malformed /proc stat');
  const fields = text.slice(end + 1).trim().split(/\s+/);
  return { pid: Number(text.slice(0, text.indexOf(' '))), state: fields[0], parent: Number(fields[1]), group: Number(fields[2]) };
}
function listProcesses() {
  const rows = [];
  for (const name of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try { rows.push(procStat(Number(name))); } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ESRCH') throw error;
    }
  }
  return rows;
}
function descendantsOf(pid) {
  const rows = listProcesses(); const owned = new Set([pid]); let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) if (owned.has(row.parent) && !owned.has(row.pid)) {
      owned.add(row.pid); changed = true;
    }
  }
  return rows.filter((row) => owned.has(row.pid) && row.pid !== pid);
}
export function processGroupState(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return 'not-created';
  try { process.kill(-pid, 0); return true; }
  catch (error) { if (error?.code === 'ESRCH') return false; return 'unknown'; }
}

export function assertNativeProcessBinding(binding, { pid, binaryPath, packageDirectory, dataDirectory }) {
  assert.ok(Number.isInteger(pid) && pid > 0, 'NativeV2 process must have an owned PID');
  assert.equal(binding?.executable, binaryPath, 'running executable path differs from the hash-bound ELF');
  assert.equal(binding?.argv?.length, 3);
  assert.equal(binding.argv[0], binaryPath);
  assert.deepEqual(binding.argv.slice(1), ['--gpu', 'off'], 'native session must be CPU-only');
  assert.equal(binding.cwd, packageDirectory, 'native working directory is not the verified package');
  assert.equal(binding.dataDirectory, dataDirectory, 'native process has the wrong RIFT_CHESS_DATA_DIR');
  assert.equal(binding.telemetry, '1', 'BEND_NO_TELEMETRY must be set for the app process');
  assert.equal(binding.processGroup, pid, 'native process is not in its owned process group');
  requireSha(binding.executableSha256, 'running executable SHA-256');
  assert.equal(binding.executableSha256, binding.expectedExecutableSha256,
    'running executable bytes differ from the selected package ELF');
  return true;
}

function snapshotNativeProcess(pid, binaryPath, expectedSha256, packageDirectory, dataDirectory) {
  const executable = fs.realpathSync(`/proc/${pid}/exe`);
  const argvBytes = fs.readFileSync(`/proc/${pid}/cmdline`);
  const argv = argvBytes.toString('utf8').split('\0').filter((value, index, values) =>
    !(index === values.length - 1 && value === ''));
  const cwd = fs.realpathSync(`/proc/${pid}/cwd`);
  const environment = fs.readFileSync(`/proc/${pid}/environ`).toString('utf8').split('\0');
  const dataBindings = environment.filter((entry) => entry.startsWith('RIFT_CHESS_DATA_DIR='));
  const telemetryBindings = environment.filter((entry) => entry.startsWith('BEND_NO_TELEMETRY='));
  const process = procStat(pid);
  const binding = { executable, executableSha256: sha256File(`/proc/${pid}/exe`),
    expectedExecutableSha256: expectedSha256, argv, cwd,
    dataDirectory: dataBindings.length === 1 ? dataBindings[0].slice('RIFT_CHESS_DATA_DIR='.length) : null,
    telemetry: telemetryBindings.length === 1 ? telemetryBindings[0].slice('BEND_NO_TELEMETRY='.length) : null,
    processGroup: process.group };
  assertNativeProcessBinding(binding, { pid, binaryPath, packageDirectory, dataDirectory });
  return binding;
}

export function assertOutputRootIgnored(run = spawnSync, root = ROOT, relative = OUTPUT_RELATIVE) {
  const ignored = run('git', ['-C', root, 'check-ignore', '--quiet', '--', relative], {
    stdio: 'ignore', timeout: 10_000,
  });
  assert.equal(ignored.error, undefined, String(ignored.error));
  assert.equal(ignored.status, 0, `${relative} must remain Git-ignored`);
  return true;
}

function makeRunDirectory() {
  const outputRoot = path.join(ROOT, OUTPUT_RELATIVE);
  assertOutputRootIgnored();
  let current = ROOT;
  for (const component of OUTPUT_RELATIVE.split('/')) {
    current = path.join(current, component);
    try { assertRealDirectory(current); }
    catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      fs.mkdirSync(current, { mode: 0o700 }); assertRealDirectory(current);
    }
  }
  const directory = fs.mkdtempSync(path.join(outputRoot, 'interactive-run-'));
  fs.chmodSync(directory, 0o700); assertRealDirectory(directory);
  return directory;
}

function isolatedGuiEnvironment(dataDirectory) {
  const keys = ['PATH', 'HOME', 'USER', 'LOGNAME', 'DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR',
    'XDG_SESSION_TYPE', 'DBUS_SESSION_BUS_ADDRESS', 'ALSA_CONFIG_PATH', 'ALSA_PCM_CARD',
    'ALSA_CARD', 'ALSA_DEVICE', 'PULSE_SERVER', 'PULSE_COOKIE', 'PIPEWIRE_REMOTE'];
  const env = Object.fromEntries(keys.filter((key) => process.env[key] !== undefined)
    .map((key) => [key, process.env[key]]));
  env.PATH = process.env.PATH ?? '/usr/bin:/bin';
  env.DISPLAY = process.env.DISPLAY;
  env.BEND_NO_TELEMETRY = '1';
  env.RIFT_CHESS_DATA_DIR = dataDirectory;
  return env;
}

function assertInteractivePrerequisites(pcmDevice) {
  assert.equal(process.platform, 'linux', 'this is a Linux-only X11 acceptance gate');
  assertLinuxNode();
  assert.ok(process.env.DISPLAY, 'DISPLAY is required; headless fallback is prohibited');
  const tools = Object.fromEntries(['xdotool', 'xwininfo', 'xprop', 'import'].map((name) => {
    const tool = resolveExecutable(name); assert.ok(tool, `required existing tool not found on PATH: ${name}`);
    return [name, tool];
  }));
  const arecord = resolveExecutable('arecord');
  let pcm = { status: 'not-configured', reason: 'RIFT_CHESS_PCM_DEVICE is not set; no audio capture route was inferred',
    existingCaptureTool: arecord };
  if (pcmDevice !== undefined) {
    assert.match(pcmDevice, /^[A-Za-z0-9_.!,=:/-]{1,128}$/, 'RIFT_CHESS_PCM_DEVICE contains unsupported characters');
    assert.ok(arecord, 'RIFT_CHESS_PCM_DEVICE is set but existing arecord was not found; no install/fallback');
    tools.arecord = arecord;
    pcm = { status: 'configured', device: pcmDevice, captureTool: arecord };
  }
  return { tools, pcm, display: process.env.DISPLAY,
    audioConfigPathPresent: Boolean(process.env.ALSA_CONFIG_PATH),
    pathHash: digest(Buffer.from(String(process.env.PATH ?? ''), 'utf8')) };
}

async function toolCall(name, args, { cwd, env, timeoutMs = MAX_TOOL_TIMEOUT_MS, maxOutputBytes = 1_000_000 } = {}) {
  return runOwnedProcess(name, args, { cwd, env, timeoutMs, maxOutputBytes, label: path.basename(name) });
}

function saveSessionOutput(directory, ordinal, session) {
  const logsDirectory = path.join(directory, 'logs');
  try { fs.mkdirSync(logsDirectory, { mode: 0o700 }); }
  catch (error) { if (error?.code !== 'EEXIST') throw error; }
  assertRealDirectory(logsDirectory);
  return {
    stdout: writeExclusiveBytes(path.join(directory, 'logs', `session-${ordinal}.stdout.log`), Buffer.concat(session.stdout)),
    stderr: writeExclusiveBytes(path.join(directory, 'logs', `session-${ordinal}.stderr.log`), Buffer.concat(session.stderr)),
    outputBytes: session.outputBytes, outputOverflow: session.outputOverflow,
  };
}
function writeExclusiveBytes(file, bytes) {
  assert.equal(fs.existsSync(file), false, `refuse to overwrite evidence: ${file}`);
  fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
  return { path: file, bytes: bytes.length, sha256: digest(bytes) };
}

export function observeNativeChild(session, child) {
  session.child = child; session.spawnError = null;
  let settleCompletion;
  let completionSettled = false;
  session.completionPromise = new Promise((resolve) => { settleCompletion = resolve; });
  session.closeObserved = false; session.close = null;
  let settleClose;
  session.closePromise = new Promise((resolve) => { settleClose = resolve; });
  const settle = (result) => {
    if (completionSettled) return;
    completionSettled = true; settleCompletion(result);
  };
  child.once('spawn', () => { session.pid = child.pid; });
  child.once('error', (error) => {
    session.spawnError = error;
    session.spawnErrorObservedAt = new Date().toISOString();
    settle({ kind: 'spawn-error', error });
  });
  child.once('exit', (status, signal) => {
    session.exit = { status, signal, observedAt: new Date().toISOString() };
    session.exitObserved = true;
    settle({ kind: 'exit', exit: session.exit });
  });
  child.once('close', (status, signal) => {
    session.close = { status, signal, observedAt: new Date().toISOString() };
    session.closeObserved = true; settleClose(session.close);
  });
  return session;
}

function launchNative(binaryPath, packageDirectory, env, dataDirectory, expectedExecutableSha256) {
  const child = spawn(binaryPath, ['--gpu', 'off'], { cwd: packageDirectory, env,
    detached: true, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const session = observeNativeChild({ pid: null, exit: null, exitObserved: false, outputBytes: 0,
    outputOverflow: false, stdout: [], stderr: [], startedAt: new Date().toISOString() }, child);
  const collect = (chunks) => (value) => {
    const buffer = Buffer.from(value); session.outputBytes += buffer.length;
    if (session.outputBytes <= 2 * 1024 * 1024) chunks.push(buffer);
    else session.outputOverflow = true;
  };
  child.stdout.on('data', collect(session.stdout)); child.stderr.on('data', collect(session.stderr));
  session.binaryPath = binaryPath; session.packageDirectory = packageDirectory;
  session.dataDirectory = dataDirectory; session.expectedExecutableSha256 = expectedExecutableSha256;
  session.argv = [binaryPath, '--gpu', 'off'];
  return session;
}

export async function awaitNativeClose(session, timeoutMs = 5000) {
  let timer;
  let result;
  try {
    result = await Promise.race([
      session.closePromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`owned NativeV2 child close event not observed within ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
  } finally { clearTimeout(timer); }
  assert.equal(session.closeObserved, true, 'child stdio close event must be observed before publishing logs');
  if (session.exitObserved)
    assert.deepEqual({ status: result.status, signal: result.signal },
      { status: session.exit.status, signal: session.exit.signal }, 'child close and exit status disagree');
  return result;
}

async function awaitNativeExit(session, timeoutMs = APP_EXIT_TIMEOUT_MS) {
  let timer;
  let result;
  try {
    const completion = await Promise.race([
      session.completionPromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(
          `owned NativeV2 session exit was not observed within ${timeoutMs} ms`)), timeoutMs);
      }),
    ]);
    if (completion.kind === 'spawn-error')
      throw new Error(`NativeV2 spawn failed before process start: ${completion.error?.message ?? completion.error}`);
    result = completion.exit;
  } finally { clearTimeout(timer); }
  assert.equal(session.exitObserved, true);
  assert.equal(result.status, 0, `NativeV2 exited with status ${result.status} signal ${result.signal}`);
  assert.equal(result.signal, null, 'NativeV2 graceful exit must not be signal-driven');
  await awaitNativeClose(session);
  assert.equal(session.outputOverflow, false, 'NativeV2 stdout/stderr exceeded the retained 2-MiB bound');
  assert.deepEqual(descendantsOf(session.pid), [], 'NativeV2 left a process descendant; recovery is owner-only');
  assert.equal(processGroupState(session.pid), false, 'NativeV2 process-group quiescence is ambiguous');
  return { pid: session.pid, exit: result, outputBytes: session.outputBytes,
    close: session.close, processGroupAbsent: true, descendants: [] };
}

async function windowIds(tools, cwd, env) {
  try {
    const result = await toolCall(tools.xdotool.path,
      ['search', '--onlyvisible', '--name', `^${WINDOW_TITLE}$`], { cwd, env, timeoutMs: 5000 });
    return parseWindowIds(result.stdout.toString('utf8'));
  } catch (error) {
    if (error instanceof OwnedProcessError && error.result?.status === 1
      && error.result?.signal === null && error.result?.stdout?.length === 0
      && error.result?.stderr?.length === 0
      && !error.workerMayBeLive) return [];
    throw error;
  }
}

async function waitForWindow(session, tools, cwd, env) {
  const deadline = Date.now() + APP_READY_TIMEOUT_MS;
  let seen = [];
  while (Date.now() < deadline) {
    if (session.spawnError)
      throw new Error(`NativeV2 spawn failed before mapping a window: ${session.spawnError.message}`);
    assert.equal(session.exitObserved, false, 'NativeV2 exited before mapping the expected X11 window');
    seen = await windowIds(tools, cwd, env);
    if (seen.length === 1) return seen[0];
    assert.ok(seen.length === 0, `expected one Rift Chess window, found ${seen.length}`);
    await delay(300);
  }
  throw new Error(`no titled visible 1024x640 window appeared within ${APP_READY_TIMEOUT_MS} ms`);
}

async function inspectWindow(windowId, tools, cwd, env) {
  const geometry = await toolCall(tools.xwininfo.path, ['-id', windowId], { cwd, env });
  const text = geometry.stdout.toString('utf8');
  const frame = parseWindowInfo(text);
  const properties = await toolCall(tools.xprop.path,
    ['-id', windowId, 'WM_NAME', 'WM_PROTOCOLS'], { cwd, env });
  const propText = properties.stdout.toString('utf8');
  const propertiesInfo = assertWindowProperties(propText);
  return { windowId, ...frame, ...propertiesInfo,
    xwininfoSha256: digest(geometry.stdout), xpropSha256: digest(properties.stdout) };
}

async function capturePng(file, windowId, tools, cwd, env) {
  assert.equal(fs.existsSync(file), false, `refuse to overwrite screenshot: ${file}`);
  const result = await toolCall(tools.import.path,
    ['-window', windowId, '-type', 'TrueColor', '-depth', '8', file],
    { cwd, env, timeoutMs: 20_000, maxOutputBytes: 250_000 });
  const bytes = readRegular(file, 'X11 screenshot');
  const decoded = decodePng(bytes);
  assert.deepEqual([decoded.width, decoded.height], [1024, 640], 'captured client image has wrong dimensions');
  assert.ok(decoded.uniqueSampledColors > 200, 'captured first frame is not a rendered, nonblank game surface');
  return { path: file, bytes: bytes.length, fileSha256: digest(bytes), ...decoded,
    captureToolSha256: tools.import.sha256, stderrSha256: digest(result.stderr) };
}

async function waitForStableFrame(windowId, prefix, directory, tools, cwd, env,
  { timeoutMs = STABLE_FRAME_TIMEOUT_MS, stableSamples = 2 } = {}) {
  const deadline = Date.now() + timeoutMs; let previous = null; let stable = 0; let sample = 0;
  const captures = [];
  while (Date.now() < deadline && sample < MAX_STABILITY_SAMPLES) {
    const file = path.join(directory, `${prefix}-${String(sample).padStart(2, '0')}.png`); sample++;
    const image = await capturePng(file, windowId, tools, cwd, env); captures.push(image);
    if (previous && image.rasterSha256 === previous.rasterSha256) stable++;
    else stable = 1;
    previous = image;
    if (stable >= stableSamples) return { stableFrame: image, samples: captures };
    await delay(350);
  }
  throw new Error(`X11 image did not become pixel-stable within ${timeoutMs} ms or ${MAX_STABILITY_SAMPLES} captures`);
}

async function mouseMove(tools, windowId, point, cwd, env) {
  await toolCall(tools.xdotool.path,
    ['mousemove', '--sync', '--window', windowId, String(point.x), String(point.y)], { cwd, env, timeoutMs: 5000 });
  const location = await toolCall(tools.xdotool.path, ['getmouselocation', '--shell'], { cwd, env, timeoutMs: 5000 });
  const values = Object.fromEntries(location.stdout.toString('utf8').trim().split(/\r?\n/)
    .map((line) => line.split('=').map((v) => v.trim())).filter((row) => row.length === 2));
  assert.ok(Number.isFinite(Number(values.X)) && Number.isFinite(Number(values.Y)));
  assert.match(values.WINDOW ?? '', /^\d+$/, 'X11 pointer location lacks a target window');
}

async function neutralPointer(tools, windowId, cwd, env) {
  await mouseMove(tools, windowId, { x: 20, y: 300 }, cwd, env);
  await delay(300);
}

async function clickAt(tools, windowId, point, cwd, env, button = 1) {
  await mouseMove(tools, windowId, point, cwd, env);
  await toolCall(tools.xdotool.path,
    ['click', '--clearmodifiers', String(button)], { cwd, env, timeoutMs: 5000 });
}

async function captureSelection(tools, windowId, point, label, initialFrame, directory, env) {
  await delay(350);
  const selected = await capturePng(path.join(directory, `${label}.png`), windowId,
    tools, directory, env);
  assert.notEqual(selected.rasterSha256, initialFrame.rasterSha256,
    `selecting ${label} did not change the visible frame`);
  return selected;
}

async function dragOrbit(tools, windowId, start, end, cwd, env) {
  await mouseMove(tools, windowId, start, cwd, env);
  await toolCall(tools.xdotool.path, ['mousedown', '2'], { cwd, env, timeoutMs: 5000 });
  await mouseMove(tools, windowId, end, cwd, env);
  await toolCall(tools.xdotool.path, ['mouseup', '2'], { cwd, env, timeoutMs: 5000 });
}

async function readLatestPreferences(dataDirectory) {
  return readLogicalSlot(dataDirectory, DATA_FILES.preferences).newest.value;
}

async function waitForPreferences(dataDirectory, predicate, label, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await readLatestPreferences(dataDirectory);
      if (predicate(value)) return value;
    } catch (error) { lastError = error; }
    await delay(200);
  }
  throw new Error(`timed out waiting for persisted ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

async function waitForMoves(dataDirectory, count, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs; let lastError;
  while (Date.now() < deadline) {
    try {
      const slot = readLogicalSlot(dataDirectory, DATA_FILES.save);
      if (slot.newest.value.commands?.length >= count) return slot.newest;
    } catch (error) { lastError = error; }
    await delay(250);
  }
  throw new Error(`timed out waiting for move ${count} to persist${lastError ? `: ${lastError.message}` : ''}`);
}

function makeStorePoint(label, view) {
  assert.ok(view && Number.isInteger(view.yaw) && Number.isInteger(view.pitch) && Number.isInteger(view.zoom),
    `${label} preference view is incomplete`);
  return { label, view: { yaw: view.yaw, pitch: view.pitch, zoom: view.zoom } };
}

async function capturePcm(file, device, tools, directory, env, seconds) {
  assert.equal(fs.existsSync(file), false, `refuse to overwrite PCM output: ${file}`);
  const startedAt = new Date().toISOString();
  const result = await toolCall(tools.arecord.path,
    ['-q', '-D', device, '-t', 'raw', '-f', 'S16_LE', '-r', '48000', '-c', '2', '-d', String(seconds), file],
    { cwd: directory, env, timeoutMs: (seconds + 8) * 1000, maxOutputBytes: 500_000 });
  const bytes = readRegular(file, 'routed ALSA PCM capture');
  const completedAt = new Date().toISOString();
  return { path: file, startedAt, completedAt, ...assertPcmCaptureDuration(bytes, seconds),
    ...pcmRms16Stereo(bytes), toolSha256: tools.arecord.sha256,
    stderrSha256: digest(result.stderr), device };
}

async function politelyCloseWindow(windowId, tools, cwd, env) {
  await toolCall(tools.xdotool.path, ['windowclose', windowId],
    { cwd, env, timeoutMs: 8000, maxOutputBytes: 250_000 });
}

function assertTargetWindowCount(count, phase) {
  assert.equal(count, 0, `${phase}: an old NativeV2 window remains; process recovery is not authorized`);
}

function makeSessionReceipt(session, window, image, close, logs) {
  return { pid: session.pid, startedAt: session.startedAt,
    command: session.argv, cwd: session.packageDirectory, gpu: 'off',
    dataDirectory: session.dataDirectory, exit: session.exit,
    exitObserved: session.exitObserved, process: close, window, stableFrame: image.stableFrame,
    stabilityCaptures: image.samples, logs };
}

async function gracefulCleanup(session, windowId, tools, cwd, env) {
  if (!session || session.exitObserved) return { state: 'already-exited' };
  if (session.spawnError && !session.pid) return { state: 'spawn-failed-before-process-start',
    error: session.spawnError.message, pid: null, action: 'no process signal or window close was attempted' };
  if (!windowId) return { state: 'live-unmapped-or-ambiguous', pid: session.pid,
    action: 'no signal sent; owner must inspect the retained process/session' };
  try { await politelyCloseWindow(windowId, tools, cwd, env); }
  catch (error) { return { state: 'close-request-failed', error: String(error?.message ?? error),
    pid: session.pid, action: 'no signal sent; owner must inspect the retained process/session' }; }
  try { return { state: 'graceful-exit', ...(await awaitNativeExit(session, 10_000)) }; }
  catch (error) { return { state: 'exit-unobserved', pid: session.pid,
    error: String(error?.message ?? error), action: 'no signal sent; owner must inspect the retained process/session' }; }
}

function currentRootBinding() {
  return { commit: gitText(ROOT, ['rev-parse', 'HEAD']), tree: gitText(ROOT, ['rev-parse', 'HEAD^{tree}']),
    status: gitText(ROOT, ['status', '--porcelain', '--untracked-files=all']) };
}

export function assertRootBindingUnchanged(before, after) {
  assert.equal(before?.status, '', 'initial caller checkout must be clean');
  assert.deepEqual(after, before, 'caller source checkout drifted during NativeV2 runtime acceptance');
  return true;
}

async function runInteractive(args) {
  assert.equal(process.platform, 'linux', 'interactive gate can run only on Linux');
  assertLinuxNode();
  const selected = parseArguments(args);
  const pcmDevice = process.env.RIFT_CHESS_PCM_DEVICE;
  const prerequisites = assertInteractivePrerequisites(pcmDevice);
  const originalWindows = await windowIds(prerequisites.tools, ROOT,
    isolatedGuiEnvironment(ROOT));
  assertTargetWindowCount(originalWindows.length, 'preflight');
  let build = verifyPackageOnDisk(selected);
  const rootAtStart = currentRootBinding();
  assert.equal(rootAtStart.status, '', 'interactive gate requires a clean caller checkout');
  const runDirectory = makeRunDirectory();
  const dataDirectory = path.join(runDirectory, 'data');
  fs.mkdirSync(dataDirectory, { mode: 0o700 }); assertRealDirectory(dataDirectory);
  assert.deepEqual(fs.readdirSync(dataDirectory), []);
  const env = isolatedGuiEnvironment(dataDirectory);
  const sessions = []; const eventLog = [];
  let activeSession = null; let activeWindow = null;
  let activeWindowOwner = null;
  let failureWritten = false;
  const gates = { firstFrame: false, pieceSelectionAndMove: false, secondMoveForSaveRotation: false,
    orbit: false, wheelButton4ZoomIn: false, wheelButton5ZoomOut: false,
    wmDeleteCleanExit: false, sameDataDirectoryRelaunch: false, persistedMovesAndPreferences: false,
    routedPcm: prerequisites.pcm.status === 'not-configured' ? 'not-configured' : 'pending' };
  const receiptBase = { schema: 'rift-native-v2-2032-linux-interactive/1',
    evidenceClass: 'source-bound-live-Linux-X11-CPU-interaction-and-relaunch',
    startedAt: new Date().toISOString(), runner: { path: SCRIPT, sha256: SCRIPT_SHA256 },
    input: selected, package: { receipt: selected.packageReceipt,
      receiptSha256: selected.packageReceiptSha256, buildRoot: build.receipt.root,
      candidate: build.candidate, artifacts: build.verifiedFiles },
    rootAtStart, prerequisites, runDirectory, dataDirectory, gates,
    acceptanceLimits: [
      'This is a live Linux X11 CPU session; it does not claim GPU/native-parallel performance.',
      'An ALSA capture is routed PCM observation only and does not prove physical audibility.',
      'A screenshot difference plus exact persisted commands/preferences supports the runtime state; this is not owner visual acceptance.',
      'If the explicit PCM capture device is absent, PCM remains an unpassed, separately visible gate.',
    ] };
  try {
    const appSnapshot = () => {
      build = verifyPackageOnDisk(selected);
      return build.verifiedFiles;
    };
    const initialPackageFiles = appSnapshot();
    const initialPoint = squareInputPoint(12, { spriteHit: true });
    const e4Point = squareInputPoint(28);
    const blackE7Point = squareInputPoint(52, { spriteHit: true });
    const blackE5Point = squareInputPoint(36);
    assert.ok(initialPoint.x >= 64 && initialPoint.x < 576 && initialPoint.y >= 96 && initialPoint.y < 608);
    assert.ok(e4Point.x >= 64 && e4Point.x < 576 && e4Point.y >= 96 && e4Point.y < 608);
    const inputCoordinates = { camera: { yaw: 345, pitch: 67, zoom: 115, boardLeft: 64, boardTop: 96 },
      moves: [{ san: 'e2-e4', from: initialPoint, to: e4Point },
        { san: 'e7-e5', from: blackE7Point, to: blackE5Point }],
      sourceBindings: Object.fromEntries(['bend2/NativeV2.bend', 'bend2/ApplicationControl.bend',
        'bend2/core/Model.bend', 'bend2/graphics/Camera.bend', 'bend2/graphics/Scene.bend',
        'bend2/graphics/Sprites.bend', 'bend2/graphics/Picking.bend',
        'bend2/graphics/v2game/BoardScene.bend',
        'bend2/ui/Program.bend', 'bend2/ui/Types.bend', 'bend2/ui/Commands.bend',
        'bend2/ui/Codec.bend', 'bend2/ui/v2/ChromePlan.bend']
        .map((relative) => [relative, build.candidate.sourceSha256[relative]])) };
    for (const [relative, hash] of Object.entries(inputCoordinates.sourceBindings))
      assert.match(hash ?? '', /^[0-9a-f]{64}$/, `package does not bind coordinate source ${relative}`);
    receiptBase.inputCoordinates = inputCoordinates;

    activeSession = launchNative(build.binaryPath, build.packageDirectory, env, dataDirectory,
      build.receipt.binary.sha256);
    activeWindow = await waitForWindow(activeSession, prerequisites.tools, runDirectory, env);
    activeWindowOwner = activeSession;
    const processBindingOne = snapshotNativeProcess(activeSession.pid, build.binaryPath,
      build.receipt.binary.sha256, build.packageDirectory, dataDirectory);
    assert.equal(processGroupState(activeSession.pid), true, 'owned NativeV2 process group is absent before close');
    let windowInfo = await inspectWindow(activeWindow, prerequisites.tools, runDirectory, env);
    await neutralPointer(prerequisites.tools, activeWindow, runDirectory, env);
    let stable = await waitForStableFrame(activeWindow, 'initial', runDirectory,
      prerequisites.tools, runDirectory, env, { timeoutMs: STABLE_FRAME_TIMEOUT_MS });
    assert.equal(stable.stableFrame.width, 1024); assert.equal(stable.stableFrame.height, 640);
    gates.firstFrame = true;
    let pcmIdle = null; let pcmMove = null;
    let selectedPieceFrame = null;
    if (pcmDevice !== undefined) {
      pcmIdle = await capturePcm(path.join(runDirectory, 'pcm-idle.raw'), pcmDevice,
        prerequisites.tools, runDirectory, env, 2);
    }
    await clickAt(prerequisites.tools, activeWindow, initialPoint, runDirectory, env);
    eventLog.push({ event: 'left-click-select-source', square: 'e2', point: initialPoint });
    selectedPieceFrame = await captureSelection(prerequisites.tools, activeWindow, initialPoint,
      'selected-e2', stable.stableFrame, runDirectory, env);
    eventLog.push({ event: 'visible-piece-selection', square: 'e2', image: selectedPieceFrame });
    let firstMove;
    if (pcmDevice !== undefined) {
      const concurrentMove = await withObservedCapture(async (captureState) => {
        await delay(250);
        requireCapturePending(captureState);
        await clickAt(prerequisites.tools, activeWindow, e4Point, runDirectory, env);
        const moveInputAt = new Date().toISOString();
        eventLog.push({ event: 'left-click-move-target', square: 'e4', point: e4Point,
          moveInputAt, pcmCaptureState: 'supervised-active' });
        const storedMove = await waitForMoves(dataDirectory, 1);
        assert.equal(storedMove.value.commands[0].action, EXPECTED_MOVES[0].action,
          'first physical input did not commit e2-e4');
        return { storedMove, moveInputAt };
      }, capturePcm(path.join(runDirectory, 'pcm-move.raw'), pcmDevice,
        prerequisites.tools, runDirectory, env, 3));
      firstMove = concurrentMove.result.storedMove;
      pcmMove = concurrentMove.capture;
      const pcmOverlap = assertPcmCaptureOverlapsMove(pcmMove, concurrentMove.result.moveInputAt);
      eventLog.push({ event: 'pcm-move-overlap', ...pcmOverlap });
      assert.equal(firstMove.value.commands[0].action, EXPECTED_MOVES[0].action,
        'first physical input did not commit e2-e4');
      gates.pieceSelectionAndMove = true;
      const pcmDelta = assertPcmMoveEvidence(pcmIdle, pcmMove);
      gates.routedPcm = { status: 'passed', device: pcmDevice, idle: pcmIdle, move: pcmMove,
        overlap: pcmOverlap, comparison: pcmDelta };
    } else {
      await clickAt(prerequisites.tools, activeWindow, e4Point, runDirectory, env);
      eventLog.push({ event: 'left-click-move-target', square: 'e4', point: e4Point });
      firstMove = await waitForMoves(dataDirectory, 1);
      assert.equal(firstMove.value.commands[0].action, EXPECTED_MOVES[0].action,
        'first physical input did not commit e2-e4');
      gates.pieceSelectionAndMove = true;
    }
    await delay(600);
    await clickAt(prerequisites.tools, activeWindow, blackE7Point, runDirectory, env);
    eventLog.push({ event: 'left-click-select-source', square: 'e7', point: blackE7Point });
    await clickAt(prerequisites.tools, activeWindow, blackE5Point, runDirectory, env);
    eventLog.push({ event: 'left-click-move-target', square: 'e5', point: blackE5Point });
    const secondMove = await waitForMoves(dataDirectory, 2);
    assert.equal(secondMove.value.commands[1].action, EXPECTED_MOVES[1].action,
      'second physical input did not commit e7-e5');
    gates.secondMoveForSaveRotation = true;
    await delay(700);

    const beforeOrbit = await readLatestPreferences(dataDirectory);
    const orbitStart = { x: 320, y: 320 }; const orbitEnd = { x: 374, y: 286 };
    await dragOrbit(prerequisites.tools, activeWindow, orbitStart, orbitEnd, runDirectory, env);
    eventLog.push({ event: 'middle-button-drag-orbit', from: orbitStart, to: orbitEnd });
    const afterOrbit = await waitForPreferences(dataDirectory,
      (value) => value?.view?.yaw !== beforeOrbit.view.yaw || value?.view?.pitch !== beforeOrbit.view.pitch,
      'orbit view');
    gates.orbit = true;
    const zoomBefore = afterOrbit.view.zoom;
    await mouseMove(prerequisites.tools, activeWindow, { x: 320, y: 320 }, runDirectory, env);
    await toolCall(prerequisites.tools.xdotool.path, ['click', '4'], { cwd: runDirectory, env, timeoutMs: 5000 });
    eventLog.push({ event: 'wheel-button-4', expected: 'zoom in' });
    const zoomIn = await waitForPreferences(dataDirectory,
      (value) => value?.view?.zoom > zoomBefore, 'button-4 zoom-in preference');
    assertZoomDirection(zoomBefore, zoomIn.view.zoom, 'in');
    gates.wheelButton4ZoomIn = true;
    await toolCall(prerequisites.tools.xdotool.path, ['click', '5'], { cwd: runDirectory, env, timeoutMs: 5000 });
    eventLog.push({ event: 'wheel-button-5', expected: 'zoom out' });
    const zoomOut = await waitForPreferences(dataDirectory,
      (value) => value?.view?.zoom < zoomIn.view.zoom, 'button-5 zoom-out preference');
    assertZoomDirection(zoomIn.view.zoom, zoomOut.view.zoom, 'out');
    gates.wheelButton5ZoomOut = true;
    const prefsSummary = makeStorePoint('final-before-close', zoomOut.view);

    await neutralPointer(prerequisites.tools, activeWindow, runDirectory, env);
    eventLog.push({ event: 'neutral-pointer-before-frame-capture', point: { x: 20, y: 300 } });
    const afterMoves = await waitForStableFrame(activeWindow, 'after-actions', runDirectory,
      prerequisites.tools, runDirectory, env, { timeoutMs: STABLE_FRAME_TIMEOUT_MS });
    assert.notEqual(afterMoves.stableFrame.rasterSha256, stable.stableFrame.rasterSha256,
      'input sequence did not change the rendered pixels');
    const persistedBeforeClose = validatePersistedState(dataDirectory);
    assert.equal(persistedBeforeClose.preferences.view.yaw, prefsSummary.view.yaw);
    assert.equal(persistedBeforeClose.preferences.view.pitch, prefsSummary.view.pitch);
    assert.equal(persistedBeforeClose.preferences.view.zoom, prefsSummary.view.zoom);
    assert.equal(afterMoves.samples.at(-1).rasterSha256, afterMoves.stableFrame.rasterSha256);
    assert.deepEqual(descendantsOf(activeSession.pid), [], 'NativeV2 spawned an unexpected process descendant');

    await politelyCloseWindow(activeWindow, prerequisites.tools, runDirectory, env);
    eventLog.push({ event: 'xdotool-windowclose', protocol: 'WM_DELETE_WINDOW' });
    const exitOne = await awaitNativeExit(activeSession);
    gates.wmDeleteCleanExit = true;
    const logOne = saveSessionOutput(runDirectory, 1, activeSession);
    sessions.push({ ...makeSessionReceipt(activeSession, windowInfo, afterMoves, exitOne, logOne),
      processBinding: processBindingOne });
    assertTargetWindowCount((await windowIds(prerequisites.tools, runDirectory, env)).length, 'after first exit');
    const packageFilesAfterFirst = appSnapshot();
    assert.deepEqual(packageFilesAfterFirst, initialPackageFiles, 'interactive session mutated package/build inputs');

    const persisted = validatePersistedState(dataDirectory);
    const expectedPref = persisted.preferences.view;
    activeSession = null; activeWindow = null; activeWindowOwner = null;
    activeSession = launchNative(build.binaryPath, build.packageDirectory, env, dataDirectory,
      build.receipt.binary.sha256);
    activeWindow = await waitForWindow(activeSession, prerequisites.tools, runDirectory, env);
    activeWindowOwner = activeSession;
    const processBindingTwo = snapshotNativeProcess(activeSession.pid, build.binaryPath,
      build.receipt.binary.sha256, build.packageDirectory, dataDirectory);
    assert.equal(processGroupState(activeSession.pid), true, 'relaunch NativeV2 process group is absent before close');
    windowInfo = await inspectWindow(activeWindow, prerequisites.tools, runDirectory, env);
    await neutralPointer(prerequisites.tools, activeWindow, runDirectory, env);
    stable = await waitForStableFrame(activeWindow, 'relaunch', runDirectory,
      prerequisites.tools, runDirectory, env, { timeoutMs: STABLE_FRAME_TIMEOUT_MS, stableSamples: 3 });
    const relaunchComparison = assertRelaunchFrameMatch(afterMoves.stableFrame,
      stable.stableFrame, expectedPref);
    gates.sameDataDirectoryRelaunch = true;
    gates.persistedMovesAndPreferences = true;
    await politelyCloseWindow(activeWindow, prerequisites.tools, runDirectory, env);
    eventLog.push({ event: 'xdotool-windowclose-relaunch', protocol: 'WM_DELETE_WINDOW' });
    const exitTwo = await awaitNativeExit(activeSession);
    const logTwo = saveSessionOutput(runDirectory, 2, activeSession);
    sessions.push({ ...makeSessionReceipt(activeSession, windowInfo, stable, exitTwo, logTwo),
      processBinding: processBindingTwo });
    assertTargetWindowCount((await windowIds(prerequisites.tools, runDirectory, env)).length, 'after relaunch exit');
    assert.deepEqual(appSnapshot(), initialPackageFiles, 'relaunch mutated package/build inputs');
    const persistedAfter = validatePersistedState(dataDirectory);
    assert.deepEqual(persistedAfter, persisted, 'relaunch modified save/preferences slots');
    const dataFiles = fs.readdirSync(dataDirectory).sort().map((name) => {
      const file = path.join(dataDirectory, name); const bytes = readRegular(file, `saved data ${name}`);
      return { name, bytes: bytes.length, sha256: digest(bytes) };
    });
    const finalRoot = currentRootBinding();
    assertRootBindingUnchanged(rootAtStart, finalRoot);
    const acceptance = classifyInteractiveAcceptance(gates);
    const { guiRestartPassed, nativeGuiPcmAcceptance } = acceptance;
    const receipt = { ...receiptBase, ok: nativeGuiPcmAcceptance,
      status: acceptance.status,
      guiRestartPassed, nativeGuiPcmAcceptance,
      completedAt: new Date().toISOString(), gates,
      sessions, events: eventLog, persistence: persistedAfter, relaunchComparison, dataFiles,
      finalPackageFiles: appSnapshot(),
      finalRoot,
      acceptance: { interactiveCpuX11: 'passed', cleanWmDeleteRestart: 'passed',
        audio: gates.routedPcm === 'not-configured' ? 'not-run-no-explicit-capture-route' : 'passed',
        nativeGuiPcm: nativeGuiPcmAcceptance ? 'passed' : 'not-passed',
        gpu: 'not-run', visualOwnerAcceptance: 'not-claimed', physicalAudibility: 'not-claimed' } };
    const receiptFile = writeJsonExclusive(path.join(runDirectory, 'interactive-result.json'), receipt);
    process.stdout.write(`${JSON.stringify({ ok: nativeGuiPcmAcceptance,
      partial: guiRestartPassed && !nativeGuiPcmAcceptance,
      runDirectory,
      receipt: receiptFile.path, receiptSha256: receiptFile.sha256,
      gates, savedCommands: persistedAfter.save.commands.map((row) => row.action),
      finalView: persistedAfter.preferences.view,
      guiRestartPassed, nativeGuiPcmAcceptance,
      pcm: gates.routedPcm === 'not-configured' ? 'not-configured' : 'captured-routed-pcm-only' })}\n`);
    if (!nativeGuiPcmAcceptance) process.exitCode = 2;
  } catch (error) {
    let cleanup = { state: 'not-needed' };
    if (activeSession && !activeSession.exitObserved)
      cleanup = await gracefulCleanup(activeSession,
        windowIdForOwnedSession(activeWindow, activeWindowOwner, activeSession),
        prerequisites.tools, runDirectory, env);
    if (activeSession && !activeSession.exitObserved) {
      activeSession.child.unref();
      activeSession.child.stdout?.unref?.();
      activeSession.child.stderr?.unref?.();
    }
    if (activeSession && (activeSession.exitObserved || activeSession.spawnError)
      && !activeSession.closeObserved) {
      try { cleanup.close = await awaitNativeClose(activeSession, 5000); }
      catch (closeError) {
        cleanup.closeObserver = { state: 'unobserved', error: String(closeError?.message ?? closeError) };
      }
    }
    if (activeSession) {
      try {
        const logOrdinal = sessions.length + 1;
        const logs = saveSessionOutput(runDirectory, logOrdinal, activeSession);
        sessions.push({ pid: activeSession.pid, startedAt: activeSession.startedAt,
          exitObserved: activeSession.exitObserved, exit: activeSession.exit,
          processState: cleanup, logs });
      } catch { /* retain failure even if log publication is unavailable */ }
    }
    const failure = { ...receiptBase, ok: false, failedAt: new Date().toISOString(),
      error: String(error?.stack ?? error).slice(0, 5000), gates, sessions, events: eventLog,
      cleanup, processState: activeSession ? { pid: activeSession.pid,
        exitObserved: activeSession.exitObserved, exit: activeSession.exit,
        processGroup: processGroupState(activeSession.pid), descendants: activeSession.exitObserved
          ? [] : (() => { try { return descendantsOf(activeSession.pid); } catch { return 'unknown'; } })() } : null,
      currentPackageFiles: (() => { try { return verifyPackageOnDisk(selected).verifiedFiles; }
        catch (verifyError) { return { verificationError: String(verifyError?.message ?? verifyError) }; } })(),
      finalRoot: (() => { try { return currentRootBinding(); } catch { return null; } })() };
    try { writeJsonExclusive(path.join(runDirectory, 'interactive-failure.json'), failure); failureWritten = true; }
    catch (writeError) { process.stderr.write(`Could not preserve interactive failure receipt: ${writeError.message}\n`); }
    process.stderr.write(`NativeV2 interactive gate failed; outputs retained at ${runDirectory}; `
      + `failure receipt ${failureWritten ? 'written' : 'unavailable'}; cleanup=${cleanup.state}: `
      + `${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(SCRIPT)) {
  try { await runInteractive(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`NativeV2 interactive preflight stopped before launch: ${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}
