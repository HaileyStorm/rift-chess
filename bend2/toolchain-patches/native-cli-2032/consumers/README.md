# 2.0.32 non-NativeCLI argument consumers

`0001-consumer-args-2032.patch` adapts only the `main` argument boundary in
`PlanProfile`, `PlanReadback`, `PieceRenderBench`, `DecodePageTest`, and
`BoardSceneSpriteBench`. The original `with_args` behavior is preserved: the
first two require one route; the others retain their current asset/config
argument handling. The shared `Consumers2032.bend` rejects a missing or empty
program entry and passes every remaining item unchanged using the reviewed
`Args2032.strip_program` adapter.

Preflight pins the exact original source hashes, the adapter/helper/patch hashes,
the pristine 2.0.32 scout, and the unchanged canonical 2.0.27 pin. Because this
patch is deliberately zero-context, always run the hash-bound check before
applying it, then use `git apply --unidiff-zero` to apply it to a separate
2.0.32 application-source candidate. Preflight runs read-only
`git apply --check` and `git apply --numstat`; it does not alter the checkout:

```powershell
node bend2/toolchain-patches/native-cli-2032/consumers/preflight.mjs
node --max-old-space-size=512 bend2/toolchain-patches/native-cli-2032/consumers/test-source-2032.mjs
```

The preflight models the exact-one-drop cases and guards adapter source shape.
The separate bounded source test (`test-source-2032.mjs` SHA-256
`8f9999673b2de848038313f92450373a075b6ad049e20a8962fe4e89ba4d41c6`)
loaded Base, `Args2032` and the shared helper under the exact derived 2.0.32
compiler: 3 files/493 definitions, zero holes and zero network calls. This
checks only the helper; it does not typecheck any of the five patched entries
or execute native arguments. No consumer source, compiler, pin, frozen Law,
native binary, or GPU path was changed here. Apply this patch only after the
shared `Args2032.bend` file is present in the 2.0.32 candidate.
