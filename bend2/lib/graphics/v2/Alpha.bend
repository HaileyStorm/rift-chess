# Color a pure 8-bit opacity Image over a packed RGB destination Image.
# Uniform transparent regions preserve the exact destination subtree;
# uniform opaque regions replace it without reading the background.
import Base
import ./Color.bend as Color

def uniform(+depth: Nat, +alpha: U32, +ink: U32, image: Image) -> Image:
  match depth image:
    case 0n Pix{background}: Pix{Color.over(ink, background, alpha)}
    case 0n Qua{tl, tr, bl, br}: Pix{0}
    case 1n+rest Pix{background}: Pix{Color.over(ink, background, alpha)}
    case 1n+rest Qua{tl, tr, bl, br}:
      a b c d = uniform(rest, alpha, ink, tl)
        uniform(rest, alpha, ink, tr)
        uniform(rest, alpha, ink, bl)
        uniform(rest, alpha, ink, br)
      Qua{a, b, c, d}

def uniform_case(empty: Bool, full: Bool, +depth: Nat, +alpha: U32,
  +ink: U32, image: Image) -> Image:
  match empty full:
    case True{} _: image
    case False{} True{}: Pix{ink}
    case False{} False{}: uniform(depth, alpha, ink, image)

def uniform_mask(+depth: Nat, +alpha: U32, +ink: U32, image: Image) -> Image:
  uniform_case(U32.is_zero(alpha), U32.is_ge(alpha, 255),
    depth, alpha, ink, image)

def apply(+depth: Nat, mask: Image, +ink: U32, image: Image) -> Image:
  match depth mask:
    case 0n Pix{alpha}: uniform_mask(depth, alpha, ink, image)
    case 0n Qua{tl, tr, bl, br}: image
    case 1n+rest Pix{alpha}: uniform_mask(depth, alpha, ink, image)
    case 1n+rest Qua{tl, tr, bl, br}:
      match image:
        case Pix{+background}:
          a b c d = apply(rest, tl, ink, Pix{background})
            apply(rest, tr, ink, Pix{background})
            apply(rest, bl, ink, Pix{background})
            apply(rest, br, ink, Pix{background})
          Qua{a, b, c, d}
        case Qua{aa, bb, cc, dd}:
          a b c d = apply(rest, tl, ink, aa)
            apply(rest, tr, ink, bb)
            apply(rest, bl, ink, cc)
            apply(rest, br, ink, dd)
          Qua{a, b, c, d}
