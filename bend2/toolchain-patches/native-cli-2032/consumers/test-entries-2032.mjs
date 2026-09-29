// Exact isolated-source typecheck; no native execution or pin amendment.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const testFile = fileURLToPath(import.meta.url);
const candidate = fs.realpathSync(process.argv[2] ?? '');
const name = process.argv[3];
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const baseFile = fs.realpathSync(path.join(derived, 'bend2/base.bend'));
const nativePatch = path.join(root, 'bend2/toolchain-patches/native-cli-2032/0001-adapt-io-args-2032.patch');
const consumersPatch = path.join(root, 'bend2/toolchain-patches/native-cli-2032/consumers/0001-consumer-args-2032.patch');
const sourceHashes = {
  'bend2/NativeCLI.bend': 'c637e16ce6c81c91be30a5ab9b690da880e5dd3e85b4c6be0e06609138dd471e',
  'bend2/lib/graphics/v2/bench/gpu/PlanProfile.bend': 'c92fa44415cbf9286b0b451694a408fb84d54f4250487bb9856485b3cf83ded6',
  'bend2/lib/graphics/v2/bench/gpu/PlanReadback.bend': '80d63b990d8a44a7bfd25e6d692b84e3d05c6014493525102e7d92b81137351e',
  'bend2/tests/piece-sprites/BoardSceneSpriteBench.bend': '9510f28fcecefb792c31987f22e8ec652ab27de34410e09ddbe721ed8c3bba14',
  'bend2/tests/piece-sprites/DecodePageTest.bend': 'a12bff4a9b7f7d97146c4b313059dd8359dd3cb1e6b6a433ee797604a5b3651b',
  'bend2/tests/piece-sprites/PieceRenderBench.bend': '146812dcb22d5d5110fb8d41549051d8837756da8edd13f6552f2123474bcafe',
};
const compilerHashes = {
  'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
  'bend2/comp.ts': '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
  'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
};
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sha = (file) => digest(fs.readFileSync(file));
const gitAt = (directory, ...args) => execFileSync('git', ['-C', directory, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\r\n/g, '\n').trimEnd();
const git = (...args) => gitAt(candidate, ...args);
assert.ok(Object.hasOwn(sourceHashes, name), 'select one exact patched entry path');
function snapshot() {
  const trackedBend = git('ls-files', '--', '*.bend').split('\n');
  assert.ok(trackedBend.length > 100, 'isolated checkout lacks its Bend source tree');
  return {
    candidateHead: git('rev-parse', 'HEAD'),
    candidateStatus: git('status', '--porcelain', '--untracked-files=all'),
    candidateIndex: git('diff', '--cached', '--name-only'),
    candidateDiffCheck: git('diff', '--check'),
    derivedHead: gitAt(derived, 'rev-parse', 'HEAD'),
    derivedStatus: gitAt(derived, 'status', '--porcelain', '--untracked-files=all'),
    scoutHead: gitAt(scout, 'rev-parse', 'HEAD'),
    scoutStatus: gitAt(scout, 'status', '--porcelain', '--untracked-files=all'),
    canonicalHead: gitAt(canonical, 'rev-parse', 'HEAD'),
    canonicalStatus: gitAt(canonical, 'status', '--porcelain', '--untracked-files=all'),
    trackedBend: Object.fromEntries(trackedBend.map((relative) =>
      [relative, sha(path.join(candidate, relative))])),
    derivedBase: sha(baseFile),
    compiler: Object.fromEntries(Object.keys(compilerHashes).map((relative) =>
      [relative, sha(path.join(derived, relative))])),
    nativePatch: sha(nativePatch), consumersPatch: sha(consumersPatch),
    testFile: sha(testFile),
  };
}
const before = snapshot();
assert.equal(before.candidateHead, '3080ad508fd73c1730a82c9393890cc199426918');
assert.equal(before.candidateStatus, Object.keys(sourceHashes).sort()
  .map((relative) => ` M ${relative}`).join('\n'));
assert.equal(before.candidateIndex, '');
assert.equal(before.candidateDiffCheck, '');
assert.equal(before.derivedHead, '573002f01ec6c52416d44489543f69a9625facf8');
assert.equal(before.derivedStatus, ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
assert.equal(before.scoutHead, before.derivedHead);
assert.equal(before.scoutStatus, '');
assert.equal(before.canonicalHead, 'd37909174ebd664338ae3194799a9e0899dedd51');
assert.equal(before.canonicalStatus, '');
assert.equal(before.derivedBase, 'a548d71e16e3e1b19f08ab187c1b04afabb7a3cf5fefa067004b77b6eaca9ba0');
assert.deepEqual(before.compiler, compilerHashes);
for (const [relative, expected] of Object.entries(sourceHashes)) {
  assert.equal(before.trackedBend[relative], expected, relative);
}
assert.equal(before.nativePatch, 'c104cde276ef3890552c84ae6cb1518c73fe4555440503da648e365c6715c3eb');
assert.equal(before.consumersPatch, '4ddf245874bddd2c2dcbb799889b4a280dd1de12fdd62057c8f33d6fc02c95a5');
let fetches = 0;
globalThis.fetch = async () => { fetches++; throw Error('network denied in entry source check'); };
const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
const book = Bend.book_nil();
const seen = new Map();
try {
  await Bend.book_load(book, path.join(candidate, name), '', seen);
  Bend.book_valid(book);
} catch (error) {
  throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
    : error?.message ?? String(error)).slice(0, 1400));
}
assert.equal(book.hols, 0);
assert.equal(book.tlds.main?.$, 'Def');
assert.equal(fetches, 0);
const closure = [...seen.keys()].map((file) => {
  const real = fs.realpathSync(file);
  assert.equal(real, file, 'loaded source path changed identity');
  if (real === baseFile) return ['<derived>/bend2/base.bend', sha(real)];
  const relative = path.relative(candidate, real);
  assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative), `loaded source escaped candidate: ${relative}`);
  const normalized = relative.replaceAll('\\', '/');
  assert.equal(before.trackedBend[normalized], sha(real), `unbound import: ${normalized}`);
  return [normalized, sha(real)];
}).sort(([a], [b]) => a.localeCompare(b));
assert.deepEqual(snapshot(), before, 'source/compiler/patch inputs changed during load');
const bindingSha256 = digest(JSON.stringify({ before, closure }));
console.log(JSON.stringify({ schema: 'rift-native-cli-entries-2032-source/1', ok: true,
  entry: name, sha256: sourceHashes[name], loadedFiles: seen.size,
  definitions: book.order.length, holes: book.hols, fetches, bindingSha256,
  closure: Object.fromEntries(closure),
  scope: 'isolated patched source typecheck only; no native argv, GUI, GPU, pin or release acceptance' }));
