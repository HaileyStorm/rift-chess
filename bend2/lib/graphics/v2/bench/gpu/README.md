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

`render_return_ms` includes everything needed for `Plan.render_offload` to
return a usable `Image`, including any device-to-host transfer the runtime
performs. Bend source cannot split that transfer from device execution without
instrumenting the compiler/runtime. `checksum_ms` measures the separate
host-side quadtree checksum after the image has returned. `serial_reference`
time is also reported separately and is outside the render samples. The first
offload timing includes first-use device/runtime initialization; the next 15
calls are the warmed sequence.

The serial pixel comparison covers the first frame of every case; the checksum
guards the complete 16-frame sequence. This is a single native workload, not a
browser frame benchmark or a general GPU performance claim. The JavaScript
backend ignores `!`, and Windows has no upstream native target; use Linux/WSL
for native measurements. No GPU result is produced by a source check or a
`--gpu off` fallback run.
