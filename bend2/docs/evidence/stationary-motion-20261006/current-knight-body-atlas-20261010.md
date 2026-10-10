# Current knight angular body atlas comparison

The private body chart remains unselected. Its default-view comparison gives
the ivory knight more visible shading and the navy knight blue/brass variation,
but texture distortion and baked-feature registration remain unresolved.
The selected-pixel reference below has passed. The current cost screen found
additional generation cost; broader material/view review and a cheaper sampling
path remain open before considering integration. This is a subjective authoring
experiment.

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
unselected. At this checkpoint, an independent sampling reference was the next
check, with a bounded cost screen conditional on its result.

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
was held at this checkpoint while the body/crown gate remained unmet.

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

## Additive numerical reference: selected-pixel gate passed

R3 refines the reference's arithmetic while preserving R2's original negative
result and the four-raster acceptance gate. Singleton basic operations now use
the bound host's exact JavaScript operation followed by F32 rounding; genuine
nonsingleton operands retain outward adjacent-F32 bounds. The independent
barycentric calculation represents projected F32 vertices and authored UVs as
exact BigInt dyadics, divides exact signed-area rationals, then rounds once to
F32 with nearest-ties-even. It still requires agreement with the source plane
on UV domain, source-cell indices and eight-bit filter fractions. Exact depth
ties retain original face order. Host trigonometry and literal conversion remain
explicit assumptions, rather than a certified cross-host numerical proof.

The same four sealed sprite PNGs were read without importing the prototype,
compiling or rendering again. Fixed row-major category selection preceded
decoding their colors. Each raster qualified body, crown, alpha fallback,
marker, mane, brass/ear and partial silhouette. All 28 category records,
representing 24 distinct view/side pixels, matched exact final RGBA; brass/ear
and silhouette share a selected location. The required body/crown coverage in
every raster passed. Outside-UV and projected-degenerate categories remained
unavailable. Qualification counts are not all-pixel color comparisons.

| World yaw | Sides | Selected body (x,y) | Selected crown (x,y) |
| --- | --- | --- | --- |
| 345 | Ivory and navy | (40,16) | (26,14) |
| 90 | Ivory and navy | (22,20) | (29,19) |

Source correspondence again confirmed 278 faces, 216 body charts, 62 flat charts,
117 shared authored vertices at F32 and 8,192 source atlas pixels. The original
reference exited 0 with verified membership, closed output streams and handle,
and self-only Job closure; unknown was false. All 41 fences remained identical,
stdout was 94 bytes, stderr was empty and network calls were zero. The sole
result was 99,140 bytes, below 128 KiB. Observed peak Job commit was 104,566,784
bytes, not an upper bound or performance result.

| Private R3 evidence | SHA256 |
| --- | --- |
| Reference source | `f0da55b36e0efeaac9e643a0922e991570bf4742ff31491b4a0399a013d55bb8` |
| Generation | `ea3c99747bcb9eaa5fedf026141e3aeed6088cb67d001948ae2ac3b36d7b4fdf` |
| Result | `643c16adcf9563d0b51956e166df7100c865fb8d8cb8a330ce41bd52b7cb9458` |
| Original terminal | `278632b5f43dc2c61a645661b05c93845e36af067a09733d9d93df0df56b6b25` |

The receipts use `body-atlas-reference-20261010-r3` and its supervisor prefix
under the retained private stationary-motion directory. The collected artifact
census was 11,719,194,826 bytes / 10.914 GiB against 12 GiB, with a 2 MiB metadata
allowance. At that checkpoint, a current cost screen could proceed. The candidate remains private
and unselected. This establishes finite selected final-pixel/source
correspondence, not observed internal winning-quarter identity, consumed UVs,
all-view appearance, picking, browser/device performance or compiler adoption.

## Current two-arm function-cost diagnostic: HOLD

One private diagnostic reused the closed current prototype and scene. It
hydrated the original Texture64 atlas once, without posing pieces or generating
ground, a board, PNGs or another compilation. Twelve untimed calls checked
current/disabled complete RGBA against the retained native before sprites,
candidate RGBA against the retained after sprites, whole-mask equality and
transparent RGB. The timed arms were canonical current `Current.texture`
against the body-chart candidate, both with the same 278-face geometry.
Historical 118-face and old global-chart costs were not comparison inputs.

Four fixed cases covered world yaw 345 and 90, pitch 67, both sides. Eight pairs
per case alternated AB/BA order, rotated cases cyclically and retained every
pair, including the potentially cold first pair. Only the synchronous exported
function invocation was timed. Full return RGBA/mask comparisons and hashing
occurred afterward; all 64 timed returns matched their prechecks. Those
prechecks affect JIT state, and validation allocations can affect later GC.

