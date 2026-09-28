# Shorter, lower piece projection trial

The exact-build-bound hosted [before capture](../v2-playtest-recovery/README.md#initial-fallback-versus-detailed-sprite-refinement)
showed the final chess art, but the named Front view let back-rank sprites
project into the pawn rank. Its Front full-canvas PNG SHA-256 was
`7937bb85a00dae3925e2681c3f3d7dc0f566e6bf8b99daacc9d07635c54bed9b`.
This is a presentation/placement issue, not a chess-state or hit-test change.

The Bend BoardScene trial keeps the sprite width and atlas bytes intact,
reduces projected height from `1.22` to `1.04` board pitch, lowers the sprite
base from `0.16` to `0.22` sprite width beneath the square center, and moves
its contact shadow by the same amount. A finite Front projection test now
guards height at most `1.08` rank pitch and the base between `0.24` and `0.32`
pitch below center. It also retains the five existing sprite mapping, hole,
selection, hover and shadow checks. Frozen Laws, core rules, input picking,
artwork source, independent reference and pinned compiler were not edited.

The local draft v2-preview build `817dfa63932dd6ccf4b4` used pinned clean
Bend 2.0.27; its `build.json` SHA-256 is
`c006c1916e445ec31feba7648da88652d89caa52ba819f5d070f2b452bc6132e`.
The bound `desktop-start` rendered playtest passed with zero defects (summary
SHA-256 `2493fbc21654fe196de03dd4c36e053b3a1045f597fe417e48dfca2b4b617f1c`).
The visually inspected refined default and Front full-canvas PNGs are SHA-256
`9ee8bf74818f1e7803229f5376c70c5ea1d25ff2ca14fa9f6a9e0e3df5b65006`
and `e18d9c67e9296b2ea197381a600b64308ef87eb9a770862502a1e2b62edd9236`.
The Front ranks are more distinctly separated; the default retains the
sculpted identity and board rim. These are subjective local inspection notes,
not owner acceptance.

The local selection and camera matrix passed with zero defects (summary
SHA-256 `e03f7598c7f28d8e7720c3cd9d14859a60f2ec26c6113abd34faf8dde824fc54`).
The exact-build-bound extended Chrome suite passed all 13 groups, including
offline, both themes, portrait, PCM, Shift/Undo and promotion (receipt SHA-256
`472fb94bf194d10282fd393ae2872487bf2812ee756779bc290a4f11bcd5166e`).
The four-cardinal rendered wall/edge diagnostic completed without errors
(receipt SHA-256 `a7100704a0d5488f37e6e15da19829d784871d2fef6e4e61963b2768ddff8378`);
its yaw 0/90/180/270 PNGs were visually inspected for exposed board/rift
walls and piece position, not subjected to an exact-pixel acceptance oracle.
The original TypeScript application still passed 62/62 tests and built.

This is a draft visual checkpoint. The previous exact-`c30d312` Linux CPU
package and failed GPU pilot bind **older** BoardScene bytes; neither validates
this changed source. Clean build, hosted publication, current-source native
CPU/GUI/PCM/restart, repaired GPU-on original-cadence behavior and owner visual
acceptance remain separate gates.

## Clean build and published preview

Commit `cafc934d41b4e2511043634267904c002a824197` produced a clean,
non-draft Bend 2.0.27 v2-preview build with `sourceDirty: false`. Its content
version remains `817dfa63932dd6ccf4b4`, and its 21-file generated asset map
is byte-identical to the tested draft; only build metadata changed. Clean
`build.json` SHA-256 is
`40a49368c1bebaec3882b61e131dca99bf517da11735fcf1dcb320440449dfea`.
The clean-bound local rendered start/Front scenario passed with zero defects.

The separate [Bend browser preview](https://haileystorm.github.io/rift-chess-bend2/)
advanced to Pages commit `8005a07e6ebe46300019aac3081cb3d9084dee08`.
After Pages reported `built`, the ignored publication receipt
`.artifacts/bend2/publication/2026-09-28T09-59-54-427Z-c138ca20/receipt.json`
(SHA-256 `49ad9925c6fab99529f08a90baad428cf4d533bacd3f745b93a8d7b2bc24853f`)
matched all 22 live Bend files and both unchanged original-site baselines.
The hosted exact-build-bound start/Front scenario passed (summary SHA-256
`097d3ddfb30557de2bd3bd80e79c4e37b112b85cf9507329e2147ff8633d4f32`);
the final oblique and Front PNG bytes matched the inspected local trial exactly.
All 13 hosted extended Chrome groups then passed, including offline worker
refinement, rendered input, both themes, promotion, PCM, Shift/Undo and
portrait, with zero page/console errors (receipt SHA-256
`8c8ba1ea2ffd957e941a4112ce244cc50810a818cc628469085d329b30ed9d69`).
This closes publication and the scoped browser gates, **not** current-source
native CPU/GPU parity, responsive startup, a pin amendment, packaged desktop
release or owner visual/audio acceptance.

A [new-source CPU-only Linux retest](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5867789285)
has been requested for exact `cafc934`/tree
`fbb83789a7f25f77b9e363882979f58531f03d66`, after the separate
older-source GPU timing diagnostic closes. It requires fresh two-sample
88 GiB admission, one bounded C/ELF package, original-cadence X.Org input,
routed PCM and save/restart; the request is not a result or GPU grant.

### Rejected nearest-filter speed trial

A reversible local draft swapped only the interactive piece filter from
linear to nearest, leaving the published source/commit untouched. Its ignored
`.artifacts/bend2/playtest-stage2/nearest-sprite-trial-20260928/summary.json`
is SHA-256
`8c2ff9a0c37a6156aa8b053e4bf430900f49f43bba19e150f8b5c739bd59d67d`;
draft build version `c63a72b314b162c0d536` is preserved with build-manifest
SHA-256 `3f9ba35f7866563465f95dea11273ad6133d4631f5f39979e3f03c2237f807de`.
One local Chrome sample cut first sprite drawing from 1,388 to 865 ms and
the refined-after-first-frame interval from 4,085 to 3,700 ms. Enlarged
piece crops showed jagged contours, and the several-hundred-ms gain did not
remove the conspicuous fallback interval. This was rejected as a visual
regression, not promoted as a stable benchmark or published. `PieceSprites.bend`
was restored byte-for-byte; the clean selected module and exact published
`build.json` were restored and the 22+2 live-file verifier passed again.
