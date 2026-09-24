# Warm stone-court specimen using the same reusable pure v2 primitives.
# Chess-like token art comes from the neighboring example; no game state/API.
import Base
import ../../graphics/Canvas.bend as Canvas
import ../../graphics/Quad.bend as Quad
import ../Board.bend as Board
import ../../graphics/v2/Facet.bend as Facet
import ../../graphics/v2/Gradient.bend as Gradient
import ../../graphics/v2/Ring.bend as Ring
import ../../graphics/v2/Rounded.bend as Rounded
import ../../graphics/v2/Shapes.bend as Shapes
import ../TileSurface.bend as TileSurface
import ../../graphics/v2/Widgets.bend as Widgets
import ./Showcase.bend as Tokens

def s(+size: U32, +value: U32) -> U32:
  U32.mul(U32.div(size, 1024), value)

def point(+size: U32, +x: U32, +y: U32) -> Quad.Point:
  Quad.Point{U32.to_f32(s(size, x)), U32.to_f32(s(size, y))}

def ambient(+depth: Nat, +size: U32) -> Image:
  +ground = Gradient.vertical(depth, size, s(size, 16), 0, size,
    2367004, 4995118)
  +sun = Shapes.disk(depth, size, Shapes.Neg{s(size, 110)},
    Shapes.Pos{s(size, 130)}, s(size, 370), 15059089, 32, ground)
  +pool = Shapes.disk(depth, size, Shapes.Pos{s(size, 930)},
    Shapes.Pos{s(size, 1030)}, s(size, 370), 12812629, 24, sun)
  +arc = Ring.draw(depth, size, Shapes.Pos{s(size, 512)}, Shapes.Pos{s(size, 512)},
    s(size, 338), s(size, 356), 9398344, 142, pool)
  +inner = Ring.draw(depth, size, Shapes.Pos{s(size, 512)}, Shapes.Pos{s(size, 512)},
    s(size, 353), s(size, 357), 15059089, 112, arc)
  Ring.draw(depth, size, Shapes.Pos{s(size, 512)}, Shapes.Pos{s(size, 512)},
    s(size, 418), s(size, 421), 16771261, 88, inner)

def colonnade(+depth: Nat, +size: U32, image: Image) -> Image:
  +header = Facet.draw(depth, size,
    Quad.make(point(size, 252, 164), point(size, 772, 164),
      point(size, 807, 205), point(size, 217, 205)),
    5850931, 235, image)
  +lintel = Facet.draw(depth, size,
    Quad.make(point(size, 217, 205), point(size, 807, 205),
      point(size, 803, 214), point(size, 221, 214)),
    15059089, 175, header)
  +left = Facet.draw(depth, size,
    Quad.make(point(size, 193, 216), point(size, 226, 216),
      point(size, 226, 812), point(size, 186, 812)),
    5850931, 165, lintel)
  +right = Facet.draw(depth, size,
    Quad.make(point(size, 798, 216), point(size, 831, 216),
      point(size, 838, 812), point(size, 798, 812)),
    2827294, 165, left)
  +lamp_l = Shapes.disk(depth, size, Shapes.Pos{s(size, 285)},
    Shapes.Pos{s(size, 187)}, s(size, 6), 16771261, 235, right)
  +lamp_c = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 187)}, s(size, 8), 16771261, 240, lamp_l)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 739)},
    Shapes.Pos{s(size, 187)}, s(size, 6), 16771261, 235, lamp_c)

def heading(+depth: Nat, +size: U32, image: Image) -> Image:
  +brand = Widgets.label(depth, "R / C", s(size, 32), s(size, 26),
    s(size, 4), 16771261, 2827294, image)
  +title = Widgets.label(depth, "THE STONE COURT", s(size, 214), s(size, 37),
    s(size, 3), 16312774, 2827294, brand)
  +rule = Widgets.rule(depth, s(size, 32), s(size, 101), s(size, 960),
    15059089, title)
  +chapter = Widgets.label(depth, "RIFT CHESS  /  CHRONICLE 04", s(size, 32),
    s(size, 119), s(size, 2), 14333048, 2827294, rule)
  Widgets.chip(depth, size, "LOCAL DUEL", s(size, 799), s(size, 27),
    s(size, 188), s(size, 46), s(size, 2), 3877153, 9398344, 16312774, chapter)

