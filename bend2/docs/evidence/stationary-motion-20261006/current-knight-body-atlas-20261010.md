# Current knight angular body atlas comparison

The private body chart remains unselected. Its default-view comparison gives
the ivory knight more visible shading and the navy knight blue/brass variation,
but texture distortion and baked-feature registration remain unresolved.
Broader views, independent sampling checks and cost screening are required
before considering integration. This is a subjective authoring experiment.

All 278 current face positions, normals, centers, bands, marks and ordering
remain exact. The chart covers 216 body triangles on both row signs; 24 mane,
30 pedestal and eight ear faces retain the current flat material. A shared
cache holds 117 physical chart vertices. Ten height guides map each elliptical
ring's front, side and rear into the original atlas. Generator-only angular
coordinates become constant UV values; runtime trigonometry is unchanged.
The two cap centers have explicit overrides.

These are authored guides, not recovered source-camera coordinates or physical
UV calibration. Signed source areas include 107 positive, 96 negative and 13
near-zero triangles; injectivity is not claimed. The two sides reuse source
lighting. The 23 marker QA records use an analytic height-interpolated mapping
and exact nearest-cell source alpha, rather than actual consumed F32 affine
or bilinear samples. Fixed marker ink and precedence remain unchanged.
Sampling uses original atlas RGB, linear filtering, alpha qualification at 128
and current ink as fallback for unsuitable samples.

The actual comparison uses the current compiled scene and packaged initial
position at yaw 345, pitch 67, zoom 115, theme 0. It produced one 512-pixel board
pair and a native 64-pixel sprite pair for each side. The disabled chart matches
the current scene's complete color and alpha data. The textured candidate
preserves complete alpha and authoritative picking data. Ivory changes 612
color pixels, navy 606; the composed board changes 1,760. The six PNGs and
renderer result total 1,127,584 bytes. Fetch calls were zero.

Both original executions exited 0 with verified membership, output EOF, closed
original process handles and self-only Job closure; neither became unknown.
The compiler's 372 input fences and renderer's 375 fences remained identical.
All four quiet compiler-wrapper children recorded actual exit 0. Observed peak
Job commit was 694,046,720 bytes for compilation and 414,932,992 for rendering;
these observations do not establish performance or a memory upper bound.

Current `KnightMesh.bend`: `db4def8865d00938ee41999a9d47cd9014c8fc755218fcf263cc9bd84901a6e1`.
Private evidence prefix under `.artifacts/bend2/2035-preview/stationary-motion-20261006/`:
`body-atlas-20261010-r1-`.

| Evidence | SHA256 |
| --- | --- |
| Candidate source | `24440235aca72284370d50c3f1ccdc8734f537c8698db9d6e4c5e4ebac8a11b5` |
| Compiled prototype | `d5013acbcafda3a0be63fe75f3615bfbcfa1fc20848c58faa1396a083dedf755` |
| Compile result | `040f882f8ba197ce5e52af2eb06c45a50dc244a9135a2470b3b19b0bd659c4a3` |
| Original compile terminal | `93ea220943b834c6fcf4dae219487c9569d713b88abca96c5070682f005d40ea` |
| Renderer result | `63fc3fc066f92623c414fa35a2d38f8bcb14035921450ae5bf0b54cd4c7ba09d` |
| Original renderer terminal | `101ac63919c7603b421db5b1183da5863ceeba2986d339f28b78ad0012adc910` |

This finite default comparison does not establish browser, device, timing,
arbitrary camera, compiler-adoption or full graphics acceptance. Production
geometry, atlas, selected scene/package, frozen controls and accepted compiler
pin remain unchanged. The prior mane-only and global body UV comparisons retain
their separate closed results and rejection; this angular chart does not revise
those historical outcomes.

## Maximum side-angle comparison

The material variation also survives one maximum positive side-angle check.
Root and an independent reviewer viewed both native sprite pairs. Face/body
variation remains stronger than the flat baseline, while neck bands and
eye/mouth registration remain imperfect. The candidate stays private and
unselected. An independent sampling reference is the next check; a bounded
cost screen is justified if that reference passes.

