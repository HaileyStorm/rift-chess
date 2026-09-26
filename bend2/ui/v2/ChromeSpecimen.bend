# Deterministic render specimen for the pure chrome module. The board is a
# board-only projected quadtree; it never includes chrome or a host element.
import Base
import ../../lib/grid8/Board.bend as Board
import ../../lib/graphics/v2/Gradient.bend as Gradient
import ../../lib/graphics/v2/Ring.bend as Ring
import ../../lib/graphics/v2/Shapes.bend as Shapes
import ../../lib/grid8/SpatialBoard.bend as SpatialBoard

def px(+size: U32, +value: U32) -> U32:
  U32.div(U32.mul(size, value), 1024)

def dark(+theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 2827294, 263431)

def deep(+theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 5850931, 1124151)

def palette(theme: U32) -> SpatialBoard.Palette:
  Bool.pick(SpatialBoard.Palette, U32.is_eq(theme, 1),
    SpatialBoard.Palette{12955014, 11770486, 8415310, 5850931,
      16771261, 658194, 15059089},
    SpatialBoard.Palette{3821396, 2244188, 1582124, 792617,
      7456455, 198419, 6608860})

def projection(+size: U32) -> SpatialBoard.Projection:
  SpatialBoard.Projection{px(size, 34), px(size, 210), px(size, 55),
    px(size, 10), px(size, 10), px(size, 46), px(size, 12)}

def selected_x(+size: U32, +file: U32, +rank: U32) -> U32:
  U32.add(px(size, 34), U32.add(U32.mul(file, px(size, 55)),
    U32.add(U32.mul(rank, px(size, 10)),
      U32.add(px(size, 32), px(size, 5)))))

def selected_y(+size: U32, +file: U32, +rank: U32) -> U32:
  U32.sub(U32.add(px(size, 210), U32.add(U32.mul(rank, px(size, 46)), px(size, 23))),
    U32.add(U32.mul(file, px(size, 10)), px(size, 5)))

def piece(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +body: U32, +highlight: U32, image: Image) -> Image:
  +shadow = Shapes.disk(depth, size, Shapes.Pos{x}, Shapes.Pos{U32.add(y, px(size, 13))},
    px(size, 13), 198419, 170, image)
  +foot = Shapes.disk(depth, size, Shapes.Pos{x}, Shapes.Pos{y},
    px(size, 13), body, 255, shadow)
  +crown = Shapes.disk(depth, size, Shapes.Pos{x}, Shapes.Pos{U32.sub(y, px(size, 9))},
    px(size, 8), highlight, 255, foot)
  Shapes.disk(depth, size, Shapes.Pos{x}, Shapes.Pos{U32.sub(y, px(size, 18))},
    px(size, 4), body, 255, crown)

def marker_x(+size: U32, +selected: U32, +tile: U32) -> U32:
  +piece_x = selected_x(size, U32.mod(selected, 8), U32.div(selected, 8))
  +file = U32.mul(U32.mod(tile, 4), 2)
  +rank = U32.mul(U32.div(tile, 4), 2)
  +tile_x = U32.add(px(size, 34), U32.add(U32.mul(file, px(size, 55)),
    U32.add(U32.mul(rank, px(size, 10)),
      U32.add(px(size, 55), px(size, 10)))))
  +focused_x = Bool.pick(U32, U32.is_lt(selected, 64), piece_x, tile_x)
  Bool.pick(U32, Bool.or(U32.is_lt(selected, 64), U32.is_lt(tile, 16)), focused_x, 0)

def marker_y(+size: U32, +selected: U32, +tile: U32) -> U32:
  +piece_y = selected_y(size, U32.mod(selected, 8), U32.div(selected, 8))
  +file = U32.mul(U32.mod(tile, 4), 2)
  +rank = U32.mul(U32.div(tile, 4), 2)
  +tile_y = U32.sub(U32.add(px(size, 210), U32.add(U32.mul(rank, px(size, 46)),
    px(size, 46))), U32.add(U32.mul(file, px(size, 10)), px(size, 10)))
  +focused_y = Bool.pick(U32, U32.is_lt(selected, 64), piece_y, tile_y)
  Bool.pick(U32, Bool.or(U32.is_lt(selected, 64), U32.is_lt(tile, 16)), focused_y, 0)

def marker(visible: Bool, +depth: Nat, +size: U32, +x: U32, +y: U32,
  +focused: Bool, +image: Image) -> Image:
  match visible:
    case False{}: image
    case True{}:
      +color = Bool.pick(U32, focused, 15911055, 6608860)
      +aura = Ring.draw(depth, size, Shapes.Pos{x}, Shapes.Pos{y},
        px(size, Bool.pick(U32, focused, 24, 37)),
        px(size, Bool.pick(U32, focused, 30, 43)), color, 238, image)
      piece(depth, size, x, y,
        Bool.pick(U32, focused, 16312774, 3821396),
        Bool.pick(U32, focused, 15911055, 6608860), aura)

def board(+depth: Nat, +size: U32, +theme: U32,
  +selected: U32, +tile: U32) -> Image:
  +surface = Gradient.vertical(depth, size, U32.max(1, U32.div(size, 32)),
    0, size, dark(theme), deep(theme))
  +orb = Ring.draw(depth, size, Shapes.Pos{px(size, 256)},
    Shapes.Pos{px(size, 276)}, px(size, 200), px(size, 205),
    Bool.pick(U32, U32.is_eq(theme, 1), 15059089, 6608860), 70, surface)
  +field = SpatialBoard.draw(depth, size, projection(size),
    Board.Mask{3892264959, 4294934500}, palette(theme), orb)
  +back_piece = piece(depth, size, px(size, 188), px(size, 262),
    16312774, 15059089, field)
  +side_piece = piece(depth, size, px(size, 356), px(size, 372),
    8415310, 6608860, back_piece)
  +focused = U32.is_lt(selected, 64)
  +mark_x = marker_x(size, selected, tile)
  +mark_y = marker_y(size, selected, tile)
  +visible = Bool.or(U32.is_lt(selected, 64), U32.is_lt(tile, 16))
  marker(visible, depth, size, mark_x, mark_y, focused, side_piece)
