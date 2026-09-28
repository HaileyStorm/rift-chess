# Draft Bun loader migration

`loader.ts` is a staged successor to the frozen `bend2/tools/loader.ts`, which
still calls the removed `Comp.book_owned(book, Comp.SYNTH)` API. The historical
loader is a semantic-v2 proof input, preserved at its amendment-004 SHA-256
`478081ea8be6e4c55948ddec523cc17cd39a006a47926bab5653d6cabd88fe93`.
Neither the ordinary `bend.mjs --run` path nor the production browser build
selects this draft. The v2-preview browser uses its separate selected-module
cache loader.

This copy keeps Base-only foreign-effect relocation, the mandatory sibling
`LAWS.bend` import for `PROOF.bend`, whole-book validation, TODO rejection,
selected exports and Bun plugin shape. It replaces only the removed ownership
call with an empty selected `Comp.js_lib(book, [], [], { internal: true })`
guard. Its static compiler import still points to the clean canonical 2.0.27
pin; no candidate compiler can be relabeled as a production pin through this
file.

`node bend2/toolchain-patches/loader-v3/test-loader.mjs` binds the clean pinned
compiler and Bun 1.4.2, the historical loader bytes, and a two-file local
Bend fixture. Direct old/new Bun execution emitted byte-identical selected JS:
2,819 bytes, SHA-256
`513b6f64176e983a3ec1c579a2aad5dd0c6f7449deeb5a4f1ce455af7e0077ef`.
Both rejected a locally generated `PROOF.bend` that omitted its sibling Law.
The staged loader SHA-256 is
`9d5077d46b34b8c49f7d58b0a87f3cbd94e08afc623fe8abab5ce76b337a03fe`.
The ignored comparison outputs and negative fixtures are under unique
`.artifacts/bend2/loader-v3-*/` directories on this Windows host.
The direct draft CLI does not independently enforce the clean pin; the test
does so before loading it. Production adoption must keep that guard in its
own wrapper or entry point.

This is pinned-2.0.27 parity for a small fixture, not a 2.0.28 execution,
full `--run`/browser regression, v3 proof freeze, native result or reviewed
toolchain amendment. The separate isolated `006-alias-equality/loader-2028.ts`
is a candidate-only conformance adapter, not a drop-in replacement: it lacks
this explicit empty emit and the sibling-Law check. Promotion needs a
source-bound candidate gate plus the guide's independent review, five receipts,
pin amendment, freeze and real browser/native checks.

## Isolated 2.0.28+006 loader seam

`node --max-old-space-size=768 bend2/toolchain-patches/loader-v3/test-loader-2028.mjs`
is a small candidate-only diagnostic. It first runs the reviewed replay and
frozen-v2-closure preflight against the exact 95-file final compiler snapshot,
then substitutes only three compiler/effect import paths into an ignored
temporary copy of the SHA-bound staged loader. The clean 2.0.27 pin and the
production loader are not selected or mutated. The test recompiles the
source-bound indented-import fixture, pins the candidate's 3,100-byte JS at
SHA-256 `8d427b379dae84f2bb53c373d969a90e44846912989c014af3f2062505636afb`,
executes both selected exports (each returns 1), rejects a `PROOF.bend` that
omits its sibling `LAWS.bend`, accepts an explicit sibling import, and rechecks
the imported fixture helper, reviewed preflight script and replay/snapshot
binding after
the test. The candidate adds an unused effect registry and escapes the
imported hyphen in a local JS symbol, so its bytes deliberately differ from
the pinned 2.0.27 fixture despite matching these tiny observable results.

This closes a narrow candidate-loader seam, not the full application loader
integration, aggregate frozen proof, browser/native regression, five-receipt
amendment or canonical pin. It requires the exact host-local ignored replay
and snapshot and does not create a portable proof artifact on its own. This
fixture enters the ownership guard on valid input; the separate
`proof-guard-2028.test.mjs` checks reserved-name and foreign-constructor
rejection on the same source-bound snapshot and remains a promotion gate.
