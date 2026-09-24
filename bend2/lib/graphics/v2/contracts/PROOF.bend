# DRAFT proofs; source checker validation is not law freeze or device evidence.
import Base
import ./LAWS.bend as Laws
import ../AffineGrain.bend as AffineGrain
import ../AffineTexture.bend as AffineTexture
import ../MaskedStamp.bend as MaskedStamp
import ../Grain.bend as Grain
import ../../Quad.bend as Quad
import ../Shapes.bend as Shapes

# Retain the arbitrary-opacity invalid-texel endpoint by splitting the
# symbolic zero-opacity guard into both constructive Boolean cases.
def affine_texels_zero_case(+zero: Bool, +depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p01: Quad.Point,
  +palette: Grain.Palette, +seed: U32, +opacity: U32, +image: Image)
  -> {AffineGrain.draw_zero(zero, depth, size, p00, p10, p01,
       palette, seed, 0, opacity, image) == image : Image}:
  match zero:
    case True{}: {==}
    case False{}: {==}

def affine_texture_size_zero_case(+zero: Bool, +depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p01: Quad.Point,
  +source_depth: Nat, +source: Image, +opacity: U32, +image: Image)
  -> {AffineTexture.draw_zero(zero, depth, size, p00, p10, p01,
       source, source_depth, 0, opacity, image) == image : Image}:
  match zero:
    case True{}: {==}
    case False{}: {==}

def masked_transparent_case(+zero: Bool, +target_depth: Nat,
  +target_size: U32, +source_depth: Nat, +source_size: U32,
  +left: Shapes.Coord, +top: Shapes.Coord, +colors: Image,
  +opacity: U32, +image: Image)
  -> {MaskedStamp.draw_zero(zero, target_depth, target_size,
       source_depth, source_size, left, top, colors, Pix{0},
       opacity, image) == image : Image}:
  match zero:
    case True{}: {==}
    case False{}: {==}

def Laws.color_zero(src, dst):
  {==}

def Laws.color_full(src, dst):
  {==}

def Laws.layer_zero(depth, src, dst):
  {==}

def Laws.layer_full(depth, src, dst):
  {==}

def Laws.disk_zero_radius(depth, size, cx, cy, color, opacity, image):
  {==}

def Laws.disk_zero_opacity_unit_radius(depth, size, cx, cy, color, image):
  {==}

def Laws.rounded_reversed(depth, size, radius, color, opacity, image):
  {==}

def Laws.disk_corner_coverage(color, background):
  {==}

def Laws.rounded_corner_coverage(color, background):
  {==}

def Laws.layer_partition_one(a, b, c, d, e, f, g, h):
  {==}

def Laws.ring_equal_four(depth, size, cx, cy, color, opacity, image):
  {==}

def Laws.alpha_zero(ink, image):
  {==}

def Laws.spatial_cell_absent(depth, size, p00, p10, p11, p01,
  extrude_x, extrude_y, style, image):
  {==}

def Laws.layer_partition_depth(depth, a, b, c, d, e, f, g, h):
  {==}

def Laws.transparent_stamp(target_depth, target_size, source_depth,
  source_size, left, top, image):
  {==}

def Laws.grain_zero(depth, size, q, palette, seed, grain_size, image):
  {==}

def Laws.grained_cell_absent(depth, size, p00, p10, p11, p01,
  extrude_x, extrude_y, style, palette, seed, grain_size, image):
  {==}

def Laws.pool_zero(levels, size, x, y, material):
  {==}

def Laws.affine_zero(depth, size, p00, p10, p01, palette,
  seed, texels, image):
  {==}

def Laws.affine_texels_zero(depth, size, p00, p10, p01, palette,
  seed, opacity, image):
  affine_texels_zero_case(U32.is_zero(opacity), depth, size,
    p00, p10, p01, palette, seed, opacity, image)

def Laws.affine_texture_zero(depth, size, p00, p10, p01,
  source_depth, source_size, source, image):
  {==}

def Laws.affine_texture_size_zero(depth, size, p00, p10, p01,
  source_depth, source, opacity, image):
  affine_texture_size_zero_case(U32.is_zero(opacity), depth, size,
    p00, p10, p01, source_depth, source, opacity, image)

def Laws.masked_zero_opacity(target_depth, target_size, source_depth,
  source_size, left, top, colors, mask, image):
  {==}

def Laws.masked_transparent(target_depth, target_size, source_depth,
  source_size, left, top, colors, opacity, image):
  masked_transparent_case(U32.is_zero(opacity), target_depth, target_size,
    source_depth, source_size, left, top, colors, opacity, image)
