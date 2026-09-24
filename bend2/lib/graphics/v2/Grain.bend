# A generic clipped material fill for a convex projected facet. Palette
# variation is keyed to aligned screen-space blocks, not to a chess/grid
# coordinate. This path is intended for retained settled materials; the
# plain Facet path remains available for interaction frames.
# F32 edge coverage is finite/rendered evidence, not a cross-target theorem.
import Base
import ../Quad.bend as Quad
import ./Facet.bend as Facet
import ./Shapes.bend as Shapes

type Palette is Data:
  Palette{base: U32, shade: U32, spark: U32}

def valid_grain(+grain_size: U32) -> Bool:
  Bool.or(Bool.or(U32.is_eq(grain_size, 4), U32.is_eq(grain_size, 8)),
    Bool.or(U32.is_eq(grain_size, 16), U32.is_eq(grain_size, 32)))

# At the 4096 canvas limit and grain_size>=4, bx/by<=1023. Thus
# 73*bx+151*by+seed+((bx*by)%251) <= 229657; no U32 operation wraps.
def index(+x: U32, +y: U32, +seed: U32, +grain_size: U32) -> U32:
  +bx = U32.div(x, grain_size)
  +by = U32.div(y, grain_size)
  U32.mod(U32.add(U32.add(U32.mul(73, bx), U32.mul(151, by)),
    U32.add(seed, U32.mod(U32.mul(bx, by), 251))), 256)

def color_at(+x: U32, +y: U32, +seed: U32,
  +grain_size: U32, palette: Palette) -> U32:
  match palette:
    case Palette{base, shade, spark}:
      +h = index(x, y, seed, grain_size)
      Bool.pick(U32, U32.is_lt(h, 12), spark,
        Bool.pick(U32, U32.is_lt(h, 36), shade, base))

def tree(+depth: Nat, +size: U32, outside: Bool, fill: Bool,
  +x: U32, +y: U32, +q: Quad.Shape, +palette: Palette,
  +seed: U32, +grain_size: U32, +opacity: U32,
  image: Image) -> Image:
  match depth outside fill:
    case 0n True{} _: image
    case 0n False{} _:
      Shapes.paint_leaf(Facet.coverage(q, U32.to_f32(x), U32.to_f32(y)),
        opacity, color_at(x, y, seed, grain_size, palette), image)
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}:
      Shapes.full_disk(depth, opacity,
        color_at(x, y, seed, grain_size, palette), image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(x), U32.to_f32(y), half),
              Bool.and(U32.is_le(half, grain_size),
                Facet.inside_pixels(q, U32.to_f32(x), U32.to_f32(y), half)),
              x, y, q, palette, seed, grain_size, opacity, Pix{background})
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(xx), U32.to_f32(y), half),
              Bool.and(U32.is_le(half, grain_size),
                Facet.inside_pixels(q, U32.to_f32(xx), U32.to_f32(y), half)),
              xx, y, q, palette, seed, grain_size, opacity, Pix{background})
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(x), U32.to_f32(yy), half),
              Bool.and(U32.is_le(half, grain_size),
                Facet.inside_pixels(q, U32.to_f32(x), U32.to_f32(yy), half)),
              x, yy, q, palette, seed, grain_size, opacity, Pix{background})
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(xx), U32.to_f32(yy), half),
              Bool.and(U32.is_le(half, grain_size),
                Facet.inside_pixels(q, U32.to_f32(xx), U32.to_f32(yy), half)),
              xx, yy, q, palette, seed, grain_size, opacity, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(x), U32.to_f32(y), half),
              Bool.and(U32.is_le(half, grain_size),
                Facet.inside_pixels(q, U32.to_f32(x), U32.to_f32(y), half)),
              x, y, q, palette, seed, grain_size, opacity, tl)
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(xx), U32.to_f32(y), half),
              Bool.and(U32.is_le(half, grain_size),
                Facet.inside_pixels(q, U32.to_f32(xx), U32.to_f32(y), half)),
              xx, y, q, palette, seed, grain_size, opacity, tr)
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(x), U32.to_f32(yy), half),
              Bool.and(U32.is_le(half, grain_size),
                Facet.inside_pixels(q, U32.to_f32(x), U32.to_f32(yy), half)),
              x, yy, q, palette, seed, grain_size, opacity, bl)
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(xx), U32.to_f32(yy), half),
              Bool.and(U32.is_le(half, grain_size),
                Facet.inside_pixels(q, U32.to_f32(xx), U32.to_f32(yy), half)),
              xx, yy, q, palette, seed, grain_size, opacity, br)
          Qua{a, b, c, d}

def draw_valid(valid: Bool, +depth: Nat, +size: U32, +q: Quad.Shape,
  +palette: Palette, +seed: U32, +grain_size: U32,
  +opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      tree(depth, size,
        Facet.outside_pixels(q, 0.0, 0.0, size),
        Bool.and(U32.is_le(size, grain_size),
          Facet.inside_pixels(q, 0.0, 0.0, size)),
        0, 0, q, palette, seed, grain_size, opacity, image)

def draw_nonzero(+depth: Nat, +size: U32, +q: Quad.Shape,
  +palette: Palette, +seed: U32, +grain_size: U32,
  +opacity: U32, image: Image) -> Image:
  match q:
    case Quad.Shape{ab, bc, cd, da, area}:
      draw_valid(Bool.and(Bool.and((area > 0.1 : F32),
          valid_grain(grain_size)),
        U32.is_le(seed, 255)),
        depth, size, q, palette, seed, grain_size, opacity, image)

def draw_case(zero: Bool, +depth: Nat, +size: U32, +q: Quad.Shape,
  +palette: Palette, +seed: U32, +grain_size: U32,
  +opacity: U32, image: Image) -> Image:
  match zero:
    case True{}: image
    case False{}:
      draw_nonzero(depth, size, q, palette, seed, grain_size,
        opacity, image)

def draw(+depth: Nat, +size: U32, +q: Quad.Shape,
  +palette: Palette, +seed: U32, +grain_size: U32,
  +opacity: U32, image: Image) -> Image:
  draw_case(U32.is_zero(opacity), depth, size, q, palette, seed,
    grain_size, opacity, image)
