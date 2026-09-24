# Experimental downstream patch 003: capture-only join boxing

This patch is against the clean Bend 2.0.27 pin
`d37909174ebd664338ae3194799a9e0899dedd51`. It is an optional experiment,
not a change to `bend2/TOOLCHAIN.json` or the pinned checkout. The compiler
already boxes oversized constructor fields and def parameters, but a generated
join continuation can still hold more than 255 words. This patch only boxes
*captured* multiword values at the generated cut/fork boundary. It does not
increase the u8 arity limit or alter a callee's result ABI.

When captured words plus raw returned words exceed 255, the emitter picks the
largest multiword captures and converts each to an existing one-word `BOX`.
The binding still has its original Bend type. The existing `val_to` path
unboxes the value at a typed use; the constructor node owns the captured
fields. Both parallel join-task transport and sequential stack-frame transport
use the same captured layout. Before the sequential path jumps into a fork
joiner, it restores each surviving binding to the parallel joiner's layout.
Fork structure and task counts are unchanged.

Sequential frames may retain physical slots after a binding dies. The boxing
budget counts only live bindings that `seg_open` actually passes to the next
continuation; `depth` still controls physical stack offsets and the final pop.
The `dead-frame-slots.bend` control catches unnecessary boxing from counting
dead slots: the earlier patch changed its emitted C despite its valid arity;
this revision emits byte-identical C to the clean pin.

The patch does **not** solve all wide joins. Three 128-word raw results alone
still overflow the join; many one-word captures can also overflow. A general
result fix needs a reviewed return ABI or per-child continuation adapter and
task-delivery/index treatment. Keep these cases as compiler rejections instead
of widening an arity table or changing GPU work scheduling.

## Reapply in a disposable copy

From the Rift Chess root, verify `git -C .artifacts/toolchains/bend rev-parse
HEAD` is the commit above and its tracked status is clean. Create a fresh
ignored compiler copy in an absent path and apply the patch from its root:

```powershell
$joinClone = '.artifacts/bend2/toolchain-patches/join-boxing/compiler-replay'
$joinPatch = (Resolve-Path 'bend2/toolchain-patches/003-join-boxing/0003-join-capture-boxing.patch').Path
git clone --no-hardlinks .artifacts/toolchains/bend $joinClone
git -C $joinClone apply --check $joinPatch
git -C $joinClone apply $joinPatch
```

The repository's normal `bend2/tools/bend.mjs` wrapper intentionally rejects
a patched compiler. To test this isolated copy, invoke its `bend2/main.ts`
with the pinned Bun 1.4.2, `BEND_NO_TELEMETRY=1`, compiler `bend2/` as the
working directory, and absolute forward-slash fixture/output paths. Never
patch `.artifacts/toolchains/bend` or publish upstream from this experiment.

## Focused evidence (2026-09-24, Windows host / WSL Ubuntu)

[`receipt.json`](receipt.json) binds every fixture to its source hash, observed
stdout, emitted C hash, Linux executable hash, and one/four-thread exit status.
The current patch SHA-256 is
`9295DF173A1D1580002C64BB17AD8E0A1ADCFC54A56895366CABAA3BD0DFFE68`.
Its first seven rows were run against the prior patch revision, whose SHA-256
is recorded separately; the three review-fix rows were run against this patch.

