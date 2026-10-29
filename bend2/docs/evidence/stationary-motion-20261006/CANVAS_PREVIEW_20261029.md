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
integer destination rectangles and nearest sampling. Bend retains a compact
picking state from those exact displayed commands and immutable source alpha
masks. It samples only the requested pixel, in front-to-back order, using integer
pixel-center nearest sampling. Bend interprets labels, revision, controls, board
bounds and ground holes. Displayed offers retain their view and placement;
switching between Canvas and the fallback painter receives a separate identity
once an earlier offer exists, preserving its original picking interpretation.
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

## Retained intermediate: uniform label compression

A subsequent change verifies complete uniform regions before recursively
building their children. It returns the same label values while avoiding empty
pixel recursion. Drawing, sprite placement, label sampling and game rules are
unchanged. The revised package SHA256 is
`72393bce18e0d194165b8dd12d582a020f5e98c386d58d19a6f6828faedf3c52`.

The real application comparison against the preceding Canvas package completed
with no errors or fallback, matching motion captures, successful displayed-frame
g1 selection/deselection and unchanged history. Both contexts and original
browser/parent handles closed. This pair measured motion p95 of 76.6 ms versus
46.8 ms, input-to-draw p95 of 96.5 ms versus 86.6 ms, and detailed arrival of
1,142.8 ms versus 941.3 ms. Label construction samples fell from 15.4–35.6 ms to
2.1–13.0 ms. These are another uncontrolled pair, not an absolute performance
chain across earlier runs. Original parent terminal SHA256:
`dd4fa6d1acc335f9265f4ebcd11e369393adde45ffa61ee05cf0c66887303a0e`.

That pair's trusted-input spacing itself had 44.2 ms p95. A separate single
candidate observation dispatched bounded original mouse actions at 16 ms without
waiting for each protocol acknowledgment, then joined every original promise.
It observed 44 trusted moves, 16 motion presentations, 59.7 ms motion p95 and
1,317 ms detailed arrival; input spacing p95 was 31.7 ms. It confirms that the
33.3 ms target remains open. The original profile retains an inherited
baseline-order description; its actual one-lane record, source loop and explicit
candidate-only scope establish that no baseline application episode ran.
Original terminal SHA256:
`ab211d21f7bb8cc00d6965d894855dd5192b129486d4f265229132f4675ca8fe`.

## Direct displayed-command picking

The next implementation removes the per-frame label raster and quadtree entirely.
`CanvasPicking.bend` retains labelled sprite rectangles and source masks in
front-to-back order. Its integer pixel-center calculation matches the former
label raster, while sampling only a requested pointer position. The color port
now returns only the transferable bitmap and timing metadata. Both directions
of a Canvas/fallback transition preserve previously offered picking identities.

The new controller's whole-book check and emission passed with zero holes.
Manifest SHA256:
`43efb747b54b5a15b4e12d9832303f4b153a339bac547f34177d2614204affbc`.
The exact browser package SHA256 is
`b214430598fba583d9a9a45f4a5a7605afdad38ebd08ae34b46eeb59396adb7d`.

One real application pair compared the retained uniform-label package with this
candidate. Both completed without errors or fallback; displayed Canvas g1
selection/deselection and saved history matched. Motion PNGs were byte-identical.
The actual motion and detail frames were inspected. Candidate motion p95 was
42.4 ms versus 116.8 ms, consumed-input-to-draw p95 was 60.0 ms versus 137.0 ms,
and detailed arrival was 1,000.3 ms versus 1,811.6 ms. The candidate consumed all
48 trusted moves and presented 48 measured motion frames. This uncontrolled pair
does not establish stable performance; the 33.3 ms planning target remains open.
That pair was not repeated with the same driver. Original terminal SHA256:
`85d920f79ae587eef5b6e041cbcb10d0301510e9be6ee3b0f42c72073faefb92`.

The first attempt was denied a localhost connection by the sandbox (`EACCES`)
before any app request. It settled normally and remains preserved; the completed
journey used permitted local networking. All browser, serving and parent handles
from both attempts closed normally. No unit/integration tests were introduced.

## Input-pacing limitation

Reading the original current-package recording separated rendering cost from
offered input cadence: the 48 motion frames had worker-rendering p95 16.4 ms and
request-to-presentation p95 26.2 ms, while trusted pointer spacing was 42.8 ms p95.
The driver awaited each mouse action's acknowledgment before dispatching the next.
This does not attribute the 42.4 ms presentation cadence to renderer throughput.

One bounded candidate-only observation used the existing independently scheduled
mouse-promise form against this exact package. All 48 original promises settled
before release, but Chrome delivered 38 trusted moves and 21 consumed/presented
batches. Actual trusted spacing was 49.0 ms p95 and observer arrival spacing
51.3 ms; the intended 16 ms delivery was not established. Presentation cadence was
74.2 ms p95, consumed-input latency 112.4 ms and detailed arrival 1,249.3 ms.
The 33.3 ms motion target remains open. These data do not justify a specific
renderer optimization or another unchanged timing repeat. All original browser,
parent, stream, server and Job handles closed; no errors or Canvas fallback
occurred. Original terminal SHA256:
`8b702d6f4cd4c558d9faa93b16b5d2d50c0b2c0e48e51e1b25dc04250b673010`.

## Cache the immutable background surface

The Canvas renderer now uploads a changed Bend background once to a retained
opaque surface and draws that surface into each new frame. It previously used
`putImageData` on the drawing surface every frame. Logical size, commands,
textures, sampling, picking and bitmap ownership remain unchanged.

One real Windows/Chrome 156 application pair compared the preceding shared-UI
package with this change. Both used a fresh context and the same trusted
24-point right-drag. The held Bend view matched, and the full captured RGBA and
PNG were byte-identical. There were no errors, request failures or Canvas
fallbacks. All original browser, serving, parent and Job handles settled.
Candidate build SHA256:
`97ad0d4556136c92ffa5e33d359129500e222b96104cdc2e7b18ff5a0d09cad2`.
Original result SHA256:
`561794263281f64d1256749cb65995d9336affc7753a22eac9c050ed52178009`.
Original terminal SHA256:
`230c3681793e75d776ef57186c0678506a6b67b79f825cf5346920bba03c9c0a`.

For frames reusing the background, background-copy p95 was 5.9 ms before and
0.3 ms after; command drawing p95 was 15.9 ms and 1.1 ms. There were 12 baseline
and 23 candidate cache-hit frames. For requests actually consuming a fresh
trusted right-drag move, worker preparation p95 was 158.2 ms and 3.1 ms,
and consumed-input-to-draw-end p95 was 521.2 ms and 50.8 ms. These subsets exclude
release frames that merely retain an older move ID. The earlier private derived
summary's `workerRenderMs` field incorrectly named controller dispatch time;
the later timing review corrects that interpretation without changing originals.

This is one uncontrolled sequential pair with different input coalescing. It
does not establish stable FPS, delivery cadence, a browser backend change or
the 33.3 ms motion target. The held and settled images were inspected. No
unchanged campaign, unit/integration suite or scenario matrix was added.
