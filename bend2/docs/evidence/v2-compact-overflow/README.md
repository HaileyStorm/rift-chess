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
