import assert from 'node:assert/strict';
import { loadWithStableImports } from '../2032/tag-identity/preload-root.mjs';

// The caller selects and fences the compiler, runtime, complete source closure
// and resources. The Event-compatible overlay remains its selected entry;
// this helper does not patch source or write output.
export async function emitNativeC2035({ Bend, Comp, entry, projectBendRoot }) {
  const book = Bend.book_nil();
  const loaded = await loadWithStableImports(Bend, book, entry, projectBendRoot);
  Bend.book_valid(book, 0);
  assert.equal(book.hols, 0, 'Native C emission requires zero holes');
  assert.equal(book.tlds.main?.$, 'Def', 'Native C emission requires main');

  // Current35 compile_book enforces compiler-owned names and constructor/foreign
  // collisions through file_book on the actual main and runtime roots.
  const source = Comp.compile_book(book);
  assert.equal(typeof source, 'string');
  assert.ok(source.length > 0, 'Native C emission returned empty source');
  return {
    source,
    validation: { wholeBookValid: true, holes: book.hols, definitions: book.order.length },
    loaded: [...loaded.seen].map(([path, namespace]) => ({ path, namespace })),
    preloaded: loaded.preloaded,
  };
}
