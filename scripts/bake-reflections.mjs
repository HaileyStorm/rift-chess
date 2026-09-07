import { chromium } from 'playwright';
import { build, preview } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const run = promisify(execFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const themes = ['gallery', 'nocturne', 'daylight'];
const qualities = ['low', 'balanced', 'high'];
const producerParameters = { baseRoomSigma: 0.04, sigma: 0.035, near: 0.15, far: 100, position: [0, 1.2, 0], worldTime: 0, worldPulse: 0 };
const textureContract = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, mapping: THREE.CubeUVReflectionMapping, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, anisotropy: 1, colorSpace: THREE.LinearSRGBColorSpace, generateMipmaps: false, flipY: false, premultiplyAlpha: false, unpackAlignment: 4 };

async function bounded(operation, label, milliseconds = 120000) {
  let timer;
  try { return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds); })]); }
  finally { clearTimeout(timer); }
}

function parseOutput(argv) {
  if (argv.length !== 2 || argv[0] !== '--output' || !argv[1]) throw new Error('Usage: node scripts/bake-reflections.mjs --output <new-directory>');
  return path.resolve(argv[1]);
}

async function filesIn(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Links are not allowed in bake input or output: ${file}`);
    if (entry.isDirectory()) files.push(...await filesIn(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

async function freshDirectory(directory) {
  try { await fs.stat(directory); } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') { await fs.mkdir(directory, { recursive: true }); return; }
    throw error;
  }
  throw new Error(`Output directory must be new: ${directory}`);
}

async function hashFiles(root, names) {
  return Object.fromEntries(await Promise.all(names.map(async name => [name, hash(await fs.readFile(path.join(root, name)))])));
}

async function buildTool(repo, output, inputHashes) {
  const toolDist = path.join(output, 'tool-dist');
  await fs.mkdir(toolDist);
  await build({
    configFile: false,
    root: path.join(repo, 'scripts', 'reflection-bake'),
    base: './',
    publicDir: false,
    build: { outDir: toolDist, emptyOutDir: false },
  });
  await fs.mkdir(path.join(toolDist, 'assets'), { recursive: true });
  await fs.copyFile(path.join(repo, 'public/assets/marble-albedo.png'), path.join(toolDist, 'assets/marble-albedo.png'), fs.constants.COPYFILE_EXCL);
  const built = Object.fromEntries(await Promise.all((await filesIn(toolDist)).sort().map(async file => [path.relative(toolDist, file).replaceAll('\\', '/'), hash(await fs.readFile(file))])));
  const sourceBuild = { schema: 'rift-reflection-source-build/1', inputHashes, built };
  sourceBuild.buildId = hash(Buffer.from(JSON.stringify(sourceBuild)));
  await fs.writeFile(path.join(toolDist, 'bake-build.json'), JSON.stringify(sourceBuild, null, 2), { flag: 'wx' });
  return { toolDist, sourceBuild };
}

async function openPreview(repo, toolDist) {
  const server = await preview({ configFile: false, root: repo, base: './', build: { outDir: toolDist }, preview: { host: '127.0.0.1', port: 0 } });
  const address = server.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('Preview server has no numeric loopback address.');
  const base = `http://127.0.0.1:${address.port}/`;
  return {
    base,
    ownership: { type: 'in-process Vite preview owned by bake-reflections', pid: process.pid, root: toolDist },
    close: () => new Promise((resolve, reject) => {
      server.httpServer.close(error => error ? reject(error) : resolve());
      server.httpServer.closeAllConnections?.();
    }),
  };
}

function expectedDimensions(quality) {
  return quality === 'high' ? { width: 768, height: 1024 } : { width: 384, height: 512 };
}

