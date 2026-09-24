# Small immutable Image operations; no target/camera/game policy.
# Valid Image/depth is a caller precondition, as in core DRAFT law 1.
import Base

def tl(image: Image) -> Image:
  match image:
    case Pix{color}: Pix{color}
    case Qua{tl, tr, bl, br}: tl

def tr(image: Image) -> Image:
  match image:
    case Pix{color}: Pix{color}
    case Qua{tl, tr, bl, br}: tr

def bl(image: Image) -> Image:
  match image:
    case Pix{color}: Pix{color}
    case Qua{tl, tr, bl, br}: bl

def br(image: Image) -> Image:
  match image:
    case Pix{color}: Pix{color}
    case Qua{tl, tr, bl, br}: br

def quad_case(same: Bool, a: U32, b: U32, c: U32, d: U32) -> Image:
  match same:
    case True{}: Pix{a}
    case False{}: Qua{Pix{a}, Pix{b}, Pix{c}, Pix{d}}

def quad(+tl: Image, +tr: Image, +bl: Image, +br: Image) -> Image:
  match tl tr bl br:
    case Pix{+a} Pix{+b} Pix{+c} Pix{+d}:
      quad_case(Bool.and(Bool.and(U32.is_eq(a, b), U32.is_eq(a, c)),
        U32.is_eq(a, d)), a, b, c, d)
    case _ _ _ _: Qua{tl, tr, bl, br}
