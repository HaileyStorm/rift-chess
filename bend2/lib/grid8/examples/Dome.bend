# Spatial observatory specimen: projected raised platforms and real gaps.
# Missing cells expose the lower aperture/sky because SpatialBoard skips them.
import Base
import ../../graphics/Canvas.bend as Canvas
import ../../graphics/Quad.bend as Quad
import ../../graphics/v2/Facet.bend as Facet
import ../../graphics/v2/Grain.bend as Grain
import ../../graphics/v2/Gradient.bend as Gradient
import ../../graphics/v2/Ring.bend as Ring
import ../../graphics/v2/Rounded.bend as Rounded
import ../../graphics/v2/Shapes.bend as Shapes
import ../SpatialBoard.bend as SpatialBoard
import ../SpatialFast.bend as SpatialFast
import ../../graphics/v2/Stamp.bend as Stamp
import ../../graphics/v2/Upscale.bend as Upscale
import ../../graphics/v2/Widgets.bend as Widgets
import ../Board.bend as Board
import ./Showcase.bend as Tokens

def s(+size: U32, +value: U32) -> U32:
  U32.div(U32.mul(size, value), 1024)

def point(+size: U32, +x: U32, +y: U32) -> Quad.Point:
  Quad.Point{U32.to_f32(s(size, x)), U32.to_f32(s(size, y))}

def sky(+depth: Nat, +size: U32) -> Image:
  +gradient = Gradient.vertical(depth, size, s(size, 16), 0, size,
    461593, 1251865)
  +dawn = Shapes.disk(depth, size, Shapes.Pos{s(size, 750)},
    Shapes.Neg{s(size, 70)}, s(size, 360), 3034210, 50, gradient)
  +deep = Shapes.disk(depth, size, Shapes.Neg{s(size, 80)},
    Shapes.Pos{s(size, 820)}, s(size, 410), 925227, 38, dawn)
  +dome = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 475)}, s(size, 402), s(size, 437), 1979463, 128, deep)
  +lip = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 475)}, s(size, 434), s(size, 439), 6608860, 128, dome)
  +outer = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 475)}, s(size, 485), s(size, 487), 14263654, 74, lip)
  +header = Canvas.rect_at(depth, 0, 0, size, s(size, 155), 263431, outer)
  Canvas.rect_at(depth, 0, s(size, 154), size, s(size, 2), 3034210, header)

def vault(+depth: Nat, +size: U32, image: Image) -> Image:
  +chamber = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 476)}, s(size, 350), 1321274, 211, image)
  +outer_arch = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 476)}, s(size, 350), s(size, 356),
    6535108, 98, chamber)
  +inner_arch = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 458)}, s(size, 299), s(size, 305),
    10845612, 130, outer_arch)
  +rib_left = Facet.draw(depth, size,
    Quad.make(point(size, 171, 395), point(size, 184, 386),
      point(size, 401, 166), point(size, 409, 172)),
    3437691, 211, inner_arch)
  +rib_right = Facet.draw(depth, size,
    Quad.make(point(size, 840, 386), point(size, 853, 395),
      point(size, 615, 172), point(size, 623, 166)),
    3437691, 211, rib_left)
  +eye_shadow = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 219)}, s(size, 68), 198419, 222, rib_right)
  +eye_rim = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 219)}, s(size, 58), s(size, 65),
    11964279, 224, eye_shadow)
  +eye_glass = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 219)}, s(size, 54), 1255999, 245, eye_rim)
  +eye_glow = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 219)}, s(size, 40), s(size, 45),
    7131369, 174, eye_glass)
  +eye_core = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 219)}, s(size, 27), 395508, 255, eye_glow)
  +lens = Shapes.disk(depth, size, Shapes.Pos{s(size, 495)},
    Shapes.Pos{s(size, 201)}, s(size, 11), 15067341, 166, eye_core)
  +left_star = Shapes.disk(depth, size, Shapes.Pos{s(size, 275)},
    Shapes.Pos{s(size, 235)}, s(size, 2), 15067341, 211, lens)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 760)},
    Shapes.Pos{s(size, 261)}, s(size, 3), 11588567, 192, left_star)

