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

## Separate public preview

[The Bend2 preview](https://haileystorm.github.io/rift-chess-bend2/) was deployed
and play-tested on September 22, 2026. The static build is
`f8cbc16e5ba51a2b9ee5`, from clean source commit
`6d74914a15ce15add5b56c53a0a48dcca42a02bd`; its deployment commit in
`HaileyStorm/rift-chess-bend2` is `5af1a229de8a0817e4aeebe322a1de8f682eb56e`.
Subsequent documentation/test-only commits do not change those application bytes.

- [Publication receipt](evidence/preview-v1/publication.json): every live asset
  returned HTTP 200 and matched the local SHA256. The original site's index and
  precache manifest remain byte-for-byte unchanged.
- [Hosted browser receipt](evidence/preview-v1/browser.json): all ten scenario
  groups passed with no page/console errors, including a real offline move.
- [Inspected rendered frame](evidence/preview-v1/board.png): the live Warm court.

The hosted run loaded the original game first. Both service-worker registrations
and cache namespaces survived, the preview acquired its own controller, and the
original save stayed unchanged. A sibling Pages URL is necessary because the
original offline worker intentionally serves its app shell for unknown nested
navigation routes. The rejected nested staging copy remains only in ignored
local artifacts; nothing was pushed to the production Pages branch.

To repeat the hosted scenario test, set `BEND_TEST_URL` to the preview URL and
`BEND_TEST_ORIGINAL_URL` to `https://haileystorm.github.io/rift-chess/`, then run
`node bend2/tests/browser-scenarios.mjs`. Use a new `BEND_PLAYTEST_RUN` name to
preserve each receipt. The worker fault injection is explicitly limited to the
renderer recovery scenario; ordinary play uses actual pointer and menu inputs.

The source compiler/runtime and browser adapters remain trusted. Reference
coverage is finite. This is local Chrome exercising the public deployment,
not a cross-device survey. There is no native Bend CPU/GPU benchmark, packaged
Bend desktop release or user aesthetic acceptance claim.
