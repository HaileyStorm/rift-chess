# Knight contact pivot

The sculpted knight uses a pedestal centered on the projected board pivot. Its
contact footprint previously inherited the atlas pieces' forward base shift.
The knight now centers that footprint on the pivot. Other pieces keep the exact
previous expression. Radius, opacity, painter order, artwork, atlas and picking
geometry are unchanged. Drawing and motion bounds share the same kind-aware
base helper; the existing pawn footprint test supplies an explicit pawn kind.

The current 2.0.35 scene was checked and emitted without changing the accepted
compiler pin. Only `BoardScene.bend` changed in its source closure. The controller
and menu retain their existing exact bindings and outputs. The new browser
package remains a draft with `adopted: false`.

An actual legal g1–h3 move was committed through the Bend controller. At all 17
controlled motion stages, complete 512×512 RGBA from partial rendering equals
full rendering: 4,456,448 pixel comparisons. Pixels outside the dirty rectangle
retain the candidate's stationary image. Baseline/candidate changes are confined
to independently calculated knight contact supports; initial differences total
587 pixels. Artwork payload and pick data match exactly.

Independent inspection of the initial and middle-hop images found a subtle
grounding improvement: the detached oval below settled pedestals is removed,
and the moving footprint remains on the board. An intentional cast shadow was
considered; the centered placement better fits this footprint's contact purpose.
The knights' broader material and artwork mismatch remains unresolved.

One fixed-order comparison in Chrome 154.0.8037.98 used two fresh browser arms
at 540×960 and yaw/pitch/zoom 345/67/115. Both passed real knight artwork
selection, g1–h3 commitment, settings open and settings close. Initial view,
layout and position agree; committed positions agree. Six actual canvas PNGs
were retained; initial before/after images show the same subtle improvement.
Both arms drew motion stages 0 and 16, with no intermediate stage observed.
The 17-stage coverage above is controlled Node rendering, not natural Chrome
delivery. Completion after the pointer request was 441.1/464.1 ms in this
single pairing; neither value establishes stable comparative performance.

Private source-bound receipts remain under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

| Receipt | SHA256 |
| --- | --- |
| Scene emission, `knight-contact-emission-supervisor-20261010-r1/terminal.json` | `fcaa397784b450945d76c156d83fa9825303d8eb746e8f2dd0e904dd06db698b` |
| Finite pixels, `knight-contact-finite-supervisor-20261010-r1/terminal.json` | `f801c255170875d495478f6c7fc7e05a885ca18b9bae7a4dafdbcef3368c9035` |
| Finite result, `knight-contact-finite-20261010-r1/result.json` | `13d98919777c28a2d09efefd5f15185a4913b76c74cdd67e4916d5e6b009b033` |
| Draft build, `knight-contact-build-supervisor-20261010-r2/terminal.json` | `f261e10cbe34de9f17824b12c03a7e1f329dc19e11064807e8dd85a5e1ad4a6c` |
| Chrome pairing, `knight-contact-browser-supervisor-20261010-r2/terminal.json` | `806302c871a7fc96eee417f81bbd3052e0a84f99a57c271fc690cd0283aacd73` |
| Chrome result, `knight-contact-browser-pair-20261010-r1.json` | `d444d301a69be62a70265b96bb3ed724a5dd5f58177f1077e07c485ec18fc444` |

These four original units exited successfully with bounded stream EOF, closed
handles and self-only checked Job closure; respectively 266, 300, 389 and 496 source
fences remained unchanged. Failed source preparation was corrected before build
dispatch; the original script and preimage remain retained. No outer process
signaling, uncertain replay, native GUI/device acceptance, stable speedup,
Linux/kernel result or compiler adoption follows from these finite witnesses.
