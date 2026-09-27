import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, '.artifacts/bend2/v2-preview/dist');
const hostedRoot = path.join(root, '.artifacts/bend2/hosted');
const stage = path.resolve(process.env.BEND_PAGES_CHECKOUT ||
  path.join(hostedRoot, 'pages-repo-20260927'));
if (!stage.startsWith(`${hostedRoot}${path.sep}`)) {
  throw new Error('The Pages checkout must be inside the ignored hosted workspace.');
}
const base = new URL('https://haileystorm.github.io/rift-chess-bend2/');
const original = new URL('https://haileystorm.github.io/rift-chess/');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const buildBytes = fs.readFileSync(path.join(dist, 'build.json'));
const build = JSON.parse(buildBytes);
if (build.schema !== 'rift-bend-browser/2' || !build.v2Preview || build.draft || build.sourceDirty ||
    build.toolchain?.bendVersion !== '2.0.27') {
  throw new Error('Expected a clean, non-draft 2.0.27 v2 browser build.');
}
const currentRevision = git(root, 'rev-parse', 'HEAD');
git(root, 'merge-base', '--is-ancestor', build.sourceRevision, currentRevision);
if (git(stage, 'remote', 'get-url', 'origin') !== 'https://github.com/HaileyStorm/rift-chess-bend2.git' ||
    git(stage, 'status', '--porcelain') !== '' ||
    git(stage, 'branch', '--show-current') !== 'main') {
  throw new Error('Pages checkout must be the clean, expected main branch and remote.');
}
const pagesRevision = git(stage, 'rev-parse', 'HEAD');
const remoteLine = git(stage, 'ls-remote', 'origin', 'refs/heads/main');
if (remoteLine !== `${pagesRevision}\trefs/heads/main`) {
  throw new Error('The Pages checkout HEAD is not the published remote main.');
}
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'bend2/docs/evidence/camera-v1/publication.json')));
const out = path.join(root, '.artifacts/bend2/publication',
  `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${crypto.randomUUID().slice(0, 8)}`);
fs.mkdirSync(out, { recursive: true });
const receipt = { schema: 'rift-bend-hosted-v2/1', at: new Date().toISOString(), url: base.href,
  sourceRevision: build.sourceRevision, currentRevision, pagesRevision,
  pagesRemoteRevision: pagesRevision,
  buildVersion: build.version, buildSha256: sha(buildBytes),
  assets: [], originalUnchanged: [], errors: [] };

function safeName(file) {
  if (typeof file !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(file) ||
      file.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe manifest path: ${file}`);
  }
  return file;
}

async function checkFile(url, file, expected, localPaths = []) {
  safeName(file);
  const target = new URL(file, url);
  if (target.origin !== url.origin || !target.pathname.startsWith(url.pathname)) {
    throw new Error(`Asset escapes the expected Pages scope: ${file}`);
  }
  for (const local of localPaths) {
    if (sha(fs.readFileSync(local)) !== expected) throw new Error(`Local file changed: ${local}`);
  }
  target.searchParams.set('verify', build.version);
  const response = await fetch(target, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  const actual = sha(Buffer.from(await response.arrayBuffer()));
  const contentType = response.headers.get('content-type');
  const moduleFile = /(?:\.mjs|(?:host|worker-v2|sprite-helper)-.*\.js)$/.test(file);
  const mimeOk = !moduleFile || /^(?:text|application)\/javascript\b/i.test(contentType || '');
  return { file, status: response.status, sha256: actual, expectedSha256: expected,
    contentType, mimeOk, ok: response.status === 200 && actual === expected && mimeOk };
}

try {
  receipt.assets.push(await checkFile(base, 'build.json', sha(buildBytes),
    [path.join(dist, 'build.json'), path.join(stage, 'build.json')]));
  for (const [file, digest] of Object.entries(build.files)) {
    receipt.assets.push(await checkFile(base, file, digest,
      [path.join(dist, safeName(file)), path.join(stage, safeName(file))]));
  }
  for (const { file, sha256 } of baseline.originalUnchanged) {
    receipt.originalUnchanged.push(await checkFile(original, file, sha256));
  }
} catch (error) {
  receipt.errors.push(String(error.stack || error));
}
receipt.ok = receipt.errors.length === 0 &&
  [...receipt.assets, ...receipt.originalUnchanged].every(entry => entry.ok) &&
  receipt.assets.length === Object.keys(build.files).length + 1 &&
  receipt.originalUnchanged.length === baseline.originalUnchanged.length;
fs.writeFileSync(path.join(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ out, ok: receipt.ok, version: build.version,
  assets: receipt.assets.length, original: receipt.originalUnchanged.length,
  failures: [...receipt.assets, ...receipt.originalUnchanged].filter(entry => !entry.ok),
  errors: receipt.errors }));
if (!receipt.ok) process.exitCode = 1;