# Receding dark masonry and angled vault ribs make the circular aperture a
# room with weight and perspective. Grain stays low-contrast neutral slate.
def interior(+depth: Nat, +size: U32, image: Image) -> Image:
  +left_wall = Facet.draw(depth, size,
    Quad.make(point(size, 93, 178), point(size, 211, 184),
      point(size, 276, 766), point(size, 119, 804)),
    1120291, 246, image)
  +right_wall = Facet.draw(depth, size,
    Quad.make(point(size, 813, 184), point(size, 931, 178),
      point(size, 905, 804), point(size, 748, 766)),
    1120291, 246, left_wall)
  +left_rib = Grain.draw(depth, size,
    Quad.make(point(size, 171, 422), point(size, 197, 428),
      point(size, 316, 234), point(size, 289, 215)),
    Grain.Palette{4277061, 3750968, 4606026}, 67, 8, 255, right_wall)
  +left_crown = Grain.draw(depth, size,
    Quad.make(point(size, 289, 215), point(size, 316, 234),
      point(size, 440, 179), point(size, 421, 158)),
    Grain.Palette{4277061, 3750968, 4606026}, 71, 8, 255, left_rib)
  +right_rib = Grain.draw(depth, size,
    Quad.make(point(size, 827, 428), point(size, 853, 422),
      point(size, 735, 215), point(size, 708, 234)),
    Grain.Palette{4277061, 3750968, 4606026}, 83, 8, 255, left_crown)
  +right_crown = Grain.draw(depth, size,
    Quad.make(point(size, 708, 234), point(size, 735, 215),
      point(size, 603, 158), point(size, 584, 179)),
    Grain.Palette{4277061, 3750968, 4606026}, 89, 8, 255, right_rib)
  +keystone = Facet.draw(depth, size,
    Quad.make(point(size, 463, 158), point(size, 561, 158),
      point(size, 552, 183), point(size, 472, 183)),
    5263705, 255, right_crown)
  Facet.draw(depth, size,
    Quad.make(point(size, 472, 183), point(size, 552, 183),
      point(size, 546, 190), point(size, 478, 190)),
    11047798, 89, keystone)

def architecture(+depth: Nat, +size: U32, image: Image) -> Image:
  +vaulted = vault(depth, size, image)
  +room = interior(depth, size, vaulted)
  +header_plane = Canvas.rect_at(depth, 0, 0, size, s(size, 155),
    263431, room)
  +header_line = Canvas.rect_at(depth, 0, s(size, 154), size, s(size, 2),
    3034210, header_plane)
  +left = Grain.draw(depth, size,
    Quad.make(point(size, 79, 245), point(size, 116, 208),
      point(size, 226, 764), point(size, 190, 790)),
    Grain.Palette{3034210, 2243657, 4547962}, 31, 8, 208, header_line)
  +right = Grain.draw(depth, size,
    Quad.make(point(size, 908, 208), point(size, 945, 245),
      point(size, 834, 790), point(size, 798, 764)),
    Grain.Palette{3034210, 1919824, 3952723}, 97, 8, 208, left)
  +beam = Facet.draw(depth, size,
    Quad.make(point(size, 229, 187), point(size, 795, 187),
      point(size, 820, 216), point(size, 204, 216)),
    1124151, 224, right)
  +edge = Facet.draw(depth, size,
    Quad.make(point(size, 204, 216), point(size, 820, 216),
      point(size, 828, 222), point(size, 196, 222)),
    6608860, 126, beam)
  +lamp_l = Shapes.disk(depth, size, Shapes.Pos{s(size, 224)},
    Shapes.Pos{s(size, 206)}, s(size, 6), 15911055, 235, edge)
  +lamp_c = Shapes.disk(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 201)}, s(size, 8), 6608860, 255, lamp_l)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 800)},
    Shapes.Pos{s(size, 206)}, s(size, 6), 15911055, 235, lamp_c)

