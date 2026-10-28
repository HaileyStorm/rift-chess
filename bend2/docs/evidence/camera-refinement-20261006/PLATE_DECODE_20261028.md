# Bottom-up game plate decoding — October 28, 2026

The game now assembles its depth9 RGA1 plates from adjacent pixel pairs,
then merges adjacent 2×2 image cells through eight further levels. This avoids
the generic decoder's stretched-row intermediates and repeated matrix splits.
`Assets.response.plate` selects this game-owned path. The original RGA1 parser,
generic decoder, Laws and Proofs remain byte-for-byte unchanged.

The fast path calls the original complete 512×512 row parser before final image
assembly. Each level retains the original TL/TR/BL/BR order and `image_quad`
uniform-region compaction. Other complete headers delegate unchanged to the
generic decoder; short headers retain `BadLength`. Failed responses, depth9
filtering, first-response selection, transport cap and one retained plate remain
unchanged. No Array, unsafe operation, host decoder, cache or runtime parallelism
change was introduced. Internal grouping fallbacks are unreachable through the
validated parser; this is source reasoning, not a new general shape theorem.

The graphics library is DRAFT; the changed game files are outside the six frozen
law manifests. This additive application implementation does not change their
meaning or substitute a new proof. Its actual Scene emission checked the entire
loaded book with zero holes and unchanged imported inputs. Controller and Menu
emissions, artwork, fonts, bot and ground-only payload were reused. The canonical
`/2` repacker rebuilt the source-bound helper, Worker and host bundles.

## Actual application comparison

One paired Chrome 156 journey played e2–e4 and e7–e5, opened Settings, selected
Warm, closed Settings, rotated/released and selected g1's knight. Both builds
ran in fresh contexts in one browser under the same owning Windows Job's
two-logical-processor limit: affinity mask 3, limit flags 16. All eight complete
canvas checkpoints, views, summaries, revisions and saved-record hashes matched.
Atlas picking after rotation succeeded. No application/console errors or failed
requests occurred. Original Chrome/parent exits were 0; original handles joined
and closed, then the Job settled to the supervisor alone and closed. No signals
or forced cleanup occurred.

| Observed work | Previous decoder | Bottom-up decoder |
| --- | ---: | ---: |
| Initial plate decode | 339.1 ms | 175.0 ms |
| Warm plate decode | 516.6 ms | 41.3 ms |
| Warm total rendering-port work | 803.8 ms | 272.3 ms |

These are individual baseline-first observations under uncontrolled host load,
including possible warmup differences. Other work varied. They do not establish
isolated speedup, stable p95, physical display latency or native-device results.
Intermediate row lists still allocate; no heap reduction was measured.

The first launch stopped on `EACCES` connecting to loopback before any HTTP
request or game activity. Its original Chrome/parent joined and Job closed.
That failed record remains intact; a fresh output directory contains the same
unchanged journey with local-network access and the successful execution above.

## Original records

Private originals remain under
`native-gameplay-20261027-r1/plate-decode-20261028-r1/`.

| Source or record | SHA256 |
| --- | --- |
| PlateDecode.bend | `777723ecb4a64242a0546076aea1cbe1b5c8ae2168b7715a1883fcd1858c1ae2` |
| Assets.bend | `f83c8e014de83f680c3ca66507b21bf702783ee300aa9c10a8e21deb5009a694` |
| Scene emission manifest | `2cbd62a419a44d3acdcc6a6603412497ce239d770d4574033a1ef13b26d0b81a` |
| Scene JS | `544852f8cc809dd839061dbb780b2a93c34eec04527f5ad847a07599a5b0f4a5` |
| Package manifest | `8c6b4ab2c870567bcc8496dcc6c6d4df6b562ac0a60137f0793a5423e53f93ee` |
| Package original terminal | `4475c96194946a051e2d0a60939a333b482a0cff2fbb2522d1b055de42d34611` |
| Paired actual journey | `b7f7f39b369756db49a5d4502753d062e0e0718b8d9cbeca66dbf7ee129c6570` |
| Journey original native terminal | `58f6fbb73a9c53ff20db5734ef6554c48b5a5a988c175d0f50256a53246b1bf6` |
| Timing readout | `2068a6101dd2d84c582800f5c82a08cfa553777143d10fb8c5be612d9e2d9c20` |

The final selected-knight PNG is byte-identical to the prior accepted hover
journey (`58610246c204dd225ff45ec3e6934833a01c764d21e9cf1d4bd583e06ed9c0b6`).
Publication is recorded in [the preview evidence](PUBLIC_PREVIEW_20261028.md).
No new unit/integration suite or synthetic codec matrix was added. The full
sprint, current-source native alignment, original GPU acceptance and reviewed
compiler adoption remain open; accepted 2.0.27 and formal obligations are intact.
