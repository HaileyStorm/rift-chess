# Actual library visual specimens

All five 1024×1024 PNGs are emitted by
`bend2/lib/graphics/v2/examples/render-expansion.mjs`, using the exact supplied
Bend compiler's JavaScript loader and the real library modules. The host only
constructs input Data, reads opaque RGB into bytes and encodes PNG. It does not
rasterize substitute text, shapes or materials. No concept/reference artwork is
imported as runtime imagery.

| File | What to inspect |
|---|---|
| `01-reusable-workbench.png` | Reusable panels, vector chart strokes, text selection and procedural material swatches |
| `02-alpha-and-mips.png` | Nearest versus alpha-weighted linear filtering, overlap order and deliberately selected mip levels |
| `03-materials-and-skins.png` | Four prepared periodic fields, fixed-size skin corners across panel dimensions and cached color transforms |
| `04-text-and-native-type.png` | Explicit wrapping, selection/caret geometry and native-resolution coverage versus the retained atlas path |
| `05-damage-reconstruction.png` | Old/new poses, incremental reconstruction, full reference and restoration after removal |

The example's layout, colors, text and composition are application choices, not
library defaults. Scene construction, readback and PNG encoding times are recorded
separately in `visual-receipts.json`. These are single captures including scene
preparation, not steady-state benchmarks or browser screenshots. Damage results
are also compared pixel-for-pixel before the diagnostic image is written.

The two temporary native-font bakes use Lato Medium, source SHA-256
`be8bbf7105500e8fc1f9429307fb396905a0e6cff63fe1eb751bb319d0f1b0db`,
at 24/40 pixels and eight-bit coverage. The corresponding provenance JSON files
record rasterizer versions, source hash and generated module identity. No font
binary or newly generated font-data module is included. Reproduction requires a
local font; see `../REPRODUCE.md`.

The atlas/native specimen intentionally uses different rendering/font paths and
sizes. It illustrates legibility and integration; it is **not a controlled
same-font/same-size comparison of alpha precision**. No broad typography claim
should be inferred from that specimen.

`visual-source-manifest.json` binds the final renderer, PNG helper, host adapter,
font provenance and rendered outputs. The raw final run is
`../receipts/render-final.log`. The first exploratory renderer log is retained
separately; the final rerun uses correctly tagged Texture Data for mip levels.