def aperture(+depth: Nat, +size: U32, image: Image) -> Image:
  +bowl = Shapes.disk(depth, size, Shapes.Pos{s(size, 521)},
    Shapes.Pos{s(size, 483)}, s(size, 128), 263179, 238, image)
  +mist = Ring.draw(depth, size, Shapes.Pos{s(size, 521)},
    Shapes.Pos{s(size, 483)}, s(size, 105), s(size, 114), 4638419, 145, bowl)
  +lip = Ring.draw(depth, size, Shapes.Pos{s(size, 521)},
    Shapes.Pos{s(size, 483)}, s(size, 76), s(size, 83), 6608860, 217, mist)
  +shaft = Shapes.disk(depth, size, Shapes.Pos{s(size, 521)},
    Shapes.Pos{s(size, 483)}, s(size, 69), 133123, 242, lip)
  +fall = Shapes.disk(depth, size, Shapes.Pos{s(size, 531)},
    Shapes.Pos{s(size, 501)}, s(size, 51), 463390, 239, shaft)
  +inner = Ring.draw(depth, size, Shapes.Pos{s(size, 531)},
    Shapes.Pos{s(size, 501)}, s(size, 37), s(size, 42), 6608860, 151, fall)
  +deeper = Shapes.disk(depth, size, Shapes.Pos{s(size, 537)},
    Shapes.Pos{s(size, 513)}, s(size, 31), 133123, 255, inner)
  +core = Ring.draw(depth, size, Shapes.Pos{s(size, 537)},
    Shapes.Pos{s(size, 513)}, s(size, 17), s(size, 20), 5683143, 176, deeper)
  +halo = Shapes.disk(depth, size, Shapes.Pos{s(size, 537)},
    Shapes.Pos{s(size, 513)}, s(size, 14), 1924487, 124, core)
  +well_light = Shapes.disk(depth, size, Shapes.Pos{s(size, 542)},
    Shapes.Pos{s(size, 523)}, s(size, 6), 12181733, 204, halo)
  +star_l = Shapes.disk(depth, size, Shapes.Pos{s(size, 495)},
    Shapes.Pos{s(size, 477)}, s(size, 2), 11128028, 195, well_light)
  +star_r = Shapes.disk(depth, size, Shapes.Pos{s(size, 560)},
    Shapes.Pos{s(size, 486)}, s(size, 2), 11128028, 171, star_l)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 514)},
    Shapes.Pos{s(size, 520)}, s(size, 1), 6913707, 223, star_r)

def support(+depth: Nat, +size: U32, image: Image) -> Image:
  +rear = Grain.draw(depth, size,
    Quad.make(point(size, 205, 320), point(size, 736, 218),
      point(size, 848, 659), point(size, 307, 757)),
    Grain.Palette{792617, 594722, 2110792}, 51, 8, 230, image)
  +front = Grain.draw(depth, size,
    Quad.make(point(size, 307, 727), point(size, 848, 629),
      point(size, 846, 663), point(size, 304, 765)),
    Grain.Palette{3034210, 2181966, 5402759}, 19, 8, 255, rear)
  Facet.draw(depth, size,
    Quad.make(point(size, 304, 765), point(size, 846, 663),
      point(size, 849, 671), point(size, 303, 773)),
    6608860, 134, front)

def mask() -> Board.Mask:
  Board.Mask{3892264959, 4294934500}

def palette() -> SpatialBoard.Palette:
  SpatialBoard.Palette{10197133, 3357767, 5790553, 1516591,
    13019515, 265239, 12111051}

