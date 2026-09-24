# Internal DRAFT translated sprite kernel. Outside regions and uniform
# transparent mask subtrees are pruned BEFORE source-color access. Source
# cursors are immutable and narrowed once per target node, not per pixel.
import Base
import ./Color.bend as Color
import ./ImageOps.bend as ImageOps
import ./ImageView.bend as ImageView
import ./MaskedLayer.bend as MaskedLayer

type Work is Data:
  Unchanged{}
  Aligned{colors: Image, mask: Image}
  Split{colors: ImageView.View, mask: ImageView.View}

def pair_case(aligned: Bool, +colors: ImageView.View,
  +mask: ImageView.View) -> Work:
  match aligned:
    case True{}: Aligned{ImageView.pixels(colors), ImageView.pixels(mask)}
    case False{}: Split{colors, mask}

def pair(+x: U32, +y: U32, +size: U32,
  +colors: ImageView.View, +mask: ImageView.View) -> Work:
  pair_case(Bool.and(ImageView.matches(colors, x, y, size),
    ImageView.matches(mask, x, y, size)), colors, mask)

def mask_case(empty: Bool, +x: U32, +y: U32, +size: U32,
  colors: ImageView.View, mask: ImageView.View) -> Work:
  match empty:
    case True{}: Unchanged{}
    case False{}: pair(x, y, size, ImageView.narrow(colors, x, y, size), mask)

def mask_focused(+x: U32, +y: U32, +size: U32,
  colors: ImageView.View, +mask: ImageView.View) -> Work:
  mask_case(MaskedLayer.transparent(ImageView.pixels(mask)),
    x, y, size, colors, mask)

def outside_case(excluded: Bool, +x: U32, +y: U32, +size: U32,
  colors: ImageView.View, mask: ImageView.View) -> Work:
  match excluded:
    case True{}: Unchanged{}
    case False{}:
      mask_focused(x, y, size, colors, ImageView.narrow(mask, x, y, size))

def prepare(+x: U32, +y: U32, +size: U32,
  colors: ImageView.View, +mask: ImageView.View) -> Work:
  outside_case(ImageView.outside(mask, x, y, size), x, y, size, colors, mask)

# A small sequential leaf region avoids cursor classification at every pixel.
# This is an implementation cutoff, not a screen/camera policy or pixel rule.
def leaf_span() -> U32:
  8

def leaf_case(empty: Bool, +x: U32, +y: U32, colors: ImageView.View,
  alpha: U32, image: Image) -> Image:
  match empty:
    case True{}: image
    case False{}:
      match image:
        case Pix{background}:
          Pix{Color.over(ImageView.sample(colors, x, y), background, alpha)}
        case Qua{tl, tr, bl, br}: Qua{tl, tr, bl, br}

def leaf(+x: U32, +y: U32, colors: ImageView.View,
  mask: ImageView.View, opacity: U32, image: Image) -> Image:
  +alpha = MaskedLayer.effective(Color.red(ImageView.sample(mask, x, y)), opacity)
  leaf_case(U32.is_zero(alpha), x, y, colors, alpha, image)

# No parallel let here: the bounded leaf is deliberately sequential. Larger
# target branches retain balanced, immutable plain-call forks in tree below.
def scalar_tree(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +colors: ImageView.View, +mask: ImageView.View, +opacity: U32,
  excluded: Bool, +image: Image) -> Image:
  match depth excluded:
    case 0n True{}: image
    case 0n False{}: leaf(x, y, colors, mask, opacity, image)
    case 1n+rest True{}: image
    case 1n+rest False{}:
      +half = U32.div(size, 2)
      +xx = U32.add(x, half)
      +yy = U32.add(y, half)
      a = scalar_tree(rest, half, x, y, colors, mask, opacity,
        ImageView.outside(mask, x, y, half), ImageOps.tl(image))
      b = scalar_tree(rest, half, xx, y, colors, mask, opacity,
        ImageView.outside(mask, xx, y, half), ImageOps.tr(image))
      c = scalar_tree(rest, half, x, yy, colors, mask, opacity,
        ImageView.outside(mask, x, yy, half), ImageOps.bl(image))
      d = scalar_tree(rest, half, xx, yy, colors, mask, opacity,
        ImageView.outside(mask, xx, yy, half), ImageOps.br(image))
      Qua{a, b, c, d}

def tree(+depth: Nat, +size: U32, +x: U32, +y: U32,
  work: Work, terminal: Bool, +opacity: U32, +image: Image) -> Image:
  match depth work terminal:
    case 0n Unchanged{} _: image
    case 0n Aligned{colors, mask} _: MaskedLayer.over(depth, colors, mask, opacity, image)
    case 0n Split{colors, mask} _: leaf(x, y, colors, mask, opacity, image)
    case 1n+rest Unchanged{} _: image
    case 1n+rest Aligned{colors, mask} _:
      MaskedLayer.over(depth, colors, mask, opacity, image)
    case 1n+rest Split{colors, mask} True{}:
      scalar_tree(depth, size, x, y, colors, mask, opacity, False{}, image)
    case 1n+rest Split{+colors, +mask} False{}:
      +half = U32.div(size, 2)
      +xx = U32.add(x, half)
      +yy = U32.add(y, half)
      +small = U32.is_le(half, leaf_span())
      a b c d = tree(rest, half, x, y, prepare(x, y, half, colors, mask),
          small, opacity, ImageOps.tl(image))
        tree(rest, half, xx, y, prepare(xx, y, half, colors, mask),
          small, opacity, ImageOps.tr(image))
        tree(rest, half, x, yy, prepare(x, yy, half, colors, mask),
          small, opacity, ImageOps.bl(image))
        tree(rest, half, xx, yy, prepare(xx, yy, half, colors, mask),
          small, opacity, ImageOps.br(image))
      Qua{a, b, c, d}

def start(+target_depth: Nat, +target_size: U32,
  +colors: ImageView.View, +mask: ImageView.View,
  opacity: U32, image: Image) -> Image:
  tree(target_depth, target_size, 4096, 4096,
    prepare(4096, 4096, target_size, colors, mask),
    U32.is_le(target_size, leaf_span()), opacity, image)
