# Defer unused procedural layers during artwork motion

The browser Worker now records ground and prepared-layer invalidation until a
rendering path consumes those layers. Detailed piece animation skips both
procedural passes; settled artwork prepares only its feedback overlay. A later
procedural fallback rebuilds ground before preparation. Boot clears the cache
handles and restores invalidation.

Orbit renders also leave this work pending. Bend retains its original cache
keys during an orbit, so rebuilding an intermediate view and clearing the
invalidation could otherwise return stale pixels when the drag returns to its
starting view. Independent review found no remaining blocker in this logic.

## Exact tested source and package

The tested draft records source revision
`a2b9129e757dcd75eadbf1a4eccc916e0dca5833`, dirty, with package version
`a9e94996bb286cb97dc9`. Its `build.json` SHA-256 is
`1a100678c55df684783124265d49bfd5fe350a2fbac4d800021ea479332457d0`.
The compiler remains the unadopted 2.0.35 candidate; this change does not move
the accepted pin or change Bend rendering, laws, exports, or parallelism.

| Source | SHA-256 |
| --- | --- |
| `platform/browser/worker-v2.ts` | `5d02630eb422c936390ce23efe2df05801074ca7ae4dee9a35e16152a1364d25` |
| `toolchain-patches/2035/browser-tag-boundary.mjs` | `beb19b7d5298489eb093a56fefce8b43dc780b28f1d3bbbfaa748c4cebb2ced1` |

## Acceptance evidence

Private immutable records live in
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`.

| Check | Result | Record SHA-256 |
| --- | --- | --- |
| Source-bound preview build | PASS; original scene/controller/menu emissions reused | terminal `b7c98964a770328fa1eac31a562809c7a344e06748dc00c715150a4572278ffb` |
| Actual installed Chrome game and module Workers | PASS; natural e2–e4, e7–e5 and g1–f3; moving artwork frames have zero ground/prepared time; completion retains detailed artwork and valid mask offers; destination selection survives old-offer retirement | result `dd1186eb5209ff04088abdd67ff8ceae4947d045ede17bf975fe6d64ef86253b` |
| Orbit away and back | PASS; exact canvas PNG before/after a real right-button drag with deferred invalidation | same browser result |
| Procedural fallback and Shift | PASS; two canonical scenarios, 39 TypeScript-reference comparisons, zero defects | terminal `5387f1845865d67e551df206e217c852fe2a6101c063b441938bf43f8227ab81` |
| Service-worker offline and paired images | PASS; cached ground, identical online/offline initial image, offline legal move; exact prior/current initial, moved and Front images; changed camera rebuilds helper ground | result `fb5db578e98d094d90f855e15e41e7871070fcc4031ff323916bbaa0c72d7d36` |

The browser terminal is
`7913aec6fb8a7bc14a0e1fe4db0952f4490e374ffdafd2ce41fdbdb496b715ca`;
the offline/parity terminal is
`14a53299f1df5a2ece3e14dc7a5c08f74f99e3c1d31a462b5b36c98832aa7810`.
All four supervisors observed actual child exit, closed the owned native
handles and Job, and verified frozen source equality. Strict browser TypeScript
checking also passed. The natural-motion screenshot was visually inspected;
its exact animation phase is unspecified.

The unchanged Bend composition retains the prior
[motion-region evidence](../motion-regions-20261006/README.md).
Those earlier finite checks are distinct from this Worker's browser checks.
Variable host load and observation overhead prevent a stable latency or frame
budget claim. Moving alpha picking, physical-device responsiveness and memory,
native CPU/GUI/PCM/restart, GPU acceptance, owner visual approval and the compiler
amendment remain open in the full sprint.