# Three settled material samples exercise generic projected Grain without a
# second grid traversal. The drag preview keeps its plain fast surface.
def focal_grain(+depth: Nat, +size: U32,
  +projection: SpatialBoard.Projection, image: Image) -> Image:
  +dark = Grain.draw(depth, size,
    Quad.make(SpatialBoard.point(projection, 2, 5),
      SpatialBoard.point(projection, 3, 5),
      SpatialBoard.point(projection, 3, 6),
      SpatialBoard.point(projection, 2, 6)),
    Grain.Palette{3357767, 2962752, 4673628}, 43, 4, 160, image)
  +light = Grain.draw(depth, size,
    Quad.make(SpatialBoard.point(projection, 3, 5),
      SpatialBoard.point(projection, 4, 5),
      SpatialBoard.point(projection, 4, 6),
      SpatialBoard.point(projection, 3, 6)),
    Grain.Palette{10197133, 9276547, 11578016}, 79, 4, 160, dark)
  Grain.draw(depth, size,
    Quad.make(SpatialBoard.point(projection, 4, 6),
      SpatialBoard.point(projection, 5, 6),
      SpatialBoard.point(projection, 5, 7),
      SpatialBoard.point(projection, 4, 7)),
    Grain.Palette{10197133, 9276547, 11578016}, 113, 4, 160, light)

def board_field(+depth: Nat, +size: U32, image: Image) -> Image:
  +projection = {SpatialBoard.Projection{s(size, 220), s(size, 330),
    s(size, 64), s(size, 12), s(size, 12), s(size, 50), s(size, 12)} :
    SpatialBoard.Projection}
  +field = SpatialBoard.draw_lit(depth, size, projection, mask(), palette(),
    SpatialBoard.Light{14662027, 34, 4, 3}, image)
  +stone = focal_grain(depth, size, projection, field)
  +capture = Ring.draw(depth, size, Shapes.Pos{s(size, 526)},
    Shapes.Pos{s(size, 351)}, s(size, 25), s(size, 28), 15911055, 232, stone)
  Ring.draw(depth, size, Shapes.Pos{s(size, 522)},
    Shapes.Pos{s(size, 613)}, s(size, 29), s(size, 33), 6608860, 235, capture)

def board(+depth: Nat, +size: U32, image: Image) -> Image:
  +under = support(depth, size, image)
  +well = aperture(depth, size, under)
  board_field(depth, size, well)

def px(+file: U32, +rank: U32) -> U32:
  U32.add(258, U32.add(U32.mul(file, 64), U32.mul(rank, 12)))

def py(+file: U32, +rank: U32) -> U32:
  U32.sub(U32.add(349, U32.mul(rank, 50)), U32.mul(file, 12))

def pieces(+depth: Nat, +size: U32, image: Image) -> Image:
  +a = Tokens.tower(depth, size, px(0, 0), py(0, 0), 14263654, 792617, image)
  +b = Tokens.spire(depth, size, px(2, 0), py(2, 0), 14263654, 792617, a)
  +c = Tokens.regent(depth, size, px(5, 0), py(5, 0), 15911055, 792617, b)
  +d = Tokens.tower(depth, size, px(7, 0), py(7, 0), 14263654, 792617, c)
  +e = Tokens.knight(depth, size, px(1, 1), py(1, 1), 14263654, 792617, d)
  +f = Tokens.piece(depth, size, px(4, 1), py(4, 1), 14263654, 792617, e)
  +g = Tokens.piece(depth, size, px(5, 1), py(5, 1), 14263654, 792617, f)
  +h = Tokens.tower(depth, size, px(0, 7), py(0, 7), 6608860, 1124151, g)
  +i = Tokens.spire(depth, size, px(2, 7), py(2, 7), 6608860, 1124151, h)
  +j = Tokens.regent(depth, size, px(3, 6), py(3, 6), 16181716, 2706521, i)
  +k = Tokens.piece(depth, size, px(5, 6), py(5, 6), 6608860, 1124151, j)
  +l = Tokens.tower(depth, size, px(7, 7), py(7, 7), 6608860, 1124151, k)
  Tokens.knight(depth, size, px(1, 6), py(1, 6), 6608860, 1124151, l)

