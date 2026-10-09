import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepare as prepareCompiler, root, sha} from '../prepare-current.mjs';
export {root, sha};
export const derived = path.join(root, '.artifacts/bend2/toolchain-patches/workers-2035-cli-r2');
const here = path.dirname(fileURLToPath(import.meta.url));
const historical = path.join(root, '.artifacts/bend2/toolchain-patches/workers-stage2-20260925/bend2/main.ts');
const text = p => fs.readFileSync(p, 'utf8').replaceAll('\r\n', '\n');
function once(s, before, after) {
  assert.equal(s.split(before).length, 2, 'CLI anchor changed: ' + before.slice(0, 100));
  return s.replace(before, after);
}
function section(s, begin, end) {
  assert.equal(s.split(begin).length, 2, 'CLI section start changed');
  const a = s.indexOf(begin), b = s.indexOf(end, a + begin.length);
  assert.ok(b > a, 'CLI section end changed');
  return s.slice(a, b);
}

export function prepare({materialize = false} = {}) {
  const parent = prepareCompiler();
  const parentDir = path.join(parent.derived, 'bend2');
  let main = text(path.join(parentDir, 'main.ts'));
  assert.equal(sha(main), 'd1a3e026f5014f8daec3614df8e39cf261e3fbc47769eb0916fd891bc18703c9');
  const old = text(historical);
  assert.equal(sha(old), '8fb8321fea13695978eae57d3a58c28fd6a3989125a79d9508fb4fea3d666b17');
  main = once(main, 'import * as Safe from "./safe.ts";',
    'import * as Safe from "./safe.ts";\nimport {workerStage, publishWorkerStage, writeWorkerFiles as write_worker_files} from "./worker_output.ts";\nexport {write_worker_files};');
  main = once(main, '  ["bend <page.html> -o <dir>", "bundle a page that imports .bend files"],',
    '  ["bend <page.html> -o <dir>", "bundle a page that imports .bend files"],\n'
    + '  ["bend <file.bend> --web-workers[=auto|required-only|off] --web-exports=<names> -o <dir>", "emit a static worker library"],\n'
    + '  ["bend <page.html> --web-library=<file.bend> --web-exports=<names> -o <dir>", "bundle a page with an explicit static worker library"],');
  const states = section(old, '  let web: Comp.WebWorkerOptions["mode"] | undefined;', '  for (let i = 0; i < args.length; i += 1) {');
  main = once(main, '  let named: string | undefined;\n', '  let named: string | undefined;\n' + states);
  const flags = section(old, '    } else if (a === "--web-workers"', '    } else if (a === "--check-only") {');
  main = once(main, '    } else if (a === "--check-only") {', flags + '    } else if (a === "--check-only") {');
  let routes = section(old, '  if (webPolicy !== undefined && web === undefined', '  if (file.endsWith(".html")) {\n    if (web !== undefined');
  routes = routes.replaceAll('only || explain ||', 'only || verdict ||')
    .replaceAll('(stage-two downstream backend)', '(isolated 2.0.35 downstream backend)');
  main = once(main, '  if (file.endsWith(".html")) {\n', routes + '  if (file.endsWith(".html")) {\n');
  const bundleType = section(old, 'type HtmlWorkerBundle = {', 'async function cli_bundle(page: string, dir: string,');
  main = once(main, 'async function cli_bundle(page: string, dir: string): Promise<void> {',
    bundleType + 'async function cli_bundle(page: string, dir: string, workerBundle?: HtmlWorkerBundle): Promise<void> {\n'
    + '  if (workerBundle !== undefined) return cli_bundle_with_workers(page, dir, workerBundle);');
  let html = section(old, 'async function cli_bundle_with_workers(page: string, directory: string,', '\nfunction book_seed(base: Bend.Book)');
  const pre = section(html, '  const target = path.resolve(directory);', '  let published = false;');
  html = once(html, pre, '  const {target, stage} = workerStage(directory);\n');
  const publish = section(html, '    // Recheck the publication target', '\n    for (const output of outputRows)');
  html = once(html, publish, '    publishWorkerStage(stage, target);\n    published = true;\n');
  html = once(html, '      fs.rmSync(stage, { recursive: true, force: true });',
    '      cli_say(2, "workers: failed HTML stage retained at " + stage + "\\n");');
  const helpers = `
export async function load_worker_js(file: string, roots: string[],
  options: Comp.WebWorkerOptions = {}): Promise<Comp.WebWorkerBuild> {
  // Current book_read performs validity, TODO refusal and current namespace work.
  const book = await book_read(file);
  return Comp.js_worker_lib(book, roots, options);
}
`;
  main = once(main, '// Load\n// ====\n', helpers + '\n' + html + '\n// Load\n// ====\n');
  const inventory = new Map();
  for (const [name, digest] of Object.entries(parent.hashes)) {
    const bytes = fs.readFileSync(path.join(parentDir, name));
    assert.equal(sha(bytes), digest);
    inventory.set(name, name === 'main.ts' ? Buffer.from(main) : bytes);
  }
  inventory.set('worker_output.ts', fs.readFileSync(path.join(here, 'output.ts')));
  assert.equal(inventory.size, 99);
  if (materialize && !fs.existsSync(path.join(derived, 'bend2'))) {
    assert.equal(fs.realpathSync(path.dirname(derived)), path.dirname(derived));
    if (fs.existsSync(derived)) {
      assert.equal(fs.realpathSync(derived), derived);
      assert.deepEqual(fs.readdirSync(derived), ['.working'], 'unpopulated CLI scope contains unknown inputs');
      const claim = fs.lstatSync(path.join(derived, '.working'));
      assert.ok(claim.isFile() && !claim.isSymbolicLink(), 'CLI sentinel is redirected');
    }
    for (const [name, bytes] of inventory) {
      const p = path.join(derived, 'bend2', name);
      fs.mkdirSync(path.dirname(p), {recursive: true});
      fs.writeFileSync(p, bytes, {flag: 'wx'});
    }
  }
  if (fs.existsSync(derived)) {
    const actual = new Map();
    function walk(dir, prefix = '') {
      assert.equal(fs.realpathSync(dir), dir, 'CLI candidate directory redirected');
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, entry.name);
        assert.ok(!entry.isSymbolicLink());
        assert.equal(fs.realpathSync(p), p);
        if (entry.isDirectory()) walk(p, prefix + entry.name + '/');
        else { assert.ok(entry.isFile()); actual.set(prefix + entry.name, fs.readFileSync(p)); }
      }
    }
    walk(path.join(derived, 'bend2'));
    assert.deepEqual([...actual.keys()].sort(), [...inventory.keys()].sort());
    for (const [name, bytes] of inventory) assert.deepEqual(actual.get(name), bytes, 'CLI candidate drift: ' + name);
  }
  return {derived, hashes: Object.fromEntries([...inventory].map(([name, bytes]) => [name, sha(bytes)])),
    lineage: {revision: 'rift-worker-cli/2035-2', parent: parent.lineage,
      parentCompiler: parent.hashes, historicalMainSHA256: sha(old), changedFiles: ['main.ts'], addedFiles: ['worker_output.ts'],
      implementation: Object.fromEntries(['prepare.mjs', 'output.ts'].map(name => [
        path.relative(root, path.join(here, name)).replaceAll('\\', '/'), sha(fs.readFileSync(path.join(here, name)))]))}};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(x => x === '--materialize'));
  console.log(JSON.stringify(prepare({materialize: process.argv.includes('--materialize')})));
}
