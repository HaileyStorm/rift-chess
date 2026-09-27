// Read-only diagnostic of the candidate controller's emitted constructor ABI.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Bend from '../../../.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2/bend.ts';
import * as Comp from '../../../.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2/comp.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
process.env.BEND_NO_TELEMETRY = '1';
process.env.BEND_HUB = 'http://127.0.0.1:9';
globalThis.fetch = async () => { throw Error('Controller ABI probe forbids remote fetch'); };
const book = Bend.book_nil();
await Bend.book_load(book, path.join(root, 'bend2/ApplicationControl.bend').replaceAll('\\', '/'), '', new Map());
Bend.book_valid(book);
const code = Comp.js_lib(book, ['boot_reads', 'dispatch_at_web'], ['boot_reads', 'dispatch_at_web']);
console.log(JSON.stringify({
  activateKeys: Object.keys(book.ctrs).filter(name => name.includes('Activate')).slice(0, 20),
  generated: [...code.matchAll(/.{0,72}Activate.{0,72}/g)].slice(0, 12).map(match => match[0]),
}));
