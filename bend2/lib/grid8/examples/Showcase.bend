# Bend-owned, chess-independent graphics specimen. Returns a full Image at any
# 1024/2048/4096 power-of-two tier. It imports no game model or browser API.
import Base
import ../../graphics/Canvas.bend as Canvas
import ../../graphics/Font.bend as Font
import ../../graphics/Quad.bend as Quad
import ../Board.bend as Board
import ../../graphics/v2/BlendRect.bend as BlendRect
import ../../graphics/v2/Facet.bend as Facet
import ../../graphics/v2/Gradient.bend as Gradient
import ../../graphics/v2/Ring.bend as Ring
import ../../graphics/v2/Rounded.bend as Rounded
import ../../graphics/v2/Shapes.bend as Shapes
import ../TileSurface.bend as TileSurface
import ../../graphics/v2/Widgets.bend as Widgets

def s(+size: U32, +value: U32) -> U32:
  U32.mul(U32.div(size, 1024), value)

def glow(+depth: Nat, +size: U32, image: Image) -> Image:
  +a = Shapes.disk(depth, size, Shapes.Neg{s(size, 70)}, Shapes.Pos{s(size, 290)},
    s(size, 310), 2973808, 28, image)
  +b = Shapes.disk(depth, size, Shapes.Pos{s(size, 920)}, Shapes.Neg{s(size, 35)},
    s(size, 330), 14263654, 18, a)
  +c = Shapes.disk(depth, size, Shapes.Pos{s(size, 1020)}, Shapes.Pos{s(size, 970)},
    s(size, 270), 4638419, 20, b)
  +orbit1 = Ring.draw(depth, size, Shapes.Pos{s(size, 512)}, Shapes.Pos{s(size, 512)},
    s(size, 341), s(size, 354), 3034210, 90, c)
  +orbit2 = Ring.draw(depth, size, Shapes.Pos{s(size, 512)}, Shapes.Pos{s(size, 512)},
    s(size, 352), s(size, 355), 6608860, 110, orbit1)
  +orbit3 = Ring.draw(depth, size, Shapes.Pos{s(size, 512)}, Shapes.Pos{s(size, 512)},
    s(size, 411), s(size, 425), 14263654, 42, orbit2)
  Ring.draw(depth, size, Shapes.Pos{s(size, 512)}, Shapes.Pos{s(size, 512)},
    s(size, 468), s(size, 469), 6608860, 38, orbit3)

def background(+depth: Nat, +size: U32) -> Image:
  +gradient = Gradient.vertical(depth, size, s(size, 16), 0, size,
    397340, 1451578)
  glow(depth, size, gradient)

def heading(+depth: Nat, +size: U32, image: Image) -> Image:
  +brand = Widgets.label(depth, "R / C", s(size, 32), s(size, 26), s(size, 4),
    16181716, 397340, image)
  +wordmark = Widgets.label(depth, "RIFT CHESS", s(size, 224), s(size, 36), s(size, 3),
    11189968, 397340, brand)
  +divider = Widgets.rule(depth, s(size, 32), s(size, 99), s(size, 960),
    4638419, wordmark)
  +edition = Widgets.label(depth, "TACTICAL ATLAS  /  02", s(size, 32), s(size, 116),
    s(size, 2), 7968935, 397340, divider)
  Widgets.chip(depth, size, "LIVE MATCH", s(size, 800), s(size, 28),
    s(size, 186), s(size, 44), s(size, 2), 1057074, 3034210, 6608860, edition)

