# Detail while holding an orbit — 2026-10-27

The browser now requests its existing detailed helper after 200 ms without new
camera input, even while the orbit button remains held. Moving again immediately
selects the fast preview and its corresponding alpha mask. This supersedes the
held-orbit suppression described in the historical camera-release README.

The helper has at most one actual job in flight and one latest desired view.
Acceptance binds the helper generation, input epoch, frame, theme and revision.
A stale view cannot replace the current view. A matching held result can also be
reused on release. This changes only `bend2/platform/browser/worker-v2.ts`;
the existing atlas, Bend emissions and runtime worker allocation are unchanged.

## Actual browser result

One paired application journey ran in Windows Chrome 156.0.8078.48, headless,
1280×800, scale 1, using fresh baseline and candidate contexts. Real pointer
input selected b1, dragged continuously, held, resumed dragging, released and
selected g1 through the displayed alpha mask. It passed with no browser errors
or failed requests. Initial and final settled pixels and game history matched
the baseline exactly. The baseline retained preview pixels during its hold;
the candidate displayed a new detailed image and picking mask while the right
button remained down, then returned to a new preview when dragging resumed.

The candidate detail appeared 532 ms after the held-preview observation in this
run, including the configured 200 ms quiet window. Helper work took 284.8 ms;
image unpacking took 13.1 ms on the main Bend worker. These are single-run
diagnostics under ordinary desktop load, not stable latency or physical-device
acceptance. Continuous changing views still use the existing fast preview.

Both captured images were inspected: the detailed held image has sharper board
edges and piece sampling at the same view and selection. This is an engineering
visual review, not a new user acceptance of the full graphics objective.

## Retained evidence

Paths below are relative to
`.artifacts/bend2/2035-preview/stationary-motion-20261006/held-orbit-refinement-20261027-r1/`.
Raw private records and images remain local.

| Record | SHA256 |
| --- | --- |
| Worker source | `7335d9f623a62a2ffdda668f77a61f8c2a6796877a54a3a93a5e3c515071826d` |
| Candidate `host-r1/build.json` | `4622ae575e996d687a82705c43deccd8374db0e76f10c6ab60664602bb3f05dd` |
| `journey-output-r2/result.json` | `2b7164169477e4e41439d71216d7278aab1d278eabf5f92d8cb287c44fed2e75` |
| `journey-supervisor-r2/terminal.json` | `778e477bb7c6d8837e76c11c7ffe33b70bc1ea276e9112e42ec29791cad42e35` |
| `journey-output-r2/candidate-held-before.png` | `fbf82c075bc5cecf1e8ea9ad6558c1c994dbc62b191ec069a87b892106b1b754` |
| `journey-output-r2/candidate-held-after.png` | `67e6d16467c6fedf7e92828415d2dc3ca0f1c44976e0ed332277168d84f5bf05` |

The package records base commit `a7eef47` and the exact local worker bytes;
the later source commit does not retag those original records. The actual
bundle reused retained Controller, Scene and Menu emissions. Its successor
private tag boundary binds the new worker hash and preserves the five extracted
input-tag leaf comparisons without qualifying them as ABI constructors.

The original bundle guard failure and the sandboxed localhost `EACCES` attempt
remain retained. The latter loaded neither application. Its original Chrome
closed normally before the fresh unsandboxed local run. The successful run
retained original process handles, observed normal Chrome and parent exits,
closed the server and verified the owning Job contained only its supervisor
before closing it; no forced cleanup occurred.

No unit/integration matrix, offline rerun, compiler invocation or proof replay was
added. Frozen laws, accepted proof evidence, native CPU handoff and compiler
adoption status keep their existing scopes.
