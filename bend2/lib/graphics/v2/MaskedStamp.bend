# Generic two-Image alpha sprite compositor. RGB and mask are independently
# immutable source Images at the same power-of-two depth. The red channel of
# the mask is alpha; its other channels are ignored. No game, angle or mesh
# policy is embedded in this primitive.
import Base
import ../pixels/Pixel.bend as Pixel
import ./Color.bend as Color
import ./Shapes.bend as Shapes
import ./Stamp.bend as Stamp

def transparent(mask: Image) -> Bool:
  match mask:
    case Pix{color}: U32.is_zero(Color.red(color))
    case Qua{tl, tr, bl, br}: False{}

def leaf(+source_depth: Nat, +x: U32, +y: U32,
  +sx: U32, +sy: U32, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  match image:
    case Pix{background}:
      +source_x = U32.sub(x, sx)
      +source_y = U32.sub(y, sy)
      +color = Pixel.sample_xy(source_depth, source_x, source_y, colors)
      +mask_color = Pixel.sample_xy(source_depth, source_x, source_y, mask)
      +alpha = U32.div(U32.add(U32.mul(Color.red(mask_color),
        U32.min(opacity, 255)), 127), 255)
      Pix{Color.over(color, background, alpha)}
    case Qua{tl, tr, bl, br}: Qua{tl, tr, bl, br}

def tree(+depth: Nat, +source_depth: Nat, +size: U32,
  excluded: Bool, +x: U32, +y: U32, +sx: U32, +sy: U32,
  +source_size: U32, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  match depth excluded:
    case 0n True{}: image
    case 0n False{}:
      leaf(source_depth, x, y, sx, sy, colors, mask, opacity, image)
    case 1n+rest True{}: image
    case 1n+rest False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, source_depth, half,
              Stamp.outside(x, y, half, sx, sy, source_size),
              x, y, sx, sy, source_size, colors, mask, opacity, Pix{background})
            tree(rest, source_depth, half,
              Stamp.outside(xx, y, half, sx, sy, source_size),
              xx, y, sx, sy, source_size, colors, mask, opacity, Pix{background})
            tree(rest, source_depth, half,
              Stamp.outside(x, yy, half, sx, sy, source_size),
              x, yy, sx, sy, source_size, colors, mask, opacity, Pix{background})
            tree(rest, source_depth, half,
              Stamp.outside(xx, yy, half, sx, sy, source_size),
              xx, yy, sx, sy, source_size, colors, mask, opacity, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, source_depth, half,
              Stamp.outside(x, y, half, sx, sy, source_size),
              x, y, sx, sy, source_size, colors, mask, opacity, tl)
            tree(rest, source_depth, half,
              Stamp.outside(xx, y, half, sx, sy, source_size),
              xx, y, sx, sy, source_size, colors, mask, opacity, tr)
            tree(rest, source_depth, half,
              Stamp.outside(x, yy, half, sx, sy, source_size),
              x, yy, sx, sy, source_size, colors, mask, opacity, bl)
            tree(rest, source_depth, half,
              Stamp.outside(xx, yy, half, sx, sy, source_size),
              xx, yy, sx, sy, source_size, colors, mask, opacity, br)
          Qua{a, b, c, d}

def draw_valid(valid: Bool, +target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      +sx = Shapes.biased(left)
      +sy = Shapes.biased(top)
      tree(target_depth, source_depth, target_size,
        Stamp.outside(4096, 4096, target_size, sx, sy, source_size),
        4096, 4096, sx, sy, source_size, colors, mask, opacity, image)

def draw_mask(empty: Bool, +target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  match empty:
    case True{}: image
    case False{}:
      draw_valid(Bool.and(Shapes.valid_coord(left), Shapes.valid_coord(top)),
        target_depth, target_size, source_depth, source_size,
        left, top, colors, mask, opacity, image)

def draw_zero(zero: Bool, +target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  match zero:
    case True{}: image
    case False{}:
      draw_mask(transparent(mask), target_depth, target_size,
        source_depth, source_size, left, top, colors, mask, opacity, image)

def draw(+target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  draw_zero(U32.is_zero(opacity), target_depth, target_size,
    source_depth, source_size, left, top, colors, mask, opacity, image)