def left_rail(+depth: Nat, +size: U32, image: Image) -> Image:
  +panel = Widgets.panel(depth, size, s(size, 24), s(size, 200), s(size, 188),
    s(size, 594), s(size, 18), 1057074, 2504780, image)
  +top = Widgets.label(depth, "01  /  TURN", s(size, 42), s(size, 226),
    s(size, 2), 7968935, 397340, panel)
  +white = Widgets.label(depth, "WHITE", s(size, 42), s(size, 268),
    s(size, 3), 16181716, 397340, top)
  +time = Widgets.label(depth, "08:42", s(size, 42), s(size, 310),
    s(size, 3), 4638419, 397340, white)
  +rule = Widgets.rule(depth, s(size, 42), s(size, 365), s(size, 150), 14263654, time)
  +signal = Widgets.label(depth, "RIFT ENERGY", s(size, 42), s(size, 394),
    s(size, 2), 11189968, 397340, rule)
  +bar = Rounded.draw(depth, size, Shapes.Pos{s(size, 42)}, Shapes.Pos{s(size, 431)},
    Shapes.Pos{s(size, 194)}, Shapes.Pos{s(size, 446)}, s(size, 7), 1780025, 255, signal)
  +charge = Rounded.draw(depth, size, Shapes.Pos{s(size, 42)}, Shapes.Pos{s(size, 431)},
    Shapes.Pos{s(size, 152)}, Shapes.Pos{s(size, 446)}, s(size, 7), 4638419, 255, bar)
  +meta = Widgets.label(depth, "72 / 100", s(size, 42), s(size, 462),
    s(size, 2), 6608860, 397340, charge)
  +rule2 = Widgets.rule(depth, s(size, 42), s(size, 515), s(size, 150), 4638419, meta)
  +hint = Widgets.label(depth, "SELECT PIECE\nSEE MOVES\nSHIFT TILES", s(size, 42),
    s(size, 550), s(size, 2), 7968935, 397340, rule2)
  Widgets.chip(depth, size, "OVERHEAD", s(size, 42), s(size, 704),
    s(size, 150), s(size, 46), s(size, 2), 1319736, 3361115, 16181716, hint)

def right_rail(+depth: Nat, +size: U32, image: Image) -> Image:
  +panel = Widgets.panel(depth, size, s(size, 812), s(size, 200), s(size, 188),
    s(size, 594), s(size, 18), 1057074, 2504780, image)
  +top = Widgets.label(depth, "02  /  FIELD", s(size, 832), s(size, 226),
    s(size, 2), 7968935, 397340, panel)
  +header = Widgets.label(depth, "OPEN RIFT", s(size, 832), s(size, 273),
    s(size, 2), 6608860, 397340, top)
  +coord = Widgets.label(depth, "E4  /  F4", s(size, 832), s(size, 310),
    s(size, 3), 16181716, 397340, header)
  +rule = Widgets.rule(depth, s(size, 832), s(size, 365), s(size, 146), 14263654, coord)
  +timeline = Widgets.label(depth, "LAST ACTIONS", s(size, 832), s(size, 394),
    s(size, 2), 7968935, 397340, rule)
  +moves = Widgets.label(depth, "12. Nf3   d5\n13. c4    e6\n14. Qb3  ...", s(size, 832),
    s(size, 430), s(size, 2), 12114386, 397340, timeline)
  +rule2 = Widgets.rule(depth, s(size, 832), s(size, 528), s(size, 146), 4638419, moves)
  +status = Widgets.label(depth, "THREAT MAP", s(size, 832), s(size, 560),
    s(size, 2), 7968935, 397340, rule2)
  +markers = Shapes.disk(depth, size, Shapes.Pos{s(size, 848)},
    Shapes.Pos{s(size, 631)}, s(size, 10), 14263654, 255, status)
  +markers2 = Shapes.disk(depth, size, Shapes.Pos{s(size, 880)},
    Shapes.Pos{s(size, 631)}, s(size, 10), 14263654, 255, markers)
  +markers3 = Shapes.disk(depth, size, Shapes.Pos{s(size, 912)},
    Shapes.Pos{s(size, 631)}, s(size, 10), 4638419, 255, markers2)
  Widgets.chip(depth, size, "SHIFT MODE", s(size, 832), s(size, 704),
    s(size, 148), s(size, 46), s(size, 2), 2706521, 2973808, 6608860, markers3)

def point(+size: U32, +x: U32, +y: U32) -> Quad.Point:
  Quad.Point{U32.to_f32(s(size, x)), U32.to_f32(s(size, y))}

