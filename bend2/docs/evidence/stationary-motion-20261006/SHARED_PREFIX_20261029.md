# Shared-prefix nearest candidate — rejected 2026-10-29

The private RgbaAffine candidate was rejected after two actual continuous-orbit
browser comparisons in opposite order. Exact visible output and behavioral
parity passed. The apparent initial speedup did not survive reversed order,
so the extra code was not retained. The original source was restored exactly.
No third run or native alignment followed this candidate.

## Candidate and actual comparison

The candidate shared the original RGB and mask tree descent for four exact
source coordinates at the final 2x2 destination level, only while all chose one
quadrant. It retained scalar descent after divergence and preserved clip,
coverage, opacity and fallback behavior. It introduced no persistent cache,
packed source, per-piece setup or runtime-parallelism change. Its extra 86 source
lines and approximately 14 KB of emitted selected Scene were not justified by
the observed result.

Each comparison used one Chrome 156 launch with fresh baseline/candidate contexts,
Windows headless 1280x800 DPR1, normal CPU without affinity or a profiler. Each
lane warmed the actual assets and one orbit before 48 trusted moves targeted 16 ms
apart, without waiting for each Worker response. The measured sequence ended
with release to the exact detailed view. The motion screenshot used a separate
tail, followed by a same-view detailed screenshot and an actual g1 pick. No
screenshot serialization was included in the measured orbit window.

| Comparison order | Lane | Presented motion frames | Inter-draw p95 ms | Detailed arrival ms |
| --- | --- | ---: | ---: | ---: |
| Baseline, candidate | Baseline | 3 | 256.3 | 2230.9 |
| Baseline, candidate | Candidate | 11 | 75.5 | 617.3 |
| Candidate, baseline | Candidate | 6 | 177.7 | 1996.6 |
| Candidate, baseline | Baseline | 13 | 207.9 | 1026.6 |

These are one sequential pair in each order, not controlled performance
estimates. The reverse candidate's smaller p95 sample gap did not outweigh its
fewer presented frames and slower detailed arrival. No consistent overall gain
was established. Neither comparison establishes the 33.3 ms motion target; the
2000 ms arrival target was diagnostic, not a correctness pass condition.

Both comparisons passed exact motion and settled PNG byte/hash equality,
identical final views, g1 selection and unchanged saved history. Queue coalescing
makes frame/request/revision IDs nondeterministic; they were not compared across
lanes. Both original browser supervisors reported passed with unknown=false;
the original terminal records remain retained. This is browser acceptance for
those observed outputs, not a new formal proof, native/device/GPU acceptance,
performance approval or compiler adoption.

## Immutable identities and disposition

| Evidence | SHA256 |
| --- | --- |
| Rejected private source | `2c90f5dae8f2a0e72a56a38aee813d42e74784439a29b6cfd16cee08959c544d` |
| Restored RgbaAffine source | `201b17eff6234fcec4b8ebcb52294ba87f6e1d5d8b84ce686dd73cdb0456f12b` |
| First result | `74818dfe8166b417a44c2f4adb50d095d7854a17f54365d3afa8253bec773104` |
| First terminal | `96ee257b6bfa75b0389007e8dd59804c586194d73ad29ea4da0b1db56a780a85` |
| Reversed-order result | `b6423b8948c81b8a4cea9af9b3fae80fcef1d44fb599f5a49b169b071d00b914` |
| Reversed-order terminal | `f5d1b4d7a5069667105052d8b07408acd85ee5dcc536f0f7332b0bb0dfd23c1c` |
| Final disposition | `9726610c6b24b9ef18f0ca354a304057f858ced25a3d9576dd668d75b81ee4eb` |
| Shared motion PNG, 629388 bytes | `808b63cc92d62d36a03effa48fd79ec8b90c321de1980d56a6a5a182fcd7ae20` |
| Shared settled PNG, 665108 bytes | `597c4856b761d8d0cbd67d72815327bae56eae90a621a1eb0dca4ae67a21c37d` |

The original sources, failed performance hypothesis and both actual result sets
remain immutable private evidence. Frozen inputs were unchanged.
