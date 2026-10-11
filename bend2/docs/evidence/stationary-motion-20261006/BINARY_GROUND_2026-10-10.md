# Binary prepared ground

The default prepared ground now uses BPG1: a bounded little-endian header and
the existing lossless depth-9 image tokens. The actual retained ground changed
from 7,347,974 bytes of JSON to 1,770,520 bytes, saving 5,577,454 bytes (75.9%).
The candidate package totals 5,054,375 bytes. The helper accepts this file after
its existing origin, redirect, exact response URL, content hash and frame/plate
checks. Historical JSON packages remain readable. Cached image meaning and
helper protocol 2 are unchanged.

The codec checks magic, depth, node/token counts, exact byte length and bounded
tree structure. It uses an aligned Uint32Array view on little-endian hosts and
explicit little-endian reads otherwise. The producer writes and reads back the
exact file, verifies its hash, then decodes its bounded structure. Two unused
functions for synthetic ground-key variations and exhaustive persisted-pixel
resampling were removed; their historical source and receipts remain intact.
Formal laws and proof obligations are unchanged.

One real startup and e2–e4 journey per baseline/candidate package passed through
trusted pointer input in headless Chrome 154.0.8037.98. Both displayed the same
initial and settled e4 pixels and saved the expected move. Both used prepared
ground. The pair ran in fixed order and measures finite local observations:

| Observed milliseconds | Baseline JSON | Candidate BPG1 |
| --- | ---: | ---: |
| First canvas | 968.7 | 1156.1 |
| First atlas | 2568.0 | 2928.1 |
| Helper ground phase | 203.1 | 65.7 |
| Helper total | 1039.4 | 1029.5 |
| First real input to canvas | 79.2 | 55.3 |

Adoption is justified by the deterministic payload reduction and unchanged
displayed behavior. Overall startup was slower in this pair. It establishes no
stable/tail performance, causal timing improvement, comparative memory benefit,
physical device/audio/GPU acceptance, formal proof or compiler adoption.
The 1,411,117,056-byte Job peak covers both packages together.

The private candidate reused exact retained Controller, Scene and Menu emissions,
bot library and assets. Its builder encoded the original prepared JSON; no
compiler or ground render ran. The canonical producer was changed to emit BPG1
but was not executed in this browser pair. Executed helper/codec source bytes
were adopted exactly. The canonical tag boundary updates only their digests;
constructor mappings and literal counts remain unchanged. The narrow TypeScript
check of worker, helper and codec passes. No unit or integration tests or extra
browser matrix were added.

Original Bun 41728, Node 32700 and Chrome 26812 exited 0 with retained original
handles. All streams reached EOF without overflow/error, the loopback server
closed, and the nonkill Job closed with known ownership and no forced cleanup,
retry or changed input. This closure does not resolve older unknown runs.

Exact private evidence:

- Binary asset: `05bda962f0835ec5f3ea83ee173728a901483d3d02c044f2fc9c942f0d798720`.
- Candidate package manifest: `e62665676426505499879e41ab0c603ad5e7b869328b596c8af94891781ee466`.
- Build receipt: `81138b97038b0dc42a4ebf8caab2c38bfc06eb45fb50e69e46faf704fc59368d`.
- Journey: `8f04beb313d340c7ac41a7210f055a089239a04e43ad3a66e13e4bd7caf69510`.
- Original terminal: `7dc8a70adb75dd3bb1a9044f0f352cf4cfe009c9a2243001103f882fc9b96019`.
- Initial pixels: `1811c823aa38e3ac3854ad71e47e46fc0b5e0caf9a21a3241e25212f92153740`.
- Settled e4 pixels: `02483635eda9332651ddbb8a3141478afae26559017b1e7e9d14b0e0a4854a2b`.

Source memory disposition: reasoned skip. These implementation revisions and
finite build-specific measurements add no durable user policy or cross-task
correction. Git and the private disposition retain their provenance and limits.
The full sprint, native admission, recovery and proof obligations remain open.
