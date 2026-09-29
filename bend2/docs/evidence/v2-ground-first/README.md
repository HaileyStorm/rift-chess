# First detailed ground: source-bound phase probe

The one-entry settled-ground cache helps repeated same-view compositions but
cannot accelerate the first detailed frame. On hosted build
`b5022e026e9bf6904c29`, one desktop-start Chrome helper sample spent
389 ms decoding sprites, 705.7 ms constructing the first ground and
720.6 ms placing sprites; proxy-to-detail round trip was 2,387.8 ms.
These are variable-load measurements, not phase budgets or a latency bound.

`node bend2/tools/bend.mjs --run bend2/tests/ground-phase.ts` is a diagnostic
under the clean pinned 2.0.27 compiler. It binds the 786,437-byte astral
RGA1 asset SHA-256
`9d4701ca52957506ec58466fa7d63b49a8f6338bd257f5e8f9b69f76b67067bb`
and constructs the actual initial layout-B holes (`544`) at the unchanged
default `345°/67°/115` camera and 512px scene. Fifty-six present tiles are
drawn over the asset-backed observatory. It decomposes the same ground into
rail, tile corners, cast shadows, exposed walls, tops and rims, and compares
all 262,144 output pixels to the normal `ground_prepared` path. Its output
pixel SHA-256 on this Windows little-endian host was
`c74f70d837279273a85a8c5a6d166e7fa85b812dec050cffc45bea41523f0a6f`.

In one local Bun invocation, three whole-ground samples were about
1.13–1.49 s and tile work about 1.05–1.20 s, versus 0.10–0.18 s for the
rail. One exact manually staged tile pass attributed roughly 536 ms to
top facets, 306 ms to cast shadows, 133 ms to exposed walls, 58 ms to rims
and 2 ms to corners. These calls are sequentially timed in one process;
they overlap neither browser networking nor browser-worker dispatch. They
identify where the work is, not a speedup or a portable performance bound.

The existing compact `fast_ground512` plus the same rail took about 205 ms
locally but differed at 96,948 of 262,144 pixels (37%); it cannot silently
replace the authored detailed ground. A JSON encoding of the exact initial
detailed `Image` contained 252,929 quadtree nodes and 7,347,974 UTF-8 bytes,
or 842,736 gzip bytes. Local encode and parse were about 35 and 38 ms;
the parsed image matched all 262,144 pixels. A build-time-prepared initial
ground trades an extra compressed download, parse/memory and binding work for
avoiding the first tile draw. The source-bound path is now included in ordinary
v2-preview draft builds. `emit-default-ground.mjs` checks the selected Bend
controller boot frame, selected scene and asset hashes, decoded plate pixels
(`6f5b731fb579b5b9bda6c802c80db33b91d975f33a58d8f9344a0e290dff483b`),
and the Bend ground-equivalence key. The helper starts a digest of the actual
immutable Ready plate alongside sprite loading, fetches the prepared JSON only
on an exact match, verifies its byte hash and bounded shape, and otherwise
runs the original Bend ground method. The image and metadata are in the build
manifest and service-worker precache. A stale generation cannot retain the
loaded image in the loader promise, and a subsequent orbit can release it.

Isolated draft `8159` passed the entire local rendered matrix (24 scenarios,
685 checks, zero defects); subsequent drafts added the stale-job release and
reduced retained image trees. The ordinary promoted draft `9f286e79aa783280b9ef`
passed 11 focused real-Chrome scenarios with zero defects. Two order-reversed
local pairs on that draft had exact canvas PNG bytes at start, after e2–e4,
and at unchanged Front 65°. First worker ground was roughly 139–158 ms versus
650–679 ms for the prior published build; whole-page/round-trip timings varied
with host load. A 404 or tampered prepared asset fell back to the exact old
canvas, and a service-worker-controlled offline reload used the hashed asset
with exact pixels. Normal v2-preview packaging, byte-hash verification and
the source-bound phase probe also passed on the subsequent `12e233fd9c7ca2c09fe4`
draft incorporating the stale-job repair. A local paired Chrome run of this
draft again matched exact complete canvas PNGs at all three states and measured
130 ms first ground versus 704 ms in its baseline. The committed clean,
non-draft source `c8f8eee0e75b45867ec3b0b2046f601d32f17e05` built the
identical content version and all identical file hashes with `sourceDirty=false`.
Its exact-build-bound full local rendered matrix passed 24 scenarios and 685
checks, zero defects. The ignored summary is
`.artifacts/bend2/playtest-stage2/ground-first-clean-c8f8eee-full-20260928/summary.json`,
SHA-256 `e2b3ba393e9484002450831c7db01ecbb2e322eb6e6598d292963ab670b63254`.
The clean `build.json` SHA-256 is
`60ce496956f7c1b08f79ae486f05d07efe5655d310c165283713e7feddf81708`.

The added 7,347,974-byte CacheStorage entry raised measured local usage by
about 7.36 MB (approximately 10.13 MB total). First-visit service-worker
install may compete with foreground loading of that asset. Two order-reversed
fresh-context Chrome visits through a local counting HTTP proxy observed one
200 response of 7,347,974 bytes for the candidate prepared resource by both
the detailed frame and service-worker-ready points, not two transfers. Initial
detailed arrival took 4.23–4.35 s versus 4.56–6.35 s in those two local pairs;
the added proxy hop and variable host load make this diagnostic rather than a
hosted-network or portable latency bound. Earlier unproxied pairs had mixed
whole-page ordering. No physical low-memory device or universal speedup is
established. General per-view ground speed and native GPU evidence remain
separate open requirements. The separate Pages repository received commit
`c85f5dc1e57b2b2473f61801701b419a7112395e`.

## Hosted preview

The [Bend-only playable link](https://haileystorm.github.io/rift-chess-bend2/)
reported Pages `built` for that exact commit. The live verifier matched
`build.json`, all 23 listed files and two unchanged original-game baselines;
the required module MIME types passed. Its ignored receipt is
`.artifacts/bend2/publication/2026-09-29T01-43-07-174Z-cf242634/receipt.json`,
SHA-256 `795363353e32e1172a56ed6d30267934fcd1257f704cd0cfa3e22035eae88a19`.
Seven exact-build-bound hosted real-Chrome scenarios passed 65 checks with
zero defects (start, corrupt-plate fallback, camera, persistence, mobile and
two import-gesture cases). The ignored summary is
`.artifacts/bend2/playtest-stage2/ground-first-hosted-20260929/summary.json`,
SHA-256 `6c6eca1b81d305a10e5e222cbe8e3994f436cd1070e2a9c6aa218a8958a8a573`.
The 24/685 result is the local same-content clean build, not a full hosted
matrix. The 7.35 MB addition, variable cold timing, arbitrary-view speed,
low-memory devices, GPU, physical audio and owner visual acceptance remain
separate evidence requirements.
