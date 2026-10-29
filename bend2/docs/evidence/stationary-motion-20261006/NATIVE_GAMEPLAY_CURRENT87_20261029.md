# Current87 native gameplay and saved-state restart — 2026-10-29

Owning review accepts the current87 package's actual CPU window/menu/input,
e2–e4 move, camera change, saved-state restart and normal original-process
settlement. **Move-associated audio and a Shift-control appearance discrepancy
remain unresolved.** This is not complete native UI/audio or compiler adoption
acceptance.

This uses the [reviewed current87 build](NATIVE_CPU_20261028.md), source
`01b884665523e9c0b1b2c50ba8086f3917c38901`, tree
`1f1935dae5c6cdfb731d336a6d9ec528fdca69ee`. Both launches used the same
6,221,040-byte ELF, SHA256
`9ee6605e93e1c410a03cb573974444a4f1f0de18ccb0697586e218396a89b292`,
with exact package cwd, `--gpu off` and one fresh data directory shared by the
restart. Package receipt and all bound inputs matched before and after. No
build, compiler, emission or GPU work occurred.

## Actual journey and review

The real X11 application opened Preferences, closed it, moved e2–e4 (action3980,
expected revision0), and accepted one wheel-up to zoom117. After normal
WM_DELETE_WINDOW and original exit0, the same executable relaunched with the
same data and no gameplay input. The newest semantic save/preferences values
matched, including yaw345, pitch67, zoom117 and the single move. It closed
normally with exit0. Original outer and durable observers exited0. All43 recorded
processes settled; exit/close and original waits were observed, signals null and
process groups absent. Expected no-window searches account for five nonzero
tool exits. The documented missing _NET_WM_PID limitation remains; the reviewed
window/protocol/original-process ownership binding was used.

Root inspected the1024×640 Preferences, post-input and restarted images. The
menu is readable; the restored white pawn on e4, Black-to-move position and camera
agree. The Shift button is darker before restart and brighter afterward, although
both images say “Choose a piece.” No Shift action was performed. Semantic saved
state does not establish pixel equality or correct Shift functionality.

Read-only source review found no legitimate persisted selection explanation:
Layout.shift_enabled_for id5 requires selected<64 plus a legal shift; the
no-selection text, command completion and restore all require/reset selection.
MenuAA.same_control includes enabled/active in its equality. An independently
hash-verified read of the original15,263,458-byte emitted C confirms the
selected<64 guard in FID_UI_LAYOUT_SHIFT_ENABLED_FOR_K2139. A missing guard or
cache-key explanation is therefore unsupported. This remains a rendered-control
inconsistency requiring a focused source/lowering inquiry, not a proven functional
Shift failure. No application rerun or speculative repair was performed.

## Audio limits

The existing playback monitor was captured with explicit -C. Move-capture bytes
arrived before the actual move input. Idle PCM was384,000 bytes/2s with RMS
0.02669294; move PCM was576,000 bytes/3s with RMS0.02272246. Both contain nonzero
signal, but move capture did not exceed idle. Move association and physical
audibility are inconclusive. The recordings remain original; no recapture or
route/configuration change occurred. [Earlier package audio evidence](NATIVE_GAMEPLAY_20261028.md)
retains its exact original scope and is not retagged as this run.

## Original records and separate resource event

The2,463,147-byte returned archive has159 unique safe regular members. Windows
independently verified all158 indexed originals and matched its HANDOFF against
a separate SSH readback. C/ELF/assets/compiler payloads are excluded; their
identities are supported by the accepted original build records. Final metadata
readback confirms every fresh journey claim released; the independent GPU stage
claim remains retained.

| Original | SHA256 |
| --- | --- |
| Records archive | `b3181f7c6b47b487e5057ac227c0a5a729651a378733865d95d5f580fe08f8e3` |
| Original handoff | `c566faf308202cb1af296dc231bc66f96f89ee9f1ba2da61eed4655bb455e41e` |
| Raw journey result | `d96613d2a2a686de64e8064ab0b3706321029ec16e1e5d89aee7d386b75596fe` |
| Events | `5ddeb3eae603d3997218f429c0d7aa165a33d0f9bc3c8a0c608f402d9b9ec1a4` |
| Original outer result | `28889071d27ae923f92ca4e684b669c25b635459a745c408635fbe1c76c6784d` |
| Preferences image | `9ff4faf35808133d7d29935d655ec92b362f03daad238905d152bd2a8d9e49f3` |
| Post-input image | `31cf92412e94ba3d2a6472c0fc0de29a1f9a7e7fb356d28eb6682147ad25dccf` |
| Restart image | `45392187765d76952ef84cbb83e4da198ab72113445f0643447558675cf10210` |
| Separate final metadata receipt | `74a31c330234df6d95f6111ca801265fadab2fabcbdf24e7bf86569944ce3f5c` |

The unchanged63 GPU input bindings stayed intact. Separately, the original
same-invocation a6c5 metadata watcher exited0 on a grant for23:39:14–23:59:14UTC
October28. The window had expired before this journey's review; no GPU work ran.
Its original event-readback and manager metadata remain, including the collector's
incorrect still-running assertion and correction. This is no longer a live queued
lease. One fresh serial resource continuation was requested for the original,
still-unexecuted sidecar job; no extra workload allowance or GPU acceptance follows.

Accepted Bend2.0.27, immutable laws, runtime parallelism, prior failed/uncertain
records and the complete sprint scope remain unchanged.
