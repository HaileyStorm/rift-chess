# Joint nearest rendering checkpoint — 2026-10-12

The nearest camera preview now descends its color and alpha image trees together
and reuses uniform destination nodes. It creates no persistent pixel cache.
Generic and Linear sampling, coordinates, clipping, coverage rounding, painter
order, alpha picking and output tree structure retain their existing behavior.
Malformed depth-zero source branches still sample zero independently; malformed
destination branches still produce `Pix{0}`. Full U32 colors remain intact.

The affected expansion proof source and Scene/Controller closures passed the
existing compiler CHECK with zero holes. Fresh pure emission and the browser
package completed with sealed source hashes. This is source/type evidence;
BendTT/kernel acceptance and the compiler migration remain open. Frozen Laws,
the compiler pin and runtime parallelism were unchanged.

One paired real browser journey selected the knight, continuously rotated for
1.2 seconds without waiting for frames between moves, released, and settled.
The three observed pixel states and game history matched. Alpha selection,
delivery of the latest pointer and release were preserved.

| Observed moving-frame median | Accepted baseline | Candidate |
| --- | ---: | ---: |
| Request to canvas completion | 99.55 ms | 72.75 ms |
| Latest delivered pointer to canvas completion | 133.35 ms | 97.80 ms |
| Piece rendering | 48.30 ms | 30.05 ms |
| Ground rendering | 28.25 ms | 21.75 ms |
| Preview paint | 75.45 ms | 53.70 ms |

There were 12 rebuilt baseline frames and 18 candidate frames. This ordered,
finite desktop pair had differing intermediate views and ordinary load. Ground
timing also varied. It supports retaining the simpler allocation strategy;
it does not establish stable percentiles, universal pixel equivalence, sustained
memory, physical scanout or constrained-device/native acceptance.

Post-refinement main Worker used-heap samples were 34.74 MB and 60.09 MB;
allocated heaps were 141.56 MB and 133.43 MB. These GC-dependent snapshots do
not measure retained or peak memory. The candidate adds no stored pixel tree.

The first browser attempt failed with `fetch failed` before any server request or
application observation. Its original Chrome, parent and loopback server closed
normally. A fresh run with local-network access completed the same journey;
both failures and successful receipts are retained separately.

Private evidence:

- `joint-nearest-emission-supervisor-r1/terminal.json`:
  `166c30e6c7216e7c725a4372d085c53429ec9a7b5c8f6335aa6225d27dc9cbd5`
- `joint-nearest-host-r1/build.json`:
  `7fc704a22f7fb009481a60762578fa3f3bffcb95fdc47567e9bb5ee3940e3668`
- `joint-nearest-journey-supervisor-r2/terminal.json`:
  `665cf46465c41f4ffd63c0dbeb5f43db2ee7a27a658b4e2a7db5b7838a9c4e37`

These paths are under the existing private stationary-motion evidence tree.
All original processes, pipes and Jobs for this candidate closed normally.
The change is accepted locally; publication, native acceptance and adoption
remain separate obligations of the full sprint.
