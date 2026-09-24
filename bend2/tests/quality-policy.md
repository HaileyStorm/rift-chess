# Automatic raster detail policy

`ui/v2/Quality.bend` owns the pure rule for selecting standard raster scale 1
or enhanced scale 2. The browser host supplies measurements; it does not decide
the tier. Run the finite gate from the repository root with
`node bend2/tools/bend.mjs --run bend2/tests/quality-policy.ts`.

The input protocol is `Probe{portrait, physicalEdge, timingValid, sampleCount,
measuredScale, mainP90Us, workerP90Us}`. `physicalEdge` is the independently
measured physical-pixel long edge available to the canvas (for example, the
larger of its CSS client dimensions multiplied by device-pixel ratio). It must
not be read from the canvas backing store, because the selected raster scale
sets that store. A zero edge means the viewport is not measured yet. Eight real
renderer timing observations form a valid window; `sampleCount` counts those
observations, not player inputs. An automatic bounded renderer probe can supply
them, but it must measure actual Bend-rendered work. Until eight real
observations arrive, first boot remains at Standard detail; promotion still
requires three valid fast windows (at least 24 real observations). `measuredScale`
identifies which raster scale was used to collect the p90s and must match the
previous Bend state. After a scale change, the host must start a fresh window
at that scale before evaluating again; stale measurements count as unknown.
The host sets `timingValid` only after verifying both p90s came from finite,
nonnegative measurements and converting them to bounded integer microseconds.

Scale 2 needs at least 1280 physical pixels on the long edge, three consecutive
fast valid windows, and these p90 budgets:

| Measurement scale | Main-thread p90 | Worker p90 | Combined budget |
| --- | ---: | ---: | ---: |
| 1 | at most 4 ms | at most 2.5 ms | main + 4 × worker at most 12 ms |
| 2 | at most 4 ms | at most 10 ms | main + worker at most 12 ms |

The scale-1 estimate multiplies worker time by four because scale 2 processes
four times as many pixels. This is a conservative estimate, not a measured
scale-2 result. The worker check bounds its operand before multiplication so
U32 wrapping cannot turn an excessive time into a fast result. One elevated
scale-2 window preserves the current tier but resets the fast streak; a second
consecutive elevated window lowers to scale 1. Missing/invalid timing or
insufficient viewport capacity lowers to scale 1 immediately. Unknown or
mismatched measurement scales count as missing data. There is no GPU field or
GPU claim; the policy reports only raster detail and observed responsiveness.

The decision includes the complete raster profile needed by the controller:
output width/height, board size, image depth and board depth, plus Bend-owned
`quality` and `responsiveness` strings. At scale 1, desktop is 1024×640 with a
512 board, while portrait is 512×1024. At scale 2, those profiles are doubled
to 2048×1280 and 1024×2048, with a 1024 board.

The pinned checker and selected-JS finite gate pass. The test covers the
startup/fallback path, exact thresholds, both orientations, tier promotion and
demotion, current-profile stability, and 10,240 finite combinations of state
and measurement boundaries. It does not measure a particular browser or GPU.
The controller must feed real finite p90 data and preserve the returned `next`
state between evaluations; browser playtesting remains necessary to validate
the instrumentation and perceptual result.

Use `choose(old, probe)` only after a complete observation window for the
current scale is available. On ordinary application events, `current(old,
portrait)` regenerates the profile and both labels without changing any state
or streak. `decision_changed(old,next)` is true only when the scale changes, so
the controller can invalidate resolution-dependent caches exactly at a tier
transition.
