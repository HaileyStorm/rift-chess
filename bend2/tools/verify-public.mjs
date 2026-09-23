import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'bend2/dist');
const stage = path.join(root, '.artifacts/pages-bend2-20260922');
const base = new URL('https://haileystorm.github.io/rift-chess-bend2/');
const original = new URL('https://haileystorm.github.io/rift-chess/');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const buildBytes = fs.readFileSync(path.join(dist, 'build.json'));
const build = JSON.parse(buildBytes);
if (build.schema !== 'rift-bend-browser/2' || build.draft || build.sourceDirty) {
  throw new Error('Publish a clean, non-draft v2 build.');
}
const currentRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceRevision = build.sourceRevision;
const pagesRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: stage, encoding: 'utf8' }).trim();
execFileSync('git', ['merge-base', '--is-ancestor', sourceRevision, currentRevision], { cwd: root });
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'bend2/docs/evidence/camera-v1/publication.json')));
const out = path.join(root, '.artifacts/bend2/publication', `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${crypto.randomUUID().slice(0, 8)}`);
fs.mkdirSync(out, { recursive: true });
const receipt = { schema: 'rift-bend-publication/2', at: new Date().toISOString(), url: base.href,
  sourceRevision, currentRevision, pagesRevision, buildVersion: build.version, semanticSha256: build.semanticSha256,
  buildSha256: sha(buildBytes), assets: [], nativeCLI: null, originalUnchanged: [], errors: [] };

async function checkFile(url, file, expected, local = null) {
  if (!/^[A-Za-z0-9._-]+$/.test(file) || file === '.' || file === '..') {
    throw new Error(`Unsafe static asset name: ${file}`);
  }
  const target = new URL(file, url);
  if (target.origin !== url.origin || !target.pathname.startsWith(url.pathname)) {
    throw new Error(`Asset escapes the expected Pages scope: ${file}`);
  }
  target.searchParams.set('verify', build.version);
  const response = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  const actual = sha(bytes);
  if (local && sha(fs.readFileSync(local)) !== expected) throw new Error(`Local build changed: ${file}`);
  return { file, status: response.status, sha256: actual, expectedSha256: expected,
    ok: response.status === 200 && actual === expected };
}

try {
  receipt.assets.push(await checkFile(base, 'build.json', sha(buildBytes), path.join(dist, 'build.json')));
  for (const [file, digest] of Object.entries(build.files)) {
    receipt.assets.push(await checkFile(base, file, digest, path.join(dist, file)));
  }
  const nativeManifestPath = process.env.BEND_NATIVE_CLI_MANIFEST;
  if (nativeManifestPath) {
    const nativeBytes = fs.readFileSync(nativeManifestPath);
    const native = JSON.parse(nativeBytes);
    if (native.schema !== 'rift-chess-native-cli-export/1' || native.sourceDirty ||
        native.sourceRevision !== sourceRevision ||
        native.frozen.semanticV2Sha256 !== build.semanticSha256) {
      throw new Error('Native CLI C manifest is not bound to the clean browser release source.');
    }
    const sourceFile = path.join(path.dirname(path.resolve(nativeManifestPath)), native.cSource);
    if (sha(fs.readFileSync(sourceFile)) !== native.cSourceSha256) {
      throw new Error('Native CLI C artifact differs from its export manifest.');
    }
    const servedName = `rift-chess-native-cli-${native.cSourceSha256.slice(0, 12)}.c`;
    receipt.nativeCLI = await checkFile(base, servedName, native.cSourceSha256,
      path.join(stage, servedName));
    receipt.nativeCLI.manifestSha256 = sha(nativeBytes);
  }
  for (const { file, sha256 } of baseline.originalUnchanged) {
    receipt.originalUnchanged.push(await checkFile(original, file, sha256));
  }
} catch (error) {
  receipt.errors.push(String(error.stack || error));
}
receipt.ok = receipt.errors.length === 0 &&
  [...receipt.assets, ...receipt.originalUnchanged].every(entry => entry.ok) &&
  (!process.env.BEND_NATIVE_CLI_MANIFEST || receipt.nativeCLI?.ok === true) &&
  receipt.assets.length === Object.keys(build.files).length + 1 &&
  receipt.originalUnchanged.length === baseline.originalUnchanged.length;
fs.writeFileSync(path.join(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ out, ok: receipt.ok, version: build.version,
  assets: receipt.assets.length, nativeCLI: receipt.nativeCLI?.ok ?? null,
  original: receipt.originalUnchanged.length,
  failures: [...receipt.assets, receipt.nativeCLI, ...receipt.originalUnchanged].filter(entry => entry && !entry.ok),
  errors: receipt.errors }));
if (!receipt.ok) process.exitCode = 1;
