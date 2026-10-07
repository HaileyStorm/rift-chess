// Candidate-only menu export; the shared frozen registry stays byte-identical.
import assert from 'node:assert/strict';
import path from 'node:path';
import { root, selectedBinding2035, readSource, sha256 } from '../../../../../toolchain-patches/2035/selected-binding.mjs';
export { root, readSource, sha256 };
const directory = 'bend2/core/v3/2035/bendtt-gate/application/';
export function menuApplicationBinding2035() {
  const base = selectedBinding2035('menu');
  assert.deepEqual(base.module.exports, ['font_path', 'font_byte_cap', 'load_font', 'play',
    'same_base', 'base_chrome', 'same_static', 'controls_chrome', 'dynamic_chrome', 'compose', 'render']);
  const sources = ['menu-binding.mjs', 'emit-menu.mjs'].map(name => {
    const file = directory + name;
    return { path: file, sha256: sha256(readSource(path.join(root, file))) };
  });
  return { ...base, schema: 'rift-bend-2035-menu-application-binding/1',
    module: { ...base.module, exports: [...base.module.exports, 'render_on_base'] },
    sourceFiles: [...base.sourceFiles, ...sources].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
    application: { schema: 'rift-bend-2035-menu-application-spec/1', additionalExport: 'render_on_base',
      sharedRegistryChanged: false, scope: 'Isolated candidate renderer export; no frozen dependency, proof or adoption amendment' } };
}