| Fixture | Pinned C | Patched C | Patched JS | WSL Clang 18 native `--threads 1` / `4` |
| --- | --- | --- | --- | --- |
| `capture-255-only.bend` (127+127+1=255) | emits | emits, byte-identical C | `7n` | `7n` / `7n` |
| `capture-boundary.bend` (127+127+1=255; 127+128+1=256) | rejects `an arity over 255` | emits | `18n` | `18n` / `18n` |
| `wide-captures.bend` (128+128+1 cut; 128+128+2 fork) | rejects same | emits | `36n` | `36n` / `36n` |
| `shared-boxed-captures.bend` (reusable 128-word captures holding a `String` box) | rejects same | emits | `6n` | `6n` / `6n` |
| `shared-dynamic-captures.bend` (same, with dynamically allocated `String` content) | not run | emits | `6n` | `6n` / `6n` |
| `wide-returns-residual.bend` (3×128 raw returns) | rejects same | rejects same | `6n` | not built |
| upstream `tests/run/fork_shared_flat.bend` (unaffected) | emits | emits, byte-identical C | `18`, `18432` | same / same |
| `dead-frame-slots.bend` (dead physical wide slot, live arity under 255) | emits | emits, byte-identical C | `11n` | `11n` / `11n` |
| `shared-dynamic-read.bend` (reads dynamic nested Strings after fork) | not run | emits | `31owned2owned` | same / same |
| `borrowed-across-cut.bend` (boxed list readers, wide captures, post-cut String read) | not run | emits | `91owned2owned` | same / same |

All nine new fixtures and the unaffected upstream fixture passed
`--check-only`. The nine emitted positive C files built with
`/usr/bin/clang-18 -std=c11 -O2 ... -lpthread -lm` and native exits were zero
on both thread counts. The unaffected upstream program's patched and pinned C
files are byte-identical (SHA-256
`55EA287230B9E32308CE2D731604951F72657B31961691F13EB48FB16970D546`).
The exact 255-word control's patched and pinned C are also byte-identical
(SHA-256 `CB9762192497493AC726137D44234BDB4852BBE5DD3DB6E7249CF384640A192F`).
The dead-slot control's patched and pinned C are byte-identical (SHA-256
`5C3CE81E0AE2732A0A972BC97676C0A469BC78BC9BEDE1B4167DF92647375EBE`),
whereas the earlier patch emitted a different C hash
`F18BF0444456015E13C947EAD1F875B57C541C7B0F405EE78AA568D12563F209`.
The patch applies cleanly to the pinned source (`git apply --check`). These
are finite output and native CPU checks, not an affine-ownership proof, GPU
test, full Native GUI export, or release acceptance. A broader ownership
matrix and GPU validation remain for adoption.

## Optional combined-stack run (2026-09-24)

[`combined-optional-receipt.json`](combined-optional-receipt.json) records a
fresh `--no-hardlinks` disposable compiler at the exact clean pin with final
001, 002, and 003 applied in order. It binds the three patch hashes, resulting
compiler source hashes, all nine fixture source/JS/C/ELF hashes, and output at
`--threads 1` and `4`. All nine checked and ran as JS; eight emitted and ran
as native Linux C with matching output on both thread counts. The three raw
128-word returns still reject C at `FID_ARITY_T[6]=384`, without an output
file. The one-thread runs exercise the CPU sequential drain path; they do not
prove every scheduler interleaving.

On that same combined compiler, the current `bend2/Native.bend` passed source
checking with 40 unsafe/foreign dependencies, then its C emitter reached the
480-second limit (`ETIMEDOUT`, supervised child `SIGTERM`) without producing
C. Its source hash was unchanged across the attempt. This is a timed-out
emission, not evidence of a memory failure, native graphical build, GUI run,
or GPU behavior. The ignored probe details remain under
`.artifacts/bend2/toolchain-patches/stack-optional-final/results/`.

## Maintenance and rebasing

Keep this patch after downstream patches 001 and 002 in an independently
reviewed disposable clone. They may change earlier compiler behavior, so
the original focused tests against the clean pin are kept distinct from the
combined receipt above.
On any compiler pin change, re-inspect `emit_fork`, `seg_open`, `val_box`,
`val_to`, ownership/borrow facts, the `FID_ARITY_T`/`FID_RESW_T` tables, and
`task_deliver` before refreshing the diff. Require 255/256 boundaries, wide
non-tail and parallel joins, nested dynamic boxes with sharing, an unaffected
fork, residual raw-return rejection, JS equivalence, native one/four-thread
execution, and device-specific validation before adoption. Do not silently
change the `WIDE` cap or the fork topology to make a test pass.
