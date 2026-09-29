# 2.0.32 selected-cache preview

`emit-menu.mjs` emits only the complete `moduleSpecs.menu` export set through
the reviewed explicit-root adapter. It reads the exact 001→002→005→phase2
derived compiler without changing the pin or live build tools, snapshots the
compiler/patch/helper and full menu source closure before loading, then checks
the same binding again before writing a manifest. Each run is serialized by an
exclusive lock and stored in a unique ignored directory under
`.artifacts/bend2/2032-preview/`; prior outputs are retained.

The Bun worker has a five-minute parent-enforced timeout and checks free
physical RAM against 2.5 GiB before load, before emission, and before writing.
If memory falls below the threshold, it stops; controller, scene, and chrome
are never part of this emitter.

The worker lease is created with exclusive-create semantics and records
`workerMayBeLive: true`; it is removed only after a matching file-identity check
and an observed worker exit. Timeout requests termination and then waits up to
ten seconds for exit. If exit is not observed, the lease remains and later runs
fail closed rather than reclaiming it. The manifest is written and verified as
a temporary file, then linked atomically to its final name without overwrite
only after source binding and output bytes are rechecked.

Run the provider-free lifecycle failure-injection checks with
`node bend2/toolchain-patches/2032/preview/lifecycle.test.mjs`. These tests do
not load Bend or emit the menu module.

Run with the repository-local Bun executable after checking the ignored target
and free physical RAM:

```powershell
& .artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe run bend2/toolchain-patches/2032/preview/emit-menu.mjs
```

This is one selected-library cache emission, not whole-app/browser, proof,
native, GPU, or toolchain-pin acceptance.

## Windows admission stop and lifecycle repair, 2026-09-29

The one pre-repair script attempt admitted `menu` at 3,079.3 MiB free, then
stopped after `book_load`/`book_valid` when free RAM was 2,060,591,104 bytes
(1,965.87 MiB), below the 2.5 GiB floor. It did **not** call `Comp.js_lib` or
write JS/manifest. The ignored run directory
`.artifacts/bend2/2032-preview/menu-2026-09-29T13-04-07-933Z-23312`
remains empty; its exclusive lock is absent. This is a capacity stop, not a
compiler/Law verdict or a run of the final repaired script. No retry was made.

Independent review then found worker-message-before-exit, partial lock-write,
and premature final-manifest risks. The final script delegates those paths to
`lifecycle.mjs`: worker success/error settles only after exit, uncertain
termination retains a `workerMayBeLive` lock, lock cleanup checks exact file
identity, and a verified temporary manifest becomes the final no-overwrite
commit marker only after the last source/output binding check. Root reran
`node bend2/toolchain-patches/2032/preview/lifecycle.test.mjs`; injected
timeout/error, partial write/fsync, existing lock, failed final binding and
no-overwrite cases passed without importing Bend or launching a real Worker.
The final emitter and worker source SHA-256 values are
`f7792e12783e125dd9c2ce7c4d239ef84b61b10a092aade4f0cfdfe1bea30282`
and `3a9cd0a5204539e60f3958213f90a5b4084d634937ac051086e0f128a2b0c497`;
the lifecycle helper/test hashes are
`91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8`
and `c576a60e1da6b5c40265c3b38c977e2063aa4e630469dd3e2b52abfb9cc5adcc`.
The 2.5 GiB checks are admission checkpoints, not a peak-memory bound.
