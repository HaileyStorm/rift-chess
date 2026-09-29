import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const candidate = process.env.BEND_CANDIDATE_DIR
  ? path.resolve(process.env.BEND_CANDIDATE_DIR)
  : path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const bun = process.env.BUN_BIN
  || path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const expectedHead = '573002f01ec6c52416d44489543f69a9625facf8';
const inheritedSources = {
  'bend2/bend.ts': 'dcae4da6b687c96e3a2bd6c7e98ee00140857ef41cdce68c8bd16c887b9e592f',
  'bend2/comp.ts': '0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7',
  'bend2/main.ts': 'df8839e6f77d657f67e7f47022ac5c8f2ca90dc4cd7bae9af0982c574267bd9e',
};
const candidateSources = {
  'bend2/bend.ts': '2c3953bb4fcb12aa97d4ce8cd041ef0ce8324c724fd0adc9b0352fff4c0f5c09',
  'bend2/comp.ts': inheritedSources['bend2/comp.ts'],
  'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const lines = [];
const record = (line) => { lines.push(line); console.log(line); };

function runSync(binary, args) {
  const result = spawnSync(binary, args, {
    cwd: path.join(candidate, 'bend2'),
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
    encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.ifError(result.error);
  return result;
}

function run(binary, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: path.join(candidate, 'bend2'),
      env: { ...process.env, BEND_NO_TELEMETRY: '1', ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 30000);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (status, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`${binary} timed out${signal ? ` (${signal})` : ''}: ${stderr}`));
      } else {
        resolve({ status: status ?? 1, stdout, stderr });
      }
    });
  });
}

function cli(file, extraEnv = {}, mode = '--explain-layout') {
  return run(bun, [path.join(candidate, 'bend2/main.ts'),
    file.replaceAll('\\', '/'), mode], extraEnv);
}

assert.ok(fs.existsSync(bun), 'project Bun executable is missing');
const head = runSync('git', ['-C', candidate, 'rev-parse', 'HEAD']);
assert.equal(head.status, 0, head.stderr);
assert.equal(head.stdout.trim(), expectedHead, 'candidate is not pristine upstream Bend 2.0.32');
const status = runSync('git', ['-C', candidate, 'status', '--porcelain=v1', '--untracked-files=no']);
assert.equal(status.status, 0, status.stderr);
assert.equal(status.stdout.replace(/\r\n/g, '\n').trim().split('\n')
  .map((line) => line.trim()).join('\n'),
  'M bend2/bend.ts\nM bend2/comp.ts\nM bend2/main.ts',
  'candidate must contain only the 001/002/005 compiler source stack');
const actualSources = Object.fromEntries(Object.keys(candidateSources).map((file) =>
  [file, sha256(fs.readFileSync(path.join(candidate, file)))]));
assert.deepEqual(actualSources, candidateSources,
  'candidate source stack differs from the source-bound 2.0.32+001+002+005 rebase');
const inheritedStackHash = createHash('sha256')
  .update(Object.entries(inheritedSources).map(([file, hash]) => `${file} ${hash}`).join('\n') + '\n')
  .digest('hex');
const candidateStackHash = createHash('sha256')
  .update(Object.entries(actualSources).map(([file, hash]) => `${file} ${hash}`).join('\n') + '\n')
  .digest('hex');
