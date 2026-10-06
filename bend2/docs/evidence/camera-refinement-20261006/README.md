# Camera release refinement — 2026-10-06

Releasing a camera drag now starts detailed rendering without the separate 450ms
camera quiet window. Bend reports the release from the same event fold that
updates the game, including when pointer-down, move and up arrive in one queued
request. A subsequent wheel event or new drag clears that urgency. Holding a new
drag suppresses both timer dispatch and stale refinement acceptance. Urgency
survives helper startup only for the same frame, theme and revision.

The ordinary/native Update and Packet shapes and existing browser controller
exports remain compatible. The Worker uses the new metadata exports and Bend's
actual orbit state. Input ordering and balanced immutable rendering remain intact.
The original TypeScript application, accepted pristine 2.0.27 compiler, isolated
2.0.35 compiler source and frozen Laws were not changed. 2.0.35 remains unadopted.

## Source and package

The tested draft package is
`.artifacts/bend2/2035-preview/camera-refinement-20261006/browser-GgwQqW/build.json`,
SHA256 `75401aa19d76875b9539e886f77eff5337d41747096abfd83b49a67e1f247194`.
It truthfully records source revision `8cf20b570417a7548c3837c6ce15d75e3dc3c3a6`
with `sourceDirty:true`; a subsequent source commit does not retag those bytes.
The selected controller includes the metadata fold; scene and menu output are
byte-identical to the preceding geometry. Retained Chrome selection is permitted
only through an exact whole-registry reversal of the added exports and equality
of every other binding field.

All evidence paths below are relative to
`.artifacts/bend2/2035-preview/camera-refinement-20261006/`. Ignored receipts are
retained locally, rather than published by this document. Current supervisors
observed exit0, checked the exited native handle, verified the owned Job contained
only its supervisor, closed that Job and checked unchanged source bytes.

| Check | Result and receipt SHA256 |
| --- | --- |
| Whole-book check and emission | Controller 46.701s, `emissions-r4/controller/terminal.json`: `a14d605898082bcd2e1d1b1b91fd10cc5f1c6e50f45f2a7d189c86324893ae32`; scene 19.595s: `f63d41f5a3db9ccb75bec3a04d36824b82ba372d3a069e0faed63b252aa41fa6`; menu 50.950s: `9da7f1b75c87d82d91a2e00d10fb4bf9ec9b8158a19cfcdec85eabce7263dc6d`. Local wrapper, telemetry disabled, zero network calls. These are compiler checks, not kernel proof. |
| Generated controller batches | Six cases, `controller-batches-r1.json`: `b6ea261682e042b64d24513d4149011b02e8415c8ceb1cbaf8c19b81536870e8`. Whole right/Alt gesture releases, release-then-wheel, release-then-clean-press, unchanged hover and wheel-only semantics. |
| Browser build | 21.062s, `preview-build-r2/terminal.json`: `04bf2337500eb98bcdceeb80ba65dcdb53c6c2d5dd8320242519450d385076c5`. |
| Matched browser drags | 118.980s, `paired-supervisor-r3/terminal.json`: `56a37ce4c7ddbc54d05619a603ec5de0aae5ebf54aa9b641d1ae219b02521406`; `paired-r3/result.json`: `a4b4c0ff0e475c6abfae78246177014279294111c99d2f951da2d341a2c29679`. 100 actual right/Alt drags, 50 per version, five alternating AB/BA pairs and ten fresh contexts. All 50 matched canvas RGBA hashes identical; no browser errors or external requests. |
| Wheel and second press | 17.458s, `negative-supervisor-r3/terminal.json`: `59ddcb9ec51e23b69220711c9bb2b99ec6b06b772012dc8af78107eaa226082d`. Wheel retains 450ms; a clean second press held for 900ms admits no refinement until its release. |
| Actual queued batches | 19.293s, `batch-supervisor-r1/terminal.json`: `267716b15ced49569bea28694e359093d1d2e048e93e754216b97c8eb63acdf9`; `batch-r1/result.json`: `048ad4676a33c5f1485ce87a68c992c029506d1dfc23421b99eca6833aee0f24`. Controlled delivery delay of one real hover reply keeps the host busy. Real pointer input then produces one actual Worker request containing down/move/up. Right and Alt releases report quiet0; release followed by wheel in the same batch reports quiet450. This proves composed browser behavior under controlled transport, not latency. The paired timing run itself contained no whole-gesture batches. |
| Displayed-mask race | 8.366s, `atlas-race-supervisor-r2/terminal.json`: `13b8d27ecfb8a20713c837843ea2d84f3bcc2f76af932cf3ca1f4cadaf593d43`. A queued click on displayed pose A selects White Knight b1 despite a different pose B refinement, with one deferred and one discarded request. |
| Full browser/reference integration | 926.099s, `reference-supervisor-r1/terminal.json`: `9d2c7e6208752c14af269df0f095034281cea0371b25b28eaf20456e417dc926`. All 24 scenarios / 689 independent TypeScript reference checks passed, no defects. Exact summary at `../matrix/current-camera-full-20261006/summary.json`, SHA256 `627a8c1af7c9d60215622587aa8ab0064ce0bd184b89190d28010c02824905a5`. Includes moves/special moves/Shift, both bot sides, terminal rules, Undo, camera, menus, persistence/recovery, portrait and import gesture guards. |
| Extended/offline integration | 55.944s, `scenario-supervisor-r1/terminal.json`: `618283cf3efab0689766fcb090ccc52249a05d95b8b90855766091754669d362`. All 13 extended checks passed, no browser errors, on the same exact package, including offline reload/play. |

