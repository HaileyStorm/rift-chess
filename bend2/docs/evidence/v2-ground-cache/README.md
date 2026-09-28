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
remains authoritative; at this draft checkpoint the retained Linux trace
readout was pending.

## Clean build and full local rendered matrix

Commit `a7895fb7a989d6790eff5ed2c2f7ccea2aa06c7e` was pushed, and the
unchanged selected browser files rebuilt without `--draft` on clean pinned
Bend 2.0.27. The content version remained `3616886e4d25f31c6943`;
`build.json` records `sourceDirty: false`, `draft: false` and SHA-256
`0515bb18295ab10d9f2df7e3b75b206ad16d93e0f3144744a05a002308d5fd44`.
The project's byte-serving local preview then passed all 24 scenarios and
685 checks in one exact-build-bound real-Chrome process, with zero defects.
The ignored full summary is
`.artifacts/bend2/playtest-stage2/ground-cache-clean-full-20260928/summary.json`,
SHA-256 `de5449fb67d26892cf1cbf798c05541dc5d6d1f281adc74015579a7cc7be9f06`.
It includes both natural bot terminals, 304-action draw paths, offline
persistence, import/cancel and camera/orbit behavior. One uninterrupted pass
does not establish a reliability bound. The sampled move-class worker
dispatch p95 was still 910.7 ms, so the whole interaction is not accepted
as rapid. The prior Vite-preview failure and baseline differential above
remain retained diagnostics; this result is specifically for the normal
byte-serving route.

The [later read-only Linux GPU trace readout](../native-2028-gpu/README.md#retained-c30-phase-trace-readout-no-paced-intervening-frames)
found no paced unchanged frames in its 231.063 ms gap, but lacked CPU/
reduction hooks and did not identify a cause. It binds the older c30 GPU
source and does not accept this new BoardScene source. A fresh exact-source
Linux CPU/native result and a reviewed GPU diagnosis remain outstanding.

## Hosted cache preview and exact pixels

The separate [Bend browser preview](https://haileystorm.github.io/rift-chess-bend2/)
advanced to Pages commit `bd1c90c3d91b5f0c5935c5355c459be91f56af12`.
Pages reported `built`, and the live verifier matched `build.json`, all 21
manifest-listed Bend assets and both original-site baselines. The ignored
publication receipt under
`.artifacts/bend2/publication/2026-09-28T21-27-26-455Z-f2f14577/receipt.json`
has SHA-256
`ba0e68c7f8f5892ed2ee81298af99004244c6cf18040d875dc239e2b2015f6c0`.
Seven exact-build-bound hosted Chrome scenarios passed 65 checks with zero
defects: desktop start, malformed-plate fallback, camera, offline persistence,
mobile, touch Import/cancel and trusted touch-across-replan. Their ignored
summary SHA-256 is
`a61fb42f917258df85993fa2744eee8c2f036150bbdae1e5e754dfc3dd555e45f`.
This is not a new full hosted 24-scenario pass; the full 24/685 result above
is local and the earlier hosted full result binds the prior browser source.

A separate paired Chrome comparison fetched and hashed every one of 21
assets on both the old local baseline and the **live** new preview. It again
found exact PNG bytes at start, after same-view e2–e4, and at 65° Front;
the hosted helper reported a same-ground hit and a changed-view miss. Its
ignored screenshots are under `.artifacts/bend2/ground-cache-parity-zvF5OS/`.
One hosted job sampled 0 ms cached ground versus 478 ms in the local old
baseline, but different serving/network load and one pair prohibit a general
end-to-end speedup claim. No present-day Linux CPU/GPU, reviewed 2.0.28 pin,
first-detail speed bound, physical audio or owner visual acceptance follows.