| Case | Current median ms | Candidate median ms | Median paired delta ms | Median paired ratio |
| --- | --- | --- | --- | --- |
| Default ivory | 8.097 | 11.976 | +4.130 | 1.464 |
| Default navy | 8.726 | 12.204 | +3.843 | 1.386 |
| Positive edge ivory | 7.828 | 10.198 | +2.226 | 1.259 |
| Positive edge navy | 6.573 | 9.133 | +2.710 | 1.405 |

All four cases crossed the predeclared advisory conjunction: median paired
delta above 2 ms and median paired ratio above 1.25. These flags do not affect
behavioral `ok:true`. The navy edge BA subset did not cross the flag: delta
0.813 ms, ratio 1.151. Order variation and the small finite sample prevent a
claim of stable regression in every ordering.

Computed ivory-plus-navy invocation sums had medians 16.184 to 23.658 ms at
default and 14.587 to 19.820 ms at the positive edge. Their median paired deltas
were +7.101 and +4.991 ms. These are arithmetic sums of separate function calls,
not measured pose/frame calls. The browser caches posed pieces by view, so
these generation costs apply to boot/view invalidation. The 33.3 ms whole-frame
reference is context, not a sprite acceptance threshold.

The original diagnostic exited 0 with verified membership, closed streams and
handle, self-only Job closure and unknown false. All 349 supervisor fences
remained identical. The driver verified 332 inputs, stdout was 94 bytes, stderr
was empty and fetch calls were zero. The sole result was 23,420 bytes, below
32 KiB. Observed peak Job commit was 285,081,600 bytes, not an upper bound.

| Private cost evidence | SHA256 |
| --- | --- |
| Driver | `4ac6f07cf6a96d8c06afacf1e18bd0b553b46fe96dcbb4212942bd326622c9b7` |
| Generation | `33ad0b0ccf8ccb3572083a0f8895813c910153740be5c7b2618d3e80f910a732` |
| Result | `9b15898e44b54a1c7cdf679c762b175baccf372c5c141970afa7c228870daffa` |
| Original terminal | `f528bcea7a38fd4a8fb64ec1a77f44bc9db791fdebe984ec5c680f9bfe675be6` |

The receipts use `body-atlas-cost-20261010-r1` and its supervisor prefix under
the same private directory. Root keeps the candidate on HOLD, private and
unselected, because of the extra generation cost and unresolved material
registration. This is a reviewed tradeoff, not automatic rejection from an
advisory flag. A cheaper source-supported sampling path is the next opportunity;
no unchanged timing replay is required. These finite measurements establish
neither browser latency, cold startup, steady heap, device/native application
behavior, all-view material quality nor compiler adoption.

## Private opaque-alpha sampler: finite parity PASS, selection HOLD

An additive private candidate specializes the bilinear filter only when all
four sampled red-channel alpha values are 255. It keeps the original F32 axis,
Gather calls, integer weights, clipping, independent coverage and original
filter for every other alpha combination. A filled Boolean conditional selects
one filter before executing it. For opaque inputs, cancelling the common 255
factor preserves the rounded channel result and alpha 255. The original 278
face lines, 216 body charts, 62 flat charts, marks and geometry are unchanged;
canonical sampling source, accepted toolchain and Laws were not edited.

One reviewed private compile validated the whole book and emitted six exports,
including two direct filter controls. It exited 0 with original handle/EOF and
self-only Job closure, unknown false and all 380 fences unchanged. The prototype
was 609,150 bytes; observed peak Job commit was 596,660,224 bytes, not an upper
bound. No production selection or compiler adoption followed.

Parity R1 was never executed: review found a stale Bun runtime reference in a
Node driver. R2 exited 1 before producing a result, with closed original unit
and 405 unchanged fences. Its exception was not recorded; the external Node
read through a repository-only helper is a source-derived explanation, not an
observed error. R3 recorded admission-stage `bounded input exceeded`, zero
render/filter calls, closed original unit and 409 unchanged fences. Its error
did not identify a path. A read-only input audit found that the existing
7,347,974-byte registered ground JSON exceeded the generic 4 MiB cap. R4 gives
only that exact hash- and size-bound asset an 8 MiB allowance and adds a relative
path to bound failures. Other limits and source boundaries remain unchanged.
All original failures and unexecuted inputs remain separate provenance.

