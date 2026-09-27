# Multi-angle piece art study — not integrated

The local six-click view capture at
`.artifacts/bend2/v2-preview/sprite-camera-only-burst-20260927/final.png`
shows the still-shipped front-facing atlas sprites under a rotated board.
This study tests two ways to obtain directional silhouettes. It does not
replace `chess-piece-atlas.png`, its RGA pages or any browser/native asset,
and it is not owner visual acceptance.

## Single-piece generated study

The existing authored atlas (SHA-256
`e7e4dd458e02d098c5daa3db2d6a4dc903f10d2f55da33684932ecc2b9dad923`)
was the edit/reference target. Built-in ImageGen made an ivory-and-gold knight
variant, then a targeted rotation edit. The selected 1024×1536 PNG is copied
non-destructively to ignored
`.artifacts/bend2/art-direction/white-knight-rear3q-study-20260927.png`
(SHA-256 `bf1f0b548b505c7301509f891294eb6dfe2a193b9c961a336c4c8ee564699f84`).
It has real alpha (corner alpha 0), but the edit still reads predominantly as
a side profile and cannot establish consistency for twelve pieces over a
turntable. It is **not** a sprite source. The built-in generation/edit prompts
were:

> Use case: stylized-concept. Asset type: isolated Rift Chess game piece sprite study. Edit/reference target: the supplied 12-piece atlas; use ONLY the white ivory-and-gold KNIGHT in the top row, second from the left, as the identity and material reference. Produce ONE full chess knight sculpture, not an atlas or board. Rotate the same sculpture around its vertical axis into a convincing rear-right three-quarter view (roughly 100 degrees from the shown front/side illustration): the gold-trimmed flowing mane and back of the horse head are visible, one cheek/profile remains readable, and the muzzle points toward frame left. Preserve the original ivory marble, fine gold filigree, round stepped base, proportions, horse identity, and premium painterly 3D-render style. Full piece from crown/ears to base, centered with generous clean transparent padding; physically coherent volume and base ellipse for a raised chessboard camera. Soft directional warm highlights and cool shadow, legible silhouette when reduced to a 50-pixel-tall game sprite. No other pieces, no duplicate head, no pedestal beyond its original base, no scenery, no checkerboard, no cast-shadow rectangle, no text, no watermark. Genuinely transparent background.

> Use case: precise-object-edit. Asset type: transparent Rift Chess chess-piece rotation study. Input image: edit target, the existing isolated ivory marble and gold knight. Change ONLY its viewing angle: rotate the rigid sculpted chess piece farther around its vertical axis so the camera sees a true rear three-quarter view, about 140 degrees from the original atlas presentation. The broad back of the horse head, both swept layers of the gold mane, and the rear of the curved neck dominate; the muzzle is now mostly foreshortened/partly hidden toward frame left, with at most one eye partly visible. The circular stepped base rotates with the statue and remains the same size and design. Preserve the exact horse identity, ears, gold tack and star medallion, ivory marble/gold materials, proportions, outline polish, lighting family, and single-piece full-height framing. Keep genuinely transparent alpha with clean non-glowing edges and padding. No additional piece, no duplicate head, no background gradient, no scenery, no checkerboard, no text, no watermark.

## Licensed geometry study

The public [Khronos “A Beautiful Game” sample](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/ABeautifulGame/README.md)
at commit `7d4ba189827916452eeadc82d4b712dbc6280a6f` has a 42,977,928-byte
GLB with separate white/black chess-piece meshes. Its ignored local copy is
`.artifacts/bend2/art-direction/ABeautifulGame-7d4ba189.glb`, SHA-256
`bd7133b4b322aae97c589b8839dae8155ad2546acb35ae32a127e722a959d007`.
The [model license](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/ABeautifulGame/LICENSE.md)
is CC BY 4.0: if a derived sprite is ever shipped, credit © 2020 Academy
Software Foundation/MaterialX (original model) and © 2022 Ed Mackey (glTF
conversion), link the source and license, and identify modifications. None
is shipped now.

An ignored local render harness at
`.artifacts/bend2/art-direction/preview-gltf.mjs`
(SHA-256 `9c5a288eaa0ba289c89eeef76a623912e1af3bd6417e07b1751140478fd42308`)
uses the already-installed Three.js 0.185.1 and real headless Chrome to isolate
all twelve piece meshes, normalize rank heights, and render 0/90/180/270°
under fixed camera and lighting. The actual outputs are the ignored
`gltf-piece-turntable-sheet-baseline.png` (SHA-256
`915421c6cd12b60525de6906349b5a8df24906355c1713569b1ab7819626e7d4`)
and an exploratory code-native gold-base-ring variant
`gltf-piece-turntable-sheet-gold.png` (SHA-256
`4ed62757e8d0a108550a4e4c84716f97956ffb2c5238b732b08e8b8e4fbf386c`).
The isolated knight's PNG corner alpha is 0. Local browser runs finished with
zero page errors; these hashes bind this Windows/browser/GPU rendering, not
cross-device pixel identity.

At approximately 50–70 px presentation the 3D set has coherent rear and side
silhouettes, but its ivory pieces are less ornate and lower contrast on pale
squares than the current gold art. Three generic gold base rings help but do
not close the material/character gap. Keep the current atlas. Any promotion
needs a consistent art finish for all twelve, yaw wrap/boundary handling,
separate hash-bound RGA page baking, license/notices, actual browser/offline and
native interaction tests, and owner visual review. Do not ship the 43 MB GLB.