function validateCapture(captured, theme, quality) {
  if (!captured || captured.theme !== theme || captured.quality !== quality || !captured.target || !captured.texture || !captured.pixels) throw new Error(`Malformed capture response for ${theme}/${quality}.`);
  const expected = expectedDimensions(quality);
  if (captured.target.width !== expected.width || captured.target.height !== expected.height) throw new Error(`Unexpected dimensions for ${theme}/${quality}.`);
  if (captured.pixels.byteOrder !== 'little-endian' || captured.pixels.encoding !== 'base64 raw Uint16Array RGBA HalfFloat bytes') throw new Error(`Unexpected raw pixel contract for ${theme}/${quality}.`);
  if (typeof captured.pixels.base64 !== 'string' || !Number.isInteger(captured.pixels.byteLength)) throw new Error(`Missing raw texels for ${theme}/${quality}.`);
  assert.equal(captured.producer, 'ReflectionBakeProducer');
  assert.equal(captured.threeRevision, THREE.REVISION);
  assert.equal(typeof captured.renderer, 'string');
  assert.deepEqual(captured.texture, textureContract);
  return expected;
}

const repo = path.resolve('.');
const output = parseOutput(process.argv.slice(2));
const inputs = ['src/render/world.ts', 'src/render/surfaces.ts', 'scripts/reflection-bake/producer.ts', 'scripts/reflection-bake/capture.ts', 'scripts/reflection-bake/index.html', 'public/assets/marble-albedo.png', 'scripts/pack-reflection.py', 'scripts/bake-reflections.mjs', 'node_modules/three/package.json'];
await freshDirectory(output);
const receipt = { schema: 'rift-reflection-bake-receipt/1', status: 'RUNNING', entries: [], errors: [] };
let browser; let context; let previewServer;
try {
  const inputHashes = await hashFiles(repo, inputs);
  const threeVersion = JSON.parse(await fs.readFile(path.join(repo, 'node_modules/three/package.json'), 'utf8')).version;
  const { toolDist, sourceBuild } = await buildTool(repo, output, inputHashes);
  assert.deepEqual(await hashFiles(repo, inputs), inputHashes, 'Recipe inputs changed during build.');
  previewServer = await openPreview(repo, toolDist);
  receipt.runtimeBinding = { buildId: sourceBuild.buildId, ownership: previewServer.ownership, servedAssets: [] };
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
  context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === new URL(previewServer.base).origin) return route.continue();
    receipt.errors.push('External request blocked by the reflection bake'); return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  const responseChecks = [];
  let responseFailure = null;
  const track = promise => { responseChecks.push(promise); void promise.catch(error => { responseFailure ??= error; }); };
  page.on('response', response => track((async () => {
    const url = new URL(response.url());
    assert.equal(url.origin, new URL(previewServer.base).origin, 'Unbound bake response origin');
    const file = decodeURIComponent(url.pathname.replace(/^\/+/, '') || 'index.html');
    if (file === 'bake-build.json') return;
    if (file.includes('..') || !Object.hasOwn(sourceBuild.built, file)) throw new Error(`Unexpected served bake file: ${file}`);
    const bytes = await response.body();
    assert.equal(hash(bytes), sourceBuild.built[file], `Served bake asset mismatch: ${file}`);
    receipt.runtimeBinding.servedAssets.push({ file, sha256: hash(bytes) });
  })()));
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.goto(previewServer.base, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.reflectionCapture), null, { timeout: 120000 });
  const servedBuild = await page.evaluate(async () => (await fetch('./bake-build.json')).json());
  assert.deepEqual(servedBuild, sourceBuild, 'Served source-build manifest differs from the local build manifest.');
  let textureMetadata = null;
  receipt.platform = { browser: await browser.version(), ...await page.evaluate(() => ({ platform: navigator.platform, devicePixelRatio })) };
  for (const theme of themes) for (const quality of qualities) {
    const captured = await bounded(page.evaluate(({ theme, quality }) => window.reflectionCapture.capture(theme, quality), { theme, quality }), `Capture ${theme}/${quality}`);
    const expected = validateCapture(captured, theme, quality);
    const metadata = { producer: captured.producer, texture: captured.texture };
    if (textureMetadata === null) textureMetadata = metadata;
    else assert.deepEqual(metadata, textureMetadata, `Capture metadata differs for ${theme}/${quality}.`);
    receipt.platform.renderer ??= captured.renderer;
    assert.equal(captured.renderer, receipt.platform.renderer);
    const raw = Buffer.from(captured.pixels.base64, 'base64');
    if (raw.toString('base64') !== captured.pixels.base64 || raw.length !== captured.pixels.byteLength || raw.length !== expected.width * expected.height * 8) throw new Error(`Malformed raw texels for ${theme}/${quality}.`);
    const key = `${theme}-${quality}`;
    const rawFile = `${key}.rgba16`;
    const pngFile = `${key}.png`;
    const rawPath = path.join(output, rawFile);
    const pngPath = path.join(output, pngFile);
    await fs.writeFile(rawPath, raw, { flag: 'wx' });
    const packed = JSON.parse((await run('python', [path.join(repo, 'scripts/pack-reflection.py'), rawPath, String(expected.width), String(expected.height), pngPath], { timeout: 120000, maxBuffer: 1024 * 1024 })).stdout);
    if (packed.rawSha256 !== hash(raw) || packed.encoding !== 'rgba16le-rgb8-triplets/1') throw new Error(`Python packing receipt mismatch for ${key}.`);
    assert.equal(packed.pngSha256, hash(await fs.readFile(pngPath)));
    receipt.entries.push({ theme, quality, width: expected.width, height: expected.height, file: pngFile, texelSha256: hash(raw), pngSha256: packed.pngSha256, rawFile, rawBytes: raw.length, packing: packed });
    console.log(JSON.stringify({ captured: key, pngBytes: packed.pngBytes }));
  }
  assert.equal(receipt.entries.length, 9, 'Expected exactly nine reflection captures.');
  assert.equal(new Set(receipt.entries.map(entry => `${entry.theme}:${entry.quality}`)).size, 9, 'Reflection captures are not unique.');
  await Promise.all(responseChecks);
  if (responseFailure) throw responseFailure;
  assert.ok(receipt.runtimeBinding.servedAssets.some(asset => asset.file.endsWith('.js')));
  assert.ok(receipt.runtimeBinding.servedAssets.some(asset => asset.file === 'index.html'));
  assert.ok(receipt.runtimeBinding.servedAssets.some(asset => asset.file.endsWith('marble-albedo.png')));
  assert.deepEqual(receipt.errors, [], 'Page or console errors occurred during capture.');
  const finalHashes = await hashFiles(repo, inputs);
  assert.deepEqual(finalHashes, inputHashes, 'Recipe inputs changed during capture.');
  const manifest = { schema: 'rift-reflections/1', encoding: 'rgba16le-rgb8-triplets/1', texture: textureMetadata.texture, entries: receipt.entries.map(({ theme, quality, width, height, file, texelSha256, pngSha256 }) => ({ theme, quality, width, height, file, texelSha256, pngSha256 })), inputHashes, threeVersion, producerParameters, platform: receipt.platform, sourceBuild: { buildId: sourceBuild.buildId } };
  await fs.writeFile(path.join(output, 'source-build.json'), JSON.stringify(sourceBuild, null, 2), { flag: 'wx' });
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  receipt.status = 'CAPTURED';
} catch (error) {
  receipt.status = 'FAILED';
  receipt.failure = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
} finally {
  for (const [label, close] of [['context', () => context?.close()], ['browser', () => browser?.close()], ['preview', () => previewServer?.close()]]) {
    try { await bounded(Promise.resolve(close()), `Close ${label}`, 30000); }
    catch (error) { receipt.status = 'FAILED'; receipt.errors.push(String(error)); process.exitCode = 1; }
  }
  await fs.writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ status: receipt.status, entries: receipt.entries.length, output }));
}
