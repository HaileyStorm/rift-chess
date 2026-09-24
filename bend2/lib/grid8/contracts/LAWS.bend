# DRAFT grid8 laws relocated without weakening the original meanings.
# General pixel, F32 and native/GPU evidence remain independent obligations.
import Base
import ../Board.bend as Board
import ../TileSurface.bend as TileSurface
import ../SpatialBoard.bend as SpatialBoard
import ../SpatialFast.bend as SpatialFast
import ../../graphics/v2/RaisedFacet.bend as RaisedFacet

law masked_none:
  for +depth: Nat
  for +size: U32
  for +light: U32
  for +dark: U32
  for +image: Image
  {Board.paint_masked(depth, size, Board.Mask{0, 0}, light, dark, image) == image : Image}

law tile_absent:
  for +light: Image
  for +dark: Image
  for +absent: Image
  {TileSurface.choose(False{}, True{},
      TileSurface.Tiles{light, dark, absent}) == absent : Image}

law tile_even:
  for +light: Image
  for +dark: Image
  for +absent: Image
  {TileSurface.choose(True{}, True{},
      TileSurface.Tiles{light, dark, absent}) == light : Image}

law tile_odd:
  for +light: Image
  for +dark: Image
  for +absent: Image
  {TileSurface.choose(True{}, False{},
      TileSurface.Tiles{light, dark, absent}) == dark : Image}

law spatial_empty:
  for +depth: Nat
  for +size: U32
  for +projection: SpatialBoard.Projection
  for +palette: SpatialBoard.Palette
  for +image: Image
  {SpatialBoard.draw(depth, size, projection,
      Board.Mask{0, 0}, palette, image) == image : Image}

law spatial_lit_empty:
  for +depth: Nat
  for +size: U32
  for +projection: SpatialBoard.Projection
  for +palette: SpatialBoard.Palette
  for +light: SpatialBoard.Light
  for +image: Image
  {SpatialBoard.draw_lit(depth, size, projection,
      Board.Mask{0, 0}, palette, light, image) == image : Image}

law spatial_illuminate_zero:
  for +style: RaisedFacet.Surface
  for +ink: U32
  for +file: U32
  for +rank: U32
  for +origin_file: U32
  for +origin_rank: U32
  {SpatialBoard.illuminate(style,
      SpatialBoard.Light{ink, 0, origin_file, origin_rank}, file, rank)
    == style : RaisedFacet.Surface}

law spatial_fast_empty:
  for +depth: Nat
  for +size: U32
  for +affine: SpatialFast.Affine
  for +palette: SpatialBoard.Palette
  for +image: Image
  {SpatialFast.draw(depth, size, affine, Board.Mask{0, 0},
      palette, image) == image : Image}
