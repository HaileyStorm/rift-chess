# Explicit prepare-once red-alpha normalization. Other channels carry no alpha.
# This is not Alpha.apply's raw-0..255 mask representation.
import Base
import ./Color.bend as Color
import ./ImageOps.bend as ImageOps

# Canonicalize to red-only and collapse uniform immediate children. This
# exposes transparent subtrees even when ignored G/B channels contain noise.
def prepare(+depth: Nat, mask: Image) -> Image:
  match depth mask:
    case 0n Pix{color}: Pix{U32.shln(Color.red(color), 16n)}
    case 0n Qua{tl, tr, bl, br}: Qua{tl, tr, bl, br}
    case 1n+rest Pix{color}: Pix{U32.shln(Color.red(color), 16n)}
    case 1n+rest Qua{tl, tr, bl, br}:
      a b c d = prepare(rest, tl)
        prepare(rest, tr)
        prepare(rest, bl)
        prepare(rest, br)
      ImageOps.quad(a, b, c, d)
