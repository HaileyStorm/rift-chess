# Stationary Canvas preview, 29 October 2026

The browser candidate can paint a stationary position during camera rotation
with Bend-authored polygons, edges, contacts and integer sprite rectangles.
This keeps board geometry at 512 pixels during rotation. Piece animation,
menus, unavailable Canvas and failed preview frames retain the existing painter.
The accepted 2.0.27 pin, frozen laws, original TypeScript application and native
87-file source cone are unchanged.

`CanvasBrowserControl.bend` wraps the original controller using its actual
imported types. The selected browser input explicitly binds that entry to the
existing controller import; no host-side object retagging is used. The current
source-bound repacker consumes schema `/3`, three Bend modules and two explicit
generic host modules. Retained `/2` packages and their original builders remain
historical evidence.

Canvas coverage and blending are a separate preview contract. Sprites use
integer destination rectangles and nearest sampling. The generic port constructs
an immutable label Image from binary source alpha using pixel-center nearest
sampling. Bend interprets labels, revision, controls, board bounds and ground
holes. Displayed mask offers retain their view and placement; a fallback receives
a separate identity rather than rewriting an earlier displayed label image.
Canvas frames transfer an ImageBitmap and composite it with Bend's chrome;
they avoid synchronous Canvas pixel readback. Texture resources follow the
immutable pose identity. Detailed refinement still uses the existing renderer.

## Actual evidence

The final controller's whole-book check and JavaScript emission completed with
zero holes and no network/subprocess calls. Emission manifest SHA256:
`8de64f524f60e1f4d47f4804b2c743a6cdab0785808f2cf2c53e9723be8c91e7`.
Its output is 763,730 bytes, SHA256
`539390a3ecd329d73278599bd5700539449b1dd153e453b23ee62dff8a02cf1a`.

The final candidate package is bound by build SHA256
`f19526dff2aa4665aead47f17031a301a756f85b875745b8131510686fdc05af`.
One real Windows/headless Chrome 156 application pair used the retained baseline
first, fresh contexts, a warmed continuous right-drag, release, displayed-frame
knight selection/deselection and unchanged saved history. The candidate produced
18 Canvas presentations with no fallback. Its extra trusted click consumed an
actual displayed Canvas mask offer and selected g1; deselection also succeeded.
All original browser, parent and serving handles closed normally.

In that uncontrolled sequential pair, presented motion-frame p95 fell from
299.9 ms to 118.8 ms, and consumed-input-to-draw p95 from 317.4 ms to 148.2 ms.
Detailed arrival was 1,657.2 ms versus 1,739.9 ms. The candidate presented nine
motion frames versus four. These observations support continued work on this
path; they do **not** establish stable performance or the 33.3 ms motion target.
Actual motion and detailed images were inspected: outside faces remain coherent,
the piece set is retained, and the motion board has sharper edges.

The original journey wrapper ended with a failed leftover PNG equality assertion.
The candidate performed an extra hover/selection interaction; its detailed image
therefore retained a different blue hovered-square outline. The 561 changed
pixels lie within that outline's board bounds. Both application lanes completed,
position/view/history and g1 selection comparisons passed, and no product fault
or failed request occurred. The original failed receipt remains unchanged. The
invalid image-equality gate is removed from the successor journey; no repeated
application run was needed merely to turn that receipt green.

Earlier retained attempts include a source affine error, loopback EACCES before
any request, an unmoved-pawn texture-index bug caught by actual E2E, and a slow
readback-based Canvas prototype. Their original failures and settlements remain
private provenance. No unit/integration suite or new scenario matrix was added.

This is browser implementation and bounded acceptance evidence, not formal proof,
native/device acceptance, human visual approval, compiler adoption or completion
of the full sprint. The hosted preview is not changed by this commit.
