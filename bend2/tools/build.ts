import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import plugin from './loader.ts';
import { root, verifyFreeze, digest } from './freeze.mjs';
import { verifyAttestation } from './attest.mjs';
import { verifyLibrary } from './verify-library.mjs';
import { verifyV2 } from './freeze-v2.mjs';

const draft = process.argv.includes('--draft');
const semantic = draft ? null : verifyFreeze();
const pixels = draft ? null : verifyFreeze('graphics');
if (!draft) verifyAttestation();
const library = verifyLibrary();
const rulesV2 = draft ? null : verifyV2();
const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal', '--', 'bend2'], { cwd: root, encoding: 'utf8' }).trim());
const out = path.join(root, 'bend2/dist');
fs.mkdirSync(out, { recursive: true });
const common = { outdir: out, target: 'browser' as const, format: 'esm' as const, naming: '[name]-[hash].[ext]', minify: true, sourcemap: 'external' as const, splitting: false };
const worker = await Bun.build({ ...common, entrypoints: [path.join(root, 'bend2/platform/browser/worker.ts')], plugins: [plugin] });
if (!worker.success) throw new Error(worker.logs.map(String).join('\n'));
const workerName = path.basename(worker.outputs.find(file => file.path.endsWith('.js'))!.path);
const main = await Bun.build({ ...common, entrypoints: [path.join(root, 'bend2/platform/browser/host.ts')], define: { __BEND_WORKER__: JSON.stringify(`./${workerName}`) } });
if (!main.success) throw new Error(main.logs.map(String).join('\n'));
const mainName = path.basename(main.outputs.find(file => file.path.endsWith('.js'))!.path);
const css = fs.readFileSync(path.join(root, 'bend2/platform/browser/platform.css'));
const cssName = `style-${digest(css).slice(0, 12)}.css`;
fs.writeFileSync(path.join(out, cssName), css);
fs.writeFileSync(path.join(out, 'index.html'), fs.readFileSync(path.join(root, 'bend2/platform/browser/index.html'), 'utf8')
  .replace('./main.js', `./${mainName}`).replace('./style.css', `./${cssName}`));
fs.copyFileSync(path.join(root, 'bend2/THIRD_PARTY_NOTICES.txt'), path.join(out, 'THIRD_PARTY_NOTICES.txt'));
fs.copyFileSync(path.join(root, 'bend2/licenses/Bend-Apache-2.0.txt'), path.join(out, 'Bend-Apache-2.0.txt'));
const files = Object.fromEntries(['index.html', mainName, workerName, cssName, 'THIRD_PARTY_NOTICES.txt', 'Bend-Apache-2.0.txt'].map((name) => [name, digest(fs.readFileSync(path.join(out, name)))]));
const version = digest(JSON.stringify(files)).slice(0, 20);
fs.writeFileSync(path.join(out, 'sw.js'), fs.readFileSync(path.join(root, 'bend2/platform/browser/sw.js'), 'utf8')
  .replace('__BEND_BUILD__', version).replace('__BEND_ASSETS__', JSON.stringify(['./', './build.json', ...Object.keys(files).map(file => `./${file}`)])));
files['sw.js'] = digest(fs.readFileSync(path.join(out, 'sw.js')));
fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify({ schema: 'rift-bend-browser/2', builtAt: new Date().toISOString(), version, sourceRevision, sourceDirty, draft,
  application: 'Bend-owned rules, UI, bitmap text, input policy, codec, replay, animation and PCM synthesis; browser IO transport only',
  semanticSha256: rulesV2?.sha256 ?? null, parentSemanticSha256: semantic?.sha256 ?? null,
  pixelSemanticSha256: pixels?.sha256 ?? null, graphicsManifestSha256: digest(fs.readFileSync(path.join(root,'bend2/lib/graphics/VERIFICATION.json'))),
  toolchain: JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'))), files }, null, 2) + '\n');
console.log(JSON.stringify({ out, draft, version, files: Object.keys(files), bytes: [...worker.outputs, ...main.outputs].reduce((sum, file) => sum + file.size, 0) }));
