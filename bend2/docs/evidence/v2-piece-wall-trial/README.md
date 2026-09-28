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
site, frozen laws and asset atlas were not edited. This draft has not been
published, tested in a new exact-source Linux package, or accepted by the
owner; previous native CPU/GPU results still bind the older `68411c4` source.
