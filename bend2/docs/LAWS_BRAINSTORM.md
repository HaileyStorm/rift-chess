# Law brainstorm — draft, not the frozen law set

## What must be protected

This remains Rift Chess 1.0: ordinary chess moves on fourteen sliding 2x2 tiles,
two holes, legal tile moves with at most one friendly non-king passenger, king
safety, special moves and promotion. The new art/UI may differ. A rules kernel
must be pure and transport-independent. Pixels, pointer handling and browser IO
must not become hidden authorities over legality.

The laws should protect the actual runtime entry point. Proving a disconnected
model, or merely proving that a validator agrees with itself, would be insufficient.
A frozen executable specification and independent reference fixtures are needed
alongside safety invariants. Proofs do not establish that an English requirement
was translated correctly; review and counterexamples address that boundary.

## Proposed normative structure

- `Model.bend`: immutable integer-only Position and Action types, list/coordinate
  utilities; normative dependencies frozen with laws.
- `Spec.bend`: explicit legality, move effects, special-move/Shift rules and state
  validity. Frozen normative specification, reviewed against the existing rules
  and immutable reference fixtures. It may also be the simple reference execution
  used by the initial kernel; optimized replacements must refine it.
- `Kernel.bend`: public accepted/step/replay/action-list APIs used by the browser.
  Laws bind this API to Spec and to state invariants. Never route gameplay around it.
- `Pixel.bend`: small pure quadtree sampling/composition and board-picking contract.
  Rendering presentation code can change; sample order and cell mapping cannot.
- `LAWS.bend` and `LAWS_V1.md`: formal claims and plain-English meaning, assumptions,
  exclusions and named proof obligations; freeze only after review/type-shape checks.
- `PROOF.bend`: actual witnesses, no TODO, unsafe def, foreign assumption or F32
  dependency in the proof cone. The compiler/runtime remain explicit trusted bases.

## Candidate laws to retain

1. **Specification refinement:** for every input state/action, runtime acceptance
   and resulting state equal the frozen specification. This binds actual gameplay
   rather than an unattached toy model. Spec is part of the protected law surface.
2. **Rejected input is inert:** invalid source/destination/promotion or prohibited
   action returns the exact old Position. No turn/counter/rights/EP mutation.
3. **Valid start:** both published B and C starts satisfy the structural invariant.
4. **Invariant preservation:** starting from a structurally valid Position, a public
   step preserves 64 cells, valid piece codes, exactly two in-range hole tiles,
   empty hole cells, exactly one king per color, bounded rights/EP metadata and
   coherent side/turn representation. This is a real predicate, not a constant.
5. **Accepted action changes the turn exactly once:** next side is the opposite
   and the action counter advances once. Rejected actions do neither.
6. **King safety and survival:** accepted actions preserve both kings and leave
   the moving side out of check. Shift cannot carry a king or an enemy passenger.
7. **Locality and material:** move/Shift edits exactly its authorized cells; no
   piece appears elsewhere; captures can reduce material count, promotion replaces
   one pawn, tile transport preserves passenger identity (apart from promotion).
8. **Playable progress witnesses:** concrete legal ordinary, loaded/empty Shift,
   capture, castling, en-passant and all promotion examples are accepted with the
   expected state. This prevents an implementation that rejects everything from
   satisfying safety claims. The fixture set remains explicitly finite evidence.
9. **Replay composition:** applying concatenated action lists equals sequential
   replay of the two lists. Host animation/time cannot affect the pure result.
10. **Parallel enumeration parity:** balanced independent source ranges concatenate
    to exactly the same ordered legal actions as sequential enumeration; tie order
    remains deterministic. No shared mutable arrays or atomic framebuffer aliases.
11. **Pixel quadrant correctness:** the sampler's NW/NE/SW/SE routes agree with the
    image constructors, and Solid gives its color for every sample path. A copied
    JS blitter is a separate trusted boundary tested against the Bend sampler.
12. **Picking consistency:** each of the 64 projected cell centers maps to that
    same cell; outside-board positions cannot become legal cell coordinates.

## Candidates to exclude or narrow explicitly

- “The game is bug-free” / “the AI cannot cheat”: not a meaningful bounded claim.
- Native/GPU speed, performance or cross-driver pixel identity: measurements, not
  algebraic facts established by a JS deployment or a proof of deterministic data.
- All chess-rule completeness in every conceivable state: refinement to a reviewed
  frozen Spec plus differential tests is the MVP claim, not a theorem about English.
- Browser, Canvas, WebAudio, storage and input devices: outside Bend's checker.
  Keep adapters small, validate inputs, and test the actual composed application.
- Floating point identities: keep floats out of rules and proof predicates.
- Multiplayer/cryptographic fairness: deferred; pure state/replay is compatible
  with future peer verification but does not implement that protocol now.

## Strongest objections to resolve before freeze

A. Safety could be vacuous if no action is accepted: retain positive progress
   witnesses and full fixture legal-action/successor differential checks.
B. Spec could encode the implementation's bug: freeze it independently, review
   exact rules (especially castling/EP/fresh pawns/loaded Shift), and preserve the
   original Python/TypeScript fixtures as external evidence.
C. A law could drift through an edited helper: hash/lock its normative dependency
   cone, not merely LAWS.bend. Require a recorded reviewed amendment for any change.
D. Pixel proofs could be disconnected from the page: browser uses exactly the
   exported Bend Image value and picking function; differential-test the host
   blitter against the pure sampler. State which host operations remain trusted.
E. A compiler success could hide assumptions: reject promises in the proof report,
   prove deliberate mutations fail, and preserve compiler revision and outputs.

This file records proposals. No law is frozen yet, and no proof is claimed here.
