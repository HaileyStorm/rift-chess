# Bend-owned camera rail, local checkpoint

Desktop View now opens a narrow right rail rather than a dark centered modal.
The board remains visible while Front/Top, orbit, tilt, and zoom controls are
used. The same planned rectangles drive painting and hit tests. Portrait keeps
its below-board dialog. The default 115% zoom now has three real increments
to 130%, then clamps; wheel input shares the same bound.

[`zoom-130.png`](zoom-130.png) is an actual Chrome 153 capture at 1280×800,
after the source-bound sprite helper's *applied* refinement; SHA-256
`f91a3fafc9cd717fd26a44c91a175d965b76a944768a65a3a525aa58f365bffe`.
The draft browser build was `f61152159a6331b9db2d`. The UI test clicked
the Bend controls and observed zoom values 120, 125, 130, 130. Bend source
checks, the camera picking oracle (2,511 checks), `native-program.ts`, the
compact menu plan, and the extended Chrome scenario (12 groups, zero errors)
passed on this worktree. This is local rendered interaction and visual review,
not a published build or owner visual acceptance.

An isolated experiment rendered all drag feedback at 128 pixels rather than
retaining 256-pixel pieces. A paired Node sample reduced median scene work
from 15 to 10 ms. Two real Chrome A/B drags showed median pointer rendering
roughly 54→32 ms on one pair, but the 128-pixel image lost piece shape and
weakened void cues. That change was reverted. The shipped motion path keeps
256-pixel pieces and their cues; optimize it without lowering their legibility.
Rapid successive zoom actions in the captured run took about 24 seconds from
launch through the next applied detailed sprite refinement. This run includes
startup and four inputs, so it is not an isolated helper latency measurement.
