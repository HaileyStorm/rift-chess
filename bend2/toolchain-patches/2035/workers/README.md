# Isolated 2.0.35 Web Worker carry-forward

This candidate carries the accepted 004 generator coordinator, scheduler, and
static module-worker target onto pristine Bend 2.0.35 commit
`79df8d9c40722ee9507a1e253f283b51025f9d6c`. It does not
change the accepted 2.0.27 pin, upstream checkouts, frozen Laws, browser builds,
AI splitting, or deterministic tie-breaking.

`prepare-current.mjs` authenticates the existing `prepare.mjs` parent and the
accepted parser, restoring the two independently reproduced omissions:
declared saturation and rewrite-binder precedence. It constructs the current
Worker candidate at
`.artifacts/bend2/toolchain-patches/workers-2035-parser-r1/bend2/`. Existing
derived compiler bytes and inventory must match exactly. Materialization creates
a missing tree; it never overwrites a drifted tree. The candidate CLI remains
upstream; the worker target is exposed through `Comp.js_worker_lib` and the
source-bound emitter here.

The parser preserves `@`, `@N`, and `~` metadata through checking and term
reconstruction. Worker lowering precedes 2.0.35's synchronous tail-cycle
optimization. Schemas use `Bend.name_key` qualified constructor tags, and
saturated function names retain upstream collision-safe encoding. Runtime
closures stay local, resolve upstream deferred call markers, and cannot silently
satisfy a strict required worker request.

## Nat and local boundaries

The explicit backend is `bend-web-workers-2035`, with manifest contract
`natRepresentation: "number48-host-bigint"`. Generated serial helpers,
coordinators, worker-job values, and worker-reply values use numeric Nat.
Validated first-order public inputs accept BigInt and are copied into numeric
values; public outputs are copied back into BigInt. The wire range remains
`0..2^48-1`. Packed Nat retains its eight-byte little-endian representation,
converting through BigInt only for packing and decoding. Internal `packArgs`,
`unpackArgs`, and default `snapshotArgs` operate on numeric Nat in this version.
They are not public BigInt adapters.

Supported recursive ADT snapshots and public results preserve DAG sharing.
Unsupported wire schemas retain the accepted policy-aware synchronous local
route. Compiler-generated input/output marshaling handles the 2.0.35 host ABI;
local input data is copied before array marshaling to preserve caller-owned
arrays. Those marshal helpers have a separate namespace from the serial
library's helpers. This local route preserves nested `require`/`never` policy:
strict unfulfilled requests reject; permissive requests report the local
fallback. It does not invoke a whole-root host wrapper to bypass enforcement.

## Commands

The existing 2.0.35 Windows source-loader tree must already be materialized by
its owner. Run from the repository root:

```powershell
node bend2/toolchain-patches/2035/workers/prepare-current.mjs --materialize
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2035/workers/diagnostic-current.mjs
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2035/workers/emit-bot-current.mjs --diagnostic diagnostic-ngbaji
```

The diagnostic writes a fresh directory and prints its name. Supply that exact
name to `emit-bot.mjs`; the emitter rejects stale compiler/fixture bindings.
Both compiler entry points set `BEND_NO_TELEMETRY=1` and deny source-network
fetches. Each bot emission creates five static runtime files and a build-only
`source-binding.json`, with source, compiler, loader, emitter, diagnostic, and
artifact hashes. No shared preview output is written.

## Corrected candidate evidence

Fresh compiler-only controls passed 48 records, and the complementary real
module-Worker matrix passed 19 records on the corrected tree. The full diagnostic
passed both transports and ordinary JS/C identity. Then `emit-bot-current.mjs`
checked the entire five-source BotAdapter book and emitted 96 functions and its
balanced fork site. The final bot is `workers-2035-parser-r1/bot-4BPFvk` under
`.artifacts/bend2/toolchain-patches/`. Its five runtime artifacts are byte-identical
to the selected parent `bot-t0Qkcm`; its creation binding is new, with schema
`rift-bend-worker-source-binding/2035-2` and both preparation layers recorded.

