# Direct board Canvas composition

The browser Worker now composites its owned 512-square board canvas directly
into the final output canvas. It previously created an intermediate ImageBitmap,
immediately drew that bitmap and closed it, then created the final transferable
bitmap. The borrowed canvas stays inside the same Worker and is consumed
synchronously. The complete opaque background redraw, nearest sampling,
placement, picking, resolution and final ImageBitmap transfer are unchanged.
There is no additional compatibility mode or retained intermediate bitmap.

One actual repack and one ordinary orbit journey completed on Windows with
headless Chrome 156.0.8078.79, a 1280x800 DPR1 viewport and 1024x640 output. Normal
policy and uncontrolled host load were retained. The existing journey delivered
96 trusted two-CSS-pixel moves; 88 produced fresh frames, including 70 changed
views. All original browser, server, Node and supervisory handles settled without
signals or retries. No runtime/request errors or Canvas fallback occurred.

The initial, held and settled PNGs have exactly the same bytes, dimensions and
Bend views as the preceding texture-readiness run. Root inspected the held view.
The browser repack reused the accepted Bend controller/menu/scene emissions and
assets; it performed no compiler emission, network call or subprocess call.

## Timing scope

The complete request-sent to main Canvas draw-end endpoint was selected for the
processing comparison before this change. The table uses every fresh motion
frame, including first frames and outliers, with nearest-rank percentiles.

| p95 interval | Previous 94 frames | Direct Canvas 88 frames |
| --- | ---: | ---: |
| Request sent to draw end | 35.6 ms | 24.8 ms |
| Worker callback arrival to publication | 31.8 ms | 17.7 ms |
| Input capture callback to draw end | 49.6 ms | 28.5 ms |
| Trusted event timestamp to draw end | 75.0 ms | 44.5 ms |
| All fresh-frame spacing | 49.4 ms | 32.1 ms |
| Changed-view spacing | 93.5 ms | 48.0 ms |
| Actual trusted-input spacing | 49.4 ms | 26.1 ms |

The 33.3 ms p95 processing budget was met in this observation. Three of 88
requests exceeded it; the maximum was 82.3 ms. The median increased from 6.2 to
9.2 ms. The first frame contained 80.3 ms between Worker arrival and publication;
this outlier was retained. Input-to-RAF p95 was 62.7 ms; RAF is a callback proxy,
not physical display presentation.

These uncontrolled sequential observations do not establish a guaranteed causal
speedup or stable 30 Hz changed-view delivery. The previous intermediate-transfer
metric was removed with that operation; remaining composition work is included
in the complete request path. Higher resolution remains unaccepted. Native/GPU,
formal proof, production compiler selection and hosted publication are separate.

## Original identities

The product binds base commit `4613983dc7fef443cebcd466aacd89ef7ed6dd29` plus
these exact working inputs; the base is not misrepresented as containing them:

- CanvasPreview: `5328ee7fd8ee318e8e2997595c6696569321a53bd8d5773caf1535792709c5ec`.
- Image port: `0921954f5288c36344899cff2d61c53dbb9ec7b0c901013f6a726c827d5cb30e`.
- Worker: `a312c8f6fede3400252edd1116b0bd19ff98b7ab57d754660abe12b3aef4be81`.
- Boundary: `44645398a41397d5119b35a8617dce5b94ea5609f1ff316f510ae3981d061952`.

Product `build.json` SHA256 is
`f6c8c8e64abf2b6ec6fed3d63e70c993c80597f4a8243d154f8f4111ea649f85`,
version `c4c2c88e56eadcf76b26`. The original joined supervisory terminal is
`81a083e37e62f3cb65992c2c73b397ce2daf12a6f9f026fb7080c2af64d90dfe`.
Original private streams, views, requests, frame timings and process settlement
remain retained; no old failed or consumed record was rewritten.
