# Pure 2.5D eight-by-eight platform field. Missing cells do not paint a top,
# side, shadow or hole marker: the caller's actual lower scene shows through.
# The projection is integer screen-space input; Facet's F32 quad coverage is
# presentation-only. The board is drawn back-row first, front-row last.
import Base
import ../graphics/Quad.bend as Quad
import ./Board.bend as Board
import ../graphics/v2/RaisedFacet.bend as RaisedFacet
import ../graphics/v2/Color.bend as Color

type Projection is Data:
  Projection{origin_x: U32, origin_y: U32, file_dx: U32, file_up: U32,
    rank_dx: U32, rank_down: U32, thickness: U32}

type Palette is Data:
  Palette{light_top: U32, dark_top: U32, light_side: U32, dark_side: U32,
    edge: U32, shadow: U32, glint: U32}

# A source-level directional material tint. It changes only flat colors chosen
# once per platform, without adding another projected facet per cell.
type Light is Data:
  Light{ink: U32, strength: U32, file: U32, rank: U32}

def x_at(p: Projection, +file: U32, +rank: U32) -> U32:
  match p:
    case Projection{ox, oy, fdx, fup, rdx, rdown, thick}:
      U32.add(ox, U32.add(U32.mul(file, fdx), U32.mul(rank, rdx)))

def y_at(p: Projection, +file: U32, +rank: U32) -> U32:
  match p:
    case Projection{ox, oy, fdx, fup, rdx, rdown, thick}:
      U32.sub(U32.add(oy, U32.mul(rank, rdown)), U32.mul(file, fup))

def point(+p: Projection, +file: U32, +rank: U32) -> Quad.Point:
  Quad.Point{U32.to_f32(x_at(p, file, rank)),
    U32.to_f32(y_at(p, file, rank))}

def surface(even: Bool, palette: Palette) -> RaisedFacet.Surface:
  match even palette:
    case True{} Palette{light, dark, light_side, dark_side, edge, shadow, glint}:
      RaisedFacet.Surface{light, light_side, edge, shadow, glint}
    case False{} Palette{light, dark, light_side, dark_side, edge, shadow, glint}:
      RaisedFacet.Surface{dark, dark_side, edge, shadow, glint}

def axis_distance(+a: U32, +b: U32) -> U32:
  Bool.pick(U32, U32.is_ge(a, b), U32.sub(a, b), U32.sub(b, a))

def light_strength(light: Light) -> U32:
  match light:
    case Light{ink, strength, source_file, source_rank}: strength

def illuminate_nonzero(style: RaisedFacet.Surface, light: Light,
  +file: U32, +rank: U32) -> RaisedFacet.Surface:
  match style light:
    case RaisedFacet.Surface{top, side, edge, shadow, glint} Light{+ink, strength, source_file, source_rank}:
      +dx = axis_distance(file, U32.min(source_file, 7))
      +dy = axis_distance(rank, U32.min(source_rank, 7))
      +weight = U32.sub(15, U32.add(dx, dy))
      +alpha = U32.div(U32.mul(U32.min(strength, 255), weight), 15)
      RaisedFacet.Surface{Color.over(ink, top, alpha),
        Color.over(ink, side, U32.div(alpha, 3)), edge, shadow, glint}

def illuminate_case(zero: Bool, +style: RaisedFacet.Surface, +light: Light,
  +file: U32, +rank: U32) -> RaisedFacet.Surface:
  match zero:
    case True{}: style
    case False{}: illuminate_nonzero(style, light, file, rank)

def illuminate(style: RaisedFacet.Surface, +light: Light,
  +file: U32, +rank: U32) -> RaisedFacet.Surface:
  illuminate_case(U32.is_zero(light_strength(light)), style, light,
    file, rank)

def paint(+depth: Nat, +size: U32, +p: Projection, +file: U32,
  +rank: U32, +style: RaisedFacet.Surface, image: Image) -> Image:
  match p:
    case Projection{ox, oy, fdx, fup, rdx, rdown, thick}:
      +p00 = point(p, file, rank)
      +p10 = point(p, U32.add(file, 1), rank)
      +p01 = point(p, file, U32.add(rank, 1))
      +p11 = point(p, U32.add(file, 1), U32.add(rank, 1))
      RaisedFacet.paint_corners(depth, size, p00, p10, p11, p01,
        0.0, U32.to_f32(thick), style, image)

def paint_case(visible: Bool, +depth: Nat, +size: U32, +p: Projection,
  +file: U32, +rank: U32, +style: RaisedFacet.Surface, image: Image) -> Image:
  match visible:
    case False{}: image
    case True{}: paint(depth, size, p, file, rank, style, image)

def files(+remaining: Nat, +file: U32, +rank: U32, +depth: Nat,
  +size: U32, +p: Projection, +mask: Board.Mask, +palette: Palette,
  +light: Light,
  image: Image) -> Image:
  match remaining:
    case 0n: image
    case 1n+rest:
      +style = illuminate(surface(U32.is_zero(U32.mod(U32.add(file, rank), 2)), palette),
        light, file, rank)
      +painted = paint_case(Board.present(mask, U32.add(file, U32.mul(rank, 8))),
        depth, size, p, file, rank, style, image)
      files(rest, U32.add(file, 1), rank, depth, size, p, mask, palette,
        light, painted)

def rows(+remaining: Nat, +rank: U32, +depth: Nat, +size: U32,
  +p: Projection, +mask: Board.Mask, +palette: Palette, +light: Light,
  image: Image) -> Image:
  match remaining:
    case 0n: image
    case 1n+rest:
      +painted = files(8n, 0, rank, depth, size, p, mask, palette, light, image)
      rows(rest, U32.add(rank, 1), depth, size, p, mask, palette, light, painted)

def field_case(empty: Bool, +depth: Nat, +size: U32, +p: Projection,
  +mask: Board.Mask, +palette: Palette, +light: Light, image: Image) -> Image:
  match empty:
    case True{}: image
    case False{}: rows(8n, 0, depth, size, p, mask, palette, light, image)

def draw(+depth: Nat, +size: U32, +p: Projection,
  +mask: Board.Mask, +palette: Palette, image: Image) -> Image:
  field_case(Board.empty_mask(mask), depth, size, p, mask, palette,
    Light{0, 0, 0, 0}, image)

def draw_lit(+depth: Nat, +size: U32, +p: Projection,
  +mask: Board.Mask, +palette: Palette, +light: Light, image: Image) -> Image:
  field_case(Board.empty_mask(mask), depth, size, p, mask, palette,
    light, image)
