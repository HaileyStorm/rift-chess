# Immediate-click hover batching — October 28, 2026

The browser host now captures an idle, no-button hover in the existing queue
immediately, but waits until the next animation frame to dispatch it. A click
arriving in that interval flushes the ordered batch immediately, avoiding a
separate hover paint ahead of the click. Drag moves remain immediate. Down/up,
key, wheel, Tick and activation events retain their original queue barriers.

The captured presentation and atlas mask are retained when the hover enters
the queue. Refinements already defer while that queue is nonempty. Picker
preparation remains inside the original browser gesture. Worker completion,
fault/error and pagehide cancel the scheduled hover callback; `busy` continues
to mean an actual request in flight. Independent source review found no queue,
mask-ownership or picking blocker under those conditions.

This cannot rescue a click after its preceding hover is already in flight.
Animation-frame scheduling can delay hover-only feedback, especially in a
background tab. A subsequent nonhover input still flushes immediately.

## Actual constrained execution

One real Chrome 156 paired journey played e2–e4 and e7–e5, opened Settings,
selected Warm, closed Settings, rotated/released the board and selected g1's
knight. Baseline and candidate ran in fresh contexts in one browser launch.
The owning Windows Job constrained the whole inherited process tree to two
logical processors: affinity mask 3, limit flags 16, verified unchanged in the
final native readback. No Bend scheduler or runtime parallelism changed.

All eight complete canvas checkpoints matched byte-for-byte, with equal view,
summary, revision and saved-record hashes. Actual atlas selection after the
new view succeeded. There were no application/console errors or failed
requests. The original browser and parent exited 0; original handles were
joined/closed and the Job settled to the supervisor alone before closing.
No signals or forced cleanup occurred.

The candidate's first two clicks included their preceding PointerMove in the
same actual request. The baseline sent those hovers separately. Hover-only
requests fell from 10 to 8 and drawn frames from 26 to 24. Total requests stayed
28 because pointer-up/timer batching also differed; this is not a claim that
all transport requests decreased.

| Trusted input to associated canvas draw end | Baseline | Candidate |
| --- | ---: | ---: |
| e2 selection | 243.2 ms | 70.1 ms |
| e4 destination | 325.7 ms | 55.1 ms |

These are individual observations in baseline-first order, with uncontrolled
load and possible warmup differences. Other interactions varied in both
directions. They establish the observed batching and omitted intermediate
paints, not stable p95, isolated speedup, display scanout or physical-phone
acceptance. Warm theme switching still took about 1.1 seconds in this run;
broader responsiveness remains open.

The package used the canonical `/2` repacker, which now also rebuilds the host
from its exact TypeScript and tagged-port bindings. Helper, Worker, bot, artwork
and prepared-ground payloads remained byte-identical; only host, index and
service-worker payloads changed. The existing checked Bend emissions were
reused, with no new Bend compiler, proof, kernel, native or GPU execution.

## Retained originals and limits

Private originals are under `native-gameplay-20261027-r1/hover-pump-20261028-r1/`.

| Record | SHA256 |
| --- | --- |
| Host source | `0ae5360b82f92b158176ec51cb7714e2a2f93548f3ce2b88d67f3de968417be7` |
| Canonical tag boundary | `f62b10f2e2fed5d4f5f442c63e7ed56061edf671ae0cbbd6d018f2f4795f155c` |
| Canonical repacker | `1e9da676dabf596f459c6d859953bcdf558afbd7e31653b7abfc627c6170e385` |
| Package input | `1d03bb94bbacd6a5a2d0f44f6a7fca4016bb2dcafc57439281ae658bdf5664da` |
| Package manifest | `11a1ef3538eb52286e9f2266d4244d150ea47155e6ed4ec07133c1ac1c44a44b` |
| Paired actual journey | `db752648e26a6e60c211c5d79743837915cc21e1a646bec0a56c06d2ae38793f` |
| Original native terminal | `0dacdc6b857bf9a964475c203d75f97f8316c7bb12f2cfe2996a9e11a6c0dd2b` |
| Timing readout | `bf34e358af37748d10b5e855125011ac1d5dd311e1db09b304433b71bd6b033c` |

An earlier two-processor journey completed six plies, then its driver opened
New Match using the wrong control ID and timed out waiting for Warm. That
failed result remains original; the completed prefix is not a full-run pass.
Its first e4 click waited about 900 ms behind a hover request, motivating this
change; the remainder of that hover's latency was not attributed.

A fresh suffix exercised the correct Settings/Warm/close and rotation, then
failed because the driver lacked its final detailed-view wait function.
Both failures and their normally settled native terminal records remain under
`two-logical-cpu-journey-20261028-r1/` and `two-logical-cpu-tail-20261028-r1/`.
The final changed-source paired journey includes the corrected controls and
actual detailed-view wait. No original receipt was rewritten as successful,
and the six-ply prefix was not replayed.

These are scoped browser results. The full sprint, current-source native
alignment, original GPU acceptance and reviewed compiler adoption remain open;
accepted 2.0.27 and immutable proof obligations are unchanged.
