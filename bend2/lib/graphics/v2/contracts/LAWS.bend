# DRAFT laws for graphics v2. Not frozen or accepted until owner review.
# General pixel coverage and runtime performance remain separate obligations.
import Base
import ../Color.bend as Color
import ../Layer.bend as Layer
import ../Shapes.bend as Shapes
import ../Rounded.bend as Rounded
import ../Ring.bend as Ring
import ../Alpha.bend as Alpha
import ../../Quad.bend as Quad
import ../RaisedFacet.bend as RaisedFacet
import ../Grain.bend as Grain
import ../Texture.bend as Texture
import ../AffineGrain.bend as AffineGrain
import ../AffineTexture.bend as AffineTexture
import ../MaskedStamp.bend as MaskedStamp
import ../Stamp.bend as Stamp

law color_zero:
  for +src: U32
  for +dst: U32
  {Color.over(src, dst, 0) == dst : U32}

law color_full:
  for +src: U32
  for +dst: U32
  {Color.over(src, dst, 255) == src : U32}

law layer_zero:
  for +depth: Nat
  for +src: Image
  for +dst: Image
  {Layer.over(depth, src, 0, dst) == dst : Image}

law layer_full:
  for +depth: Nat
  for +src: Image
  for +dst: Image
  {Layer.over(depth, src, 255, dst) == src : Image}

law disk_zero_radius:
  for +depth: Nat
  for +size: U32
  for +cx: Shapes.Coord
  for +cy: Shapes.Coord
  for +color: U32
  for +opacity: U32
  for +image: Image
  {Shapes.disk(depth, size, cx, cy, 0, color, opacity, image) == image : Image}

law disk_zero_opacity_unit_radius:
  for +depth: Nat
  for +size: U32
  for +cx: Shapes.Coord
  for +cy: Shapes.Coord
  for +color: U32
  for +image: Image
  {Shapes.disk(depth, size, cx, cy, 1, color, 0, image) == image : Image}

law rounded_reversed:
  for +depth: Nat
  for +size: U32
  for +radius: U32
  for +color: U32
  for +opacity: U32
  for +image: Image
  {Rounded.draw(depth, size, Shapes.Pos{10}, Shapes.Pos{2},
      Shapes.Pos{2}, Shapes.Pos{8}, radius, color, opacity, image) == image : Image}

law disk_corner_coverage:
  for +color: U32
  for +background: U32
  {Shapes.disk(0n, 1, Shapes.Pos{0}, Shapes.Pos{0}, 1,
      color, 255, Pix{background}) ==
    Pix{Color.over(color, background, 191)} : Image}

law rounded_corner_coverage:
  for +color: U32
  for +background: U32
  {Rounded.draw(1n, 2, Shapes.Pos{0}, Shapes.Pos{0},
      Shapes.Pos{2}, Shapes.Pos{2}, 1, color, 255, Pix{background}) ==
    Qua{Pix{Color.over(color, background, 191)},
      Pix{Color.over(color, background, 191)},
      Pix{Color.over(color, background, 191)},
      Pix{Color.over(color, background, 191)}} : Image}

law layer_partition_one:
  for +a: U32
  for +b: U32
  for +c: U32
  for +d: U32
  for +e: U32
  for +f: U32
  for +g: U32
  for +h: U32
  {Layer.over(1n, Qua{Pix{a}, Pix{b}, Pix{c}, Pix{d}}, 128,
      Qua{Pix{e}, Pix{f}, Pix{g}, Pix{h}}) ==
    Qua{Pix{Color.over(a, e, 128)}, Pix{Color.over(b, f, 128)},
      Pix{Color.over(c, g, 128)}, Pix{Color.over(d, h, 128)}} : Image}

law ring_equal_four:
  for +depth: Nat
  for +size: U32
  for +cx: Shapes.Coord
  for +cy: Shapes.Coord
  for +color: U32
  for +opacity: U32
  for +image: Image
  {Ring.draw(depth, size, cx, cy, 4, 4,
      color, opacity, image) == image : Image}

law alpha_zero:
  for +ink: U32
  for +image: Image
  {Alpha.apply(1n, Pix{0}, ink, image) == image : Image}

law spatial_cell_absent:
  for +depth: Nat
  for +size: U32
  for +p00: Quad.Point
  for +p10: Quad.Point
  for +p11: Quad.Point
  for +p01: Quad.Point
  for +extrude_x: F32
  for +extrude_y: F32
  for +style: RaisedFacet.Surface
  for +image: Image
  {RaisedFacet.draw_cell(False{}, depth, size, p00, p10, p11, p01,
      extrude_x, extrude_y, style, image) == image : Image}

