# Compact orbit-glyph contrast trial

The existing [Bend-only preview](https://haileystorm.github.io/rift-chess-bend2/)
still serves build `12e233fd9c7ca2c09fe4` at this checkpoint. Its immediate
camera-drag frame uses `PieceArt.camera_draw_min`, not the separate
`proxy_draw` used by other fast render paths. Black's body midtone `#31596e`
merges with a dark tile. A single dark-fill trial improved that tile contrast
but could disappear over the rift, so it was not promoted. The current
isolated draft draws a one-pixel down/right brass `#c39d67` contour behind
Black's navy `#0b1720` glyph. White's compact glyph and every settled
authored sprite remain unchanged. The default view stays 67° and Front 65°.

The pinned 2.0.27 source check for `PieceArt.bend` passed. A fresh selected
scene emission bound its changed transitive source; the normal draft
v2-preview build `e788562833af84fd6840` passed its manifest, asset,
metadata and service-worker packaging check. Its ignored `build.json` SHA-256
is `2ecbbff469ba596109ee884dd622f9afc499a7eefe43f6d9ed98265a87613a58`.
`node bend2/tools/bend.mjs --run bend2/tests/motion-color-contrast.ts` is the
repeatable direct 24-case Bend gate; it found both navy contour and brass edge for all
six Black kinds over representative dark-rift, cool/warm dark tile and light
tile colors, with White's original body retained. The motion-extent test
matched compact versus explicit expansion pixels for four views, three
layouts and both actual observatory themes (121,634,816 compared bytes).
These are finite checks, not a contrast threshold or human verdict. The
motion-extent timing loop remains on the cool theme; set `BEND_LIVE_WARM=1`
for the optional Warm Court path in `browser-v2-live.mjs`.

Real local Chrome held-orbit captures in cool and Warm Court had SHA-256
`d77f014f495a49957cadc9213e281af19476cb74758eb02b3a0560bea144c7b6`
and `fcc33e0550dac143b33ac813a128a14964fbfa293f439e93fc44f22e3a4adfa1`.
The cool capture changed 12,014 pixels confined to the Black-piece region
relative to the clean baseline; its post-release settled screenshot remained
byte-identical (`5b1babd0c3ed2170ed4da775b36491b612ea51a4f7eaaff5067d5b124e9883ee`).
A paired real-Chrome baseline/draft check matched complete settled canvases
at start, after e2–e4 and at Front 65°, while the held-orbit image differed
as intended. The extra contour adds work: local drag P90 reply samples moved
in both directions across orderings, and no portable speed bound or speedup
is inferred. The full uninterrupted exact-draft-build local game matrix
passed 24 scenarios/685 checks, zero defects; ignored summary SHA-256
`6a7a91ab0d3709abe4bac16f61346a033cd74efee10bee4822c236a9374fcd3e`.

The committed clean source `9d4a532df368006ef5464dd55888a593ed30e520`
built non-draft with `sourceDirty=false`, content version
`e788562833af84fd6840` and every playable file hash identical to the full
draft. Clean `build.json` SHA-256 is
`85c194ad428b32874e978bd1389fb3e69c67dc3377a72aa8f273e76f22287996`.
The separate exact-clean-build local matrix also passed 24 scenarios/685
checks with zero defects, with ignored summary SHA-256
`a91860036cbbdc5b82ac767889155f8e1fe3e553a827b65920ee44e88a7fc951`.
Frozen graphics-v1 and semantic-v2 manifests, the original TypeScript
62-test suite and its production build passed. `PieceArt.bend` is a native
`NativeV2` input even though this browser trial changes only fast orbit art.
A broad Windows `NativeV2.bend --check-only` sample reached the wrapper's
120-second timeout without a verdict; the child was no longer present on
read-only inspection. Do not relabel the older Linux CPU receipt as covering
this source. A [new one-shot Linux CPU-only request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5883381933)
binds the exact PieceArt SHA-256 and existing unchanged native inputs. Its
[Linux host-local result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5883726070)
reports a passing one-shot CPU package, real X.Org interaction, routed PCM
and save/restart; see the [native receipt limits](../native-2028-cpu/README.md).
The separate Pages repo received commit `7fb8613`. Browser checks, native
GPU, low-memory device performance and owner visual acceptance are separate.

## Hosted preview

The [separate playable Bend link](https://haileystorm.github.io/rift-chess-bend2/)
reported Pages `built` for exact commit
`7fb8613f1f2c15f6649b09db50a2f99c027247cd`. The live verifier matched
`build.json`, all 23 manifest-listed files, four required module MIME types,
and both unchanged original-game baselines. Its ignored receipt is
`.artifacts/bend2/publication/2026-09-29T04-03-56-070Z-abdf6838/receipt.json`,
SHA-256 `a83fd4c349ef5e862721134b895d93987f5abbd4f5fdc6d5ddb6df8e7d46fb66`.
Eight exact-build-bound hosted real-Chrome scenarios passed 83 checks with
zero defects: start, corrupt-plate fallback, camera, Warm Court menus,
persistence, mobile, import-gesture guards and touch import replanning.
The ignored summary is
`.artifacts/bend2/playtest-stage2/motion-brass-edge-hosted-focused-20260929/summary.json`,
SHA-256 `26397d20bf043b3290a811fc0ed171a1cc87c1059c41ed030ac4117303b71e15`.
The subsequent uninterrupted full hosted run on the same deployed build also
passed 24 scenarios/685 checks with zero defects. Its ignored
`.artifacts/bend2/playtest-stage2/motion-brass-edge-hosted-full-20260929/summary.json`
is SHA-256 `9c0ea1e309d9455a9914e8a260916548b90c54201e5c5b3891cdf27183e4a75e`;
the summary binds clean source `9d4a532` and content version `e788562833af84fd6840`.
This is real Chrome coverage on this host, not a physical-device latency
bound or owner visual sign-off. Native GPU, constrained-device motion latency,
physical audio and owner visual acceptance remain open.
