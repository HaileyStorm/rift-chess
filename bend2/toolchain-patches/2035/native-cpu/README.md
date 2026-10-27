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

Prepare the isolated candidate under its own claim, preserving the `bend2/`
relative layout. Its complete consumed source set is the 86 admitted project
sources. Preserve host-local sentinel and coordination metadata without copying
or treating it as compiler input. Apply the existing
`native-v2-2032/events/0001-native-v2-events.patch` exactly once there. Its SHA256
is `28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa`;
NativeV2 changes from `29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d`
to `9fe46e219123e3f59958de98c6f9b65fc618cca85ca0325740dffc30e8aef292`.
All other candidate files equal their committed originals. Do not patch the
canonical NativeV2 or compiler. Stable loading requires this complete relative
source layout; a standalone external entry copy is insufficient.

The compiler is the existing independently admitted current99 directory, not a
new copy: 99 exact files totaling 1,208,629 bytes. Its Base/effect source set has
69 bound files. The full static application input cone therefore has 155 files;
that count includes foreign effect sources and is not a `book_load` seen count.
The producer independently follows Bend imports and compares actual loaded paths.

## Fixed binding data

`approved-binding.json` has schema `rift-current99-native-cpu-fixed-binding/1`:

- `ownerTask`, canonical absolute `root`, `candidateRoot`, `compilerRoot`;
  repository-relative `consumerDirectory`; `outputDirectory` fixed to
  `.artifacts/bend2/native-v2-current99-linux`; one fixed `runName` matching
  `run-[A-Za-z0-9_-]+`.
- `review.disposition`: `accepted-for-one-current99-native-cpu-build`.
- `source.commit`, `source.tree`, `source.projectFiles` (86 repository-relative
  original path-to-SHA256 records), `source.candidateFiles` (the same 86 paths,
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

From the canonical root, with the actual owner environment, `NODE_OPTIONS` and
`BUN_OPTIONS` empty and `BEND_NO_TELEMETRY=1`, launch the admitted Node without
parent Node flags:

```
<admitted-node> <armed-consumer>/run.mjs --native-tools <original-json> --native-tools-sha256 <raw-sha256>
```

The Worker uses only `--experimental-transform-types` and a 64 MiB stack, both
read back. Its success requires the original exit event/code. The actual C
compiler's `file_book`, reached by `compile_book` on real main/runtime roots,
checks compiler-owned names and constructor/foreign-name collisions. No empty-root
JS emission is used as a synthetic guard; C emission is not a formal proof claim.

Two admissions require at least 88 GiB: before application loading and immediately
before C emission. Both use host `MemAvailable` and the unchanged admitted
init-cgroup-namespace/full-ancestry guard. Unreadable accounting, hidden ancestry,
or insufficient headroom stops the build. The 88 GiB floor preserves the original
native-emission requirement; it is not a measured current99 peak or a claim about
Node heap capacity. X11/ALSA headers and link dependencies are compiled before
expensive application emission. Clang 14+ is required. The dependency probe binary
is not executed. Compilation uses the existing CPU flags and scheduling behavior.

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
