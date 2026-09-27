# Bend-owned camera rail, published checkpoint

The [separate Bend game](https://haileystorm.github.io/rift-chess-bend2/)
serves non-draft build `f61152159a6331b9db2d` from clean source
`6721cf06169beb2165f1a18a595d36e811e342e2` on pinned Bend 2.0.27.
The Pages repository commit is `64a0ec2c647b7d9eac28dbbe505dc696d0ee2c02`.
The published `build.json` SHA-256 is
`943ce246199b212ca0df48eeb1bc1d7c4aa4ed0f4b14daa0bad552d2ca54c37e`.
A direct public fetch matched all 21 declared asset hashes and JavaScript
MIME for all four module-worker files. Older hashed files were retained.
The [hosted Chrome receipt](hosted-receipt.json), SHA-256
`9eef7ee0d73b42cfba52ce077428568fb004df6fe2485756608af5d1f1bb5c15`,
passed the 12-group extended interaction/offline scenario with zero browser
errors. The complete v2 proof entry and finite conformance passed separately
in the clean source checkout; local ignored receipt SHA-256
`fc94d9330d791e6640fcb3be84ccf447c02d3d9e9efaaa36da5c7c570cbae2ae`.

Desktop View now opens a narrow right rail rather than a dark centered modal.
The board remains visible while Front/Top, orbit, tilt, and zoom controls are
used. The same planned rectangles drive painting and hit tests. Portrait keeps
its below-board dialog. The default 115% zoom now has three real increments
to 130%, then clamps; wheel input shares the same bound.

[`zoom-130.png`](zoom-130.png) is an actual Chrome 153 capture at 1280×800,
after the source-bound sprite helper's *applied* refinement; SHA-256
`f91a3fafc9cd717fd26a44c91a175d965b76a944768a65a3a525aa58f365bffe`.
The screenshot came from the draft build of the same asset version before
the clean publication. The UI test clicked
the Bend controls and observed zoom values 120, 125, 130, 130. Bend source
checks, the camera picking oracle (2,511 checks), `native-program.ts`, the
compact menu plan, and the extended Chrome scenario (12 groups, zero errors)
passed on this worktree. This is rendered interaction and visual review, not
owner WOW acceptance or native parity for the new source.

An isolated experiment rendered all drag feedback at 128 pixels rather than
retaining 256-pixel pieces. A paired Node sample reduced median scene work
from 15 to 10 ms. Two real Chrome A/B drags showed median pointer rendering
roughly 54→32 ms on one pair, but the 128-pixel image lost piece shape and
weakened void cues. That change was reverted. The shipped motion path keeps
256-pixel pieces and their cues; optimize it without lowering their legibility.
Rapid successive zoom actions in the captured run took about 24 seconds from
launch through the next applied detailed sprite refinement. This run includes
startup and four inputs, so it is not an isolated helper latency measurement.
