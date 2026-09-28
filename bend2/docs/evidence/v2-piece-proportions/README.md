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
