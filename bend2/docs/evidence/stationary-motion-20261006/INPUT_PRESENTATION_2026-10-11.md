# Actual gameplay input-to-canvas observation

One local desktop journey used the exact retained `knight-anatomy-host-r1` package
(`build.json` SHA256 `7bd86a519ab1ded518ead471b507f9e5e959f5492f8e3a93fac69b49a285c77d`).
It started a human match, played e2-e4 and e7-e5, carried the e4 pawn with a
platform Shift, then held and released an orbit. Saved command identities and
the retained view matched the actual rendered application. No unit/integration
suite, scenario matrix, formal/native run or new compiler/package copy ran.

Windows x64, headless Chrome 154.0.8037.98, viewport 1280x800, device scale 1,
canvas raster 1024x640 with array-buffer presentation.
Fresh browser context and local assets; filesystem caches were not flushed.
Power and background load were not controlled. Initial camera yaw 345,
pitch 67, zoom 115, default theme. Timing uses the page performance clock from
trusted event timestamp through the original canvas draw completion. A next
rAF is only a paint opportunity, not physical scanout.

| Actual input | First feedback draw | First committed revision draw | Settled animation draw |
| --- | ---: | ---: | ---: |
| Select e2 | 53.4 ms | — | — |
| Move e2-e4 | 49.8 ms | 251.0 ms | 372.3 ms |
| Select e7 | 40.9 ms | — | — |
| Move e7-e5 | 43.0 ms | 218.2 ms | 359.6 ms |
| Select Shift tile | 42.7 ms | — | — |
| Carry Shift | 31.4 ms | 287.4 ms | 391.9 ms |
| Orbit drag | 248.4 ms | — | — |
| Orbit release | 16.2 ms | — | — |

NEW MATCH feedback took 124.3 ms and START took 151.9 ms. The first ordinary
drawable boot frame arrived at 1.212 s and the first detailed atlas frame at
2.400 s (1.187 s later). The orbit drag spent 62.1 ms constructing the knight
pose and 103.1 ms painting the preview; its complete Worker port work took
186.6 ms. Committed move/Shift frames spent 121.7–140.7 ms in Bend computation.
The page-only heap snapshot was 13,247,831 bytes and excludes Worker/native/GPU
memory. These observations identify work worth improving; they do not establish
stable p95, physical-device performance, memory acceptance or a paired 30%
improvement.

Original r2 execution terminal SHA256:
`17a01e6f0667942887268332f902a4c5bc7ddefef4f4b6aaa2c87cc48819640f`.
Its original Chrome, server, Popen streams/handle and checked Job closed with
exit 0, no errors, no forced cleanup and no uncertain execution. The original
result is 50,467 bytes. The first run exceeded its evidence size bound after
gameplay; its failure terminal and captures remain unchanged, with known closure.

The r2 online correlator expected unqualified input names, while production
transports `ui/Types.PointerDown/Move/Up`. Its null matches are not evidence.
Independent disposition matched all 28 trusted events to the unique unused
eligible constructor/order/time before send, including orbit-down queued across
two observation labels. Request coordinates were not retained, so this is an
ordinal/time correlation rather than independent coordinate comparison. No
original receipt was rewritten, and no browser rerun was made for this erratum.

The original package metadata has the source-role erratum documented in
`KNIGHT_ANATOMY_2026-10-11.md`; fresh Scene/Controller source identity comes from
that reviewed disposition, not the historical build.json revision label.

Reviewed private disposition: `.artifacts/bend2/2035-preview/stationary-motion-20261006/input-presentation-disposition-r2.json`
SHA256 `aa17f10caff4f5cb2a0a0efb1de39b0097b94a846e9d0eccfc5199424f5e51b5`.
Transient measurement evidence received a reasoned Shared Memory skip. The
full Goal, formal proofs, native/STOP limits and remaining acceptance stay open.