def left_rail(+depth: Nat, +size: U32, image: Image) -> Image:
  +panel = Widgets.panel(depth, size, s(size, 24), s(size, 217),
    s(size, 188), s(size, 412), s(size, 17), 3351325, 9398344, image)
  +tag = Widgets.label(depth, "PLAYER 01", s(size, 42), s(size, 240),
    s(size, 2), 14333048, 2827294, panel)
  +name = Widgets.label(depth, "IVORY", s(size, 42), s(size, 285),
    s(size, 3), 16312774, 2827294, tag)
  +time = Widgets.label(depth, "09:17", s(size, 42), s(size, 330),
    s(size, 3), 15059089, 2827294, name)
  +rule = Widgets.rule(depth, s(size, 42), s(size, 381), s(size, 150),
    15059089, time)
  +label = Widgets.label(depth, "RIFT CHARGE", s(size, 42), s(size, 409),
    s(size, 2), 14333048, 2827294, rule)
  +track = Rounded.draw(depth, size, Shapes.Pos{s(size, 42)}, Shapes.Pos{s(size, 447)},
    Shapes.Pos{s(size, 193)}, Shapes.Pos{s(size, 462)}, s(size, 7), 2827294, 255, label)
  +fill = Rounded.draw(depth, size, Shapes.Pos{s(size, 42)}, Shapes.Pos{s(size, 447)},
    Shapes.Pos{s(size, 151)}, Shapes.Pos{s(size, 462)}, s(size, 7), 15059089, 255, track)
  Widgets.label(depth, "72 / 100\n\nCHOOSE PATH", s(size, 42), s(size, 481),
    s(size, 2), 16312774, 2827294, fill)

def right_rail(+depth: Nat, +size: U32, image: Image) -> Image:
  +panel = Widgets.panel(depth, size, s(size, 812), s(size, 217),
    s(size, 188), s(size, 412), s(size, 17), 3351325, 9398344, image)
  +tag = Widgets.label(depth, "THE SEAM", s(size, 832), s(size, 240),
    s(size, 2), 14333048, 2827294, panel)
  +name = Widgets.label(depth, "E4  /  F4", s(size, 832), s(size, 284),
    s(size, 3), 16312774, 2827294, tag)
  +rule = Widgets.rule(depth, s(size, 832), s(size, 350), s(size, 146),
    15059089, name)
  +label = Widgets.label(depth, "LAST ACTIONS", s(size, 832), s(size, 382),
    s(size, 2), 14333048, 2827294, rule)
  +moves = Widgets.label(depth, "12. Nf3  d5\n13. c4   e6\n14. Qb3  ...", s(size, 832),
    s(size, 419), s(size, 2), 16312774, 2827294, label)
  Widgets.chip(depth, size, "RIFT ACTIVE", s(size, 832), s(size, 552),
    s(size, 146), s(size, 44), s(size, 2), 5850931, 15059089, 16771261, moves)

def slab(+depth: Nat, +size: U32, image: Image) -> Image:
  +shadow = Rounded.draw(depth, size, Shapes.Pos{s(size, 218)},
    Shapes.Pos{s(size, 249)}, Shapes.Pos{s(size, 806)},
    Shapes.Pos{s(size, 819)}, s(size, 23), 658194, 220, image)
  +left = Facet.draw(depth, size,
    Quad.make(point(size, 232, 232), point(size, 232, 770),
      point(size, 220, 814), point(size, 220, 250)),
    9398344, 255, shadow)
  +right = Facet.draw(depth, size,
    Quad.make(point(size, 792, 232), point(size, 804, 250),
      point(size, 804, 814), point(size, 792, 770)),
    2827294, 255, left)
  Facet.draw(depth, size,
    Quad.make(point(size, 232, 770), point(size, 792, 770),
      point(size, 804, 814), point(size, 220, 814)),
    6967356, 255, right)

