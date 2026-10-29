# Image-tree presentation and orbit profile — 2026-10-28

The generic browser PixelPort now writes one- and two-pixel leaves directly and
selects the previous quad once per branch. It retains clipped output bounds,
opaque byte conversion, identical-reference/color reuse, failure invalidation,
stats and a fresh transferable copy. The source-bound tag adapter admits the
exact new bytes; unchanged Pix/Qua tags remain unchanged. Fewer source Qua
comparisons change its literal count from6 to3, with no ABI mapping change.
No Bend source, compiler, proof or native application cone changed.

## Actual browser acceptance

One paired real two-ply opening, Settings/Warm, orbit/release and atlas knight
selection used the prior plate-decoder package and this candidate, baseline
first in fresh contexts within one Chrome launch. The owning Job allowed two
logical processors. All eight retained pixel/history/view checkpoints matched;
the final knight-selected PNG is byte-identical to the previous accepted image:
`58610246c204dd225ff45ec3e6934833a01c764d21e9cf1d4bd583e06ed9c0b6`.
This establishes the observed behavior, not all possible output dimensions.
Odd-size clipping remains explicit in the direct-store branches.

The candidate was then measured with the unchanged normal-CPU desktop orbit
journey, without a profiler.48 trusted moves produced three motion frames
before release. The two inter-draw gaps were96.0 and289.6ms, over the33.3ms target.
Release-to-detail was1458.0ms. The held-motion and settled images matched the
prior run byte-for-byte, and the final real g1 pick succeeded with unchanged
saved history. No page errors or failed requests occurred.

The previous observation had six motion frames, gaps up to234.5ms and detail
arrival1993.6ms. Host load and ordering were uncontrolled and these are tiny
samples; **the new code has not established smoother motion or a stable speedup**.
Scene construction remains the unresolved bottleneck. The image-copy change
preserves behavior and removes repeated small-loop/tag work, not that limitation.
Both browser parents/children exited0, original handles joined/closed and each
Job settled before closing; no signals, forced cleanup or unknown work remained.

## Corrected profiler evidence

The first profiling driver stopped before tracing on its own category-discovery
assertion. The actual API later succeeded despite an empty discovery list.
That failure and normal browser closure remain preserved.

The initial successful trace started the profiler immediately before the orbit.
It captured a744.022ms Worker CpuProfiler::StartProfiling event coincident with
its largest743.367ms anonymous-listener sample. That sample is instrumentation
startup; it is not evidence of application deserialization or an unexplained
744ms game stall. Its zero measured motion frames are not performance acceptance.

A fresh diagnostic started profiling **before the unmeasured warm orbit**, then
marked the measurement after matching detailed warm release. All three profiler
startup events ended before the measured mark. Sampling still perturbs runtime,
so this is attribution evidence rather than a performance comparison. The bounded
1,815,378-byte trace contains5852 events, reports no data loss and its original
stream reached EOF and closed. Original processes exited0 and settled normally.

Two measured Worker frames had tree/traversal times230.6/52.4ms and462.7/23.5ms.
Their ground/sprite construction split was103.2/125.1ms and148.2/313.6ms. Actual
Worker GC event-union overlaps across the request-to-draw windows were5.449ms
and16.080ms; those events cannot explain the full317.2/499.6ms windows. The largest
sampled self component in the latter window was the emitted
RgbaAffine.joint_nearest_paint texture/mask walk (93.9ms at its largest node).
Generic Bool.pick and axis traversal also appear prominently. Sampling durations
are wall-time estimates, not processor-utilization measurements. This identifies
a useful code path; it does not establish a repair or isolate host contention.

## Retained original identities

Private originals remain under the successor visualization workspace, outside
the repository artifact budget. No screenshots or compiler copies were added
to routine suites. The original failed build, rejected driver and trace remain.

| Original | SHA256 |
| --- | --- |
| Candidate source-bound package manifest | `81ba5ed174d470143027faaf7eb7e88d4b256aaaed69e09fefeba66a0627bbcb` |
| Paired actual result | `f3d55581c12a4e339bd4eaf60955f47cb5e7c3da422bebdaca4c20b1f802267b` |
| Paired native closure | `323a0824c98bbcf305f5556c0aee1fa5b0d51640311c88dabfd10079240096d1` |
| Unprofiled candidate orbit result | `03a4d72b756a5d0f934b67d9bedca97f4e788d32b37dcfeb64b4d933a86d046f` |
| Unprofiled candidate native closure | `47bcb74c18c8babfd226477d3457f2b2d9078cadc581d9daa28655634c3939c7` |
| Corrected actual trace | `a6d6d20dfb232dabeaba4dd485bcdbdec60c17c92f4f2ac61bbc676453ed157a` |
| Corrected diagnostic result | `6d20604acf5ace1b399b135870f5288969de863fc87a705fd5c6521997557ce2` |
| Corrected trace native closure | `88459412e69ec184e3d04fd428e5930318de5355205a7d63c264ab3a96f8d9bb` |
| Trace analysis | `6a2f9097988a88b219035fb8b876a26e2f2112bd9449cace352521e9f1ba3450` |

The separate public preview is unchanged by this experiment. No stable desktop
or constrained-device acceptance, new native GUI/GPU result, formal verdict or
compiler adoption follows. Accepted2.0.27 and the complete sprint remain intact.
