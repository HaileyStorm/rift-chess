# Reuse image trees for nearest enlargement, 2026-10-11

`BoardScene.nearest2` previously rebuilt the input quadtree and replaced every
terminal pixel with four identical leaves. An Image holds color partitions;
its caller supplies the extent. For a valid input tree bounded by the declared
source depth, interpreting that same tree at twice the extent already gives
exact nearest enlargement. `Pixel.sample_xy` accepts a uniform Pix at any
remaining depth; `ImageOps` splits a uniform region when subsequent drawing
needs finer cells, and the browser PixelPort fills the supplied region extent.

The function now returns its input. Its name and two-argument API remain for
existing browser, asset-resize and NativeV2 callers. The recursive copy and
four-leaf allocation are removed. Source callers still supply the larger target
extent. This reasoning concerns valid depth-bounded images, not arbitrary
incorrect extent/depth combinations. Geometry, clipping, sampling, alpha,
coverage, colors and atlas identities remain unchanged. No frozen Law, shared
sampler, compiler source, accepted pin or TypeScript application is edited.

Only the affected Scene was emitted. Whole-book validation passed with zero
holes; its JS SHA256 is
`c6082e1c9e275a719957cfaebfc19b4acee99b84249a6d0a4ac25adf56d05942`.
The Controller import cone excludes BoardScene, so its unchanged emission was
reused with current source fences, as were Menu and the genuine bot Worker.
The actual browser package is version `c1f8af76783f105fd5a1`, build manifest
SHA256 `346be6d6cc808c542c18fb46b7cdc46fa885ff58ea7779aac90081502405ef6d`.
Default production BPG1 ground remains byte-identical.

One real portrait journey started the application, selected a visible g1 knight
edge, right-dragged the board, held it and released into current refinement.
All four captured PNGs are byte-identical to the previous `252b0b4` package.
Application observations passed with no errors. Original Node/Chrome handles,
streams, loopback server and nonkill Job closed without forced cleanup or an
uncertain execution. No unit/integration tests or scenario matrix were added.

The single profiled held-tree observation was 270.6 ms versus 250.2 ms previously;
preview painting was 178.8 versus 179.1 ms. These variable-load observations
show no measured stable or causal performance gain. Retention is a simpler
implementation that removes known unnecessary allocation; major sprite-painting
cost, responsiveness, tails, memory and physical devices remain unresolved.

Exact local provenance under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/` includes
`extent-reuse-emission-supervisor-r1/terminal.json`,
`extent-reuse-build-supervisor-r1/terminal.json`,
`extent-reuse-supervisor-r1/terminal.json`,
`extent-reuse-journey-r1/result.json` and its original CPU profile,
`extent-reuse-comparison-r1.json` and `extent-reuse-disposition-r1.json`.
This finite source/browser evidence is not a formal equivalence proof, complete
view coverage, kernel/Safe/BendTT, native GUI/PCM/GPU or version-adoption verdict.
Native/device acceptance remains separately pending.
