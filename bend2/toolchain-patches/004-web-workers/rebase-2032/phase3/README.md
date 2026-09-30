# Bend 2.0.32 selected-root Node Worker slice

This is a deliberately coarse runtime vertical slice on the derived 2.0.32
stack. It is not the original 004 per-call fork scheduler or a full Web Worker
backend. An explicit, validated selected-root module is executed in one Node
`worker_threads` Worker for the entire root call; no all-roots export fallback
is used. The source planner and selected-module adapter remain separate gates.

## Routing contract

- Source `require` calls and host mode `require` dispatch an eligible root to a
  Node Worker.
- A source `never` call or host mode `never` runs synchronously when no required
  region conflicts. Host `never` cannot override source `require`.
- Mixed `require`/`never`, nested require-under-never, and unsupported required
  plans reject before Worker creation.
- Optional, statically blocked but otherwise projectable roots run synchronously
  with a visible `static_ineligible:...` reason. The fixture exercises the
  intrinsic-blocked arithmetic root. Selected-module hostability checks still
  apply; unsafe, foreign, unfilled, and IO-containing closures are not converted
  into an all-book sync fallback.
- Worker arguments are structured-cloned. A versioned request/reply envelope,
  bounded timeout, abort handling, worker error/exit handling, and owned temp
  directory cleanup protect the Node boundary. Temp cleanup captures the
  canonical allocation path plus `lstat` device/inode/birthtime/mode identity,
  then rechecks path, identity, and non-symlink/reparse-link status immediately
  before recursive removal; drift fails closed. The worker denies `fetch` and
  returns a counter that the parent requires to be zero; this is not a general
  OS-level network sandbox. `@N` caps and native `!` execution behavior are not
  implemented by this coarse runtime.

## Local verification

From the repository root, with the local Bun runtime:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase3/runtime.mjs
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase3/node-worker.mjs
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase3/test.mjs
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase3/fixtures/fetch-probe.mjs
node --max-old-space-size=512 bend2/toolchain-patches/004-web-workers/rebase-2032/phase3/test.mjs
& .artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe run bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/test.mjs
& .artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe run bend2/toolchain-patches/004-web-workers/rebase-2032/phase3/test.mjs
```

The selected-root runtime gate now passes separately on exact Windows Bun
1.4.2 and Node v24.12.0 executables, each with its own pinned SHA-256. Both
actually dispatch worker threads; this is still a coarse whole-root Worker,
not per-call 004 scheduling. The no-suffix C SHA-256 is the same on both:
`9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009`.
Raw JavaScript differs by runtime: Bun SHA-256
`efe64dca089a1922152144681e772e75c59807be07dc0ff892d2b3349a11a874`,
Node SHA-256 `3c99dcd84414a057fce65edb45dd69d600e6b57bee49aec23e7333130a510a1d`.
An in-memory same-fixture comparison (exact derived compiler, Windows Node
v24.12.0 vs Bun 1.4.2) produced 3,805 vs 3,739 JS code units; the first
differing code unit was 1,650 at `const f32_round = function f32_round...`.
Node preserved TypeScript-erasure whitespace/CRLF and `2 ** 128`, while Bun
emitted a compact parameter and expanded numeric literal. `comp.ts` splices
`${Bend.f32_round}` into the runtime, explaining this host-dependent prefix;
the gate retains both raw byte pins rather than normalizing either. These
fixture checks do not prove universal cross-runtime semantics or a canonical
production build. The phase-three test covers a required-call root, an explicitly host-required root,
equivalent sync/worker results, never-only local routing, visible optional
fallback, required/conflicting negative policies, cancellation after Worker
creation, and a real 1 ms Worker timeout with temp-module cleanup. A synthetic
rejected `terminate()` preserves the timeout error without an unhandled
rejection. A bounded rename-and-replace probe confirms cleanup rejects changed
directory identity without deleting the replacement or the moved original; the
test removes both exact unique temp directories after verifying they remain
plain children of the OS temp parent. A malformed request protocol is rejected
before importing its intentionally invalid module URL. The worker-side fetch
counter and parent fetch trap both observed zero calls in the normal positive
routes. A direct worker probe calls `fetch` only with a `data:` URL; the worker
denial counter records one attempted call and no network request is made.
An injected test-only selected module makes the same denied `data:` fetch
through `invokeSelected`; its positive worker counter is rejected by the
parent as `network_denied`, with the owned temporary module cleaned.

The phase-two fixture hash is
`9204db93874b8c2a59ccae988211298e29d7c21945c06bae8452d6addafe9a6d`.
The independent phase-two replay validates exact pristine 2.0.32 HEAD
`573002f01ec6c52416d44489543f69a9625facf8`, 001→002→005→phase2 source hashes,
and byte-for-byte ordinary JS/C parity. Current derived compiler hashes are:

- `bend.ts`: `2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88`
- `comp.ts`: `4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1`
- `main.ts`: `e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae`

Phase-three source hashes:

- `runtime.mjs`: `96530bd87f177b5a2c0452d4d72e548921b04854f77f583fb606a74f7249170f`
- `../selected-module.mjs`: `1508c2620714fd0f96b531400510f1cf997671ec1a0dbc074a35484c24fc84c7`
- `node-worker.mjs`: `d214c1201b90b65deac32f0523660730ffe3ebd3069753d85c7c9587e755b493`
- Historical Bun-only `test.mjs` SHA-256: `d786e55a0a964bbb1969f572021387639cfe638f7127445e69e6d4a09e1979f3`.
  Current dual-host `test.mjs` SHA-256: `59e986f5c13d646c356acb70c1f40b830ff18ef846cebadd5959ec7e46a570d9`.
  The script reports its own source hash at the run checkpoint;
  the historical hash remains provenance, not a current source pin.
- `fixtures/fetch-probe.mjs`: `24d648e7f4e6e4f4f966932a08e707b54db438024a822623f7dc8ea010dd71a5`

Residual runtime gaps: worker `error`/`exit` event behavior, a malformed reply,
a non-cloneable result, and ADT argument/result marshalling are not covered by
the executable gate. The protocol-mismatch probe covers a malformed request
at the worker entry only; malformed-response handling is untested. No
independent Linux Node host, full browser Worker scheduler, packaged/offline, parallelism benchmark,
complete-004, frozen-proof, native/GPU, or release acceptance is established.
Root integration must replay/generate the candidate patch and run the broader
gates separately.
