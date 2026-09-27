/**
 * Build a nonce-scoped, disposable Bend 2.0.28 browser candidate.
 *
 * This path deliberately does not call build.ts or write any canonical cache,
 * worker library, preview, pin, or publication target. The candidate compiler
 * is copied from the recorded fresh stack, then exact tracked patch 006 is
 * applied only to that private copy.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { BunPlugin } from 'bun';
import { moduleSpecs } from '../../tools/selected-modules.mjs';
import { bindWorkerLibrary, compilerSourceTreeHash } from '../../tools/emit-worker-libs.mjs';
import { candidateBridgePlugin, candidateBridgeEvidence } from './browser-abi-transform-2028.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const driverPath = fileURLToPath(import.meta.url);
const freshRoot = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const patchRoot = path.join(root, 'bend2/toolchain-patches');
const candidateStore = path.join(root, '.artifacts/bend2/toolchain-patches/browser-2028-candidate');
const upstreamCommit = 'bc178404f4778704fa5584a73fcdf72bcdf9f32c';
const aliasPatchPath = path.join(patchRoot, '006-alias-equality/006-after-004-2.0.28.patch');
const aliasPatchSha256 = 'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344';
const expectedFreshCompilerFiles: Record<string, string> = {
  'bend.ts': 'f332ad1cb4bed3c7435c4656ae0ee52efb48d66dae3f7a35ac2372744455040c',
  'comp.ts': 'a8dfc1b8ca96e779e781410643b23f6d7ac5115df7a04f48300aeb5c191d4adc',
  'main.ts': '1fa0e7c144f0fa0bf50a666c75debe764d039beb553e46676704d16dfc129463',
  'base.bend': '722a76eaa91732b3c50299f91769ae6ba97ad80705013209b816f5204536aebb',
  'web_runtime.js': '3f2961a9c21f1f1607128a046501085b8f5de51c8cd85885586f3afb9067cb45',
};
const expectedPatchedBendCanonicalSha256 = '359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8';
const expectedPatchStack = [
  { path: '001-arity/0001-arity-diagnostics.patch', sha256: 'dc5d01754f933d4568538c8cd3bda046f584f0cda2f1b196d254e05cfe2d92da' },
  { path: '002-layout/rebase-2028/002-after-001-2.0.28.patch', sha256: '21fa3dbbf542147289d7efec92db0867bdbae36ecfb6e1b436ab87cd16a1a469' },
  { path: '005-windows-import-path/005-after-001-002.patch', sha256: '2a2c4c5c0061080d35815849fd37cdace7c6949e8bf99c5cc6b566d30dfb8d0d' },
  { path: '004-web-workers/rebase-2028/004-after-005-2.0.28.patch', sha256: '8cdf93ac066391f93638d7a4bacf2efd85624d77271af0ed5a981d6bd5d7207c' },
];
const selectedNames = ['controller', 'scene', 'menu'] as const;
const compileTimeoutMs = 12 * 60 * 1000;

function sha256(bytes: Uint8Array | string): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function rel(file: string): string {
  return path.relative(root, file).replaceAll('\\', '/');
}

function isInside(parent: string, target: string): boolean {
  const relative = path.relative(parent, target);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function readFileSha(file: string): string {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected a plain file: ${file}`);
  return sha256(fs.readFileSync(file));
}

function fileMap(directory: string): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  const visit = (at: string): void => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const full = path.join(at, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Compiler source contains a symlink: ${full}`);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) result[path.relative(directory, full).replaceAll('\\', '/')] = readFileSha(full);
      else throw new Error(`Compiler source contains a special filesystem entry: ${full}`);
    }
  };
  visit(directory);
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

function mapDigest(map: Record<string, string>): string {
  return sha256(JSON.stringify(Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'en'))));
}

function readGitHead(checkout: string): string {
  const marker = path.join(checkout, '.git');
  const stat = fs.lstatSync(marker);
  let gitDir: string;
  if (stat.isDirectory()) gitDir = marker;
  else {
    const match = /^gitdir:\s*(.+)\s*$/i.exec(fs.readFileSync(marker, 'utf8'));
    if (!match) throw new Error(`Unrecognized git worktree marker: ${marker}`);
    gitDir = path.resolve(checkout, match[1]);
  }
  const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
  if (/^[0-9a-f]{40,64}$/i.test(head)) return head.toLowerCase();
  const ref = /^ref:\s*([A-Za-z0-9._/-]+)$/.exec(head)?.[1];
  if (!ref || ref.split('/').includes('..')) throw new Error(`Unrecognized git HEAD: ${head}`);
  const commonFile = path.join(gitDir, 'commondir');
  const commonDir = fs.statSync(commonFile, { throwIfNoEntry: false })?.isFile()
    ? path.resolve(gitDir, fs.readFileSync(commonFile, 'utf8').trim()) : gitDir;
  for (const directory of [...new Set([gitDir, commonDir])]) {
    const candidate = path.join(directory, ...ref.split('/'));
    if (fs.statSync(candidate, { throwIfNoEntry: false })?.isFile())
      return fs.readFileSync(candidate, 'utf8').trim().toLowerCase();
    const packed = path.join(directory, 'packed-refs');
    if (fs.statSync(packed, { throwIfNoEntry: false })?.isFile()) {
      for (const line of fs.readFileSync(packed, 'utf8').split(/\r?\n/)) {
        const row = /^([0-9a-f]{40,64})\s+(.+)$/.exec(line);
        if (row?.[2] === ref) return row[1].toLowerCase();
      }
    }
  }
  throw new Error(`Cannot resolve git ref ${ref} from ${checkout}`);
}

function verifyFreshStack(): { baseCommit: string; patches: Array<{ path: string; sha256: string }>;
  sourceFiles: Record<string, string>; sourceTreeSha256: string } {
  const baseCommit = readGitHead(freshRoot);
  assert.equal(baseCommit, upstreamCommit, 'fresh candidate is not the recorded Bend 2.0.28 tag');
  const bendDir = path.join(freshRoot, 'bend2');
  const sourceFiles = fileMap(bendDir);
  for (const [name, expected] of Object.entries(expectedFreshCompilerFiles))
    assert.equal(sourceFiles[name], expected, `fresh candidate compiler source differs: ${name}`);
  const patches = expectedPatchStack.map((item) => {
    const file = path.join(patchRoot, ...item.path.split('/'));
    assert.equal(readFileSha(file), item.sha256, `ordered candidate patch differs: ${item.path}`);
    return item;
  });
  assert.equal(readFileSha(aliasPatchPath), aliasPatchSha256, 'tracked alias-equality patch differs');
  return { baseCommit, patches, sourceFiles, sourceTreeSha256: mapDigest(sourceFiles) };
}

function sourceClosure(entries: string[]): Record<string, string> {
  const found = new Map<string, string>();
  const visitBend = (file: string): void => {
    const absolute = path.resolve(file);
    const prefix = `${root}${path.sep}`;
    if (!absolute.startsWith(prefix)) throw new Error(`Bend source escaped project: ${file}`);
    const real = fs.realpathSync(absolute);
    if (!real.startsWith(prefix)) throw new Error(`Bend source resolves outside project: ${file}`);
    const name = rel(real);
    if (found.has(name)) return;
    found.set(name, readFileSha(real));
    const source = fs.readFileSync(real, 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const specifier = /^\s*import\s+(\S+)(?:\s+as\s+\w+)?\s*(?:#.*)?$/.exec(line)?.[1];
      if (!specifier || specifier === 'Base' || specifier.startsWith('"') || specifier.startsWith("'")) continue;
      if (!specifier.startsWith('./') && !specifier.startsWith('../'))
        throw new Error(`Unsupported Bend source import in ${name}: ${specifier}`);
      visitBend(path.resolve(path.dirname(real), specifier));
    }
  };
  for (const entry of entries) visitBend(path.join(root, ...entry.split('/')));
  return Object.fromEntries([...found].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

function resolveRelativeModule(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return undefined;
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = path.extname(base) ? [base] : [
    `${base}.ts`, `${base}.mjs`, `${base}.js`, `${base}.json`, `${base}.css`, `${base}.bend`,
    path.join(base, 'index.ts'), path.join(base, 'index.mjs'),
  ];
  return candidates.find((file) => fs.statSync(file, { throwIfNoEntry: false })?.isFile());
}

function browserSourceClosure(entries: string[]): Record<string, string> {
  const found = new Map<string, string>();
  const visit = (file: string): void => {
    const absolute = path.resolve(file);
    const prefix = `${root}${path.sep}`;
    if (!absolute.startsWith(prefix)) throw new Error(`Browser source escaped project: ${file}`);
    const real = fs.realpathSync(absolute);
    if (!real.startsWith(prefix)) throw new Error(`Browser source resolves outside project: ${file}`);
    const name = rel(real);
    if (found.has(name)) return;
    found.set(name, readFileSha(real));
    if (!/\.(?:ts|mjs|js)$/.test(real)) return;
    const source = fs.readFileSync(real, 'utf8');
    const imports = source.matchAll(/^\s*import(?:\s+type)?\s+[^'"\r\n]*?\s+from\s+['"]([^'"]+)['"]/gm);
    for (const match of imports) {
      const target = resolveRelativeModule(real, match[1]);
      if (!target) continue;
      if (target.endsWith('.bend')) continue;
      visit(target);
    }
  };
  for (const entry of entries) visit(path.join(root, ...entry.split('/')));
  return Object.fromEntries([...found].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

function verifyInputs(inputs: Record<string, string>): void {
  for (const [name, expected] of Object.entries(inputs)) {
    const file = path.join(root, ...name.split('/'));
    assert.equal(readFileSha(file), expected, `source changed during candidate build: ${name}`);
  }
}

function applyTrackedAliasPatch(privateBendDir: string): {
  before: string; after: string; beforeCanonical: string; afterCanonical: string;
} {
  const patch = fs.readFileSync(aliasPatchPath, 'utf8');
  assert.equal(sha256(Buffer.from(patch)), aliasPatchSha256);
  const oldLines = patch.split(/\r?\n/).filter((line) => line.startsWith('-') && !line.startsWith('---'));
  const newLines = patch.split(/\r?\n/).filter((line) => line.startsWith('+') && !line.startsWith('+++'));
  assert.equal(oldLines.length, 1, 'patch 006 must contain exactly one removed source line');
  assert.equal(newLines.length, 1, 'patch 006 must contain exactly one added source line');
  const oldLine = oldLines[0].slice(1), newLine = newLines[0].slice(1);
  const file = path.join(privateBendDir, 'bend.ts');
  const original = fs.readFileSync(file, 'utf8');
  const beforeCanonical = sha256(Buffer.from(original.replace(/\r\n/g, '\n')));
  assert.equal(sha256(Buffer.from(original)), expectedFreshCompilerFiles['bend.ts']);
  assert.equal(original.split(oldLine).length - 1, 1, 'patch 006 source anchor must be unique');
  fs.writeFileSync(file, original.replace(oldLine, newLine), { flag: 'w' });
  const updated = fs.readFileSync(file, 'utf8');
  assert.equal(updated.split(newLine).length - 1, 1, 'patch 006 exact replacement was not applied');
  return { before: sha256(Buffer.from(original)), after: sha256(Buffer.from(updated)),
    beforeCanonical, afterCanonical: sha256(Buffer.from(updated.replace(/\r\n/g, '\n'))) };
}

function prepareRun(): { nonce: string; runRoot: string; dist: string } {
  fs.mkdirSync(candidateStore, { recursive: true });
  const requested = process.env.BEND_CANDIDATE_DIST?.trim();
  const nonce = crypto.randomUUID();
  const dist = requested ? path.resolve(requested)
    : path.join(candidateStore, `run-${Date.now()}-${nonce}`, 'dist');
  if (!isInside(candidateStore, dist) || path.basename(dist) !== 'dist')
    throw new Error('BEND_CANDIDATE_DIST must be a new dist directory under browser-2028-candidate.');
  const runRoot = path.dirname(dist);
  if (!/^run-[A-Za-z0-9-]+$/.test(path.basename(runRoot)))
    throw new Error('Candidate output must use a nonce-scoped run-* parent directory.');
  if (fs.existsSync(runRoot) || fs.existsSync(dist))
    throw new Error(`Candidate output already exists; refusing to reuse or overwrite: ${runRoot}`);
  fs.mkdirSync(runRoot, { recursive: false });
  return { nonce, runRoot, dist };
}

function failText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
}

function relocateBaseEffects(book: any, privateBendDir: string): void {
  for (const definition of Object.values(book.tlds) as any[]) {
    if (definition.$ !== 'Def' || definition.b !== true || !definition.i) continue;
    definition.i = definition.i.map((specifier: string) => {
      const match = /^\.\/effs\/([A-Za-z0-9_-]+\.(?:c|js))$/.exec(specifier);
      if (!match) return specifier;
      const file = path.join(privateBendDir, 'effs', match[1]);
      if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile())
        throw new Error(`Candidate Base effect is missing: ${specifier}`);
      return file.replaceAll('\\', '/');
    });
  }
}

async function emitSelectedChild(name: string, privateBendDir: string, output: string): Promise<void> {
  const spec = moduleSpecs[name as keyof typeof moduleSpecs];
  if (!spec || !['controller', 'scene', 'menu'].includes(name)) throw new Error(`Unsupported candidate module: ${name}`);
  if (fs.existsSync(output)) throw new Error(`Private selected cache already exists: ${output}`);
  process.env.BEND_NO_TELEMETRY = '1';
  process.env.BEND_HUB = 'http://127.0.0.1:9';
  const deniedFetches: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    deniedFetches.push(String(input));
    throw new Error(`Candidate compiler network access denied: ${String(input)}`);
  };
  const entry = path.join(root, ...spec.entry.split('/'));
  const candidateBend = await import(pathToFileURL(path.join(privateBendDir, 'bend.ts')).href);
  const candidateComp = await import(pathToFileURL(path.join(privateBendDir, 'comp.ts')).href);
  const book = candidateBend.book_nil();
  await candidateBend.book_load(book, entry.replaceAll('\\', '/'), '', new Map());
  relocateBaseEffects(book, privateBendDir);
  candidateBend.book_valid(book);
  assert.equal(book.hols + book.open, 0, `Unfilled Law or TODO in candidate ${name} module`);
  for (const exported of spec.exports) {
    const definition = book.tlds[exported];
    assert.ok(definition && definition.$ === 'Def' && definition.v !== null && definition.b !== true &&
      definition.x === 0 && definition.i === undefined && candidateComp.io_base(book, definition.T) === null,
    `Selected export is not a pure filled Bend definition: ${name}.${exported}`);
  }
  const code = candidateComp.js_lib(book, spec.exports, spec.exports);
  assert.equal(deniedFetches.length, 0, 'Candidate compiler attempted network access');
  fs.writeFileSync(output, code, { flag: 'wx' });
  console.log(JSON.stringify({ module: name, bytes: Buffer.byteLength(code), sha256: sha256(code), holes: book.hols + book.open }));
}

function selectedBookPlugin(cache: string): BunPlugin {
  const byEntry = new Map(selectedNames.map((name) => [
    path.resolve(root, ...moduleSpecs[name].entry.split('/')),
    path.join(cache, `${name}.js`),
  ]));
  return {
    name: 'rift-bend-2-0-28-candidate-selected-books',
    setup(build) {
      build.onLoad({ filter: /\.bend$/ }, ({ path: file }) => {
        const compiled = byEntry.get(path.resolve(file));
        if (!compiled) throw new Error(`Unselected Bend book in candidate browser bundle: ${file}`);
        return { contents: fs.readFileSync(compiled, 'utf8'), loader: 'js' };
      });
    },
  };
}

function writePrivateFile(dist: string, name: string, bytes: Buffer): string {
  const target = path.resolve(dist, ...name.split('/'));
  if (!isInside(dist, target)) throw new Error(`Candidate output path escaped dist: ${name}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  return sha256(bytes);
}

function verifyAndCopyAssets(dist: string, files: Record<string, string>): void {
  const assetManifestPath = path.join(root, 'bend2/assets/MANIFEST.json');
  const manifest = JSON.parse(fs.readFileSync(assetManifestPath, 'utf8'));
  assert.equal(manifest.schema, 'rift-bend-art-assets/1');
  assert.equal(Object.keys(manifest.assets).length, 2);
  for (const [id, record] of Object.entries(manifest.assets) as [string, any][]) {
    assert.match(id, /^observatory-(?:astral|stone)$/);
    assert.equal(record.runtime, `runtime/${id}.rga`);
    assert.equal(record.depth, 9);
    assert.equal(record.runtimeBytes, 786437);
    const source = path.join(root, 'bend2/assets', record.source);
    const runtime = path.join(root, 'bend2/assets', record.runtime);
    assert.equal(readFileSha(source), record.sourceSha256, `Artwork source differs from manifest: ${id}`);
    const bytes = fs.readFileSync(runtime);
    assert.equal(bytes.length, record.runtimeBytes);
    assert.equal(sha256(bytes), record.runtimeSha256, `Artwork runtime differs from manifest: ${id}`);
    files[`assets/${id}.rga`] = writePrivateFile(dist, `assets/${id}.rga`, bytes);
  }
  const license = fs.readFileSync(path.join(root, 'bend2/assets/LICENSES.md'));
  files['assets/LICENSES.md'] = writePrivateFile(dist, 'assets/LICENSES.md', license);

  const fontManifestPath = path.join(root, 'bend2/ui/v2/fonts/packed-manifest.json');
  const font = JSON.parse(fs.readFileSync(fontManifestPath, 'utf8'));
  assert.equal(font.schema, 'rift-observatory-font-pack/1');
  assert.equal(font.output, 'bend2/assets/runtime/rift-observatory-font.rga');
  assert.equal(font.source, 'bend2/assets/source/fonts/dm-sans-pinned.ttf');
  assert.equal(font.bytes, 151343);
  assert.equal(font.coverage_bits, 8);
  assert.equal(font.records, 242);
  const fontSource = fs.readFileSync(path.join(root, font.source));
  const fontBytes = fs.readFileSync(path.join(root, font.output));
  assert.equal(sha256(fontSource), font.source_sha256);
  assert.equal(fontBytes.length, font.bytes);
  assert.equal(sha256(fontBytes), font.output_sha256);
  assert.equal(readFileSha(path.join(root, 'bend2/assets/source/fonts/OFL.txt')),
    readFileSha(path.join(root, 'bend2/lib/graphics/v2/OFL.txt')));
  files['assets/rift-observatory-font.rga'] = writePrivateFile(dist, 'assets/rift-observatory-font.rga', fontBytes);

  const pieceRoot = path.join(root, 'bend2/assets/source/pieces');
  const pieceManifestPath = path.join(pieceRoot, 'manifest.json');
  const pieces = JSON.parse(fs.readFileSync(pieceManifestPath, 'utf8'));
  assert.equal(pieces.format, 'rift-chess-piece-art-source-v1');
  assert.equal(pieces.source?.path, '../chess-piece-atlas.png');
  assert.equal(pieces.tiers?.interactive?.depth, 7);
  assert.equal(pieces.tiers.interactive.totalBytes, 196623);
  assert.equal(pieces.tiers.interactive.deploymentIntegrated, true);
  assert.equal(pieces.tiers.interactive.pages?.length, 3);
  assert.equal(readFileSha(path.join(pieceRoot, pieces.source.path)), pieces.source.sha256);
  for (let index = 0; index < 3; index++) {
    const page = pieces.tiers.interactive.pages[index];
    assert.equal(page.path, `../../runtime/pieces/pieces-fast-${index}.rga`);
    assert.equal(page.bytes, 65541);
    const bytes = fs.readFileSync(path.join(pieceRoot, page.path));
    assert.equal(bytes.length, page.bytes);
    assert.equal(sha256(bytes), page.sha256, `Chess sprite page differs from manifest: ${index}`);
    files[`assets/pieces-fast-${index}.rga`] = writePrivateFile(dist, `assets/pieces-fast-${index}.rga`, bytes);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === '--emit-selected') {
    if (args.length !== 4) throw new Error('Usage: --emit-selected <controller|scene|menu> <candidate-bend-dir> <output.js>');
    await emitSelectedChild(args[1], args[2], args[3]);
    return;
  }

  if (typeof Bun === 'undefined') throw new Error('Run the candidate builder with the pinned Bun 1.4.2 runtime.');
  const pinMetadata = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
  assert.equal(Bun.version, pinMetadata.bunVersion, 'Candidate application build must use the pinned Bun runtime');
  const { nonce, runRoot, dist } = prepareRun();
  const cache = path.join(runRoot, 'selected-js');
  const compilerRoot = path.join(runRoot, 'compiler');
  const privateBendDir = path.join(compilerRoot, 'bend2');
  const emptyLib = path.join(runRoot, 'empty-bend-lib');
  const receiptPath = path.join(runRoot, 'receipt.json');
  const receipt: Record<string, any> = {
    schema: 'rift-bend-browser-2028-candidate-build/1', nonce, startedAt: new Date().toISOString(),
    status: 'running', sourceRevision: readGitHead(root), sourceDirty: true,
    sourceDirtyMeaning: 'Conservative mutable-workspace claim; no clean-source assertion is made.',
    candidateCompiler: null, sourceInputs: null, emittedBooks: [], browserBridge: null,
    buildFiles: null, bot: { status: 'pending' },
    network: { BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9', packageCache: 'nonce-private empty directory' },
    dist,
  };
  const writeReceipt = (): void => {
    receipt.finishedAt = new Date().toISOString();
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: fs.existsSync(receiptPath) ? 'w' : 'wx' });
  };
  try {
    const stack = verifyFreshStack();
    receipt.candidateCompiler = stack;
    const sourceRevision = readGitHead(root);
    receipt.sourceRevision = sourceRevision;
    const bendEntries = [...selectedNames.map((name) => moduleSpecs[name].entry),
      'bend2/platform/worker/BotAdapter.bend'];
    const toolchainPinPath = path.join(root, 'bend2/TOOLCHAIN.json');
    const toolchainPin = JSON.parse(fs.readFileSync(toolchainPinPath, 'utf8'));
    assert.equal(Bun.version, toolchainPin.bunVersion, 'Candidate worker emission must use the pinned Bun runtime');
    const bendInputs = sourceClosure(bendEntries);
    const browserEntries = [
      'bend2/platform/browser/host.ts',
      'bend2/platform/browser/worker-v2.ts',
      'bend2/platform/browser/sprite-helper.ts',
      'bend2/toolchain-patches/006-alias-equality/browser-abi-transform-2028.ts',
      'bend2/toolchain-patches/006-alias-equality/browser-abi-2028.ts',
      'bend2/toolchain-patches/006-alias-equality/browser-candidate-bot-smoke-2028.mjs',
      'bend2/tools/selected-modules.mjs',
      'bend2/tools/emit-worker-libs.mjs',
      'bend2/TOOLCHAIN.json',
      'bend2/tests/bot-worker-bootstrap.mjs',
      rel(driverPath),
    ];
    const browserInputs = browserSourceClosure(browserEntries);
    const patchInputs = Object.fromEntries([
      ...expectedPatchStack.map((item) => [
        `bend2/toolchain-patches/${item.path}`, item.sha256,
      ] as const),
      ['bend2/toolchain-patches/006-alias-equality/006-after-004-2.0.28.patch', aliasPatchSha256] as const,
    ]);
    const sourceInputs = { ...bendInputs, ...browserInputs, ...patchInputs };
    receipt.sourceInputs = {
      count: Object.keys(sourceInputs).length,
      sha256: mapDigest(sourceInputs),
      files: Object.fromEntries(Object.entries(sourceInputs).sort(([a], [b]) => a.localeCompare(b, 'en'))),
    };

    fs.cpSync(path.join(freshRoot, 'bend2'), privateBendDir, { recursive: true, force: false, errorOnExist: true });
    const privateBefore = fileMap(privateBendDir);
    assert.deepEqual(privateBefore, stack.sourceFiles, 'nonce-private compiler copy differs from fresh stack');
    const patchResult = applyTrackedAliasPatch(privateBendDir);
    assert.equal(patchResult.before, expectedFreshCompilerFiles['bend.ts']);
    assert.equal(patchResult.afterCanonical, expectedPatchedBendCanonicalSha256,
      'private post-006 Bend source differs from the candidate LF-normalized result');
    const privateAfter006 = fileMap(privateBendDir);
    for (const [name, expected] of Object.entries(expectedFreshCompilerFiles)) {
      if (name !== 'bend.ts') assert.equal(privateAfter006[name], expected, `private candidate compiler differs after 006: ${name}`);
    }
    for (const [name, hash] of Object.entries(privateBefore)) {
      if (name !== 'bend.ts') assert.equal(privateAfter006[name], hash, `006 changed unexpected compiler resource: ${name}`);
    }
    const emptyCandidateLib = path.join(emptyLib, 'lib');
    fs.mkdirSync(emptyCandidateLib, { recursive: true });
    process.env.BEND_NO_TELEMETRY = '1';
    process.env.BEND_HUB = 'http://127.0.0.1:9';
    process.env.BEND_LIB = emptyCandidateLib;
    const deniedFetches: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL) => {
      deniedFetches.push(String(input));
      throw new Error(`Candidate build network access denied: ${String(input)}`);
    };
    fs.mkdirSync(cache, { recursive: false });
    const emittedBooks: Array<Record<string, unknown>> = [];
    for (const name of selectedNames) {
      const output = path.join(cache, `${name}.js`);
      const child = spawnSync(process.execPath, ['run', driverPath, '--emit-selected', name, privateBendDir, output], {
        cwd: root,
        env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9', BEND_LIB: emptyCandidateLib },
        encoding: 'utf8', timeout: compileTimeoutMs, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
      });
      if (child.error || child.status !== 0) {
        const timedOut = (child.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
        throw new Error(`Selected Bend ${name} ${timedOut ? `exceeded ${compileTimeoutMs}ms bound` : `failed (status ${child.status})`}:\n` +
          `${child.error?.message ?? ''}\n${(child.stderr || '').slice(-12000)}\n${(child.stdout || '').slice(-4000)}`);
      }
      const code = fs.readFileSync(output);
      const record = { name, entry: moduleSpecs[name].entry, exports: moduleSpecs[name].exports,
        bytes: code.length, sha256: sha256(code), sourceClosureSha256: mapDigest(sourceClosure([moduleSpecs[name].entry])) };
      emittedBooks.push(record);
      receipt.emittedBooks = emittedBooks;
      console.log(JSON.stringify({ phase: 'selected-book-emitted', ...record }));
    }
    receipt.emittedBooks = emittedBooks;
    const workerCompilerSourceTreeSha256 = compilerSourceTreeHash(compilerRoot);
    const cacheManifest = {
      schema: 'rift-bend-2028-candidate-selected-cache/1',
      compiler: { baseCommit: upstreamCommit, sourceTreeSha256: mapDigest(privateAfter006),
        workerContractSourceTreeSha256: workerCompilerSourceTreeSha256, patch006Sha256: aliasPatchSha256 },
      books: emittedBooks,
    };
    fs.writeFileSync(path.join(cache, 'manifest.json'), `${JSON.stringify(cacheManifest, null, 2)}\n`, { flag: 'wx' });

    // Use the candidate compiler's reviewed static-worker CLI and the same
    // exact five-artifact/source-binding contract as emit-worker-libs.mjs.
    const rawBotDir = path.join(runRoot, 'bot-library-raw');
    const botEntry = path.join(root, 'bend2/platform/worker/BotAdapter.bend');
    const workerCompile = spawnSync(process.execPath, [path.join(privateBendDir, 'main.ts'), botEntry,
      '--web-workers=required-only', '--web-policy=strict', '--web-exports=choose', '-o', rawBotDir], {
      cwd: privateBendDir,
      env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9', BEND_LIB: emptyCandidateLib },
      encoding: 'utf8', timeout: compileTimeoutMs, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    });
    if (workerCompile.error || workerCompile.status !== 0) {
      const timedOut = (workerCompile.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
      throw new Error(`Candidate 2.0.28 BotAdapter worker emission ${timedOut ? `exceeded ${compileTimeoutMs}ms bound` : `failed (status ${workerCompile.status})`}:\n` +
        `${workerCompile.error?.message ?? ''}\n${(workerCompile.stderr || '').slice(-12000)}\n${(workerCompile.stdout || '').slice(-4000)}`);
    }
    const botManifest = JSON.parse(fs.readFileSync(path.join(rawBotDir, 'manifest.json'), 'utf8'));
    assert.equal(botManifest.protocol, 1);
    assert.equal(botManifest.backend, 'bend-web-workers-2');
    assert.equal(botManifest.mode, 'required-only');
    assert.equal(botManifest.policy, 'strict');
    assert.deepEqual(Object.keys(botManifest.exports).sort(), ['choose']);
    assert.equal(botManifest.functions[botManifest.exports.choose]?.name, 'choose');
    assert.deepEqual(Object.keys(botManifest.artifacts).sort(), ['entry', 'manifest', 'program', 'runtime', 'worker']);
    const botBinding = bindWorkerLibrary(rawBotDir, {
      baseCommit: upstreamCommit, sourceTreeSha256: workerCompilerSourceTreeSha256,
    });
    const botBindingPath = path.join(rawBotDir, 'source-binding.json');
    fs.writeFileSync(botBindingPath, `${JSON.stringify(botBinding, null, 2)}\n`, { flag: 'wx' });
    const botBindingSha256 = readFileSha(botBindingPath);
    receipt.bot = { status: 'emitted', manifest: botManifest, sourceBindingSha256: botBindingSha256,
      compilerSourceTreeSha256: workerCompilerSourceTreeSha256,
      command: ['<pinned-bun>', 'candidate/bend2/main.ts', 'bend2/platform/worker/BotAdapter.bend',
        '--web-workers=required-only', '--web-policy=strict', '--web-exports=choose', '-o', 'nonce-private/bot-library-raw'],
      stdout: (workerCompile.stdout || '').slice(-8000), stderr: (workerCompile.stderr || '').slice(-8000) };

    fs.mkdirSync(dist, { recursive: false });
    const files: Record<string, string> = Object.create(null);
    const botOutputDirectory = path.join(dist, 'worker-libs/bot');
    fs.mkdirSync(botOutputDirectory, { recursive: true });
    for (const artifactName of Object.values(botManifest.artifacts).sort()) {
      assert.equal(path.basename(artifactName), artifactName, 'Candidate bot artifact name is not a basename');
      const bytes = fs.readFileSync(path.join(rawBotDir, artifactName));
      files[`worker-libs/bot/${artifactName}`] = writePrivateFile(
        dist, `worker-libs/bot/${artifactName}`, bytes);
    }
    const smokePath = path.join(root, 'bend2/toolchain-patches/006-alias-equality/browser-candidate-bot-smoke-2028.mjs');
    const nodeVersion = spawnSync('node', ['--version'], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(nodeVersion.status, 0, nodeVersion.stderr);
    assert.equal(nodeVersion.stdout.trim(), 'v24.12.0', 'Candidate bot smoke requires the observed Node 24.12.0 runtime');
    const botSmoke = spawnSync('node', [smokePath, dist,
      path.join(cache, 'controller.js'), runRoot, upstreamCommit,
      workerCompilerSourceTreeSha256, botBindingPath], {
      cwd: root,
      env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9', BEND_LIB: emptyCandidateLib },
      encoding: 'utf8', timeout: compileTimeoutMs, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    });
    if (botSmoke.error || botSmoke.status !== 0) {
      throw new Error(`Candidate BotAdapter warmup/call smoke failed (status ${botSmoke.status}):\n` +
        `${botSmoke.error?.message ?? ''}\n${(botSmoke.stderr || '').slice(-12000)}\n${(botSmoke.stdout || '').slice(-8000)}`);
    }
    const botSmokeLine = (botSmoke.stdout || '').trim().split(/\r?\n/).filter(Boolean).at(-1);
    assert.ok(botSmokeLine, 'Candidate bot smoke emitted no result record');
    const botSmokeResult = JSON.parse(botSmokeLine);
    assert.equal(botSmokeResult.status, 'success', botSmokeResult.failure ?? 'candidate worker smoke failed');
    const botSmokeReceiptBytes = fs.readFileSync(botSmokeResult.receipt);
    const botSmokeReceipt = JSON.parse(botSmokeReceiptBytes.toString('utf8'));
    assert.equal(botSmokeReceipt.status, 'success');
    assert.equal(botSmokeReceipt.nodeRuntime?.version, nodeVersion.stdout.trim());
    assert.deepEqual(botSmokeReceipt.network.deniedFetches, []);
    receipt.bot = { ...receipt.bot, status: 'candidate', available: true,
      entry: './worker-libs/bot/index.mjs', sourceBindingSha256: botBindingSha256,
      smokeReceipt: rel(botSmokeResult.receipt), smokeReceiptSha256: sha256(botSmokeReceiptBytes),
      smoke: botSmokeReceipt.result, nodeRuntime: botSmokeReceipt.nodeRuntime,
      files: Object.keys(botBinding.artifacts).sort() };
    assert.equal(readFileSha(botBindingPath), botBindingSha256, 'Candidate worker source binding changed during smoke');
    assert.equal(sha256(fs.readFileSync(smokePath)), sourceInputs[rel(smokePath)],
      'Candidate bot smoke helper changed during run');
    const selected = selectedBookPlugin(cache);
    const common = { outdir: dist, target: 'browser' as const, format: 'esm' as const,
      naming: '[name]-[hash].[ext]', minify: true, sourcemap: 'none' as const, splitting: false,
      plugins: [candidateBridgePlugin, selected] };
    const sceneSha = emittedBooks.find((item) => item.name === 'scene')!.sha256 as string;
    const helper = await Bun.build({ ...common,
      entrypoints: [path.join(root, 'bend2/platform/browser/sprite-helper.ts')],
      define: { __BEND_SPRITE_SOURCE__: JSON.stringify(sceneSha) },
    });
    if (!helper.success) throw new Error(`Candidate sprite-helper bundle failed:\n${helper.logs.map(String).join('\n')}`);
    const helperOutput = helper.outputs.find((file) => file.path.endsWith('.js'));
    assert.ok(helperOutput, 'Candidate sprite-helper bundle produced no JavaScript output');
    const helperName = path.basename(helperOutput.path);
    const worker = await Bun.build({ ...common,
      entrypoints: [path.join(root, 'bend2/platform/browser/worker-v2.ts')],
      define: { __BEND_SPRITE_HELPER__: JSON.stringify(`./${helperName}`),
        __BEND_SPRITE_SOURCE__: JSON.stringify(sceneSha) },
    });
    if (!worker.success) throw new Error(`Candidate worker bundle failed:\n${worker.logs.map(String).join('\n')}`);
    const workerOutput = worker.outputs.find((file) => file.path.endsWith('.js'));
    assert.ok(workerOutput, 'Candidate worker bundle produced no JavaScript output');
    const workerName = path.basename(workerOutput.path);
    const host = await Bun.build({ ...common,
      entrypoints: [path.join(root, 'bend2/platform/browser/host.ts')],
      define: { __BEND_WORKER__: JSON.stringify(`./${workerName}`) },
    });
    if (!host.success) throw new Error(`Candidate host bundle failed:\n${host.logs.map(String).join('\n')}`);
    const hostOutput = host.outputs.find((file) => file.path.endsWith('.js'));
    assert.ok(hostOutput, 'Candidate host bundle produced no JavaScript output');
    const hostName = path.basename(hostOutput.path);
    for (const name of [helperName, workerName, hostName]) {
      const bytes = fs.readFileSync(path.join(dist, name));
      files[name] = sha256(bytes);
    }
    const css = fs.readFileSync(path.join(root, 'bend2/platform/browser/platform.css'));
    const cssName = `style-${sha256(css).slice(0, 12)}.css`;
    files[cssName] = writePrivateFile(dist, cssName, css);
    let html = fs.readFileSync(path.join(root, 'bend2/platform/browser/index.html'), 'utf8');
    for (const [before, after] of [['./main.js', `./${hostName}`], ['./style.css', `./${cssName}`]]) {
      assert.equal(html.split(before).length - 1, 1, `index.html expected one ${before} reference`);
      html = html.replace(before, after);
    }
    files['index.html'] = writePrivateFile(dist, 'index.html', Buffer.from(html));
    for (const [source, output] of [
      ['bend2/THIRD_PARTY_NOTICES.txt', 'THIRD_PARTY_NOTICES.txt'],
      ['bend2/licenses/Bend-Apache-2.0.txt', 'Bend-Apache-2.0.txt'],
      ['bend2/lib/graphics/v2/OFL.txt', 'Rift-Atlas-Sans-OFL.txt'],
    ]) {
      const bytes = fs.readFileSync(path.join(root, ...source.split('/')));
      files[output] = writePrivateFile(dist, output, bytes);
    }
    verifyAndCopyAssets(dist, files);
    const sortedFiles = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en')));
    const version = sha256(JSON.stringify(sortedFiles)).slice(0, 20);
    const precache = ['./', './build.json', ...Object.keys(sortedFiles).map((name) => `./${name}`)];
    let sw = fs.readFileSync(path.join(root, 'bend2/platform/browser/sw.js'), 'utf8');
    assert.equal(sw.split('__BEND_BUILD__').length - 1, 1);
    assert.equal(sw.split('__BEND_ASSETS__').length - 1, 1);
    sw = sw.replace('__BEND_BUILD__', version).replace('__BEND_ASSETS__', JSON.stringify(precache));
    files['sw.js'] = writePrivateFile(dist, 'sw.js', Buffer.from(sw));

    const bridge = candidateBridgeEvidence();
    receipt.browserBridge = bridge;
    assert.equal(deniedFetches.length, 0, 'Candidate driver attempted network access');
    verifyInputs(sourceInputs);
    assert.deepEqual(fileMap(privateBendDir), privateAfter006, 'private candidate compiler changed during emission');
    const candidate = {
      candidate: true, draft: true, sourceDirty: true, sourceRevision,
      builtAt: new Date().toISOString(), version,
      application: 'Isolated Bend 2.0.28 candidate browser build; not the pinned or published application.',
      compiler: {
        version: '2.0.28', upstreamTag: 'v2.0.28', baseCommit: upstreamCommit,
        orderedPatches: expectedPatchStack, sourceFiles: privateAfter006,
        sourceTreeSha256: mapDigest(privateAfter006),
        workerContractSourceTreeSha256: workerCompilerSourceTreeSha256,
        bunVersion: Bun.version,
        patch006: { path: rel(aliasPatchPath), sha256: aliasPatchSha256,
          prePatchBendSha256: patchResult.before, postPatchBendSha256: patchResult.after,
          prePatchBendCanonicalSha256: patchResult.beforeCanonical,
          postPatchBendCanonicalSha256: patchResult.afterCanonical },
      },
      selectedBooks: emittedBooks,
      browserBridge: bridge,
      bot: { status: 'candidate', available: true, entry: './worker-libs/bot/index.mjs',
        sourceBindingSha256: botBindingSha256, smokeReceiptSha256: sha256(botSmokeReceiptBytes),
        nodeRuntime: botSmokeReceipt.nodeRuntime,
        protocol: botManifest.protocol, program: botManifest.program, backend: botManifest.backend,
        mode: botManifest.mode, policy: botManifest.policy,
        files: Object.keys(botBinding.artifacts).sort() },
      workerLibraries: { bot: { status: 'candidate', available: true, entry: './worker-libs/bot/index.mjs',
        sourceBindingSha256: botBindingSha256, program: botManifest.program,
        nodeRuntime: botSmokeReceipt.nodeRuntime,
        protocol: botManifest.protocol, backend: botManifest.backend, mode: botManifest.mode,
        policy: botManifest.policy, files: Object.keys(botBinding.artifacts).sort() } },
      files: { ...sortedFiles, 'sw.js': files['sw.js'] },
    };
    fs.writeFileSync(path.join(dist, 'build.json'), `${JSON.stringify(candidate, null, 2)}\n`, { flag: 'wx' });
    receipt.buildFiles = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en')));
    receipt.buildVersion = version;
    receipt.status = 'success';
    receipt.deniedFetches = deniedFetches;
    writeReceipt();
    console.log(JSON.stringify({ status: 'success', dist, receipt: receiptPath, version,
      compilerBaseCommit: upstreamCommit, bot: receipt.bot.status }));
  } catch (error) {
    receipt.status = 'failed';
    receipt.failure = failText(error);
    writeReceipt();
    console.error(JSON.stringify({ status: 'failed', dist, receipt: receiptPath,
      failure: receipt.failure.slice(0, 16000) }));
    process.exitCode = 1;
  }
}

await main();
