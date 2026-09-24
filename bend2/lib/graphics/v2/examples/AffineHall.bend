# Game-neutral material gallery: object-anchored affine stone/metal on raised
# suspended facets, with the lower sky visible between platforms. All scene
# decisions are Bend; the host only serially blits the resulting Image.
import Base
import ../../Quad.bend as Quad
import ../AffineGrain.bend as AffineGrain
import ../AffineTexture.bend as AffineTexture
import ../Facet.bend as Facet
import ../Gradient.bend as Gradient
import ../Grain.bend as Grain
import ../RaisedFacet.bend as RaisedFacet
import ../Ring.bend as Ring
import ../Shapes.bend as Shapes
import ../Widgets.bend as Widgets

def s(+size: U32, +value: U32) -> U32:
  U32.div(U32.mul(size, value), 1024)

def point(+size: U32, +x: U32, +y: U32) -> Quad.Point:
  Quad.Point{U32.to_f32(s(size, x)), U32.to_f32(s(size, y))}

def sky(+depth: Nat, +size: U32) -> Image:
  +base = Gradient.vertical(depth, size, s(size, 16), 0, size,
    795405, 1182997)
  +haze = Shapes.disk(depth, size, Shapes.Pos{s(size, 503)},
    Shapes.Pos{s(size, 616)}, s(size, 335), 2380941, 85, base)
  +well = Shapes.disk(depth, size, Shapes.Pos{s(size, 516)},
    Shapes.Pos{s(size, 548)}, s(size, 164), 132385, 250, haze)
  +abyss = Ring.draw(depth, size, Shapes.Pos{s(size, 516)},
    Shapes.Pos{s(size, 548)}, s(size, 133), s(size, 148),
    2516834, 181, well)
  +glow = Ring.draw(depth, size, Shapes.Pos{s(size, 529)},
    Shapes.Pos{s(size, 570)}, s(size, 75), s(size, 88),
    4328625, 171, abyss)
  +deep = Shapes.disk(depth, size, Shapes.Pos{s(size, 539)},
    Shapes.Pos{s(size, 582)}, s(size, 47), 991271, 252, glow)
  +eye = Shapes.disk(depth, size, Shapes.Pos{s(size, 547)},
    Shapes.Pos{s(size, 591)}, s(size, 13), 6745298, 164, deep)
  +star_l = Shapes.disk(depth, size, Shapes.Pos{s(size, 486)},
    Shapes.Pos{s(size, 523)}, s(size, 2), 12181733, 235, eye)
  +star_r = Shapes.disk(depth, size, Shapes.Pos{s(size, 592)},
    Shapes.Pos{s(size, 558)}, s(size, 2), 12181733, 201, star_l)
  Shapes.disk(depth, size, Shapes.Pos{s(size, 516)},
    Shapes.Pos{s(size, 637)}, s(size, 3), 11128028, 211, star_r)

def hall(+depth: Nat, +size: U32, image: Image) -> Image:
  +arch = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 486)}, s(size, 409), s(size, 449),
    3637578, 184, image)
  +inner = Ring.draw(depth, size, Shapes.Pos{s(size, 512)},
    Shapes.Pos{s(size, 486)}, s(size, 405), s(size, 410),
    9929540, 100, arch)
  +left_shadow = Facet.draw(depth, size,
    Quad.make(point(size, 75, 198), point(size, 163, 195),
      point(size, 211, 819), point(size, 89, 841)),
    1250314, 255, inner)
  +left_pier = Grain.draw(depth, size,
    Quad.make(point(size, 91, 204), point(size, 153, 200),
      point(size, 192, 812), point(size, 106, 835)),
    Grain.Palette{3554894, 3225926, 3883857}, 29, 8, 250, left_shadow)
  +right_shadow = Facet.draw(depth, size,
    Quad.make(point(size, 861, 195), point(size, 949, 198),
      point(size, 935, 841), point(size, 813, 819)),
    1250314, 255, left_pier)
  +right_pier = Grain.draw(depth, size,
    Quad.make(point(size, 871, 200), point(size, 933, 204),
      point(size, 918, 835), point(size, 832, 812)),
    Grain.Palette{3554894, 3225926, 3883857}, 137, 8, 250, right_shadow)
  +beam = Facet.draw(depth, size,
    Quad.make(point(size, 156, 197), point(size, 868, 197),
      point(size, 849, 227), point(size, 175, 227)),
    2637658, 255, right_pier)
  Facet.draw(depth, size,
    Quad.make(point(size, 175, 227), point(size, 849, 227),
      point(size, 840, 234), point(size, 184, 234)),
    8275762, 116, beam)

def slab(+depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p11: Quad.Point, +p01: Quad.Point,
  +style: RaisedFacet.Surface, +material: Grain.Palette, +seed: U32,
  +edge: U32, image: Image) -> Image:
  +mass = RaisedFacet.paint_corners(depth, size,
    p00, p10, p11, p01, 0.0, U32.to_f32(s(size, 28)), style, image)
  +face = AffineGrain.draw(depth, size, p00, p10, p01,
    material, seed, 16, 255, mass)
  Facet.draw(depth, size,
    Quad.make(p00, p10, RaisedFacet.offset(p10, 0.0, U32.to_f32(s(size, 3))),
      RaisedFacet.offset(p00, 0.0, U32.to_f32(s(size, 3)))),
    edge, 151, face)

