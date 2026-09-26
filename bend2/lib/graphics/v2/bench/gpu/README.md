# Native RenderPlan profiling fixture

This fixture isolates the exact 512-square coarse render from
`bench/NativePlanWork.bend`: the same depth-5, 32-square procedural texture, 64
mapped affine commands, target depth 9, and 16 seed-stepped render/checksum
rounds. It times texture/command setup, each RenderPlan preparation, the first
render call, each of the 15 subsequent calls, and the post-return image
checksum separately. The first call is not preceded by an offload warmup.

The first case keeps the historical `cuts=3, forks=1` shape. The remaining
cases share a `cuts=7` plan and sweep runtime fork depth 1, 3, 5 and 7; this lets
the deeper settings expose more plan branches while keeping the plan itself
fixed within that sweep. Every case checks the first returned 512-square image
pixel-for-pixel against the serial RenderPlan result and requires the frozen
16-round checksum `2162379048`.

On Linux or WSL, build the C binary and run serial, one-worker CPU, four-worker
CPU, and explicit-offload CPU-fallback rows with:

```sh
python3 bend2/lib/graphics/v2/tools/profile_gpu_plan.py \
  --output .artifacts/gpu-plan-profile/cpu-run
```

Only when an appropriate GPU host is available, add `--gpu` to build the
compiler's GPU sidecar and run the offload path on the device. The runner
mirrors pinned `bend2/main.ts` with `-DBEND_CUDA=1`, the CUDA include/library
paths (`CUDA_HOME` or `/usr/local/cuda`), `-lcuda`, and `-lnvrtc`; it rejects
a missing NVRTC header or missing `.gpu` sidecar. A plain Clang build can
silently take the CPU fallback even when asked for `--gpu on`, so it is never
device evidence. By default this
does one GPU run with four host workers; request both historical host settings
with repeated `--gpu-threads` flags:

```sh
python3 bend2/lib/graphics/v2/tools/profile_gpu_plan.py \
  --output .artifacts/gpu-plan-profile/device-run \
  --gpu --gpu-threads 1 --gpu-threads 4
```

The script refuses to overwrite an existing non-empty output directory. It
retains the compiler/build commands, raw stdout and stderr, source/import
closure hashes, C and binary hashes, run commands, process wall time, CPU and
OS metadata, compiler version, and available `nvidia-smi` device identity in
`summary.json`. The wall time includes process startup and is recorded only as
context; comparisons use the in-process `IO.now()` phase measurements.

`render_return_ms` includes work and synchronization until
`Plan.render_offload` returns an `Image`. The pinned CUDA runtime uses
GPU-preferred managed memory, so returning an image does not prove its pixels
were migrated to the CPU; host access can fault pages during `checksum_ms`.
These source timers cannot distinguish GPU compute, migrations, and CPU
traversal by themselves. `checksum_ms` measures the host-side quadtree checksum
after the image has returned. `serial_reference`
time is also reported separately and is outside the render samples. The first
offload timing includes first-use device/runtime initialization; the next 15
calls are the warmed sequence.

The serial pixel comparison covers the first frame of every case; the checksum
guards the complete 16-frame sequence. This is a single native workload, not a
browser frame benchmark or a general GPU performance claim. The JavaScript
backend ignores `!`, and Windows has no upstream native target; use Linux/WSL
for native measurements. No GPU result is produced by a source check or a
`--gpu off` fallback run.

## Two host traversals of the same returned image

The separate `PlanReadback.bend` fixture keeps the 512-square, depth-9,
64-command scene, cuts/forks `7/7`, 16 seeds and frozen checksum from the
profile above. For each rendered image it times the first complete host-side
quadtree checksum, calls `IO.now`, then times a second complete checksum of
**that same image without another render**. It requires the two checksums to
match on all 16 frames, exact first-frame pixels versus the serial renderer,
and the frozen aggregate checksum. The companion runner uses the same clean-pin
source-closure and CUDA-sidecar checks, with a smaller CPU/one, CPU/four,
offload-fallback/four, and optional device/four sweep:

```sh
python3 bend2/lib/graphics/v2/tools/profile_gpu_readback.py \
  --output .artifacts/gpu-readback/cpu-run --cc clang-19
python3 bend2/lib/graphics/v2/tools/profile_gpu_readback.py \
  --output .artifacts/gpu-readback/device-run --cc clang-19 --gpu
```

The GPU run needs a fresh device grant and installed CUDA development/runtime
libraries. If first traversal is slow and the immediate second becomes fast,
that supports first-touch migration as a source of the delay; it does not
measure transfer time or prove that it is the only cause. A second traversal
also changes subsequent GPU residency, so compare each first-versus-second
pair inside the same iteration, rather than comparing this fixture's warmed
frame times to the original one-checksum sweep. NVIDIA's [CUDA 13 managed-memory
documentation](https://docs.nvidia.com/cuda/archive/13.0.3/cuda-driver-api/group__CUDA__UNIFIED.html)
explains that device-preferred allocation can migrate on host access; the
[Nsight Systems guide](https://docs.nvidia.com/nsight-systems/UserGuide/)
describes CPU page faults and device-to-host managed-memory transfers as
independent profiling evidence. The fixture passed a pinned Windows source
check, emitted C from its source-bound closure, and ran all 16 rounds in the
local WSL CPU/four route with matching first/second values and the frozen
checksum; its two host traversals took about 2–4 ms each in that one run.
At the Windows source/WSL CPU checkpoint, the native CUDA device gate had not
run. This is a falsifiable diagnostic, not a performance fix.

The subsequent [leased CUDA result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843393565)
passed the source-bound 16-frame fixture on an RTX 5090. For the GPU-on route,
the first host traversal of each returned image took 84–99 ms (median 97 ms),
while the immediate second took 2–4 ms (median 2.5 ms); all 16 pairs had equal
checksums. The CPU/four route's two medians were 1 and 0 ms. No page-fault
profiler was available, so this is indirect first-touch evidence, not a
measured migration cost. The old CPU-only pilot remains separately classified.
