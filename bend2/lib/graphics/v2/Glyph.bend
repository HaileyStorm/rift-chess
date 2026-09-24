# Native-resolution coverage glyphs. No rescaling of a low-resolution atlas.
# Bearings are signed; the mask uses MaskedStamp's red-alpha representation.
# Font shaping / font selection / UI placement are not inferred here.
import Base
import ./Shapes.bend as Shapes
import ./MaskedStamp.bend as MaskedStamp

type Mask is Data:
  Mask{advance: U32, left: Shapes.Coord, top: Shapes.Coord,
    depth: Nat, size: U32, coverage: Image}

type Placed is Data:
  Placed{x: Shapes.Coord, y: Shapes.Coord, glyph: Mask}

def advance(glyph: Mask) -> U32:
  match glyph:
    case Mask{advance, left, top, depth, size, coverage}: advance

def biased_case(negative: Bool, +value: U32) -> Shapes.Coord:
  match negative:
    case True{}: Shapes.Neg{U32.sub(4096, value)}
    case False{}: Shapes.Pos{U32.sub(value, 4096)}

def bounded_case(valid: Bool, +value: U32) -> Shapes.Coord:
  match valid:
    case False{}: Shapes.Pos{4097}
    case True{}: biased_case(U32.is_lt(value, 4096), value)

def from_biased(+value: U32) -> Shapes.Coord:
  bounded_case(U32.is_le(value, 8192), value)

def shift_case(valid: Bool, origin: Shapes.Coord, distance: U32) -> Shapes.Coord:
  match valid:
    case False{}: Shapes.Pos{4097}
    case True{}: from_biased(U32.add(Shapes.biased(origin), distance))

# Bounded positive advance. The invalid sentinel remains invalid, never wraps.
def shift(+origin: Shapes.Coord, +distance: U32) -> Shapes.Coord:
  shift_case(Bool.and(Shapes.valid_coord(origin), U32.is_le(distance, 4096)),
    origin, distance)

def offset_sum(valid: Bool, sum: U32) -> Shapes.Coord:
  match valid:
    case False{}: Shapes.Pos{4097}
    case True{}: from_biased(U32.sub(sum, 4096))

def offset_valid(valid: Bool, origin: Shapes.Coord,
  offset: Shapes.Coord) -> Shapes.Coord:
  match valid:
    case False{}: Shapes.Pos{4097}
    case True{}:
      +sum = U32.add(Shapes.biased(origin), Shapes.biased(offset))
      offset_sum(Bool.and(U32.is_ge(sum, 4096), U32.is_le(sum, 12288)), sum)

def translate(+origin: Shapes.Coord, +offset: Shapes.Coord) -> Shapes.Coord:
  offset_valid(Bool.and(Shapes.valid_coord(origin), Shapes.valid_coord(offset)),
    origin, offset)

def draw_zero(zero: Bool, target_depth: Nat, target_size: U32,
  x: Shapes.Coord, y: Shapes.Coord, glyph: Mask,
  ink: U32, opacity: U32, image: Image) -> Image:
  match zero:
    case True{}: image
    case False{}:
      match glyph:
        case Mask{advance, left, top, depth, size, coverage}:
          MaskedStamp.draw(target_depth, target_size, depth, size,
            translate(x, left), translate(y, top), Pix{ink}, coverage, opacity, image)

def draw(target_depth: Nat, target_size: U32, x: Shapes.Coord,
  y: Shapes.Coord, glyph: Mask, ink: U32, +opacity: U32, image: Image) -> Image:
  draw_zero(U32.is_zero(opacity), target_depth, target_size, x, y,
    glyph, ink, opacity, image)

# Explicit positioned run for shaped text supplied by a caller. Painter order
# is list order; no browser font rendering or mutable bitmap is involved.
def draw_run(run: List<&2, Placed>, +depth: Nat, +size: U32,
  +ink: U32, +opacity: U32, image: Image) -> Image:
  match run:
    case Nil{}: image
    case Con{Placed{x, y, glyph}, tail}:
      draw_run(tail, depth, size, ink, opacity,
        draw(depth, size, x, y, glyph, ink, opacity, image))
