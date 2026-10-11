# Rejected opaque-filter trial, 2026-10-11

Base: `560226523d316f5bc833064246c86a5fa24e90e9`.

The DRAFT RgbaSample trial selected four white mask values and canceled the
common alpha factor of 255 in weighted RGB division. It avoided four temporary
Texels and the general coverage calculation, adding a branch and helper. The
original general-alpha path, draft proof definitions, frozen Laws and accepted
2.0.27 toolchain were unchanged.

The corrected existing draft proof entrypoint and affected Scene/Controller
books passed source validation with zero holes. The first private proof inventory
omitted compiler `base.bend`; that attempt stopped during load before validation
and closed normally. The corrected inventory retained the original failure.
This source check does not establish kernel, Safe/BendTT or native acceptance.

One real portrait startup, visible g1 knight selection, held right-drag orbit and
settled refinement passed. All four captures were byte-identical to the previous
extent-reuse journey. Painting measured 172.6 ms versus 178.8 ms previously;
held-frame construction measured 239.8 ms versus 270.6 ms. These single
instrumented observations under variable load do not establish a stable gain.

Decision: reject the extra specialization because its observed value does not
justify the additional branch and generated code. Restore the original sampler
exactly: 4,476 bytes, SHA256
`7af8dfdd7343a1d3db0803bfb7df12162fc5b5bc3638c6688bbd356a0a6bf1bc`.
No further timing campaign or component tests were added. Proofs remain intact.

Private provenance remains under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`: the original and
rejected sampler bytes, r1/r2 emission inputs and original closure receipts,
package binding, browser result, profile, captures, comparison and disposition.
The browser, server, original child handles and supervisor Job closed normally,
with no uncertain execution or signaling. These files are historical evidence,
not an active acceptance suite. The full sprint remains open, including stable
responsiveness, graphics quality, kernel/native/GPU and cross-host acceptance.
