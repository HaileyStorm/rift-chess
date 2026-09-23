// BEND-WINDOWS-PATH-1: bounded adapter for the pinned compiler, which splits
// imported file paths on '/'. Never patch the upstream checkout. Recheck/remove
// this adapter when changing the compiler pin; the ordinary CLI wrapper applies
// the same normalization. No compiler semantics or ownership checks are changed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Bend from '../../.artifacts/toolchains/bend/bend2/bend.ts';
import * as Comp from '../../.artifacts/toolchains/bend/bend2/comp.ts';
import type { BunPlugin } from 'bun';

export async function compileModule(input: string): Promise<string> {
  const file = path.resolve(input).replaceAll('\\', '/');
  const book = Bend.book_nil();
  const seen = new Map<string, string | null>();
  try {
    await Bend.book_load(book, file, '', seen);
    const laws = path.join(path.dirname(file), 'LAWS.bend');
    if (path.basename(file) === 'PROOF.bend' && fs.existsSync(laws) && !seen.has(fs.realpathSync(laws))) {
      throw new Error('PROOF.bend must import ./LAWS.bend');
    }
    Bend.book_valid(book);
    Comp.book_owned(book, Comp.SYNTH);
    if (book.hols + book.open > 0) throw new Error('Unfilled laws or TODOs in Bend module.');
    const outs = [...new Set(book.order)].filter((name) => {
      const def = book.tlds[name];
      return def.$ === 'Def' && def.v !== null && def.b !== true && def.x === 0
        && def.i === undefined && Comp.io_base(book, def.T) === null;
    });
    return Comp.js_lib(book, outs, outs);
  } catch (error) {
    if (error && typeof error === 'object' && '$' in error && error.$ === 'Err') {
      throw new Error(Bend.err_show(error as Bend.Err));
    }
    throw error;
  }
}

const plugin: BunPlugin = {
  name: 'rift-bend-pinned-windows-paths',
  setup(build) {
    build.onLoad({ filter: /\.bend$/ }, async ({ path: file }) => ({ contents: await compileModule(file), loader: 'js' }));
  },
};
export default plugin;
// Importing this file as a Bun preload enables the same adapter for tests.
if (typeof Bun !== 'undefined') Bun.plugin(plugin);

if (import.meta.main) {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: bun loader.ts file.bend [output.js]');
  const output = await compileModule(input);
  if (process.argv[3]) fs.writeFileSync(process.argv[3], output);
  else process.stdout.write(output);
}
