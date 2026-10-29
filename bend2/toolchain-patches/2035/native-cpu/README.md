# Current99 native CPU producer

This is one Linux-owned application build: load the isolated event-overlay
`NativeV2.bend`, run `book_valid`, emit C from that same book, link the CPU ELF,
and stage the existing manifest-checked assets. The source receipt is an internal
record of that build. There is no separate frontend, selected-library, Safe,
kernel, synthetic parity or test run. The produced ELF is never invoked here.

The tracked binding is deliberately unarmed. Root reviews and seals the exact
binding and three producer modules, placing their ignored armed copies in the
fixed `consumerDirectory`. Only the `approvedBindingSha256` declaration changes
in the armed binding; its normalized source hash uses the tracked `null` value.
There are no source, runtime, approval, memory, output or dependency CLI overrides.
The single permitted native-data argument is the original linker observation.

## Source and ownership

The native owner `01a10a7d-098d-7af3-84fa-a7317597c654` must acquire fresh exact
claims for the candidate, armed consumer and output, and verify applicable live
STOP, pause, uncertainty and retained-request state before launch. Receipts and
this binding do not prove live ownership. Historical 2032 claims/requests and
consumed proof stages are preserved; this producer neither reads nor clears a
foreign claim, proof lease or sentinel.

Before bulk generation and at handoff run the existing
`node scripts/check-artifact-budget.mjs` from the canonical root. The default
`.artifacts` budget is 12 GiB. If exceeded, STOP bulk generation until authorized
lossless cleanup has completed; preserve toolchains, active/unknown runs, claims,
recovery inputs and unique evidence. This producer does not clean them up.

The October 29 r4 source changes only NativeV2's application audio pump: it
fills the queried free room of the existing 4096-frame ring instead of capping
each pump at 2048 frames. Device/effect ordering, synthesis, runtime and compiler
remain unchanged. This is a mitigation awaiting actual native recording, not a
claim of uninterrupted playback or a proven cause of the original gaps. The
reviewed r3 CPU build and its gameplay/PCM/restart records remain historical.
The old-C CUDA sidecar has separately built and settled successfully; this fresh
CPU build neither invokes it nor establishes current-source GPU compatibility.

Prepare the isolated candidate under its own claim, preserving the `bend2/`
relative layout. Its complete consumed source set is the 87 admitted project
sources. Preserve host-local sentinel and coordination metadata without copying
or treating it as compiler input. Apply the existing
`native-v2-2032/events/0001-native-v2-events.patch` exactly once there. Its SHA256
is `28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa`;
NativeV2 changes from `8447be64f7f196bd7ecb14a9bb07a795f0bab004ad7078f4703b11e7a31882db`
to `805482c3f7fb7958977ad6f1e3d46476dd1dc6d3969234b36784c250762907a8`.
All other candidate files equal their committed originals. Do not patch the
canonical NativeV2 or compiler. Stable loading requires this complete relative
source layout; a standalone external entry copy is insufficient.

The compiler is the existing independently admitted current99 directory, not a
new copy: 99 exact files totaling 1,208,629 bytes. Its Base/effect source set has
69 bound files. The full static application input cone therefore has 156 files;
that count includes foreign effect sources and is not a `book_load` seen count.
The producer independently follows Bend imports and compares actual loaded paths.

## Fixed binding data

`approved-binding.json` has schema `rift-current99-native-cpu-fixed-binding/1`:

- `ownerTask`, canonical absolute `root`, `candidateRoot`, `compilerRoot`;
  repository-relative `consumerDirectory`; `outputDirectory` fixed to
  `.artifacts/bend2/native-v2-current99-linux`; one fixed `runName` matching
  `run-[A-Za-z0-9_-]+`.
- `review.disposition`: `accepted-for-one-current99-native-cpu-build`.
- `memoryPolicy`: exactly `{schema: "rift-current99-native-memory-policy/1",
  unit: "rift-current99-native-cpu-20261029-r4.service",
  memoryMaxBytes: 77309411328, swapMaxBytes: 0, oomGroup: 1,
  reserveBytes: 8589934592}`. This is a fixed experiment resource policy, not a
  measured requirement or permission to alter another service.
- `source.commit`, `source.tree`, `source.projectFiles` (87 repository-relative
  original path-to-SHA256 records), `source.candidateFiles` (the same 87 paths,
  only NativeV2 changed), and `source.baseEffectFiles` (69 compiler-relative
  path-to-SHA256 records).
- `compilerFiles`: the exact complete 99 compiler-relative path-to-SHA256 map.
- `runtime.path`, `runtime.sha256`: actual retained Node v22.23.1, SHA256
  `93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068`.
- `clang.command`: one reviewed absolute installed command path; its resolved
  file identity is supplied by the native-local observation below. No executable
  search, alternative compiler, installation or option override occurs.
- `modules`: SHA256 records for `binding.mjs` (normalized null declaration),
  `run.mjs`, `worker.mjs`.
- `helpers`: exactly the exported `helpers` name-to-path map in `binding.mjs`.
- `repositoryInputs`: reviewed repository-relative path-to-SHA256 records for
  those helpers and their transitive imports, the existing event patch, and all
  runtime asset/manifest/artwork/license inputs. In particular include
  `2032/preview/compiler-eol.mjs`, imported by the historical asset helper.
  Importing that helper does not adopt its old profile or compiler bindings.

Root supplies the actual source/tool/runtime records and review. None are
manufactured by this producer. Exact source/git identities are checked before
and after work; Git cleanliness covers tracked files, preserving untracked
native coordination evidence.

## Native-local linker observation and launch

