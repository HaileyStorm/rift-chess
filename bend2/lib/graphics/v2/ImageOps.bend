# Small immutable Image operations; no target/camera/game policy.
# Valid Image/depth is a caller precondition, as in core DRAFT law 1.
import Base
import ./Rect.bend as Rect

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

# Replace whole integer pixels inside a half-open rectangle. Preserve the
# original immutable subtree outside; both inputs have the supplied depth.
def replace_rect_region(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +clip: Rect.Box, +old: Image, +fresh: Image, overlap: Bool, contained: Bool) -> Image:
  match depth overlap contained:
    case _ False{} _: old
    case _ True{} True{}: fresh
    case 0n True{} False{}: fresh
    case 1n+rest True{} False{}:
      +half = U32.div(size,2)
      +xx = U32.add(x,half)
      +yy = U32.add(y,half)
      +a = Rect.cell(x,y,half)
      +b = Rect.cell(xx,y,half)
      +c = Rect.cell(x,yy,half)
      +d = Rect.cell(xx,yy,half)
      aa bb cc dd = replace_rect_region(rest,half,x,y,clip,tl(old),tl(fresh),Rect.overlaps(clip,a),Rect.contains(clip,a))
        replace_rect_region(rest,half,xx,y,clip,tr(old),tr(fresh),Rect.overlaps(clip,b),Rect.contains(clip,b))
        replace_rect_region(rest,half,x,yy,clip,bl(old),bl(fresh),Rect.overlaps(clip,c),Rect.contains(clip,c))
        replace_rect_region(rest,half,xx,yy,clip,br(old),br(fresh),Rect.overlaps(clip,d),Rect.contains(clip,d))
      quad(aa,bb,cc,dd)

def replace_rect(+depth: Nat,+size: U32,+clip: Rect.Box,old: Image,fresh: Image) -> Image:
  +cell = Rect.screen(size)
  replace_rect_region(depth,size,0,0,clip,old,fresh,Rect.overlaps(clip,cell),Rect.contains(clip,cell))
