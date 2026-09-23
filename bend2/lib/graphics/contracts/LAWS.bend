# Narrow contracts for the reusable Canvas and Font layer.
# These claims cover inert/empty operations only; they do not assert complete
# raster coverage, glyph aesthetics, or host/browser/native presentation.
import Base
import ../Canvas.bend as Canvas
import ../Font.bend as Font

law draw_empty:
  for +depth: Nat
  for +x: U32
  for +y: U32
  for +scale: U32
  for +color: U32
  for +image: Image
  {Font.draw_at(depth, "", x, y, scale, color, image) == image : Image}

law width_empty:
  for +scale: U32
  {Font.width("", scale) == 0 : U32}

law rect_zero_width:
  for +depth: Nat
  for +x: U32
  for +y: U32
  for +height: U32
  for +color: U32
  for +image: Image
  {Canvas.rect_at(depth, x, y, 0, height, color, image) == image : Image}

law source_subtree_uses_source_depth:
  for +a: Image
  for +b: Image
  for +c: Image
  for +d: Image
  for +e: Image
  for +f: Image
  for +g: Image
  {Canvas.source_subtree(2n, 9n, 128, 0,
      Qua{Qua{a, b, c, d}, e, f, g}) == b : Image}

law embed_identity:
  for +source: Image
  for +target: Image
  {Canvas.embed_at(10n, source, 10n, 0, 0, target) == source : Image}
