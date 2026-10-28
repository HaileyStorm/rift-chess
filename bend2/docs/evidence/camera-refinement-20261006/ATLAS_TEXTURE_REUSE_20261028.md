# Reuse atlas textures across camera refinement — October 28, 2026

The browser Worker previously requested the helper's packed atlas again whenever
its camera view changed. The helper loads the three fixed piece pages once in
its lifetime; its RGB and alpha textures do not depend on the camera. Each reply
therefore reconstructed the same texture trees and discarded their cached support
bounds.

The Worker now requests textures only when its decoded atlas is absent or the
theme differs. After the existing helper/source/protocol/generation/current
revision/placement/theme checks, an omitted texture packet retains the exact
pieces and support bounds while updating the accepted frame binding. Fresh
rendered images, ground identities, pick data and presentation mask IDs retain
their existing checks. Helper replacement/boot/disposal clears the cache.
A future view-dependent texture producer would require revisiting this lifetime
invariant. No artwork, sampler, Bend library, rules or parallelism changed.

One paired real Chrome journey selected b1, performed two right-button
rotate/release cycles, and selected g1 using the displayed atlas mask. At all
five checkpoints the complete canvas pixels, views, summaries and game history
matched the prior package. Both changed views received fresh mask IDs. The
candidate's first accepted atlas contained **230,884 token bytes**; each later
accepted view reported an omitted pose and **zero texture token bytes**. This
removes the repeated token-buffer copy/transfer and texture reconstruction;
image, ground, mask and message-descriptor traffic remain.

| Helper round trip | Prior package | Candidate |
| --- | ---: | ---: |
| First rotated view | 616.7 ms | 465.9 ms |
| Second rotated view | 470.9 ms | 340.6 ms |

These are diagnostic samples from one uncontrolled Windows Chrome 156.0.8078.48
journey, headless, 1280×800, scale 1, baseline then candidate in fresh contexts.
Startup also varied; the samples do not establish stable p95 or isolate how much
time texture reuse saved. The directly observed reduction is texture transport,
with matching rendered behavior. Memory under pressure, physical-device behavior,
continuous-motion latency and broader visual acceptance remain open.

The exact existing Controller, Scene, Menu, helper, bot, ground and artwork were
reused without a Bend compiler execution. The canonical browser tag adapter
changed only its Worker source guard. Private originals remain under
`atlas-pose-reuse-r1/` in the owning task's artifact directory.

| Source or original record | SHA256 |
| --- | --- |
| Worker | `af7647c2e5e722d163976f85b7619656967da1fff8308da4c1c6d37ab9df0d95` |
| Canonical tag adapter | `4c9fa0a8576010ca42604b0a540a07932d1f40603e5f417747bc8aaa7c985ace` |
| Candidate package | `a9d2eb62efdad8847ba98d7348b37d29dcd4502527d5beb69af62283be35a033` |
| Actual paired journey | `44af7180620f50ba7ee4e9654023a50f72e5cd9d3cef771021cab541955bae8b` |
| Original-handle settlement | `524706412e40c8a816361f78b3f5a5bab3033e8940d7b12a045de698fc3c5a0e` |
| Inspected rotated canvas PNG | `a13d3013c782556f35af98f1aaf2a5afd6b1ed4081c554580af0b424ce3e5bf7` |

No page/console errors or failed requests occurred. Original Chrome 7096 and
parent handles exited 0, the server closed, and the owning Job settled and
closed normally without signals. This accepts the scoped browser optimization;
it does not extend native, GPU, formal proof, compiler-pin or public deployment
acceptance.
