# Verification record

The initial core and pixel semantics were frozen only after all five readiness
gates passed on unchanged source. Normal builds verify the semantic hashes and
the exact proved Kernel/witness hashes. The attestation and compact receipts are
under `laws/` and `docs/evidence/laws-v1/`.

| Evidence | Result and scope |
| --- | --- |
| Bend core checker | 13 laws close; exact `All terms check.` with no TODO, unsafe or foreign dependency in the proof cone. |
| Negative probes | Six focused mutations reject with expected diagnostics; every focused unmodified control passes. |
| Reference comparison | Both starts and all 14 reference scenarios/223 successors; 269 checks through public Kernel APIs. |
| Match comparison | 33 checks including stale revisions, undo, offers/agreement, resignation, repetition, legal-effective EP, auto-100 and mate precedence. |
| Pixel checker | 11 sampling and empty/outside-fill laws close. |
| Pixel runtime | 21 boundary checks plus 100 small fills and samples. |
| Projection | All 262,144 floor pixels plus 64 centers agree with independent integer geometry. |
| Browser | Real Chrome pointer moves for both sides, Shift, undo, record reload, captures, underpromotion, terminal recovery, local bot, menu/mobile layout and cold offline play. |
| Host failure checks | Rapid replay/new-match invalidation, bot pause persistence, malformed-record preservation, and an explicitly injected rendering failure/retry. |

Local browser receipts currently live in these ignored, preserved run folders:

```text
.artifacts/bend2/browser/2026-09-22T12-51-33-230Z/
.artifacts/bend2/scenarios/2026-09-22T13-09-55-720Z/
```

The scenario run also checks that a Warm lighting change affects actual pixels
after renderer recovery and that user gestures start actual Web Audio nodes.
This does not certify a listener's speakers or subjective sound quality.

Failures were useful and retained: a Windows import-path defect, expensive proof
normalization and stack exhaustion, fresh-pawn/EP rule errors before freeze,
invalid DOM selectors, a click superseded by hover, stale animation progress,
Undo record decoding, and a test predicate that attempted to parse a deliberately
corrupted save while waiting for its replacement. These were corrected and the
relevant paths rerun. No frozen law was weakened to make the checks pass.

The source compiler/runtime and browser adapters remain trusted. Reference
coverage is finite, and browser acceptance is local Chrome evidence until the
separate hosted run is recorded. There is no native Bend CPU/GPU benchmark,
packaged Bend desktop release or user aesthetic acceptance claim.
