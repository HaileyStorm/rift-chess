# Graphics laws for the first Bend renderer slice.
#
# These claims cover only immutable image-tree sampling and the fixed 512 by
# 512 rectangle operation.  They do not claim that a Canvas, native window,
# color channel conversion, or a general polygon rasterizer is correct.
import Base
import ./Pixel.bend as G

# A uniform pixel has the same color at every path.  The five laws are the
# exhaustive Nil/head cases of a path, so they avoid hiding case analysis in a
# proposition that the checker cannot reduce directly.
law pix_empty:
  for +color: U32
  {G.sample_path(Nil{}, Pix{color}) == color : U32}

law pix_nw:
  for +path: List<&2, G.Quadrant>
  for +color: U32
  {G.sample_path(G.NorthWest{} <> path, Pix{color}) == color : U32}

law pix_ne:
  for +path: List<&2, G.Quadrant>
  for +color: U32
  {G.sample_path(G.NorthEast{} <> path, Pix{color}) == color : U32}

law pix_sw:
  for +path: List<&2, G.Quadrant>
  for +color: U32
  {G.sample_path(G.SouthWest{} <> path, Pix{color}) == color : U32}

law pix_se:
  for +path: List<&2, G.Quadrant>
  for +color: U32
  {G.sample_path(G.SouthEast{} <> path, Pix{color}) == color : U32}

# The first path step chooses the matching child of a four-way image node.
law nw_head:
  for +path: List<&2, G.Quadrant>
  for +tl: Image
  for +tr: Image
  for +bl: Image
  for +br: Image
  {G.sample_path(G.NorthWest{} <> path, Qua{tl, tr, bl, br})
    == G.sample_path(path, tl) : U32}

law ne_head:
  for +path: List<&2, G.Quadrant>
  for +tl: Image
  for +tr: Image
  for +bl: Image
  for +br: Image
  {G.sample_path(G.NorthEast{} <> path, Qua{tl, tr, bl, br})
    == G.sample_path(path, tr) : U32}

law sw_head:
  for +path: List<&2, G.Quadrant>
  for +tl: Image
  for +tr: Image
  for +bl: Image
  for +br: Image
  {G.sample_path(G.SouthWest{} <> path, Qua{tl, tr, bl, br})
    == G.sample_path(path, bl) : U32}

law se_head:
  for +path: List<&2, G.Quadrant>
  for +tl: Image
  for +tr: Image
  for +bl: Image
  for +br: Image
  {G.sample_path(G.SouthEast{} <> path, Qua{tl, tr, bl, br})
    == G.sample_path(path, br) : U32}

# A rectangle with no intersection with the fixed 512-square root is inert.
law outside_root_unchanged:
  for +rect: G.Rect
  for +color: U32
  for +image: Image
  for outside: {True{} == G.rect_outside_root(rect) : Bool}
  {G.fill_rect(rect, color, image) == image : Image}

# A rectangle whose width or height is zero is inert, even when its edge is in
# the root.  The operation uses half-open [left,right) and [top,bottom) edges.
law empty_rect_unchanged:
  for +rect: G.Rect
  for +color: U32
  for +image: Image
  for empty: {True{} == G.rect_empty(rect) : Bool}
  {G.fill_rect(rect, color, image) == image : Image}
