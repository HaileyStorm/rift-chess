# Retained menu panel — October 28, 2026

Settings updates reused the board and scrim but still repainted the unchanged
panel, heading and subtitle before their controls. `MenuAA.background_chrome`
now includes that panel; `foreground_chrome` paints controls over the clean
retained panel. The existing cache predicate and capacity are unchanged. All
panel inputs are already bound by theme, menu, geometry, fonts and the retained
board/base identities. Drawing order remains text, board, scrim, panel, controls.
Native `render_on_base` still composes those operations in that order.

One actual paired Chrome journey opened Settings, toggled Move Hints on and off,
and closed Settings. The five complete canvas checkpoints, summaries, views and
command records matched exactly. Both toggles actually reused the background;
opening and closing correctly invalidated it. The inspected toggle screenshots
were byte-identical. No unit/integration tests or scenario matrix were added.

| Actual input to canvas completion | Baseline | Candidate |
| --- | ---: | ---: |
| Open Settings | 158.3 ms | 137.6 ms |
| Move Hints on | 101.6 ms | 20.8 ms |
| Move Hints off | 55.4 ms | 22.3 ms |
| Close Settings | 49.2 ms | 44.2 ms |

Toggle composition itself changed from 68.6/36.0 ms to 8.3/9.1 ms. This was one
baseline-then-candidate journey in Chrome 156.0.8078.48 on Windows x64, headless,
1280×800 viewport, scale 1, 1024×640 canvas, Astral/default camera. Contexts were
fresh; filesystem caches, power and background load were uncontrolled. Passive
observers add overhead, and canvas completion is not physical scanout. These
samples establish observed local improvement, not stable p95 or device-wide
latency. End-of-journey main-page heap readbacks were 13,071,039 and 32,996,672
bytes without controlled collection; they do not establish memory neutrality or
a leak. The cache still has one entry. Constrained-device acceptance remains open.

Only the affected Menu book was checked/emitted. Controller, Scene, sprite
helper, bot, prepared ground and assets were reused from the exact retained
baseline. Package assembly invoked no compiler. Original emission, package,
browser and serving handles settled; Jobs closed, with no forced cleanup.
The initial path-separator input rejection and subsequent definition-order type
failure remain retained. The successful source places the panel definition
before its caller. No prior failure was relabeled or proof weakened.

| Bound evidence | SHA-256 |
| --- | --- |
| MenuAA source | `c40ae22a661b3e26cb7bed53e20ecd94349c981043f170d190435118a07f7745` |
| Baseline package manifest | `4622ae575e996d687a82705c43deccd8374db0e76f10c6ab60664602bb3f05dd` |
| Candidate package manifest, version `b01ac2d9a30fe145c146` | `e9cd4ae5b21daf2e1692ca358a640691039a8b61be2815e46b78ce29111f7f8a` |
| Successful menu emission terminal | `0b595aa1265fc48412bdaef2cdea311f63e9c347ef39f2a1c80d15c516fafa4d` |
| Actual journey result | `b860c4dcdd9b63c50e37e027b15385ae2c97c8e01fd5254dfd06c6ebd18f0605` |
| Journey process/Job terminal | `3ac2abb171c7503fcba4c2d183400163eec987bfca5a762b89f5361a5366e021` |

Private creation tooling and originals are retained under `menu-panel-r1/r3`
and `menu-panel-journey-r1` in the owning task's artifact directory. The earlier
[static-feedback/background reuse](STATIC_FEEDBACK_MENU_2026-10-11.md) remains
historical evidence; this change extends its cached layer without repeating its
capture/orbit campaign. This accepts the scoped browser optimization. Earlier
native receipts keep their exact source scope; no new native/GPU, compiler-pin,
formal-proof, public deployment or owner visual acceptance is inferred.
