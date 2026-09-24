# Explicit prepare-once mip reduction, not an automatic LOD/tier policy.
# Straight RGB + red-alpha input; alpha-weighted RGB prevents hidden-color halos.
# Arithmetic is in encoded channel space, NOT linear-light or HDR filtering.
import Base
import ./Color.bend as Color
import ./ImageOps.bend as ImageOps

type Raster is Data:
  Raster{colors: Image, mask: Image}

type Level is Data:
  Level{depth: Nat, size: U32, colors: Image, mask: Image}

def raster_colors(value: Raster) -> Image:
  match value:
    case Raster{colors, mask}: colors

def raster_mask(value: Raster) -> Image:
  match value:
    case Raster{colors, mask}: mask

def pixel(image: Image) -> U32:
  match image:
    case Pix{color}: color
    case Qua{tl, tr, bl, br}: 0

def sum4(a: U32, b: U32, c: U32, d: U32) -> U32:
  U32.add(U32.add(a, b), U32.add(c, d))

def channel(+weight: U32, a: U32, b: U32, c: U32, d: U32,
  aa: U32, ab: U32, ac: U32, ad: U32) -> U32:
  U32.div(U32.add(sum4(U32.mul(a, aa), U32.mul(b, ab),
    U32.mul(c, ac), U32.mul(d, ad)), U32.div(weight, 2)), weight)

def reduce_case(empty: Bool, alpha: U32, +weight: U32,
  +a: U32, +b: U32, +c: U32, +d: U32,
  +aa: U32, +ab: U32, +ac: U32, +ad: U32) -> Raster:
  match empty:
    case True{}: Raster{Pix{0}, Pix{0}}
    case False{}:
      Raster{Pix{Color.rgb(
        channel(weight, Color.red(a), Color.red(b), Color.red(c), Color.red(d), aa, ab, ac, ad),
        channel(weight, Color.green(a), Color.green(b), Color.green(c), Color.green(d), aa, ab, ac, ad),
        channel(weight, Color.blue(a), Color.blue(b), Color.blue(c), Color.blue(d), aa, ab, ac, ad))},
        Pix{U32.shln(alpha, 16n)}}

def reduce(a: U32, b: U32, c: U32, d: U32,
  +aa: U32, +ab: U32, +ac: U32, +ad: U32) -> Raster:
  +weight = sum4(aa, ab, ac, ad)
  +alpha = U32.div(U32.add(weight, 2), 4)
  reduce_case(U32.is_zero(alpha), alpha, weight, a, b, c, d, aa, ab, ac, ad)

def four(+colors: Image, +mask: Image) -> Raster:
  reduce(pixel(ImageOps.tl(colors)), pixel(ImageOps.tr(colors)),
    pixel(ImageOps.bl(colors)), pixel(ImageOps.br(colors)),
    Color.red(pixel(ImageOps.tl(mask))), Color.red(pixel(ImageOps.tr(mask))),
    Color.red(pixel(ImageOps.bl(mask))), Color.red(pixel(ImageOps.br(mask))))

def join(+a: Raster, +b: Raster, +c: Raster, +d: Raster) -> Raster:
  Raster{ImageOps.quad(raster_colors(a), raster_colors(b), raster_colors(c), raster_colors(d)),
    ImageOps.quad(raster_mask(a), raster_mask(b), raster_mask(c), raster_mask(d))}

# remaining is input_depth - 1. Each recursive call consumes one layer.
def half_tree(+remaining: Nat, +colors: Image, +mask: Image) -> Raster:
  match remaining colors mask:
    case 0n _ _: four(colors, mask)
    case 1n+rest Pix{+color} Pix{+coverage}:
      +alpha = Color.red(coverage)
      reduce(color, color, color, color, alpha, alpha, alpha, alpha)
    case 1n+rest _ _:
      a b c d = half_tree(rest, ImageOps.tl(colors), ImageOps.tl(mask))
        half_tree(rest, ImageOps.tr(colors), ImageOps.tr(mask))
        half_tree(rest, ImageOps.bl(colors), ImageOps.bl(mask))
        half_tree(rest, ImageOps.br(colors), ImageOps.br(mask))
      join(a, b, c, d)

def half(depth: Nat, colors: Image, mask: Image) -> Raster:
  match depth:
    case 0n: Raster{colors, mask}
    case 1n+rest: half_tree(rest, colors, mask)

# Explicit level choice; requests beyond the image depth clamp at 1x1.
# A zero-level request preserves both original trees exactly.
def level(requested: Nat, +depth: Nat, +size: U32,
  colors: Image, mask: Image) -> Level:
  match requested depth:
    case 0n _: Level{depth, size, colors, mask}
    case 1n+rest 0n: Level{depth, size, colors, mask}
    case 1n+rest 1n+lower:
      +reduced = half(depth, colors, mask)
      level(rest, lower, U32.div(size, 2), raster_colors(reduced), raster_mask(reduced))
