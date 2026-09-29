# 2.0.32 selected-cache preview

`emit-menu.mjs` retains its historical filename but now emits exactly one
explicit `moduleSpecs` key per run: `menu` by default, or `controller`,
`scene`, or `chrome` with `--module <name>`. Each key uses its complete named
export set through the reviewed explicit-root adapter; an empty, unknown, or
all-roots selection is not accepted. It reads the exact 001→002→005→phase2
derived compiler without changing the pin or live build tools, snapshots the
compiler/patch/helper and selected source closure before loading, then checks
the same binding again before writing a manifest. Each run is serialized by an
exclusive shared lock and stored in a unique ignored directory under
`.artifacts/bend2/2032-preview/`; prior outputs are retained.

The Bun worker has a five-minute parent-enforced timeout and checks free
physical RAM against 2.5 GiB before load, before emission, and before writing.
If memory falls below the threshold, it stops; it never implicitly advances
from one selected module to another.

The shared lease is created with exclusive-create semantics and records
`workerMayBeLive: true`. Before Worker start, an admission failure releases the
owned lease by file identity. Once a Worker starts, it is removed only after a
matching file-identity check and an observed worker exit. Timeout requests termination and then waits up to
ten seconds for exit. If exit is not observed, the lease remains and later runs
fail closed rather than reclaiming it. The manifest is written and verified as
a temporary file, then linked atomically to its final name without overwrite
only after source binding and output bytes are rechecked.

Run the provider-free lifecycle failure-injection checks with
`node bend2/toolchain-patches/2032/preview/lifecycle.test.mjs`. These tests do
not load Bend or emit a selected module.

Run with the repository-local Bun executable after checking the ignored target
and free physical RAM:

```powershell
& .artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe run bend2/toolchain-patches/2032/preview/emit-menu.mjs
node bend2/toolchain-patches/2032/preview/emit-menu.mjs --module controller --preflight-only
# A separate reviewed one-shot may use --module controller (or scene/chrome).
```

This is one selected-library cache emission per explicit invocation, not whole-app/browser, proof,
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
The historical 8096edc emitter and worker source SHA-256 values are
`f7792e12783e125dd9c2ce7c4d239ef84b61b10a092aade4f0cfdfe1bea30282`
and `3a9cd0a5204539e60f3958213f90a5b4084d634937ac051086e0f128a2b0c497`;
the lifecycle helper/test hashes are
`91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8`
and `c576a60e1da6b5c40265c3b38c977e2063aa4e630469dd3e2b52abfb9cc5adcc`.
The 2.5 GiB checks are admission checkpoints, not a peak-memory bound.

## Exact LF/CRLF source binding after Linux preflight stop

The [Linux source-acquisition receipt](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5896318403)
stopped before menu emission because patch 001's LF working file had SHA-256
`55949c2fe7f1faecb6d142079a2afa60a559d2a54ef165ba40d31968548be58d`
instead of the historical Windows CRLF SHA-256
`a067bd0fae6111e500f16db33697ed7f1347be7e20c4fb90d9996484489a1038`.
Both are the exact Git postimage blob `99a8e4df3603102ef03eb6fc2bd543a6f5fb61e1`:
the Windows source normalizes to the LF hash, and converting that blob to CRLF
reproduces the Windows hash. The upstream commit and four patch files did not
change; neither Linux attempt reached a Bun menu worker.

`compiler-eol.mjs` now accepts only the exact final 2.0.32 compiler bytes in
one consistent LF or CRLF mode, and rejects mixed endings, tampering, or a
different normalized postimage. The fixture test derives both modes from the
verified local checkout, so it also runs on a legitimate LF host. The emitter
includes the mode and actual byte hashes in its before/after binding, requires
a clean source checkout, and offers a read-only preflight:

```powershell
node bend2/toolchain-patches/2032/preview/compiler-eol.test.mjs
node bend2/toolchain-patches/2032/preview/emit-menu.mjs --preflight-only
```

The first command passed on Windows, including mixed/tampered/inconsistent
negative controls. The second requires a committed clean source checkout and
has not been run on Linux; it neither constructs a Worker nor writes output.
Current source SHA-256: EOL helper
`4bd8f6191b65fdfeb74372f95834fa6c4d017f0027162861b575c3dd428810e4f168`,
fixture test
`4931ac18016a4c1474aa77eb74372f87db428d346c09892ad3ec6c0e60c63412`,
emitter `93696fec322898f414d6478056d954884047cee2f5783a77f2e0a99c7a20266e`.
No menu JS/manifest or browser acceptance follows from EOL equivalence alone.

## One-module cache integration candidate

The post-202c0eb generalization changes only this versioned preview and its
worker, not `emit-selected.ts`, `selected-modules.mjs`, `loader-v2.ts`,
`build.ts`, the pinned compiler, or the published TypeScript application.
The preview keeps the historical `menu-emitter.lock` as its one shared lease
across all module names, plus one bounded Worker per explicit module,
names each output/manifest after that module, and binds its source closure,
export order, derived compiler EOL, and result bytes independently. `chrome`
is a diagnostic cache target; the current `worker-v2.ts` consumes controller,
scene, and MenuAA rather than `ChromeRaster`.

This source change has not emitted a full controller, scene, chrome or menu
module under 2.0.32. Preflight and source-only checks are distinct from
emission, production cache wiring, a rendered interaction matrix, GPU/native
performance, frozen proofs, a pin amendment, and owner visual acceptance.
