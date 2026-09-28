# One-entry settled-ground cache trial

The retained sprite helper cached decoded art and the underlay, but rebuilt
`BoardScene.settled_ground512` for every accepted helper job. The earlier
three-run hosted cold baseline measured roughly 0.83–0.96 seconds for that
ground phase and 1.32–1.42 seconds for piece placement; it did not show a
rapid first detailed frame. The first ground still has to be built. This
trial removes repeat ground construction on a later same-view move, not the
first-frame or camera-change work.

`BoardScene.sprite_same_ground` is a Bend-owned cache decision comparing
theme, view and hole topology. Ground construction reads those and the
selected-theme underlay, not occupancy or pointer feedback. The browser
helper retains one immutable ground/frame pair and reuses it only after that
predicate returns true. A theme/underlay change or a different supplied
same-theme plate clears the pair. It still sends one final Bend Image and
preserves the existing stale-generation/revision checks. The source atlas,
Linear filter, piece dimensions, shadows, 65° Front and 67° default are
unchanged. An independent invariant review found no remaining actionable
P1/P2 after the same-theme plate replacement case was repaired.

The pinned 2.0.27 checker accepted the new Bend source. The
`BoardSceneSpriteTest.bend` runtime passed its previous six pixel/projection
checks and a new positive occupancy/negative view/holes/theme cache-key check.
The real Node-worker helper test passed asset, supersession, same-ground hit,
changed-ground miss and same-theme plate-replacement tests, including the
new plate pixel reaching the sprite-composition input. The selected scene
emitted with a source-bound manifest; the reusable graphics-library gate,
frozen v2 manifest/amendment checks, and original TypeScript 62-test suite
passed. These are finite/source gates, not native execution.

An isolated local **draft** build had version `3616886e4d25f31c6943` and
`build.json` SHA-256
`19e92189c7a40d3c76a7fffbbb9f8f7a15c1475c6dbdf98f5b505f4bfc93589d`.
The untouched clean baseline was version `8a81a3c3311afc8dc308`, build
SHA-256 `a359f0a94d565eedd23672db943e0602c204e24046b3249d4868d5cb07a11d49`.
The paired real-Chrome test verified every one of 21 manifest-listed assets
against local and served bytes on **both** builds, asserted the baseline had
no cache metric, and compared full canvas PNG bytes. Initial, same-view
e2–e4 and changed-camera 65° Front images were each byte-identical, with
SHA-256 respectively
`3658760c02ce2e9bc5c9d86580ca465b490cc37c0aa1718aab1fb2bc326a762c`,
`4d769cb7b795bfe65fdd5dbb7a8612f9e4028457311c46c57f21311bbe959574`,
and `6b01094816a9b913946329d93858624c6d06f713163efcbd7dcf2adba3c3057a`.
The e2–e4 helper job reported `groundCacheHit: 1`, `groundMs: 0`; the
changed-view job reported a miss. In three paired samples, the old same-view
ground phase was about 635–1,418 ms. Worker round trips varied with load;
these are paired diagnostics, not a reliable end-to-end speedup bound.
Ignored PNGs are under `.artifacts/bend2/ground-cache-parity-rjshGj/`,
`ground-cache-parity-7XAAsJ/` and `ground-cache-parity-qZWXmu/`.

A six-scenario draft matrix under local Vite preview passed desktop start,
corrupt-plate fallback, selection, camera and mobile, but **failed** the
persistence offline reload with a host-script `net::ERR_FAILED` and a
90-second readiness timeout. Its ignored summary SHA-256 is
`48b412a46b5d6184016a65fdd9dc1de329895f5ae6f0ec6b9a08469a32a97213`.
The same persistence failure reproduced on the untouched clean baseline
(summary SHA-256
`56374e7dcc0ae9b0164a74036f2c444e1a8543706eb288b80c11ba5ff50ca699`):
the host script was present in the service-worker cache, but its Vite-served
response had `Vary: Origin` and the offline module request failed. This
supports a local preview/cache-matching explanation, not a source regression;
the exact mechanism was not instrumented. On the project's byte-serving
`serve.mjs`, the candidate persistence/offline scenario passed with zero
defects (summary SHA-256
`bf80e5029694df2c57e88ef0623ec292de092ca102b6dbc269ef743a29989fae`).
The new `requestFailures` field in the matrix is diagnostic only and does
not convert HTTP or network failures into a separate pass gate.

The updated `NativeV2.bend` passed a 300-second-bound pinned source check
after the default 120-second attempt timed out. Its 29 unsafe/foreign
warnings are the native IO/effects cone, not a pure proof. No new-source C/ELF
package, Linux GUI/PCM/restart, original-cadence CUDA-on gate, physical
audio, full 24-scenario run, clean publication or owner visual acceptance
is inferred from this draft. The original full-window GPU-on 250 ms failure
remains authoritative, and the retained Linux trace readout is pending.
