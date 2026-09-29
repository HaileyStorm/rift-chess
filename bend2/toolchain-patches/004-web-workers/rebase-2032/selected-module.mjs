export function selectedModule(bend, compiler, book, roots) {
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new TypeError("at least one explicit worker export root is required");
  }
  if (new Set(roots).size !== roots.length) {
    throw new TypeError("worker export roots must be unique");
  }

  const io = book.tlds.IO;
  const typeBook = io?.$ === "Def"
    ? { ...book, tlds: Object.assign(Object.create(null), book.tlds,
      { IO: { ...io, v: null } }) }
    : book;
  for (const root of roots) {
    const def = book.tlds[root];
    const moduleHostable = book.order.includes(root)
      && def?.$ === "Def"
      && def.v !== null
      && def.b !== true
      && def.x === 0
      && def.i === undefined
      && compiler.io_base(book, def.T) === null;
    const returnsIO = def?.$ === "Def"
      && compiler.io_base(book, bend.tele_unbind(typeBook, def.T).ret) !== null;
    if (!moduleHostable || returnsIO) {
      throw new Error("worker export root is not hostable by Bend 2.0.32: " + root);
    }
  }
  rejectReachablePromises(bend, book, roots);

  // file_book starts from the module exports and recursively follows their
  // references, so projecting order selects an exact closure without mutating
  // the checked source book or exporting every hostable definition.
  return compiler.js_lib({ ...book, order: roots.slice() }, true);
}

function rejectReachablePromises(bend, book, roots) {
  const queue = roots.slice();
  const seen = new Set();
  while (queue.length > 0) {
    const key = queue.pop();
    if (seen.has(key)) continue;
    seen.add(key);
    const tld = book.tlds[key];
    if (tld === undefined) {
      throw new Error("worker source closure has unfilled_reachable: " + key);
    }
    if (tld.$ === "Def") {
      if (tld.u === true) {
        throw new Error("worker source closure has unsafe_reachable: " + key);
      }
      if (tld.i !== undefined) {
        throw new Error("worker source closure has foreign_reachable: " + key);
      }
      if (tld.v === null && tld.b !== true) {
        throw new Error("worker source closure has unfilled_reachable: " + key);
      }
    }

    const refs = new Set();
    for (const body of tld.$ === "ADT" ? tld.c : [tld]) {
      termRefs(bend.term_lower(body.T), refs);
    }
    termRefs(tld.$ === "Def" ? tld.e : undefined, refs);
    queue.push(...refs);
  }
}

function termRefs(term, out, seen = new WeakSet()) {
  if (typeof term !== "object" || term === null || seen.has(term)) return;
  seen.add(term);
  const { $, k } = term;
  if (($ === "Ref" || $ === "ADT") && typeof k === "string") out.add(k);
  for (const [field, value] of Object.entries(term)) {
    if (field !== "s") termRefs(value, out, seen);
  }
}
