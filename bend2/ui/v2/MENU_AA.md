# Board-first Bend UI and native-resolution type

`MenuAA.bend` owns the game-specific top strip, selected-piece context, compact
action dock, focused dialogs and optional portrait guidance. It accepts the
raw board `Image` with extent `2^plan.boardDepth`; it does not import chess
rules. The exact button rectangles come from `ChromePlanCompact.bend`, which
also drives hit tests. `MenuAA` never invents a clickable region. Desktop uses
a centered `{256,64,512,512}` board in a 1024×640 canvas. Portrait uses
`{0,112,512,512}` in 512×1024. Menu 3 and 7 remain contextual, leaving the
board visible; preferences, history, view, match and confirmation choices
become focused cards. The initial portrait guide yields to a short contextual
hint after selecting a piece or making a move.

The browser worker may invoke these pure selected Bend exports:

| Export | Meaning |
| --- | --- |
| `font_path()` / `font_byte_cap()` | Bend-owned `assets/rift-observatory-font.rga` path and 262,144-byte cap. |
| `load_font(bytes:Array<U32>, used:U32)` | Strict bounded RFNT decoder; returns `Some{Book}` or `None`. Host pads a fetched `Uint8Array` to power of two and retains the decoded `Book`. |
| `same_base(oldData,oldPlan,newData,newPlan)` | Exact Bend-owned comparison for atmosphere/frame/brand reuse. Theme, mode and output geometry must agree; controls/menu/turn/selection may differ. |
| `base_chrome(depth,size,data,plan,fonts)` | Slow infrequent background, frame, title and portrait action well without controls or dynamic text. |
| `same_static(oldData,oldPlan,newData,newPlan)` | Exact Bend-owned comparison for reuse of the base plus controls. It also compares menu, sound and every control's ID, label, geometry, enabled and active state. |
| `controls_chrome(depth,size,data,plan,fonts,base)` | Draw currently planned controls over a retained base. Destination chips use a light rectangular treatment to reduce transient repaint work. |
| `dynamic_chrome(depth,size,data,plan,fonts,staticImage)` | Paint turn/selection text and portrait context over a retained base+controls image. Start from that static image on each update to erase previous text. |
| `compose(depth,plan,rawBoard,prepared)` | Embed raw board at the exact planned position. During play, the controls/text live outside the board rectangle, allowing this cheap path. |
| `render(depth,size,data,plan,fonts,rawBoard)` | Uncached convenience path for focused modal screens, specimen images and diagnostics. |

`chrome()` and `static_chrome()` are convenience compositions of those layers;
they do not replace the fine-grained cache path. The host may compare/cache
immutable images but must ask Bend's `same_base` and `same_static` predicates.
It must never reuse a control image merely because a JS heuristic thinks a
selection is unchanged. The controller's `RenderPlan` still decides when a
visible frame is needed. Modal overlays must be drawn after board embedding;
`render()` handles that order.

The font source, OFL attribution, deterministic pack generator, format and
bound are documented in [fonts/README.md](fonts/README.md). Ordinary opaque
menu ink uses the graphics library's native 8-bit glyph mask stamping. This
keeps the pure Bend raster and avoids preparing full-screen PMA groups for each
word. The reusable `third/GlyphLayer` remains the right tool for a translucent
overlapping group or colored material treatment, neither of which these
opaque labels need.

Verification is deliberately separated. `bend2/tests/menu-aa-array-abi.mjs`
proved the actual emitted Bend `Array<U32>` accepts padded JS `Uint8Array`.
`menu-aa-font-pack.mjs` checks the packaged 151,343 bytes, SHA-256, malformed
inputs, tier lookups and intermediate 8-bit coverage. `menu-aa-render.mjs`
emits actual pinned Bend, writes desktop/preferences/mobile/view/match PNGs,
checks cached output pixel-for-pixel against full rendering, and measures
fresh versus retained layers. Inspect PNGs in ignored
`.artifacts/bend2/v2-preview/menu-aa/` at actual display scale.

Local Node 24.12 emitted-JS specimens, 30 interleaved calls, varied with machine
load: first chrome preparation ranged about 120–276 ms; dynamic turn/selection
updates were 9.16–17.47 ms p90; retained board compose was 0.19–0.74 ms p90.
A first control-list replacement took 41–47 ms p90 before the lighter
destination-chip treatment. Focused emitted-Bend runs of 12 destination
controls over a retained base measured 16.03, 33.56 and 39.87 ms p90 across
loaded-machine reruns (40 calls each); the last render also moved the selected
identity to the left gutter so it cannot overlap destination chips. These are
JavaScript worker-computation timings without
browser device transfer or GPU. The whole UI still requires rendered browser
interaction, keyboard/pointer and accessibility checks, real board artwork,
and owner visual acceptance. This module adds no generic graphics law or proof;
it imports the DRAFT library without changing its contracts.
