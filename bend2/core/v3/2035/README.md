# Bend 2.0.35 frozen v2 source screens

These isolated Windows runners preserve the frozen v2 CHECK and six semantic
mutations. They produce `rift-v2-aggregate-2035-source/1` and
`rift-v2-mutations-2035-source/1` receipts with producer scope
`source/type/promise` and an explicit compiler namespace guard. They do not
invoke Safe, BendTT or Lean, amend a Law, or adopt a compiler pin. The existing
2.0.32 kernel admission contracts reject these distinct schemas; their Linux
admissions and authority remain unchanged.

`binding.mjs` verifies the frozen manifests and amendments, all frozen source
and evidence inputs, unchanged proof authority, helpers and runtime, and the
existing exact 2.0.35 selected-binding compiler inventories. This includes the
pristine 97-file source inventory and the derived Windows local-only loader
postimage. The inherited selected Scene diagnostic source inventory is retained
as an additional binding, not a CHECK substitute. No upstream source is patched.

The actual CHECK loads the complete independently derived cone with the shared
stable-import preload. Every loaded file is checked against its bound bytes.
`Book.hols` must be zero and Book must have no `open` field. Only the immutable
view passed to the unchanged proof authority has `open: 0`. The compiler-owned
guard runs through `Comp.js_lib` on an empty-root view retaining the full checked
`tlds` and `ctrs`; its fixed runtime string is discarded without execution.

The mutations retain the original six names, anchors, replacements and proof
entries. Each negative runs on an owned copied complete cone. Only a real Bend
type mismatch with expected type, observed type and location counts as rejection,
through the unchanged 2.0.32 mutation-verdict helper. A positive may be reused
within one invocation only for the same proof entry, exact complete source
inventory and exact compiler/runtime/source binding; the receipt records its
original case and raw positive-record hash. The two PROOF cases and two
MatchControlProof cases therefore share their respective positive checks.

Preflight imports no Bend compiler and starts no Worker. It records current
working bytes and Git status for review. Actual execution requires a clean
checkout and compares the full binding before and after each Worker and receipt
commit. Use the existing local wrapper with telemetry disabled:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/tools/bend.mjs --run bend2/core/v3/2035/aggregate.mjs --preflight-only
node bend2/tools/bend.mjs --run bend2/core/v3/2035/mutations.mjs --preflight-only
```

After independent source review and root authorization, omit `--preflight-only`
to execute and set `$env:BEND_TIMEOUT_MS = '2700000'` so the wrapper outlives the
serial per-Worker deadlines and their observed-exit grace periods. Mutation
`--only <frozen-case>` is diagnostic and never sets the full
six-case `passed` flag. Aggregate CHECK has a 900-second deadline. Each mutation
uses its unchanged proof-specific deadline (PROOF 240 seconds, CanonicalProof
360 seconds, others 120 seconds). These Windows Bun 1.4.2 Workers run serially,
record observed RSS/free RAM, and follow the user's bounded low-RAM authorization
without a fixed free-memory admission floor. No V8 heap-limit claim is made for
Bun. Resource stops remain failures, with owned attempt records retained.

All output is exclusive and ignored under
`.artifacts/bend2/2035-proof-20261005/`. Shared lifecycle helpers wait for actual
Worker exit, preserve an uncertain live-Worker lease, and atomically finalize
source-bound receipts. Existing evidence and failed attempts are never replaced.
The four source files are owned by task
`01a10d3b-52f3-7111-a904-29482929dcad` under the supported
`proof2035-source-rebase` reservation. Root owns independent review, execution
authorization, integration and Git publication.

Current handoff gate: implementation, syntax and source-binding review only.
Full CHECK and semantic mutation compiler execution remain unrun pending root's
independent review. No source-screen result is a kernel proof or pin acceptance.
