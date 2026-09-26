import Base
import ../../graphics/v2game/PieceSprites.bend as Sprites
import ../../lib/graphics/v2/RgbaSample.bend as Sample
import ../../lib/graphics/v2/RgbaAffine.bend as RgbaAffine
import ../../lib/graphics/v2/Color.bend as Color
import ../../lib/graphics/v2/Rect.bend as Rect
import ../../lib/graphics/v2/Transform2D.bend as Transform
import ../../lib/graphics/pixels/Pixel.bend as Pixel

def quad4(a: Image, b: Image, c: Image, d: Image) -> Image:
  Qua{a, b, c, d}

def tile_color(+base: U32) -> Image:
  +a: Image = Pix{Color.rgb(base, 3, 7)}
  +b: Image = Pix{Color.rgb(U32.add(base, 1), 3, 7)}
  +c: Image = Pix{Color.rgb(U32.add(base, 2), 3, 7)}
  +d: Image = Pix{Color.rgb(U32.add(base, 3), 3, 7)}
  quad4(a, b, c, d)

def tile_mask(+base: U32) -> Image:
  +a: Image = Pix{Color.rgb(base, 0, 0)}
  +b: Image = Pix{Color.rgb(U32.sub(base, 1), 0, 0)}
  +c: Image = Pix{Color.rgb(U32.sub(base, 2), 0, 0)}
  +d: Image = Pix{Color.rgb(U32.sub(base, 3), 0, 0)}
  quad4(a, b, c, d)

def varied_color_page(+a: U32) -> Image:
  quad4(tile_color(a), tile_color(U32.add(a, 10)),
    tile_color(U32.add(a, 20)), tile_color(U32.add(a, 30)))

def varied_mask_page() -> Image:
  quad4(tile_mask(255), tile_mask(220), tile_mask(180), tile_mask(140))

# Exercise the two structural asymmetries: a uniform color ancestor paired
# with nonuniform alpha crops, then varying color crops paired with one
# uniform alpha ancestor.
def page0() -> Sprites.Page:
  Sprites.Page{2n, 4, Pix{Color.rgb(90, 3, 7)}, varied_mask_page()}

def page1() -> Sprites.Page:
  Sprites.Page{2n, 4, varied_color_page(10), Pix{Color.rgb(255, 0, 0)}}

def page2() -> Sprites.Page:
  +colors = varied_color_page(50)
  +masks = quad4(tile_mask(255), tile_mask(230), tile_mask(200), tile_mask(170))
  Sprites.Page{2n, 4, colors, masks}

def pieces() -> Sprites.Pieces:
  Sprites.prepare(page0(), page1(), page2())

def texel_color(side: Sprites.Side, kind: Sprites.PieceKind) -> U32:
  Sample.color(Sample.nearest(Sprites.texture(pieces(), side, kind), 0, 0))

def texel_alpha(side: Sprites.Side, kind: Sprites.PieceKind) -> U32:
  Sample.alpha(Sample.nearest(Sprites.texture(pieces(), side, kind), 0, 0))

def color_matches(side: Sprites.Side, kind: Sprites.PieceKind, expected: U32) -> Bool:
  U32.is_eq(texel_color(side, kind), expected)

def ivory_first_four_are_mapped() -> Bool:
  +side: Sprites.Side = Sprites.Ivory{}
  Bool.and(Bool.and(Bool.and(
    Bool.and(color_matches(side, Sprites.Pawn{}, Color.rgb(90, 3, 7)),
      U32.is_eq(texel_alpha(side, Sprites.Pawn{}), 255)),
    Bool.and(color_matches(side, Sprites.Knight{}, Color.rgb(90, 3, 7)),
      U32.is_eq(texel_alpha(side, Sprites.Knight{}), 220))),
    Bool.and(color_matches(side, Sprites.Bishop{}, Color.rgb(90, 3, 7)),
      U32.is_eq(texel_alpha(side, Sprites.Bishop{}), 180))),
    Bool.and(color_matches(side, Sprites.Rook{}, Color.rgb(90, 3, 7)),
      U32.is_eq(texel_alpha(side, Sprites.Rook{}), 140)))

