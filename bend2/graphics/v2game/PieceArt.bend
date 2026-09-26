import Base
import ../../core/Model.bend as Model
import ../../lib/graphics/Quad.bend as Quad
import ../../lib/graphics/v2/Facet.bend as Facet
import ../../lib/graphics/v2/Ring.bend as Ring
import ../../lib/graphics/v2/Rounded.bend as Rounded
import ../../lib/graphics/v2/Shapes.bend as Shapes

# Chess-specific tokens for the game scene.  The dimensions are expressed in
# 512-canvas units and scale with the requested physical Image depth.
type Material is Data:
  Material{body: U32, shade: U32, glint: U32, shadow: U32}

def px(+size: U32, +value: U32) -> U32:
  +scaled = U32.div(U32.mul(U32.mul(size, value), 29), 12800)
  Bool.pick(U32, U32.is_zero(value), 0, U32.max(1, scaled))

def py(+size: U32, +value: U32) -> U32:
  +scaled = U32.div(U32.mul(U32.mul(size, value), 24), 12800)
  Bool.pick(U32, U32.is_zero(value), 0, U32.max(1, scaled))

def before_case(positive: Bool, +center: U32, +distance: U32) -> Shapes.Coord:
  match positive:
    case True{}: Shapes.Pos{U32.sub(center, distance)}
    case False{}: Shapes.Neg{U32.sub(distance, center)}

def before(size: U32, +center: U32, offset: U32) -> Shapes.Coord:
  +distance = px(size, offset)
  before_case(U32.is_ge(center, distance), center, distance)

def before_y(size: U32, +center: U32, offset: U32) -> Shapes.Coord:
  +distance = py(size, offset)
  before_case(U32.is_ge(center, distance), center, distance)

def after(size: U32, center: U32, offset: U32) -> Shapes.Coord:
  Shapes.Pos{U32.add(center, px(size, offset))}

def after_y(size: U32, center: U32, offset: U32) -> Shapes.Coord:
  Shapes.Pos{U32.add(center, py(size, offset))}

def at(value: U32) -> Shapes.Coord:
  Shapes.Pos{value}

def coord_value(coord: Shapes.Coord) -> F32:
  match coord:
    case Shapes.Pos{positive}: U32.to_f32(positive)
    case Shapes.Neg{magnitude}: F32.neg(U32.to_f32(magnitude))

def material(code: U32) -> Material:
  Bool.pick(Material, Model.is_white(code),
    Material{15524037, 10125663, 15979914, 1515564},
    Material{3234158, 4877436, 12819815, 726816})

def horse_glint(body: U32) -> U32:
  Bool.pick(U32, U32.is_eq(body, 15524037), 14989942, 14991990)

def dot(+depth: Nat, +size: U32, +x: Shapes.Coord, +y: Shapes.Coord,
  radius: U32, color: U32, opacity: U32, image: Image) -> Image:
  Shapes.disk(depth, size, x, y, px(size, radius),
    color, opacity, image)

def band(+depth: Nat, +size: U32, +x: Shapes.Coord, +y: Shapes.Coord,
  inner: U32, outer: U32, color: U32, opacity: U32, image: Image) -> Image:
  Ring.draw(depth, size, x, y, px(size, inner),
    px(size, outer), color, opacity, image)

# Piece-level focus follows the plinth perimeter so selected gold and hovered
# cyan accents read as a lit base rim rather than another tile target marker.
def focus_rim(show: Bool, +depth: Nat, +size: U32, +x: U32,
  +floor: U32, +color: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}:
      band(depth, size, at(x), before_y(size, floor, 1), 14, 17,
        color, 255, image)

def roundrect.bounds(+depth: Nat, +size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +right: Shapes.Coord, +bottom: Shapes.Coord,
  radius: U32, color: U32,
  image: Image) -> Image:
  Rounded.draw(depth, size, left, top, right, bottom,
    px(size, radius), color, 255, image)

def roundrect(+depth: Nat, +size: U32, +x: U32, +top: Shapes.Coord,
  +half_width: U32, +bottom: Shapes.Coord, radius: U32, color: U32,
  image: Image) -> Image:
  roundrect.bounds(depth, size, before(size, x, half_width), top,
    after(size, x, half_width), bottom, radius, color, image)

def vertex(+x: Shapes.Coord, +y: Shapes.Coord) -> Quad.Point:
  Quad.Point{coord_value(x), coord_value(y)}