The corrected `bend.ts` SHA256 is
`0eab46d06cd349ecd2dd0495b116a6f57f1e483040597cf7aded953711bf8d26`.
The other 97 compiler files match the parent, including the compiler and runtime
hashes below. `worker-current-verification-r2.json`, SHA256
`a4c67847873605c840c992393abe1233095f21d2813fb20c2cf948ddee55dde5`,
binds all four stages and their artifacts. It is under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`. Each native stage
observed the original child exit, closed its handle and self-only Job, and
retained unchanged input hashes. Durations establish no performance claim.

The emitter now requires exact diagnostic preparation-lineage equality as well
as compiler hashes. An owned copy missing that lineage rejected at the guard
with expected child exit 1; its original child handle and Job closed. Fresh
guarded emission then passed. The first emission and exact source preimage
remain retained. That emitter guard was not executed in the earlier compiler,
matrix or diagnostic stages; those native fences remain original evidence,
with the later unused-input postimage explicitly recorded in verification.

Active semantic checks use corrected preparation by default. The isolated
candidate flag and original source preimages remain historical discriminators.
`build-preview.mjs` selects the corrected `workers-2035-parser-r1/bot-4BPFvk`
creation binding and authenticates its current preparation, diagnostic, emitter
and source-binding files. The reviewed selection, package and browser/offline
evidence are recorded in [semantics/README.md](semantics/README.md). Original
parent files and receipts remain historical compatibility evidence. These
compiler and runtime results do not establish proof, device, native or adoption
acceptance.

## Retained parent evidence

The retained diagnostic matching the unchanged parent compiler and fixtures is
`.artifacts/bend2/toolchain-patches/workers-2035-candidate/diagnostic-osb93j/receipt.json`,
SHA256 `eb308d54f4810dab108ad4767463f153dd0c9b5b183a2da790b53efe57ab1524`.
The former `diagnostic-6AtJvy` binds an older diagnostic runner and is historical;
the emitter rejects it for current emission. This readback is not a new run.
It executes actual compiler-emitted module workers on Windows/Bun 1.4.2, with
both clone and packed transport. The bounded checks cover:

- Qualified recursive ADT/Nat crossings, asymmetric left/right joins, and caller
  continuation after a required helper.
- Source cap two with a pool of three, `never` locality, and no strict local
  fallback when workers are unavailable or an asset fails to load.
- Intrinsic required-call metadata, lifted-return-lambda arity, and a runtime
  closure calling a named helper without unresolved deferred markers.
- Local `Array<Nat>` round-trip without caller mutation; strict and permissive
  nested require behavior; local nested never behavior.
- The 48-bit Nat bound, numeric public-input rejection, DAG alias preservation,
  cycles, and pre-aborted calls.
- Cancellation after an actual helper-start event, a subsequent correct call,
  and complete session close. A cancelled helper can remain in flight until
  return or close, matching the retained scheduler contract.
- A deliberately corrupted clone reply over a real helper rejects and closes
  the session without a serial retry.
- An authentic packed scalar Nat reply changed from 11 to 2^48 rejects before
  publication and closes without local fallback.
- Byte-identical ordinary unsuffixed JS and C emission for the small independent
  plain fixture against pristine 2.0.35.

The retained source-bound bot bundle is
`.artifacts/bend2/toolchain-patches/workers-2035-candidate/bot-icn1mU/`.
Its program hash is
`106a48b57f632299da6ba1453641bef2238497e1304fb0904cd232e1bbb3ecd0`.
It checked all five current project sources plus bound Base, emitted 96
functions and the balanced `core/AI:parallel` fork site, and recorded zero
network calls. `source-binding.json` identifies `choose`, `manifest`,
`createSession`, and the common `core/Model.Pos` tag. Root owns copying only the
explicit retained artifact bytes into the candidate preview.

Parent derived source hashes:

| File | SHA256 |
| --- | --- |
| bend.ts | `1d5608feb493495fa0a1c3ba0d1b95c4b3666f1a3fdf2e82dc9a924417a33a77` |
| comp.ts | `f61c619e97ada3949ad7ff2be9c0fcb74e75a46c3c818eda08a19a4cb41625ae` |
| web_runtime.js | `0422e7864b96d9f96474818b490eda2dddf974a1054eb402b692687b5a2e96c2` |

These are compiler-source, finite differential, and local module-worker runtime
results. Root's subsequent exact candidate build passed actual Node required-
helper/controller choice and invalidation checks, Chrome24scenarios/689reference
checks, and Chrome online/cold-offline bot turns. The
[evaluation record](../../../docs/BEND_2035_EVALUATION.md) binds those distinct
receipts. Proof, full upstream regression equivalence, native execution, GPU
performance and adoption remain separate gates.

The complementary [current semantics matrix](semantics/README.md) uses one
checked fixture and real clone/packed helpers for dynamic policy, concurrent
reply identity, submission snapshots, disposal/fatal errors, F32/String wire
boundaries and compound forks/nested caps. Its [inventory audit](semantics/INVENTORY.md)
keeps the remaining compiler/security/scheduler/hosting contracts explicit.
Select the runner owning the changed boundary; do not rerun unchanged historical
phases or both current runners simply to recount covered cases.

Earlier diagnostic/emission directories are retained as failed or superseded
evidence. In particular, the initial test used the wrong `maxWorkers` option,
expected a rejection despite actual helper execution, and left a helper open
until the bounded wrapper timed out. Current tests use `workers` and close every
session in `finally`. The first bot emission also preserved a Base-closure
binding mismatch before the binding was corrected to distinguish compiler Base
from project sources. No earlier bundle is implicitly current.

The writer task `01a10d3b-52f3-7111-a904-29482929dcad` released its own
`workers2035-backend` reservation after verified handoff. Root acquired fresh
ownership for integration; Git and shared preview changes belong to root.