def piece(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +outer: U32, +core: U32, image: Image) -> Image:
  +shadow = Shapes.disk(depth, size, Shapes.Pos{s(size, U32.add(x, 3))},
    Shapes.Pos{s(size, U32.add(y, 8))}, s(size, 25), 198419, 175, image)
  +base = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 22))}, Shapes.Pos{s(size, U32.add(y, 9))},
    Shapes.Pos{s(size, U32.add(x, 22))}, Shapes.Pos{s(size, U32.add(y, 20))},
    s(size, 5), core, 255, shadow)
  +base_light = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 20))}, Shapes.Pos{s(size, U32.add(y, 9))},
    Shapes.Pos{s(size, U32.add(x, 20))}, Shapes.Pos{s(size, U32.add(y, 15))},
    s(size, 3), outer, 255, base)
  +body = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 10))}, Shapes.Pos{s(size, U32.sub(y, 9))},
    Shapes.Pos{s(size, U32.add(x, 10))}, Shapes.Pos{s(size, U32.add(y, 12))},
    s(size, 7), outer, 255, base_light)
  +neck = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 12))}, Shapes.Pos{s(size, U32.sub(y, 10))},
    Shapes.Pos{s(size, U32.add(x, 12))}, Shapes.Pos{s(size, U32.sub(y, 5))},
    s(size, 2), core, 255, body)
  +head = Shapes.disk(depth, size, Shapes.Pos{s(size, x)},
    Shapes.Pos{s(size, U32.sub(y, 14))}, s(size, 11), outer, 255, neck)
  +facet = Shapes.disk(depth, size, Shapes.Pos{s(size, U32.sub(x, 3))},
    Shapes.Pos{s(size, U32.sub(y, 17))}, s(size, 4), 16181716, 100, head)
  Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 6))}, Shapes.Pos{s(size, U32.add(y, 2))},
    Shapes.Pos{s(size, U32.add(x, 6))}, Shapes.Pos{s(size, U32.add(y, 5))},
    s(size, 1), core, 180, facet)

def regent(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +outer: U32, +core: U32, image: Image) -> Image:
  +body = piece(depth, size, x, y, outer, core, image)
  +left = Shapes.disk(depth, size, Shapes.Pos{s(size, U32.sub(x, 13))},
    Shapes.Pos{s(size, U32.sub(y, 24))}, s(size, 5), outer, 255, body)
  +right = Shapes.disk(depth, size, Shapes.Pos{s(size, U32.add(x, 13))},
    Shapes.Pos{s(size, U32.sub(y, 24))}, s(size, 5), outer, 255, left)
  +crown = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 15))}, Shapes.Pos{s(size, U32.sub(y, 24))},
    Shapes.Pos{s(size, U32.add(x, 15))}, Shapes.Pos{s(size, U32.sub(y, 17))},
    s(size, 3), outer, 255, right)
  Shapes.disk(depth, size, Shapes.Pos{s(size, x)},
    Shapes.Pos{s(size, U32.sub(y, 27))}, s(size, 4), 16181716, 210, crown)

def tower(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +outer: U32, +core: U32, image: Image) -> Image:
  +shadow = Shapes.disk(depth, size, Shapes.Pos{s(size, U32.add(x, 3))},
    Shapes.Pos{s(size, U32.add(y, 8))}, s(size, 25), 198419, 175, image)
  +base = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 22))}, Shapes.Pos{s(size, U32.add(y, 9))},
    Shapes.Pos{s(size, U32.add(x, 22))}, Shapes.Pos{s(size, U32.add(y, 20))},
    s(size, 4), core, 255, shadow)
  +body = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 15))}, Shapes.Pos{s(size, U32.sub(y, 18))},
    Shapes.Pos{s(size, U32.add(x, 15))}, Shapes.Pos{s(size, U32.add(y, 13))},
    s(size, 2), outer, 255, base)
  +light = BlendRect.fill(depth, size, s(size, U32.sub(x, 13)),
    s(size, U32.sub(y, 16)), s(size, U32.sub(x, 10)),
    s(size, U32.add(y, 8)), 16181716, 92, body)
  +window = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 5))}, Shapes.Pos{s(size, U32.sub(y, 10))},
    Shapes.Pos{s(size, U32.add(x, 5))}, Shapes.Pos{s(size, U32.add(y, 5))},
    s(size, 4), core, 255, light)
  +crown = Canvas.rect_at(depth, s(size, U32.sub(x, 17)),
    s(size, U32.sub(y, 23)), s(size, 34), s(size, 7), outer, window)
  +left = Canvas.rect_at(depth, s(size, U32.sub(x, 17)),
    s(size, U32.sub(y, 28)), s(size, 8), s(size, 8), outer, crown)
  +middle = Canvas.rect_at(depth, s(size, U32.sub(x, 4)),
    s(size, U32.sub(y, 28)), s(size, 8), s(size, 8), outer, left)
  Canvas.rect_at(depth, s(size, U32.add(x, 9)),
    s(size, U32.sub(y, 28)), s(size, 8), s(size, 8), outer, middle)