def facet(+depth: Nat, +size: U32, +a: Quad.Point, +b: Quad.Point,
  +c: Quad.Point, +d: Quad.Point, color: U32, image: Image) -> Image:
  Facet.draw(depth, size, Quad.make(a, b, c, d), color, 255, image)

def plinth(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, +shadow}:
      +under = dot(depth, size, after(size, x, 2), after_y(size, floor, 4),
        11, shadow, 158, image)
      +foot = roundrect(depth, size, x, before_y(size, floor, 6), 12,
        after_y(size, floor, 1), 3, shadow, under)
      +lower = roundrect(depth, size, x, before_y(size, floor, 4), 11,
        before_y(size, floor, 1), 2, shade, foot)
      +edge = roundrect(depth, size, x, before_y(size, floor, 2), 9,
        before_y(size, floor, 1), 1, glint, lower)
      +upper = roundrect(depth, size, x, before_y(size, floor, 10), 8,
        before_y(size, floor, 3), 3, body, edge)
      dot(depth, size, before(size, x, 5), before_y(size, floor, 8), 1,
        glint, 190, upper)

def pawn(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, shade, +glint, shadow}:
      +base = plinth(depth, size, x, floor, style, image)
      +bodypart = roundrect(depth, size, x, before_y(size, floor, 23), 6,
        before_y(size, floor, 6), 4, body, base)
      +side = roundrect.bounds(depth, size, after(size, x, 3),
        before_y(size, floor, 22), after(size, x, 5), before_y(size, floor, 7),
        1, shade, bodypart)
      +collar = band(depth, size, at(x), before_y(size, floor, 20), 4, 7,
        glint, 220, side)
      +head = dot(depth, size, at(x), before_y(size, floor, 29), 6, body, 255,
        collar)
      dot(depth, size, before(size, x, 2), before_y(size, floor, 32), 2,
        glint, 245, head)

