# Bend 2.0.32 worker carry-forward: selected-root phase

This fixture is bound to the historical **pre-phase-two** derived compiler
bytes (001→002→005). The shared derived checkout now also contains the
phase-two parser/planner; rerunning this exact-hash gate there is expected to
fail its input guard. Its separate passing receipt remains provenance. Use
the [current-stack build-adapter gate](../../2032/build-adapter/README.md)
for selected export/ownership behavior and the phase-two/three gates for
their additional contracts; do not relabel the old fixture as a current run.

This is a bounded compatibility slice, not a rebase or acceptance of the full
004 Web Worker backend. It is based on pristine upstream `573002f01ec6c52416d44489543f69a9625facf8` with the exact ordered 001+002+005 source stack. The pre-004 compiler source hashes are recorded by
[`replay-001-002-005.mjs`](../../2032/replay-001-002-005.mjs): `bend.ts`
`2c3953bb4fcb12aa97d4ce8cd041ef0ce8324c724fd0adc9b0352fff4c0f5c09`,
`comp.ts` `0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7`,
and `main.ts` `e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae`.
The canonical 2.0.27 pin, frozen Laws, and historical 2.0.27/2.0.28 worker
receipts are unchanged.

## Selected module boundary

In 2.0.32, `Comp.js_lib(book, true)` chooses every hostable definition in
`book.order`; it no longer accepts separate roots and exports. Calling it on a
whole checked book is therefore not an acceptable worker export policy.
[`selected-module.mjs`](selected-module.mjs) validates explicit roots against
the 2.0.32 module filter (ordered, filled `Def`, non-Base, non-template,
non-foreign, non-IO), then passes a shallow Book copy whose `order` contains
only those roots. The existing `file_book` follows their transitive references,
so dependency closure is retained without adding unrelated exports or
mutating the checked book. There is no all-roots fallback. Before emission, a
partial negative screen follows checked type/body references and rejects
reachable `@unsafe`, foreign, and unfilled non-Base definitions. It follows the
same `term_lower`/reference-walk shape as the shared proof-authority check; it
does not claim full worker eligibility or a closed-safe-pure subset.

The exact 2.0.32 `io_base(book, def.T)` module filter only sees a directly
returned IO type; on a parameterized `Def`, `def.T` is still a telescope. The
adapter also checks the result after opening that telescope with the Base `IO`
body frozen, so a function returning `IO(A)` is refused. This is an additional
direct-result veto, not a complete host-safety boundary or a change to the
synchronous emitter.

## Bounded receipt

Historical reproduction only on a separate pre-phase-two 001→002→005
checkout (the current shared derived checkout intentionally fails its hash
guard). From that checkout, run with the local Bun runtime:

```powershell
& .artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe run bend2/toolchain-patches/004-web-workers/rebase-2032/test.mjs
```

The test checks a deterministic `worker_root` result both directly and in an
isolated Node worker thread, exact selected export keys and order, absence of an
unselected hostable function, stable emitted module bytes, rejection of empty,
duplicate, unknown, Base, IO, template, and foreign roots, unchanged source
book order, three distinct in-memory reachable-dependency mutations for unsafe,
foreign (with a pure signature), and unfilled defs, zero network calls, and the
ordinary synchronous-emitter raw-byte digest before and after selected emission.
On the recorded fixture and 2.0.32+001+002+005 preimage, the receipt was:

- Fixture SHA-256: `dac7bc132314f909bc25af27ade1b0f7a680a62bc39d8e4cea5aa4978f4a2415`.
- Adapter SHA-256: `1508c2620714fd0f96b531400510f1cf997671ec1a0dbc074a35484c24fc84c7`;
  test SHA-256: `484125a42f8355a43a0872db7a90bedfaa39c142036f3bca9283f5dac39e77a2`.
- `Comp.js_lib(book, false)` raw UTF-8 output SHA-256, recorded before the adapter: `efe64dca089a1922152144681e772e75c59807be07dc0ff892d2b3349a11a874`.
- Worker-thread result: `42`; network calls: `0`.

This does not parse `@`/`~` worker annotations, analyze F32/intrinsic
representation, higher-order calls, or require/never propagation, emit worker
coordinator/helper/runtime modules, or exercise a browser `Worker`. The promise
screen is only a negative filter: a passing root is not certified as
worker-eligible. The old 004 backend is coupled to 2.0.27/2.0.28's Carb compiler
graph, which 2.0.32 removed. Its 107 worker tests, 647-case differential,
browser module-worker gate, packaging checks, runtime policy matrix, and
performance receipts do not transfer. This phase only gives the next rebase an
explicit source-root/export boundary, a partial promise screen, and a no-op
synchronous output pin.
