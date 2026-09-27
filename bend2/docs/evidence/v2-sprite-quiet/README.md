# Browser sprite quiet-window checkpoint (local, unpublished)

The clean 2.0.27 toolchain remains pinned. This browser-only draft makes a
settled camera-view change wait 450 ms before dispatching the expensive
sprite-helper job. It requires the same theme, board/hole placement and Shift
marks; topology changes, cold boot and ordinary moves dispatch immediately.
The helper validates source/protocol and the main worker rejects stale
revision, theme and placement before presenting pixels. A late result still
passes through the existing host input-defer policy.

The earlier source-bound compact-motion checkpoint is
[`v2-motion-compact`](../v2-motion-compact/README.md). The following ignored
local receipts compare real Chrome inputs on the same 1280x800 browser host;
these are small diagnostics under varying load, not a statistical latency
benchmark. The old boundary fields called `requestToStartMs` and
`deliveryMs` include structured cloning/scheduling and serialized main-worker
acceptance respectively. The new names `dispatchToStartMs` and
`sendToAcceptanceMs` describe those boundaries without attributing either
span solely to transfer or the helper queue.

| Six settled View clicks | Draft source | Dispatch-to-helper start | Helper render | Last input to refinement |
| --- | --- | ---: | ---: | ---: |
| Immediate r1/r2 | pre-quiet | 1,822 / 2,039 ms | 2,090 / 2,243 ms | 4,943 / 5,438 ms |
| Quiet r1/r2 | pre-topology correction | 0.3 / 0.2 ms | 2,894 / 2,646 ms | 4,705 / 4,455 ms |

Receipts are `.artifacts/bend2/v2-preview/sprite-boundary-20280927/`,
`sprite-boundary-baseline-r2/`, `sprite-quiet-450-r1/` and
`sprite-quiet-450-r2/`, each with `receipt.json`, `motion.png` and
`final.png`. The corrected build's six-click receipt at
`sprite-camera-only-burst-20260927/` reports 4,056 ms from last input to
refinement, a 0.4 ms dispatch-to-start span, 2,319 ms helper work and
`quietWindowMs: 450`; its compact motion frame visited 154,769 nodes. The
settled final PNG SHA-256 in this run is
`c3f2a84fc02ec392bf12c90b95e80ca1d0bfeb775775f34107e7d356f841744e`,
identical to the earlier quiet and immediate comparisons. In-motion captures can differ because
the input times and camera angles are not synchronized.

There is a real trade-off: a single hosted old-source click refined after
2,966 ms; an isolated draft quiet-window click took 3,664 ms (receipts
`sprite-single-hosted-f611/` and `sprite-single-quiet-450-r2/`). The runs
also differ in source and host load, so this does not isolate exactly 450 ms.
The quiet window targets successive camera inputs, not single-click latency.

The corrected draft build `ad9b34c4ac0da2d7cd32` emitted the selected
BoardScene module from the clean pin and passes both normal and camera-stale
refinement races with no page errors. The extended rendered scenario now
checks Shift, its settled Undo, portrait controls, offline play, PCM and the
other game flows; the Undo refinement must report `quietWindowMs: 0`.
Its final run receipt is under
`.artifacts/bend2/v2-preview/scenarios/sprite-camera-only-r3-20260927/`.
This is local browser evidence, not owner visual acceptance, native runtime
parity, publication, or proof of a large WOW/art improvement.