def telescope(+depth: Nat, +size: U32, image: Image) -> Image:
  +tripod_l = Facet.draw(depth, size,
    Quad.make(point(size, 114, 683), point(size, 121, 683),
      point(size, 68, 787), point(size, 62, 787)),
    3034210, 255, image)
  +tripod_r = Facet.draw(depth, size,
    Quad.make(point(size, 121, 683), point(size, 130, 683),
      point(size, 188, 787), point(size, 179, 787)),
    3034210, 255, tripod_l)
  +tube = Facet.draw(depth, size,
    Quad.make(point(size, 76, 663), point(size, 176, 592),
      point(size, 193, 610), point(size, 93, 682)),
    3361115, 255, tripod_r)
  +highlight = Facet.draw(depth, size,
    Quad.make(point(size, 76, 663), point(size, 176, 592),
      point(size, 180, 598), point(size, 82, 671)),
    6608860, 138, tube)
  +lens = Ring.draw(depth, size, Shapes.Pos{s(size, 184)},
    Shapes.Pos{s(size, 601)}, s(size, 14), s(size, 23), 6608860, 225, highlight)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 184)},
    Shapes.Pos{s(size, 601)}, s(size, 12), 198419, 255, lens)

# Retained side piers sit behind projected slabs, so their mass frames the
# board without covering selectable cells or the late HUD/status layer.
def foreground_piers(+depth: Nat, +size: U32, image: Image) -> Image:
  +left_side = Facet.draw(depth, size,
    Quad.make(point(size, 196, 263), point(size, 218, 249),
      point(size, 236, 792), point(size, 211, 808)),
    1120545, 255, image)
  +left_face = Grain.draw(depth, size,
    Quad.make(point(size, 146, 265), point(size, 196, 263),
      point(size, 211, 808), point(size, 155, 816)),
    Grain.Palette{3289912, 2960689, 3684657}, 103, 8, 255, left_side)
  +left_shine = Facet.draw(depth, size,
    Quad.make(point(size, 151, 272), point(size, 157, 271),
      point(size, 165, 805), point(size, 158, 807)),
    9405824, 71, left_face)
  +left_cap = Facet.draw(depth, size,
    Quad.make(point(size, 128, 259), point(size, 216, 250),
      point(size, 224, 281), point(size, 133, 291)),
    5263705, 255, left_shine)
  +left_tread = Facet.draw(depth, size,
    Quad.make(point(size, 129, 259), point(size, 216, 250),
      point(size, 217, 256), point(size, 130, 265)),
    11047798, 90, left_cap)
  +left_lip = Facet.draw(depth, size,
    Quad.make(point(size, 133, 291), point(size, 224, 281),
      point(size, 225, 291), point(size, 134, 300)),
    1707295, 255, left_tread)
  +left_foot = Facet.draw(depth, size,
    Quad.make(point(size, 136, 772), point(size, 222, 764),
      point(size, 235, 810), point(size, 142, 818)),
    3160132, 255, left_lip)
  +right_side = Facet.draw(depth, size,
    Quad.make(point(size, 806, 249), point(size, 828, 263),
      point(size, 813, 808), point(size, 788, 792)),
    1120545, 255, left_foot)
  +right_face = Grain.draw(depth, size,
    Quad.make(point(size, 828, 263), point(size, 878, 265),
      point(size, 869, 816), point(size, 813, 808)),
    Grain.Palette{3289912, 2960689, 3684657}, 139, 8, 255, right_side)
  +right_shine = Facet.draw(depth, size,
    Quad.make(point(size, 868, 271), point(size, 874, 272),
      point(size, 866, 807), point(size, 859, 805)),
    9405824, 71, right_face)
  +right_cap = Facet.draw(depth, size,
    Quad.make(point(size, 808, 250), point(size, 896, 259),
      point(size, 891, 291), point(size, 800, 281)),
    5263705, 255, right_shine)
  +right_tread = Facet.draw(depth, size,
    Quad.make(point(size, 808, 250), point(size, 895, 259),
      point(size, 894, 265), point(size, 807, 256)),
    11047798, 90, right_cap)
  +right_lip = Facet.draw(depth, size,
    Quad.make(point(size, 800, 281), point(size, 891, 291),
      point(size, 890, 300), point(size, 799, 291)),
    1707295, 255, right_tread)
  Facet.draw(depth, size,
    Quad.make(point(size, 802, 764), point(size, 888, 772),
      point(size, 882, 818), point(size, 789, 810)),
    3160132, 255, right_lip)

