# Keep atlas motion shadows on the board — 2026-10-07

At the midpoint of a move, the atlas artwork hops 16 pixels above its
board-plane path at size 512. Its contact shadow previously used that lifted
artwork center, so the shadow rose with the piece. `BoardScene` now uses the
existing unlifted camera interpolation for the contact draw and its dirty
bounds. Completion retains the exact projected destination center.

Artwork placement, atlas alpha, picking, shadow dimensions/opacity, capture
fade and painter order remain unchanged. Both active contact paths use the
same ground-center helper; no stationary-piece special case was added.
Independent read-only review found no blocking issue.

## Verification

| Check | Actual result | Terminal SHA256 |
| --- | --- | --- |
| Current scene whole-book check and selected emission | PASS; 44 Bend modules, unchanged exports; 26.731s | `70ef1f3568fbc316dc815136e4f139069e5495e5cc7db3571c4c31974cb22730` |
| Finite full/partial and prior/current pixel comparisons | PASS; 54 pairs / 14,155,776 pixels, plus 18 isolated contact checks; 55.800s | `66f57c812c7cf4e93039410cd530e1891b73076ae49950d2641b2d90419e4ab8` |
| Integrated current-source browser build | PASS; 38.062s | `b4e50743890649e5e9a22315a500b8204550028aa7e5a56f579bd2843b645fc1` |
| Installed-Chrome headless paired flow | PASS; two fresh browser contexts / 20 native canvas actions, equal final settled PNGs, no page errors or external requests; 32.151s | `a68e583d97900a769ac0259f1131a1afbb0779eb3f4152fbf60e2a54af0fd50f` |

Each supervisor observed exit zero on its retained process, closed its handle,
observed the qualified Job return to self-only, closed that Job and checked
monitored input hashes before/after. The finite supervisor inventoried 292
inputs. A first diagnostic attempt failed before pixel assertions because its
adapter applied the Frame converter to a View. Its actual failed/closed receipt
is retained (`c738ed5b119272a68f519ef1c2b6c8b0b20240846b5a0be8f71b0e85f5353171`);
R2 corrects only that diagnostic adapter and preserves the original generated
function bodies.

The finite comparisons use five positions reached through actual Bend
controller commits: ordinary move, capture, castle, en passant and promotion.
They cover progress 0, 1, 7, 8, 15 and 16 at 512 pixels, with default
345°/67°/115% and additional 26°/41°/75% and 90°/90°/115% capture/castle views.
Current full rendering equals current clipped redraw; pixels outside the clip
equal the retained prior occupancy. Prior/current differences must fall inside
independently bounded old/new moving-contact footprints. Endpoint images are
exactly equal. Pose textures and ground transfers remain equal.

Eighteen isolated checks cover moving and stationary pieces at three camera
views and progress 0, 8 and 16. Diagnostic exports call the original emitted
functions. Independent known-lift and endpoint assertions plus whole-image
vertical translation establish that the shadow stays on the ground while
artwork hops. Controlled progress-8 before/after PNGs were visually inspected;
they show the lower contact shadow with unchanged pawn artwork. These are
controlled rendering stages, not natural browser animation timing.

The browser pair performs e2e4/e7e5, additional selections, preferences
open/close and orbit out/back. Its final settled images match. The input
observer binds selection to a subsequent PointerDown request; product input,
Worker and Tick behavior remain unmodified. This integration flow does not
establish exhaustive moving-pick coverage or a latency improvement.

## Exact retained package

The scene output is `scene-3utptJ/scene.js`, SHA256
`55f99c210aa28519d5c7837f8c07577820509396f097fdab8f938910bfa3c6ae`.
Its selected manifest SHA256 is
`6890966efa0d46fc344b3f3d9ff8c351a90b9649f1b8f3d670ac3b89808855f1`.
The controller remains the previously verified `controller-Mn82fG`.

The new package is
`.artifacts/bend2/2035-preview/stationary-motion-20261006/browser-NNHHUU`,
version `a711446491a7294ba811`, build SHA256
`eb5050822701154ab6d1bf9ed6d7a1b835220b418e8fda4763368bc961f76ced`.
Its metadata records the actual parent `ccbf87ee`, dirty draft and
`adopted:false`; publication does not retag it. Private receipts, raw results
and controlled PNGs are retained in the same experiment directory.
Finite result SHA256:
`9546879e974fdf11d68fa399883053c4436d57393bf3098d3277ae1506a8a336`.
Browser result SHA256:
`e373c0f01efcb14e3ce34e5d35cbbe1a466b7118884ee7c0dfe6c7d56e62831f`.

This is finite coverage and a narrow browser integration result. Broader
camera/portrait/material and owner visual acceptance, stable responsiveness,
current full proof/consumer binding, native CPU/GUI/PCM/restart, original GPU
acceptance and reviewed toolchain adoption remain separate requirements.
