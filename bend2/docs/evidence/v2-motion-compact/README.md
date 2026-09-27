# Compact 256-pixel motion checkpoint

The published Bend game remains build `f61152159a6331b9db2d` from clean
source `6721cf06169beb2165f1a18a595d36e811e342e2`. This candidate was
first tested locally as non-draft browser build `ca7fea3cb1fd6afd95df` from
checkout `a951b01` plus source edits. Its initial `build.json` correctly
recorded `sourceDirty: true`; it was **not** deployed. No new native execution
or human visual acceptance follows from this checkpoint.

`BoardScene.fast_camera256_for_512` retains the accepted 128-pixel motion
ground and 256-pixel silhouettes/holes. The aligned browser board interprets
that immutable depth-8 tree at depth 9, eliminating explicit 256-to-512
quadtree expansion. The 1024-pixel enhanced board interprets it at depth 10.
The explicit `fast_camera512` remains for `NativeV2` and callers requiring a
depth-9 tree. Bend still owns pixels and input/picking; frozen Laws/Proofs and
the generic graphics library are unchanged.

Evidence on this Windows Chrome/selected-JS host:

- `node bend2/tests/browser-v2-motion-extent.mjs` compared **60,817,408**
  full-frame output bytes with zero differences after the actual Bend
  `MenuAA.compose` / `Canvas.embed_at`: four yaw/pitch/zoom views with
  selection and motion cues at standard desktop, synthetic enhanced
  2048×1280, and portrait placements. Compact source trees held about
  60–79k nodes versus 235–315k after explicit expansion. In 28 interleaved
  post-warmup selected-JS samples per route, full construction/composition/
  transfer median/p90 was 42.68/63.27 ms compact versus 57.53/95.08 ms
  expanded. A separate earlier run under heavier load was 105.89/170.33
  versus 146.47/212.37 ms. These are local JS measurements, not a native or
  browser frame-budget guarantee.
- `browser-v2-sprite-burst.mjs` sent six View-button clicks and then held a
  real right-button orbit drag. The pre-release dirty PointerMove frame
  visited 366,145 nodes in the hosted old build versus 154,769 in the local
  compact build, with 497.9 versus 386.5 ms pixel preparation in one paired
  run. Both motion PNGs have identical SHA-256
  `89b20c9d0e6e7d513c47471b1a5f55ceb9ce2d6c28ad85ad6f40d3e1e1aa760e`;
  both settled PNGs match at
  `c3f2a84fc02ec392bf12c90b95e80ca1d0bfeb775775f34107e7d356f841744e`.
  The [motion frame](motion.png) was inspected: silhouettes and real open
  gaps remain visible, with the same proxy-art limits as before. The old
  host already coalesced the six clicks to two renders and one final sprite
  refinement; a proposed 120 ms debounce had no established benefit and was
  reverted. One browser sample is diagnostic, not a stable latency result.
- `BEND_EXPECT_COMPACT_MOTION=1 node bend2/tests/browser-v2-live.mjs` passed
  the real held-pointer branch as well as selection, move, portrait and
  refinement with zero page errors. Its motion and settled frames were also
  SHA-256 identical to the hosted baseline. `browser-v2-detail.mjs` passed a
  synthetic 2048×1280 promotion. The extended local
  `browser-v2-scenarios.mjs` passed all 12 groups, including themes,
  promotions, browser PCM, offline move, Shift and portrait, with zero errors.
  Raw ignored receipt: `.artifacts/bend2/v2-preview/scenarios/motion-compact-20260926/receipt.json`.
- BoardScene source check, TypeScript type check and the root Vitest 62/62
  passed. The ordinary `npm test` invocation had one unrelated reflection
  texture test exceed its default 5-second timeout under load; the full suite
  passed with `npx vitest run --testTimeout 20000`. The full `NativeV2`
  source check exceeded separate 120- and 300-second local bounds without a
  verdict. The selected scene module was re-emitted under clean Bend 2.0.27;
  the non-draft browser build passed its freeze/library gates. Independent
  invariant review found no confirmed pixel defect and its initially missing
  orbit, enhanced and portrait witnesses were added before this receipt.

Open gates: clean committed-source build/retest, new-source Linux package and
GUI/PCM/restart parity, broader browser/device latency, consistent multi-angle
piece art, owner WOW acceptance, and Bend 2.0.28 review/amendment. The pending
CPU-only Linux package retry requested in Coordination issue 1 comment
5851264158 is bound to older source `6721cf0`; its eventual result cannot be
relabeled as evidence for this new source.
