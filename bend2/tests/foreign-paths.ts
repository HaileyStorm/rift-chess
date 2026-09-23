import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveBaseForeignImports } from '../tools/loader.ts';

const base = { $: 'Def', b: true, i: ['./effs/print.c', './effs/print.js', './effs/chan.js'] };
const project = { $: 'Def', b: false, i: ['./effs/print.js'] };
const other = { $: 'Def', i: ['./effs/print.js'] };
const absolute = { $: 'Def', b: true, i: ['C:/already-resolved/effect.js'] };
resolveBaseForeignImports({ tlds: { base, project, other, absolute } } as any);

for (const spec of base.i) {
  assert.ok(path.isAbsolute(spec), `Base effect is absolute: ${spec}`);
  assert.ok(fs.statSync(spec).isFile(), `Base effect exists: ${spec}`);
  assert.ok(spec.replaceAll('\\', '/').includes('/.artifacts/toolchains/bend/bend2/effs/'));
}
assert.deepEqual(project.i, ['./effs/print.js'], 'project import cannot be redirected to Base');
assert.deepEqual(other.i, ['./effs/print.js'], 'an unmarked definition cannot be redirected');
assert.deepEqual(absolute.i, ['C:/already-resolved/effect.js'], 'other Base paths remain untouched');
assert.throws(() => resolveBaseForeignImports({ tlds: {
  missing: { $: 'Def', b: true, i: ['./effs/does_not_exist.js'] },
} } as any), /Pinned Base effect is missing/, 'pin drift fails closed');
console.log('foreign-paths: pinned Base C/JS twins resolve; project collision, unmarked and unrelated paths stay intact; missing Base effect fails');
