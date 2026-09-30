# Bend 2.0.32 four-cache set verifier

`verifyCacheSet2032({ previewRoot, manifestPaths, sourceRoot })` is a read-only
consumer for four separately emitted 2.0.32 caches. Pass an explicit ignored
preview root and a keyed object with exactly `menu`, `controller`, `scene`, and
`chrome` manifest paths. Relative manifest paths are resolved from
`previewRoot`; absolute paths are accepted only when they remain inside it.
The function never searches for a latest run. `sourceRoot` defaults to this
repository and is injectable for tests.

The verifier checks the exact manifest schema and module entry/export order,
each binding digest and output byte count/hash, regular non-reparse paths,
canonical real paths for source/preview roots and their ancestors, and
descriptor-backed manifest/output reads checked against pre/post file identity,
current and source-6c module closure bytes, the original source commit/tree and
its ancestry, registry hash agreement, canonical pin, upstream id, compiler
EOL bytes, and exact 001→002→005→phase2-004 patch stack. A newer repository
HEAD is allowed when source 6c remains its ancestor and every bound tracked
source still matches the source-6c Git blob; current ignored compiler bytes
must still match the manifest. Unrelated newer edits do not select different
cache paths.

Success returns `{ modules, commonBinding, registrySha256 }`; each module has
the verified output `Buffer` as `bytes`, parsed `manifest`, original
`manifestBytes`, and `manifestSha256`. That digest lets the caller compare the
raw manifest against a trusted external receipt. The verifier embeds no
per-artifact Linux output or manifest digest, so a self-consistent synthetic
positive fixture does not establish authenticity of the reported Linux run.
This verifies cache-set consistency only. It does not build or render the app
and does not claim browser acceptance.

Run the provider-free synthetic positive and negative controls with:

```powershell
node bend2/toolchain-patches/2032/cache-set/test.mjs
```

The positive test is internal consistency only. Tests write only synthetic
outputs and manifests under a unique ignored temporary directory; they do not
snapshot or copy emitted cache artifacts, or mutate repository source files.
