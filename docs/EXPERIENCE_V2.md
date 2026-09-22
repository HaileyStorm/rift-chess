# Experience pass — September 21

The owner rejects the previous visual acceptance as insufficiently compelling.
The supplied screenshot shows a selected f3 knight with nearly invisible feedback,
truncated instructions and an overly prominent alternative tile action. The piece
was movable; the interface failed to communicate that fact. Preserve this distinction.

The requested direction blends a dramatic living diorama with a surreal rift arena.
Themes may lean differently: theatrical physical Gallery, impossible celestial
Nocturne, bright monumental Daylight. This is a new aesthetic requirement; previous
release tests remain historical correctness evidence, not approval of this design.

## Implementation and review

- Piece hover and selection must be unmistakable on the sculpture and its square,
  without exposing optional legal-move hints or modifying shared materials globally.
- Clicking a piece chooses the piece regardless of prior tile intent. Tile edges
  choose tiles; keyboard tile intent remains an explicit accessible alternative.
- Prioritize selected piece/type/square and destination instruction. Keep optional
  tile transport visually secondary; never truncate the primary instruction.
- Captures have anticipation, attack, contact and a visible victim death sequence.
  Knight impact follows landing. Skip, reduced motion, promotion and stale-state
  cancellation retain exact final rules state.
- Original local sound provides selection, movement, impact, tile motion, promotion
  and check cues. Unlock on interaction, offer immediate mute, stop on background
  and supersession. Sound is never the sole state cue.
- Improve menu hierarchy and layouts across desktop, phone and native scaling.
- Inspect actual renderer output and listen to generated sound. Show a coherent
  playable slice for owner judgment before calling the wider art direction accepted.

The Bend2 research is independent. No language conversion, provider setup or
multiplayer implementation is authorized merely by this brainstorming request.
Rules, saved records, free browser delivery and offline play remain preserved.

## Implemented candidate and evidence

Piece hover/selection now outlines the sculpture and frames its square. Direct
piece clicks override Tile intent; blocked pieces stay visibly selected, including
those that can travel only by tile. The action dock names the piece and square,
wraps its instructions and subordinates the alternative tile action. Menus are
closed by default, settings/new-match layouts are rebuilt, and a persistent mute
control gates six original local sound cues.

Captures now stage approach, contact, recoil and victim fall/shrink/fade. Knight
landing triggers contact sound once. Actual video inspection caught a black-piece
rotation defect: detaching a piece can change its equivalent Euler representation.
The death tilt now composes with its original quaternion, and rendered-input
regressions require victims to remain upright and opaque before contact. Skip and
reduced-motion paths preserve the final rules state.

Gallery, Nocturne and Daylight have distinct rebuilt architectural compositions
and lighting. Nine reflection maps were regenerated from the final world source.
The world captures exposed and corrected an upright Nocturne rim crossing play.

The production build passes, as do 58 tests in 9 files. Real-input browser checks
cover f3 selection across all themes, 1092px/390px layout, menus/mute, phone/tablet
touch, five renderer lifecycle cases, and capture/en-passant orientation. Fourteen
world captures have no browser errors. See [verification.json](evidence/experience/verification.json)
for individual evidence boundaries and retained local receipts.

Audio was rendered through Chromium and checked for nonzero output and clipping.
This session cannot listen to audio input, so subjective sound quality is still
unverified. The preview sequence is at
`.artifacts/audio/review-1790006705627/cues.wav` (select, move, capture, Shift,
promotion, check). Existing Windows packaging and public hosting remain the prior
1.1 release; this source candidate is available through the local preview.

Status: implementation and bounded verification complete. Owner aesthetic judgment
and subjective audio listening remain open; no new release acceptance claimed.


## Follow-up: visible worlds and automatic detail

The owner found the experience much better, but Stone Court remained underwhelming
and the Observatory architecture was outside the normal play view. The follow-up
brings recognizable observatory buildings and richer planted/water court elements
into near-board framing. Gallery and the Bend exploration are outside this change.

Graphics now defaults to Automatic, including legacy saves without a quality mode.
The existing concrete quality value remains in the save for backward compatibility;
an optional auto/manual mode records the user's choice. Manual levels remain fixed
and persist. Automatic starts Balanced, waits for settled foreground play, samples
sustained frame performance, lowers detail under load, and requires two fast windows
before upgrading. A downgraded tier is not retried until recalibration, preventing
oscillation. Settings shows the resolved level beside Automatic.

Follow-up status: implemented and verified. The production build and 61 tests in
10 files pass. Browser checks verify the fresh Automatic default, manual High
remaining fixed under artificial load, Automatic lowering detail under that load
without a match change, manual persistence and legacy-save migration. Eight world
captures cover White, Black, Overview and Top cameras at 1092x921; the dome houses,
side instruments and near-board planted fountains are now visible during play.
See [follow-up evidence](evidence/auto-worlds/verification.json). The first migration
fixture attempt was overwritten by the old page's expected beforeunload autosave;
the corrected test installs its legacy fixture before the next page starts.
The public/native release remains unchanged.
