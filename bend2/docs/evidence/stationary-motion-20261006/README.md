# Stationary-piece motion correction — 2026-10-06

Ordinary moves and carried-piece Shifts previously lifted every present piece
at intermediate progress, including pieces whose source and destination were
the same square. At progress8 on a512px board, an unaffected piece rose16px
while its contact stayed on the ground. `BoardScene.interpolated_point` now
applies the existing lift only when source differs from destination. Moving
endpoints, interpolation and lift are unchanged. The legacy renderer already
uses that condition. Balanced immutable rendering, frozen Laws and the approved
toolchain pin remain unchanged.

The exact candidate package is
`.artifacts/bend2/2035-preview/stationary-motion-20261006/browser-KAysrI`,
build SHA256 `8d675a854df81db2bafba243446a0adff3dbe7191c96101c186577c4cd84603c`,
version `9955754a1186078ebf90`. It truthfully records source revision `c2086c8`,
dirty sources, draft status and `adopted:false`; publication does not retag it.
Current `BoardScene.bend` SHA256 is
`6659313fcb3b376282390cf9d0e780127b9aa2221d07a9134bd220c150512526`.
Selected scene manifest SHA256 is
`6045830dc3fdd3c274612458622671ca228ded21eb0d37f56462d7cd58c9e6b8`;
emitted scene SHA256 is
`aec9ef97364d54e6752496dc11204434cd145445811851cfdd0edf04e7a78f73`.
The package retains the exact camera controller, menu, Worker and compatible
Chrome modules; whole-book scene checking and emission passed in13.562s,
and the integrated build passed in27.974s.

Evidence below is retained under the private experiment directory above.

| Evidence | Result | Receipt SHA256 |
| --- | --- | --- |
| Whole-book scene check/emission | PASS; source unchanged, no network contact | `3215ca749e0baf4380ec1de37bb591c1b011b4287ab2f7642f8593a294ff2c2c` |
| Integrated exact-module browser build | PASS | `79887793965fcd3d7a5653b71c8c2d9c7e0f38bd3cba62b1bc5d4d55ac82ca6e` |
| Finite coordinates and camera-piece rasters | PASS; 3,840 stationary anchors, 240 unchanged moving-path samples, 40 isolated raster stages | `8e068b7d9730584adb361cb68ec52d94c79b2446f960dd912a0c1b48889ef107` |
| Normal-move proxy rasters | PASS; 40 isolated raster stages | `179f48019bac638a82d3625ceb12a6563f30fb8e348844fb17ae940947d11f70` |
| Actual Chrome selection/move/castling/en-passant/Shift scenarios | PASS; four scenarios, 120 TypeScript-reference checks, zero defects or page errors,89.666s | `45768f1bafc51ef085543d191c0817562339dcf362e7cd81dfab1a2f54570c1a` |

Each successful supervisor observed its actual retained child exit, checked
closure of that handle, checked that its qualified Job contained only itself,
closed that Job and verified unchanged monitored source inputs. No timeout
was interpreted as success and no child was signaled.

The finite witness uses the actual emitted controller to select e2, stage e4,
and commit with a Tick, asserting action3980/revision1. It exposes existing
generated scene functions by appending diagnostic exports without altering
their bodies. Stationary coordinates cover64 squares, sizes256/512/1024,
four camera views and progress0/4/8/12/16. The predecessor reproduces2,304
coordinate displacements. Four source/destination pairs retain the identical
moving coordinates. Isolated King e1 and moved Pawn e4 camera rasters cover
sizes256/512 and the same views/stages. A separate `fast_piece_layers` witness
exercises the normal-move proxies: King e1 remains identical to its settled
raster, the predecessor reproduces24 intermediate raster displacements,
and moving Pawn e4 pixels are byte-identical before/after. Result SHA256s are
`6352153d02fd87e3c8064fe1836b4aa5b328e048db31d51bb3b40f05eb791a79`
and `589cb3ccbc8383d6619038f05c9374cfbd76a9152b3c1c337c83bdbfcdffafaf`.
These are finite emitted-runtime checks with synthetic progress, not proofs,
full-board occlusion checks or exhaustive camera/raster coverage.

The browser run uses the canonical matrix with exact tag/import/output-path
adaptation checked against its source. Real input covers keyboard e2–e4,
dragging e7–e5, a click during another move's animation, queen mate, castling,
en passant, empty-platform Shift and carried-knight Shift. Its committed
journals and presented positions match the independent TypeScript reference.
Summary SHA256 is
`e6570485dee9e98df6e4666f197a5cab167e2fd70fb7e2eb27e4390b791358f9`.
Root inspected the actual queen and carried-Shift motion captures. The
captures show the existing switch from detailed sprites to proxy artwork;
they do not identify a natural middle-progress phase or independently prove
the stationary-pixel invariant. That invariant is supported by the separate
finite negative/differential witnesses. Motion artwork continuity, animation
smoothness and owner visual acceptance remain open.

Failed preparations remain retained: a finite supervisor preflight path error
occurred before child launch; a browser canonical-text equality gate rejected
UTF-8 text copied through Windows' default cp1252 before browser launch.
The corrected browser adaptation passed exact source equality. Earlier
unexecuted witness revisions and all predecessor bytes remain intact.

The prior camera package's full24-scenario/689-check and13-check offline runs
remain bound to that earlier package. This correction has its own four-scenario
browser evidence. Stable performance, physical devices, proof/BendTT/kernel,
native GUI/PCM/restart, original GPU250ms and reviewed toolchain adoption remain
open. The full sprint Goal remains active.