def spire(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +outer: U32, +core: U32, image: Image) -> Image:
  +shadow = Shapes.disk(depth, size, Shapes.Pos{s(size, U32.add(x, 3))},
    Shapes.Pos{s(size, U32.add(y, 8))}, s(size, 25), 198419, 170, image)
  +base = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 21))}, Shapes.Pos{s(size, U32.add(y, 10))},
    Shapes.Pos{s(size, U32.add(x, 21))}, Shapes.Pos{s(size, U32.add(y, 19))},
    s(size, 4), outer, 255, shadow)
  +diamond = Facet.draw(depth, size,
    Quad.make(point(size, x, U32.sub(y, 29)), point(size, U32.add(x, 14), U32.sub(y, 5)),
      point(size, x, U32.add(y, 10)), point(size, U32.sub(x, 14), U32.sub(y, 5))),
    outer, 255, base)
  +shading = Facet.draw(depth, size,
    Quad.make(point(size, x, U32.sub(y, 29)), point(size, U32.add(x, 14), U32.sub(y, 5)),
      point(size, x, U32.add(y, 10)), point(size, x, U32.sub(y, 5))),
    core, 105, diamond)
  +inlay = Facet.draw(depth, size,
    Quad.make(point(size, x, U32.sub(y, 21)), point(size, U32.add(x, 7), U32.sub(y, 5)),
      point(size, x, U32.add(y, 5)), point(size, U32.sub(x, 7), U32.sub(y, 5))),
    core, 255, shading)
  Shapes.disk(depth, size, Shapes.Pos{s(size, x)},
    Shapes.Pos{s(size, U32.sub(y, 30))}, s(size, 4), 16181716, 190, inlay)

# A side-profile horse, authored entirely from reusable clipped facets,
# rounded material blocks and quarter-sample disks. Kept in example art.
def knight(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +outer: U32, +core: U32, image: Image) -> Image:
  +shadow = Shapes.disk(depth, size, Shapes.Pos{s(size, U32.add(x, 4))},
    Shapes.Pos{s(size, U32.add(y, 9))}, s(size, 26), 198419, 178, image)
  +base = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 23))}, Shapes.Pos{s(size, U32.add(y, 9))},
    Shapes.Pos{s(size, U32.add(x, 23))}, Shapes.Pos{s(size, U32.add(y, 20))},
    s(size, 5), core, 255, shadow)
  +foot = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.sub(x, 20))}, Shapes.Pos{s(size, U32.add(y, 8))},
    Shapes.Pos{s(size, U32.add(x, 20))}, Shapes.Pos{s(size, U32.add(y, 14))},
    s(size, 3), outer, 255, base)
  +neck = Facet.draw(depth, size,
    Quad.make(point(size, U32.sub(x, 13), U32.add(y, 9)),
      point(size, U32.add(x, 11), U32.add(y, 9)),
      point(size, U32.add(x, 5), U32.sub(y, 22)),
      point(size, U32.sub(x, 9), U32.sub(y, 18))),
    outer, 255, foot)
  +mane = Facet.draw(depth, size,
    Quad.make(point(size, U32.sub(x, 12), U32.add(y, 5)),
      point(size, U32.sub(x, 6), U32.add(y, 4)),
      point(size, U32.sub(x, 2), U32.sub(y, 21)),
      point(size, U32.sub(x, 8), U32.sub(y, 17))),
    core, 219, neck)
  +head = Facet.draw(depth, size,
    Quad.make(point(size, U32.sub(x, 10), U32.sub(y, 16)),
      point(size, U32.sub(x, 1), U32.sub(y, 34)),
      point(size, U32.add(x, 15), U32.sub(y, 28)),
      point(size, U32.add(x, 9), U32.sub(y, 13))),
    outer, 255, mane)
  +muzzle = Rounded.draw(depth, size,
    Shapes.Pos{s(size, U32.add(x, 5))}, Shapes.Pos{s(size, U32.sub(y, 20))},
    Shapes.Pos{s(size, U32.add(x, 22))}, Shapes.Pos{s(size, U32.sub(y, 12))},
    s(size, 3), outer, 255, head)
  +ear = Facet.draw(depth, size,
    Quad.make(point(size, U32.sub(x, 4), U32.sub(y, 30)),
      point(size, x, U32.sub(y, 41)),
      point(size, U32.add(x, 5), U32.sub(y, 31)),
      point(size, U32.add(x, 1), U32.sub(y, 26))),
    outer, 255, muzzle)
  +eye = Shapes.disk(depth, size, Shapes.Pos{s(size, U32.add(x, 8))},
    Shapes.Pos{s(size, U32.sub(y, 25))}, s(size, 2), core, 255, ear)
  Shapes.disk(depth, size, Shapes.Pos{s(size, U32.add(x, 14))},
    Shapes.Pos{s(size, U32.sub(y, 16))}, s(size, 2), core, 185, eye)

