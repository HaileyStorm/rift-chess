# Camera preview phase attribution

The Worker now reports `previewGround` and `previewSprites` within its existing
`previewPaint` interval. The same depth-8 ground is passed to the same nearest512
atlas composition in the same order. Pixels, picking, artwork cache keys and
presentation-mask lifetime are unchanged. The replaced composite export had only
the Worker as a current caller; Scene, Worker and selected exports ship together.
The timings overlap: do not add `previewPaint` to its two component intervals.

One actual rendered selection, three-pointer-move rotation, release and preview
selection journey compared the current package with the phase split. All five
observed initial/moving/held/settled pixel digests matched, as did game state,
history, view and preview picking. No browser errors or failed requests occurred;
all original browser/server/process handles and Jobs closed. No new PNGs, unit
tests, integration tests or scenario matrices were created.

| Moving frame | Ground ms | Pieces ms | Total preview paint ms |
| --- | ---: | ---: | ---: |
| First | 51.4 | 82.3 | 133.9 |
| Second | 21.7 | 40.1 | 61.8 |
| Held | 18.9 | 43.5 | 62.4 |

Pieces accounted for 165.9ms of the 257.9ms component sum (about64%), ground92ms
(about36%). These three finite Windows frames identify the larger cost in this
journey; they do not prove stable p95, physical presentation, constrained-device
responsiveness, a causal speedup or the interim30% performance requirement.

The affected Scene received fresh whole-book/source type CHECK (zero holes) and
JS emission. Controller and menu were unchanged and reused with exact source
bindings. The unchanged31-source expansion CHECK was reused from its original
closed execution; no new proof run. Kernel/BendTT, native CPU/GUI/PCM/restart,
originalGPU250ms acceptance and compiler adoption remain separate and open.

Local evidence is retained under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:
`preview-phase-source-r1.json`, `preview-phase-proof-reuse-r1.json`,
`preview-phase-attribution-r1.json`, `preview-phase-pair-r1/result.json`, and
the three `preview-phase-*-supervisor-r1/terminal.json` receipts.
