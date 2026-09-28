# Compact MOVES overflow regression (draft, not published)

The stage-two rendered playtest had stale coordinates and controls after the
compact presentation changed. On the public 2.0.27 piece/wall source, four
selected scenarios reported 13 major and one minor defect in the ignored
`baseline-2027-piece-wall-input-20260928/summary.json` (SHA-256
`b2fced7b77fe882736cf005cbbedd1815d286d6af05ab58b851eeda6b1f282a3`).
The isolated 2.0.28 browser candidate reproduced the broad failure pattern.
Most failures were test-driver assumptions: fixed board origin, old CLEAR
button, direct camera buttons, and uppercase status strings. Do not count
those initial failures as 14 product defects or discard their receipts.

After binding square clicks to `shown.plan.board`/`scale` and using the
current keyboard and View rail, a real defect remained: Layout represented
overflowing legal destinations with the MOVES (47) opener, but
`ApplicationControl.compact.play` filtered that control out when destinations
existed. A small `ui-layout.ts` regression failed before the source fix and
passed after it; compact controls now retain the opener. No rules, frozen
law, sprite, asset, or compiler source changed.

The source-dirty local 2.0.27 draft `34c9788cba8683f6f50a` has exact served
`build.json` SHA-256
`d47ae66003954edacddc8528cf5d9add98a15970cd5b9a44e4016ba831f65c0a`.
The corrected playtest binds the served manifest to that local file and
reports its version and source revision. Selection and camera passed with no
defects in the retained `compact-overflow-fix-interactions-34c978-20260928`
run (SHA-256 `35ac5b1aef5de0e683b5618d7e4e7da1dc010e6b482eb11373eb6c61e2f4e24d`);
its Shift failure was one subsequently corrected stale CLEAR test action.
The final bounded Shift run passed with zero defects, receipt SHA-256
`41dc17156a8c451f8ea847798569dd315e6f9878d4ad4ee156f2947a3ab65ba8`.
The mobile run passed the queen overflow MOVES assertion, opened and closed
the legal-moves panel through rendered controls, and had zero defects;
receipt SHA-256
`11a9d12758ed3e01c94bada666649c5f63ab37b0184a9d8e307f90a95b5bdbd3`.
The mobile panel screenshot was visually inspected; some content remains
crowded, so this is not owner visual acceptance.

The separate bound Chrome hotseat suite passed with no errors and a served
manifest byte match; its receipt at
`.artifacts/bend2/v2-preview/scenarios/compact-overflow-fix-34c978-20260928/receipt.json`
has SHA-256 `619ff4de3fee6ec03704d09d4e2d697cc441918ecbfb23889920927a2750af05`.
These receipts are ignored local draft evidence. They do not prove the full
historical playtest matrix, hosted publication, Linux/native behavior,
2.0.28 candidate parity, or the owner's visual acceptance.

## Clean build and hosted preview

Source commit `12ff101776b03283f564262b32d10bf775b6c36d` reproduced the
content version above under the clean 2.0.27 pin. Its non-draft manifest has
`sourceDirty: false` and SHA-256
`791aba13d85584ad5a48bcb3e284bd617566292e953b5ab51c9f09a565dfbdfd`.
A bound local Chrome run passed (receipt SHA-256
`d479853aac1a80556e08ed73c90955970c0cacdc448625f7673d192c5d221019`),
as did the clean-build mobile overflow run (summary SHA-256
`97329f2f6beb344e53c93e5cc6dddb3f11cb15c7c82a0d32428b2d292898e596`).
The original TypeScript app passed 62/62 tests and its production build.

The separate [Bend Pages preview](https://haileystorm.github.io/rift-chess-bend2/)
was updated at `3066a1e6bc38d0dabf19996c9ca1104ad2a47dcb`; old hashed assets
were retained. Verification before Pages deployed captured the previous site
(failed receipt SHA-256
`0e8ab39b5f7414babef8b45fd2e186358e1194a77f8d68ee2e50c92ea7b33797`).
After Pages reported `built`, the new byte receipt passed all 22 Bend assets
plus two unchanged original-site files (SHA-256
`ed2ed29c0620e65f2ee9cfaecfdb752cbe86c72234f3f25acb747b03697151dc`).
The hosted extended 13-group real-Chrome suite passed offline play,
promotion, Shift/Undo, both themes and finite PCM without page or console
errors, source-bound receipt SHA-256
`f1d7478a1e14380c69a112bb2be62e140dfcb4b25bd370662e81d3491cc6c1f7`.

The clean mobile screenshot also exposed a separate presentation defect:
MOVES opens, but the contextual Close/heading overlap the last destination
row. That follow-up is not included in the published build above. Hosted
success is not owner visual or native acceptance.

## Portrait menu spacing follow-up

The first live MOVES screenshot showed the Close button over a destination
and its contextual heading through the last row. A direct `ui-layout.ts`
attempt with an additional geometry import exceeded the bounded loader time;
it is not an assertion result. The geometry check was split into the focused
`compact-overflow-geometry.ts` test, which passed: 27 destination groups end
at y=886, Close starts at y=909, and its bottom remains inside the 1024px
canvas. The mobile MOVES heading was likewise placed below that worst-case
grid. No rules, sprites, assets, frozen laws or compiler source changed.

The local source-dirty 2.0.27 draft `8ed3bdbb4ba1d72a9497` has served
manifest SHA-256
`46fab20625da0ffa1e6a97979a909f095f3c8db4482425c840352b184009702a`.
The rendered mobile overflow run passed with zero defects (summary SHA-256
`f8c7b147e35c6070c84dd91974c8509639623a3fee4a6422e45d2c0c76c0d799`).
Its inspected `07-moves-panel-L1.png` (SHA-256
`862bbc0806be7a8ecfaa35ef552ab6ba4b9b89de86db8e98afb42b9db2824772`)
shows the heading and Close below the visible destinations. The source-bound
local Chrome hotseat suite also passed, receipt SHA-256
`bb2ddad8555a55f38e104c4d78da65278b879b9999732bcda61acda7e5f2d035`.
This follow-up remains draft until a clean build and publication check.
