# Law change policy

The user delegated the initial choice of laws while asleep. That delegation is
not permission to silently weaken a law when implementation or proof gets hard.

The first semantic freeze covers the plain-English laws, formal law declarations,
integer model, reference rules, match specification, constructive proof helpers
and compiler/runtime pins. `semantic-v1.json` records SHA-256 of the exact bytes.
`node bend2/tools/freeze.mjs` checks them; `--create` refuses to overwrite an
existing freeze. The normal proof/build gate requires that check.

Initial creation also requires `--receipt <readiness.json>` from
`node bend2/tools/verify.mjs --draft`: both the proof/mutation checks and complete
reference comparisons must pass, and all recorded source hashes must still match.

Implementations and proof witnesses can improve without changing meaning. Each
proof receipt separately hashes the implementation and witnesses, binds the
semantic manifest and pinned toolchain, and preserves the checker output. A
semantic hash and an implementation hash serve different purposes.

After freeze, first try to repair the implementation or the proof. If the law or
one of its normative helpers is actually defective:

1. Preserve v1 and its evidence. Record the smallest counterexample or exact
   defect, affected claims and user-visible consequence.
2. Write a proposed new version with a precise semantic diff in plain English.
   State whether it strengthens, corrects or weakens the old claim.
3. Obtain independent review. A difficult proof or failing implementation alone
   is not a reason to weaken a requirement. If the correction changes the game
   rules or materially reduces the promised protection, defer to the user.
4. Add new proofs, negative probes and reference checks. Freeze a new manifest;
   retain the old version and link the amendment. Never regenerate v1 in place.

These checks prevent accidental drift and make intentional changes reviewable.
They do not defend against an attacker able to replace the source and verifier.
The compiler, its prelude, emitted runtime, browser host and English-to-formal
translation remain stated trust boundaries; no universal bug-free claim follows.

Graphics and input receive a separate, later law module once their coordinate
contract is fixed. Adding that module must not alter the rules-law freeze.