def middle_page_is_mapped() -> Bool:
  +white: Sprites.Side = Sprites.Ivory{}
  +navy: Sprites.Side = Sprites.Navy{}
  Bool.and(Bool.and(
    color_matches(white, Sprites.Queen{}, Color.rgb(10, 3, 7)),
    color_matches(white, Sprites.King{}, Color.rgb(20, 3, 7))),
    Bool.and(color_matches(navy, Sprites.Pawn{}, Color.rgb(30, 3, 7)),
      color_matches(navy, Sprites.Knight{}, Color.rgb(40, 3, 7))))

def last_page_is_mapped() -> Bool:
  +navy: Sprites.Side = Sprites.Navy{}
  Bool.and(Bool.and(
    color_matches(navy, Sprites.Bishop{}, Color.rgb(50, 3, 7)),
    color_matches(navy, Sprites.Rook{}, Color.rgb(60, 3, 7))),
    Bool.and(color_matches(navy, Sprites.Queen{}, Color.rgb(70, 3, 7)),
      color_matches(navy, Sprites.King{}, Color.rgb(80, 3, 7))))

def all_twelve_are_mapped() -> Bool:
  Bool.and(ivory_first_four_are_mapped(),
    Bool.and(middle_page_is_mapped(), last_page_is_mapped()))

def solid(depth: Nat, +color: U32) -> Image:
  match depth:
    case 0n: Pix{color}
    case 1n++rest:
      +a = solid(rest, color)
      +b = solid(rest, color)
      +c = solid(rest, color)
      +d = solid(rest, color)
      Qua{a, b, c, d}

def rendered_pawn_pixel() -> U32:
  +texture = Sprites.texture(pieces(), Sprites.Ivory{}, Sprites.Pawn{})
  +matrix: Transform.Matrix = Transform.Matrix{8.0, 0.0, 0.0, 8.0, 0.0, 0.0}
  +background = solid(3n, Color.rgb(0, 0, 0))
  +rendered = RgbaAffine.draw(3n, 8, RgbaAffine.prepare(matrix), texture,
    Sample.Linear{}, 255, Rect.screen(8), background)
  Pixel.sample_xy(3n, 0, 0, rendered)

def draw_preserves_sprite_color() -> Bool:
  U32.is_eq(rendered_pawn_pixel(), Color.rgb(90, 3, 7))

def partial_page() -> List<&2, U32>:
  Con{82, Con{71, Con{65, Con{50, Con{8, Nil{}}}}}}

def is_missing(result: Maybe<&2, Sprites.Page>) -> Bool:
  match result:
    case None{}: True{}
    case Some{page}: False{}

def malformed_page_is_rejected() -> Bool:
  is_missing(Sprites.decode_page(partial_page(), 8))

def report(check: Bool, +pass: String, +fail: String) -> IO(Unit):
  match check:
    case True{}: IO.print(pass)
    case False{}: IO.die(Unit, 1, fail)

def main() -> IO(Unit):
  IO.bind(Unit, Unit, report(ivory_first_four_are_mapped(),
      "PASS: uniform-color / varied-mask page", "uniform-color / varied-mask crop failed"),
    _ => IO.bind(Unit, Unit, report(middle_page_is_mapped(),
        "PASS: varied-color / uniform-mask page", "varied-color / uniform-mask crop failed"),
        _ => IO.bind(Unit, Unit, report(last_page_is_mapped(),
          "PASS: fully varied final page", "fully varied final page crop failed"),
        _ => IO.bind(Unit, Unit, report(malformed_page_is_rejected(),
            "PASS: truncated RGA2 page rejected", "truncated RGA2 page was accepted"),
          _ => report(draw_preserves_sprite_color(),
            "PASS: affine RGBA sprite draw pixel", "PieceSprites affine draw failed")))))