This uses world yaw 90, pitch 67, zoom 115, with the packaged initial position,
theme 0 and progress 16. Current `presentation_camera` maps world yaw to
`sin(worldYaw) * 30 degrees` and caps presentation pitch at 40 degrees. Thus the
nominal presented pose is +30/40 degrees. World yaw 165 would only produce
about +7.76 degrees, rather than reveal the backside. The unused yaw-165
preparation is retained under `body-atlas-opposing-20261010-r1-`. The fresh edge
preparation also corrected the unexecuted `fenceErrors` check from `[]` to the
actual `{}` before dispatch. No original attempt was replayed or overwritten.

The edge renderer reused the closed compiled prototype listed above. It changed
only the frame's world yaw, rendered four 64-pixel sprite PNGs and produced no
board or ground. Both sides passed disabled/current complete RGBA equality,
candidate complete alpha equality and unchanged public picking data before PNG
publication. Ivory changed 443 color pixels and navy 442. Four PNGs plus the
result total 20,833 bytes; fetch calls were zero.

The original renderer exited 0 with verified membership, output EOF, closed
handle and self-only Job closure, with unknown false. All 364 fences remained
identical. Observed peak Job commit was 265,314,304 bytes. Private evidence prefix:
`body-atlas-edge-20261010-r1-`.

| Evidence | SHA256 |
| --- | --- |
| Renderer source | `947596c94d158c446d59a10bfeb9f0d4e4687bac238689d46c9634ec71543acb` |
| Renderer result | `edd351fa70faef9a9a1f07161eea1917d1064ef39db149afea7b30e0965389a2` |
| Original renderer terminal | `8f7a5eb312ad53cc7fed07167a3c096d8e236c5839be891badd80d0697d0cc4c` |

The positive row component persists throughout the presentation yaw range;
this check establishes no backside or arbitrary-camera appearance. It adds no
browser, independent color correspondence, timing, device, production or
compiler-adoption acceptance.

## Independent selected-pixel reference: incomplete qualification

One offline reference read the four sealed native sprite PNGs and original RGA
payloads; it did not import the prototype, recompile or render again. It confirmed
all 278 original geometry/normal/center/band/mark/order fields, 216 body charts,
62 flat charts, 117 shared authored vertices at F32 and all 8,192 source atlas
pixels. Vertex correspondence checks the declared authored chart, not recovered
UVs or the renderer's actual consumed UV.

The reference selected categories before decoding the native PNG colors. Its
outward arithmetic intervals required stable containment, painter order, marks,
ancestor clipping, affine UV and integer filtering decisions. Trigonometric and
literal semantics remain conditional on the bound same-host JavaScript emitter;
this is not a certified cross-host numerical proof.

Fourteen selected category records, representing ten distinct view/side pixels,
matched exact final RGBA. They covered mane, brass/ear and partial silhouette in
both views, with one marker location in the positive-angle view. No body, crown,
alpha fallback, outside-UV or projected-degenerate category qualified. The
required body/crown coverage in every raster therefore failed: result `ok:false`,
`source-only-useful-final-pixel-qualification-insufficient`, original exit 1.
This provides limited independent correspondence, not acceptance of body color.

The original process, output streams, handle and self-only Job closed; 39 source
fences remained equal, unknown was false, network calls were zero. The result
was 56,956 bytes; observed peak Job commit was 105,279,488 bytes, not a bound or
performance claim. The candidate remains private and unselected; the cost screen
stays held while the body/crown correspondence gate remains unmet.

Unexecuted R1 preparation remains retained. Before dispatch, review removed its
unsafe projected vertex-bbox exclusion in additive R2, and bound the supervisor's
actual Python runtime. No failed native run was retried or overwritten.

| Private evidence | SHA256 |
| --- | --- |
| R2 reference source | `0cb75733abc432355865c61734fd5c33869a0e3a1f1b67422a52bfb064f1c0ed` |
| R2 generation | `2808ce2de3535808b478c9a30fa0cb781638d2946aac749da347736f69d87001` |
| R2 result | `51b85805793942dfd527bc3ad96ced75fec3e92c8e2fbb69c739a627aa8d722e` |
| Original R2 terminal | `8de167eb4e280c111563748e6e9b5b4a3788b49322c709b200dcdab4fb6969f2` |

These receipts live under the existing private stationary-motion directory,
using `body-atlas-reference-20261010-r2` and its supervisor prefix. A fresh
artifact census passed at 11,718,795,375 bytes / 10.914 GiB against 12 GiB; this
reference and its final metadata use the reserved 2 MiB allowance. No browser,
device, picking, visual material, production or compiler adoption claim is added.
