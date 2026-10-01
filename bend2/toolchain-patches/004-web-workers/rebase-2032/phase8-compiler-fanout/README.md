# Bend 2.0.32 phase 8: compiler-emitted bounded sibling fan-out

Phase 7 established the bounded required-Worker pool and source-slot result
ordering, but its compiler still rejected multiple direct required calls in one
parallel let. This phase adds an isolated derived-compiler patch that lowers one
narrow, checked parallel-let shape into that exact pool runtime. It is not an
upstream compiler edit, does not move the canonical 2.0.27 pin, and is not a
game integration or release claim.

## Supported shape

`Comp.js_required_fanout_lib(book, caller)` requires a validated book and one
pure first-order `U32 -> U32` caller. Across that caller's complete source body,
all required calls must appear directly in the same parallel let. That let must
contain at least two direct required calls with the same explicit `@N` cap, plus
at least one direct `never` sibling; every result slot must be `U32`. Required
helpers are closed, pure, call-free, first-order U32 leaves with one or two U32
arguments. The bounded slice accepts at most 128 sibling slots and cap values
1..1024. The caller cannot be self- or mutually-recursive (including a
terminating non-tail recursive call), because its lowered worker dispatch makes
the caller asynchronous and existing synchronous recursive calls cannot await
it safely. Generated region IDs and helper IDs are checked at source time
against the exact 128-character contract enforced by the phase-7 runtime.

Unsupported or ambiguous shapes fail before emission: mixed or missing caps,
sequential/separate required calls, nested or extra requirements, an automatic
sibling in the fan-out let, a non-U32 local sibling, a helper outside the closed
U32 subset, native-marked required calls, recursive callers, over-limit IDs,
and unsupported dependencies. The emitter also throws if a validated direct
required region no longer matches at code-generation time; it does not fall
back to running required helpers locally.

The accepted source shape is deliberately source-local and explicit:

```python
def fanout(a: U32) -> U32:
  left right repeated local = left_leaf@2(a, 2) right_leaf@2(40, 2) left_leaf@2(7, 2) local_leaf~(40, 2)
  preserve(left, right, repeated, local)
```

Here `@2` limits the distinct participating Worker IDs for this region, not
the number of jobs or distinct helper names. Three required jobs may therefore
queue through two Workers, as the witness below demonstrates.

The emitted `program.mjs` references the exact reviewed phase-7 `pool.mjs`
runtime by filename, protocol, and SHA-256
`1ff820b742b263513d977e06e0aa06cb9b4bd59dbf7d70e0c6a79c6d9bacb37c`. It also
emits an allowlisted helper module and a protocol-checking module Worker. The
pool is an explicit runtime dependency and is not copied into the compiler
output; bundle the byte-pinned phase-7 file alongside all three emitted
modules. Its diagnostic retains only the latest successful fan-out result, not
an invocation-growing history. Required-task, Worker, protocol, capacity, or
cancellation failures reject; there is no required-to-local retry.

## Replay and evidence

From the repository root, run:

```powershell
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase8-compiler-fanout/test.mjs
node --experimental-strip-types bend2/toolchain-patches/004-web-workers/rebase-2032/phase8-compiler-fanout/test.mjs
```

The gate clones the pinned 2.0.32 scout into a guarded temporary directory,
replays 001 -> 002 -> 005 -> phase 2 -> phase 5 -> phase 6 -> the phase-8 patch,
checks the phase-6 compiler hash and phase-8 compiler/patch hashes, compares
ordinary no-suffix JS and C output byte-for-byte with the phase-2 baseline, and
checks that the scout and canonical pin remain clean. It runs source-shape
negatives and deterministic pool cap, cancellation, assigned-failure,
malformed-reply, and Worker-construction-denial cases. It then emits a bundle
from compiler output, serves only its exact module files on loopback under a
no-network CSP, and requires one real local Chrome/Chromium module-Worker run.
Before recursive cleanup it rechecks the exact temporary parent and clone
realpaths and directory identities (device, inode, birthtime, and mode), and
rejects unexpected children. The test does not install or download a browser.

The recursion guard is challenged with a checked, terminating non-tail
Nat-fuel caller. Its worker plan has the same required sites, caps, and pure
U32 helpers as the successful case; a paired no-cycle fixture preserves that
parallel-let and reaches only the unsupported-caller-signature diagnostic.
This isolates the recursive-edge rejection from the worker-site checks without
pretending the Nat caller is an emitted shape. A companion U32-shaped
`match n: case 0: ...; case _: fanout(0)` probe is rejected by Bend source
validation first (`expected : a decreasing self-call ... observed : fanout`),
so it is recorded as a typechecker boundary, not misreported as evidence that
the phase-8 cycle guard rejected an otherwise accepted caller.

The recorded Chrome 154 witness invoked the emitted function twice. Each
invocation used four ordered slots: required values `[40, 2, 7]` and one local
`never` value `40`. Six required jobs completed in order `[1, 2, 0, 1, 2, 0]`;
each invocation returned source-slot order `[40, 2, 7, 40]` while only Worker
IDs 0 and 1 participated under cap 2. The module exposed one latest-witness
slot; after the second invocation it pointed to the second result rather than
retaining both. Both Workers terminated and the page observed zero fetch calls.
This is evidence for this one generated compiler shape and local browser only,
not a browser/platform matrix.

This phase does not establish game integration, full browser acceptance,
the legacy 107-case worker suite, a browser/platform matrix, native
GUI/PCM/restart, GPU execution or performance, frozen-proof gates, a toolchain
pin amendment, owner visual acceptance, or release readiness.
