import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, digest, verifyFreeze } from './freeze.mjs';
import { verifyV2 } from './freeze-v2.mjs';
import { verifyLibrary } from './verify-library.mjs';

const entry = path.join(root, 'bend2/NativeCLI.bend');
const outRoot = path.join(root, '.artifacts/bend2/native-cli');
const toolchain = path.join(root, 'bend2/TOOLCHAIN.json');
const toolPath = fileURLToPath(import.meta.url);

function compilerPin() {
  const pin = JSON.parse(fs.readFileSync(toolchain, 'utf8'));
  const upstream = path.join(root, '.artifacts/toolchains/bend');
  const head = spawnSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  const dirty = spawnSync('git', ['-C', upstream, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
  if (head.status !== 0 || head.stdout.trim() !== pin.bendCommit ||
      dirty.status !== 0 || dirty.stdout.trim()) throw new Error('Pinned Bend compiler differs from TOOLCHAIN.json.');
  return pin;
}

function closure(file, found = new Set()) {
  const absolute = path.resolve(file);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !absolute.endsWith('.bend')) {
    throw new Error(`Imported source escapes the Bend workspace: ${file}`);
  }
  if (found.has(absolute)) return found;
  if (!fs.existsSync(absolute)) throw new Error(`Missing imported Bend source: ${relative}`);
  found.add(absolute);
  const source = fs.readFileSync(absolute, 'utf8');
  for (const match of source.matchAll(/^\s*import\s+([^\s#]+)/gm)) {
    const spec = match[1].replace(/^['"]|['"]$/g, '');
    if (spec === 'Base' || !spec.startsWith('.')) continue;
    closure(path.resolve(path.dirname(absolute), spec.endsWith('.bend') ? spec : `${spec}.bend`), found);
  }
  return found;
}

function hashInputs(files) {
  return Object.fromEntries([...files].sort().map(file =>
    [path.relative(root, file).replaceAll('\\', '/'), digest(fs.readFileSync(file))]));
}

function runBend(args, label, logPath) {
  const timeout = Number(process.env.BEND_TIMEOUT_MS || 300000);
  if (!Number.isSafeInteger(timeout) || timeout < 1000 || timeout > 900000) {
    throw new Error('Invalid bounded Bend CLI timeout.');
  }
  const result = spawnSync(process.execPath, [path.join(root, 'bend2/tools/bend.mjs'), ...args], {
    cwd: root,
    env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_TIMEOUT_MS: String(timeout) },
    encoding: 'utf8', timeout: timeout + 10000, maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  fs.writeFileSync(logPath, output, { flag: 'wx' });
  if (result.error) throw new Error(`${label} failed to start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed; see ${path.relative(root, logPath)}.`);
  return output;
}

function uniqueOut() {
  fs.mkdirSync(outRoot, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  let i = 0;
  let out = path.join(outRoot, stamp);
  while (fs.existsSync(out)) out = path.join(outRoot, `${stamp}-${++i}`);
  fs.mkdirSync(out);
  return out;
}

const pin = compilerPin();
const oldCore = verifyFreeze('core');
const oldPixels = verifyFreeze('graphics');
const v2 = verifyV2();
verifyLibrary();
const inputs = hashInputs(closure(entry));
inputs['bend2/tools/export-native-cli.mjs'] = digest(fs.readFileSync(toolPath));
inputs['bend2/tools/bend.mjs'] = digest(fs.readFileSync(path.join(root, 'bend2/tools/bend.mjs')));
inputs['bend2/TOOLCHAIN.json'] = digest(fs.readFileSync(toolchain));
const before = JSON.stringify(inputs);
const out = uniqueOut();
const output = path.join(out, 'rift-chess-native-cli.c');
const source = entry.replaceAll('\\', '/');
try {
  runBend([source, '--check-only'], 'Native CLI source check', path.join(out, 'check-only.log'));
  runBend([source, '-o', output.replaceAll('\\', '/')], 'Pinned Bun C emission', path.join(out, 'emit-c.log'));
  if (!fs.existsSync(output)) throw new Error('Compiler returned success without C source.');
  const after = { ...hashInputs(closure(entry)) };
  for (const key of ['bend2/tools/export-native-cli.mjs', 'bend2/tools/bend.mjs', 'bend2/TOOLCHAIN.json']) {
    after[key] = digest(fs.readFileSync(path.join(root, key)));
  }
  if (JSON.stringify(after) !== before) throw new Error('Input changed during C emission; discard this export.');
  const cSource = fs.readFileSync(output);
  const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal', '--', 'bend2'], { cwd: root, encoding: 'utf8' }).trim());
  const manifest = {
    schema: 'rift-chess-native-cli-export/1', at: new Date().toISOString(),
    input: 'bend2/NativeCLI.bend', sourceRevision, sourceDirty,
    compiler: { bendVersion: pin.bendVersion, bendCommit: pin.bendCommit,
      bunVersion: pin.bunVersion, telemetry: 'BEND_NO_TELEMETRY=1', target: 'portable C source' },
    frozen: { semanticV2Sha256: v2.sha256, parentSemanticSha256: oldCore.sha256,
      pixelSemanticSha256: oldPixels.sha256,
      graphicsManifestSha256: digest(fs.readFileSync(path.join(root, 'bend2/lib/graphics/VERIFICATION.json'))) },
    inputs, cSource: path.basename(output), cSourceSha256: digest(cSource), cSourceBytes: cSource.length,
    runtime: 'Bend C emission only; native binary, audio device and supported-host execution are unverified',
  };
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(out, 'manifest.json'), bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'manifest.sha256'), `${digest(bytes)}  manifest.json\n`, { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'rift-chess-native-cli.c.sha256'),
    `${manifest.cSourceSha256}  ${manifest.cSource}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ out, cSource: manifest.cSource, cSourceSha256: manifest.cSourceSha256,
    bytes: manifest.cSourceBytes, inputCount: Object.keys(inputs).length, sourceDirty,
    v2ManifestSha256: v2.sha256, runtime: manifest.runtime }));
} catch (error) {
  fs.writeFileSync(path.join(out, 'failure.txt'), `${String(error.stack || error)}\n`, { flag: 'wx' });
  throw error;
}
