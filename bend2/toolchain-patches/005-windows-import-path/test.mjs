import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const candidate = process.env.BEND_CANDIDATE_DIR
  ? path.resolve(process.env.BEND_CANDIDATE_DIR)
  : path.join(root, '.artifacts/bend2/toolchain-patches/update-2028');
const bun = process.env.BUN_BIN
  || path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const expectedHead = 'bc178404f4778704fa5584a73fcdf72bcdf9f32c';
const expectedSources = {
  'bend2/bend.ts': '9068fe33367505ba99bfaba3aa99ad66c1dc9e7799c014ec1f042a598ac888a2',
  'bend2/comp.ts': '950b582dbf47f50cfe7974d40aa5e09ae503f9987357b3f3a543bcb7abc3a7b3',
  'bend2/main.ts': 'bd7218bc60e4da73be2fdb3c56b8325dd4f0344c771e7a1a6788bb27f9dfb7ec',
};
const expectedPatch = '2a2c4c5c0061080d35815849fd37cdace7c6949e8bf99c5cc6b566d30dfb8d0d';
const sha256 = (bytes) => createHash('sha256')
  .update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
const outputLines = [];
const record = (line) => { outputLines.push(line); console.log(line); };

function run(binary, args, extraEnv = {}) {
  const result = spawnSync(binary, args, {
    cwd: path.join(candidate, 'bend2'),
    env: { ...process.env, BEND_NO_TELEMETRY: '1', ...extraEnv },
    encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024,
  });
  assert.ifError(result.error);
  return result;
}

function cli(file, extraEnv = {}, mode = '--explain-layout') {
  return run(bun, [path.join(candidate, 'bend2/main.ts'),
    file.replaceAll('\\', '/'), mode], extraEnv);
}

assert.ok(fs.existsSync(bun), 'pinned Bun executable is missing');
const head = run('git', ['-C', candidate, 'rev-parse', 'HEAD']);
assert.equal(head.status, 0, head.stderr);
assert.equal(head.stdout.trim(), expectedHead, 'candidate is not exact upstream 2.0.28 bc178');
const status = run('git', ['-C', candidate, 'status', '--porcelain=v1', '--untracked-files=no']);
assert.equal(status.status, 0, status.stderr);
assert.equal(status.stdout.replace(/\r\n/g, '\n').trim().split('\n')
  .map((line) => line.trim()).join('\n'),
  'M bend2/bend.ts\nM bend2/comp.ts\nM bend2/main.ts');
const sourceHashes = Object.fromEntries(Object.keys(expectedSources).map((file) =>
  [file, sha256(fs.readFileSync(path.join(candidate, file)))]));
assert.deepEqual(sourceHashes, expectedSources, 'candidate compiler source stack drifted');
const patchHash = sha256(fs.readFileSync(path.join(here, '005-after-001-002.patch')));
assert.equal(patchHash, expectedPatch, '005 patch bytes drifted');
const source = fs.readFileSync(path.join(candidate, 'bend2/bend.ts'));
assert.match(source.toString('utf8'), /localOnly && path_inside\(BEND_LIB, file\)/,
  'adapted 002 local-only guard is absent');

