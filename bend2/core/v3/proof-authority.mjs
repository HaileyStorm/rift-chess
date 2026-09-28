// Draft next-version proof authority over unchanged frozen v2 source terms.
// This module does not amend or replace core/v2/node-check.mjs. A canonical
// compiler pin, full aggregate receipt, mutation suite and review are still
// required before this can become an accepted proof gate.
import assert from 'node:assert/strict';

export function proofUses(Bend, book, own) {
  const uses = Object.create(null), visited = new Set();
  function refs(term, out) {
    if (typeof term !== 'object' || term === null) return;
    if ((term.$ === 'Ref' || term.$ === 'ADT') && term.k !== undefined) out.add(term.k);
    for (const [field, value] of Object.entries(term)) if (field !== 's') refs(value, out);
  }
  for (const queue = own.slice(); queue.length;) {
    const key = queue.pop(), term = book.tlds[key];
    if (!term || visited.has(key)) continue;
    visited.add(key);
    const names = new Set();
    for (const body of term.$ === 'ADT' ? term.c : [term]) refs(Bend.term_lower(body.T), names);
    refs(term.$ === 'Def' ? term.e : undefined, names);
    for (const ref of names) { (uses[ref] ??= []).push(key); queue.push(ref); }
  }
  return uses;
}

export function proofVerdict(Bend, book, graph = null) {
  const holes = book.hols + book.open;
  if (holes) throw Error(`${holes} TODO/open proof holes`);
  const own = [...new Set(book.order.filter(key => book.tlds[key]?.b !== true))];
  const unsafe = new Set(Object.keys(book.tlds).filter(key => book.tlds[key].u === true));
  const foreign = new Set(Object.keys(book.tlds).filter(key => {
    const term = book.tlds[key];
    return term.i !== undefined && term.b !== true;
  }));
  const uses = unsafe.size || foreign.size ? graph ?? proofUses(Bend, book, own) : null;
  function tainted(starters) {
    for (const key of starters) uses[key]?.forEach(caller => starters.add(caller));
    return own.filter(key => starters.has(key));
  }
  if (unsafe.size) {
    const bad = tainted(unsafe);
    if (bad.length) throw Error(`Proof depends on unsafe code: ${bad.join(', ')}`);
  }
  if (foreign.size) {
    const bad = tainted(foreign);
    if (bad.length) throw Error(`Proof depends on foreign code: ${bad.join(', ')}`);
  }
  return { holes, tainted: 0, own };
}

export function proofNegativeControls(Bend, book) {
  const { own } = proofVerdict(Bend, book);
  const uses = proofUses(Bend, book, own), ownSet = new Set(own);
  const marked = own.find(key => book.tlds[key]?.$ === 'Def' &&
    book.tlds[key].i === undefined && book.tlds[key].u !== true &&
    uses[key]?.some(caller => caller !== key && ownSet.has(caller)));
  if (!marked) throw Error('No reachable non-Base def for proof authority mutations');
  const caller = uses[marked].find(key => key !== marked && ownSet.has(key));
  const original = book.tlds[marked], originalHoles = book.hols;
  try {
    book.hols = originalHoles + 1;
    assert.throws(() => proofVerdict(Bend, book, uses),
      /1 TODO\/open proof holes/, 'TODO mutation was not specifically rejected');
    book.hols = originalHoles;
    book.tlds[marked] = { ...original, u: true };
    assert.throws(() => proofVerdict(Bend, book, uses),
      error => error.message.startsWith('Proof depends on unsafe code: ') &&
        error.message.split(': ')[1].split(', ').includes(caller),
      'reachable unsafe mutation was not rejected');
    book.tlds[marked] = { ...original, i: ['synthetic-host'] };
    assert.throws(() => proofVerdict(Bend, book, uses),
      error => error.message.startsWith('Proof depends on foreign code: ') &&
        error.message.split(': ')[1].split(', ').includes(caller),
      'reachable foreign mutation was not rejected');
  } finally {
    book.hols = originalHoles;
    book.tlds[marked] = original;
  }
  proofVerdict(Bend, book);
  return { todo: true, reachableUnsafe: true, reachableForeign: true,
    marked, caller };
}