Independent source review found no blocking defect. Source review covers helper
startup urgency; these browser witnesses do not isolate a release during startup.

## Timing and limits

Windows Chrome, Warm desktop 1280x800, zoom115, alternating 345/35 and 90/90,
same Worker within each page. DOM release to refined-canvas event was measured;
readback followed two animation frames. This does not measure a physical display.
HTTP used no-store; OS cache and background host load were uncontrolled.

| Measurement | Previous Knight package | Metadata candidate |
| --- | ---: | ---: |
| Drag release median, 50 samples | 906.85ms | 502.10ms |
| Drag release sample p95 | 1200.30ms | 1115.10ms |
| Gesture-start median | 921.30ms | 524.45ms |
| Cold navigation to detailed atlas median, five starts | 1980ms | 2084ms |
| Camera quiet window | 450ms | 0ms |

Release median fell 44.6% in this workload. It is a narrow responsiveness gain;
cold detail did not improve in these samples. This run does not establish stable
tail latency, first playable frame, memory neutrality or constrained-device
acceptance. Coarse main-page heap observations ended at 5.2–29.2MB for baseline
and 5.2–44.5MB for candidate; they include the observer and exclude Worker/native
heaps. One baseline main-thread long task was 527ms; candidate recorded none.
These sparse observations do not attribute allocation or prove a memory regression.
Raw page observations and nearest-rank p95 derivation are retained in
`paired-analysis-r1.json`, SHA256
`f659a6c286d168f900991c6f1151fe25f91660fea8b5b80584c8235c4b5ee230`.

An earlier before/after-state candidate missed whole queued releases and was not
published. Its expensive pixel-array witness exceeded its native observation
window; the original supervisor terminal remains a timeout. Its late browser
result binds only the old packages and its preserved source capsule. A separately
reviewed, creation-bound read-only query later proved original Node8428 exited0
(`original-readonly-exit-r1.json`, SHA256
`39ff1b19007bbadf786329c444aaf726a30d7c824ee754047664e7305b8df0ba`).
That query closed its own handle; original supervisor Popen/Job handles remain
retained, with descendant quiescence and owner closure unverified. No process was
signaled or attempt replayed. Failed compiler and cached-view witness attempts
remain intact; current results are separate episodes with corrected inputs.

This camera package's browser/reference/offline integration passed. Subsequent
rendering changes need their own source-bound evidence. Stable performance,
motion artwork, broader devices and owner visual acceptance remain open, as do
proof/BendTT/kernel, native GUI/PCM/restart, original GPU250ms and reviewed
toolchain adoption. The full sprint Goal remains active.
