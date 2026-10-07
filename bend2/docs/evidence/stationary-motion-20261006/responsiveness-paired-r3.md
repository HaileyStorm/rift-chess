# Paired responsiveness observations, 2026-10-07 UTC

The completed cohort does **not** establish the desktop latency targets or a
stable 30% improvement. Both packages produced identical final canvas PNGs in
all five pairs. The current package's observed click-response tail was 689ms,
first committed move frame 1610ms, menu response 515ms and first changed-view
orbit frame 264ms. These are descriptive pooled sample p95 values from a small
cohort under variable host load, not stable population estimates.

## Packages and conditions

Five alternating-order AB/BA pairs used ten fresh installed Chrome headless
browser processes/contexts and 100 native canvas actions: e2 selection/e4 move,
e7 selection/e5 move, g1/b1 selections, preferences open/close and an isolated
right-drag out/back. Each run finished at revision 2 and the original view.
Service workers were blocked; assets were served locally and verified against
each build manifest. The product Worker was unchanged. Passive main-thread
Worker/canvas/long-task observation adds overhead.

| Package | Retained build manifest SHA256 | Build source metadata |
| --- | --- | --- |
| Historical baseline | `2f284391e1296e858fccec17bc474c1c1b8fbf423f0ccd83c869c28de9301071` | version `190418dfdfe590659bd0`, parent `fe01be1`, dirty |
| Current candidate | `528f106dfa8c139eed05639f9cf17863d20a407667a98cb8c7f3e3c4a490d04e` | version `d57458e11c9f0db5b538`, parent `469815f`, dirty draft built before publication `5ac9c90` |

Neither package's metadata was rewritten after building. The candidate remains
an unadopted 2.0.35 experiment. The accepted 2.0.27 pin and frozen Laws remain
unchanged.

The declared profile was Windows 11 Pro 10.0.26200, i7-1270P/16 logical CPUs,
1280×800 CSS viewport, board scale 1 and yaw/pitch/zoom 345/67/115. The pre-run
host query at 04:18:55Z reported CPU 74%, approximately 1.86GiB free physical
memory of 15.67GiB, Balanced power plan and battery charge 63%. This is shared,
variable load. Unrelated applications stayed open. It is not a constrained
physical-device or isolated-resource acceptance run.

## Timing correction and boundaries

Independent read-only review found that **all 40 raw selection samples matched
a preceding hover reply**. Their request was PointerMove-only and preceded the
click timestamp. The raw result and its invalid selection distributions remain
unchanged.

An append-only reconciliation found exactly one PointerDown request between
each selection's input timestamp and the next action. All 40 had exactly one
matching dirty frame canvas draw in that interval. The selection numbers below
are the derived **click-batch canvas-response intervals**. No timestamp exists
for the subsequent RAF of those corrected draws, so corrected selection RAF
timing cannot be recovered. Individual selected-state assertions were not
recorded for these measurements.

Move timing ends at the first committed revision-advanced canvas frame, not
animation completion. Menu timing requires the expected menu state. Orbit ends
at the first changed-view canvas write, not settled refinement; all 20 original
orbit matches were requests sent after the armed input. Canvas writes and the
original non-selection next-RAF opportunities are not physical display scanout.
Startup markers are navigation-relative first canvas write and first atlas
canvas write; browser launch time is excluded.

| Canvas-response class | Samples per package | Baseline median / sample p95, ms | Candidate median / sample p95, ms |
| --- | ---: | ---: | ---: |
| Corrected click batch | 20 | 87.7 / 776.7 | 75.4 / 689.4 |
| Committed move frame | 10 | 1305.2 / 1748.2 | 1379.2 / 1610.3 |
| Menu | 10 | 176.6 / 541.7 | 229.7 / 515.1 |
| Changed-view orbit | 10 | 120.9 / 214.2 | 157.2 / 264.0 |
| First canvas write | 5 | 1420.4 / 2266.3 | 1419.2 / 5866.0 |
| First atlas canvas write | 5 | 5582.7 / 9715.4 | 6924.5 / 10808.9 |

