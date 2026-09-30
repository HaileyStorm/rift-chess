# Bend 2.0.32 per-call strict-require slice

This ordered candidate adds one actual compiler-emitted `@` dispatch: a named,
pure, closed, call-free `U32 -> U32` callee, required directly by an exported
first-order `U32 -> U32` caller. `Comp.js_percall_lib(book, caller)` returns
`program.mjs`, a callee-only `callee.mjs`, and a module `worker.mjs`. The
exported caller is asynchronous only in this explicit build; it awaits the
worker reply, resumes ordinary Bend-generated caller code, then resolves its
U32 result. There is one Worker per required call, no pool or profitability
heuristic.

The strict build rejects a requirement under `never`, a required intrinsic,
multi-argument or otherwise non-U32 callee, multiple/nested required sites,
explicit concurrent `@N` caps, native `!@`, and unsupported caller dependencies
before it emits worker artifacts. The single-task slice does not pretend to
enforce a concurrency cap across overlapping exported calls. A failed strict
build has no synchronous fallback. Source `never` calls stay local in the
ordinary `js_lib` output; they do not instantiate a Worker. Existing `js_lib`
and C emission are otherwise unchanged.

## Replay and browser witness

Run from the repository root with the pinned Node 24.12 runtime, local
Playwright package and an already-installed Chrome/Chromium. This gate does
not install or download a browser. It traps explicit Node/page/generated-worker
`fetch` calls and routes page requests, but does not claim process-level egress
isolation: Node `http`/`https` and Chrome background traffic are not trapped.

```powershell
$env:BEND_NO_TELEMETRY = '1'
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase5-percall/test.mjs
node --experimental-strip-types bend2/toolchain-patches/004-web-workers/rebase-2032/phase5-percall/test.mjs
```

The test hash-checks and reconstructs the clean 2.0.32 scout in a unique OS
temporary directory, applies the exact ordered stack `001 -> 002 -> 005 ->
phase2 -> this patch`, and verifies the phase-two compiler source hashes before
the final patch. It checks the candidate `comp.ts` hash, no-suffix JavaScript
and C byte parity both before and after per-call/planner invocations, the
supported fixture, and compile-time negative policy and shape cases. Compiler
artifacts are written only to a separately allocated
temporary directory whose exact path and filesystem identity are rechecked
before cleanup.

It serves generated modules from an ephemeral loopback origin under CSP and
runs system Chrome. The `caller(41)` program dispatches `identity@(41)` to a
real module Worker. The returned task witness reports `workerScope: true`,
callee `identity`, value `41`, and zero worker fetch attempts; the resumed
caller runs `after(41)` and resolves to `42`. The separate `never_call(41)`
export returns synchronously with zero Worker constructions. Page and Node
fetch traps observed zero calls for the positive route, and page routing
observed no outside-origin requests.

The browser fixture also injects wrong-request-ID, wrong-witness-kind,
extra-field, nonzero-fetch-witness, timeout, and `postMessage`-failure replies;
each rejects rather than falling back, and each created Worker is terminated.
A separate `@unsafe` self-tail-recursive fixture is rejected by the ordinary
pure-caller boundary. The test removes `@unsafe` from a temporary copy and
confirms Bend rejects that unchanged self-call as non-decreasing recursion.
Thus this slice does not demonstrate a source-valid pure caller loop; the
compiler loop guard remains conservative and is not exercised by this fixture.
Mutual recursion is outside Bend's supported source shape.
These narrow controls do not cover all Worker lifecycle or hostile browser
behaviors; worker `error`/`messageerror` and module-load failure paths remain
untested.

Recorded local evidence (Node v24.12.0, Chrome 154.0.8037.59):

- Pristine scout commit: `573002f01ec6c52416d44489543f69a9625facf8`.
- Fixture SHA-256: `fd7ab11f6045dde3a46f6b09d3ba575bbbf220012f01a9f04eece9f5c793d1cc`.
- Tail-loop fixture SHA-256: `0fe21e0dac0002e95e376dcced0225ca3e6a187620b5dbce875c05dd86e039e5`.
- Candidate patch SHA-256: `06e956f9f69c8c4a5d3dc0cd5f55c2633ab276f3cd99050e0ec9e36a2afa40be`.
- Final derived `bend2/comp.ts` SHA-256: `288f301527997727189b07d1e8ed44030b2c8b5bea606b1ff4404943595f8fb8`.
- No-suffix JavaScript SHA-256: `3c99dcd84414a057fce65edb45dd69d600e6b57bee49aec23e7333130a510a1d`.
- No-suffix C SHA-256: `9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009`.
- Emitted program/callee/worker SHA-256: `57c7ca7fb1a0f26a2c0f6b1defa829e7bc759565ee21ba723298bbc9f85d6348`, `cf01412800d01476a762aef730195e0beeda880f054668c97a401a7fedd9ae6d`, `9b80a08eda1641fff9cfecea06c832c6d8591906028d7e7ab2a20776feb62ad`.

The test records the Chrome version and executable basename (`chrome.exe`);
the browser binary itself is not SHA-256-bound. The JSON line binds patch,
fixture, compiler and generated module hashes and records the observed browser
result. This demonstrates one local module-Worker task, not a formal proof or
a general-purpose worker backend. Multi-engine/browser matrices, the 107-case
worker suite, full 004 scheduling, game integration, performance,
process-level egress isolation, hosted/offline acceptance, frozen proofs,
native/GPU execution, toolchain adoption and release acceptance remain open.