# One constructor-level partition law at arbitrary depth. For opacity 128,
# each immutable child can be composited independently and then joined.
law layer_partition_depth:
  for +depth: Nat
  for +a: Image
  for +b: Image
  for +c: Image
  for +d: Image
  for +e: Image
  for +f: Image
  for +g: Image
  for +h: Image
  {Layer.over(1n+depth, Qua{a, b, c, d}, 128,
      Qua{e, f, g, h}) ==
    Qua{Layer.over(depth, a, 128, e), Layer.over(depth, b, 128, f),
      Layer.over(depth, c, 128, g), Layer.over(depth, d, 128, h)} : Image}

law transparent_stamp:
  for +target_depth: Nat
  for +target_size: U32
  for +source_depth: Nat
  for +source_size: U32
  for +left: Shapes.Coord
  for +top: Shapes.Coord
  for +image: Image
  {Stamp.draw(target_depth, target_size, source_depth, source_size,
      left, top, Pix{0}, 0, image) == image : Image}

# Endpoint proof, not a general F32 raster theorem.
law grain_zero:
  for +depth: Nat
  for +size: U32
  for +q: Quad.Shape
  for +palette: Grain.Palette
  for +seed: U32
  for +grain_size: U32
  for +image: Image
  {Grain.draw(depth, size, q, palette, seed, grain_size, 0, image) ==
    image : Image}

# Visibility is tested before any F32 or grain computation.
law grained_cell_absent:
  for +depth: Nat
  for +size: U32
  for +p00: Quad.Point
  for +p10: Quad.Point
  for +p11: Quad.Point
  for +p01: Quad.Point
  for +extrude_x: F32
  for +extrude_y: F32
  for +style: RaisedFacet.Surface
  for +palette: Grain.Palette
  for +seed: U32
  for +grain_size: U32
  for +image: Image
  {RaisedFacet.draw_cell_grained(False{}, depth, size,
      p00, p10, p11, p01, extrude_x, extrude_y, style,
      palette, seed, grain_size, image) == image : Image}

# Exact zero-fork endpoint only; general parallel/serial pixel equivalence
# remains independent finite evidence unless a full induction closes.
law pool_zero:
  for +levels: Nat
  for +size: U32
  for +x: U32
  for +y: U32
  for +material: Texture.Material
  {Texture.pool_top(0n, levels, size, x, y, material) ==
    Texture.serial_tree(levels, size, x, y, material) : Image}

# Opacity exits before geometry/UV arithmetic.
law affine_zero:
  for +depth: Nat
  for +size: U32
  for +p00: Quad.Point
  for +p10: Quad.Point
  for +p01: Quad.Point
  for +palette: Grain.Palette
  for +seed: U32
  for +texels: U32
  for +image: Image
  {AffineGrain.draw(depth, size, p00, p10, p01,
      palette, seed, texels, 0, image) == image : Image}

# An invalid zero texel count exits before geometry/UV arithmetic.
law affine_texels_zero:
  for +depth: Nat
  for +size: U32
  for +p00: Quad.Point
  for +p10: Quad.Point
  for +p01: Quad.Point
  for +palette: Grain.Palette
  for +seed: U32
  for +opacity: U32
  for +image: Image
  {AffineGrain.draw(depth, size, p00, p10, p01,
      palette, seed, 0, opacity, image) == image : Image}

# Opaque source contents are irrelevant to an exact zero-opacity return.
law affine_texture_zero:
  for +depth: Nat
  for +size: U32
  for +p00: Quad.Point
  for +p10: Quad.Point
  for +p01: Quad.Point
  for +source_depth: Nat
  for +source_size: U32
  for +source: Image
  for +image: Image
  {AffineTexture.draw(depth, size, p00, p10, p01,
      source_depth, source_size, source, 0, image) == image : Image}

# Zero source size exits even with symbolic opacity.
law affine_texture_size_zero:
  for +depth: Nat
  for +size: U32
  for +p00: Quad.Point
  for +p10: Quad.Point
  for +p01: Quad.Point
  for +source_depth: Nat
  for +source: Image
  for +opacity: U32
  for +image: Image
  {AffineTexture.draw(depth, size, p00, p10, p01,
      source_depth, 0, source, opacity, image) == image : Image}

law masked_zero_opacity:
  for +target_depth: Nat
  for +target_size: U32
  for +source_depth: Nat
  for +source_size: U32
  for +left: Shapes.Coord
  for +top: Shapes.Coord
  for +colors: Image
  for +mask: Image
  for +image: Image
  {MaskedStamp.draw(target_depth, target_size, source_depth,
      source_size, left, top, colors, mask, 0, image) == image : Image}

law masked_transparent:
  for +target_depth: Nat
  for +target_size: U32
  for +source_depth: Nat
  for +source_size: U32
  for +left: Shapes.Coord
  for +top: Shapes.Coord
  for +colors: Image
  for +opacity: U32
  for +image: Image
  {MaskedStamp.draw(target_depth, target_size, source_depth,
      source_size, left, top, colors, Pix{0}, opacity, image) == image : Image}
