# Isolated Bend 2.0.32 carry-forward ledger

This directory tracks the owner's direct-2.0.32 migration preference. The
published application, clean canonical 2.0.27 pin, every frozen Law, and the
older versioned 2.0.27/2.0.28 patch receipts remain unchanged. The pristine
2.0.32 scout is commit `573002f01ec6c52416d44489543f69a9625facf8`.

| Order | Downstream item | 2.0.32 status |
| --- | --- | --- |
| 001 | [Arity diagnostics](../001-arity/rebase-2032/README.md) | Rebased; bounded FID rejection, CID constructor boundary and successful-byte comparison passed. Extreme CID overflow is unproved. |
| 002 | [Layout reporting](../002-layout/rebase-2032/README.md) | Rebased; exact layout, local-only direct denials and successful C/JS parity passed. Recursive import fence is combined with 005 below. |
| 005 | [Windows imports/identity](../005-windows-import-path/rebase-2032/README.md) | Rebased; native nested paths, recursive denial, identity/cycle, junction, package assembly including foreign parent JS, and synthetic cross-volume gates passed on Windows. |
| 004 | Web Worker backend | Not rebased yet; 2.0.32 removed the selected-root JS emitter interface, so the old patch/107-test receipt cannot transfer. |
| 006 | Alias equality | 2.0.32 already has the alias-shadow distinction; do not replay 2.0.28's corrective patch. Retain its historical receipt. |
| 003 | Join-capture boxing | Experimental and not in the reviewed main stack; no silent inclusion. |

Run `node bend2/toolchain-patches/2032/replay-001-002-005.mjs` to reconstruct
the exact first three patches from pristine source in owned OS temporary
storage and compare the final `bend.ts`, `comp.ts`, and `main.ts` bytes with the
derived candidate. The source-only replay passed on Windows after the 005
foreign-path review fix; final patch SHA-256 values are bound in that script.
The independent 005 review found and prompted that `pkg_files` fix. Run the
versioned 001, 002 and 005 tests separately for their bounded behavior gates.
No full compiler/worker matrix follows merely from this replay.

The [synthetic 2.0.32 checker](../../core/v3/2032/README.md) rejects distinct
TODO/unsafe/foreign and compiler-owned-name controls without BendTT. After
005, `probe-derived-worker.mjs ArithmeticProof.bend` passed source type and
promise screens on 7 loaded files/543 definitions, with three synthetic
negative controls and zero network attempts. The broader
`probe-derived-worker.mjs CHECK.bend` loaded but did not yield a type-check
verdict within a 120-second bound or the subsequent 300-second/64-MiB worker
bound. These are local source probes, not mathematical/BendTT proofs or the
six frozen-Law mutation suite. The 300-second bound terminated its owned
worker; no Law counterexample is inferred.

Still required before any pin amendment: finish and review 004 and compiler
adapters, resolve the full frozen proof closure and BendTT authority without
installing anything implicitly, run the complete mutation/conformance and
exact-candidate browser/native CPU/GUI/PCM/restart gates, review device/GPU
evidence, and follow the Local Bend Guide's separate reviewed amendment.
