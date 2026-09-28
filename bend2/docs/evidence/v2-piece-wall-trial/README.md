# Piece footing and exposed-face tint: local draft

This source-dirty Bend 2.0.27 visual trial responds to the owner's report that
pieces sat high, appeared tall and overlapped the next rank, while some rift
faces remained hard to read. It changes only the game-specific
`graphics/v2game/BoardScene.bend` and focused tests: settled sprite height is
1.22 projected pitches (previously 1.35), its visual base shifts down 0.16
sprite widths (previously 0.10), and its contact shadow follows that base.
The existing material's brass edge tints the exposed settled and active-orbit
side colors at alpha 52/255; the tile-top palette and topology/mask are
unchanged. This is a rendered visual trial, not a new Law, native package,
published release or owner acceptance.

The pinned checker passed the five-case synthetic sprite fixture. The
independent color oracle in `BoardEdgesTest.ts` passed its topology and wall
pixel checks, the 288-view motion sweep and 160 additional near-cardinal,
alternate-hole and theme views: 27,260 absolute present-tile top centers,
zero sampled wall spills. These are finite selected-JS pixels, not a geometry
proof. The game-scene selected JS emission validated 1,344 declarations and
bound its source closure before and after emission. A draft browser build
`57e13ede9386bf486be8` from checkout `e36b7f13bc51e915496dbfc4addfda23d4f21fee`
has `sourceDirty: true`; ignored `build.json` SHA-256 is
`6e493c4230681711589aeb01a2ad634da9647bfbf775a540b753f270eb16815e`.
The compact-vs-expanded composed motion image gate remained byte-identical
across four views and three layouts (60,817,408 compared bytes); its
interleaved same-process timings are not a browser frame budget.

Real local Chrome at `127.0.0.1:4191` bound that served build and passed all
13 extended groups, including both-color moves, selection/deselection,
themes, offline worker move, PCM, capture, promotion, Shift/Undo and portrait
with zero page/console errors. Its ignored receipt is
`.artifacts/bend2/v2-preview/scenarios/piece-wall-tint-57e13-20260927/receipt.json`,
SHA-256 `9ea9aad3f99dcd26c646a579a6f07c9170ad8fd63ff5c98ebd541709a843113e`.
The same run retains `05b-warm-court.png` (SHA-256
`cb5cc53fbff79606ca5ae7fb1c41d4069412b7aa022a3b9b0b64efcbe60c96af`).
Four cardinal Chrome captures also passed with no errors; their ignored
receipt is `.artifacts/bend2/v2-preview/piece-wall-tint-angles-57e13/receipt.json`,
SHA-256 `524d51c44825e5fb9ff36872bf964b980f301a093f2e8404156e5fbdb323c61f`.

The earlier piece-only draft `01e40c3c377c1b3e25df` and its same-sequence
warm-court capture remain in ignored local artifacts for comparison. The
wall-tint version changes roughly 20,680 captured RGB pixels in that frame,
including 3,579 in a bounded rift-area rectangle (x 500–669, y 350–529),
measured by a read-only RGB comparison. Our visual inspection finds the
pieces lower and shorter and the visible wall bands warmer, while the dark
rift depth can still look subtle at the default angle. The original TypeScript
site, frozen laws and asset atlas were not edited. Previous native CPU/GPU
results still bind the older `68411c4` source.

## Clean build and hosted preview

After source commit `041932bd367a2d043a4337f9a86c17b650774cdc`, a
non-draft pinned-2.0.27 build reproduced content version
`57e13ede9386bf486be8` with `sourceDirty: false`; clean `build.json`
SHA-256 is `c3a5e1647341a571cd7d665fd41aad9cda08d7bae484b8a50537be4f6a88b4ba`.
Its local served Chrome run again passed all 13 extended groups (receipt
SHA-256 `42ab8caf92b02799c8832bdf2d55fbd529b7cad3e59bd7e3538d038e548ecf55`).
The original TypeScript application's build passed. Its first Vitest run had
61/62 passing and one reflection-asset test exceeding the default 5-second
timeout under local memory pressure; a complete rerun with a 15-second
per-test bound passed all 62/62 in 11 files. This preserves the failed timing
sample rather than calling it a source regression or erasing it.

The separate free [Bend preview](https://haileystorm.github.io/rift-chess-bend2/)
now serves Pages commit `b2ec41512b96310256b153997ebbbc93932c25c1`.
Older hashed assets were retained for returning clients. The first public
verification ran before Pages finished and saw the old deployment; its failed
receipt remains at
`.artifacts/bend2/publication/2026-09-28T03-44-36-495Z-b3e01de2/`.
After GitHub reported the Pages build `built`, the subsequent ignored
`.artifacts/bend2/publication/2026-09-28T03-45-13-785Z-d8876dc5/receipt.json`
(SHA-256 `d6944474f8ffef02c561948a6fc5353e13e110e87553a16fc95f810873022e6d`)
verified all 22 live manifest files and two original TypeScript-site baseline
files. Hosted real Chrome passed all 13 extended groups, including cold
offline play, PCM, themes, Shift, promotion and portrait, with zero page or
console errors. Its ignored receipt is
`.artifacts/bend2/v2-preview/scenarios/hosted-piece-wall-57e13-b2ec415-20260927/receipt.json`,
SHA-256 `df891e1af7afffc4cba41d035994842c3d73a930b2c00fe81d532cc481c827c5`.
The hosted warm-court PNG is byte-identical to the clean local capture,
SHA-256 `cb5cc53fbff79606ca5ae7fb1c41d4069412b7aa022a3b9b0b64efcbe60c96af`.
The separate hosted bot smoke also reached actions 3980 then 20065 both
online and after a cold offline reload; four module-worker files returned
JavaScript MIME from the service worker with no page/console errors. That
command's console result was not saved as a source-bound receipt and does not
exclude a serial fallback by itself; the isolated 2.0.28 diagnostic route
has its own stronger instrumented evidence.
This establishes a public browser preview, not owner visual acceptance,
new-source native CPU/GPU parity or release completion.
