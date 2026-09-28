// Read-only local server for one manifest-bound, nonce-private 2.0.28 build.
// Never serves the pinned preview, toolchain, repository, or arbitrary paths.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const store = path.join(root, '.artifacts/bend2/toolchain-patches/browser-2028-candidate');
const dist = path.resolve(process.env.BEND_CANDIDATE_DIST || '');
const runRoot = path.dirname(dist);
const port = Number(process.argv[2] || 4192);
assert.ok(process.env.BEND_CANDIDATE_DIST && dist.startsWith(`${store}${path.sep}`) &&
  path.basename(dist) === 'dist' && /^run-[A-Za-z0-9-]+$/.test(path.basename(runRoot)) &&
  fs.lstatSync(dist).isDirectory() && !fs.lstatSync(dist).isSymbolicLink() &&
  !fs.lstatSync(runRoot).isSymbolicLink() &&
  fs.realpathSync(dist).startsWith(`${fs.realpathSync(store)}${path.sep}`),
  'Only a real nonce-private candidate dist may be served');
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535, 'Invalid local port');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const buildBytes = fs.readFileSync(path.join(dist, 'build.json'));
const build = JSON.parse(buildBytes);
const receipt = JSON.parse(fs.readFileSync(path.join(runRoot, 'receipt.json'), 'utf8'));
assert.equal(receipt.status, 'success');
assert.equal(path.resolve(receipt.dist), dist);
assert.equal(receipt.buildVersion, build.version);
assert.equal(receipt.sourceRevision, build.sourceRevision);
assert.deepEqual(receipt.buildFiles, build.files);
assert.equal(receipt.candidateCompiler.baseCommit, build.compiler?.baseCommit);
assert.equal(build.candidate, true);
assert.equal(build.draft, true);
assert.equal(build.compiler?.version, '2.0.28');
const expected = new Map([['build.json', sha(buildBytes)], ...Object.entries(build.files)]);
function candidateFile(name) {
  assert.match(name, /^[A-Za-z0-9._/-]+$/, 'Unsafe candidate path');
  assert.ok(name.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe path segment');
  const file = path.resolve(dist, ...name.split('/'));
  assert.ok(file.startsWith(`${dist}${path.sep}`) &&
    fs.realpathSync(file).startsWith(`${fs.realpathSync(dist)}${path.sep}`) &&
    fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink(),
    `Candidate file escaped its dist: ${name}`);
  return file;
}
for (const [name, digest] of expected) {
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(sha(fs.readFileSync(candidateFile(name))), digest, `Candidate asset changed: ${name}`);
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.rga': 'application/octet-stream',
  '.txt': 'text/plain', '.md': 'text/markdown' };
const server = http.createServer((request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end(); return;
    }
    const target = new URL(request.url || '/', `http://127.0.0.1:${port}`);
    const name = decodeURIComponent(target.pathname).replace(/^\//, '') || 'index.html';
    if (!expected.has(name)) { response.writeHead(404).end(); return; }
    const bytes = fs.readFileSync(candidateFile(name));
    assert.equal(sha(bytes), expected.get(name), `Candidate asset changed during serving: ${name}`);
    response.writeHead(200, { 'Content-Type': `${mime[path.extname(name)] || 'application/octet-stream'}; charset=utf-8`,
      'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({
  url: `http://127.0.0.1:${port}/`, version: build.version, sourceRevision: build.sourceRevision,
  buildSha256: sha(buildBytes), files: expected.size, dist,
})));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
