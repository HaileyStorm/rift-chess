// Draft successor to the frozen tools/loader.ts compiler API boundary.
// This is not selected by bend.mjs, the browser build, or a proof manifest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Bend from '../../../.artifacts/toolchains/bend/bend2/bend.ts';
import * as Comp from '../../../.artifacts/toolchains/bend/bend2/comp.ts';
import type { BunPlugin } from 'bun';

// Preserve the reviewed Base-only relocation and the PROOF sibling check.
export function resolveBaseForeignImports(book: Bend.Book): void {
  const effects = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
    '../../../.artifacts/toolchains/bend/bend2/effs');
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

export async function compileModule(input: string): Promise<string> {
  const file = path.resolve(input).replaceAll('\\', '/');
  const book = Bend.book_nil();
  const seen = new Map<string, string | null>();
  try {
    await Bend.book_load(book, file, '', seen);
    resolveBaseForeignImports(book);
    const laws = path.join(path.dirname(file), 'LAWS.bend');
    if (path.basename(file) === 'PROOF.bend' && fs.existsSync(laws) && !seen.has(fs.realpathSync(laws)))
      throw new Error('PROOF.bend must import ./LAWS.bend');
    Bend.book_valid(book);
    // Reaches the ownership/collision guard on 2.0.27 and the candidate API.
    Comp.js_lib(book, [], [], { internal: true });
    if (book.hols + book.open > 0) throw new Error('Unfilled laws or TODOs in Bend module.');
    const outs = [...new Set(book.order)].filter((name) => {
      const def = book.tlds[name];
      return def.$ === 'Def' && def.v !== null && def.b !== true && def.x === 0
        && def.i === undefined && Comp.io_base(book, def.T) === null;
    });
    return Comp.js_lib(book, outs, outs);
  } catch (error) {
    if (error && typeof error === 'object' && '$' in error && error.$ === 'Err')
      throw new Error(Bend.err_show(error as Bend.Err));
    throw error;
  }
}

const plugin: BunPlugin = {
  name: 'rift-bend-draft-v3-windows-paths',
  setup(build) {
    build.onLoad({ filter: /\.bend$/ }, async ({ path: file }) =>
      ({ contents: await compileModule(file), loader: 'js' }));
  },
};
export default plugin;
if (typeof Bun !== 'undefined') Bun.plugin(plugin);

if (import.meta.main) {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: bun loader.ts file.bend [output.js]');
  const output = await compileModule(input);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], output);
  else process.stdout.write(output);
}
