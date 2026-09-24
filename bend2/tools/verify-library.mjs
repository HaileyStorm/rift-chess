import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifestRelative = 'bend2/lib/graphics/VERIFICATION.json';
const toolchainRelative = 'bend2/TOOLCHAIN.json';
const libraryRoot = 'bend2/lib/graphics';
const requiredFiles = [
  'bend2/lib/graphics/Canvas.bend',
  'bend2/lib/graphics/Font.bend',
  'bend2/lib/graphics/LAWS.md',
  'bend2/lib/graphics/pixels/Pixel.bend',
  'bend2/lib/graphics/pixels/LAWS.bend',
  'bend2/lib/graphics/pixels/PROOF.bend',
  'bend2/lib/graphics/pixels/LAWS.md',
  'bend2/lib/graphics/contracts/LAWS.bend',
  'bend2/lib/graphics/contracts/PROOF.bend',
  'bend2/lib/graphics/tests/font.ts',
  'bend2/lib/graphics/tests/raster.ts',
];
const historicalCopies = {
  'bend2/lib/graphics/pixels/Pixel.bend': 'bend2/graphics/Pixel.bend',
  'bend2/lib/graphics/pixels/LAWS.bend': 'bend2/graphics/LAWS.bend',
  'bend2/lib/graphics/pixels/PROOF.bend': 'bend2/graphics/PROOF.bend',
  'bend2/lib/graphics/pixels/LAWS.md': 'bend2/docs/GRAPHICS_LAWS_V1.md',
};

export function digest(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function absolute(relative) {
  if (typeof relative !== 'string' || relative.length === 0 || path.isAbsolute(relative)) {
    throw new Error(`Library path must be a non-empty relative path: ${String(relative)}`);
  }
  const resolved = path.resolve(root, relative);
  const prefix = `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    throw new Error(`Library path escapes the repository root: ${relative}`);
  }
  return resolved;
}

function readJson(relative) {
  const file = absolute(relative);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${relative}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function requireFile(relative) {
  const file = absolute(relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Required library file is missing: ${relative}`);
  return file;
}

