# Bend 2.0.32 phase 7: bounded required sibling fan-out

This is a tested runtime vertical slice after the phase-six two-U32 replay. It
adds a fixed reusable module-Worker pool, a bounded queue, source-slot result
ordering, and strict required dispatch for a source-shaped parallel-let group.
The invocation-local `cap` limits distinct physical Worker IDs that participate
in one region; it does not limit the number of jobs. A `never` sibling executes
the explicitly supplied local function and is recorded as local. Required
computation, protocol, Worker, timeout, and capacity failures reject; none
silently recompute a required task locally.

## Replay

From the repository root, with the exact local Node `v24.12.0`, clean
2.0.32 scout, Playwright/Chrome available, and no competing changes to the
ordered patch inputs:

```powershell
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase7-required-fanout/pool.mjs
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase7-required-fanout/fanout-browser-worker.mjs
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase7-required-fanout/test.mjs
node --experimental-strip-types bend2/toolchain-patches/004-web-workers/rebase-2032/phase7-required-fanout/test.mjs
```

The gate hashes the new test/runtime/fixture, the existing selected-module
adapter, lockfiles and no-suffix fixture; verifies the pristine scout and
canonical 2.0.27 checkout identities; reapplies 001, 002, 005, phase 2, phase 5
and phase 6 into a unique temporary source checkout; and checks the final
compiler hash. It compares ordinary no-suffix JS and C bytes to the phase-2
baseline before/after source planning and helper emission. The checked
[`parallel-fanout.bend`](fixtures/parallel-fanout.bend) has two required sibling
calls under `@2`, plus a `never` sibling. The compiler's checked planner must
preserve their source order and policy. The gate emits explicit selected-root
modules for the two U32 helper definitions, without changing the compiler.

The test is all-or-fail: if local Playwright or Chrome is unavailable, it exits
without a `passed: true` receipt. The deterministic runtime controls cover
out-of-order completion and
source-slot ordering, five siblings with only two distinct participating
Workers, a local/never sibling, simultaneous invocation caps of one and two,
strict Worker-task failure and rejection of fallback hooks, fixed queue
overflow rejection, cancellation, a
duplicate stale reply while a newer request is in flight, pool closure, and
Worker construction denial, including failure after one of two Workers has
been created (startup gates are observed and partial endpoints terminated).
One local Chrome route then runs the selected
compiler-emitted helpers through three actual module Workers, checks the
`WorkerGlobalScope` witness, exact helper/result protocol, local sibling,
source-slot results, termination, loopback-only module requests, and zero
fetches.

## Compiler boundary and remaining gap

This is **not compiler-emitted fan-out**. Phase 6's planner recognizes the two
required siblings, but `Comp.js_percall_lib` intentionally rejects the caller
because it supports exactly one direct required call. The checked parallel-let
source currently maps its group cap to `runRegion({cap: 2, ...})` in the test;
the compiler does not emit this mapping, pool, worker entry, or task records.
The worker protocol/runtime is an isolated experiment, not a general checked
worker-eligibility proof. Its runnable helpers are the explicitly selected,
closed, call-free U32 leaves only.

The recorded local replay passed on Windows Node `v24.12.0` and Chrome
`154.0.8037.59`. Deterministic results were `[40, 2, 40, 5, 7]` in source-slot
order with only Worker IDs 0 and 1 participating under cap 2; concurrent
invocations used at most one and two Worker IDs respectively. Queue overflow,
required helper failure, and Worker creation denial rejected. Aborted work
could not release a newer task when its duplicate stale response arrived. The
real browser route returned `[40, 2, 40, 5]`, created and terminated the fixed
three-Worker pool, witnessed three Worker-scope tasks, and observed zero fetches
or outside-origin requests. The output JSON also records all bound input and
served-module hashes.

This does not rerun the old 107 worker cases or 647-case differential matrix,
and is not cross-browser, hosted/offline, game-integrated, performance, native,
GPU, frozen-proof, 2.0.28/2.0.32 pin-amendment, or release evidence. The
canonical 2.0.27 pin, upstream compiler checkout, frozen Laws, and published
TypeScript game remain untouched. Root owns integration and the next compiler
lowering/review.