def portal(+depth: Nat, +size: U32, image: Image) -> Image:
  +aura = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 75), 12812629, 93, image)
  +bronze = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 72), s(size, 78), 15059089, 245, aura)
  +ivory = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 56), s(size, 60), 16771261, 190, bronze)
  +shaft = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 50), 658194, 223, ivory)
  +inner = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 27), s(size, 30), 12812629, 182, shaft)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 9), 16771261, 170, inner)

def pieces(+depth: Nat, +size: U32, image: Image) -> Image:
  +a = Tokens.tower(depth, size, 288, 288, 12812629, 2827294, image)
  +b = Tokens.spire(depth, size, 416, 288, 12812629, 2827294, a)
  +c = Tokens.regent(depth, size, 608, 288, 15059089, 2827294, b)
  +d = Tokens.tower(depth, size, 736, 288, 12812629, 2827294, c)
  +e = Tokens.piece(depth, size, 352, 352, 12812629, 2827294, d)
  +f = Tokens.piece(depth, size, 480, 352, 12812629, 2827294, e)
  +g = Tokens.piece(depth, size, 608, 352, 12812629, 2827294, f)
  +h = Tokens.tower(depth, size, 288, 736, 16312774, 8415310, g)
  +i = Tokens.spire(depth, size, 416, 736, 16312774, 8415310, h)
  +j = Tokens.regent(depth, size, 480, 672, 16771261, 9398344, i)
  +k = Tokens.piece(depth, size, 608, 672, 16312774, 8415310, j)
  +l = Tokens.tower(depth, size, 736, 736, 16312774, 8415310, k)
  +m = Tokens.piece(depth, size, 288, 672, 16312774, 8415310, l)
  Tokens.piece(depth, size, 672, 608, 16312774, 8415310, m)

def board(+depth: Nat, +size: U32, image: Image) -> Image:
  +base = slab(depth, size, image)
  +frame = Widgets.panel(depth, size, s(size, 232), s(size, 232),
    s(size, 560), s(size, 560), s(size, 19), 2827294, 9398344, base)
  +tiles = TileSurface.make(Nat.sub(depth, 1n), U32.div(size, 2),
    Board.Mask{3892264959, 4294934500},
    TileSurface.Palette{12955014, 11770486, 8415310, 5850931,
      16771261, 3155749, 1445396, 658194, 12812629, 92, 777})
  +embedded = Canvas.embed_at(depth, tiles, Nat.sub(depth, 1n),
    U32.div(size, 4), U32.div(size, 4), frame)
  +well = portal(depth, size, embedded)
  +selected = Ring.draw(depth, size, Shapes.Pos{s(size, 480)},
    Shapes.Pos{s(size, 672)}, s(size, 29), s(size, 32), 16771261, 230, well)
  +capture = Ring.draw(depth, size, Shapes.Pos{s(size, 608)},
    Shapes.Pos{s(size, 352)}, s(size, 28), s(size, 31), 15059089, 218, selected)
  pieces(depth, size, capture)

def footer(+depth: Nat, +size: U32, image: Image) -> Image:
  +rule = Widgets.rule(depth, s(size, 32), s(size, 824), s(size, 960),
    15059089, image)
  +title = Widgets.label(depth, "COURT OF ECHOES", s(size, 38), s(size, 855),
    s(size, 3), 16312774, 2827294, rule)
  +sub = Widgets.label(depth, "Carved stone / open rift / an unfinished gambit",
    s(size, 38), s(size, 904), s(size, 2), 14333048, 2827294, title)
  +undo = Widgets.chip(depth, size, "UNDO", s(size, 782), s(size, 853),
    s(size, 96), s(size, 46), s(size, 2), 3877153, 9398344, 16312774, sub)
  Widgets.chip(depth, size, "MENU", s(size, 888), s(size, 853),
    s(size, 100), s(size, 46), s(size, 2), 5850931, 15059089, 16771261, undo)

def screen(+depth: Nat, +size: U32) -> Image:
  +a = ambient(depth, size)
  +b = colonnade(depth, size, a)
  +c = heading(depth, size, b)
  +d = left_rail(depth, size, c)
  +e = right_rail(depth, size, d)
  +f = board(depth, size, e)
  footer(depth, size, f)
