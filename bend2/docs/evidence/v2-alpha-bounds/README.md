# Data-derived sprite bounds: local candidate

Front remains the existing 65° preset (`Camera.View{0,65,z}`); the default
oblique view remains 67°. A proposed 75° Front was rejected as too near
top-down. This change only reduces the work of drawing the fixed-facing
sprite artwork; it does not change camera projection, piece placement,
proportions, palette, shadows, or source pages.

`SpriteBounds.bend` derives the nonzero-alpha envelope from each immutable
texture mask. The game scene's positive axis-aligned sprite matrices use a
conservative two-source-texel and two-destination-pixel margin. Empty masks
need no drawing. Zero opacity and empty clips return the target; non-axis
matrices and size/depth-inconsistent public textures retain the original
generic affine draw. The library `PieceSprites.draw` API stays unchanged.
This is not a hardcoded envelope for the currently pinned atlas.

Under the clean 2.0.27 compiler pin, the focused exact-mask test matched all
twelve decoded interactive sprites against the RGA2 source alpha bytes and
four arbitrary-mask controls. A separate full-output-pixel differential
passed 66 old/new cases at 64 and 128 pixels, including all twelve real
sprites, varied backgrounds, subpixel offsets, partial clips, transparent
and opaque synthetic masks, downscaling, rotation/negative/singular fallbacks,
zero opacity, and a deliberately inconsistent texture. The focused
`BoardSceneSpriteTest.bend` also passed. Local Bun timings from those small
cases are diagnostic, not a full scene speed claim.

Two real-Chrome paired runs compared clean hosted-baseline-equivalent local
build `3616886e4d25f31c6943` with draft candidate
`b5022e026e9bf6904c29`. Both served manifests and all 21 listed assets
matched their local bytes. The complete canvas PNG bytes matched at startup,
after e2–e4, and at 65° Front in both orders. Candidate same-ground e2–e4
piece time was 496.4 and 491.7 ms versus baseline 1,296.6 and 920.9 ms;
initial piece time was 681.8 and 750.2 ms versus baseline 1,197.8 and
992.1 ms. Front piece time was 500.4 and 475.2 ms versus baseline 883.3
and 832.5 ms. These are local browser samples under variable host load,
not latency percentiles or native CPU/GPU results. Ignored screenshot and
run directories are `.artifacts/bend2/ground-cache-parity-RZ3lnK/` and
`.artifacts/bend2/ground-cache-parity-RkZPzX/`.

The candidate's locally served, exact-build-bound real-Chrome matrix at
`.artifacts/bend2/playtest-stage2/alpha-bounds-20260928/summary.json`
passed 24 scenarios and 685 checks with zero defects. The original
TypeScript application separately passed 62 tests and a production build.
The tested draft build manifest SHA-256 is
`f47834742abe77fcb71835fca6219383b2c4538b83315e0b021b8a0a51e88347`.
The subsequent non-draft build verified the frozen semantic and graphics
manifests and produced the identical content version and all identical file
hashes; its new manifest SHA-256 is
`4125176cd73d954c7d23303bd0611f0d0cc83b3d84d6090f1629214efd1ae216`.
Its `sourceRevision` is the previous committed HEAD because this was built
before committing; the content version and selected-source cache binding
include the candidate's edited files. The subsequent source commit
`c986e3ffbbf747504dccb7315d8b0bce69554894` was pushed, and its clean
non-draft build retained the exact same content version and file hashes;
the final source-bound `build.json` SHA-256 is
`fd31e49a1b404bddfba425f6230a89c56f86fa27e0d43e05bb541120b530205f`.
Its exact-build-bound local smoke passed three rendered scenarios and 37
checks with zero defects.

The unrelated full frozen-v2 checker was intentionally interrupted before a
receipt when physical free memory fell to about 2 GiB during its large proof
entry. It is not recorded as a pass or a failed law. The non-draft browser
build's frozen-manifest verification is narrower than a fresh aggregate proof.
An attempted current-source `NativeV2.bend` check-only run was likewise
stopped without a verdict when physical free memory fell to about 166 MiB;
it recovered after stopping the owned process. Do not infer a native build
failure or retry that large check on this memory-constrained Windows host.

## Hosted preview

The separate [Bend preview](https://haileystorm.github.io/rift-chess-bend2/)
was published at Pages commit `2af56181b2e5b83fe724b9b82abae2cdda3e2d68`.
Pages reported `built`; the live verifier matched the source-bound manifest,
all 21 listed Bend assets, and both unchanged original-site baselines.
The ignored receipt is
`.artifacts/bend2/publication/2026-09-28T22-50-59-887Z-9dbb0d33/receipt.json`,
SHA-256 `9cdf61ae365ce56bcb4b9ce66c7ea449568472ad410bfe88990931aef409d31b`.
Seven exact-build-bound hosted real-Chrome scenarios passed 65 checks with
zero defects: desktop start, corrupt plate fallback, camera, persistence,
mobile, import gesture guards, and touch import replanning. The ignored
summary is `.artifacts/bend2/playtest-stage2/alpha-bounds-hosted-20260928/summary.json`,
SHA-256 `1d0a0227936e10b83cf999b468eac722686d881932672502c732740b5061bd62`.
The full 24/685 result binds the local same-content candidate, not a new
hosted full-suite run. Browser measurements do not establish native CPU/GPU
speed, a repaired 250 ms CUDA window, physical audio or owner visual
acceptance. The [Linux CPU reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5880067534)
reports a passing candidate on older `a7895fb` source; a separate
[CPU-only request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5880290631)
now targets this `c986e3f` source. No new GPU lease or 2.0.28 pin
is inferred.