R4 passed four fixed view/side comparisons with 16 render calls: complete
baseline/current/disabled RGBA equality, new/old body-candidate RGBA equality,
whole-mask equality and zero RGB outside transparent pixels. Ten direct
controls made 20 filter calls, covering five opaque and five fallback inputs,
each single nonopaque alpha position, coverage values around 128, zero alpha,
maximum channels and fraction endpoints/clamping. Independent integer
expectations and the original filter agreed. The original execution exited 0,
with verified membership, settled handle/EOF, self-only Job closure, unknown
false and 413 unchanged fences. Its result was 8,275 bytes; stdout was 94 bytes,
stderr empty and network calls zero. Observed peak Job commit was 261,816,320
bytes, not an upper bound.

Only after that closed parity result, one new diagnostic compared current flat
rendering with the opaque candidate using the same four cases. Twelve untimed
prechecks and all 64 timed returns in 32 alternating pairs matched complete
RGBA and masks. Function calls alone were timed; validation ran after the ending
clock, but its allocations and the prechecks can affect later GC/JIT state.

| Case | Current median ms | Opaque candidate median ms | Median paired delta ms | Median paired ratio | Advisory flag |
| --- | --- | --- | --- | --- | --- |
| Default ivory | 7.485 | 9.754 | +2.157 | 1.231 | No |
| Default navy | 7.640 | 10.319 | +3.002 | 1.398 | Yes |
| Positive edge ivory | 5.730 | 8.088 | +2.052 | 1.382 | Yes |
| Positive edge navy | 6.041 | 8.595 | +2.308 | 1.381 | Yes |

The unchanged advisory conjunction is paired median delta above 2 ms and paired
median ratio above 1.25; flags do not affect behavioral `ok:true`. Order subsets
vary: default ivory AB does not cross the flag while BA does; edge navy AB does
not cross it while BA does. This small finite sample does not establish a
stable regression in every ordering. The earlier unoptimized body run is
historical and was not a timed arm here, so its separate timings cannot establish
a causal speedup from this specialization.

The original cost execution exited 0 with verified membership, settled handle
and EOF, self-only Job closure and unknown false. All 437 supervisor fences
remained unchanged; the driver checked 364 inputs. Its sole result was 24,031
bytes, stdout 94 bytes, stderr empty and network calls zero. Observed peak Job
commit was 293,675,008 bytes, not an upper bound.

| Private opaque evidence | SHA256 |
| --- | --- |
| Candidate | `5b148ac82baa1f64978b4ed4c9dc2699058a40aab77067b13a2f1cf834e2663a` |
| Preparation generation | `dc332b2075cb68c55634ddd48d4bbd9bde85e17459bc8579a64c898988d2f53d` |
| Compile result | `49a5d28cfbf9d56ec75924a38a5e875912b8807b5d81fe1b1139aeab1d9c69fb` |
| Compile terminal | `5fbb4d2f9334ae27a757bc4d7b0be70daf5a0b48ddedd3d3ebfaf978fb8edce1` |
| Parity R4 driver | `129c25c7d2d3cb462a8b69d7c13eda25b39fb324061745e581c62ddb4b43f647` |
| Parity R4 generation | `5d1e20723744d77b1688051955af009140f08641eb4f02524b7cdccdc965b9d0` |
| Parity R4 result | `a4f1abe389c62d2ae0761b0d6cd73bd0fa2eaa6455aa91447d0a2dce01ad697d` |
| Parity R4 terminal | `3cda5e6549f4de09cd254139fa5f6fb53b039a8074ac883ea9afdd06cc591a26` |
| Cost R3 driver | `4ad6f84031915a5dd31dfcc719b724b4f777e13f617666034b960bc1cb7f3946` |
| Cost R3 generation | `0fb4d35b2543c6f4f5f27269e241d711798126a2505f55612288d9c793ff0d1e` |
| Cost R3 result | `8c93c3066f7644d18ee1eae9c33746bece144448318e4a3a234d9ebff5b4d7ba` |
| Cost R3 terminal | `d7ac8b8dd6ac9c65aab8da0178da6a49f61f03c5328a79002e1c5d1b9a3da04d` |

Receipts retain the `body-atlas-opaque-20261010-r1`,
`body-atlas-opaque-parity-20261010-r4` and
`body-atlas-opaque-cost-20261010-r3` prefixes under the private stationary-motion
directory. Root keeps the candidate private and unselected because of the
remaining extra cost and unresolved material registration. These results are
finite local JavaScript evidence, not browser/device latency, steady heap,
all-view appearance, native application, exhaustive filter proof or compiler
adoption acceptance. No unchanged timing replay is required.
