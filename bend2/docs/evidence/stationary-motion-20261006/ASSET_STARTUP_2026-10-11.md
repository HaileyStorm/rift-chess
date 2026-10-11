# Startup asset attribution — 2026-10-11

The first-frame port interval previously combined artwork/font transport and
decoding with image construction and traversal. The Worker now reports four
passive `assetTimes` values: plate transport/decode and font transport/decode.
They time existing operations without changing asset requests, byte caps, Bend
decoders, missing-resource policy, effect order, painting or scheduling. They
reset for each emission; retained assets therefore report zero on later frames.
Transport intervals include asynchronous waiting and can overlap other work;
do not add these four intervals to each other or to inclusive port timings.

One actual fresh-context Chrome 154 startup and trusted e2 selection completed
at 1280 × 800, scale 1. Initial detailed pixels matched the retained image
`cf33eaaea0ab7e87eb37e83be1034da5d862785c61ece556b4957856fda25886`.
The first canvas draw finished at page time 1543.0 ms. The first frame reported
plate transport 136.5 ms, plate decoding 333.6 ms, font transport 27.8 ms and
font decoding 42.4 ms. Later refinement/selection frames reported zero for all
four asset phases. This local sample directs the next startup investigation to
the RGB plate decoder rather than font decoding. It does not establish stable
latency, a speedup, power/load control, constrained-device memory or tails.

The runtime RGB decoder repeatedly splits/reverses row pixel lists and then
subdivides rows while building its immutable tree. A decoder optimization must
preserve the exact row-major image, rejection semantics, source/proof boundaries
and independent immutable construction. No decoder or Law was changed here.

No compiler emission or proof replay was needed: exact Scene/Menu/Controller
emissions and all artwork were retained. One package build and the small real
startup/selection journey settled with original process handles, streams and
Jobs closed, no errors, resend or forced cleanup. No unit/integration tests or
scenario matrix were added. The maintained boundary updates only the Worker
source hash and matches the executed private adapter after relative import
binding. The private draft build digest is
`b644f5c7a608fa87cda1567f5fa6f9cf692296c9deca6e29f43c737d5d36389d`;
original evidence is under `asset-startup-build-supervisor-r1`,
`asset-startup-pair-r1`, `asset-startup-pair-supervisor-r1` and
`asset-startup-disposition-r1.json`.

This is application performance attribution only. The full sprint, pristine
2.0.27 pin, Laws/proofs, balanced runtime, native/kernel/adoption obligations,
original GPU 250 ms gate and owner visual acceptance remain unchanged.
