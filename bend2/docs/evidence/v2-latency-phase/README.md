# Current-source browser latency phase diagnostic

Question: which measured part of the pinned 2.0.27 browser path dominates the
slow post-move and menu frames? This is a bounded diagnostic, not a frame
budget, stable benchmark, kernel optimization approval, or native/GPU result.
It uses the hosted clean content version `0e09e1d0e901b91b3d5f` from source
`c30d312`, not the isolated 2.0.28 browser candidate.

The real-Chrome `playtest-matrix.mjs` perf scenario instrumented worker
messages without changing application code. Its 42 move-class frames had a
pre-port `renderMs` p95 of 1204.7 ms (max 1287.1), a `portMs` p95 of 245 ms,
and end-to-end reply p95 of 1451.8 ms. The slowest Tick had 1287.1 ms
pre-port, 270.8 ms port, 250.6 ms tree creation, 9.8 ms traversal, and a
1744.6 ms reply. Within that tree creation, the worker reported 117.2 ms
ground, 66.1 ms preparation and 16.5 ms chrome; these phases do not explain
the much larger pre-port Tick. For eight menu-class frames, port p95 was
718.8 ms, with a slow dirty frame spending 589.4 ms in composition within
685.4 ms port time. The ignored, manifest-bound hosted summary is
`.artifacts/bend2/playtest-stage2/perf-phase-hosted-0e09e-20260928/summary.json`,
SHA-256 `1ca4c7ea972d0e1baf9a2a944e63b1dc589ea08dd883ed88d61d628be3e7e26b`.
The capture includes batching and browser load; its p95 is not a guarantee.

A second diagnostic runs the pure v2 command path under pinned Bun 1.4.2,
holding the initial position and e2-e4 successor fixed. Seven warm samples
per case, after two warmups, gave:

| Same-position operation | Median | P95 |
| --- | ---: | ---: |
| Frozen match command | 1114.05 ms | 1125.10 ms |
| Successor legal enumeration | 621.97 ms | 653.08 ms |
| UI accepted command plus refresh | 1905.23 ms | 2239.96 ms |

Its ignored input-subset-bound receipt is
`.artifacts/bend2/profile/commit-phase-match-step-current-20260928.json`,
SHA-256 `422c09a5c8027875f1463f76a221c2d5bdb858dfa22dbcc14fb96ae89a972cb`.
An earlier seven-sample warm diagnostic remains preserved at
`.artifacts/bend2/profile/commit-phase-current-c30-20260928.json`, SHA-256
`0566359d584e4241cfbe1722e2b35095a52b70311e0c5ca042210e392ec0429b`.
Those are compiled Bun calls, not Chrome, and the separately timed medians
must not be added as if they were one frame.

Source inspection shows `MatchKernel.apply_move` enumerates successor legal
IDs for repetition-key construction, while `State.refreshed` enumerates them
again for its UI cache. The command gate also evaluates outcome/authorization.
The measurements are consistent with repeated legal work being a substantial
pre-port cost; they do not isolate every subcall or justify changing frozen
normative dependencies. A future improvement must retain the frozen Law and
runtime-parallel contracts, prove exact output/reflection equivalence, pass
reference differential and rendered interaction checks, and remeasure actual
browser and native paths. The menu composition cost is a separate UI-image
reuse question; any cache change needs pixel and input parity, not just a
microbenchmark.

## Rejected cold sprite scheduling prototypes

The published piece-art route still spends several seconds between its first
playable proxy frame and the detailed sprite refinement. Two reversible,
ignored local drafts tested early creation of the independent sprite helper
(version `64cbed268d8f2c23787a`) and an additional source-bound page prewarm
before its first frame job (version `1810c0cb84f5b183773e`). The three
early-helper start summaries are retained under
`.artifacts/bend2/playtest-stage2/sprite-worker-early*-20260928/`; the first
has SHA-256 `5228cd0469a177099e41e39cc19b9b2d6594f68a8085fbcfa64de457f66d9080`.
The three prewarm summaries are under
`.artifacts/bend2/playtest-stage2/sprite-prewarm*-20260928/`; the first has
SHA-256 `83260f648d833c60e4df474bcd358cbd9daedb79b3b5bfd9ec358e72549524c9`.
The prewarm protocol passed a real Node worker test (correct source, one
fetch/decode, malformed-source denial), and all three local rendered starts
passed; the early-helper draft also passed the 13-group local Chrome suite.

Observed navigation-to-refined medians were about 8.69 s (two published-code
local samples), 7.75 s (three early-helper samples), and 7.55 s (three
prewarm samples), with substantial cold-run variation. Prewarm did not
remove the roughly 3.6–4.0 s proxy-to-detail interval. Neither tiny sample
is a controlled performance proof; the extra prewarm protocol/lifecycle
state was not justified. Both prototypes were reverted with `apply_patch`;
tracked source is clean, the clean selected module and exact published
`build.json` bytes were restored, and the 22+2 hosted-file verifier passed.
No startup-speed claim or new release follows. Further work should attack
the measured full scene composition/decode/render path without degrading
authored edges or the first playable frame.

