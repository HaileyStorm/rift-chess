# Source-bound v2 browser deployment — 2026-09-26

The [separate Bend preview](https://haileystorm.github.io/rift-chess-bend2/)
serves version `f261f9d623e679d401f7` from clean source commit
`bfc069dc2b4ebd1bdd96e5111073e3243f642beb`. GitHub Pages commit
`cbdd4fc` published the static bundle; `555e098` subsequently marked `.rga`
assets binary without changing their bytes. `build.json` reports `draft: false`
and `sourceDirty: false`, with frozen semantic hashes and the bot library's
source binding. All 21 asset responses returned HTTP 200 and matched its
SHA-256 entries. All four `.mjs` bot modules were served as JavaScript.

The extended real-Chrome hosted suite passed 11 groups without page or console
errors: both-color moves, piece deselection, both themes, Undo consent,
capture, underpromotion, PCM, Shift, portrait controls, and a cold offline
module-worker sprite refinement plus move. The local full receipt remains at
the ignored path recorded in [receipt.json](receipt.json). Inspected hosted
[selection](selected.png), [warm court](warm.png), and [portrait](portrait.png)
frames are retained here; their hashes bind them to that receipt.

The dedicated hosted bot test starts local-opponent matches online and after
a service-worker-controlled cold offline reload. In both, e2–e4 is followed
by Black's canonical action `20065`; the same 18 bot module responses include
the helper entry, program, runtime, and module worker, all HTTP 200 with
JavaScript MIME and service-worker delivery. The pure Bend bot integration
gate separately exercises actual jobs/results and guards. The hosted test
does not independently instrument the helper's job counter, so do not infer
GPU execution or a particular helper-versus-fallback scheduling choice solely
from these four module requests.

This is release transport and rendered interaction evidence, not native
graphical parity, GPU game speed, or owner visual acceptance. The original
Three.js site is in a separate repository and was not changed by this deploy.
