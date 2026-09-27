// Candidate-only TypeScript interop bridge for the unchanged graphics test.
// It maps a direct test-supplied Coord to the imported Shapes namespace in
// Ring's separately compiled module; no pixel oracle or Bend source changes.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './loader-2028.ts';
import type { BunPlugin } from 'bun';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const target = path.join(root, 'bend2/lib/graphics/v2/tests/library.ts');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expectedSource = '22aa8df06f9d48be4294c5c7b8b5e45b8cfbe2af1f34c3d519636737abfee3a9';
const changes = [
  ["const ring = Ring.draw(BigInt(depth), size, coord(-2), coord(4),",
    "const ring = Ring.draw(BigInt(depth), size, importedCoord(-2), importedCoord(4),"],
  ["equal(Rounded.draw(BigInt(depth), size, coord(10), coord(2),\n    coord(2), coord(8),",
    "equal(Rounded.draw(BigInt(depth), size, importedCoord(10), importedCoord(2),\n    importedCoord(2), importedCoord(8),"],
  ["const stamped = Stamp.draw(3n,8,2n,4,coord(left),coord(top),sprite,0,base) as Image;",
    "const stamped = Stamp.draw(3n,8,2n,4,importedCoord(left),importedCoord(top),sprite,0,base) as Image;"],
] as const;
const plugin: BunPlugin = { name: 'rift-bend-2028-graphics-coord-bridge', setup(build) {
  build.onLoad({ filter: /[\\/]bend2[\\/]lib[\\/]graphics[\\/]v2[\\/]tests[\\/]library\.ts$/ },
    ({ path: file }) => {
      assert.equal(path.resolve(file), target);
      const source = fs.readFileSync(file, 'utf8');
      assert.equal(sha(source), expectedSource);
      const insertion = "const importedCoord = (n: number) => ({ ...coord(n), $: `Shapes.${n < 0 ? 'Neg' : 'Pos'}` });\n";
      const anchor = "const coord = (n: number) => n < 0 ? { $: 'Neg', magnitude: -n } : { $: 'Pos', value: n };\n";
      assert.equal(source.split(anchor).length, 2);
      let bridged = source.replace(anchor, anchor + insertion);
      for (const [from, to] of changes) {
        assert.equal(bridged.split(from).length, 2);
        bridged = bridged.replace(from, to);
      }
      return { contents: bridged, loader: 'ts' };
    });
} };
Bun.plugin(plugin);
