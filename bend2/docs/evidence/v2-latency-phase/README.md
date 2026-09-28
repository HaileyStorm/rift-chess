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
