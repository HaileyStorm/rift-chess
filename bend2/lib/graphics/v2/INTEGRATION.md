# Pro graphics expansion and third pass — local DRAFT integration

The reusable library owns these additions. All prior v2 modules and all prior
Law/Proof files remain unchanged; the two historical F32 presentation
candidates remain unfilled. The 12 expansion and eight third-pass declarations
and their proof bodies were copied byte-for-byte from the supplied third-pass
packet. They are DRAFT. The source scheduling equalities are not browser, native
runtime, or GPU-device correctness theorems.

The packet originally put `review-expansion/`, `review-third/`, and the two
top-level review documents at its portable root. The overview documents now
live inside their corresponding review directories, and those directories live
beside this document. The library carries its own API, design, evidence, reproduction
notes, visual studies and complete historical receipts. The packet's original
paths and commands in those receipts are historical provenance, not current
repository paths. Prefix their `review-*` references with
`bend2/lib/graphics/v2/` when running from the repository root. No archived
receipt was relabeled as local evidence. The original extracted packet remains
under ignored `.artifacts/intake-20260925/third/graphics-v2-pro-checkpoint/`.

The static demo's 12 compiled modules were regenerated from the current local
source closure using the clean pinned compiler under Node 24.12. The local
`review-third/demo/compiled/BUILD.json` hashes every current source closure;
`BUILD.pro-review.json` preserves the original Pro build receipt. Pro's raw
demo-build streams remain in `review-third/receipts/demo-build/`, while locally
regenerated streams use `review-third/receipts/demo-build-local/`. The compiler
itself was not patched. Relative imports in the demo, test fixture, and library
tools now point inside this package; the loopback server serves `.mjs` with a
JavaScript MIME type for real module workers. Windows finite-test gates use the
project's pinned Bun wrapper because upstream Node's `.bend` loader mishandles
backslash paths. The legacy test output strings that say “under Node” describe
Pro's original run, not the host used by a local Bun-wrapper rerun.

Run these from the repository root with `BEND_NO_TELEMETRY=1`:

```powershell
node bend2/tools/bend.mjs bend2/lib/graphics/v2/contracts/expansion/PROOF.bend --check-only
node bend2/tools/bend.mjs bend2/lib/graphics/v2/contracts/third/PROOF.bend --check-only
python bend2/lib/graphics/v2/tools/verify_expansion.py --output .artifacts/graphics-expansion-local
python bend2/lib/graphics/v2/tools/verify_third.py --output .artifacts/graphics-third-local
python bend2/lib/graphics/v2/tools/build_third_demo.py
python bend2/lib/graphics/v2/review-third/demo/serve.py --port 8979
```

In another terminal, `node bend2/lib/graphics/v2/tools/browser_http.mjs 8979`
exercises the independent HTTP module-worker protocol, compiled Bend fixture,
Canvas2D readback and failure/cancellation paths in installed Chrome. The
loopback demo is at `http://127.0.0.1:8979/review-third/demo/`. Its scene design
belongs to the example application, while the pixel functions and worker host
remain reusable. No GPU-device execution, browser performance commitment, or
Rift Chess application adoption follows from this library-only gate.

The original complete PNGs, source/negative-control receipts and native Linux
receipts are retained within the review directories for comparison. The latter
describe the Pro machine, not this Windows host. Current local receipts are
written under ignored `.artifacts/` and should be reviewed independently before
promoting any acceptance claim.

## Linux CPU and GPU device follow-up

The isolated Linux executor tested exact public source commit
`fb73a82b7a573cbfd46550a8edcee8a1bb4042f4` with the clean pinned Bend
compiler. Expansion gates passed 85/85; third-pass checks covered 24 closures,
19 syntax cases, four oracles and two rejected mutations. Native CPU output
matched emitted JavaScript for 24,576 expansion and 6,144 third-pass pixels.
The [host result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842031165)
reports Clang 19.1.1, NVRTC 13.0.88 and an RTX 5090. Explicit GPU offload
matched all 4,096 reference pixels. For the 16-frame 512-square coarse fixture,
every GPU-on/off run returned checksum `2162379048`. Median whole-process time
was 0.8150 s (one CPU worker), 0.4144 s (four), and 28.8019/28.6138 s for
GPU on with those worker settings. `nvidia-smi` observed the binary using about
502 MiB at 100% device utilization. The [fixture clarification](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842302700)
binds the run to an ignored copy of `NativePlanWork.bend` that changed only
`Plan.render` to `Plan.render_offload` (copy SHA-256
`451705163f054dab948e035c84e004a7b06c68f1bcdff59f2b6f3a6328098b7e`).
The `NativePlanCpu1` entrypoint requested **one fork level**, exposing at most
four device branches before serial raster work. Python timed each entire
process, including startup, scene preparation, 16 render/checksum rounds and
output; there were no warm-frame or transfer-phase timers. This verifies
actual device execution but is an intentionally poor basis for choosing GPU
detail automatically. It does not establish that a correctly forked renderer
is slow, nor a game/browser GPU speed result. The ignored host-local benchmark JSON has SHA-256
`b5af2c5e9ab5d79440d22856c4a21d2d5a98b6b7481c47a2c2d34fa9836b1aae`;
its exact Linux path is recorded in the linked handoff.

