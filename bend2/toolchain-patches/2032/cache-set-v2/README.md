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

The test command is:

~~~powershell
node bend2/toolchain-patches/2032/cache-set-v2/test.mjs
~~~

Tests create synthetic schema-shaped bytes solely as tamper substrates and
assert rejection after changing one property at a time. They do not run the
emitter, certify a positive cache set, or establish output authenticity. A
manifest's output digest is self-described; trusted artifact authenticity still
needs externally pinned receipts or equivalent independent evidence.

## Consumer seam and retained v1 history

This candidate is not a real-cache-accepted production path. The existing v1
verifier, receipts, and consumer imports remain untouched. In particular,
browser-loader/bundle-real.mjs and browser-preview/pack-static.mjs still call
cache-set/verify.mjs. Separately versioned browser-loader-v2 and
browser-preview-v2 candidates now call this verifier but remain unarmed until
independently reviewed cache and bundle receipts exist.

A future active consumer migration can use the versioned candidates while
keeping the verified { modules, commonBinding, registrySha256 } result shape.
Do that only after a real four-cache emission at one source commit,
successful v2 verification of those exact manifests, and a separately
reviewed consumer migration. Retain v1 until its consumers and
evidence references have been migrated and the v2 path has independent real-
cache evidence; do not delete historical v1 receipts or provenance to make the
candidate appear authoritative.

The actual four-cache integration, worker/codegen, static packaging, and browser
acceptance were not run for this candidate.

