# PROPOSED DRAFT extension signatures. NOT checked in this portable review.
# English meaning and explicit evidence limits: ../../DRAFT_CHANGE_PROPOSAL.md.
# These are additive; existing core and RGA1 laws/proofs remain byte-identical.
import Base
import ../../Color.bend as Color
import ../../Mask.bend as Mask
import ../../MaskedLayer.bend as MaskedLayer
import ../../Mip.bend as Mip
import ../../Glyph.bend as Glyph
import ../../Shapes.bend as Shapes
import ../../assets/RgbaImage.bend as Rgba

law mask_zero_depth:
  for +color: U32
  {Mask.prepare(0n, Pix{color}) == Pix{U32.shln(Color.red(color), 16n)} : Image}

law masked_layer_zero:
  for +depth: Nat
  for +colors: Image
  for +mask: Image
  for +image: Image
  {MaskedLayer.over(depth, colors, mask, 0, image) == image : Image}

law masked_layer_full:
  for +depth: Nat
  for +colors: Image
  for +image: Image
  {MaskedLayer.over(depth, colors, Pix{16711680}, 255, image) == colors : Image}

law mip_level_zero:
  for +depth: Nat
  for +size: U32
  for +colors: Image
  for +mask: Image
  {Mip.level(0n, depth, size, colors, mask) ==
    Mip.Level{depth, size, colors, mask} : Mip.Level}

law mip_half_zero:
  for +colors: Image
  for +mask: Image
  {Mip.half(0n, colors, mask) == Mip.Raster{colors, mask} : Mip.Raster}

law mip_hidden_blue:
  {Mip.half(1n,
    Qua{Pix{16711680}, Pix{255}, Pix{255}, Pix{255}},
    Qua{Pix{16711680}, Pix{0}, Pix{0}, Pix{0}}) ==
    Mip.Raster{Pix{16711680}, Pix{4194304}} : Mip.Raster}

law glyph_zero:
  for +depth: Nat
  for +size: U32
  for +x: Shapes.Coord
  for +y: Shapes.Coord
  for +glyph: Glyph.Mask
  for +ink: U32
  for +image: Image
  {Glyph.draw(depth, size, x, y, glyph, ink, 0, image) == image : Image}

law glyph_empty:
  for +depth: Nat
  for +size: U32
  for +ink: U32
  for +opacity: U32
  for +image: Image
  {Glyph.draw_run(Nil{}, depth, size, ink, opacity, image) == image : Image}

law rgba_empty:
  {Rgba.decode_bytes(Nil{}) == Rgba.Rejected{Rgba.BadLength{}} : Rgba.DecodeResult}

law rgba_hidden_rgb:
  {Rgba.decode_bytes([82, 71, 65, 50, 0, 255, 0, 0, 0]) ==
    Rgba.Decoded{0, Pix{16711680}, Pix{0}} : Rgba.DecodeResult}

law rgba_non_byte:
  {Rgba.decode_bytes([82, 71, 65, 50, 0, 255, 0, 0, 256]) ==
    Rgba.Rejected{Rgba.NonByte{}} : Rgba.DecodeResult}

law rgba_trailing:
  {Rgba.decode_bytes([82, 71, 65, 50, 0, 255, 0, 0, 128, 0]) ==
    Rgba.Rejected{Rgba.BadLength{}} : Rgba.DecodeResult}
