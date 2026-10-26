# Detailed background during camera rotation

The browser now retains the 512px Bend-authored Observatory plate during an
atlas camera preview. The board still uses its fast 256px raster; authored
pieces and their alpha picker remain nearest-filtered at 512px. Settled
rendering is unchanged.

`worker-v2.ts` caches the theme's 512px plate at the existing background
invalidation boundary. The existing `replaceRetainedBackground` primitive
replaces only image nodes that the immutable Bend board painter retained from
its base. Newly painted board nodes stay intact, including painted leaves
whose colors happen to equal the base. No new rasterizer or persistent
cross-frame geometry cache was added. The proxy fallback retains its existing
128/256px path.

## Actual application evidence

Base: `36af3fb48914f3897f8582a9da4ebaeba45ae9fd`. Candidate worker SHA256:
`72f84b6f0922258b618170755bbe90bbcf894e40f5a78e065e71e018b0ba9f00`.
The source-bound candidate package is `b9292420f66a6d7eba15`, build manifest
SHA256 `fe9efa47065fabaa21483e8d4c2d18e7e8933e0ccb8c007411cc2bc7c566fb6d`.
The exact unchanged Bend Scene, Controller, Menu, formal dependencies, artwork,
prepared initial ground and helper bundle were reused; only browser bundles
were rebuilt. No compiler, kernel or proof execution was repeated.

One paired actual Chrome 155 drag/release journey selected the g1 knight,
rotated continuously using trusted pointer input, released, selected b1 using
the displayed alpha mask, and observed the completed detail result. The latest
pointer and release reached the Worker, game history stayed unchanged, and the
initial and settled canvas pixels matched exactly. The released preview
changed as intended. Both actual preview PNGs were visually inspected.

| Observed moving-frame median | Base | Candidate |
| --- | ---: | ---: |
| Request to canvas | 43.05 ms | 50.30 ms |
| Pointer to canvas | 51.10 ms | 62.20 ms |
| Ground work | 13.75 ms | 15.80 ms |
| Sprite work | 17.50 ms | 19.40 ms |

There were 30 observed base moving frames and 27 candidate frames in this
finite journey. These variable-load observations support retaining the visible
quality improvement, not a speedup or stable performance claim. All original
browser/parent handles settled and the loopback server closed. No unit or
integration tests, synthetic policy forcing or scenario matrix were added.

Original ignored evidence under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

- `orbit-sharp-backdrop-20261025-disposition.json`
- `orbit-sharp-backdrop-20261025-build-supervisor-r1/terminal.json`
- `orbit-sharp-backdrop-20261025-journey-supervisor-r1/terminal.json`
- `orbit-sharp-backdrop-20261025-journey-r1/result.json`
- `orbit-sharp-backdrop-20261025-journey-r1/base-released-preview.png`
- `orbit-sharp-backdrop-20261025-journey-r1/candidate-released-preview.png`

## Scope and limits

A full 512px board preview was also evaluated and rejected: its observed
request median rose from 29.00 to 83.80 ms, with a 107.55 ms pointer median.
The retained change sharpens the background without that board cost. An
earlier axis-clipping optimization was rejected and its source restored
exactly because it demonstrated no useful latency benefit.

The evidence script now captures the immediate canvas instead of waiting for
a locator screenshot, compares a click with its actually displayed mask, and
recognizes completed detail retained on a later ordinary frame. This removes
stale timing assumptions; it neither forces product timing nor requests an
extra refinement. Original failed attempts remain historical evidence.

Stable latency, sustained/physical memory, constrained devices, owner visual
acceptance, native/device results and compiler adoption remain open. Frozen
Laws, the accepted 2.0.27 pin, balanced parallelism, original GPU failure and the
TypeScript application outside `bend2/` are unchanged.
