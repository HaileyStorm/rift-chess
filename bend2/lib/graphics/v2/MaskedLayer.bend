# Aligned two-Image red-alpha composition. Rounded opacity is applied once.
# Whole transparent/opaque mask subtrees avoid scalar source lookups.
import Base
import ./Color.bend as Color
import ./Layer.bend as Layer
import ./ImageOps.bend as ImageOps

def effective(alpha: U32, opacity: U32) -> U32:
  U32.div(U32.add(U32.mul(alpha, U32.min(opacity, 255)), 127), 255)

def transparent(mask: Image) -> Bool:
  match mask:
    case Pix{color}: U32.is_zero(Color.red(color))
    case Qua{tl, tr, bl, br}: False{}

def tree(+depth: Nat, +colors: Image, mask: Image,
  +opacity: U32, +image: Image) -> Image:
  match depth mask:
    case 0n Pix{color}:
      Layer.over(depth, colors, effective(Color.red(color), opacity), image)
    case 0n Qua{tl, tr, bl, br}: image
    case 1n+rest Pix{color}:
      Layer.over(depth, colors, effective(Color.red(color), opacity), image)
    case 1n+rest Qua{tl, tr, bl, br}:
      a b c d = tree(rest, ImageOps.tl(colors), tl, opacity, ImageOps.tl(image))
        tree(rest, ImageOps.tr(colors), tr, opacity, ImageOps.tr(image))
        tree(rest, ImageOps.bl(colors), bl, opacity, ImageOps.bl(image))
        tree(rest, ImageOps.br(colors), br, opacity, ImageOps.br(image))
      Qua{a, b, c, d}

def over_zero(zero: Bool, depth: Nat, colors: Image, mask: Image,
  opacity: U32, image: Image) -> Image:
  match zero:
    case True{}: image
    case False{}: tree(depth, colors, mask, opacity, image)

def over(depth: Nat, colors: Image, mask: Image,
  +opacity: U32, image: Image) -> Image:
  over_zero(U32.is_zero(opacity), depth, colors, mask, opacity, image)