def pieces_a(+depth: Nat, +size: U32, image: Image) -> Image:
  +a = tower(depth, size, 288, 288, 14263654, 792617, image)
  +b = spire(depth, size, 416, 288, 14263654, 792617, a)
  +c = regent(depth, size, 608, 288, 14263654, 792617, b)
  +d = tower(depth, size, 736, 288, 14263654, 792617, c)
  +e = piece(depth, size, 352, 352, 14263654, 792617, d)
  +f = piece(depth, size, 480, 352, 14263654, 792617, e)
  +g = piece(depth, size, 608, 352, 14263654, 792617, f)
  piece(depth, size, 288, 416, 14263654, 792617, g)

def pieces_b(+depth: Nat, +size: U32, image: Image) -> Image:
  +a = tower(depth, size, 288, 736, 6608860, 1124151, image)
  +b = spire(depth, size, 416, 736, 6608860, 1124151, a)
  +c = piece(depth, size, 544, 736, 6608860, 1124151, b)
  +d = tower(depth, size, 736, 736, 6608860, 1124151, c)
  +e = piece(depth, size, 352, 672, 6608860, 1124151, d)
  +f = regent(depth, size, 480, 672, 16181716, 2706521, e)
  +g = piece(depth, size, 608, 672, 6608860, 1124151, f)
  piece(depth, size, 672, 608, 6608860, 1124151, g)

def rift_effect(+depth: Nat, +size: U32, image: Image) -> Image:
  +depth_glow = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 70), 2973808, 76, image)
  +orbit = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 73), s(size, 78), 5162964, 235, depth_glow)
  +inner = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 55), s(size, 59), 6608860, 185, orbit)
  +shaft = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 49), 397340, 198, inner)
  +core = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 22), s(size, 26), 5162964, 185, shaft)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 512)}, s(size, 8), 16181716, 155, core)

def cues(+depth: Nat, +size: U32, image: Image) -> Image:
  +hover = Ring.draw(depth, size, Shapes.Pos{s(size, 544)},
    Shapes.Pos{s(size, 608)}, s(size, 24), s(size, 26), 6608860, 172, image)
  +destination = Shapes.disk(depth, size, Shapes.Pos{s(size, 544)},
    Shapes.Pos{s(size, 608)}, s(size, 6), 6608860, 166, hover)
  Ring.draw(depth, size, Shapes.Pos{s(size, 608)},
    Shapes.Pos{s(size, 352)}, s(size, 28), s(size, 31), 15911055, 210, destination)