### Phase-separated CPU pilot and CUDA build correction

The [instrumented CPU receipt](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842725462)
uses source `ffd33a0`, an exact 64-command 512-square fixture, one historical
cuts/forks `3/1` case, and a fixed cuts-7 fork sweep at 1/3/5/7. All 25
route/case executions matched the serial first-frame pixels and 16-round
checksum `2162379048`. For the 15 warmed render-return calls, the historical
case took 715 ms serial, 719 ms on one CPU worker, 413 ms on four, and 411 ms
with the `!` CPU fallback on four. Cuts 7/forks 5 took 752, 733, 387 and
541 ms respectively in those same routes; preparation was 1–4 ms at the
clock's resolution. These are one host pilot, not stable medians or game frames.

The first pilot's device build was stopped before execution: its Clang command
omitted Bend's `BEND_CUDA` define, so `gpu_probe()` would choose CPU fallback.
The coordinator grant was only queued/denied and no device workload ran. In
source commit `dc8af02`, the runner was corrected to mirror the pinned CLI's
CUDA flags and require a `.gpu` sidecar. The original CPU-only receipt remains
CPU evidence; it was not reclassified as a device result.

### Phase-separated RTX 5090 device pilot

The [corrected Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842986555)
used a clean 2.0.27 pin, Clang 19.1.1 and CUDA 13.0 on an RTX 5090. A fresh,
monitored coordinator lease covered one pilot and was released. The generated
CUDA binary carried `-DBEND_CUDA=1` and a `.gpu` sidecar; `nvidia-smi` observed
its processes (498–502 MiB). All 25 CPU and 35 device case executions matched
the serial first-frame pixels and the 16-frame checksum `2162379048`. This is
actual device execution, unlike the first instrumented CPU-only pilot.

Each case prepared one exact 512-square, 64-command scene, rendered its first
frame, then performed 15 warm render/checksum rounds. The following are **one
run**, in milliseconds; warm columns are the sums of 15 calls. `cuts/forks`
controls spatial subdivision and the depth of explicit `!` work, respectively.

| Four-worker route | Cuts/forks | First render/checksum | 15 warm render/checksum |
| --- | ---: | ---: | ---: |
| CPU | 3/1 | 43/1 | 414/9 |
| GPU | 3/1 | 1769/8 | 26533/132 |
| CPU | 7/3 | 26/0 | 408/12 |
| GPU | 7/3 | 132/12 | 1974/255 |
| CPU | 7/5 | 25/1 | 389/13 |
| GPU | 7/5 | 54/21 | 766/400 |
| CPU | 7/7 | 36/1 | 426/18 |
| GPU | 7/7 | 23/93 | 347/1552 |

At cuts/forks `7/7`, GPU warm render-return averaged 23.1 ms instead of the
historical `3/1` case's 1768.9 ms: the insufficient fork depth explained much
of the earlier result. But host checksum traversal rose to 103.5 ms per frame,
versus 1.2 ms on four CPU workers. The two measured GPU phases together still
averaged about 126.6 ms, versus 29.6 ms on the CPU route at `7/7`. Render-return
includes device synchronization but need not include deferred page migration;
checksum measures host traversal of
the returned image. The pinned C runtime uses GPU-preferred managed allocation;
device-to-host page migration is a plausible explanation for the expensive
checksum, **not** an independently measured transfer time or established cause.
Next isolate that boundary with a source-bound transfer/readback probe before
changing automatic detail policy or library code. Exact pixels were compared
only for the first frame of each case; the remaining 15 were checked by a
32-bit aggregate checksum. These timings say nothing about browser frames or
the full game. The [benchmark README](bench/gpu/README.md) defines the fixture;
the library renderer and Laws/Proofs were not changed.
