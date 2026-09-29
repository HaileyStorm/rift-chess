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
checks only the helper. Apply this patch only after the shared `Args2032.bend`
file is present in the 2.0.32 candidate.

In a separate managed checkout at source commit `3080ad508fd73c1730a82c9393890cc199426918`, the reviewed NativeCLI patch and this five-consumer patch were applied to exactly their six entry files. The pinned 2.0.27 checkout, frozen Laws and main application sources stayed unchanged. Each entry passed `book_load`/`book_valid` through the exact derived 2.0.32 compiler, with zero holes and network fetches, under a 512-MiB Node old-generation heap cap:

| Entry | Loaded files | Definitions |
| --- | ---: | ---: |
| `NativeCLI.bend` | 17 | 1232 |
| `PlanProfile.bend` | 30 | 819 |
| `PlanReadback.bend` | 31 | 835 |
| `BoardSceneSpriteBench.bend` | 43 | 1375 |
| `DecodePageTest.bend` | 23 | 786 |
| `PieceRenderBench.bend` | 26 | 841 |

Reproduce one source check with
`node --max-old-space-size=512 bend2/toolchain-patches/native-cli-2032/consumers/test-entries-2032.mjs <absolute-isolated-checkout> <entry-path>`.
The test (SHA-256
`0b6839e4269869d10a48fe15e35b3b30f41ac27f0e969ff404752a8fbd74d17c`)
binds the source commit, exact six post-patch hashes, two patch files, all
tracked candidate Bend sources, derived compiler/Base bytes and Git states
before and after loading. It verifies each loaded source belongs to that
closure; [ENTRY_SOURCE_RECEIPT.json](ENTRY_SOURCE_RECEIPT.json) records the
six binding digests. This is not an executable, CLI argv scenario, GPU run,
frozen proof, pin amendment or release acceptance.

An independently reviewed [bounded C-emission probe](C_EMISSION_RECEIPT.json)
also passed for the patched NativeCLI entry. Run
`node bend2/toolchain-patches/native-cli-2032/consumers/test-c-emit-2032.mjs <absolute-isolated-checkout>`.
It repeats the exact source/closure gate before and after a 512-MiB
old-generation-capped child, which generated 2,189,927 UTF-8 C bytes in
memory (SHA-256
`373f735cd13c42b2a2f307646bfd08931c93e0fc599c362a12676ffdc4a77281`).
The emitted text contains no X11/ALSA include or GPU `BANGS` marker. No C
artifact or native binary was written, linked or run; this is not a CLI
argument, GUI, PCM, restart, GPU or release acceptance result.

The follow-on [C artifact export](C_ARTIFACT_RECEIPT.json) passed in a unique,
ignored Windows run directory. Reproduce with
`node bend2/toolchain-patches/native-cli-2032/consumers/export-c-2032.mjs <absolute-isolated-checkout>`;
the exporter source-gates before and after the bounded child, verifies the
exclusive 2,189,927-byte C file against the known digest, then atomically
publishes its no-overwrite manifest. The retained host-local run is
`.artifacts/bend2/native-cli-2032/run-juMYA0` (manifest SHA-256
`fa425944eb2d82c4de8c97a0d8e259ecbdf2ec54adec4cbd16f300e33584074f`).
A local Windows clang 21.1.8 syntax-only probe failed at the generated
POSIX `sys/mman.h` include, absent in that Windows toolchain. This does not
test Linux compilation and is not a native binary or argv receipt.