const bendSource = fs.readFileSync(path.join(candidate, 'bend2/bend.ts'), 'utf8');
const mainSource = fs.readFileSync(path.join(candidate, 'bend2/main.ts'), 'utf8');
assert.match(bendSource, /localOnly && \(path\.isAbsolute\(m\[1\]\)/,
  '002 absolute/local-only import guard is absent');
assert.match(bendSource, /localOnly && \(path_inside\(BEND_LIB, target\)/,
  '002 pre-book_file BEND_LIB fence is absent');
assert.match(mainSource, /await Bend\.book_load\(book, file, "", seen, undefined, undefined, localOnly\)/,
  '002 native root/local-only argument propagation is absent');
assert.match(mainSource, /!Bend\.book_seen\(seen, fs\.realpathSync\(laws\)\)/,
  '005 alias-aware PROOF/LAWS identity check is absent');

const temporaryRoot = fs.realpathSync(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(temporaryRoot, 'bend2-import-2032-'));
let providerRequests = 0;
const trap = http.createServer((_request, response) => {
  providerRequests++;
  response.writeHead(404);
  response.end();
});

try {
  await new Promise((resolve, reject) => {
    trap.once('error', reject);
    trap.listen(0, '127.0.0.1', resolve);
  });
  const address = trap.address();
  assert.ok(address && typeof address === 'object');
  const emptyLib = path.join(scratch, 'empty-lib');
  const isolated = { BEND_LIB: emptyLib, BEND_HUB: `http://127.0.0.1:${address.port}` };
  const main = path.join(scratch, 'main.bend');
  const first = path.join(scratch, 'left', 'first.bend');
  const second = path.join(scratch, 'left', 'deep', 'second.bend');
  fs.mkdirSync(path.dirname(first), { recursive: true });
  fs.mkdirSync(path.dirname(second), { recursive: true });
  fs.writeFileSync(main,
    'import Base\nimport ./left/first.bend as First\n\ndef main() -> U32:\n  First.answer\n');
  fs.writeFileSync(first,
    'import ./deep/second.bend as Deep\n\ndef answer() -> U32:\n  Deep.value\n');
  fs.writeFileSync(second, 'def value() -> U32:\n  42\n');

  const ordinary = await cli(main, isolated, '--check-only');
  assert.equal(ordinary.status, 0, ordinary.stderr);
  assert.match(ordinary.stdout, /ALL PROOFS CHECK/);
  record('PASS nested Windows relative imports through ordinary checker');

  const nested = await cli(main, isolated);
  assert.equal(nested.status, 0, nested.stderr);
  const report = JSON.parse(nested.stdout);
  assert.equal(report.schema, 'bend-layout-v1');
  assert.deepEqual(report.declarations.map((declaration) => declaration.name),
    ['left/deep/second.value', 'left/first.answer', 'main']);
  record('PASS nested report module names use forward slashes');

  const nestedForbidden = async (kind, source) => {
    const directory = path.join(scratch, `guard-${kind}`);
    const entry = path.join(directory, 'main.bend');
    const child = path.join(directory, 'child.bend');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(entry, 'import ./child.bend as Child\n\ndef main() -> U32:\n  1\n');
    fs.writeFileSync(child, source);
    const result = await cli(entry, isolated);
    assert.equal(result.status, 1, `${kind} import escaped local-only mode`);
    assert.match(result.stderr, /local relative imports only|packages are disabled/);
    assert.equal(providerRequests, 0, `${kind} import contacted the loopback BendHub trap`);
    assert.ok(!fs.existsSync(emptyLib), `${kind} import created the package cache`);
    record(`PASS recursive local-only ${kind} import rejected before fetch/cache`);
  };

  await nestedForbidden('named',
    'import example@1.0.0.0/file.bend as Package\n\ndef answer() -> U32:\n  1\n');
  await nestedForbidden('hash',
    `import 0x${'ab'.repeat(16)}/file.bend as Package\n\ndef answer() -> U32:\n  1\n`);
  const absoluteImport = path.parse(scratch).root.replaceAll('\\', '/') + 'absolute-denied.bend';
  await nestedForbidden('absolute',
    `import ${absoluteImport} as Absolute\n\ndef answer() -> U32:\n  1\n`);

  const cacheRoot = path.join(scratch, 'cache-root');
  fs.mkdirSync(cacheRoot);
  const cacheEscape = path.join(scratch, 'guard-cache-path');
  fs.mkdirSync(cacheEscape);
  const cacheEntry = path.join(cacheEscape, 'main.bend');
  const cacheChild = path.join(cacheEscape, 'child.bend');
  fs.writeFileSync(cacheEntry, 'import ./child.bend as Child\n\ndef main() -> U32:\n  1\n');
  fs.writeFileSync(cacheChild,
    'import ../cache-root/missing.bend as Package\n\ndef answer() -> U32:\n  1\n');
  const cacheFence = await cli(cacheEntry, {
    ...isolated,
    BEND_LIB: cacheRoot,
  });
  assert.equal(cacheFence.status, 1, 'recursive relative import entered BEND_LIB');
  assert.match(cacheFence.stderr, /packages are disabled/);
  assert.equal(providerRequests, 0, 'BEND_LIB pre-book_file fence contacted BendHub');
  assert.ok(!fs.existsSync(path.join(cacheRoot, 'missing.bend')),
    'BEND_LIB pre-book_file fence created a package cache entry');
  record('PASS recursive relative BEND_LIB target rejected before book_file fetch');

  const named = path.join(scratch, 'named-cached.bend');
  const packageHash = `0x${'ef'.repeat(16)}`;
  const packageDir = path.join(cacheRoot, packageHash);
  const packageNames = path.join(cacheRoot, 'names');
  fs.mkdirSync(packageDir, { recursive: true });
  fs.mkdirSync(packageNames, { recursive: true });
  fs.writeFileSync(path.join(packageNames, 'example@1.0.0.0'), packageHash + '\n');
  fs.writeFileSync(path.join(packageDir, 'module.bend'), 'def value() -> U32:\n  11\n');
  fs.writeFileSync(named,
    'import Base\nimport example@1.0.0.0/module.bend as Package\n\ndef main() -> U32:\n  Package.value\n');
  const cachedPackage = await cli(named, { ...isolated, BEND_LIB: cacheRoot }, '--check-only');
  assert.equal(cachedPackage.status, 0, cachedPackage.stderr);
  assert.match(cachedPackage.stdout, /ALL PROOFS CHECK/);
  assert.equal(providerRequests, 0, 'valid cached named package contacted BendHub');
  record('PASS ordinary cached named package still resolves without provider access');

  if (process.platform === 'win32') {
    const caseDirectory = path.join(scratch, 'CaseDir');
    fs.mkdirSync(caseDirectory);
    const caseFile = path.join(caseDirectory, 'Leaf.bend');
    fs.writeFileSync(caseFile, 'def value() -> U32:\n  7\n');
    const aliases = path.join(scratch, 'aliases.bend');
    fs.writeFileSync(aliases,
      'import Base\nimport ./CaseDir/Leaf.bend as Upper\n'
      + 'import ./casedir/leaf.bend as Lower\n\ndef main() -> U32:\n  (Upper.value + Lower.value : U32)\n');
    const alternateCaseFile = path.join(scratch, 'casedir', 'leaf.bend');
    const caseIdentityProbe = `import fs from 'node:fs';
const first = fs.realpathSync(${JSON.stringify(caseFile)});
const second = fs.realpathSync(${JSON.stringify(alternateCaseFile)});
if (first === second) throw new Error('Bun did not preserve both requested path spellings');
const a = fs.statSync(first, { bigint: true });
const b = fs.statSync(second, { bigint: true });
if (a.dev !== b.dev || a.ino !== b.ino) throw new Error('case aliases are not the same file');
console.log('same file ID with distinct realpath spellings');`;
    const identityProbe = await run(bun, ['-e', caseIdentityProbe], isolated);
    assert.equal(identityProbe.status, 0, identityProbe.stderr);
    assert.equal(identityProbe.stdout.trim(),
      'same file ID with distinct realpath spellings');
    const aliasCheck = await cli(aliases, isolated);
    assert.equal(aliasCheck.status, 0, aliasCheck.stderr);
    const aliasReport = JSON.parse(aliasCheck.stdout);
    const leafDefs = aliasReport.declarations.filter((declaration) =>
      declaration.name.endsWith('.value'));
    assert.deepEqual(leafDefs.map((declaration) => declaration.name),
      ['CaseDir/Leaf.value'], 'case aliases created separate module namespaces');
    record('PASS case-variant aliases resolve to one file identity and namespace');

    const cycleFile = path.join(caseDirectory, 'Loop.bend');
    fs.writeFileSync(cycleFile,
      'import ./loop.bend as Self\n\ndef value() -> U32:\n  1\n');
    const caseCycle = await cli(cycleFile, isolated, '--check-only');
    assert.equal(caseCycle.status, 1,
      'case-variant self-import was silently treated as a completed file');
    assert.match(caseCycle.stderr, /import cycle through/);
    record('PASS case-variant self-import reports a cycle');

    const packageAssemblyProbe = String.raw`import * as Bend from './bend.ts';
import { pkg_files } from './main.ts';
const file = ${JSON.stringify(aliases)};
const book = Bend.book_nil();
const seen = new Map();
await Bend.book_load(book, file, '', seen);
const files = pkg_files(file, book, seen);
const names = Object.keys(files).sort();
const expected = ['CaseDir/Leaf.bend', 'aliases.bend'];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  throw new Error('unexpected package assembly paths: ' + JSON.stringify(names));
}
if ([...seen.keys()].some((name) => name.includes(String.fromCharCode(0)))) {
  throw new Error('file identity metadata leaked into the path-keyed seen map');
}
console.log(names.join(', '));`;
    const packageAssembly = await run(bun, ['-e', packageAssemblyProbe], isolated);
    assert.equal(packageAssembly.status, 0, packageAssembly.stderr);
    assert.equal(packageAssembly.stdout.trim(), 'CaseDir/Leaf.bend, aliases.bend');
    assert.equal(providerRequests, 0, 'package-file assembly contacted BendHub');
    record('PASS package-file assembly keeps filesystem paths separate from identity keys');

    const foreignRoot = path.join(scratch, 'foreign-package');
    const foreignSource = path.join(foreignRoot, 'src');
    fs.mkdirSync(foreignSource, { recursive: true });
    const foreignEntry = path.join(foreignSource, 'main.bend');
    fs.writeFileSync(path.join(foreignRoot, 'helper.js'), 'export const parent = 1;\n');
    fs.writeFileSync(path.join(foreignSource, 'local.js'), 'export const local = 2;\n');
    fs.writeFileSync(foreignEntry,
      'import Base\n\nlaw parent:\n  IO(U32)\ndef parent():\n  import "../helper.js"\n'
      + '\nlaw local:\n  IO(U32)\ndef local():\n  import "./local.js"\n');
    const foreignPackageProbe = String.raw`import * as Bend from './bend.ts';
import { pkg_files } from './main.ts';
const file = ${JSON.stringify(foreignEntry)};
const book = Bend.book_nil(), seen = new Map();
await Bend.book_load(book, file, '', seen);
const files = pkg_files(file, book, seen);
const names = Object.keys(files).sort();
const expected = ['helper.js', 'src/local.js', 'src/main.bend'];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  throw new Error('foreign package keys: ' + JSON.stringify(names));
}
if (files['helper.js'] !== 'export const parent = 1;\n'
  || files['src/local.js'] !== 'export const local = 2;\n') {
  throw new Error('foreign package bytes changed');
}
console.log(names.join(', '));`;
    const foreignPackage = await run(bun, ['-e', foreignPackageProbe], isolated);
    assert.equal(foreignPackage.status, 0, foreignPackage.stderr);
    assert.equal(foreignPackage.stdout.trim(), 'helper.js, src/local.js, src/main.bend');
    assert.equal(providerRequests, 0, 'foreign package assembly contacted BendHub');
    record('PASS parent and same-directory foreign JS archive keys preserve relative imports');

    const lawsDirectory = path.join(scratch, 'laws-case');
    fs.mkdirSync(lawsDirectory);
    fs.writeFileSync(path.join(lawsDirectory, 'LAWS.bend'),
      'def helper() -> U32:\n  1\n');
    const proofFile = path.join(lawsDirectory, 'PROOF.bend');
    fs.writeFileSync(proofFile,
      'import Base\nimport ./laws.bend as Laws\n\ndef main() -> U32:\n  Laws.helper\n');
    const proofCheck = await cli(proofFile, isolated, '--check-only');
    assert.equal(proofCheck.status, 0, proofCheck.stderr);
    assert.equal(providerRequests, 0, 'case-variant LAWS check contacted BendHub');
    record('PASS PROOF/LAWS requirement recognizes same-file casing');

    const actualLib = path.join(scratch, 'actual-lib');
    const junctionLib = path.join(scratch, 'bend-lib-junction');
    fs.mkdirSync(actualLib);
    const canonicalEntry = path.join(actualLib, 'library-entry.bend');
    fs.writeFileSync(canonicalEntry, 'def main() -> U32:\n  1\n');
    fs.symlinkSync(actualLib, junctionLib, 'junction');
    const deniedJunction = await cli(canonicalEntry,
      { ...isolated, BEND_LIB: junctionLib });
    assert.equal(deniedJunction.status, 1,
      'local-only mode accepted the canonical target of a BEND_LIB junction');
    assert.match(deniedJunction.stderr, /packages are disabled/);
    assert.equal(providerRequests, 0, 'BEND_LIB junction guard contacted BendHub');
    record('PASS local-only canonical BEND_LIB junction target rejected');

    const crossVolumeProbe = String.raw`import { relative_module_path } from './bend.ts';
try {
  relative_module_path('C:\\source\\', 'D:\\target\\module.bend');
  throw new Error('cross-volume path was accepted');
} catch (error) {
  if (error.message !== 'cross-volume local imports are not supported') throw error;
  console.log(error.message);
}`;
    const crossVolumeResult = await run(bun, ['-e', crossVolumeProbe], isolated);
    assert.equal(crossVolumeResult.status, 0, crossVolumeResult.stderr);
    assert.equal(crossVolumeResult.stdout.trim(),
      'cross-volume local imports are not supported');
    record('PASS different-drive local path is explicitly rejected');

    const shareOne = ['', '', 'host', 'share1', 'dir', ''].join('\\');
    const shareTwo = ['', '', 'host', 'share2', 'file.bend'].join('\\');
    const crossShareProbe = `import { relative_module_path } from './bend.ts';
try {
  relative_module_path(${JSON.stringify(shareOne)}, ${JSON.stringify(shareTwo)});
  throw new Error('cross-share path was accepted');
} catch (error) {
  if (error.message !== 'cross-volume local imports are not supported') throw error;
  console.log(error.message);
}`;
    const crossShareResult = await run(bun, ['-e', crossShareProbe], isolated);
    assert.equal(crossShareResult.status, 0, crossShareResult.stderr);
    assert.equal(crossShareResult.stdout.trim(),
      'cross-volume local imports are not supported');
    record('PASS different UNC shares are explicitly rejected');
  } else {
    record('SKIP Windows file-identity, junction, PROOF/LAWS-case, and volume fixtures');
  }

  assert.equal(providerRequests, 0, 'the local-only test made a loopback provider request');
  record('PASS loopback BendHub trap observed zero requests');
  record(`inherited 2.0.32+001+002 source stack sha256: ${inheritedStackHash}`);
  record(`candidate source stack sha256: ${candidateStackHash}`);
  record(`candidate bend.ts sha256: ${actualSources['bend2/bend.ts']}`);
  record(`candidate main.ts sha256: ${actualSources['bend2/main.ts']}`);
  console.log(`test output sha256 (excluding this line): ${createHash('sha256')
    .update(lines.join('\n') + '\n').digest('hex')}`);
} finally {
  await new Promise((resolve) => trap.close(resolve));
  const exactScratch = fs.realpathSync(scratch);
  assert.equal(path.dirname(exactScratch), temporaryRoot,
    'refusing cleanup outside the owned temporary directory');
  assert.match(path.basename(exactScratch), /^bend2-import-2032-[\w-]+$/,
    'refusing cleanup of an unexpected temporary path');
  fs.rmSync(exactScratch, { recursive: true, force: true });
}
