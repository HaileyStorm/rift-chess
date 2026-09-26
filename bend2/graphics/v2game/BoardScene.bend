# Game-specific spatial chess renderer.  The reusable v2 library owns raster
# primitives; this adapter owns Rift topology, colors, chess cues and piece art.
import Base
import ../../core/Model.bend as Model
import ../Camera.bend as Camera
import ../Scene.bend as Scene
import ../../lib/graphics/Ortho.bend as Ortho
import ../../lib/graphics/Quad.bend as Quad
import ../../lib/grid8/Board.bend as Board
import ../../lib/graphics/v2/Facet.bend as Facet
import ../../lib/graphics/v2/Gradient.bend as Gradient
import ../../lib/graphics/v2/RaisedFacet.bend as RaisedFacet
import ../../lib/graphics/v2/Ring.bend as Ring
import ../../lib/graphics/v2/Rect.bend as Rect
import ../../lib/graphics/v2/Rounded.bend as Rounded
import ../../lib/graphics/v2/Shapes.bend as Shapes
import ../../lib/graphics/v2/Transform2D.bend as Transform
import ../../lib/grid8/SpatialBoard.bend as SpatialBoard
import ../../lib/grid8/SpatialFast.bend as SpatialFast
import ./PieceArt.bend as PieceArt
import ./Assets.bend as Assets
import ../../lib/graphics/v2/Color.bend as Color
import ./PieceSprites.bend as PieceSprites
import ./PieceAssets.bend as PieceAssets

type Corners is Data:
  Corners{p00: Quad.Point, p10: Quad.Point, p11: Quad.Point, p01: Quad.Point}

type Context is Data:
  Context{depth: Nat, size: U32, frame: Scene.Frame,
    camera: Camera.Basis, board: List<&2, U32>, oldBoard: List<&2, U32>,
    previous: Model.Position, holes: U32, action: U32,
    theme: U32}


def physical_scale(+size: U32) -> F32:
  F32.div(U32.to_f32(size), 512.0)

def scale_coord(size: U32, value: U32) -> U32:
  U32.div(U32.mul(size, value), 512)

def scale_float(size: U32, value: F32) -> F32:
  F32.mul(value, physical_scale(size))

def point(+basis: Camera.Basis, +size: U32, +file: F32, +row: F32) -> Quad.Point:
  Quad.Point{scale_float(size, Camera.project_x(basis, file, row)),
    scale_float(size, Camera.project_y(basis, file, row))}

def point_x(p: Quad.Point) -> F32:
  match p:
    case Quad.Point{x, y}: x

def point_y(p: Quad.Point) -> F32:
  match p:
    case Quad.Point{x, y}: y

def projected_square(+size: U32, +basis: Camera.Basis, +square: U32) -> Quad.Point:
  point(basis, size, U32.to_f32(Model.file_of(square)),
    U32.to_f32(U32.sub(7, Model.rank_of(square))))

def square_x(+size: U32, +basis: Camera.Basis, +square: U32) -> U32:
  Ortho.pixel(point_x(projected_square(size, basis, square)))

def square_y(+size: U32, +basis: Camera.Basis, +square: U32) -> U32:
  Ortho.pixel(point_y(projected_square(size, basis, square)))

def square_corners(+size: U32, +basis: Camera.Basis,
  +file: U32, +rank: U32) -> Corners:
  +f = U32.to_f32(file)
  +r = U32.to_f32(U32.sub(7, rank))
  +fm = F32.sub(f, 0.5)
  +fp = F32.add(f, 0.5)
  +rm = F32.sub(r, 0.5)
  +rp = F32.add(r, 0.5)
  Corners{point(basis, size, fm, rm), point(basis, size, fp, rm),
    point(basis, size, fp, rp), point(basis, size, fm, rp)}

def palette(theme: U32) -> SpatialBoard.Palette:
  Bool.pick(SpatialBoard.Palette, U32.is_zero(theme),
    SpatialBoard.Palette{11975600, 2704989, 9607822, 1848650,
      14265708, 727076, 15980965},
    SpatialBoard.Palette{14076072, 4806223, 11377530, 3424571,
      15712384, 1645336, 16769960})

def surface(+square: U32, +theme: U32) -> RaisedFacet.Surface:
  +file = Model.file_of(square)
  +row = U32.sub(7, Model.rank_of(square))
  +top = SpatialBoard.surface(U32.is_zero(U32.mod(U32.add(file, row), 2)), palette(theme))
  +light = Bool.pick(SpatialBoard.Light, U32.is_zero(theme),
    SpatialBoard.Light{7052970, 64, 2, 2},
    SpatialBoard.Light{15910261, 60, 2, 2})
  +lit = SpatialBoard.illuminate(top, light, file, row)
  +warmth = Bool.pick(SpatialBoard.Light, U32.is_zero(theme),
    SpatialBoard.Light{13608554, 34, 7, 6},
    SpatialBoard.Light{7249579, 28, 7, 6})
  SpatialBoard.illuminate(lit, warmth, file, row)

type ArchColors is Data:
  ArchColors{shadow: U32, stone: U32, trim: U32, light: U32,
    sky_top: U32, sky_bottom: U32}

def arch_colors(theme: U32) -> ArchColors:
  Bool.pick(ArchColors, U32.is_zero(theme),
    ArchColors{594206, 4608347, 11569746, 14468494, 1583686, 1120552},
    ArchColors{1249294, 5918011, 12753496, 15849115, 2635850, 1709328})

def arch_rect(+depth: Nat, +size: U32, +x: U32, +y: U32,
  width: U32, height: U32, color: U32, image: Image) -> Image:
  Rounded.draw(depth, size, Shapes.Pos{scale_coord(size, x)},
    Shapes.Pos{scale_coord(size, y)},
    Shapes.Pos{scale_coord(size, U32.add(x, width))},
    Shapes.Pos{scale_coord(size, U32.add(y, height))},
    scale_coord(size, 1), color, 255, image)

def arch_rect_alpha(+depth: Nat, +size: U32, +x: U32, +y: U32,
  width: U32, height: U32, color: U32, opacity: U32,
  image: Image) -> Image:
  Rounded.draw(depth, size, Shapes.Pos{scale_coord(size, x)},
    Shapes.Pos{scale_coord(size, y)},
    Shapes.Pos{scale_coord(size, U32.add(x, width))},
    Shapes.Pos{scale_coord(size, U32.add(y, height))},
    scale_coord(size, 1), color, opacity, image)

def arch_point(+size: U32, +x: U32, +y: U32) -> Quad.Point:
  Quad.Point{U32.to_f32(scale_coord(size, x)),
    U32.to_f32(scale_coord(size, y))}

def vault_point(+size: U32, +x: U32, +y: U32) -> Quad.Point:
  arch_point(size, x, U32.sub(y, 90))

def arch_facet(+depth: Nat, +size: U32, +a: Quad.Point, +b: Quad.Point,
  +c: Quad.Point, +d: Quad.Point, color: U32, image: Image) -> Image:
  Facet.draw(depth, size, Quad.make(a, b, c, d), color, 255, image)

def arch_panel(+depth: Nat, +size: U32, +a: Quad.Point, +b: Quad.Point,
  +c: Quad.Point, +d: Quad.Point, color: U32, opacity: U32,
  image: Image) -> Image:
  Facet.draw(depth, size, Quad.make(a, b, c, d), color, opacity, image)

def portal_vault(+depth: Nat, +size: U32, colors: ArchColors,
  image: Image) -> Image:
  match colors:
    case ArchColors{+shadow, +stone, +trim, light, sky_top, sky_bottom}:
      +left_low = arch_panel(depth, size,
        vault_point(size, 74, 302), vault_point(size, 92, 238),
        vault_point(size, 117, 245), vault_point(size, 104, 302),
        shadow, 242, image)
      +left_mid = arch_panel(depth, size,
        vault_point(size, 92, 238), vault_point(size, 127, 188),
        vault_point(size, 148, 205), vault_point(size, 117, 245),
        stone, 224, left_low)
      +left_upper = arch_panel(depth, size,
        vault_point(size, 127, 188), vault_point(size, 174, 148),
        vault_point(size, 194, 170), vault_point(size, 148, 205),
        shadow, 236, left_mid)
      +left_crown = arch_panel(depth, size,
        vault_point(size, 174, 148), vault_point(size, 225, 124),
        vault_point(size, 239, 150), vault_point(size, 194, 170),
        stone, 226, left_upper)
      +keystone = arch_panel(depth, size,
        vault_point(size, 225, 124), vault_point(size, 256, 117),
        vault_point(size, 256, 146), vault_point(size, 239, 150),
        trim, 122, left_crown)
      +right_crown = arch_panel(depth, size,
        vault_point(size, 256, 117), vault_point(size, 287, 124),
        vault_point(size, 273, 150), vault_point(size, 256, 146),
        trim, 122, keystone)
      +right_upper = arch_panel(depth, size,
        vault_point(size, 287, 124), vault_point(size, 338, 148),
        vault_point(size, 318, 170), vault_point(size, 273, 150),
        stone, 226, right_crown)
      +right_mid = arch_panel(depth, size,
        vault_point(size, 338, 148), vault_point(size, 385, 188),
        vault_point(size, 364, 205), vault_point(size, 318, 170),
        shadow, 236, right_upper)
      +right_high = arch_panel(depth, size,
        vault_point(size, 385, 188), vault_point(size, 420, 238),
        vault_point(size, 395, 245), vault_point(size, 364, 205),
        stone, 224, right_mid)
      arch_panel(depth, size,
        vault_point(size, 420, 238), vault_point(size, 438, 302),
        vault_point(size, 408, 302), vault_point(size, 395, 245),
        shadow, 242, right_high)

