# General RGBA channel flow, 2026-10-11

Base: `3eae898425f6993072ab9b5614fc3210bd6fec35`.

RgbaSample now feeds color and alpha scalars from Gather directly into one shared
`mix_channels` calculation. The original gathered path allocated four Texels,
then immediately unpacked them. `mix` retains its existing Texel interface for
AtlasRegion and the draft expansion Law. The obsolete internal `mix_weights`
helper had no other source caller and was removed; retained historical compiled
libraries remain historical evidence. No opaque-only branch was added.

Clamping, the four integer alpha weights, their sum, coverage rounding, empty
coverage handling and RGB rounding are the original calculation. F32 coordinate
sampling, original Laws/witness definitions, frozen manifests, accepted 2.0.27
pin and balanced runtime parallelism remain unchanged. The generated gather
function confirms the four temporary Texels are gone; Scene emission is 584
bytes smaller than the preceding unchanged sampler emission.

The existing affected draft expansion proof book and Scene/Controller books
passed source validation with zero holes. This is draft source/type evidence,
not Safe/BendTT/kernel, native/device or compiler-adoption acceptance. The source
is DRAFT/unfrozen according to the library README and current frozen manifests.

One real portrait startup, visible g1 knight selection, held right-drag orbit and
settled refinement passed. All four captures were byte-identical to the previous
extent-reuse journey. Held-frame construction measured 253.1 ms versus 270.6 ms;
painting 164.1 ms versus 178.8 ms. These single instrumented observations under
variable load do not establish a stable or causal speedup, tail latency or
physical-device result. Retain the simpler shared data flow for removing known
redundant work; no timing gate, component test or expanded matrix was added.

Private inputs, emissions, package binding, browser result/profile/captures,
comparison, source preimage and original closure receipts remain under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`, prefixed
`channel-flow`. Compiler, build and browser original handles, streams, server and
Jobs closed normally, with no uncertain execution, signaling or retries. The
retained producers are historical provenance, not an active test campaign.
Full graphics, stable responsiveness, native/GPU, kernel and cross-host sprint
acceptance remain open.