## Published piece-proportion performance sample

The clean hosted content version `817dfa63932dd6ccf4b4` ran the
exact-build-bound real Chrome `perf` scenario with zero behavioral defects.
Its ignored summary
`.artifacts/bend2/playtest-stage2/piece-proportion-hosted-perf-20260928/summary.json`
is SHA-256 `d71b64768c6348814427fb354ffc422ac3164ec5ffc8490feb5c77c2f8997790`.
Among 42 recorded move-class frames, p95 worker dispatch was 1,018.4 ms,
port/render 216.1 ms and request-to-reply 1,248.0 ms. Hover p95 reply was
41.8 ms; selection 554.7 ms; orbit 264.5 ms. Eight menu-class frames had
486.7 ms p95 image-tree work and 508.4 ms p95 reply. These are small,
variable-load samples with batching and no guaranteed FPS; their phase p95
values must not be added as one frame. The proportion edit did not remove
the earlier source-bound legal-refresh and menu-composition bottlenecks.
Changing the frozen legal-refresh path needs a separately reviewed
implementation/proof version. Menu composition is a distinct implementation
optimization that still needs exact pixel/input parity. Neither a relaxed
frame threshold nor a GPU fixture speed claim closes these observations.

## Current hosted cold visual-phase baseline

The clean published browser content `c7056b49df1aa08b4048` (source
`a3a57b9`) was replayed in fresh real Chrome contexts with exact served
`build.json` binding. Three `desktop-start` runs passed their position,
capture and Front-refinement checks; proxy-to-detailed spans were 4,459.2,
3,886.8 and 3,682.8 ms. Their ignored summaries under
`.artifacts/bend2/playtest-stage2/sprite-baseline-current-{a,b,c}-20260928/`
have SHA-256 values `42326e3899026bc3a854301b6c9b6be2faad189030462ea1ca30108faeb32843`,
`94bdb15d755b7d15f816d1684773375582f0712e4185a3d849a88e310a117846`,
and `42bff276c72a92821062efbbec268ffba085db628e3f4d696378eb93518c2759`.
Those samples spent roughly 1.0–1.3 seconds decoding the plate/sprite assets,
0.83–0.96 seconds building the ground and 1.32–1.42 seconds placing sprites.
The phases overlap neither within that helper nor with its final image
transfer; prewarming only the fetch cannot remove the dominant scene work.

The playtest driver now retains first dirty-frame worker/port/tree/traversal
timings and requires finite values, without changing the game. On the same
hosted build, three observed initial request-to-reply latencies were 3,521.1,
5,684.1 and 3,245.3 ms, with first-frame port work 2,332.3, 4,216.2 and
2,294.0 ms respectively. A fourth gated sample was 3,485.7 ms with
2,494.1 ms port work. The last two sampled first-frame tree compositions
were about 951–953 ms, while the recorded raster traversal itself was only
about 34–38 ms. Worker-side scene phase totals and asset/font preparation,
not raw traversal, are the first-frame optimization questions; the current
instrumentation does not isolate every component of port work. The
corresponding ignored summary SHA-256 values are
`ec7f9c3c767a459357ea3b8ac866c0771a4bc066a549e24e08a4b29f3bdefe44`,
`53b58fd5351c93ae03b10dbd17543fae748dd5c9f427074eef2daaa31f3815ad`,
`42961e59f91123d8ac0ba35c861ebeedce6fb47c905860b643a7704fdbe3af2b`,
and `10c7ec0b229ef59a74478ce5d4896b380b4bd03b5f096ca16a45f0706b666303`.
One high-load run put proxy-to-detail at 8,502.7 ms, with decode 2,092.8,
ground 2,057.8 and sprite placement 3,338.3 ms. These small, variable-load
samples are diagnostic, not a cold-start bound or throughput claim. They
argue against calling the current refinement rapid; any source change should
improve actual first interaction and detailed-art arrival without blurring
the authored piece edges or bypassing Bend's rendering authority.

### Rejected menu-shell reuse trial

An isolated local draft added a Bend `render_from_base` entry and let the
browser retain the exact `same_base` shell across menu transitions. It did
not change the frozen rules or the published site. Version
`c8c0366a008cef3957a3` has ignored draft build-manifest SHA-256
`348a889721b5c2496931d15823d1dd17d8df16fce613e313b1b7c00cd859faa4`;
the rendered local `perf` scenario passed with zero behavior defects (summary
SHA-256 `7108a5f7868b022d5187b09c79b6db8c53c1890b7bb95428ba32747b23276152`).
Eight menu frames still had 451.7 ms p95 image-tree work; one slow frame
spent 384.8 ms in menu composition with **zero** shell construction. The
dynamic panel/control path, not its reusable background shell, dominates
this sample. The apparent difference from the hosted 486.7 ms tree p95 is
not a controlled speedup. The draft was rejected and all three tracked
source files restored byte-for-byte. The clean selected menu bundle and exact
published `build.json` were restored; 22 Bend files plus two original-site
baselines passed live verification again. Any future menu optimization must
target Bend-owned panel/control work and demonstrate pixel/input parity.
