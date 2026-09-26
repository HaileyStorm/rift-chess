// Draft browser loader for three source-bound, separately compiled Bend books.
// The frozen v2 proof loader stays untouched. This path never compiles during
// a browser build: each cache must first pass emit-selected.ts in isolation.
import fs from 'node:fs';
import path from 'node:path';
import type * as Bend from '../../.artifacts/toolchains/bend/bend2/bend.ts';
import type { BunPlugin } from 'bun';
import { root, moduleSpecs, assertCache } from './selected-modules.mjs';

export function resolveBaseForeignImports(book: Bend.Book): void {
  const effects = path.join(root, '.artifacts/toolchains/bend/bend2/effs');
  for (const def of Object.values(book.tlds)) {
    if (def.$ !== 'Def' || def.b !== true || !def.i) continue;
    def.i = def.i.map((spec) => {
      const name = /^\.\/effs\/([A-Za-z0-9_-]+\.(?:c|js))$/.exec(spec)?.[1];
      if (!name) return spec;
      const file = path.join(effects, name);
      if (!fs.statSync(file, { throwIfNoEntry: false })?.isFile())
        throw new Error(`Pinned Base effect is missing: ${spec}`);
      return file.replaceAll('\\', '/');
    });
  }
}

function cachedModule(file: string): string {
  const entry = path.resolve(file);
  const match = Object.entries(moduleSpecs).find(([, spec]) =>
    path.join(root, spec.entry) === entry);
  if (!match) throw new Error(`Unexpected Bend module in v2 browser build: ${file}`);
  return assertCache(match[0]).code;
}

const plugin: BunPlugin = {
  name: 'rift-bend-v2-selected-entrypoints',
  setup(build) {
    build.onLoad({ filter: /\.bend$/ }, async ({ path: file }) =>
      ({ contents: cachedModule(file), loader: 'js' }));
  },
};
export default plugin;
