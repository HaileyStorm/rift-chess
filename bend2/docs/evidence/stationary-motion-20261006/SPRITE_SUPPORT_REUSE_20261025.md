# Reuse immutable sprite support bounds during orbit

The browser now prepares the twelve Bend sprite support boxes lazily on the
exact retained `spritePose`. Further camera views reuse them. Decoding a new
pose or disposing sprites discards that cache naturally. No additional image
tree, eager startup work, texture change, Bend API or picking rule was added.

Base: `482fc77c196ce502a147fd3eb9fcc34546c768b2`. Candidate worker SHA256:
`fb864c56045f2ba37a0381432ede09e5dfa76b3e71710cc08711c0af19f89504`.
Build manifest SHA256:
`5018de9fd89a3da87c531deafba9cd3ac7ce6b24774d3d6ae7b388d561bf8d77`.
Exact unchanged Bend emissions and assets were reused; no compiler or proof
execution was repeated.

One paired actual Chrome drag/release journey selected g1 and b1 knights,
preserved history, and delivered the latest pointer and release. Initial,
released-preview and settled pixels matched exactly. The base recomputed
supports on all 15 observed moving frames (median 1.2 ms). The candidate
computed them once (2.0 ms), then recorded zero support-preparation time on
the next 30 moving frames. Original browser and parent processes exited zero;
streams, original handles, Job and loopback server closed without forced cleanup.

Observed request-to-canvas medians were 81.1 ms and 40.9 ms; pointer-to-canvas
medians were 103.6 ms and 58.0 ms. Unrelated ground and sprite times also changed
strongly under ordinary variable Windows load. Those overall differences
cannot be attributed to this small cache and do not establish the broader
30% improvement, stable p95, physical memory/device or adoption targets.

Original ignored evidence under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

- `pose-support-cache-20261025-disposition-r1.json`
- `pose-support-cache-20261025-journey-r1/result.json`, SHA256
  `9bc91a74decb51cbf8dcf66561cbccb454614b05e27c032ff81a937a2593f56d`
- `pose-support-cache-20261025-journey-supervisor-r1/terminal.json`, SHA256
  `8c84a38140e5f0108dbe79a54d637e5afca2f56a347f91777fc825576a380afc`

No unit/integration tests or scenario matrix were added. Frozen Laws, accepted
compiler pin, native/proof obligations and the original GPU failure are unchanged.