def knight(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +base = plinth(depth, size, x, floor, style, image)
      +neck = roundrect.bounds(depth, size, before(size, x, 9),
        before_y(size, floor, 22), after(size, x, 7), before_y(size, floor, 5), 3, shade, base)
      +head = facet(depth, size,
        vertex(before(size, x, 9), before_y(size, floor, 16)),
        vertex(before(size, x, 7), before_y(size, floor, 35)),
        vertex(after(size, x, 4), before_y(size, floor, 29)),
        vertex(after(size, x, 12), before_y(size, floor, 18)),
        body, neck)
      +muzzle = facet(depth, size,
        vertex(after(size, x, 3), before_y(size, floor, 28)),
        vertex(after(size, x, 10), before_y(size, floor, 24)),
        vertex(after(size, x, 13), before_y(size, floor, 18)),
        vertex(after(size, x, 4), before_y(size, floor, 18)),
        horse_glint(body), head)
      +ear = facet(depth, size,
        vertex(before(size, x, 5), before_y(size, floor, 33)),
        vertex(before(size, x, 3), before_y(size, floor, 40)),
        vertex(after(size, x, 2), before_y(size, floor, 32)),
        vertex(after(size, x, 1), before_y(size, floor, 27)),
        body, muzzle)
      +eye = dot(depth, size, after(size, x, 5), before_y(size, floor, 26), 1,
        shadow, 255, ear)
      facet(depth, size,
        vertex(before(size, x, 6), before_y(size, floor, 35)),
        vertex(before(size, x, 4), before_y(size, floor, 39)),
        vertex(after(size, x, 6), before_y(size, floor, 31)),
        vertex(after(size, x, 4), before_y(size, floor, 28)),
        horse_glint(body), eye)

def bishop(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +base = plinth(depth, size, x, floor, style, image)
      +bodypart = roundrect(depth, size, x, before_y(size, floor, 24), 7,
        before_y(size, floor, 5), 4, body, base)
      +side = roundrect.bounds(depth, size, after(size, x, 4),
        before_y(size, floor, 23), after(size, x, 6), before_y(size, floor, 6),
        1, shade, bodypart)
      +mitre = facet(depth, size,
        vertex(before(size, x, 8), before_y(size, floor, 24)),
        vertex(before(size, x, 4), before_y(size, floor, 36)),
        vertex(after(size, x, 4), before_y(size, floor, 36)),
        vertex(after(size, x, 8), before_y(size, floor, 24)),
        shade, side)
      +tip = dot(depth, size, at(x), before_y(size, floor, 36), 2, glint, 255,
        mitre)
      +slash = facet(depth, size,
        vertex(before(size, x, 1), before_y(size, floor, 31)),
        vertex(after(size, x, 4), before_y(size, floor, 28)),
        vertex(after(size, x, 1), before_y(size, floor, 25)),
        vertex(before(size, x, 4), before_y(size, floor, 28)),
        glint, tip)
      slash

def rook(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +base = plinth(depth, size, x, floor, style, image)
      +tower = roundrect(depth, size, x, before_y(size, floor, 27), 10,
        before_y(size, floor, 5), 2, body, base)
      +side = roundrect.bounds(depth, size, after(size, x, 5),
        before_y(size, floor, 26), after(size, x, 8), before_y(size, floor, 6),
        1, shade, tower)
      +battlement = roundrect(depth, size, x, before_y(size, floor, 34), 12,
        before_y(size, floor, 24), 1, shade, side)
      +left = roundrect.bounds(depth, size, before(size, x, 11),
        before_y(size, floor, 37), before(size, x, 5), before_y(size, floor, 29), 1, glint,
        battlement)
      +middle = roundrect(depth, size, x, before_y(size, floor, 38), 3,
        before_y(size, floor, 29), 1, glint, left)
      roundrect.bounds(depth, size, after(size, x, 5), before_y(size, floor, 37),
        after(size, x, 11), before_y(size, floor, 29), 1, glint, middle)

def queen(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +base = plinth(depth, size, x, floor, style, image)
      +bodypart = roundrect(depth, size, x, before_y(size, floor, 25), 8,
        before_y(size, floor, 5), 4, shade, base)
      +band = roundrect(depth, size, x, before_y(size, floor, 30), 12,
        before_y(size, floor, 23), 2, body, bodypart)
      +left = facet(depth, size,
        vertex(before(size, x, 10), before_y(size, floor, 32)),
        vertex(before(size, x, 8), before_y(size, floor, 39)),
        vertex(before(size, x, 6), before_y(size, floor, 32)),
        vertex(before(size, x, 8), before_y(size, floor, 29)), glint, band)
      +crown = facet(depth, size,
        vertex(before(size, x, 3), before_y(size, floor, 37)),
        vertex(at(x), before_y(size, floor, 46)),
        vertex(after(size, x, 3), before_y(size, floor, 37)),
        vertex(at(x), before_y(size, floor, 34)), body, left)
      +right = facet(depth, size,
        vertex(after(size, x, 6), before_y(size, floor, 32)),
        vertex(after(size, x, 8), before_y(size, floor, 39)),
        vertex(after(size, x, 10), before_y(size, floor, 32)),
        vertex(after(size, x, 8), before_y(size, floor, 29)), glint, crown)
      dot(depth, size, at(x), before_y(size, floor, 42), 1, glint, 245, right)

def king(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +base = plinth(depth, size, x, floor, style, image)
      +bodypart = roundrect(depth, size, x, before_y(size, floor, 27), 9,
        before_y(size, floor, 5), 4, body, base)
      +side = roundrect.bounds(depth, size, after(size, x, 5),
        before_y(size, floor, 26), after(size, x, 8), before_y(size, floor, 6),
        1, shade, bodypart)
      +crown = roundrect(depth, size, x, before_y(size, floor, 34), 8,
        before_y(size, floor, 25), 2, shade, side)
      +stem = roundrect(depth, size, x, before_y(size, floor, 47), 2,
        before_y(size, floor, 32), 1, glint, crown)
      +arms = roundrect(depth, size, x, before_y(size, floor, 43), 8,
        before_y(size, floor, 39), 1, glint, stem)
      dot(depth, size, at(x), before_y(size, floor, 49), 2, body, 255, arms)

# Drag-tier silhouettes retain chess identity but use only a few clipped
# primitives per token. The detailed settled art remains above for idle frames.
def proxy_base(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  body: U32, shade: U32, shadow: U32, image: Image) -> Image:
  +drop = dot(depth, size, after(size, x, 1), after_y(size, floor, 2),
    9, shadow, 132, image)
  +plate = roundrect.bounds(depth, size, before(size, x, 9),
    before_y(size, floor, 3), after(size, x, 9), after_y(size, floor, 2),
    2, shade, drop)
  roundrect.bounds(depth, size, before(size, x, 5), before_y(size, floor, 15),
    after(size, x, 5), before_y(size, floor, 2), 2, body, plate)

def proxy_pawn(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, +shadow}:
      +base = proxy_base(depth, size, x, floor, body, shade, shadow, image)
      +head = dot(depth, size, at(x), before_y(size, floor, 23), 5, body, 255, base)
      dot(depth, size, before(size, x, 2), before_y(size, floor, 24),
        1, glint, 255, head)

def proxy_knight(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +base = proxy_base(depth, size, x, floor, body, shade, shadow, image)
      +head = facet(depth, size,
        vertex(before(size, x, 6), before_y(size, floor, 12)),
        vertex(before(size, x, 4), before_y(size, floor, 27)),
        vertex(after(size, x, 3), before_y(size, floor, 23)),
        vertex(after(size, x, 9), before_y(size, floor, 13)), body, base)
      +eye = dot(depth, size, after(size, x, 3), before_y(size, floor, 23),
        1, horse_glint(body), 255, head)
      facet(depth, size,
        vertex(before(size, x, 3), before_y(size, floor, 25)),
        vertex(before(size, x, 2), before_y(size, floor, 29)),
        vertex(after(size, x, 6), before_y(size, floor, 22)),
        vertex(after(size, x, 4), before_y(size, floor, 20)),
        horse_glint(body), eye)

def proxy_bishop(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, +shadow}:
      +base = proxy_base(depth, size, x, floor, body, shade, shadow, image)
      +diamond = facet(depth, size,
        vertex(at(x), before_y(size, floor, 32)),
        vertex(after(size, x, 7), before_y(size, floor, 16)),
        vertex(at(x), before_y(size, floor, 7)),
        vertex(before(size, x, 7), before_y(size, floor, 16)), body, base)
      facet(depth, size,
        vertex(before(size, x, 1), before_y(size, floor, 27)),
        vertex(after(size, x, 1), before_y(size, floor, 25)),
        vertex(after(size, x, 3), before_y(size, floor, 22)),
        vertex(before(size, x, 3), before_y(size, floor, 24)), glint, diamond)

def proxy_rook(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, +shadow}:
      +base = proxy_base(depth, size, x, floor, body, shade, shadow, image)
      +left = roundrect.bounds(depth, size, before(size, x, 8),
        before_y(size, floor, 23), before(size, x, 3), before_y(size, floor, 16),
        1, glint, base)
      +middle = roundrect.bounds(depth, size, before(size, x, 2),
        before_y(size, floor, 25), after(size, x, 2), before_y(size, floor, 16),
        1, shade, left)
      roundrect.bounds(depth, size, after(size, x, 3), before_y(size, floor, 20),
        after(size, x, 8), before_y(size, floor, 16), 1, glint, middle)

def proxy_queen(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, +shadow}:
      +base = proxy_base(depth, size, x, floor, body, shade, shadow, image)
      +band = roundrect.bounds(depth, size, before(size, x, 10),
        before_y(size, floor, 22), after(size, x, 10), before_y(size, floor, 17),
        1, body, base)
      +left = dot(depth, size, before(size, x, 8), before_y(size, floor, 26),
        3, glint, 255, band)
      +center = dot(depth, size, at(x), before_y(size, floor, 29), 3,
        body, 255, left)
      dot(depth, size, after(size, x, 8), before_y(size, floor, 26),
        3, glint, 255, center)

def proxy_king(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, +shadow}:
      +base = proxy_base(depth, size, x, floor, body, shade, shadow, image)
      +stem = roundrect.bounds(depth, size, before(size, x, 2),
        before_y(size, floor, 35), after(size, x, 2), before_y(size, floor, 18),
        1, glint, base)
      +arms = roundrect.bounds(depth, size, before(size, x, 7),
        before_y(size, floor, 31), after(size, x, 7), before_y(size, floor, 26),
        1, shade, stem)
      dot(depth, size, at(x), before_y(size, floor, 37), 2, body, 255, arms)

def proxy_type(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  kind: U32, style: Material, image: Image) -> Image:
  match kind:
    case 1: proxy_pawn(depth, size, x, floor, style, image)
    case 2: proxy_knight(depth, size, x, floor, style, image)
    case 3: proxy_bishop(depth, size, x, floor, style, image)
    case 4: proxy_rook(depth, size, x, floor, style, image)
    case 5: proxy_queen(depth, size, x, floor, style, image)
    case 6: proxy_king(depth, size, x, floor, style, image)
    case 7: proxy_pawn(depth, size, x, floor, style, image)
    case _: proxy_pawn(depth, size, x, floor, style, image)

def proxy_draw.ready(show: Bool, +depth: Nat, +size: U32, +x: U32,
  +floor: U32, +code: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: proxy_type(depth, size, x, floor,
      Model.piece_type(code), material(code), image)

def proxy_draw(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +code: U32, image: Image) -> Image:
  proxy_draw.ready(Model.occupied(code), depth, size, x, floor, code, image)

# Camera-motion marks trade the full plinth and secondary facets for two
# unmistakable primitives per occupied square. The board footprint and holes
# remain exact; the settled renderer restores full sculpted piece art.
def camera_pawn(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +shaft = roundrect(depth, size, x, before_y(size, floor, 16), 5,
        after_y(size, floor, 2), 2, shade, image)
      dot(depth, size, at(x), before_y(size, floor, 23), 4, body, 255, shaft)

def camera_knight(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +head = facet(depth, size,
        vertex(before(size, x, 7), before_y(size, floor, 8)),
        vertex(before(size, x, 5), before_y(size, floor, 27)),
        vertex(after(size, x, 4), before_y(size, floor, 22)),
        vertex(after(size, x, 10), before_y(size, floor, 10)), body, image)
      facet(depth, size,
        vertex(before(size, x, 5), before_y(size, floor, 26)),
        vertex(before(size, x, 3), before_y(size, floor, 30)),
        vertex(after(size, x, 6), before_y(size, floor, 23)),
        vertex(after(size, x, 4), before_y(size, floor, 21)),
        horse_glint(body), head)

def camera_bishop(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +mitre = facet(depth, size,
        vertex(at(x), before_y(size, floor, 32)),
        vertex(after(size, x, 7), before_y(size, floor, 17)),
        vertex(at(x), before_y(size, floor, 5)),
        vertex(before(size, x, 7), before_y(size, floor, 17)), body, image)
      facet(depth, size,
        vertex(before(size, x, 1), before_y(size, floor, 25)),
        vertex(after(size, x, 4), before_y(size, floor, 22)),
        vertex(after(size, x, 1), before_y(size, floor, 19)),
        vertex(before(size, x, 4), before_y(size, floor, 22)), glint, mitre)

def camera_rook(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +tower = roundrect(depth, size, x, before_y(size, floor, 25), 9,
        after_y(size, floor, 2), 2, body, image)
      roundrect(depth, size, x, before_y(size, floor, 32), 11,
        before_y(size, floor, 25), 1, shade, tower)

def camera_queen(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +band = roundrect(depth, size, x, before_y(size, floor, 20), 10,
        before_y(size, floor, 12), 2, shade, image)
      facet(depth, size,
        vertex(before(size, x, 10), before_y(size, floor, 20)),
        vertex(before(size, x, 7), before_y(size, floor, 31)),
        vertex(after(size, x, 7), before_y(size, floor, 31)),
        vertex(after(size, x, 10), before_y(size, floor, 20)), glint, band)

def camera_king(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +style: Material, image: Image) -> Image:
  match style:
    case Material{+body, +shade, +glint, shadow}:
      +stem = roundrect(depth, size, x, before_y(size, floor, 32), 3,
        after_y(size, floor, 2), 1, body, image)
      roundrect(depth, size, x, before_y(size, floor, 27), 10,
        before_y(size, floor, 22), 1, glint, stem)

def camera_type(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  kind: U32, style: Material, image: Image) -> Image:
  match kind:
    case 1: camera_pawn(depth, size, x, floor, style, image)
    case 2: camera_knight(depth, size, x, floor, style, image)
    case 3: camera_bishop(depth, size, x, floor, style, image)
    case 4: camera_rook(depth, size, x, floor, style, image)
    case 5: camera_queen(depth, size, x, floor, style, image)
    case 6: camera_king(depth, size, x, floor, style, image)
    case 7: camera_pawn(depth, size, x, floor, style, image)
    case _: camera_pawn(depth, size, x, floor, style, image)

def camera_draw.ready(show: Bool, +depth: Nat, +size: U32, +x: U32,
  +floor: U32, +code: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: camera_type(depth, size, x, floor,
      Model.piece_type(code), material(code), image)

def camera_draw(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +code: U32, image: Image) -> Image:
  camera_draw.ready(Model.occupied(code), depth, size, x, floor, code, image)

# Lowest-detail orbit glyphs use exactly one convex primitive per token.
# Their outline—not an extra ring or base—carries the six-piece distinction.
def camera_min_pawn(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  body: U32, image: Image) -> Image:
  dot(depth, size, at(x), before_y(size, floor, 19), 7, body, 255, image)

def camera_min_knight(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  body: U32, image: Image) -> Image:
  facet(depth, size,
    vertex(before(size, x, 9), before_y(size, floor, 8)),
    vertex(before(size, x, 6), before_y(size, floor, 34)),
    vertex(after(size, x, 4), before_y(size, floor, 27)),
    vertex(after(size, x, 13), before_y(size, floor, 11)), body, image)

def camera_min_bishop(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  body: U32, image: Image) -> Image:
  facet(depth, size,
    vertex(at(x), before_y(size, floor, 40)),
    vertex(after(size, x, 10), before_y(size, floor, 22)),
    vertex(at(x), before_y(size, floor, 5)),
    vertex(before(size, x, 10), before_y(size, floor, 22)), body, image)

def camera_min_rook(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  body: U32, image: Image) -> Image:
  roundrect(depth, size, x, before_y(size, floor, 33), 12,
    after_y(size, floor, 2), 1, body, image)

def camera_min_queen(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  body: U32, image: Image) -> Image:
  facet(depth, size,
    vertex(before(size, x, 13), before_y(size, floor, 18)),
    vertex(before(size, x, 8), before_y(size, floor, 38)),
    vertex(after(size, x, 8), before_y(size, floor, 38)),
    vertex(after(size, x, 13), before_y(size, floor, 18)), body, image)

def camera_min_king(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +body: U32, image: Image) -> Image:
  +stem = roundrect(depth, size, x, before_y(size, floor, 46), 3,
    before_y(size, floor, 16), 1, body, image)
  roundrect(depth, size, x, before_y(size, floor, 41), 11,
    before_y(size, floor, 35), 1, body, stem)

def camera_min_type(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  kind: U32, body: U32, image: Image) -> Image:
  match kind:
    case 1: camera_min_pawn(depth, size, x, floor, body, image)
    case 2: camera_min_knight(depth, size, x, floor, body, image)
    case 3: camera_min_bishop(depth, size, x, floor, body, image)
    case 4: camera_min_rook(depth, size, x, floor, body, image)
    case 5: camera_min_queen(depth, size, x, floor, body, image)
    case 6: camera_min_king(depth, size, x, floor, body, image)
    case 7: camera_min_pawn(depth, size, x, floor, body, image)
    case _: camera_min_pawn(depth, size, x, floor, body, image)

def material_body(style: Material) -> U32:
  match style:
    case Material{+body, shade, glint, shadow}: body

def camera_draw_min.ready(show: Bool, +depth: Nat, +size: U32, +x: U32,
  +floor: U32, +code: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}:
      camera_min_type(depth, size, x, floor, Model.piece_type(code),
        material_body(material(code)), image)

def camera_draw_min(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +code: U32, image: Image) -> Image:
  camera_draw_min.ready(Model.occupied(code), depth, size, x, floor, code, image)

def draw_type(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  kind: U32, style: Material, image: Image) -> Image:
  match kind:
    case 1: pawn(depth, size, x, floor, style, image)
    case 2: knight(depth, size, x, floor, style, image)
    case 3: bishop(depth, size, x, floor, style, image)
    case 4: rook(depth, size, x, floor, style, image)
    case 5: queen(depth, size, x, floor, style, image)
    case 6: king(depth, size, x, floor, style, image)
    case 7: pawn(depth, size, x, floor, style, image)
    case _: pawn(depth, size, x, floor, style, image)

def draw.ready(show: Bool, +depth: Nat, +size: U32, +x: U32,
  +floor: U32, +code: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: draw_type(depth, size, x, floor,
      Model.piece_type(code), material(code), image)

def draw(+depth: Nat, +size: U32, +x: U32, +floor: U32,
  +code: U32, image: Image) -> Image:
  draw.ready(Model.occupied(code), depth, size, x, floor, code, image)
