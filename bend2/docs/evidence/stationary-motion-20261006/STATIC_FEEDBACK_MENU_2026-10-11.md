# Static feedback and Settings background reuse — 2026-10-11

Settings previously repainted the settled board's static cues on each update,
creating a new Image and defeating the earlier menu background cache. The
modal-only candidate remains rejected as recorded in
`MODAL_BACKGROUND_REJECTED_2026-10-11.md`. This successor retains static feedback
when the immutable occupancy Image, board size, and a Bend-owned comparison of
all Frame fields except hover match. Position comparison includes every field;
list order and duplicates remain significant. Hover and capture effects still
run with the current Frame. Boot/disposal and proxy rendering clear the cache.

Menus retain dynamic text, board and scrim only when the exact Bend presentation
predicate, geometry, fonts, base and board images match. Panel and controls
repaint in their original order. Actual Worker replies expose the two reuse
observations alongside existing render timings.

Validation used only the changed Scene whole-book/type emission, the exact
previous Menu emission, a browser package build and one real paired journey.
No unit/integration tests or scenario matrix were added. The original compiler,
build, Chrome, serving streams and Jobs all settled and closed.

On Chrome 154 at 1280 × 800, scale 1, Settings open/toggle, capture and held/released
orbit completed with identical pixels, command history, view and summaries at
all six observations. Opening Settings reused static feedback; toggling Move
Hints reused both static feedback and menu background. Capture and changed orbit
frames did not reuse these caches. Toggle composition was 94.0 ms for the
baseline and 56.8 ms for the candidate; opening composition was 59.6/88.2 ms.
These are uncontrolled single-run observations, not stable latency, causal speed,
memory-pressure, device or full visual acceptance claims.

Private receipt lineage: `static-feedback-menu-emission-supervisor-r1`,
`static-feedback-menu-build-supervisor-r1`, `static-feedback-menu-pair-r1`,
`static-feedback-menu-pair-supervisor-r1` and `static-feedback-menu-disposition-r1.json`.
The draft package build digest is
`935fab85702e3e961b2dce35298b1723a5b23b986ce22e5407d0d184724a3aff`.
The retained Menu emission is source/type evidence only; its earlier rejected
browser disposition is not retagged. Controller uses the exact established
comment-only Match lineage. The maintained browser boundary changes only the
Worker source hash and is otherwise equivalent to the executed private adapter.

This accepts the application optimization only. Formal Laws/proofs, pristine
accepted 2.0.27, balanced runtime and the TypeScript application stay unchanged.
Kernel, compiler adoption, native CPU/GUI/PCM/restart, original GPU 250 ms,
constrained-device memory/tails and owner visual acceptance remain open.
