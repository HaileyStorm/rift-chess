# Rendered matrix cleanup without dropping coverage

The initial clean `e2ced02d5cf5cb05a332` Bend build (source `fc11252`)
passed all 24 real-Chrome scenarios and 685 checks, zero defects, with
served `build.json` SHA-256
`3a072e4d990a33e58272ed09fdcfd3a8980bb037969c303b98b42a74a450214c`.
Its ignored summary is
`.artifacts/bend2/playtest-stage2/motion-wall-cull-clean-fc11252-20260929/summary.json`,
SHA-256 `6c13d0e418ec192dafe8495058769803fa62806c96990a203caef79153328981`.
An unchanged-fixture harness timing pass, summary SHA-256
`6b5c773f8ef2d7a7d5eea7cae6ca11a0eb290958cb7452623daff30f53f116d2`,
again passed 24/685 with zero defects. The latter took 1,758.3 summed
scenario seconds on this host; this is not a portable performance baseline.

The timing split found the real expense rather than assuming that repeated
TypeScript reference replay or PNG output dominated. Draw-terminals took
454.4 s, with about 435 s in five real Bend imports, 0.37 s in reference
replay, and 2.05 s in captures. Draw-prompt took 274.6 s, including 266.9 s
for its 303-command import, 0.10 s of reference replay and 0.71 s of
captures. A disposable incremental-reference trial passed a bounded pure
differential and three focused browser scenarios, but the oracle occupied
only 73.5 ms of a 237.3-s bot-white run, 33.7 ms of 172.6-s bot-black, and
10.7 ms of 128.3-s menus. The cache was removed before commit because it did
not materially address the delay. The one-pass menu fixture search remains;
it passed the focused browser scenario. This is not a claim that app-side
import replay can be skipped or that UI interaction is faster.

The retained harness changes record per-scenario reference, import and capture
time, reject unknown/duplicate subset names, and fail a full run unless its
scenario/check counts match the explicit baseline. An invalid subset trial
exited 1 and retained a `matrix` defect, rather than reporting a vacuous
pass. Real canvas interactions, gesture-bound imports, every screenshot,
independent reference checks and the 304-command long-history stress fixture
remain in the matrix.

A bounded deterministic generator found `progress100Short`: 100 legal quiet
moves, 101 distinct positions, `auto100` drawing exactly at quiet count 100,
while prompt policy stays live at 100. It prints but never rewrites a fixture.
Its exact output is asserted against the new fixture in
`tests/fixtures/playtest-records.json`; the original 304-action `progress100`
record remains unchanged and is still imported in draw-prompt and used by
menus. Only draw-terminals uses the shorter witness for the auto100 boundary.
The strengthened browser scenario verifies the imported Bend/reference state
and quiet count at 99 before playing the final move, then both counts at 100
and the terminal outcome. Its focused exact-build run passed 39 checks, zero
defects, in 295.4 s. The 99-action import was 103.6 s in an earlier focused
sample versus 247.4 s for the old 303-action import; this is a host-local
sample, not a general speed bound. The strengthened focused summary SHA-256 is
`a47a8301b958e8a962454748c2c91468b96d9b4d309b91ccbd81e73f9f9df762`.

The final full matrix from committed harness revision `e96f824` passed all
24 scenarios and **689 checks** with zero defects. Its served-manifest binding
remained the same clean Bend build and its explicit full-coverage guard passed.
The ignored summary is
`.artifacts/bend2/playtest-stage2/matrix-final-e96f824-20260929/summary.json`,
SHA-256 `44be8efbdead22f75e0029e12b39afd8279577ae07c4fe0c162a9bcb040814cb`.
Summed scenario time was 1,533.4 s here versus 1,758.3 s in the earlier
unchanged-fixture timing pass; host load and run order varied, so this is a
local example, not a device or portable speed bound. Draw-terminals was
279.4 s and draw-prompt still exercised the long record for 258.9 s.
No game source, frozen Law, accepted camera, canonical Bend pin, native GPU or
published site changed in this test-harness cleanup.
