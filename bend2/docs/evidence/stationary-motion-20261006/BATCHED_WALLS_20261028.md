# Batched sharp camera ground — rejected, 2026-10-28

One bounded experiment combined the existing 512px adaptive top classifier with
a single spatially filtered wall traversal over the retained 256px board rail.
The hypothesis was that sharing board-presence classification and image-tree
construction across exposed walls could pay for sharper tile/rift edges.
The existing top classifier was already adaptive; no missing generic
material-classification optimization was claimed.

The candidate collected the same wall quads in reverse painter order, rejected
conservatively excluded cells, pruned older faces behind opaque full coverage,
and preserved quarter-sample blending, board clipping and balanced immutable
branches. Only the private candidate's camera-ground call changed. Authored
pieces and their nearest512 masks, helper allocation, rules and laws stayed
unchanged. The first compiler load rejected a match-order error; the corrected
Scene whole-book check and selected JS emission passed with zero holes.

## Actual paired application result

Windows Chrome 156.0.8078.48, headless, 1280×800, scale 1, ordinary uncontrolled
desktop load. The current held-orbit baseline and candidate used fresh contexts
in one browser. Actual input selected b1, dragged continuously, released and
selected g1 through the displayed detailed alpha mask. The changing view ended
at yaw 270°, pitch 71°, zoom 115% in both lanes.

Correctness checks passed with no page/console errors or failed requests.
Initial and final settled pixels and game history matched. Both moving images
were inspected; the candidate's ground edges were finer, while piece artwork
was unchanged. This did not establish all-angle visual acceptance.

| Single-journey diagnostic | Baseline | Candidate |
| --- | ---: | ---: |
| Observed moving replies | 8 | 13 |
| Ground rendering median | 32.9 ms | 63.6 ms |
| Latest input to canvas median | 121.6 ms | 156.5 ms |

The baseline also contained a 1,080.4ms request-to-canvas outlier. These small,
unequal, coalesced samples cannot establish stable percentiles or a candidate
tail improvement. The higher candidate medians did not justify integration.
The sharper full-resolution ground remains rejected for responsiveness.

Original Chrome and parent processes exited 0, the server closed, and the owning
Job settled normally without signals or forced cleanup. No GPU, native game,
formal-proof replay, compiler adoption, unit/integration suite or synthetic
scenario matrix ran.

## Retention and restoration

Private records remain under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/batched-walls-20261028-r1/`.
The successful Scene emission manifest is
`e5fd7d5cce18dac4f4c635beb89622fe27e7f121f27d4b62fcddd72b85751208`;
the private build manifest is
`080a144a91956fddcebfcccd70ab1a728fe04b8137473a83cb4ac33951859e1b`;
the original journey settlement is
`de8b6d637cfbfbbed673ddf582c5a83a3ba5ae8c527e70ee9832a7b38d828f67`.
Raw timings, both moving images and exact candidate source bytes are retained.

The tracked Scene was restored byte-for-byte to SHA256
`f9246964ccf31153b0ebceab0e097ed9d981e70e285ea66f4408b46d2a751647`.
The unused new batch module was removed from active source after verified
retention, SHA256
`ccade61c037c5cc997eb732b5ea6a93b1f6c0e0386aac91b8fdfffd4bae6d692`.
The active worker, public preview, accepted compiler pin and frozen dependencies
remain unchanged. Further motion quality needs a different cost reduction;
this result does not warrant repeating the same 512px proposal.