def gallery(+depth: Nat, +size: U32, +colors: ArchColors,
  image: Image) -> Image:
  match colors:
    case ArchColors{+shadow, +stone, +trim, +light, sky_top, sky_bottom}:
      +back = arch_rect(depth, size, 82, 53, 348, 99, shadow, image)
      +recess_left = arch_rect(depth, size, 119, 67, 37, 59, sky_bottom, back)
      +recess_mid_left = arch_rect(depth, size, 199, 67, 37, 59, sky_bottom, recess_left)
      +recess_mid_right = arch_rect(depth, size, 279, 67, 37, 59, sky_bottom, recess_mid_left)
      +recess_right = arch_rect(depth, size, 359, 67, 37, 59, sky_bottom, recess_mid_right)
      +upper_lintel = arch_rect(depth, size, 76, 48, 360, 16, stone, recess_right)
      +lintel_edge = arch_rect_alpha(depth, size, 88, 51, 336, 2, trim, 94, upper_lintel)
      +left = arch_rect(depth, size, 107, 63, 13, 74, stone, lintel_edge)
      +middle_left = arch_rect(depth, size, 188, 63, 12, 74, stone, left)
      +middle_right = arch_rect(depth, size, 316, 63, 12, 74, stone, middle_left)
      +right = arch_rect(depth, size, 397, 63, 13, 74, stone, middle_right)
      +left_window = arch_rect_alpha(depth, size, 126, 76, 5, 39, light, 172, right)
      +inner_left = arch_rect_alpha(depth, size, 206, 76, 5, 39, light, 172, left_window)
      +inner_right = arch_rect_alpha(depth, size, 286, 76, 5, 39, light, 172, inner_left)
      +right_window = arch_rect_alpha(depth, size, 366, 76, 5, 39, light, 172, inner_right)
      +lower_lintel = arch_rect(depth, size, 90, 128, 332, 15, shadow, right_window)
      arch_rect_alpha(depth, size, 100, 129, 312, 3, trim, 84, lower_lintel)

def pillar(+depth: Nat, +size: U32, +x: U32,
  +colors: ArchColors, image: Image) -> Image:
  match colors:
    case ArchColors{+shadow, +stone, +trim, +light, sky_top, sky_bottom}:
      +back = arch_rect(depth, size, x, 130, 34, 291, shadow, image)
      +shaft = arch_rect(depth, size, U32.add(x, 5), 136, 24, 276, stone, back)
      +inner = arch_rect(depth, size, U32.add(x, 10), 142, 4, 264, trim, shaft)
      +outer = arch_rect(depth, size, U32.add(x, 25), 142, 3, 264, light, inner)
      +capital = arch_rect(depth, size, U32.sub(x, 5), 119, 44, 16, trim, outer)
      +caplight = arch_rect(depth, size, U32.sub(x, 1), 115, 36, 5, light, capital)
      +base = arch_rect(depth, size, U32.sub(x, 6), 419, 46, 16, shadow, caplight)
      arch_rect(depth, size, U32.sub(x, 1), 415, 36, 6, trim, base)

def observatory(+depth: Nat, +size: U32, +colors: ArchColors,
  image: Image) -> Image:
  match colors:
    case ArchColors{+shadow, +stone, +trim, +light, sky_top, sky_bottom}:
      +gallery = gallery(depth, size, colors, image)
      +left = pillar(depth, size, 28, colors, gallery)
      +right = pillar(depth, size, 450, colors, left)
      +vault = portal_vault(depth, size, colors, right)
      +left_leg = arch_facet(depth, size,
        arch_point(size, 243, 279), arch_point(size, 253, 279),
        arch_point(size, 174, 437), arch_point(size, 163, 437), stone, vault)
      +right_leg = arch_facet(depth, size,
        arch_point(size, 259, 279), arch_point(size, 269, 279),
        arch_point(size, 349, 437), arch_point(size, 338, 437), stone, left_leg)
      +tube = arch_facet(depth, size,
        arch_point(size, 337, 243), arch_point(size, 354, 258),
        arch_point(size, 192, 415), arch_point(size, 176, 403), shadow, right_leg)
      +tube_light = arch_facet(depth, size,
        arch_point(size, 337, 249), arch_point(size, 343, 255),
        arch_point(size, 184, 408), arch_point(size, 177, 402), trim, tube)
      +lens = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 346)},
        Shapes.Pos{scale_coord(size, 251)}, scale_coord(size, 6), light, 150, tube_light)
      +stand = arch_rect(depth, size, 224, 431, 64, 9, shadow, lens)
      arch_rect(depth, size, 234, 425, 44, 6, trim, stand)

def underlay.colors(+depth: Nat, +size: U32,
  +colors: ArchColors) -> Image:
  match colors:
    case ArchColors{+shadow, +stone, +trim, light, +sky_top, +sky_bottom}:
      +band = U32.max(1, U32.div(size, 32))
      +sky = Gradient.vertical(depth, size, band, 0, size, sky_top, sky_bottom)
      +sky_star_a = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 64)},
        Shapes.Pos{scale_coord(size, 99)}, scale_coord(size, 1), light, 112, sky)
      +sky_star_b = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 448)},
        Shapes.Pos{scale_coord(size, 92)}, scale_coord(size, 1), light, 104, sky_star_a)
      +sky_star_c = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 82)},
        Shapes.Pos{scale_coord(size, 31)}, scale_coord(size, 1), light, 92, sky_star_b)
      +sky_stars = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 430)},
        Shapes.Pos{scale_coord(size, 36)}, scale_coord(size, 1), light, 88, sky_star_c)
      +cloud = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 256)},
        Shapes.Neg{scale_coord(size, 6)}, scale_coord(size, 280),
        stone, 34, sky_stars)
      +building = observatory(depth, size, colors, cloud)
      +shaft = arch_panel(depth, size,
        arch_point(size, 224, 260), arch_point(size, 288, 260),
        arch_point(size, 368, 500), arch_point(size, 144, 500),
        1583686, 72, building)
      +well = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 256)},
        Shapes.Pos{scale_coord(size, 274)}, scale_coord(size, 84),
        594206, 238, shaft)
      +core = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 256)},
        Shapes.Pos{scale_coord(size, 274)}, scale_coord(size, 58),
        sky_bottom, 186, well)
      +shaft_glow = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 256)},
        Shapes.Pos{scale_coord(size, 268)}, scale_coord(size, 15),
        2635850, 142, core)
      +star_a = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 219)},
        Shapes.Pos{scale_coord(size, 260)}, scale_coord(size, 1), light, 166, shaft_glow)
      +star_b = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 291)},
        Shapes.Pos{scale_coord(size, 269)}, scale_coord(size, 1), light, 160, star_a)
      +star_c = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 248)},
        Shapes.Pos{scale_coord(size, 301)}, scale_coord(size, 1), light, 184, star_b)
      +star_d = Shapes.disk(depth, size, Shapes.Pos{scale_coord(size, 266)},
        Shapes.Pos{scale_coord(size, 248)}, scale_coord(size, 1), light, 154, star_c)
      star_d

def underlay.for_theme(+depth: Nat, +size: U32, theme: U32) -> Image:
  underlay.colors(depth, size, arch_colors(theme))

def underlay(+depth: Nat, +size: U32) -> Image:
  underlay.for_theme(depth, size, 0)

def underlay512_theme(theme: U32) -> Image:
  underlay.for_theme(9n, 512, theme)

def underlay256_theme(theme: U32) -> Image:
  underlay.for_theme(8n, 256, theme)

def underlay1024_theme(theme: U32) -> Image:
  underlay.for_theme(10n, 1024, theme)

def underlay512() -> Image:
  underlay512_theme(0)

def underlay1024() -> Image:
  underlay1024_theme(0)

def extrusion(+size: U32, +basis: Camera.Basis) -> F32:
  F32.mul(F32.mul(U32.to_f32(Camera.extrusion(basis)), 4.0),
    physical_scale(size))

def tile.with_corners(show: Bool, +depth: Nat, +size: U32, square: U32,
  +camera: Camera.Basis, theme: U32, corners: Corners,
  image: Image) -> Image:
  match corners:
    case Corners{+p00, +p10, +p11, +p01}:
      RaisedFacet.draw_cell(show, depth, size, p00, p10, p11, p01,
        0.0, extrusion(size, camera), surface(square, theme), image)

