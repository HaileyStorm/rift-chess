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
   and write a comprehensive local guide. **Guide drafted; probes passed.**
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

Documentation/toolchain phase. No app laws are frozen yet. No Bend game or full
correctness claim is made. See `docs/LOCAL_BEND_GUIDE.md` and `SOURCE_CATALOG.md`.