Before the one-use intent, the actual owner records a new exclusive JSON file:
schema `rift-current99-native-cpu-tools/1`, `ownerTask`, `sourceCommit`,
`nativeBindingSha256` (raw approved-binding SHA256), `requestedCommand` (exact
fixed `clang.command`), and `resolvedClang` with exact `path`, `bytes`, `sha256`,
`dev`, `ino`, `mode` fields. Resolve the command and observe that regular executable
locally; do not guess Windows-visible identity or use a historical linker hash.
The consumer rechecks the original JSON raw hash and complete current executable
identity in the parent, Worker and final binding snapshots. This data is an
observation, not a separate acceptance run or permission to change dependencies.

The native owner/preparer creates the fresh fixed systemd user service under its
own reviewed procedure, with `memory.max=72 GiB`, `memory.swap.max=0` and
`memory.oom.group=1`. This source neither creates nor changes systemd services or
cgroups. Preserve the original r1 intent, failure and source copies, accepted r2 output,
retained lock and all old one-use intents unchanged. Use fresh r4 candidate,
consumer, observer and run names; no old lock retirement is required. The actual
owner must observe the existing active CPU lock absent rather than clear it.
Use the corrected identity-bound service observer: persist terminal manager
state before an optional final cgroup path sample; a removed cgroup is recorded
as removed, never as a fabricated zero-use or successful original descriptor
sample. Keep the original service InvocationID and original-handle joins.
From the canonical root **inside that service**, with the actual owner environment,
`NODE_OPTIONS` and `BUN_OPTIONS` empty and `BEND_NO_TELEMETRY=1`, launch the admitted
Node without parent Node flags:

```
<admitted-node> <armed-consumer>/run.mjs --native-tools <original-json> --native-tools-sha256 <raw-sha256>
```

The Worker uses only `--experimental-transform-types`, a 64 MiB stack, and
`maxOldGenerationSizeMb=65536` (64 GiB). Configured and actual Worker limits are
asserted and recorded; actual native readback is required, not assumed. This is
the permitted V8 old-generation ceiling, not an allocation, required usage or
total-memory limit. Native memory, buffers, other engine spaces, threads and the
parent remain within the separate 72 GiB service cap. The nominal 8 GiB difference
does not guarantee those allocations fit. No young-generation option, compiler
parallelism, runtime scheduling or parent Node flag changes. Worker success
requires the original exit event/code. The actual C
compiler's `file_book`, reached by `compile_book` on real main/runtime roots,
checks compiler-owned names and constructor/foreign-name collisions. No empty-root
JS emission is used as a synthetic guard; C emission is not a formal proof claim.

Containment and growth-reserve checks run before the first Clang command and
immediately before C emission in the Worker. The unchanged
init-cgroup-namespace/full-ancestry helper verifies namespace and mount visibility.
The actual self leaf must be the fixed unit in the current UID's systemd user
hierarchy, with exactly the bound cap, swap limit and OOM-group setting, zero
current swap, and readable current usage/OOM counters. The cgroup directory's
device/inode/path is pinned across parent and Worker snapshots.

For each admission, remaining allowed growth is `72 GiB - leaf memory.current`.
Host `MemAvailable` and **each finite outer ancestor's** `memory.max - memory.current`
must cover that remaining growth **plus 8 GiB**. The self leaf is excluded from
the outer reserve comparison; its cap is containment. This replaces the speculative
88 GiB floor and does not assert current99's memory requirement or measured peak.
These are point-in-time admissions, not continuous host reservations. Unreadable
required accounting, hidden ancestry, incorrect controls/membership or insufficient
outside headroom stops the build.

Receipts retain actual current usage, cgroup identity, optional `memory.peak`, and
original `memory.events` fields, including finite outer ancestors. Missing or
unreadable optional peak is `null` with its actual error, never zero. Leaf `oom`,
`oom_kill` and `oom_group_kill` counters must all remain zero. A final containment
snapshot is recorded after link/settlement and before successful receipt/lock
release; it verifies containment and no leaf OOM, without admitting further growth
after work has finished. Failure snapshots are retained when readable. The external
native observer owns unit freshness, whole-service exit/OOM evidence and failures
that kill this producer; no OOM result is acceptance.

X11/ALSA headers and link dependencies are compiled before expensive application
emission. The dependency source defines `_GNU_SOURCE` before those headers, matching
the generated program. Clang 14+ is required. The dependency probe binary is not
executed. Compilation uses the existing CPU flags and scheduling behavior.

The fixed output root has one `active-native-cpu.lock`. The run directory and
`<runName>.intent.json` are created exclusively; intent remains permanently after
success. Collision or failure never triggers reset, retry, lease replacement or
cleanup. Failed output and lock remain for owner review. Child commands use the
existing owned-process-group supervisor with original exit, bounded streams and
group-quiescence checks. Its bounded ownership-aware timeout/settlement policy
is retained; unknown liveness is reported, not treated as completion.
Exclusive writes fsync both their files and containing directories; new output
directories fsync their parents before launch. Clang version, dependency and link
commands retain original raw stdout/stderr byte files with identities in process
records and receipts, including partial supervisor results on failure. Decoded
text is human metadata; version parsing rejects invalid UTF-8 after saving bytes.

Success returns the package receipt path and identity. Failure returns its exact
reason, retained failure receipt where writable, lock state and liveness flag.
The package contains `bin/rift-chess-native-v2`, manifest-checked assets/licenses,
`runtime-assets.json` and `run-native-v2.sh` (CPU `--gpu off`). Native GUI/input,
PCM capture, persistence/restart and subjective rendering acceptance remain
subsequent actual-application work. No canonical 2.0.27 pin, frozen law or formal
proof obligation changes here.
