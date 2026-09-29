# Bend 2.0.32 Web Worker phase two

This candidate ports source-call metadata and a static policy screen onto the
exact 2.0.32+001+002+005 stack. It is not a worker backend adoption: no worker
module, coordinator, runtime, browser dispatch, or performance behavior is
implemented here. Root owns patch generation and replay integration; these
changes exist in the ignored derived compiler plus this new phase directory.

## Parser and planner

References now preserve `web: "require" | "never"`, an optional positive safe
`@N` cap, and the existing native `!` bit. Suffixes are limited to contiguous,
named, saturated calls; `!@`/`!~` keep native marking distinct from worker
policy. Zero-argument suffixed calls are currently rejected because the static
planner represents calls through application spines, not bare refs.
`term_show`, inference, and term lowering retain that metadata. The
legacy rewrite binder `%name@proof` remains disambiguated from a worker call.

`Comp.plan_web_workers(book, roots)` requires explicit unique roots. It uses
the 2.0.32 `File` and `term_spine` analysis, traverses source references, and
returns a deterministic source-only plan. It fails closed for reachable
unsafe, foreign, unfilled, template, F32/intrinsic, and higher-order/dynamic
dependencies, and classifies callsite policies, caps, native marks,
require-under-never conflicts, and requirements of unsupported targets. This
is not a serialization-schema check or runtime policy proof; the field
`sourceEligible` is limited to these static checks and does not authorize
dispatch.

Policy graph expansion is bounded by a visited key of explicit root, function,
and normal/never state. The first deterministic witness path is retained; the
same definition is still analyzed separately under normal and never context.

## Local verification

Run from the repository root with the local Bun runtime:

```powershell
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/test.mjs
& .artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe run bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/test.mjs
```

The test reconstructs pristine 2.0.32 followed by the exact 001→002→005 patch
bytes in an OS temporary directory, verifies their base-source hashes, then
compares raw no-suffix JavaScript and C output byte-for-byte against that
pre-phase2 stack. It also checks post-planner output parity, parser metadata
through checking/lowering, eight malformed suffix cases, positive require and
cap classification, never classification, native `!@`, zero-argument rejection,
nested require-under-never and require-unsupported controls, and unsafe/foreign/
unfilled/F32/intrinsic/higher-order negatives. No BendTT/proof suite or network
provider is used; the fetch trap recorded zero calls.

The 12-diamond fixture contains 72 syntactic call records but only two distinct
required leaf callsites. Planning retained exactly two requirement records and
completed in 21.3 ms in the recorded run rather than revisiting diamond paths.
A separate mixed normal/`never` diamond reaches one shared required leaf in
both contexts: it retains one normal requirement and one
`require_under_never` conflict with distinct witness paths. The zero-argument
suffix is rejected at parse time until bare-Ref callsites can be represented.

Observed raw no-suffix output hashes:

- JavaScript: `efe64dca089a1922152144681e772e75c59807be07dc0ff892d2b3349a11a874`.
- C: `9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009`.
- Policy fixture: `9204db93874b8c2a59ccae988211298e29d7c21945c06bae8452d6addafe9a6d`.
- 12-diamond fixture: `72c9f962945e6af9bdf61ccf20a5ad774df5c54063dd9358f26a18ccf536671f`.
- Mixed diamond fixture: `e03d04963c1e26ea67dc524cd17a28883abf26baa2afdbcef14d10f775c19763`.
- Focused test source: `6c0382f63874016ed20cc8a35f8172caa976dc186bcf1cd662930f990f59e264`.
- Phase-two compiler patch: `bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13`.

Phase-two derived source hashes after this test:

- `bend2/bend.ts`: `2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88`.
- `bend2/comp.ts`: `4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1`.
- `bend2/main.ts`: unchanged at `e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae`.

The exact patch replays atop pristine 001→002→005 in the focused test and
matches all three derived source files byte-for-byte. The old 107 worker
tests, 647-case differential, browser module-worker gate,
packaging, full frozen-proof/native/GPU acceptance, and historical 2.0.27/
2.0.28 receipts do not transfer. Independent review cleared the zero-arity and
diamond findings for this source-only planner, not runtime eligibility.