def observatory(+depth: Nat, +size: U32, image: Image) -> Image:
  +lintel = Facet.draw(depth, size,
    Quad.make(point(size, 310, 169), point(size, 714, 169),
      point(size, 757, 201), point(size, 267, 201)),
    1254201, 196, image)
  +bevel = Facet.draw(depth, size,
    Quad.make(point(size, 267, 201), point(size, 757, 201),
      point(size, 773, 209), point(size, 251, 209)),
    2973808, 122, lintel)
  +gem_a = Shapes.disk(depth, size, Shapes.Pos{s(size, 296)},
    Shapes.Pos{s(size, 186)}, s(size, 4), 15911055, 225, bevel)
  +gem_b = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 185)}, s(size, 6), 6608860, 225, gem_a)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 728)},
    Shapes.Pos{s(size, 186)}, s(size, 4), 15911055, 225, gem_b)

def slab(+depth: Nat, +size: U32, image: Image) -> Image:
  +shadow = Rounded.draw(depth, size,
    Shapes.Pos{s(size, 218)}, Shapes.Pos{s(size, 248)},
    Shapes.Pos{s(size, 806)}, Shapes.Pos{s(size, 821)},
    s(size, 24), 198419, 205, image)
  +left = Facet.draw(depth, size,
    Quad.make(point(size, 232, 232), point(size, 232, 770),
      point(size, 220, 816), point(size, 220, 250)),
    2111047, 255, shadow)
  +right = Facet.draw(depth, size,
    Quad.make(point(size, 792, 232), point(size, 804, 250),
      point(size, 804, 816), point(size, 792, 770)),
    727849, 255, left)
  +bottom = Facet.draw(depth, size,
    Quad.make(point(size, 232, 770), point(size, 792, 770),
      point(size, 804, 816), point(size, 220, 816)),
    1254201, 255, right)
  Facet.draw(depth, size,
    Quad.make(point(size, 232, 790), point(size, 792, 790),
      point(size, 794, 797), point(size, 230, 797)),
    2706521, 155, bottom)

def board(+depth: Nat, +size: U32, image: Image) -> Image:
  +base = slab(depth, size, image)
  +frame = Widgets.panel(depth, size, s(size, 232), s(size, 232),
    s(size, 560), s(size, 560), s(size, 20), 1057074, 3361115, base)
  +tiles = TileSurface.make(Nat.sub(depth, 1n), U32.div(size, 2),
    Board.Mask{3892264959, 4294934500},
    TileSurface.Palette{4216422, 3164247, 2637648, 1716290,
      6851736, 727849, 1054249, 528162, 5162964, 72, 491})
  +embedded = Canvas.embed_at(depth, tiles, Nat.sub(depth, 1n),
    U32.div(size, 4), U32.div(size, 4), frame)
  +portal = rift_effect(depth, size, embedded)
  +selected = Rounded.draw(depth, size, Shapes.Pos{s(size, 451)}, Shapes.Pos{s(size, 643)},
    Shapes.Pos{s(size, 509)}, Shapes.Pos{s(size, 701)}, s(size, 10), 4638419, 94, portal)
  +signals = cues(depth, size, selected)
  +first = pieces_a(depth, size, signals)
  pieces_b(depth, size, first)

def footer(+depth: Nat, +size: U32, image: Image) -> Image:
  +rule = Widgets.rule(depth, s(size, 32), s(size, 824), s(size, 960),
    14263654, image)
  +title = Widgets.label(depth, "A NEW PERSPECTIVE", s(size, 38),
    s(size, 854), s(size, 3), 16181716, 397340, rule)
  +caption = Widgets.label(depth,
    "Pure Bend imagery  /  immutable tiles  /  precise clipped geometry",
    s(size, 38), s(size, 902), s(size, 2), 7968935, 397340, title)
  +ctrl = Widgets.chip(depth, size, "UNDO", s(size, 782), s(size, 854),
    s(size, 96), s(size, 45), s(size, 2), 1057074, 2504780, 16181716, caption)
  Widgets.chip(depth, size, "MENU", s(size, 888), s(size, 854),
    s(size, 100), s(size, 45), s(size, 2), 2706521, 2973808, 6608860, ctrl)

def screen(+depth: Nat, +size: U32) -> Image:
  +a = background(depth, size)
  +structure = observatory(depth, size, a)
  +b = heading(depth, size, structure)
  +c = left_rail(depth, size, b)
  +d = right_rail(depth, size, c)
  +e = board(depth, size, d)
  footer(depth, size, e)
