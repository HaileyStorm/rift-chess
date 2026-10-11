# Authored orbit preview

The browser keeps authored piece artwork while orbiting and after release until
the settled helper finishes. The preview paints a 256-pixel board over the
existing 128-pixel ground and refreshes only the two view-dependent knight
textures. The other ten authored textures stay intact. Preview state belongs
to a separate cache; it does not replace settled pose, ground or piece layers.
Before this theme's textures arrive, the existing procedural fallback remains.

Each immutable alpha mask records its raster size. Preview picking uses the
same 256-pixel centers, placement, coverage, opacity and painter order as the
displayed artwork, with logical 512-pixel ground fallback. Settled picking
retains its 512-pixel route. Mask offers, bounded retention, revision/view
guards, native rendering and helper acceptance remain in place.

One real browser journey passed: startup, right-drag from yaw 345/pitch 67 to
yaw 314/pitch 70 at zoom 115, release, selection of the visible g1 knight's left
neck edge, and settled helper replacement. The controller chose one coordinate
from the actual held screenshot: logical (663,346), CSS (828.75,432.5). The
primary press was trusted and used preview mask 2; the interface selected
White Knight g1. The helper then replaced it with mask 3 at the same view.
The screenshots show retained authored pieces during the coarse preview and
the final detailed ground. This is a finite visual and interaction witness,
not exhaustive alpha/overlap/camera coverage.

Performance remains unfinished. Refreshing the preview knight textures took
86.6 ms and painting the preview took 145.9 ms; the render tree took 233.5 ms.
The real edge press reached its selection canvas update in 165.4 ms. These are individual
local observations, with a manual screenshot-inspection pause inside the held
gesture. They establish no continuous-drag rate, tail/device performance or
memory improvement. No timing gate or repeated scenario matrix was added.

Fresh exact-source Scene and Controller pure JavaScript emissions passed their
source/type checks with zero holes. The package reused the unchanged retained
Menu emission, BPG1 asset, bot and host logic. Its size is 4,983,780 bytes.
The narrow TypeScript check of worker, helper and pose port passes. Formal laws,
proof obligations, upstream compiler pin and runtime parallelism are unchanged;
this does not establish kernel, native/device, GPU or compiler adoption acceptance.

Original Scene Bun 31108, Controller Bun 16360, package Bun 32956, Node 35532 and
Chrome 21792 exited 0 with retained original handles. Streams reached EOF with
no overflow/error, inputs remained unchanged, the loopback server closed and
both nonkill Jobs closed with known ownership. No forced cleanup or retry ran.
This closure does not resolve older unknown executions.

Exact private evidence under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

- Emission terminal: `9ea4eee1a50b216897cdbd671ad613eb1fcd3d0789d133ab492a6ed3a51a24f5`.
- Scene module: `0be5a7f2bb91a848bc22f81a11e3d1f95a23f31ca9e9c5cc0f1ad60ceb92d154`.
- Controller module: `c47f84c8eb3032700bc2fadb7e30a754f59d9d6490000f73366b06c29361f8f2`.
- Package manifest: `285d5c6c72e839390f4168b2208bfc667704c3a8bd0bde59cc9effbe555e6974`.
- Journey: `e7789c18888bbd813ab7f7df6a9f51750ab5cda06f5b2f7cde30bd11def571be`.
- Browser/build terminal: `c68996295b0cd9b48a27c6074fcc28d1a4432c7c40c445f7f2fec704bf9448dc`.
- Held screenshot: `65688885396e3b3a7c64b11dd0c701e25197a7d6d3e5e273029df0524b37c608`.
- Settled screenshot: `b59d774d3073cd6657f57ccb845420929899857364313dcaf819e4d4f3b49472`.

Source memory disposition: reasoned skip. This transient implementation and its
finite measurements add no durable user correction or policy. The existing
strict test-value policy remains canonical; Git and the private disposition
retain these source bytes and evidence limits. The full sprint remains open.
