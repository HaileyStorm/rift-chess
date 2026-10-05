# 2.0.32 selected-cache verifier candidate

The function verifyCacheSet2032V2({ previewRoot, manifestPaths, sourceRoot })
is a read-only candidate for an explicit four-member menu, controller, scene,
and chrome cache set. It preserves the v1 verifier's path, descriptor-read,
manifest, source-closure, compiler EOL, canonical pin, and reviewed patch-stack
checks, while requiring the 2.0.32 manifest schema
rift-bend-selected-cache/2032-2.

The source-policy floor is commit
03469c025ea6429cde5bab9c61b0ee304acd57be (tree
d881f9c09f7f9be20e4d6652c0a1e881f873972b), which introduced stable selected
imports and the current 2.0.32 emitter binding. A cache source commit must be a
descendant of that policy commit and an ancestor of the current checkout. Its
recorded tree must match Git, all four caches must use the same source commit
and tree, and the complete tracked input closure must match that cache commit.
This permits later unrelated repository commits without silently mixing module
sources.

The v2 binding and manifest must both name
stable-imports-empty-root/1. The verifier derives each selected entry's direct
imports with the bound preload helper and requires exact (path, namespace)
pairs, an empty root namespace, and the exact loaded Bend-file count. That
helper is also required in the source closure.

Output bytes are descriptor-read with the inherited identity checks, then
checked against the manifest length and SHA-256. A fatal UTF-8 decode and
byte-for-byte re-encode reject malformed or substituted text. A syntax-only
vm.Script compile validates the emitted module after replacing the final
export default token with a CommonJS assignment; it never evaluates cache code.
The final export object must contain exactly one complete selected-root
property per line in the configured order; same-line extra/duplicate
properties or appended expressions are rejected.

The single active cache-set test command is:

~~~powershell
node bend2/toolchain-patches/2032/cache-set-v2/test.mjs
~~~

Tests create synthetic schema-shaped bytes solely as tamper substrates and
assert rejection after changing one property at a time. The suite retains v1's
distinct output-traversal, export-order and actual filesystem-link controls
for manifest/output paths, previewRoot, and previewRoot/sourceRoot ancestors.
All fixtures and links stay within unique ignored synthetic directories with
checked cleanup. OS-denied link creation is reported separately as a skip.
They do not run the
emitter, certify a positive cache set, or establish output authenticity. A
manifest's output digest is self-described; trusted artifact authenticity still
needs externally pinned receipts or equivalent independent evidence. A reviewed
Linux four-cache readback is now pinned in browser-loader-v2/receipts; the
real verifier ran on those exact host-local outputs in the
[Linux bundle result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5929482307).
Its historical 28 synthetic tamper controls also passed after a bounded shallow-history
recovery. This source-only/CPU result does not prove a rendered browser app.

## Consumer seam and retained v1 history

This candidate has real-cache evidence for the older `41e48d9` source, but is
not an accepted production browser path. The existing v1
verifier, receipts, and consumer imports remain untouched. The superseded v1
executable suite and its unused fixture support were removed after the
consolidated v2 suite passed; this is test consolidation only. In particular,
browser-loader/bundle-real.mjs and browser-preview/pack-static.mjs still call
cache-set/verify.mjs. Separately versioned browser-loader-v2 and
browser-preview-v2 candidates now call this verifier. The four-cache receipt
pin is armed; one real v2 verifier and Worker/helper bundle passed on Linux.
The complete manifest was independently reviewed and an isolated exact-source
pre-height branch arms its Worker-bundle pin. This later visual-source branch
keeps its own pin unarmed; the older caches cannot verify its changed Bend
files. The isolated branch's first static invocation stopped before the
packer on an unset Linux `BUN_BIN`; no static or browser run passed.

A future active consumer migration can use the versioned candidates while
keeping the verified { modules, commonBinding, registrySha256 } result shape.
Single-commit emission and exact real-cache verification now hold only for the
older cache source; a separately reviewed consumer migration and fresh
selected caches for the later
height-only BoardScene and rift-pick source remain. Retain v1 until its consumers and
evidence references have been migrated and the v2 path has rendered real-
browser evidence; do not delete historical v1 receipts or provenance to make
the candidate appear authoritative.

The actual four-cache integration and Worker codegen passed on Linux at the
older source. Static packaging and browser acceptance were not run.