def center_point(+a: Quad.Point, +b: Quad.Point) -> Quad.Point:
  Quad.Point{F32.mul(F32.add(point_x(a), point_x(b)), 0.5),
    F32.mul(F32.add(point_y(a), point_y(b)), 0.5)}

def inset_point(+point: Quad.Point, +center: Quad.Point) -> Quad.Point:
  Quad.Point{F32.lerp(point_x(point), point_x(center), 0.075),
    F32.lerp(point_y(point), point_y(center), 0.075)}

def outline_edges(+depth: Nat, +size: U32, +p00: Quad.Point,
  +p10: Quad.Point, +p11: Quad.Point, +p01: Quad.Point,
  +color: U32, +opacity: U32, image: Image) -> Image:
  +center = center_point(p00, p11)
  +q00 = inset_point(p00, center)
  +q10 = inset_point(p10, center)
  +q11 = inset_point(p11, center)
  +q01 = inset_point(p01, center)
  +top = Facet.draw(depth, size, Quad.make(p00, p10, q10, q00), color, opacity, image)
  +right = Facet.draw(depth, size, Quad.make(p10, p11, q11, q10), color, opacity, top)
  +bottom = Facet.draw(depth, size, Quad.make(p11, p01, q01, q11), color, opacity, right)
  Facet.draw(depth, size, Quad.make(p01, p00, q00, q01), color, opacity, bottom)

def rim_inset(+point: Quad.Point, +center: Quad.Point) -> Quad.Point:
  Quad.Point{F32.lerp(point_x(point), point_x(center), 0.055),
    F32.lerp(point_y(point), point_y(center), 0.055)}