const temporaryRoot = fs.realpathSync(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(temporaryRoot, 'bend2-windows-import-'));
const lib = path.join(scratch, 'bend-lib');
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
  const isolated = { BEND_LIB: lib, BEND_HUB: `http://127.0.0.1:${address.port}` };
  const main = path.join(scratch, 'main.bend');
  const first = path.join(scratch, 'left', 'first.bend');
  const second = path.join(scratch, 'left', 'deep', 'second.bend');
  fs.mkdirSync(path.dirname(first), { recursive: true });
  fs.mkdirSync(path.dirname(second), { recursive: true });
  fs.writeFileSync(main, 'import Base\nimport ./left/first.bend as First\n\ndef main() -> U32:\n  First.answer\n');
  fs.writeFileSync(first, 'import ./deep/second.bend as Deep\n\ndef answer() -> U32:\n  Deep.value\n');
  fs.writeFileSync(second, 'def value() -> U32:\n  42\n');

  const ordinary = cli(main, isolated, '--check-only');
  assert.equal(ordinary.status, 0, ordinary.stderr);
  assert.match(ordinary.stdout, /All terms check\./);
  record('PASS nested relative imports: ordinary --check-only');

  const nested = cli(main, isolated);
  assert.equal(nested.status, 0, nested.stderr);
  const report = JSON.parse(nested.stdout);
  assert.equal(report.schema, 'bend-layout-v1');
  assert.deepEqual(report.declarations.map((declaration) => declaration.name),
    ['left/deep/second.value', 'left/first.answer', 'main']);
  record('PASS nested layout names: main -> left/first -> left/deep/second');

  const named = path.join(scratch, 'named.bend');
  fs.writeFileSync(named,
    'import example@1.0.0.0/file.bend as Package\n\ndef main() -> U32:\n  1\n');
  const deniedName = cli(named, isolated);
  assert.equal(deniedName.status, 1, 'local-only mode accepted a named package');
  assert.match(deniedName.stderr, /local relative imports only/);
  assert.equal(providerRequests, 0, 'named-package guard contacted the local BendHub trap');
  assert.ok(!fs.existsSync(lib), 'named-package guard created a Bend package cache');
  record('PASS local-only named-package guard: rejected before BendHub (0 requests)');

  fs.mkdirSync(lib, { recursive: true });
  const libraryFile = path.join(lib, 'library-entry.bend');
  fs.writeFileSync(libraryFile, 'def main() -> U32:\n  1\n');
  const deniedLibrary = cli(libraryFile, isolated);
  assert.equal(deniedLibrary.status, 1, 'local-only mode accepted a Bend library path');
  assert.match(deniedLibrary.stderr, /packages are disabled/);
  assert.equal(providerRequests, 0, 'library-path guard contacted the local BendHub trap');
  record('PASS local-only library-path guard: rejected before package loading (0 requests)');

  const packageHash = '0x' + 'ab'.repeat(16);
  const packageDir = path.join(lib, packageHash);
  const packageNames = path.join(lib, 'names');
  fs.mkdirSync(packageDir, { recursive: true });
  fs.mkdirSync(packageNames, { recursive: true });
  fs.writeFileSync(path.join(packageNames, 'example@1.0.0.0'), packageHash + '\n');
  fs.writeFileSync(path.join(packageDir, 'module.bend'),
    'def value() -> U32:\n  11\n');
  const packageMain = path.join(scratch, 'valid-package.bend');
  fs.writeFileSync(packageMain,
    'import Base\nimport example@1.0.0.0/module.bend as Package\n\n'
    + 'def main() -> U32:\n  Package.value\n');
  const validPackage = cli(packageMain, isolated, '--check-only');
  assert.equal(validPackage.status, 0, validPackage.stderr);
  assert.match(validPackage.stdout, /All terms check\./);
  assert.equal(providerRequests, 0, 'cached named package contacted BendHub');
  record('PASS valid named package resolves from isolated cache (0 requests)');

  if (process.platform === 'win32') {
    const canonicalLib = path.join(scratch, 'canonical-bend-lib');
    const junctionLib = path.join(scratch, 'bend-lib-junction');
    fs.mkdirSync(canonicalLib, { recursive: true });
    const canonicalEntry = path.join(canonicalLib, 'cache-entry.bend');
    fs.writeFileSync(canonicalEntry, 'def main() -> U32:\n  1\n');
    fs.symlinkSync(canonicalLib, junctionLib, 'junction');
    const deniedJunction = cli(canonicalEntry,
      { ...isolated, BEND_LIB: junctionLib });
    assert.equal(deniedJunction.status, 1,
      'local-only mode accepted the canonical target of a BEND_LIB junction');
    assert.match(deniedJunction.stderr, /packages are disabled/);
    assert.equal(providerRequests, 0,
      'canonical BEND_LIB guard contacted the local BendHub trap');
    record('PASS local-only canonical BEND_LIB junction guard (0 requests)');

    const caseDirectory = path.join(scratch, 'CaseDir');
    fs.mkdirSync(caseDirectory);
    const caseFile = path.join(caseDirectory, 'Leaf.bend');
    fs.writeFileSync(caseFile, 'def value() -> U32:\n  7\n');
    const aliases = path.join(scratch, 'aliases.bend');
    fs.writeFileSync(aliases,
      'import Base\nimport ./CaseDir/Leaf.bend as Upper\n'
      + 'import ./casedir/leaf.bend as Lower\n\n'
      + 'def main() -> U32:\n  (Upper.value + Lower.value : U32)\n');
    const alternateCaseFile = path.join(scratch, 'casedir', 'leaf.bend');
    const caseIdentityProbe = `import fs from 'node:fs';
const first = fs.realpathSync(${JSON.stringify(caseFile)});
const second = fs.realpathSync(${JSON.stringify(alternateCaseFile)});
if (first === second) throw new Error('Bun did not preserve both requested path spellings');
const a = fs.statSync(first, { bigint: true });
const b = fs.statSync(second, { bigint: true });
if (a.dev !== b.dev || a.ino !== b.ino) throw new Error('case aliases are not the same file');
console.log('same file ID with distinct realpath spellings');`;
    const identityProbe = run(bun, ['-e', caseIdentityProbe], isolated);
    assert.equal(identityProbe.status, 0, identityProbe.stderr);
    assert.equal(identityProbe.stdout.trim(),
      'same file ID with distinct realpath spellings');
    const aliasCheck = cli(aliases, isolated);
    assert.equal(aliasCheck.status, 0, aliasCheck.stderr);
    const aliasReport = JSON.parse(aliasCheck.stdout);
    const leafDefs = aliasReport.declarations.filter((declaration) =>
      declaration.name.endsWith('.value'));
    assert.deepEqual(leafDefs.map((declaration) => declaration.name),
      ['CaseDir/Leaf.value'], 'case-variant aliases created separate module namespaces');
    record('PASS Bun dual-spelling paths share one same-file module namespace');

    const cycleFile = path.join(caseDirectory, 'Loop.bend');
    fs.writeFileSync(cycleFile,
      'import ./loop.bend as Self\n\ndef value() -> U32:\n  1\n');
    const caseCycle = cli(cycleFile, isolated);
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
    const packageAssembly = run(bun, ['-e', packageAssemblyProbe], isolated);
    assert.equal(packageAssembly.status, 0, packageAssembly.stderr);
    assert.equal(packageAssembly.stdout.trim(), 'CaseDir/Leaf.bend, aliases.bend');
    assert.equal(providerRequests, 0, 'provider-free package assembly contacted BendHub');
    record('PASS package-file assembly uses only filesystem path keys (no publish)');

    const lawsDirectory = path.join(scratch, 'laws-case');
    fs.mkdirSync(lawsDirectory);
    fs.writeFileSync(path.join(lawsDirectory, 'laws.bend'),
      'def helper() -> U32:\n  1\n');
    const proofFile = path.join(lawsDirectory, 'PROOF.bend');
    fs.writeFileSync(proofFile,
      'import Base\nimport ./laws.bend as Laws\n\ndef main() -> U32:\n  Laws.helper\n');
    const proofCheck = cli(proofFile, isolated, '--check-only');
    assert.equal(proofCheck.status, 0, proofCheck.stderr);
    assert.equal(providerRequests, 0, 'case-variant LAWS proof check contacted BendHub');
    record('PASS PROOF import gate recognizes same-file LAWS casing');

    const crossVolumeProbe = String.raw`import { relative_module_path } from './bend.ts';
try {
  relative_module_path("C:\\source\\", "D:\\target\\module.bend");
  throw new Error("cross-volume path was accepted");
} catch (error) {
  if (error.message !== "cross-volume local imports are not supported") throw error;
  console.log(error.message);
}`;
    const crossVolumeResult = run(bun, ['-e', crossVolumeProbe], isolated);
    assert.equal(crossVolumeResult.status, 0, crossVolumeResult.stderr);
    assert.equal(crossVolumeResult.stdout.trim(),
      'cross-volume local imports are not supported');
    record('PASS cross-volume path policy: different-drive targets are rejected');

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
    const crossShareResult = run(bun, ['-e', crossShareProbe], isolated);
    assert.equal(crossShareResult.status, 0, crossShareResult.stderr);
    assert.equal(crossShareResult.stdout.trim(),
      'cross-volume local imports are not supported');
    record('PASS cross-volume path policy: different UNC shares are rejected');
  } else {
    record('SKIP Windows junction, case-variant, and cross-volume fixtures');
  }

  record(`candidate bend.ts sha256: ${sha256(source)}`);
  const sourceStackHash = createHash('sha256')
    .update(Object.entries(sourceHashes).map(([file, hash]) => `${file} ${hash}`).join('\n') + '\n')
    .digest('hex');
  record(`candidate source stack sha256: ${sourceStackHash}`);
  record(`005 patch sha256: ${patchHash}`);
  const outputHash = createHash('sha256').update(outputLines.join('\n') + '\n').digest('hex');
  console.log(`test output sha256 (excluding this line): ${outputHash}`);
} finally {
  await new Promise((resolve) => trap.close(resolve));
  const exactScratch = fs.realpathSync(scratch);
  assert.equal(path.dirname(exactScratch), temporaryRoot,
    'refusing cleanup outside the owned temporary directory');
  assert.match(path.basename(exactScratch), /^bend2-windows-import-[\w-]+$/,
    'refusing cleanup of an unexpected temporary path');
  fs.rmSync(exactScratch, { recursive: true, force: true });
}
