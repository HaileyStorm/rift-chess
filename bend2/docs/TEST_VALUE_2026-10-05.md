# Active test consolidation: October 5

Scope: duplicate selected-cache and browser receipt tests. Frozen laws, production
verifiers, compatibility consumers and historical receipts remain authoritative
for their named obligations. This cleanup does not adopt any compiler candidate.

The v1 cache executable suite (342 lines) was removed. Its unique output traversal,
export order and five actual filesystem-link boundaries moved into the existing
v2 suite. Production `cache-set/verify.mjs` remains because v1 browser consumers
still import it. Both READMEs now name one active cache command:

```powershell
node bend2/toolchain-patches/2032/cache-set-v2/test.mjs
```

That command passed once on this Windows host in 70.804 seconds, rejecting 34
controls. Windows denied the output-file symlink fixture; it is an explicit skip,
not a proven boundary. Manifest junction, preview root, preview-root ancestor and
source-root ancestor controls executed. Retained coverage includes source/Git
provenance, compiler/EOL/patch/pin binding, stable imports, export shape/order,
traversal and exact output bytes. Synthetic fixtures do not prove authentic
current-source caches or browser execution. Cache cleanup is net 252 lines fewer
across the suite and its documentation.

The preview v2 suite no longer repeats direct receipt shape, pin, argument or raw
manifest-match controls owned by `browser-loader-v2/test.mjs`. The one distinct
output-byte substitution control moved to that owner. Preview tests retain the
packer integration, packaged-byte hashes, path/ancestry guards and offline service
worker checks. These two commands passed after consolidation:

```powershell
node bend2/toolchain-patches/2032/browser-loader-v2/test.mjs
node bend2/toolchain-patches/2032/browser-preview-v2/test.mjs
```

Single observed pair timings were 287.93ms before and 509.00ms after. They are
noisy observations and show no measured speedup. The benefit established here is
one owner per boundary, fewer active tests and removal of duplicate support.

Routine validation now selects the suite owning a changed boundary. Run the cache
suite for cache verifier/binding/path changes; run loader/preview tests for their
changed consumer seam. Do not rerun v1 or every historical compiler phase as an
additional routine gate. Keep actual browser/reference/offline, proof/verdict and
mutation, native/device and frozen Worker obligations separately. Source spelling
mirrors and obsolete phase fixtures are further pruning candidates, not removals
completed by this slice. No root TypeScript test was removed.
