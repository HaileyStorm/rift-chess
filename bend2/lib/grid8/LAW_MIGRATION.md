# Graphics v2 → grid8 law relocation — DRAFT structural map

The pre-split combined English draft is retained as ignored
`.artifacts/bend2/graphics-v2/pre-grid8-LAWS.md`. No semantic law is deleted,
weakened or declared frozen by this move. `G` means
`bend2/lib/graphics/v2/contracts/{LAWS,PROOF}.bend`; `8` means
`bend2/lib/grid8/contracts/{LAWS,PROOF}.bend`. The pinned 2.0.27 checker
closed both relocated packages on 2026-09-24; core and grid finite suites
passed 5,874 and 48,021 checks respectively. These remain DRAFT, not frozen.

| Old signature | New source/proof | Exact preserved meaning |
| --- | --- | --- |
| `color_zero` | G, same name | Packed source-over at alpha0 equals destination. |
| `color_full` | G, same name | Packed source-over at alpha255 equals source. |
| `layer_zero` | G, same name | Zero-opacity Image over returns exact target tree. |
| `layer_full` | G, same name | Full-opacity Image over returns exact source tree. |
| `disk_zero_radius` | G, same name | Radius0 disk preserves exact input Image. |
| `disk_zero_opacity_unit_radius` | G, same name | Radius1/alpha0 disk preserves exact input Image. |
| `rounded_reversed` | G, same name | Fixed reversed rounded bounds preserve exact Image. |
| `masked_none` | 8, same name | Zero 64-bit grid mask paints nothing, exact input tree. |
| `disk_corner_coverage` | G, same name | Unit disk quarter coverage uses alpha191 at (0,0). |
| `rounded_corner_coverage` | G, same name | Four 2×2 rounded corner quarters each use alpha191. |
| `layer_partition_one` | G, same name | Four independent depth1 alpha128 child blends join in Qua. |
| `ring_equal_four` | G, same name | Equal inner/outer radius4 annulus preserves exact Image. |
| `tile_absent` | 8, same name | Absent selector returns the void cell Image. |
| `tile_even` | 8, same name | Present/even selector returns the light cell Image. |
| `tile_odd` | 8, same name | Present/odd selector returns the dark cell Image. |
| `alpha_zero` | G, same name | Zero uniform mask alpha preserves exact target Image. |
| `spatial_empty` | 8, same name | Empty 64-bit projected grid returns exact input Image. |
| `spatial_lit_empty` | 8, same name | Empty lit projected grid returns exact input Image. |
| `spatial_illuminate_zero` | 8, same name | Zero-strength per-cell tint returns exact unchanged Surface; its type now lives in G `RaisedFacet`. |
| `spatial_cell_absent` | G, same name | `RaisedFacet.draw_cell(False)` returns exact input before any F32 work; it is the identical former arbitrary-corner `SpatialBoard.draw_cell(False)` body. |
| `layer_partition_depth` | G, same name | Arbitrary-depth Qua alpha128 child compositing structurally joins the same four results. |
| `spatial_fast_empty` | 8, same name | Empty 64-bit fast affine grid returns exact input before inverse F32. |
| `transparent_stamp` | G, same name | Uniform key-color Stamp preserves exact target Image. |

The old combined English clauses 1,2,3,5,6,7,9,12 belong to G. Old clause4
splits gradient (G) from 8×8 Board (8); clause8 TileSurface moves to8;
clause10 splits generic arbitrary-corner RaisedFacet (G) from grid traversal,
mask, palette and lighting (8); clause11 SpatialFast moves to8. The full
signed-coordinate/image/packed-color preconditions stay in G and are imported
by 8; F32/finite/native/browser evidence boundaries remain explicit in both.