def slab_source(+depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p11: Quad.Point, +p01: Quad.Point,
  +style: RaisedFacet.Surface, +source_depth: Nat, +source_size: U32,
  +source: Image, +edge: U32, image: Image) -> Image:
  +mass = RaisedFacet.paint_corners(depth, size,
    p00, p10, p11, p01, 0.0, U32.to_f32(s(size, 28)), style, image)
  +face = AffineTexture.draw(depth, size, p00, p10, p01,
    source_depth, source_size, source, 255, mass)
  Facet.draw(depth, size,
    Quad.make(p00, p10, RaisedFacet.offset(p10, 0.0, U32.to_f32(s(size, 3))),
      RaisedFacet.offset(p00, 0.0, U32.to_f32(s(size, 3)))),
    edge, 151, face)

def platforms(+depth: Nat, +size: U32, image: Image) -> Image:
  +far = slab(depth, size,
    point(size, 344, 289), point(size, 673, 285),
    point(size, 728, 428), point(size, 399, 432),
    RaisedFacet.Surface{7961703, 2895664, 10455475, 394507, 13614671},
    Grain.Palette{7961703, 6973510, 9277570}, 41,
    10455475, image)
  +left = slab(depth, size,
    point(size, 147, 440), point(size, 399, 400),
    point(size, 483, 621), point(size, 231, 661),
    RaisedFacet.Surface{10918250, 4739922, 14599554, 263431, 15655603},
    Grain.Palette{10918250, 9406084, 12295595}, 89,
    14599554, far)
  +right = slab(depth, size,
    point(size, 569, 427), point(size, 836, 469),
    point(size, 754, 673), point(size, 487, 631),
    RaisedFacet.Surface{4872030, 1845556, 10131558, 132385, 8215273},
    Grain.Palette{4872030, 4081765, 6186075}, 127,
    10131558, left)
  slab(depth, size,
    point(size, 323, 680), point(size, 536, 641),
    point(size, 606, 798), point(size, 393, 837),
    RaisedFacet.Surface{9549980, 3816516, 13802839, 263431, 15262396},
    Grain.Palette{9549980, 8299160, 10854882}, 173,
    13802839, right)

def platforms_textured(+depth: Nat, +size: U32,
  +source_depth: Nat, +source_size: U32, +source: Image,
  image: Image) -> Image:
  +far = slab_source(depth, size,
    point(size, 344, 289), point(size, 673, 285),
    point(size, 728, 428), point(size, 399, 432),
    RaisedFacet.Surface{7961703, 2895664, 10455475, 394507, 13614671},
    source_depth, source_size, source, 10455475, image)
  +left = slab_source(depth, size,
    point(size, 147, 440), point(size, 399, 400),
    point(size, 483, 621), point(size, 231, 661),
    RaisedFacet.Surface{10918250, 4739922, 14599554, 263431, 15655603},
    source_depth, source_size, source, 14599554, far)
  +right = slab(depth, size,
    point(size, 569, 427), point(size, 836, 469),
    point(size, 754, 673), point(size, 487, 631),
    RaisedFacet.Surface{4872030, 1845556, 10131558, 132385, 8215273},
    Grain.Palette{4872030, 4081765, 6186075}, 127,
    10131558, left)
  slab_source(depth, size,
    point(size, 323, 680), point(size, 536, 641),
    point(size, 606, 798), point(size, 393, 837),
    RaisedFacet.Surface{9549980, 3816516, 13802839, 263431, 15262396},
    source_depth, source_size, source, 13802839, right)

def screen(+depth: Nat, +size: U32) -> Image:
  +a = sky(depth, size)
  +b = hall(depth, size, a)
  +c = platforms(depth, size, b)
  +title = Widgets.label(depth, "MATERIAL / ATLAS HALL", s(size, 72),
    s(size, 52), s(size, 3), 15592941, 132385, c)
  +rule = Widgets.rule(depth, s(size, 72), s(size, 109),
    s(size, 952), 9929540, title)
  Widgets.label(depth, "Four suspended surfaces. One continuous aperture.",
    s(size, 72), s(size, 126), s(size, 2), 10919860, 132385, rule)

def screen_textured(+depth: Nat, +size: U32,
  +source_depth: Nat, +source_size: U32, +source: Image) -> Image:
  +a = sky(depth, size)
  +b = hall(depth, size, a)
  +c = platforms_textured(depth, size, source_depth, source_size, source, b)
  +title = Widgets.label(depth, "MATERIAL / ATLAS HALL", s(size, 72),
    s(size, 52), s(size, 3), 15592941, 132385, c)
  +rule = Widgets.rule(depth, s(size, 72), s(size, 109),
    s(size, 952), 9929540, title)
  Widgets.label(depth, "Four suspended surfaces. One continuous aperture.",
    s(size, 72), s(size, 126), s(size, 2), 10919860, 132385, rule)
