# Moving-atlas view and staging witnesses

Three distinct installed-Chrome cohorts passed against the unchanged published
alpha-bounds package: portrait 540×960 at yaw345/pitch67/zoom115, landscape rear
view at yaw165/pitch35/zoom75, and landscape top view at yaw90/pitch90/zoom130.
Both landscape viewports were 1280×800. Each used actual plan scale1 with no
synthetic quality probes.

Each cohort found one opaque moving-pawn artwork point outside its settled
support that becomes transparent at progress8. A native click carrying displayed
pose0 was processed after progress advanced to8 and selected square28. A second
click carrying pose8 at the same point selected its underlying floor instead.
The same alpha-mask identity served both clicks, with no new helper refinement.
The reference point search supplements existing finite renderer differentials;
it is not exhaustive edge coverage and shares production picking dependencies.

Native e7/e5 pointer clicks then selected and staged the next legal move while
e4 still animated. The observed sequence was:

| Boundary | Revision | Staged | Moving | Progress |
| --- | ---: | --- | --- | ---: |
| Select e7 | 1 | false | true | 8 |
| Stage e5 | 1 | true | true | 8 |
| Tick completes e4 animation | 1 | true | false | 16 |
| Following Tick commits e5 | 2 | false | true | 0 |

The next Tick cleared square52, occupied square36 and left square28 occupied.
The independent result readback also checks that only squares52/36 changed
between the staged and committed board, and square28's exact value stayed equal.
This validates the commit ordering and coordinate/mask integration in these
three opening fixtures, not arbitrary histories or a general rules proof.

The harness serves the original source-bound Worker with an append-only actual
Bend snapshot observer. It preserves dispatcher results and appends metadata to
existing frame replies. It deliberately holds outgoing Tick requests and
normalizes their durations, including mixed event batches. This is controlled
browser evidence, separate from the untouched natural-motion and offline
witnesses. It establishes no animation pacing, latency, physical-device,
constrained-device or owner visual acceptance.

All three original native supervisors exited0, observed their own Popen exit,
closed original handles and Jobs, and retained equal before/after source fences.
The first portrait R1 stopped at a harness equality expectation that omitted the
actual namespaced Camera.View tag. R2 corrected that expectation. The failed
source, result, screenshot and closed terminal remain retained; no product bytes
changed. The [machine-readable acceptance](acceptance.json) binds exact package,
modules, scripts, terminals, results and screenshots, including the failed prefix.

No application source or frozen dependency was amended. These witnesses do not
adopt the candidate compiler or close native CPU/GUI/PCM/restart, Safe/kernel,
GPU, stable responsiveness or broader graphics acceptance. The full sprint
remains active.