def rim_edge(show: Bool, +depth: Nat, +size: U32, +a: Quad.Point,
  +b: Quad.Point, +inner_a: Quad.Point, +inner_b: Quad.Point,
  +color: U32, +opacity: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: Facet.draw(depth, size, Quad.make(a, b, inner_b, inner_a),
      color, opacity, image)

def missing_file_left_case(edge: Bool, +file: U32, rank: U32,
  holes: U32) -> Bool:
  match edge:
    case True{}: False{}
    case False{}: Bool.not(Model.present(holes, Model.sq(U32.sub(file, 1), rank)))

def missing_file_left(+file: U32, rank: U32, holes: U32) -> Bool:
  missing_file_left_case(U32.is_zero(file), file, rank, holes)

def missing_file_right_case(edge: Bool, +file: U32, rank: U32,
  holes: U32) -> Bool:
  match edge:
    case True{}: Bool.not(Model.present(holes, Model.sq(U32.add(file, 1), rank)))
    case False{}: False{}

def missing_file_right(+file: U32, rank: U32, holes: U32) -> Bool:
  missing_file_right_case(U32.is_lt(file, 7), file, rank, holes)

def missing_rank_down_case(edge: Bool, file: U32, +rank: U32,
  holes: U32) -> Bool:
  match edge:
    case True{}: False{}
    case False{}: Bool.not(Model.present(holes, Model.sq(file, U32.sub(rank, 1))))

def missing_rank_down(file: U32, +rank: U32, holes: U32) -> Bool:
  missing_rank_down_case(U32.is_zero(rank), file, rank, holes)

def missing_rank_up_case(edge: Bool, file: U32, +rank: U32,
  holes: U32) -> Bool:
  match edge:
    case True{}: Bool.not(Model.present(holes, Model.sq(file, U32.add(rank, 1))))
    case False{}: False{}

def missing_rank_up(file: U32, +rank: U32, holes: U32) -> Bool:
  missing_rank_up_case(U32.is_lt(rank, 7), file, rank, holes)

def palette_edge(colors: SpatialBoard.Palette) -> U32:
  match colors:
    case SpatialBoard.Palette{light, dark, light_side, dark_side, +edge, shadow, glint}:
      edge

def rim_color(theme: U32) -> U32:
  palette_edge(palette(theme))

def cutout_rim_edges(+file: U32, +rank: U32, +holes: U32,
  corners: Corners, +depth: Nat, +size: U32, +color: U32,
  +opacity: U32, image: Image) -> Image:
  match corners:
    case Corners{+p00, +p10, +p11, +p01}:
      +center = center_point(p00, p11)
      +q00 = rim_inset(p00, center)
      +q10 = rim_inset(p10, center)
      +q11 = rim_inset(p11, center)
      +q01 = rim_inset(p01, center)
      +up = rim_edge(missing_rank_up(file, rank, holes), depth, size,
        p00, p10, q00, q10, color, opacity, image)
      +right = rim_edge(missing_file_right(file, rank, holes), depth, size,
        p10, p11, q10, q11, color, opacity, up)
      +down = rim_edge(missing_rank_down(file, rank, holes), depth, size,
        p11, p01, q11, q01, color, opacity, right)
      rim_edge(missing_file_left(file, rank, holes), depth, size,
        p01, p00, q01, q00, color, opacity, down)

def cutout_rim(+square: U32, +depth: Nat, +size: U32,
  +holes: U32, +theme: U32, corners: Corners, image: Image) -> Image:
  cutout_rim_edges(Model.file_of(square), Model.rank_of(square), holes,
    corners, depth, size, rim_color(theme), 84, image)

def outline_corners(corners: Corners, +depth: Nat, +size: U32,
  color: U32, opacity: U32, image: Image) -> Image:
  match corners:
    case Corners{+p00, +p10, +p11, +p01}:
      outline_edges(depth, size, p00, p10, p11, p01, color, opacity, image)

def square_outline(show: Bool, +square: U32, color: U32, opacity: U32,
  +c: Context, image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +corners = square_corners(size, camera, Model.file_of(square), Model.rank_of(square))
      outline_corners(corners, depth, size, color, opacity, image)

def tile(show: Bool, +square: U32, +c: Context, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}:
      match c:
        case Context{depth, +size, frame, +camera, board, oldBoard,
            previous, +holes, action, +theme}:
          +corners = square_corners(size, camera,
            Model.file_of(square), Model.rank_of(square))
          +tiled = tile.with_corners(True{}, depth, size, square, camera,
            theme, corners, image)
          cutout_rim(square, depth, size, holes, theme, corners, tiled)

def progress(frame: Scene.Frame) -> U32:
  U32.min(Scene.frame_progress(frame), 16)

def motion_source.action(action: Model.Action, +square: U32) -> U32:
  match action:
    case Model.MoveAction{from, to, promotion}:
      Bool.pick(U32, U32.is_eq(square, to), from, square)
    case Model.ShiftAction{from, to, promotion}:
      Bool.pick(U32, U32.is_eq(Model.macro_of(square), to),
        Model.square_in_macro(from, U32.add(U32.mod(Model.file_of(square), 2),
          U32.mul(U32.mod(Model.rank_of(square), 2), 2))), square)

def motion_source(decoded: Maybe<Model.Action>, +square: U32) -> U32:
  match decoded:
    case None{}: square
    case Some{action}: motion_source.action(action, square)

def interpolated_point(+size: U32, +basis: Camera.Basis, +source: U32,
  +dest: U32, +amount: U32) -> Quad.Point:
  +from = projected_square(size, basis, source)
  +to = projected_square(size, basis, dest)
  +t = F32.div(U32.to_f32(amount), 16.0)
  +lift = scale_coord(size, U32.div(U32.mul(amount, U32.sub(16, amount)), 4))
  Quad.Point{F32.lerp(point_x(from), point_x(to), t),
    F32.sub(F32.lerp(point_y(from), point_y(to), t), U32.to_f32(lift))}

def piece_at(show: Bool, +square: U32, code: U32, +c: Context,
  image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, +frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +source = motion_source(Model.decode(action), square)
      +moving_point = interpolated_point(size, camera, source, square, progress(frame))
      +x = Ortho.pixel(point_x(moving_point))
      +y = Ortho.pixel(point_y(moving_point))
      +selected_here = U32.is_eq(square, Scene.frame_selected(frame))
      +hovered_here = U32.is_eq(square, Scene.frame_hovered(frame))
      +focus = Bool.or(selected_here, hovered_here)
      +focus_color = Bool.pick(U32, selected_here, 16169039, 6282451)
      +drawn = PieceArt.draw(depth, size, x, y, code, image)
      PieceArt.focus_rim(focus, depth, size, x, y, focus_color, drawn)

def captured_square(decoded: Maybe<Model.Action>, +previous: Model.Position) -> U32:
  match decoded:
    case None{}: 64
    case Some{action}:
      match action:
        case Model.ShiftAction{from, to, promotion}: 64
        case Model.MoveAction{+from, +to, promotion}:
          +board = Model.pos_board(previous)
          +ep = Bool.and(U32.is_eq(to, Model.pos_ep(previous)),
            Model.is_pawn(Model.board_get(board, from)))
          Bool.pick(U32, Model.occupied(Model.board_get(board, to)), to,
            Bool.pick(U32, ep, Model.pos_ep_pawn(previous), 64))

def dying_at(show: Bool, +square: U32, +c: Context, image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, board, +oldBoard,
        previous, holes, action, theme}:
      +age = progress(frame)
      +x = square_x(size, camera, square)
      +y = square_y(size, camera, square)
      +drift = scale_coord(size, U32.div(age, 2))
      +lift = scale_coord(size, age)
      +dead_x = Bool.pick(U32, U32.is_even(age), U32.add(x, drift), U32.sub(x, drift))
      +dead_y = U32.sub(y, lift)
      PieceArt.draw(depth, size, dead_x, dead_y,
        Model.board_get(oldBoard, square), image)

def dying_visible(+square: U32, +c: Context) -> Bool:
  match c:
    case Context{depth, size, frame, camera, board, +oldBoard,
        +previous, holes, +action, theme}:
      +victim = captured_square(Model.decode(action), previous)
      Bool.and(U32.is_eq(square, victim),
        Bool.and(U32.is_lt(progress(frame), 8),
          Model.occupied(Model.board_get(oldBoard, square))))

def ground_tile_layer(+square: U32, +c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, frame, camera, board, oldBoard,
        previous, holes, action, theme}:
      +present = Model.present(holes, square)
      tile(present, square, c, image)

def ground_tiles(order: List<&2, U32>, +c: Context, image: Image) -> Image:
  match order:
    case Nil{}: image
    case +square <> rest:
      ground_tiles(rest, c, ground_tile_layer(square, c, image))

def piece_layer(+square: U32, +c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, frame, camera, +board, oldBoard,
        previous, holes, action, theme}:
      +present = Model.present(holes, square)
      +victim_image = dying_at(Bool.and(present, dying_visible(square, c)),
        square, c, image)
      piece_at(Bool.and(present, Model.occupied(Model.board_get(board, square))),
        square, Model.board_get(board, square), c, victim_image)

def piece_layers(order: List<&2, U32>, +c: Context, image: Image) -> Image:
  match order:
    case Nil{}: image
    case +square <> rest:
      piece_layers(rest, c, piece_layer(square, c, image))

def fast_piece_at(show: Bool, +square: U32, code: U32, +c: Context,
  image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, +frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +source = motion_source(Model.decode(action), square)
      +moving_point = interpolated_point(size, camera, source, square, progress(frame))
      +x = Ortho.pixel(point_x(moving_point))
      +y = Ortho.pixel(point_y(moving_point))
      +selected_here = U32.is_eq(square, Scene.frame_selected(frame))
      +drawn = PieceArt.proxy_draw(depth, size, x, y, code, image)
      PieceArt.focus_rim(selected_here, depth, size, x, y, 16169039, drawn)

def fast_dying_at(show: Bool, +square: U32, +c: Context, image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, board, +oldBoard,
        previous, holes, action, theme}:
      +age = progress(frame)
      +x = square_x(size, camera, square)
      +y = square_y(size, camera, square)
      +drift = scale_coord(size, U32.div(age, 2))
      +lift = scale_coord(size, age)
      +dead_x = Bool.pick(U32, U32.is_even(age), U32.add(x, drift), U32.sub(x, drift))
      +dead_y = U32.sub(y, lift)
      PieceArt.proxy_draw(depth, size, dead_x, dead_y,
        Model.board_get(oldBoard, square), image)

def fast_piece_layer(+square: U32, +c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, frame, camera, +board, oldBoard,
        previous, holes, action, theme}:
      +present = Model.present(holes, square)
      +victim_image = fast_dying_at(Bool.and(present, dying_visible(square, c)),
        square, c, image)
      fast_piece_at(Bool.and(present, Model.occupied(Model.board_get(board, square))),
        square, Model.board_get(board, square), c, victim_image)

def fast_piece_layers(order: List<&2, U32>, +c: Context, image: Image) -> Image:
  match order:
    case Nil{}: image
    case +square <> rest:
      fast_piece_layers(rest, c, fast_piece_layer(square, c, image))

def camera_piece_at(show: Bool, +square: U32, code: U32, +c: Context,
  image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, +frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +source = motion_source(Model.decode(action), square)
      +moving_point = interpolated_point(size, camera, source, square, progress(frame))
      +x = Ortho.pixel(point_x(moving_point))
      +y = Ortho.pixel(point_y(moving_point))
      +selected_here = U32.is_eq(square, Scene.frame_selected(frame))
      +drawn = PieceArt.camera_draw_min(depth, size, x, y, code, image)
      PieceArt.focus_rim(selected_here, depth, size, x, y, 16169039, drawn)

def camera_dying_at(show: Bool, +square: U32, +c: Context,
  image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, board, +oldBoard,
        previous, holes, action, theme}:
      +age = progress(frame)
      +x = square_x(size, camera, square)
      +y = square_y(size, camera, square)
      +drift = scale_coord(size, U32.div(age, 2))
      +lift = scale_coord(size, age)
      +dead_x = Bool.pick(U32, U32.is_even(age), U32.add(x, drift), U32.sub(x, drift))
      +dead_y = U32.sub(y, lift)
      PieceArt.camera_draw_min(depth, size, dead_x, dead_y,
        Model.board_get(oldBoard, square), image)

def camera_piece_layer(+square: U32, +c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, frame, camera, +board, oldBoard,
        previous, holes, action, theme}:
      +present = Model.present(holes, square)
      +victim = camera_dying_at(Bool.and(present, dying_visible(square, c)),
        square, c, image)
      camera_piece_at(Bool.and(present, Model.occupied(Model.board_get(board, square))),
        square, Model.board_get(board, square), c, victim)

def camera_piece_layers(order: List<&2, U32>, +c: Context,
  image: Image) -> Image:
  match order:
    case Nil{}: image
    case +square <> rest:
      camera_piece_layers(rest, c, camera_piece_layer(square, c, image))

# Fast camera preview: draw fresh top faces over a caller-cached underlay.
# Build it with underlay512_theme/underlay1024_theme for frame.theme; the base
# must contain no old board, tile or piece pixels.
def presence_word(+remaining: Nat, +index: U32, +holes: U32) -> U32:
  match remaining:
    case 0n: 0
    case 1n+rest:
      +file = U32.mod(index, 8)
      +row = U32.div(index, 8)
      +square = Model.sq(file, U32.sub(7, row))
      +bit = Bool.pick(U32, Model.present(holes, square),
        U32.shln(1, U32.to_nat(U32.mod(index, 32))), 0)
      U32.or(bit, presence_word(rest, U32.add(index, 1), holes))

def presence_mask(+holes: U32) -> Board.Mask:
  Board.Mask{presence_word(32n, 0, holes),
    presence_word(32n, 32, holes)}

def fast_affine.from_edges(origin: Quad.Point, file_edge: Quad.Point,
  row_edge: Quad.Point) -> SpatialFast.Affine:
  match origin file_edge row_edge:
    case Quad.Point{+ox, +oy} Quad.Point{+fx, +fy} Quad.Point{+rx, +ry}:
      SpatialFast.Affine{ox, oy, F32.sub(fx, ox), F32.sub(fy, oy),
        F32.sub(rx, ox), F32.sub(ry, oy)}

def fast_affine(+size: U32, +basis: Camera.Basis) -> SpatialFast.Affine:
  +negative_half = F32.neg(0.5)
  +positive_half = F32.add(0.0, 0.5)
  fast_affine.from_edges(point(basis, size, negative_half, negative_half),
    point(basis, size, positive_half, negative_half),
    point(basis, size, negative_half, positive_half))

def macro_center(+size: U32, +basis: Camera.Basis, +macro: U32) -> Quad.Point:
  +file = F32.add(U32.to_f32(U32.mul(U32.mod(macro, 4), 2)), 0.5)
  +rank = F32.add(U32.to_f32(U32.mul(U32.div(macro, 4), 2)), 0.5)
  point(basis, size, file, F32.sub(7.0, rank))

def point_pixel_x(p: Quad.Point) -> U32:
  Ortho.pixel(point_x(p))

def point_pixel_y(p: Quad.Point) -> U32:
  Ortho.pixel(point_y(p))

def circle_mark(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +inner: U32, +outer: U32, color: U32, opacity: U32, image: Image) -> Image:
  Ring.draw(depth, size, Shapes.Pos{x}, Shapes.Pos{y},
    scale_coord(size, inner), scale_coord(size, outer), color, opacity, image)

def square_ring(show: Bool, +square: U32, +inner: U32, +outer: U32,
  color: U32, opacity: U32, +c: Context, image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      circle_mark(depth, size, square_x(size, camera, square),
        square_y(size, camera, square), inner, outer, color, opacity, image)

def target_mark(capture: Bool, +square: U32, +c: Context, image: Image) -> Image:
  match capture c:
    case False{} Context{depth, +size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +ring = square_ring(True{}, square, 8, 10, 4638419, 205, c, image)
      circle_mark(depth, size, square_x(size, camera, square),
        square_y(size, camera, square), 0, 3, 6608860, 198, ring)
    case True{} _:
      +outer = square_ring(True{}, square, 17, 19, 16731983, 240, c, image)
      square_ring(True{}, square, 22, 24, 16768672, 220, c, outer)

def target_marks(targets: List<&2, U32>, +board: List<&2, U32>,
  +c: Context, image: Image) -> Image:
  match targets:
    case Nil{}: image
    case +square <> rest:
      target_marks(rest, board, c,
        target_mark(Model.occupied(Model.board_get(board, square)), square, c, image))

def macro_ring(show: Bool, +macro: U32, +inner: U32, +outer: U32,
  color: U32, +c: Context, image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, camera, board, oldBoard,
        previous, holes, action, theme}:
      +center = macro_center(size, camera, macro)
      circle_mark(depth, size, point_pixel_x(center), point_pixel_y(center),
        inner, outer, color, 255, image)

def macro_marks(macros: List<&2, U32>, +c: Context, image: Image) -> Image:
  match macros:
    case Nil{}: image
    case +macro <> rest:
      macro_marks(rest, c, macro_ring(True{}, macro, 31, 33, 6608860, c, image))

def shift_mark(+pair: U32, selected: U32, +c: Context, image: Image) -> Image:
  +from = U32.div(pair, 16)
  +to = U32.mod(pair, 16)
  +strong = U32.is_eq(from, selected)
  macro_ring(True{}, to, 21, 23,
    Bool.pick(U32, strong, 16768672, 4638419), c, image)

def shift_marks(pairs: List<&2, U32>, +selected: U32,
  +c: Context, image: Image) -> Image:
  match pairs:
    case Nil{}: image
    case +pair <> rest:
      shift_marks(rest, selected, c, shift_mark(pair, selected, c, image))

def promotion_mark.ready(show: Bool, +depth: Nat, +size: U32,
  +camera: Camera.Basis, +to: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}:
      +x = square_x(size, camera, to)
      +y = square_y(size, camera, to)
      +top = U32.sub(y, scale_coord(size, 46))
      circle_mark(depth, size, x, top, 4, 7, 16768672, 255, image)

def promotion_mark.action(action: Model.Action, +c: Context, image: Image) -> Image:
  match action:
    case Model.ShiftAction{from, to, promotion}: image
    case Model.MoveAction{+from, +to, +promotion}:
      match c:
        case Context{depth, +size, frame, +camera, board, oldBoard,
            previous, holes, action, theme}:
          promotion_mark.ready(U32.is_gt(promotion, 0), depth, size,
            camera, to, image)

def promotion_mark(decoded: Maybe<Model.Action>, +c: Context, image: Image) -> Image:
  match decoded:
    case None{}: image
    case Some{action}: promotion_mark.action(action, c, image)

def recent_marks.action(action: Model.Action, +c: Context, image: Image) -> Image:
  match action:
    case Model.MoveAction{+from, +to, promotion}:
      +a = square_ring(True{}, from, 20, 21, 7112872, 148, c, image)
      square_ring(True{}, to, 20, 21, 7112872, 148, c, a)
    case Model.ShiftAction{from, +to, promotion}:
      macro_ring(True{}, to, 25, 29, 7112872, c, image)

def recent_marks(decoded: Maybe<Model.Action>, +c: Context, image: Image) -> Image:
  match decoded:
    case None{}: image
    case Some{action}: recent_marks.action(action, c, image)

def feedback(+c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, +frame, camera, +board, oldBoard,
        previous, holes, +action, theme}:
      +selected = Scene.frame_selected(frame)
      +hovered = Scene.frame_hovered(frame)
      +check = Scene.frame_check(frame)
      +tile = Scene.frame_tile(frame)
      +a = recent_marks(Model.decode(action), c, image)
      +b = square_outline(U32.is_lt(check, 64), check,
        16731983, 255, c, a)
      +same = U32.is_eq(selected, hovered)
      +c_hover = square_outline(Bool.and(U32.is_lt(hovered, 64), Bool.not(same)),
        hovered, 6282451, 224, c, b)
      +d = macro_marks(Scene.frame_tileTargets(frame), c, c_hover)
      +e = macro_ring(U32.is_lt(tile, 16), tile, 37, 39,
        16768672, c, d)
      +f = square_outline(U32.is_lt(selected, 64), selected,
        16768672, 255, c, e)
      +g = target_marks(Scene.frame_targets(frame), board, c, f)
      +h = shift_marks(Scene.frame_shifts(frame), tile, c, g)
      promotion_mark(Model.decode(action), c, h)

def capture_effect.show(show: Bool, +square: U32, +c: Context,
  image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +age = progress(frame)
      +radius = U32.add(7, age)
      +inner = U32.sub(radius, 2)
      +opacity = U32.sub(255, U32.mul(age, 10))
      +x = square_x(size, camera, square)
      +y = square_y(size, camera, square)
      +flash = circle_mark(depth, size, x, y, inner, radius,
        16731983, opacity, image)
      circle_mark(depth, size, x, y, U32.add(radius, 3),
        U32.add(radius, 5), 16768672, U32.div(opacity, 2), flash)

def capture_effect(+c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, frame, camera, board, oldBoard,
        +previous, holes, +action, theme}:
      +victim = captured_square(Model.decode(action), previous)
      capture_effect.show(Bool.and(U32.is_lt(victim, 64),
        U32.is_lt(progress(frame), 16)), victim, c, image)

def fast_square_dot(show: Bool, +square: U32, +radius: U32,
  color: U32, opacity: U32, +c: Context, image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      Shapes.disk(depth, size, Shapes.Pos{square_x(size, camera, square)},
        Shapes.Pos{square_y(size, camera, square)}, scale_coord(size, radius),
        color, opacity, image)

def fast_target(capture: Bool, +square: U32, +c: Context, image: Image) -> Image:
  match capture:
    case False{}: fast_square_dot(True{}, square, 4, 4638419, 238, c, image)
    case True{}:
      +outer = square_ring(True{}, square, 16, 18, 16731983, 220, c, image)
      square_ring(True{}, square, 22, 24, 16768672, 200, c, outer)

def fast_targets(targets: List<&2, U32>, +board: List<&2, U32>,
  +c: Context, image: Image) -> Image:
  match targets:
    case Nil{}: image
    case +square <> rest:
      fast_targets(rest, board, c,
        fast_target(Model.occupied(Model.board_get(board, square)), square, c, image))

def fast_macro_targets(macros: List<&2, U32>, +c: Context,
  image: Image) -> Image:
  match macros:
    case Nil{}: image
    case +macro <> rest:
      fast_macro_targets(rest, c,
        macro_ring(True{}, macro, 29, 31, 4638419, c, image))

def fast_shift_mark(+pair: U32, selected: U32, +c: Context,
  image: Image) -> Image:
  +from = U32.div(pair, 16)
  +to = U32.mod(pair, 16)
  +color = Bool.pick(U32, U32.is_eq(from, selected), 16768672, 4638419)
  macro_ring(True{}, to, 21, 23, color, c, image)

def fast_shift_marks(pairs: List<&2, U32>, +selected: U32,
  +c: Context, image: Image) -> Image:
  match pairs:
    case Nil{}: image
    case +pair <> rest:
      fast_shift_marks(rest, selected, c, fast_shift_mark(pair, selected, c, image))

def fast_recent.action(action: Model.Action, +c: Context, image: Image) -> Image:
  match action:
    case Model.MoveAction{+from, +to, promotion}:
      +a = square_ring(True{}, from, 20, 21, 7112872, 138, c, image)
      square_ring(True{}, to, 20, 21, 7112872, 138, c, a)
    case Model.ShiftAction{from, +to, promotion}:
      macro_ring(True{}, to, 25, 28, 7112872, c, image)

def fast_recent(decoded: Maybe<Model.Action>, +c: Context, image: Image) -> Image:
  match decoded:
    case None{}: image
    case Some{action}: fast_recent.action(action, c, image)

def fast_promotion.ready(show: Bool, +depth: Nat, +size: U32,
  +camera: Camera.Basis, +to: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}:
      +x = square_x(size, camera, to)
      +y = U32.sub(square_y(size, camera, to), scale_coord(size, 45))
      Shapes.disk(depth, size, Shapes.Pos{x}, Shapes.Pos{y}, scale_coord(size, 4),
        16768672, 245, image)

def fast_promotion.action(action: Model.Action, +c: Context,
  image: Image) -> Image:
  match action:
    case Model.ShiftAction{from, to, promotion}: image
    case Model.MoveAction{+from, +to, +promotion}:
      match c:
        case Context{depth, +size, frame, +camera, board, oldBoard,
            previous, holes, action, theme}:
          fast_promotion.ready(U32.is_gt(promotion, 0), depth, size,
            camera, to, image)

def fast_promotion(decoded: Maybe<Model.Action>, +c: Context,
  image: Image) -> Image:
  match decoded:
    case None{}: image
    case Some{action}: fast_promotion.action(action, c, image)

def fast_feedback_static(+c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, +frame, camera, +board, oldBoard,
        previous, holes, +action, theme}:
      +selected = Scene.frame_selected(frame)
      +check = Scene.frame_check(frame)
      +tile = Scene.frame_tile(frame)
      +a = fast_recent(Model.decode(action), c, image)
      +b = square_outline(U32.is_lt(check, 64), check,
        16731983, 255, c, a)
      +d = fast_macro_targets(Scene.frame_tileTargets(frame), c, b)
      +e = macro_ring(U32.is_lt(tile, 16), tile, 36, 38,
        16768672, c, d)
      +f = square_outline(U32.is_lt(selected, 64), selected,
        16768672, 255, c, e)
      +g = fast_targets(Scene.frame_targets(frame), board, c, f)
      +i = fast_shift_marks(Scene.frame_shifts(frame), tile, c, g)
      fast_promotion(Model.decode(action), c, i)

def cue_list_nonempty(items: List<&2, U32>) -> Bool:
  match items:
    case Nil{}: False{}
    case head <> tail: True{}

def action_present(decoded: Maybe<Model.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{action}: True{}

def fast_camera_feedback.show(show: Bool, +context: Context,
  image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: fast_feedback_static(context, image)

def fast_camera_feedback(+context: Context, image: Image) -> Image:
  match context:
    case Context{depth, size, +frame, camera, board, oldBoard, previous,
        holes, +action, theme}:
      +selected = Scene.frame_selected(frame)
      +check = Scene.frame_check(frame)
      +tile = Scene.frame_tile(frame)
      +has_cue = Bool.or(Bool.or(U32.is_lt(selected, 64), U32.is_lt(check, 64)),
        Bool.or(U32.is_lt(tile, 16),
          Bool.or(Bool.or(cue_list_nonempty(Scene.frame_tileTargets(frame)),
            cue_list_nonempty(Scene.frame_targets(frame))),
            Bool.or(cue_list_nonempty(Scene.frame_shifts(frame)),
              action_present(Model.decode(action))))))
      fast_camera_feedback.show(has_cue, context, image)

def fast_hover_piece(show: Bool, +square: U32, +c: Context,
  image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, +frame, +camera, +board, oldBoard,
        previous, +holes, action, theme}:
      +occupied = Model.occupied(Model.board_get(board, square))
      +different = Bool.not(U32.is_eq(square, Scene.frame_selected(frame)))
      +visible = Bool.and(Model.present(holes, square),
        Bool.and(occupied, different))
      +x = square_x(size, camera, square)
      +y = square_y(size, camera, square)
      PieceArt.focus_rim(visible, depth, size, x, y, 6282451, image)

def fast_hover(+c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, +frame, camera, board, oldBoard,
        previous, holes, action, theme}:
      +selected = Scene.frame_selected(frame)
      +hovered = Scene.frame_hovered(frame)
      +piece_rim = fast_hover_piece(U32.is_lt(hovered, 64), hovered, c, image)
      square_outline(Bool.and(U32.is_lt(hovered, 64),
        Bool.not(U32.is_eq(selected, hovered))), hovered,
        6282451, 212, c, piece_rim)

def fast_feedback(+c: Context, image: Image) -> Image:
  fast_hover(c, fast_feedback_static(c, image))

def fast_capture_effect.show(show: Bool, +square: U32, +c: Context,
  image: Image) -> Image:
  match show c:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +age = progress(frame)
      +radius = U32.add(8, age)
      +opacity = U32.sub(255, U32.mul(age, 10))
      Shapes.disk(depth, size, Shapes.Pos{square_x(size, camera, square)},
        Shapes.Pos{square_y(size, camera, square)}, scale_coord(size, radius),
        16731983, opacity, image)

def fast_capture_effect(+c: Context, image: Image) -> Image:
  match c:
    case Context{depth, size, frame, camera, board, oldBoard,
        +previous, holes, +action, theme}:
      +victim = captured_square(Model.decode(action), previous)
      fast_capture_effect.show(Bool.and(U32.is_lt(victim, 64),
        U32.is_lt(progress(frame), 16)), victim, c, image)

def context_for(+depth: Nat, +size: U32, +frame: Scene.Frame) -> Context:
  +position = Scene.frame_position(frame)
  +previous = Scene.frame_previous(frame)
  +camera = Camera.basis(Scene.frame_view(frame))
  {Context{depth, size, frame, camera, Model.pos_board(position),
    Model.pos_board(previous), previous, Model.pos_holes(position),
    Scene.frame_lastAction(frame), Scene.frame_theme(frame)} : Context}

# The caller may cache this ground while view, holes, theme and size remain
# stable, then compose fresh pieces and cues for every frame.
def ground_prepared(+context: Context, background: Image) -> Image:
  match context:
    case Context{depth, size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      ground_tiles(Camera.depth_order(camera), context, background)

def compose_prepared(+context: Context, ground: Image) -> Image:
  match context:
    case Context{depth, size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +pieces = piece_layers(Camera.depth_order(camera), context, ground)
      +marked = feedback(context, pieces)
      capture_effect(context, marked)

def settled_ground512(frame: Scene.Frame, underlay: Image) -> Image:
  ground_prepared(context_for(9n, 512, frame), underlay)

def settled_ground1024(frame: Scene.Frame, underlay: Image) -> Image:
  ground_prepared(context_for(10n, 1024, frame), underlay)

def settled512(frame: Scene.Frame, ground: Image) -> Image:
  compose_prepared(context_for(9n, 512, frame), ground)

def settled1024(frame: Scene.Frame, ground: Image) -> Image:
  compose_prepared(context_for(10n, 1024, frame), ground)

def render_on(+depth: Nat, +size: U32, background: Image,
  +frame: Scene.Frame) -> Image:
  +context = context_for(depth, size, frame)
  +ground = ground_prepared(context, background)
  compose_prepared(context, ground)

def render512(+frame: Scene.Frame) -> Image:
  render_on(9n, 512, underlay512_theme(Scene.frame_theme(frame)), frame)

def render1024(+frame: Scene.Frame) -> Image:
  render_on(10n, 1024, underlay1024_theme(Scene.frame_theme(frame)), frame)

def fast_ground.context(base: Image, +context: Context) -> Image:
  match context:
    case Context{depth, +size, frame, +camera, board, oldBoard,
        previous, +holes, action, +theme}:
      SpatialFast.draw(depth, size, fast_affine(size, camera),
        presence_mask(holes), palette(theme), base)

# This ground is independent of occupancy, selection, targets and animation.
# Cache it while camera basis, holes, theme and tier stay unchanged; compose
# the prepared scene and the small pointer cue for each changing hover frame.
def fast_ground(+depth: Nat, +size: U32, base: Image,
  +frame: Scene.Frame) -> Image:
  fast_ground.context(base, context_for(depth, size, frame))

# The prepared layer is hover-independent. Cache it while camera, position,
# previous/action/progress, selection, check, tile/tileTargets, legal targets
# and shift hints stay stable; only the projected hover outline changes per pointer.
def fast_prepare.prepared(+context: Context, ground: Image) -> Image:
  match context:
    case Context{depth, size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +pieces = fast_piece_layers(Camera.depth_order(camera), context, ground)
      fast_feedback_static(context, pieces)

def fast_prepare(+depth: Nat, +size: U32, +frame: Scene.Frame,
  ground: Image) -> Image:
  fast_prepare.prepared(context_for(depth, size, frame), ground)

def fast_pointer.prepared(+context: Context, prepared: Image) -> Image:
  +hover = fast_hover(context, prepared)
  fast_capture_effect(context, hover)

def fast_pointer(+depth: Nat, +size: U32, +frame: Scene.Frame,
  prepared: Image) -> Image:
  fast_pointer.prepared(context_for(depth, size, frame), prepared)

def fast_overlay.prepared(+context: Context, ground: Image) -> Image:
  +prepared = fast_prepare.prepared(context, ground)
  fast_pointer.prepared(context, prepared)

def fast_overlay(+depth: Nat, +size: U32, +frame: Scene.Frame,
  ground: Image) -> Image:
  fast_overlay.prepared(context_for(depth, size, frame), ground)

def fast_ground512(frame: Scene.Frame, underlay: Image) -> Image:
  fast_ground(9n, 512, underlay, frame)

def fast_ground1024(frame: Scene.Frame, underlay: Image) -> Image:
  fast_ground(10n, 1024, underlay, frame)

def fast_prepare512(+frame: Scene.Frame, ground: Image) -> Image:
  fast_prepare(9n, 512, frame, ground)

def fast_prepare1024(+frame: Scene.Frame, ground: Image) -> Image:
  fast_prepare(10n, 1024, frame, ground)

def fast_pointer512(+frame: Scene.Frame, prepared: Image) -> Image:
  fast_pointer(9n, 512, frame, prepared)

def fast_pointer1024(+frame: Scene.Frame, prepared: Image) -> Image:
  fast_pointer(10n, 1024, frame, prepared)

def fast_overlay512(frame: Scene.Frame, ground: Image) -> Image:
  fast_overlay(9n, 512, frame, ground)

def fast_overlay1024(frame: Scene.Frame, ground: Image) -> Image:
  fast_overlay(10n, 1024, frame, ground)

# Optional fixed-facing sprite scene path. Sprite dimensions follow the
# projected board pitch, but their quads stay screen-aligned so the authored
# front view remains legible while the board orbits underneath them.
def sprite_board_pitch(+size: U32, camera: Camera.Basis) -> F32:
  match camera:
    case Camera.Basis{+cosYaw, +sinYaw, sinPitch, cosPitch, +scale, cx, cy}:
      F32.mul(F32.mul(scale,
        F32.add(F32.abs(cosYaw), F32.abs(sinYaw))), physical_scale(size))

def sprite_width(+size: U32, camera: Camera.Basis) -> F32:
  F32.mul(sprite_board_pitch(size, camera), 1.16)

def sprite_height(+size: U32, camera: Camera.Basis) -> F32:
  F32.mul(sprite_board_pitch(size, camera), 1.48)

def sprite_matrix(+width: F32, +height: F32, center: Quad.Point) -> Transform.Matrix:
  match center:
    case Quad.Point{+x, +y}:
      Transform.Matrix{width, 0.0, 0.0, height,
        F32.sub(x, F32.div(width, 2.0)), F32.sub(y, height)}

def sprite_piece_kind(kind: U32) -> PieceSprites.PieceKind:
  match kind:
    case 2: PieceSprites.Knight{}
    case 3: PieceSprites.Bishop{}
    case 4: PieceSprites.Rook{}
    case 5: PieceSprites.Queen{}
    case 6: PieceSprites.King{}
    case _: PieceSprites.Pawn{}

def sprite_piece_side(code: U32) -> PieceSprites.Side:
  Bool.pick(PieceSprites.Side, Model.is_white(code),
    PieceSprites.Ivory{}, PieceSprites.Navy{})

def sprite_piece_at(show: Bool, +square: U32, +code: U32,
  +context: Context, +pieces: PieceSprites.Pieces, image: Image) -> Image:
  match show context:
    case False{} _: image
    case True{} Context{depth, +size, +frame, +camera, board, oldBoard,
        previous, holes, +action, theme}:
      +source = motion_source(Model.decode(action), square)
      +center = interpolated_point(size, camera, source, square,
        progress(frame))
      +matrix = sprite_matrix(sprite_width(size, camera),
        sprite_height(size, camera), center)
      PieceSprites.draw(depth, size, pieces, sprite_piece_side(code),
        sprite_piece_kind(Model.piece_type(code)), matrix, 255,
        Rect.screen(size), image)

def sprite_opacity(+age: U32) -> U32:
  U32.sub(255, U32.mul(U32.min(age, 7), 32))

def fast_sprite_dying_at(show: Bool, +square: U32, +context: Context,
  +pieces: PieceSprites.Pieces, image: Image) -> Image:
  match show context:
    case False{} _: image
    case True{} Context{depth, +size, +frame, +camera, board, +oldBoard,
        previous, holes, action, theme}:
      +age = progress(frame)
      +x = square_x(size, camera, square)
      +y = square_y(size, camera, square)
      +drift = scale_coord(size, U32.div(age, 2))
      +lift = scale_coord(size, age)
      +dead_x = Bool.pick(U32, U32.is_even(age), U32.add(x, drift),
        U32.sub(x, drift))
      +dead_y = U32.sub(y, lift)
      +center: Quad.Point = Quad.Point{U32.to_f32(dead_x),
        U32.to_f32(dead_y)}
      +matrix = sprite_matrix(sprite_width(size, camera),
        sprite_height(size, camera), center)
      +code = Model.board_get(oldBoard, square)
      PieceSprites.draw(depth, size, pieces, sprite_piece_side(code),
        sprite_piece_kind(Model.piece_type(code)), matrix,
        sprite_opacity(age), Rect.screen(size), image)

def fast_sprite_piece_layer(+square: U32, +context: Context,
  +pieces: PieceSprites.Pieces, image: Image) -> Image:
  match context:
    case Context{depth, size, frame, camera, +board, oldBoard,
        previous, +holes, action, theme}:
      +present = Model.present(holes, square)
      +dead = fast_sprite_dying_at(
        Bool.and(present, dying_visible(square, context)), square,
        context, pieces, image)
      sprite_piece_at(Bool.and(present,
        Model.occupied(Model.board_get(board, square))), square,
        Model.board_get(board, square), context, pieces, dead)

def fast_sprite_piece_layers(order: List<&2, U32>, +context: Context,
  +pieces: PieceSprites.Pieces, image: Image) -> Image:
  match order:
    case Nil{}: image
    case +square <> rest:
      fast_sprite_piece_layers(rest, context, pieces,
        fast_sprite_piece_layer(square, context, pieces, image))

# Occupancy-only stage. `ground` must contain the board/background but no old
# piece pixels. The caller may retain this result until occupancy, camera or
# motion changes; pointer-only frames should use fast_feedback_on_pieces512.
def fast_sprite_pieces512(+frame: Scene.Frame,
  +pieces: PieceSprites.Pieces, ground: Image) -> Image:
  +context = context_for(9n, 512, frame)
  fast_sprite_piece_layers(Camera.depth_order(Camera.basis(Scene.frame_view(frame))),
    context, pieces, ground)

def fast_sprite_selected_focus(show: Bool, +square: U32,
  +context: Context, image: Image) -> Image:
  match show context:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, +board, oldBoard,
        previous, +holes, action, theme}:
      +occupied = Model.occupied(Model.board_get(board, square))
      +visible = Bool.and(Model.present(holes, square), occupied)
      +x = square_x(size, camera, square)
      +y = square_y(size, camera, square)
      +halo = Ring.draw(depth, size, Shapes.Pos{x}, Shapes.Pos{y},
        scale_coord(size, 19), scale_coord(size, 24), 16773305,
        Bool.pick(U32, visible, 232, 0),
        image)
      PieceArt.focus_rim(visible, depth, size, x, y, 16768672, halo)

def fast_sprite_hover_focus(show: Bool, +square: U32,
  +context: Context, image: Image) -> Image:
  match show context:
    case False{} _: image
    case True{} Context{depth, +size, frame, +camera, +board, oldBoard,
        previous, +holes, action, theme}:
      +selected = Scene.frame_selected(frame)
      +occupied = Model.occupied(Model.board_get(board, square))
      +visible = Bool.and(U32.is_ne(square, selected),
        Bool.and(Model.present(holes, square), occupied))
      +x = square_x(size, camera, square)
      +y = square_y(size, camera, square)
      PieceArt.focus_rim(visible, depth, size, x, y, 6282451, image)

def fast_sprite_feedback_on_pieces(+context: Context, pieces_image: Image) -> Image:
  match context:
    case Context{depth, size, +frame, camera, board, oldBoard,
        previous, holes, action, theme}:
      +static = fast_feedback_static(context, pieces_image)
      +selected = Scene.frame_selected(frame)
      +hovered = Scene.frame_hovered(frame)
      +selected_focus = fast_sprite_selected_focus(U32.is_lt(selected, 64),
        selected, context, static)
      +hover_focus = fast_sprite_hover_focus(U32.is_lt(hovered, 64),
        hovered, context, selected_focus)
      +hover_outline = square_outline(Bool.and(U32.is_lt(hovered, 64),
        U32.is_ne(selected, hovered)), hovered, 6282451, 212, context,
        hover_focus)
      fast_capture_effect(context, hover_outline)

# Feedback is deliberately a separate pass. Selection/hover plinth lighting is
# always shown for occupied pieces; legal destination rings remain controlled
# solely by the existing frame.targets overlay preference.
def fast_feedback_on_pieces512(+frame: Scene.Frame, pieces_image: Image) -> Image:
  fast_sprite_feedback_on_pieces(context_for(9n, 512, frame), pieces_image)

# Retained browser path: the pointer pass owns hover and capture pulses, so
# selection and preference changes repaint only this small static overlay.
def fast_sprite_feedback_static512(+frame: Scene.Frame,
  pieces_image: Image) -> Image:
  +context = context_for(9n,512,frame)
  +selected = Scene.frame_selected(frame)
  +cues = fast_feedback_static(context,pieces_image)
  fast_sprite_selected_focus(U32.is_lt(selected,64),selected,context,cues)

def sprite_board_equal(a: List<&2,U32>,b: List<&2,U32>) -> Bool:
  match a b:
    case Nil{} Nil{}: True{}
    case ah <> at bh <> bt:
      Bool.and(U32.is_eq(ah,bh),sprite_board_equal(at,bt))
    case _ _: False{}

def sprite_view_equal(a: Camera.View,b: Camera.View) -> Bool:
  match a b:
    case Camera.View{ay,ap,az} Camera.View{by,bp,bz}:
      Bool.and(U32.is_eq(ay,by),Bool.and(U32.is_eq(ap,bp),U32.is_eq(az,bz)))

def sprite_position_equal(a: Model.Position,b: Model.Position) -> Bool:
  match a b:
    case Model.Pos{ab,ah,_,_,_,_,_,_} Model.Pos{bb,bh,_,_,_,_,_,_}:
      Bool.and(U32.is_eq(ah,bh),sprite_board_equal(ab,bb))

def sprite_same_placement(+a: Scene.Frame,+b: Scene.Frame) -> Bool:
  Bool.and(sprite_position_equal(Scene.frame_position(a),Scene.frame_position(b)),
    sprite_view_equal(Scene.frame_view(a),Scene.frame_view(b)))

# Motion-only board image: the caller retains a theme-specific underlay, while
# this path rebuilds the exact projected hole mask and draws compact, distinct
# chess silhouettes plus stable game-state cues. Hover and capture pulses are
# omitted only during active orbit; use settled512/1024 again on release.
def fast_camera.preview(+context: Context, underlay: Image) -> Image:
  match context:
    case Context{depth, size, frame, +camera, board, oldBoard,
        previous, holes, action, theme}:
      +ground = fast_ground.context(underlay, context)
      +pieces = camera_piece_layers(Camera.depth_order(camera), context, ground)
      fast_camera_feedback(context, pieces)

def fast_camera(+depth: Nat, +size: U32, +frame: Scene.Frame,
  underlay: Image) -> Image:
  fast_camera.preview(context_for(depth, size, frame), underlay)

def nearest2(+remaining: Nat, image: Image) -> Image:
  match remaining image:
    case 0n Pix{+color}:
      +pixel_a = {Pix{color} : Image}
      +pixel_b = {Pix{color} : Image}
      +pixel_c = {Pix{color} : Image}
      +pixel_d = {Pix{color} : Image}
      Qua{pixel_a, pixel_b, pixel_c, pixel_d}
    case 0n Qua{tl, tr, bl, br}: Qua{tl, tr, bl, br}
    case 1n+rest Pix{+color}: Pix{color}
    case 1n+rest Qua{tl, tr, bl, br}:
      +top_left = nearest2(rest, tl)
      +top_right = nearest2(rest, tr)
      +bottom_left = nearest2(rest, bl)
      +bottom_right = nearest2(rest, br)
      Qua{top_left, top_right, bottom_left, bottom_right}

# Candidate A: exact 512 raster with one primitive per piece.
def fast_camera_direct512(frame: Scene.Frame, underlay512: Image) -> Image:
  fast_camera(9n, 512, frame, underlay512)

# Low-latency camera preview: render at 128 and expand by two exact nearest
# steps. The retained detailed worker restores the full 512 image on settle.
def fast_camera128(frame: Scene.Frame, underlay128: Image) -> Image:
  fast_camera(7n, 128, frame, underlay128)

def fast_camera256(frame: Scene.Frame, underlay256: Image) -> Image:
  fast_camera(8n, 256, frame, underlay256)

def fast_camera512(+frame: Scene.Frame, underlay128: Image) -> Image:
  +small_ground = fast_ground(7n,128,underlay128,frame)
  +ground = nearest2(7n,small_ground)
  +context = context_for(8n,256,frame)
  +camera = Camera.basis(Scene.frame_view(frame))
  +pieces = camera_piece_layers(Camera.depth_order(camera),context,ground)
  nearest2(8n,fast_camera_feedback(context,pieces))

# Tier 2 keeps the same responsive preview while its viewport doubles.
def fast_camera1024(frame: Scene.Frame, underlay128: Image) -> Image:
  nearest2(9n, fast_camera512(frame, underlay128))

def fast512(+frame: Scene.Frame, underlay: Image) -> Image:
  fast_overlay512(frame, fast_ground512(frame, underlay))

def fast1024(+frame: Scene.Frame, underlay: Image) -> Image:
  fast_overlay1024(frame, fast_ground1024(frame, underlay))

# The decoded source plates are opaque 512x512 images. Preserve the authored
# color average when deriving the low-tier motion underlay, and nearest-expand
# the same pixels for settled 1024 output. Call these once per theme and cache
# the resulting Image in the caller; pointer events reuse it unchanged.
def asset.average_channel(+a: U32, +b: U32, +c: U32, +d: U32) -> U32:
  U32.div(U32.add(U32.add(a, b), U32.add(c, d)), 4)

def asset.average_pixel(+a: U32, +b: U32, +c: U32, +d: U32) -> Image:
  Pix{Color.rgb(asset.average_channel(Color.red(a), Color.red(b),
      Color.red(c), Color.red(d)),
    asset.average_channel(Color.green(a), Color.green(b),
      Color.green(c), Color.green(d)),
    asset.average_channel(Color.blue(a), Color.blue(b),
      Color.blue(c), Color.blue(d)))}

def asset.top_left_color(image: Image) -> U32:
  match image:
    case Pix{color}:
      color
    case Qua{tl, tr, bl, br}:
      asset.top_left_color(tl)

def asset.downsample_pixel(image: Image) -> Image:
  match image:
    case Pix{color}:
      Pix{color}
    case Qua{tl, tr, bl, br}:
      asset.average_pixel(asset.top_left_color(tl), asset.top_left_color(tr),
        asset.top_left_color(bl), asset.top_left_color(br))

def asset.downsample2(+remaining: Nat, image: Image) -> Image:
  match remaining:
    case 0n:
      asset.downsample_pixel(image)
    case 1n++rest:
      match image:
        case Pix{color}:
          Pix{color}
        case Qua{tl, tr, bl, br}:
          +top_left = asset.downsample2(rest, tl)
          +top_right = asset.downsample2(rest, tr)
          +bottom_left = asset.downsample2(rest, bl)
          +bottom_right = asset.downsample2(rest, br)
          Qua{top_left, top_right, bottom_left, bottom_right}

def asset.resize(+depth: Nat, +size: U32, +theme: U32,
  pixels: Image) -> Image:
  match depth:
    case 7n:
      asset.downsample2(7n, asset.downsample2(8n, pixels))
    case 8n:
      asset.downsample2(8n, pixels)
    case 9n:
      pixels
    case 10n:
      nearest2(9n, pixels)
    case _:
      underlay.for_theme(depth, size, theme)

def asset.depth9(valid: Bool, +depth: Nat, +size: U32, +theme: U32,
  pixels: Image) -> Image:
  match valid:
    case False{}:
      underlay.for_theme(depth, size, theme)
    case True{}:
      asset.resize(depth, size, theme, pixels)

def asset.from_plate(depth: Nat, size: U32, theme: U32,
  plate: Assets.Plate) -> Image:
  match plate:
    case Assets.Missing{}:
      underlay.for_theme(depth, size, theme)
    case Assets.Ready{+source_depth, pixels}:
      asset.depth9(U32.is_eq(source_depth, 9), depth, size, theme, pixels)

def asset.select(stone: Bool, astral: Assets.Plate,
  stone_plate: Assets.Plate) -> Assets.Plate:
  match stone:
    case False{}:
      astral
    case True{}:
      stone_plate

def asset.for_theme(theme: U32, plates: Assets.ObservatoryPlates) -> Assets.Plate:
  match plates:
    case Assets.ObservatoryPlates{astral, stone}:
      asset.select(Bool.not(U32.is_zero(theme)), astral, stone)

def underlay_asset(+depth: Nat, +size: U32, +theme: U32,
  plates: Assets.ObservatoryPlates) -> Image:
  asset.from_plate(depth, size, theme, asset.for_theme(theme, plates))

def underlay256_asset(theme: U32, plates: Assets.ObservatoryPlates) -> Image:
  underlay_asset(8n, 256, theme, plates)

def underlay128_asset(theme: U32, plates: Assets.ObservatoryPlates) -> Image:
  underlay_asset(7n, 128, theme, plates)

def underlay512_asset(theme: U32, plates: Assets.ObservatoryPlates) -> Image:
  underlay_asset(9n, 512, theme, plates)

def underlay1024_asset(theme: U32, plates: Assets.ObservatoryPlates) -> Image:
  underlay_asset(10n, 1024, theme, plates)

def render512_asset(+frame: Scene.Frame,
  plates: Assets.ObservatoryPlates) -> Image:
  render_on(9n, 512, underlay512_asset(Scene.frame_theme(frame), plates), frame)

def render1024_asset(+frame: Scene.Frame,
  plates: Assets.ObservatoryPlates) -> Image:
  render_on(10n, 1024, underlay1024_asset(Scene.frame_theme(frame), plates), frame)

# Selected-book worker seam: keep transport request/decode policy in the
# game-owned Assets module while exposing the exact calls from this scene API.
def asset_ids(theme: U32) -> List<&2, Assets.AssetRequest>:
  Assets.asset_ids(theme)

def load_plates(responses: List<&2, Assets.AssetResponse>) -> Assets.ObservatoryPlates:
  Assets.load_plates(responses)

def sprite_asset_ids() -> List<&2,PieceAssets.AssetRequest>:
  PieceAssets.asset_ids()

def load_sprite_pages(responses: List<&2,PieceAssets.AssetResponse>) ->
  Maybe<&2,PieceSprites.Pieces>:
  PieceAssets.prepared(responses)
