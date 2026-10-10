# Current knight mane atlas comparison

The private mane-only atlas chart is unselected. A whole-book check and a
comparison against the current compiled scene passed, but the visible change
is too small to resolve the knight's material mismatch. The body, crown and
pedestal remain visibly flat beside the original piece artwork. This is a
subjective rejection of this default-view candidate, not a claim about all
possible texture charts.

The candidate preserves all 278 current face positions, normals, centers, bands,
marks and ordering. Exactly 24 existing mane triangles receive a chart; the
other 254 faces retain their current flat material. Twenty-one shared vertices
use seven authored height guides. These guides are an authoring hypothesis,
not recovered source-camera coordinates or physical UV calibration. Sampling
uses original atlas RGB, linear filtering, alpha qualification at 128 and the
current dark mane ink as fallback. Feature-marker ink remains unchanged.

The actual comparison used the current selected scene and packaged initial
position at yaw 345, pitch 67, zoom 115, theme 0. It produced one 512-pixel board
pair and one native 64-pixel sprite pair for each side. For both sides, the
disabled candidate matches the current scene's complete color and alpha data.
The textured candidate preserves complete alpha and authoritative picking
data. Each sprite changes 46 color pixels; the composed board changes 169.
Six PNGs and the renderer result total 1,123,584 bytes. Fetch calls were zero.

Both original executions exited 0 with verified membership, output EOF, closed
original process handles and self-only Job closure; neither became unknown.
The compiler's 365 input fences and renderer's 368 fences remained identical.
The earlier missing accepted-pin preload imports were added before dispatch;
the unexecuted binding and source versions remain retained. No compiler replay,
browser interaction, performance screening or production selection followed.

Current `KnightMesh.bend`: `db4def8865d00938ee41999a9d47cd9014c8fc755218fcf263cc9bd84901a6e1`.
Private evidence prefix under `.artifacts/bend2/2035-preview/stationary-motion-20261006/`:
`mane-atlas-20261010-r1-`.

| Evidence | SHA256 |
| --- | --- |
| Candidate source | `99626e30685c0adf6ae20cb511fc4716111143c0710f54bf97d055ab619b3490` |
| Compiled prototype | `552328b51c77a2606f57837928b8ba51b4cee1d718188364cbf961f38a5f81ed` |
| Compile result | `e45bafb1825af9fedd906018034c68fd2e8fb401b8ab1a25e704e2e6cbc9f491` |
| Original compile terminal | `f29ad47bc664d7ecff03d12c349da8e5859d930031eab618a55e93774292b161` |
| Renderer result | `48cfc4fc6f08bee27bf95760c830fbe67a4eb43b123cfed72601aa7fc794d0b4` |
| Original renderer terminal | `abbf8521bb071d56372914328fc5238e4c0df687de2d94e7f2efbcd70fb42c6b` |

This finite comparison does not establish browser, device, timing, arbitrary
camera, compiler-adoption or full graphics acceptance. Production geometry,
atlas, selected scene/package, frozen controls and compiler pin remain unchanged.
The earlier body-wide atlas R3 already had a closed corrected render and a
rejection; its generation metadata alone did not establish an unexecuted state.
The retained historical references under `knight-sculpted-triangles-20261006/`
are `atlas-profile-disposition-r1.json`
(`c282cbdfb48ffd6f1b695675a0626147187ab31821ad0ce7e866ac4e534b3c31`)
and `board-atlas-texture-knight-supervisor-r4/terminal.json`
(`2e7a978ad58c3cd5326ae32aeecf717215d86c0da01bd15f47119d2adec247d8`).
