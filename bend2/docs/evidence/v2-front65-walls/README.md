# Accepted Front 65° exposed-wall check

The low-resolution `BoardEdgesTest.ts` wall/topology gate now checks the
accepted White Front yaw 0°/pitch 65° and Black Front yaw 180°/pitch 65°
alongside its nine existing pitch-67° orbit views. It changes only the test:
the camera, board geometry, frozen Laws, TypeScript application and selected
browser code are unchanged.

From repository source base `e8d9dd5c483435c6bc2d4130db3261e2ba5d2573`,
the focused gate passed twice with local pinned Bend 2.0.27 and Bun 1.4.2:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/tools/bend.mjs --run bend2/tests/board-edges/BoardEdgesTest.ts
```

At yaw 0°/pitch 65°, the exposed rank-down rift wall retained 52 sampled
material pixels; its other three back-facing wall materials had zero. At
yaw 180°/pitch 65°, rank-up retained 65 and the other three had zero. The
test also asserts that motion walls and their composed 512px expansion do
not spill over sampled present tile tops, and its ordinary cardinal/oblique
wall, aperture and 160 near-cardinal/rift/theme variants passed. The final
`ok` receipt reported 19 topology checks and 11 low-resolution orbit views.

Exact source SHA-256: test
`ea1c8b5905bacdaf80262f419266ca002447015ff8fac10963f649d902578b11`,
`BoardScene.bend`
`c9faafe67b1ec4956004da386e417cadb7f438b1f8f6d9682edf1f42d52a9b2b`,
`Camera.bend`
`4b7ec3adbd6ca90cfd4597f1126b48b30dc0560a4bd9bd591eb3288a76b7f19f`,
and unchanged `TOOLCHAIN.json`
`17419db1617fece38c72dba9136463a313db43bf2c61f657334d9fdce0ae51a6`.

This finite 128px tree/material check is not a fresh full browser screenshot,
hosted/owner visual acceptance, GPU/device evidence, native GUI gate, or
proof that every camera angle has an exposed wall.
