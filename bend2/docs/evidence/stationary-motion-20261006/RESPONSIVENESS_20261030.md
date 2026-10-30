# Ordinary play timing and stale refinement

One real public-input browser journey completed selection/Clear, Game/View/
Settings, e2–e4, Undo/Agree and two short right-button drags. Root inspected the
startup, Game and final authored images. The original browser, parent, readers,
loopback server and Job closed normally; there were no runtime/request errors
or changed inputs. No compiler, proof, native, audio or GPU campaign was repeated.

The package is `64a981ed6cd471d6302dda79fca5a9eddc6382ea40e8be7c17e6474c11150b9b`,
version `4101bf5038a614b95842`. It reuses the earlier direct-Canvas package's Bend
outputs and adds one bounded diagnostic field for the last rejected sprite-helper
reply. The existing rejection guards, scheduling, rendering and constructor
translations are unchanged. This private package is distinct from the published
`ee1619d005cf7204269e` preview; its creation metadata remains unadopted.

## Actual feedback

Windows x64, headless Chrome 156.0.8078.79, 1280×800, DPR 1 and 1024×640 artwork
were used under normal adaptive quality and power policy. The laptop was on AC
at 97% battery. Whole-host load was uncontrolled. These are actual observations,
not a robust latency distribution or a physical-display measurement.

| Observed action | Trusted pointer-down → Canvas draw end |
| --- | ---: |
| Select e2 / Clear | 22.3 / 12.5 ms |
| Game/View/Settings open and close | 6.5–52.7 ms |
| Undo dialog / Agree | 53.3 / 99.0 ms |
| Destination press → first committed move frame | 170.1 ms |
| Destination press → completed animation | 332.7 ms |

The destination press first stages intent. A later Tick commits the expected
board/side at revision 1. The final pose16 frame retains that revision and
committed position, with no unrelated trusted input between them. Thus the
170.1 ms committed update and the 332.7 ms animation completion have distinct
boundaries; the latter is not claimed to meet a 250 ms completion target.

## Paired startup and motion observation

A separate fresh original Job loaded the retained texture-ready baseline
`59d27de5178eaea2d698be2cdd5b5caaabb70f29e03552420c39657b539a9cd8`.
Both arms sampled startup Job memory at the same authored-before-input barrier.
Their startup PNG bytes matched exactly. Pre-drag board, side, view and layout
also matched; the candidate's later revision after Undo is retained.

| Observation | Baseline | Candidate |
| --- | ---: | ---: |
| First playable draw from navigation | 564.5 ms | 497.5 ms |
| First authored draw from navigation | 996.0 ms | 909.9 ms |
| Startup Job peak commit | 763,224,064 B | 754,147,328 B |
| Same short drag's input → draw median | 10.6 ms | 7.0 ms |
| Same drag's maximum input → draw | 24.3 ms | 21.8 ms |
| Same drag's median draw gap | 33.0 ms | 34.0 ms |

Each drag had eight actual held-pointer moves. The observed median reduction was
34%, with lower startup time and memory in this pair. It is not a controlled
causal speedup claim: baseline input followed startup, candidate input followed
ordinary play, and normal adaptive policy had bitmap presentation inactive versus
active before the drag. Warmup, order and host load remain confounders. Full-journey
peaks are not compared because the candidate did more work. These observations
do not establish stable 30 Hz, high-resolution performance or universal gains.

## Actual stale-result rejection

After drag A released, its helper job12 ran while drag B changed the view. The
actual result callback recorded a newer current host request57 at yaw323. Root
joined that request to trusted held-pointer move59 and its actual drawn frame57.
Its handler ran inside the old job's pending interval. The rejected job's unique
ID was absent from every received atlas-mask offer, and the final authored image
matched the newer requested view.

The observer's first nominated reply48 was not drawn; that original field is
preserved. Root's stronger request57 join uses the same original records. This
establishes discarding stale output from a synchronous renderer, not terminating
an already running render.

Original terminal SHA256 values:

- Baseline: `c2d094ba24ba69de0ef70395ba6fda1580c49fbfd64425ae45dcc9a917628063`.
- Candidate: `b1d764434015840f93a7b9fa09469bfbb6b5718ba904cc5862be3e070a0f42d6`.
- Root review: `ba4106181ab0d4d759d3eb160b101db383bd0539f8523d1d43b3752285b744d3`.

An earlier sandboxed baseline navigation failed with
`net::ERR_NETWORK_ACCESS_DENIED` before any server request, frame or input. Its
failed original and normal process settlement remain preserved
(`bcb61b4fc71dc70e28aa3d3ab1731b2bbd7e38899217673f1b5838e078932a01`).
The two successful arms used unchanged sources in the normal host context.

This adds no unit/integration suite, scenario quota, forced quality tier or
automatic retry. Earlier offline/bot/Shift, paired pixels, native PCM/restart and
formal results retain their original scope. Compiler adoption remains pending.
