# Stone and bevel material during orbit

The orbit preview previously replaced the settled stone faces and directional
bevels with flat palette colors. `BoardScene.bend` now classifies those same
materials in affine board coordinates. A 64-tile immutable table prepares each
stone face and four edge colors once; the quadtree fills uniform regions and
splits only where tile or bevel boundaries cross them. Table lookup descends
structurally through the selected branch. Four balanced quadtree branches,
mask/degenerate guards, exposed walls and tile coordinates remain intact.
The shared SpatialFast library, frozen Laws and accepted toolchain pin are
unchanged. This is DRAFT application graphics work.

Root inspected the actual held and settled portrait captures. The held board
now carries the same light/dark stone treatment and edge shading as the settled
board. Quantization and detail still differ between the 256px moving tier and
512px settled tier; highlights/feedback and authored piece detail remain broader
quality work. This is a useful local material improvement, not full graphics
or owner visual acceptance.

Actual browser observation: 2026-10-11T04:13:23.192Z. One fresh portrait journey
launched the application, selected g1 at its visible neck edge, held a genuine
right-button orbit to yaw314/pitch70/zoom115, released and received the current
settled refinement. No page errors or failed requests occurred. Original Node,
Chrome, streams, loopback server and nonkill Job closure were observed, with
no forced cleanup. Unchanged bot/offline evidence was reused. No active unit or
integration suite, synthetic component call, scenario matrix or timing gate
was added.

Passive Worker observation reported 183.7ms tree work for that held frame.
Preview paint reported 135ms and pointer work 137.2ms; these nested timings
must not be added as independent durations. The subsequent helper reported
222.6ms ground work and 594.1ms round trip. These are finite local observations,
not stable performance or tail/device acceptance. Responsiveness remains open.

Fresh Scene/Controller whole-book checking passed with zero holes. Scene output:
`92097ec3258284d7c07cd4d67f732ef3d854752ca55187c81f94f07de776e6eb`.
Controller bytes remain
`c47f84c8eb3032700bc2fadb7e30a754f59d9d6490000f73366b06c29361f8f2`.
The actual package regenerated the default ground through the candidate Scene
and production BPG1 encoder. Its 1,827,052 bytes retain the settled ground hash
`ee87a10d51304eeadfe05a2c6fce8645768d4a250d6dbd502654bb95c46a1881`.
Menu, bot library, production ports and original artwork assets were unchanged.

Exact private evidence, outside routine acceptance:

- `stationary-motion-20261006/orbit-bevel-journey-r1/result.json`:
  `55361f8378da9e6aea0025c6696143c75fd294de272dbe7a5980b31c1e4ceca5`.
- Original execution/serving closure `orbit-bevel-supervisor-r1/terminal.json`:
  `14d782fc962cb9f2a62c3396c08929ad0cd8e2421557f5d4e9bd90f1552537d5`.
- Candidate package `orbit-bevel-host-r1/build.json`:
  `4b8f7c5c8775a2abb3d409ce9b5d85cdcab1ab3aa89ad53ce9ef95c3312dc3e8`;
  24 files, 5,058,884 bytes.

These paths are relative to `.artifacts/bend2/2035-preview/`. Original failed
emissions r1-r6 remain historical provenance with known process/Job closure;
their actual syntax, affine-use and termination errors were corrected before
successful r7 emission. No failed record was overwritten or promoted.

This observation establishes display/selection/orbit behavior for one actual
view transition. It does not establish stable timing, physical/native devices,
kernel/formal proof, compiler adoption or extreme-camera coverage. The pristine
2.0.27 pin and all nine remaining full Goal groups remain intact.
