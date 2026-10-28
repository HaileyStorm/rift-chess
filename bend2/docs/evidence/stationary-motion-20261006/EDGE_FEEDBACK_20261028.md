# Piece and platform edge feedback — October 28, 2026

The owner requested removing the raised selected-piece halo, hover circles,
blue Shift-destination circles inside rifts and yellow selected-platform circle.
The owner clarified that piece square-edge highlights should remain. Movable
platform hover and selection should use the platform's outer edges instead.

`BoardScene.bend` now keeps cyan piece square edges and uses an amber projected
outline around the complete 2×2 platform. Hover is subdued; selection is stronger.
No internal cell hover outline is added to an unselected empty platform or a
selected platform. Movability comes from the controller's existing fully legal
Shift pairs, retaining the Shift-hints preference. Missing platforms receive no
hover outline. Recent Shift feedback also uses a perimeter instead of a circle.
Piece move/capture/check/promotion cues retain their separate meanings.

Superseded selected-aura, piece-hover rim and macro-circle painter helpers were
removed. The same renderer handles detailed sprites, proxies/camera previews and
native composition. Rules, controller, artwork, picking, balanced parallelism and
frozen libraries are unchanged. Only the affected Scene was re-emitted; the
helper and browser Worker were rebound to that exact Scene output. Existing
ground-only data, Controller, Menu, bot and assets were reused.

One actual paired Chrome 156 journey hovered/selected g1, hovered/selected the
legal empty platform A2, and clicked its rift destination c3/B2. Both versions
offered the same action 20825 and committed it, changing holes 544→528 and the
side to move. Views, summaries and saved history matched at all six checkpoints;
pixels changed as intended. Visual review found one remaining internal hover
edge. The final candidate removed it and completed a fresh candidate-only
journey against the retained original baseline record. That record is explicitly
historical, rather than a newly executed baseline. The final piece and platform
images were inspected: no requested circles remain, and platform borders follow
only the outer perimeter.

Both Scene emissions checked their whole loaded books with zero holes and
unchanged imported inputs; they do not establish a new formal kernel verdict.
The final original Chrome/parent exits were 0; the server and owning Job closed
normally, with no errors, failed requests, signals or forced cleanup. Profile:
Windows x64, headless Chrome 156.0.8078.48, 1280×800, scale 1. No unit suite,
timing gate or scenario matrix was added.

Private originals remain under `edge-feedback-20261028-r1/`, including the first
visual candidate and all original streams and handles' terminal receipts.

| Final source or original record | SHA256 |
| --- | --- |
| BoardScene source | `512e1303630a3c3e3feb9bbe010379945148f8ba78868753df809e1e696c27ae` |
| Scene emission manifest | `ef2eabcbefee748e089bb02ea4be8f868f9f1c3193fb4a3d52b5499c7afb01ef` |
| Scene JS | `eb3d9937c289071a29c84e641a5442ad3d77f786180d82eb5b781ab97d2d7d8d` |
| Emission settlement | `11b04cb6c08422e768ee3530082d0dc9f8297b25e7a1be4cb4bcefa36377ac5d` |
| Browser package | `b9ad3570d87bedcd83b4da59eed2c4cfebd8e4cb5403cf8e42b4192dace2fb73` |
| Final actual journey | `8087a02fb5268690d6894864fee70d1837bdb53d9e098898b07b5f387f03b4a8` |
| Final journey settlement | `ef6a17f06c6a2205488f59df6ce015a363349a19eee0668fd0d96b245ebd77ff` |
| Platform hover PNG | `8275790098527017ea64a088f4f32ef20bbb5c3d4df421459cbb0c256e2e12f3` |
| Selected platform PNG | `375c946b6ee906457c46c467dfcd4cb6ee9ba90edf6736d51a944965e3b7f6f3` |

This establishes the scoped browser behavior and visual change. Physical-device,
native/GPU execution, stable performance, compiler adoption and broader owner
visual acceptance remain separate. Public deployment is recorded separately in
the [publication evidence](../camera-refinement-20261006/PUBLIC_PREVIEW_20261028.md).
