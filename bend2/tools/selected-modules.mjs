// Source-bound, sequential codegen inputs for the whole-Bend browser app.
// Each module is emitted in a separate process so no build holds all books.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const cacheDir = path.join(root, '.artifacts/bend2/v2-preview/selected-js');
export const moduleSpecs = Object.freeze({
  controller: Object.freeze({ entry: 'bend2/ApplicationControl.bend',
    exports: ['boot_reads', 'dispatch_at', 'dispatch_at_web', 'refine', 'bot_job',
      'bot_apply_at', 'bot_fallback_at', 'storage_key', 'max_file_bytes', 'audio_samples'] }),
  scene: Object.freeze({ entry: 'bend2/graphics/v2game/BoardScene.bend',
    exports: ['asset_ids', 'load_plates', 'sprite_asset_ids', 'load_sprite_pages',
      'underlay128_asset', 'underlay256_asset', 'underlay512_asset', 'underlay1024_asset',
      'render512_asset', 'render1024_asset',
      'underlay256_theme', 'underlay512_theme', 'underlay1024_theme',
      'fast_ground512', 'fast_ground1024', 'settled_ground512',
      'fast_prepare512', 'fast_prepare1024',
      'fast_pointer512', 'fast_pointer1024',
      'fast_camera512', 'fast_camera1024',
      'fast_sprite_pieces512', 'fast_feedback_on_pieces512',
      'fast_sprite_feedback_static512', 'sprite_same_placement', 'nearest2'] }),
  chrome: Object.freeze({ entry: 'bend2/ui/v2/ChromeRaster.bend',
    exports: ['shell', 'overlay', 'compose'] }),
  menu: Object.freeze({ entry: 'bend2/ui/v2/MenuAA.bend',
    exports: ['font_path', 'font_byte_cap', 'load_font', 'play',
      'same_base', 'base_chrome', 'same_static', 'controls_chrome',
      'dynamic_chrome', 'compose', 'render'] }),
});

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}
function fileHash(file) { return sha256(fs.readFileSync(file)); }
function relative(file) { return path.relative(root, file).replaceAll('\\', '/'); }
function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function closure(entry, found = new Set()) {
  const file = path.resolve(root, entry);
  assert.ok(file === root || file.startsWith(root + path.sep), 'Import escaped workspace');
  if (found.has(file)) return found;
  assert.ok(fs.statSync(file, { throwIfNoEntry: false })?.isFile(), `Missing Bend import: ${relative(file)}`);
  found.add(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const match = /^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*$/.exec(line);
    if (!match) continue;
    const spec = match[1];
    // Base foreign twins are quoted .js/.c imports, not Bend modules. Their
    // JavaScript bytes are bound below as a separate effect-closure input.
    if (spec.startsWith('"') || spec.startsWith("'")) continue;
    const target = spec === 'Base' ? '.artifacts/toolchains/bend/bend2/base.bend'
      : relative(path.resolve(path.dirname(file), spec));
    assert.ok(spec === 'Base' || (spec.startsWith('./') || spec.startsWith('../')),
      `Nonlocal Bend import in selected bundle: ${spec}`);
    closure(target, found);
  }
  return found;
}

export function currentBinding(name) {
  const spec = moduleSpecs[name];
  assert.ok(spec, `Unknown Bend selected module: ${name}`);
  const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
  const compiler = path.join(root, '.artifacts/toolchains/bend');
  const head = execFileSync('git', ['-C', compiler, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['-C', compiler, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
  assert.equal(head, pin.bendCommit, 'Bend pin changed');
  assert.equal(dirty, '', 'Pinned compiler has tracked edits');
  const files = closure(spec.entry);
  // entry and exports above bind the selected spec; hashing this whole
  // registry would invalidate an unrelated (expensive) book whenever another
  // module is added. Its transitive source and emitter/loader remain bound.
  for (const item of ['bend2/TOOLCHAIN.json', 'bend2/tools/loader-v2.ts',
    'bend2/tools/emit-selected.ts',
    'bend2/tools/bend.mjs', '.artifacts/toolchains/bend/bend2/bend.ts',
    '.artifacts/toolchains/bend/bend2/comp.ts',
    '.artifacts/toolchains/bend/bend2/main.ts']) files.add(path.join(root, item));
  const effects = path.join(compiler, 'bend2/effs');
  for (const item of fs.readdirSync(effects).filter((x) => x.endsWith('.js')))
    files.add(path.join(effects, item));
  return { schema: 'rift-bend-selected-module/1', name, entry: spec.entry,
    exports: spec.exports, compilerCommit: pin.bendCommit, bunVersion: pin.bunVersion,
    sourceFiles: [...files].sort((a, b) => compare(relative(a), relative(b)))
      .map((file) => ({ path: relative(file), sha256: fileHash(file) })) };
}

export function assertCache(name) {
  const manifestPath = path.join(cacheDir, `${name}.manifest.json`);
  const outputPath = path.join(cacheDir, `${name}.js`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(manifest.binding, currentBinding(name), `Stale Bend ${name} module cache`);
  assert.equal(manifest.output.file, `${name}.js`, `Wrong Bend ${name} output name`);
  assert.equal(manifest.output.bytes, fs.statSync(outputPath).size, `Wrong Bend ${name} output size`);
  assert.equal(manifest.output.sha256, fileHash(outputPath), `Changed Bend ${name} output`);
  return { code: fs.readFileSync(outputPath, 'utf8'), manifest };
}
