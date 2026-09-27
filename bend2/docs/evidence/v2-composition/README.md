# Camera, grounded pieces and exposed-wall composition: local draft

Owner feedback after the first hosted edge preview: some outer/rift faces
still seemed absent, the sprites sat high and tall, back-rank pieces overlapped
pawns in front view, and silhouettes needed clearer separation or grounding.
This pass changes only the game-specific Bend scene/camera and tests, leaving
the frozen rules, authored atlas, runtime piece pages and original TypeScript
site alone. It is not owner acceptance.

The default view changes from yaw 345°/pitch 52° to 345°/67°. The 330°/67°
alternative gave more equal side widths but compressed the board horizontally;
the first remains the default. A saved view exactly matching the previous
factory triple (345°, 52°, 115%) migrates at load; custom angles are preserved.
Sprite height changes from 1.48 to 1.35 times
the projected pitch, and the visual base moves down by 0.10 of sprite width.
A restrained contact footprint sits behind the existing alpha sprite; it does
not replace the artwork or add a second sprite-affine pass. The first, broad
shadow trial looked like detached gray ovals and was rejected; the narrower,
lighter footprint is the candidate.

The settled tile path now paints cast shadow, only the four topology-exposed
vertical wall candidates, tile top, narrow four-edge top seams and the
exposed-only lip in that order. It no longer draws generic fixed side faces
over the rift/perimeter wall materials. The extrusion multiplier changes from
4 to 5 to preserve side thickness at the steeper camera pitch. Back-facing
vertical facets are physically occluded, not promised visible at every yaw;
the compact active-orbit ground is still flat until settled refinement.

The pinned 2.0.27 checker reports `All terms check.` The final focused edge
test checks four cardinal and five oblique yaws at the 67° pitch for
camera-facing exact wall material, the transparent rift core, adjacent tops,
and shared-neighbor predicates. At default yaw 345°, its selected rift-face
samples retain 167 rank-down and 28 file-left exact-material pixels at 256px;
the two opposite faces have zero exact-material pixels. This is a finite
render test, not proof of every orbit angle or subjective quality. Picking
passes 2,511 checks. The sprite test confirms side/kind, absent-tile
suppression, selection/hover cues and a bounded contact footprint.
The saved-view test preserves a custom 330°/52° view; browser localStorage
reload from the old factory view renders the new 345°/67° view.

Local draft browser content version `f2369ed40dae326d895e` came from a
source-dirty working tree at HEAD `13e1413bfd31f32eb687ea86dbba77212fcdc320`;
`build.json` SHA-256 is
`498105b732253682206f1cef7203a723bbac815b02f1808657c1b8c4fe66ec13`.
The composition capture receipt is
`.artifacts/bend2/v2-preview/final-draft-f236-20260927/receipt.json`
(SHA-256 `6428b26f920a780310c5e521f01dab6b1f322fc8d9e2974d4b5ac198f47f8215`),
with default, 330°, Front and persisted-old-default reload screenshots.
The migrated/default PNGs are byte-identical; their SHA-256 is
`e0f4f125954f6dee919cbe735141254c9ce718ffe71949d09f39a44e1b85cf93`.
The extended real Chrome scenario at `http://127.0.0.1:4187/` bound the served
manifest exactly to local bytes and passed all 13 groups with zero browser
errors, including both-side moves, saved reload, file import/promotion,
offline move, PCM, Shift/Undo and portrait. Receipt:
`.artifacts/bend2/v2-preview/scenarios/final-composition-f236-20260927/receipt.json`
(SHA-256 `00f2d95c5a97fc0b9c2c2e766709535f282774017ac176c11ee0edba218c40d3`).
The BoardScene source SHA-256 at this draft is
`2b91706e5ac875f1c2027c56dfe92c954b74b979da013a30f210c494aee9224f`.
The native X11 g1/h3 click probe and the CPU timing fixture now derive or use
the 67° default rather than 52°. The finite compact-motion test compared 60,817,408 emitted
bytes across four angles and three layouts with exact equality; its
same-process timings are diagnostics, not a native or browser frame budget.

The older [Linux report](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5858004336)
binds only the prior published `f8a7fbf` source. The subsequent
[new-source result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5858793813)
binds clean `4f6e52f`, tree `e3b0354` and all six requested file pins. The
88 GiB guard admitted the host after read-only, initial and just-before-C
emission measurements; one CPU package build passed in 462.89 seconds with
38,316,064 KiB measured peak RSS. Package receipt SHA-256 is
`4dc1e2e04e14f0934a2bdb69329aeed199ce6db6b610e48dd4fbe11a5747cf5d`,
ELF SHA-256 `708ead8b1c274a45cb6321eed40295785a7879bd86592544af621ea0a3b1ab48`.
On real X.Org :1, g1 select/deselect, g1-h3, close and a fresh-data relaunch
with Black to move passed. The existing PipeWire sink monitor captured idle
silence and 12,762 nonzero move samples at 48 kHz stereo s16, without clips.
This is host-reported CPU/window/routed-PCM evidence for that published
source, not physical audibility, saved-old-view migration, a Windows-native
run, GPU parity or owner visual acceptance. No CUDA/GPU grant or compiler pin
amendment is claimed.

## Clean publication and remaining gates

After commit `4f6e52f2e93ac5c925c0348682e55bace4e7ffcf` (tree
`e3b0354678a6d7bbfae9b170d627bde35271ac2a`), the non-draft 2.0.27
browser build repeated the draft content version `f2369ed40dae326d895e`.
Its `build.json` SHA-256 is
`eddff4ee97e16d29a747b63de6a9db54f4b07890664e8c7eb999776f23aaccc7`.
The separate free [Pages preview](https://haileystorm.github.io/rift-chess-bend2/)
published this build at commit `233d8920aecd776a121beb8a4fd1cf5152c1a30e`.
The first byte check immediately after push saw the old deployment and failed;
the preserved receipt is under
`.artifacts/bend2/publication/2026-09-27T18-32-48-442Z-e722a1b2/`.
The subsequent
`.artifacts/bend2/publication/2026-09-27T18-34-47-724Z-ad226db7/receipt.json`
(SHA-256 `9b8b8b382b886905375d8b1918e025f4d2bc889aa393635e92153dc2236a6f26`)
verified all 21 manifest-listed assets plus `build.json`, module MIME, and
two unchanged files from the original TypeScript site. Historical hashed
assets and CLI exports in the Pages checkout were retained for returning
clients and provenance.

The hosted extended Chrome scenario bound served `build.json` bytes to the
clean local manifest and passed all 13 groups with zero browser errors,
including offline, PCM, Shift/Undo, promotion and portrait. Receipt:
`.artifacts/bend2/v2-preview/scenarios/hosted-composition-f236-233d892-20260927/receipt.json`
(SHA-256 `88dc9241804ef9717012adc7ca78420ccc24581b6e9f0f4c7275aea3d6ad8be2`).
The hosted desktop initial capture SHA-256
`e0f4f125954f6dee919cbe735141254c9ce718ffe71949d09f39a44e1b85cf93`
is byte-identical to the visually reviewed draft. This establishes a public
playable browser checkpoint, not owner subjective approval, a new-source
native CPU result, GPU parity, or a packaged desktop release. One
[new-source CPU-only Linux request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5858608451)
binds the clean commit, tree, builder, scene, camera, preferences, X11 probe
and pin hashes; it explicitly excludes CUDA and GPU probing.