Per-run response columns below are within-run sample p95, rounded milliseconds.
With only two move/menu/orbit actions per run, those columns equal the maximum.
Heap is the final main-page used JS heap, not complete Worker/process memory.

| Pair/order | Package | First canvas / atlas, ms | Click | Move | Menu | Orbit | Main heap, MiB | Main long tasks: count / total / max, ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0 AB | Baseline | 2266 / 9715 | 777 | 1423 | 444 | 169 | 18.3 | 4 / 1046 / 734 |
| 0 AB | Candidate | 1250 / 6011 | 689 | 1610 | 438 | 196 | 13.1 | 1 / 598 / 598 |
| 1 BA | Candidate | 5866 / 10809 | 713 | 1518 | 515 | 264 | 13.1 | 2 / 642 / 592 |
| 1 BA | Baseline | 1495 / 6073 | 984 | 1748 | 517 | 214 | 18.3 | 1 / 744 / 744 |
| 2 AB | Baseline | 1420 / 5583 | 464 | 1305 | 252 | 96 | 12.9 | 1 / 397 / 397 |
| 2 AB | Candidate | 1507 / 7218 | 502 | 1383 | 329 | 158 | 13.0 | 1 / 418 / 418 |
| 3 BA | Candidate | 1419 / 6924 | 672 | 1142 | 247 | 105 | 18.7 | 1 / 609 / 609 |
| 3 BA | Baseline | 1266 / 4863 | 723 | 1695 | 542 | 208 | 12.9 | 1 / 620 / 620 |
| 4 AB | Baseline | 1308 / 4837 | 442 | 834 | 177 | 121 | 23.6 | 1 / 353 / 353 |
| 4 AB | Candidate | 1288 / 5465 | 467 | 1423 | 319 | 185 | 13.0 | 1 / 379 / 379 |

## Attribution and remaining acceptance

The candidate's corrected click samples had input-to-request sample p95 608ms,
largely while the prior hover was in flight. Its committed move samples had
controller `renderMs` 465–1155ms and presentation-port time 71–306ms. These
timestamps identify a controller bottleneck worth investigating; they do not
separate legal generation, bot computation or other controller phases. For
menus, presentation-port work dominates the measured controller time. Nested
scene timers must not be summed: the motion `pointer` timer includes `sprite`.

Stable paired improvement, desktop motion-frame budgets, bot/legal attribution,
complete memory assessment, portrait/constrained devices and owner visual
approval remain open. This observation does not replace native CPU/GUI/PCM,
save/restart, BendTT/kernel, unchanged original GPU or toolchain amendment gates.

## Retained receipts

All paths below are under the ignored owner-held directory
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`.

| Evidence | SHA256 |
| --- | --- |
| `responsiveness-paired-supervisor-r3/terminal.json`: actual exit 0, retained process handle closed, Job self-only/closed, monitored inputs equal | `cc16a466dc11697ebff181f379686ccdc458addf1f832101953ffbef970bd4cf` |
| `responsiveness-paired-r3/result.json`: original ten runs, 100 actions and invalid raw selection distributions | `f7048d73027fe331e215bf84deba0b50d8dbe554c76d7fba593874a4a85cb1da` |
| `responsiveness-reconciliation-r3.json`: exact per-run JSON/PNG hashes, request/draw mappings, corrected canvas-only metrics and phase observations | `07ca78c7ebd87c74c712cdd994ce87f6dcd571c3cd21ee66b29bfa5ac6700550` |
| R1 terminal: wrong observer canvas ID, no usable samples, closed/source-equal failure | `000010b5f1d3f66d47df5ef0871be41c8a8bc73589dbf9064ba3c549ffe5d2be` |
| R2 terminal: BigInt receipt serialization failure after first PNG; no durable timing receipt, closed/source-equal failure | `c3f7a10142e0256ead592e326296dea050ee3456019e5747a2ad74386213043d` |

R3's decimal BigInt encoding fixed serialization. Failed attempts, original
images, raw observations and their provenance remain retained; no browser rerun
was used to conceal the measurement defect.