function verifyCompiler(manifest) {
  const expected = manifest.compiler;
  if (!expected || typeof expected !== 'object') throw new Error('Library manifest has no compiler pin.');
  const toolchain = readJson(toolchainRelative);
  for (const field of ['bendVersion', 'bendCommit', 'bunVersion']) {
    if (expected[field] !== toolchain[field]) {
      throw new Error(`Library compiler pin drifted for ${field}: manifest=${String(expected[field])}, toolchain=${String(toolchain[field])}`);
    }
  }
  const toolchainFile = requireFile(toolchainRelative);
  const toolchainHash = digest(fs.readFileSync(toolchainFile));
  if (expected.toolchain !== toolchainRelative || expected.toolchainSha256 !== toolchainHash) {
    throw new Error(`Library toolchain hash drifted: expected ${expected.toolchainSha256}, actual ${toolchainHash}`);
  }
  const compilerRoot = path.join(root, '.artifacts/toolchains/bend');
  const compilerEntry = path.join(compilerRoot, 'bend2');
  if (!fs.existsSync(compilerEntry)) throw new Error(`Pinned Bend compiler is missing: ${compilerEntry}`);
  const head = spawnSync('git', ['-C', compilerRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (head.status !== 0 || head.stdout.trim() !== toolchain.bendCommit) {
    throw new Error(`Pinned Bend compiler revision differs from TOOLCHAIN.json: ${head.stdout.trim()}`);
  }
  const dirty = spawnSync('git', ['-C', compilerRoot, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
  if (dirty.status !== 0 || dirty.stdout.trim()) throw new Error('Pinned Bend compiler has tracked modifications.');
  const bun = process.env.BUN_BIN || path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
  if (!fs.existsSync(bun)) throw new Error(`Pinned Bun runtime is missing: ${bun}`);
  const runtime = spawnSync(bun, ['--version'], { encoding: 'utf8' });
  if (runtime.status !== 0 || runtime.stdout.trim() !== toolchain.bunVersion) {
    throw new Error(`Pinned Bun runtime differs from TOOLCHAIN.json: ${runtime.stdout.trim()}`);
  }
  return {
    bendVersion: toolchain.bendVersion,
    bendCommit: toolchain.bendCommit,
    bunVersion: toolchain.bunVersion,
    toolchainSha256: toolchainHash,
  };
}

function verifyCopies(manifest) {
  if (!manifest.copies || typeof manifest.copies !== 'object' || Array.isArray(manifest.copies)) {
    throw new Error('Library manifest has no copy provenance table.');
  }
  for (const [activeRelative, originalRelative] of Object.entries(historicalCopies)) {
    const record = manifest.copies[activeRelative];
    if (!record || record.original !== originalRelative) {
      throw new Error(`Required historical copy binding is missing or changed: ${activeRelative}`);
    }
  }
  const verified = [];
  for (const [activeRelative, record] of Object.entries(manifest.copies)) {
    if (!record || typeof record !== 'object') throw new Error(`Invalid copy provenance record: ${activeRelative}`);
    const activeFile = requireFile(activeRelative);
    const originalRelative = record.original;
    const originalFile = requireFile(originalRelative);
    const activeHash = digest(fs.readFileSync(activeFile));
    const originalHash = digest(fs.readFileSync(originalFile));
    if (!/^[0-9a-f]{64}$/i.test(record.activeCopySha256) || !/^[0-9a-f]{64}$/i.test(record.originalSourceSha256)) {
      throw new Error(`Invalid SHA-256 provenance record: ${activeRelative}`);
    }
    if (activeHash !== record.activeCopySha256) throw new Error(`Active library copy drifted: ${activeRelative}`);
    if (originalHash !== record.originalSourceSha256) throw new Error(`Historical source drifted: ${originalRelative}`);
    if (activeHash !== originalHash) throw new Error(`Active copy is not byte-identical to its historical source: ${activeRelative}`);
    verified.push({ active: activeRelative, original: originalRelative, sha256: activeHash });
  }
  return verified;
}

function verifyRequiredFiles() {
  return requiredFiles.map(relative => {
    requireFile(relative);
    return relative;
  });
}

function librarySources(dir = absolute(libraryRoot)) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    // The immutable v1 source set ends at this namespace boundary. New major
    // versions own separate manifests and checks; they never extend v1's hash.
    if (dir === absolute(libraryRoot) && entry.isDirectory() && entry.name === 'v2') return [];
    return entry.isDirectory()
      ? librarySources(path.join(dir,entry.name))
      : /\.(bend|md|ts)$/.test(entry.name) ? [path.relative(root,path.join(dir,entry.name)).replaceAll('\\','/')] : [];
  }).sort();
}

function sourceHashes() {
  const sources=librarySources();
  for(const file of sources.filter(file=>file.endsWith('.bend'))) {
    const text=fs.readFileSync(absolute(file),'utf8');
    for(const match of text.matchAll(/^\s*import\s+([^\s]+)/gm)) {
      if(match[1]==='Base') continue;
      const target=path.resolve(root,path.dirname(file),match[1]);
      if(!target.startsWith(absolute(libraryRoot)+path.sep))throw new Error(`Reusable graphics imports application/outside code: ${file}: ${match[1]}`);
    }
  }
  return Object.fromEntries(sources.map(file=>[file,digest(fs.readFileSync(absolute(file)))]));
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: Number(process.env.BEND_LIBRARY_TIMEOUT_MS || 300000),
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Library check failed (${command} ${args.join(' ')}):\n${output}`);
  return { command, args, output: output.trim() };
}

function runChecks() {
  const bend = 'bend2/tools/bend.mjs';
  return [
    run(process.execPath, [bend, 'bend2/lib/graphics/pixels/PROOF.bend', '--check-only']),
    run(process.execPath, [bend, 'bend2/lib/graphics/contracts/PROOF.bend', '--check-only']),
    run(process.execPath, [bend, '--run', 'bend2/lib/graphics/tests/font.ts']),
    run(process.execPath, [bend, '--run', 'bend2/lib/graphics/tests/raster.ts']),
  ];
}

export function verifyLibrary({ check = false } = {}) {
  const manifest = readJson(manifestRelative);
  if (manifest.schema !== 'rift-bend-library-graphics/1' || manifest.version !== 1) {
    throw new Error('Unknown graphics library verification manifest.');
  }
  const compiler = verifyCompiler(manifest);
  const copies = verifyCopies(manifest);
  const files = verifyRequiredFiles();
  const sources = sourceHashes();
  if(manifest.sourceFreeze && JSON.stringify(manifest.sourceFreeze.files)!==JSON.stringify(sources)) {
    throw new Error('Frozen reusable graphics source changed. Review and verify a new library version.');
  }
  const checks = check ? runChecks() : [];
  return {
    schema: manifest.schema,
    compiler,
    copies,
    files,
    sourceFreeze: manifest.sourceFreeze ? digest(JSON.stringify(manifest.sourceFreeze)) : null,
    checked: check,
    checks: checks.map(({ command, args, output }) => ({ command, args, output })),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if(process.argv.includes('--freeze-sources')) {
    const manifest=readJson(manifestRelative);
    if(manifest.sourceFreeze)throw new Error('Library source freeze already exists; preserve this version.');
    const before=sourceHashes(), result=verifyLibrary({check:true}), after=sourceHashes();
    if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Library changed during verification');
    manifest.sourceFreeze={version:1,at:new Date().toISOString(),files:before,checks:result.checks.map(c=>({args:c.args,outputSha256:digest(c.output)}))};
    fs.writeFileSync(absolute(manifestRelative),JSON.stringify(manifest,null,2)+'\n');
  }
  const check = process.argv.includes('--check');
  const result = verifyLibrary({ check });
  console.log(JSON.stringify({ ok: true, ...result }));
}