def hud(+depth: Nat, +size: U32, image: Image) -> Image:
  +brand = Widgets.label(depth, "R / C", s(size, 34), s(size, 28),
    s(size, 4), 16181716, 198419, image)
  +title = Widgets.label(depth, "ASTRAL OBSERVATORY", s(size, 208), s(size, 37),
    s(size, 3), 16181716, 198419, brand)
  +line = Widgets.rule(depth, s(size, 34), s(size, 100), s(size, 956),
    6608860, title)
  +sub = Widgets.label(depth, "RIFT CHESS / THE APERTURE IS OPEN", s(size, 34),
    s(size, 119), s(size, 2), 7968935, 198419, line)
  +left_card = Widgets.panel(depth, size, s(size, 25), s(size, 302),
    s(size, 164), s(size, 170), s(size, 16), 1057074, 3034210, sub)
  +left_text = Widgets.label(depth, "WHITE TO MOVE\n\n08:42\n\nRIFT 72/100", s(size, 41),
    s(size, 318), s(size, 2), 16181716, 198419, left_card)
  +right_card = Widgets.panel(depth, size, s(size, 847), s(size, 302),
    s(size, 151), s(size, 170), s(size, 16), 1057074, 3034210, left_text)
  +right_text = Widgets.label(depth, "OPEN RIFT\n\nE4 / F4\n\nSHIFT READY", s(size, 861),
    s(size, 318), s(size, 2), 6608860, 198419, right_card)
  +footer = Widgets.rule(depth, s(size, 34), s(size, 824), s(size, 956),
    6608860, right_text)
  +label = Widgets.label(depth, "BETWEEN WORLDS", s(size, 38), s(size, 853),
    s(size, 3), 16181716, 198419, footer)
  +caption = Widgets.label(depth, "A projected board. Real openings. Every move matters.",
    s(size, 38), s(size, 902), s(size, 2), 7968935, 198419, label)
  +undo = Widgets.chip(depth, size, "UNDO", s(size, 786), s(size, 853),
    s(size, 92), s(size, 45), s(size, 2), 1057074, 3034210, 16181716, caption)
  Widgets.chip(depth, size, "MENU", s(size, 888), s(size, 853),
    s(size, 100), s(size, 45), s(size, 2), 2706521, 2973808, 6608860, undo)

# Retain this layer across camera drag updates. No 64-cell top surface yet.
def fast_base(+depth: Nat, +size: U32) -> Image:
  +a = sky(depth, size)
  +b = architecture(depth, size, a)
  aperture(depth, size, b)

# A retained transparent foreground. It is composed after each projected
# board frame, so off-center camera motion cannot overwrite chrome/optics.
def fast_hud(+depth: Nat, +size: U32) -> Image:
  +header = Canvas.rect_at(depth, 0, 0, size, s(size, 156), 263431, Pix{0})
  +footer = Canvas.rect_at(depth, 0, s(size, 824), size,
    U32.sub(size, s(size, 824)), 1057074, header)
  +optics = telescope(depth, size, footer)
  hud(depth, size, optics)

def coord_case(negative: Bool, value: F32) -> Shapes.Coord:
  match negative:
    case True{}: Shapes.Neg{F32.to_u32(F32.abs(value))}
    case False{}: Shapes.Pos{F32.to_u32(value)}

def coord(+value: F32) -> Shapes.Coord:
  coord_case(F32.is_lt(value, 0.0), value)

def mark_at(+depth: Nat, +size: U32, point: Quad.Point,
  color: U32, image: Image) -> Image:
  match point:
    case Quad.Point{x, y}:
      Shapes.disk(depth, size, coord(x), coord(y), s(size, 7),
        color, 255, image)

