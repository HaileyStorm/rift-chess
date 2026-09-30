# Bend 2.0.32 cache-only browser loader candidate

`loader.mjs` maps only the four explicit selected `.bend` entrypoints to bytes
from a separately verified 2.0.32 cache set. An unexpected `.bend` import
fails closed; this plugin never compiles Bend or falls back to the pinned
2.0.27 caches. Run `node bend2/toolchain-patches/2032/browser-loader/test.mjs`
for the pure mapping and negative controls.
`bun run bend2/toolchain-patches/2032/browser-loader/bundle-synthetic.test.mjs`
also asks real Bun to bundle the actual `worker-v2.ts` entrypoint with
synthetic selected exports. It does not execute the resulting Worker.

The loader alone is not attached to `build.ts` or the prepared-ground emitter.
No real emitted-cache Worker has yet been executed in a browser. The
canonical 2.0.27 loader and published
TypeScript application are unchanged. The cache-set verifier must independently
validate source/compiler bindings and JS bytes before passing a set here.
Its synthetic positive establishes internal consistency, not that arbitrary
self-consistent bytes came from Linux. The real-bundle entrypoint additionally
pins the four raw manifest paths/hashes, JS hashes and byte counts from the
independent [Linux emission](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5901345715)
and [path readback](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5901585228).

`bundle-real.mjs` is a separate candidate for bundling the actual worker and
sprite-helper source through four explicitly named, verifier-approved cache
manifests. It takes `--menu <manifest> --controller <manifest> --scene <manifest>
--chrome <manifest>` in any order and retains only two JS bundles plus a
byte-bound receipt under ignored `.artifacts/bend2/2032-browser-probe/`.
Run it with the repository-local Bun 1.4.2 executable; it rejects a runtime
outside `.artifacts/toolchains/runtime`, a redirected runtime directory, or
a different pinned version, and records the executable hash. Run
`node bend2/toolchain-patches/2032/browser-loader/runtime.test.mjs` for the
redirected-runtime negative control.
The prepared-ground constants are intentionally empty so this is not a full
`build.ts` distribution or a browser run. Do not infer application parity or
release readiness from a green bundle. The selected Bend caches are bound to
source `6c795db`; if the bundler runs at a newer HEAD, its TypeScript Worker
sources are from that newer revision. The receipt records both, so the result
is explicitly mixed-revision until a rendered compatibility check and a
source-bound full build are completed.

The [single Linux real-cache bundle result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5904459791)
closed a prior missing-local-Bun admission stop through a verified no-overwrite
copy of the host's existing Bun 1.4.2 into the isolated clone's ignored
runtime. At clean source `81de054` using the four exact source-`6c795db`
caches, the synthetic Bun check and the real bundle both exited 0. The real
bundle's manifest SHA-256 is
`d6df02c1264589ac886775acc1c9f8713e1b34d7e9daf2752290e6a1a9481f3a`;
sprite helper: 110,863 bytes,
`9b491c34c725123a770b7de3fba7422d3440a73bca8582abf16de82076f19f79`;
main Worker: 427,262 bytes,
`53e040e062ef7b2d37c81e6cd30de2e18c8c9b91c9852e1bfa18d46b627225a2`.
The host reports zero network calls, 164,108 KiB peak RSS, final manifest
verification and released claim. No browser page, interaction, prepared
ground, bot library, GPU/native run, or pin adoption follows from this.
