# Reusable independent raised tile field with presence mask and void material.
# Three cell Images are built once, then reused across a balanced 8x8 tree.
import Base
import ../graphics/Canvas.bend as Canvas
import ./Board.bend as Board
import ../graphics/v2/Gradient.bend as Gradient
import ../graphics/v2/Layer.bend as Layer
import ../graphics/v2/Ring.bend as Ring
import ../graphics/v2/Shapes.bend as Shapes
import ../graphics/v2/Texture.bend as Texture

type Palette is Data:
  Palette{light_top: U32, light_bottom: U32,
    dark_top: U32, dark_bottom: U32,
    rim: U32, shadow: U32, void_top: U32, void_bottom: U32,
    void_glow: U32, grain: U32, seed: U32}

type Tiles is Data:
  Tiles{light: Image, dark: Image, absent: Image}

def raised_detail(+depth: Nat, +size: U32, +top: U32, +bottom: U32,
  +rim: U32, +shadow: U32, +grain: U32, +seed: U32) -> Image:
  +base = Gradient.vertical(depth, size, U32.max(1, U32.div(size, 16)),
    0, size, top, bottom)
  +flecks = Texture.coarse(size, Texture.Grain{bottom, rim, grain, seed})
  +material = Layer.over(depth, flecks, 29, base)
  +floor = Canvas.rect_at(depth, 0, U32.sub(size, 8), size, 8, shadow, material)
  +right = Canvas.rect_at(depth, U32.sub(size, 6), 0, 6, size, shadow, floor)
  +left = Canvas.rect_at(depth, 0, 0, 3, size, shadow, right)
  +top_edge = Canvas.rect_at(depth, 0, 0, size, 3, rim, left)
  +inset = Canvas.rect_at(depth, 3, 3, 1, U32.sub(size, 13), rim, top_edge)
  Canvas.rect_at(depth, 4, U32.sub(size, 9), U32.sub(size, 11), 2,
    bottom, inset)

def raised_case(small: Bool, depth: Nat, size: U32, top: U32, bottom: U32,
  rim: U32, shadow: U32, grain: U32, seed: U32) -> Image:
  match small:
    case True{}: Pix{top}
    case False{}: raised_detail(depth, size, top, bottom, rim, shadow, grain, seed)

def raised(depth: Nat, +size: U32, top: U32, bottom: U32,
  rim: U32, shadow: U32, grain: U32, seed: U32) -> Image:
  raised_case(U32.is_lt(size, 16), depth, size, top, bottom, rim, shadow, grain, seed)

def void_detail(+depth: Nat, +size: U32, +top: U32, +bottom: U32,
  +glow: U32) -> Image:
  +dark = Gradient.vertical(depth, size, U32.max(1, U32.div(size, 8)),
    0, size, top, bottom)
  +rim = Ring.draw(depth, size, Shapes.Pos{U32.div(size, 2)},
    Shapes.Pos{U32.div(size, 2)}, U32.div(size, 3),
    U32.add(U32.div(size, 3), 2), glow, 110, dark)
  +depth_mark = Shapes.disk(depth, size, Shapes.Pos{U32.div(size, 2)},
    Shapes.Pos{U32.div(size, 2)}, U32.max(1, U32.div(size, 9)),
    glow, 32, rim)
  +top_edge = Canvas.rect_at(depth, 0, 0, size, 1, glow, depth_mark)
  Canvas.rect_at(depth, 0, 0, 1, size, glow, top_edge)

def void_case(small: Bool, depth: Nat, size: U32, top: U32, bottom: U32,
  glow: U32) -> Image:
  match small:
    case True{}: Pix{bottom}
    case False{}: void_detail(depth, size, top, bottom, glow)

def void_tile(depth: Nat, +size: U32, top: U32, bottom: U32,
  glow: U32) -> Image:
  void_case(U32.is_lt(size, 16), depth, size, top, bottom, glow)

def tiles(+depth: Nat, +size: U32, palette: Palette) -> Tiles:
  match palette:
    case Palette{+lt, +lb, +dt, +db, +rim, +shadow, +vt, +vb, +glow, +grain, +seed}:
      light dark absent = raised(depth, size, lt, lb, rim, shadow, grain, seed)
        raised(depth, size, dt, db, rim, shadow, grain, U32.add(seed, 1))
        void_tile(depth, size, vt, vb, glow)
      Tiles{light, dark, absent}

def choose(visible: Bool, even: Bool, tiles: Tiles) -> Image:
  match visible even tiles:
    case False{} _ Tiles{light, dark, absent}: absent
    case True{} True{} Tiles{light, dark, absent}: light
    case True{} False{} Tiles{light, dark, absent}: dark

def tree(+levels: Nat, +cell: U32, +x: U32, +y: U32,
  +mask: Board.Mask, +tiles: Tiles) -> Image:
  match levels:
    case 0n:
      +column = U32.div(x, cell)
      +row = U32.div(y, cell)
      choose(Board.present(mask, U32.add(column, U32.mul(row, 8))),
        U32.is_zero(U32.mod(U32.add(column, row), 2)), tiles)
    case 1n+rest:
      +half = U32.mul(cell, U32.shln(1, Nat.sub(levels, 1n)))
      +xx = U32.add(x, half)
      +yy = U32.add(y, half)
      a b c d = tree(rest, cell, x, y, mask, tiles)
        tree(rest, cell, xx, y, mask, tiles)
        tree(rest, cell, x, yy, mask, tiles)
        tree(rest, cell, xx, yy, mask, tiles)
      Qua{a, b, c, d}

def make(+depth: Nat, +size: U32, +mask: Board.Mask,
  palette: Palette) -> Image:
  +cell = U32.div(size, 8)
  +built = tiles(Nat.sub(depth, 3n), cell, palette)
  tree(3n, cell, 0, 0, mask, built)