def marker(+depth: Nat, +size: U32, +a: SpatialFast.Affine,
  +file: U32, +rank: U32, color: U32, image: Image) -> Image:
  mark_at(depth, size, SpatialFast.center(a, file, rank), color, image)

def fast_tokens(+depth: Nat, +size: U32, +a: SpatialFast.Affine,
  image: Image) -> Image:
  +p0 = marker(depth, size, a, 0, 0, 14263654, image)
  +p1 = marker(depth, size, a, 2, 0, 14263654, p0)
  +p2 = marker(depth, size, a, 5, 0, 15911055, p1)
  +p3 = marker(depth, size, a, 7, 0, 14263654, p2)
  +p4 = marker(depth, size, a, 1, 1, 14263654, p3)
  +p5 = marker(depth, size, a, 4, 1, 14263654, p4)
  +p6 = marker(depth, size, a, 5, 1, 14263654, p5)
  +p7 = marker(depth, size, a, 0, 7, 6608860, p6)
  +p8 = marker(depth, size, a, 2, 7, 6608860, p7)
  +p9 = marker(depth, size, a, 3, 6, 16181716, p8)
  +p10 = marker(depth, size, a, 5, 6, 6608860, p9)
  +p11 = marker(depth, size, a, 7, 7, 6608860, p10)
  marker(depth, size, a, 1, 6, 6608860, p11)

# Bend owns the preview computation; the host only presents its joined Image.
# Full side faces, antialias and sculpted pieces settle after drag ends.
def fast_world_frame(+depth: Nat, +size: U32, +affine: SpatialFast.Affine,
  base: Image) -> Image:
  +top = SpatialFast.draw(depth, size, affine, mask(), palette(), base)
  fast_tokens(depth, size, affine, top)

def overlay(+depth: Nat, +size: U32, +foreground: Image,
  image: Image) -> Image:
  Stamp.draw(depth, size, depth, size, Shapes.Pos{0}, Shapes.Pos{0},
    foreground, 0, image)

def fast_frame(+depth: Nat, +size: U32, +affine: SpatialFast.Affine,
  +base: Image, foreground: Image) -> Image:
  overlay(depth, size, foreground, fast_world_frame(depth, size, affine, base))

# Compute the dragging world at depth 9, reinterpret it as a 1024 Image,
# and compose a separately retained full-resolution Bend HUD above it.
def present_preview(frame: Upscale.Frame, foreground: Image) -> Image:
  match frame:
    case Upscale.Frame{depth, size, pixels}:
      overlay(depth, size, foreground, pixels)

def fast_preview(+affine: SpatialFast.Affine, +base_512: Image,
  foreground_1024: Image) -> Image:
  +world = fast_world_frame(9n, 512, affine, base_512)
  present_preview(Upscale.twice(Upscale.Frame{9n, 512, world}),
    foreground_1024)

# The full visual preset can retain the costly observatory/plinth/well and
# foreground across position-only changes. A caller also retains the board
# Image while mask, camera and selection have not changed.
def settled_base(+depth: Nat, +size: U32) -> Image:
  +a = sky(depth, size)
  +b = architecture(depth, size, a)
  +c = foreground_piers(depth, size, b)
  +d = support(depth, size, c)
  aperture(depth, size, d)

def settled_board(+depth: Nat, +size: U32, base: Image) -> Image:
  board_field(depth, size, base)

def settled_tokens(+depth: Nat, +size: U32, +field: Image,
  foreground: Image) -> Image:
  overlay(depth, size, foreground, pieces(depth, size, field))

def settled_frame(+depth: Nat, +size: U32, +base: Image,
  foreground: Image) -> Image:
  settled_tokens(depth, size, settled_board(depth, size, base), foreground)

def screen(+depth: Nat, +size: U32) -> Image:
  settled_frame(depth, size, settled_base(depth, size), fast_hud(depth, size))
