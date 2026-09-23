# Rift Chess — isolated Bend2 sprint

Owner request: publish the accepted TypeScript game, then try a separate Bend2
adaptation through documentation, cautious laws, proofs, a focused pixel graphics
library, playable game, testing and iteration. Do not replace the released game
until this experiment proves itself. The owner waived prior approval of the initial
laws while asleep; this does not authorize quietly weakening them later.

The existing game is published as 1.2.1. This checkout is `codex/bend2-adaptation`,
based on that release. All experiment files belong under `bend2/`. The existing
application and reference remain comparison inputs, not alternative runtime code.

## Sequence and completion requirements

1. Gather primary docs/examples, pin the toolchain, execute language/proof probes,
   and write a comprehensive local guide. **Complete; probes passed.**
2. Brainstorm and review laws in plain English. Freeze semantic specification,
   formal laws and normative dependencies with hashes and a versioned decision.
3. Implement the small pure rules kernel needed to make those laws meaningful and
   prove them. A playable UI comes later. Reject TODOs, unsafe assumptions and
   foreign dependencies in the proof cone. Test that a deliberate violation fails.
4. Build an MVP pixel engine: pure immutable image/scene construction, deterministic
   picking and clipping, a thin host blitter, and carefully balanced parallel work.
5. Compose the actual game, including ordinary moves, tile shifts, special moves,
   local play/opponent, clear selection, animation, sound and persistence/replay.
6. Build a static browser bundle; compare rules to reference fixtures; play through
   the actual rendered UI; inspect frames and iterate. Preserve failures and honest
   limits. Commit/push the separate branch and provide its own preview/artifacts.

## Parallelism contract

Agent work is bounded by file ownership. Runtime parallelism is a separate design:
independent immutable subtrees/tiles and balanced evaluation branches may fork/join.
Input ordering, state transitions, host buffer writes and presentation remain
serial. Never use unsafe Array aliases or shared mutable pixel buffers. JS executes
sequentially; native parallel performance requires separate evidence.

## Law change discipline

Draft brainstorming is not a law. Once `LAWS_V1.md`, `LAWS.bend` and their normative
dependencies are frozen, build/proof scripts verify their hashes. A change requires
a recorded counterexample or precise defect, a plain-English rationale, an exact
semantic diff, independent review, and a preserved old version. Fix implementation
or proofs first. Never weaken a law merely because a proof is difficult. The
amendment gate is part of the build, not just an instruction in prose.

## Status

Documentation, rules, proofs and pixel library complete. Core and pixel semantic
v1 manifests are frozen; all 13 core/11 pixel laws, six negative mutations,
14-position/223-successor conformance, 33 match checks and pixel tests pass.
The isolated browser game is implemented and published separately at
https://haileystorm.github.io/rift-chess-bend2/.
Rendered pointer moves for both sides, Shift, undo, reload, capture, underpromotion,
draw/resignation recovery, local bot, rapid replay invalidation, renderer recovery,
malformed-save preservation, cold offline play and mobile/menu layout pass.
The public build's seven assets match their local hashes. All ten hosted browser
scenario groups pass with no page/console errors, including cold offline play and
coexistence with the original game's service worker. Source is pushed on
`codex/bend2-adaptation`; the deployment repository contains only static output.
The requested sprint is complete; receipts and limitations are in
`docs/VERIFICATION.md`. The original 1.2.1 deployment is unchanged.
No native Bend CPU/GPU benchmark or owner visual acceptance is claimed.

## Active follow-up: complete portable Bend application

The completed release above is historical evidence for the initial hybrid host.
The owner's expanded acceptance request is now active: move all application UI,
font rendering, input policy, audio synthesis and persistence codec into Bend;
retain only generic browser IO transport; export the same application through
native Bend Window/Audio/File effects; repair drag responsiveness/direction and
selection toggling. Keep reusable graphics and their laws/proofs in `lib/graphics`.

The new independent v2 rule contracts cover both colors, ordinary chess and Rift
special rules, with structural legality, reachable play and coherent history
distinguished explicitly. Original frozen v1 files remain immutable provenance.
Current gates include closed per-rule/match laws, both-color differential cases,
library pixel checks and pure application tests. Final law freeze/review,
integrated browser playtesting, native export, deployment and source handoff are
still in progress; earlier completion statements do not cover this expansion.

## Retained material and boundaries

The original TypeScript application remains the production game and its reference
fixtures remain an independent comparison input. The early law brainstorm is
design history, not a second normative contract. Failed runs, temporary probes
and the rejected nested-site staging copy remain in ignored local artifacts;
canonical positive receipts are checked in. No original runtime code is used by
the Bend browser app. Future multiplayer, native performance work and a Bend
desktop package are separate extensions, not hidden prerequisites for this sprint.

## Follow-up: camera and open gaps

The owner reported the fixed isometric view and solid-looking missing platforms.
The follow-up replaces fixed projection with a shared Bend camera for drawing and
picking, adds visible orbit/tilt/zoom controls and an overhead preset, and omits
all missing-platform geometry. Hover and Shift feedback use hollow outlines.
Frozen laws and their normative dependencies remain byte-for-byte unchanged.

Local projection/picking checks pass (2,304), and 48 rendered-ground cases pass
4,640 checks including interior gap masks. Original capture, promotion, bot,
save/recovery and offline scenarios pass. The focused browser check covers
rotated pointer moves, Shift, persistence, wheel behavior and mobile controls;
review also prompted click/animation timing regressions. The dedicated public
preview passes all seven camera scenario groups. Every live asset matches the
clean build, and an old offline profile survives an explicit refresh, a resumed
move and a cold-offline Undo. Source and deployment are pushed; this follow-up is
complete. Existing open tabs should be refreshed to load the new controls.

## Whole Bend application release checkpoint

The camera release above is historical. The expanded whole-application sprint
remains active until the clean source/C export and hosted publication checks.
The browser UI, bitmap text, input policy, replay, PCM and game are now Bend;
the reusable graphics package and its own Laws/Proofs are separated and frozen.
The final v2 semantic manifest closes 134 named laws, including independent
canonical membership/order/uniqueness, both-color ordinary and Rift rules,
move/Undo history, either-side controls and adjudication. Six mutations reject
after positive controls pass. Its immutable readiness and independent review
receipts are in `docs/evidence/laws-v2/`.

The final local rendered run at `.artifacts/bend2/native-ui/whole-app-copy-final/`
passes 17 groups: both-color moves, off-turn choices, capture/promotion, Shift,
selection toggles, animation, PCM audio, hotseat Undo consent, bot play, offline
use, corrupted/transient storage recovery, incremental import and mobile
destination overflow. The inspected actor chooser and selected piece are legible.
Incremental generic pixel transport removes a measured 32–44 ms full-blit cost.

The graphical Base Window/Audio/File entry point checks as source but exceeded
two bounded 600-second C emitter attempts. A separate text Bend CLI over the
same v2 kernel and record codec emits browser-independent C. Its pure command
tests pass; native binary execution is not claimed. The pinned JS Base File/IO
effects require POSIX libc and cannot run on this Windows host; available WSL
has no C compiler. Root owns final Git, clean export, hosted playtest, returning
offline profile and claim release. The original published game is unchanged.
