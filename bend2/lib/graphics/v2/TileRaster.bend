# DRAFT sequential tile execution. There are no parallel lets in this module
# or its numeric/image lookup dependencies. RenderPlan alone sets fork depth.
import Base
import ./Color.bend as Color
import ./ImageOps.bend as Ops
import ./Rect.bend as Rect
import ./MaskedLayer.bend as Masked

def blend(+depth: Nat,+source: Image,+alpha: U32,+target: Image) -> Image:
  match depth source target:
    case _ Pix{ink} Pix{background}: Pix{Color.over(ink,background,alpha)}
    case 0n _ _: target
    case 1n+rest _ _:
      a = blend(rest,Ops.tl(source),alpha,Ops.tl(target))
      b = blend(rest,Ops.tr(source),alpha,Ops.tr(target))
      c = blend(rest,Ops.bl(source),alpha,Ops.bl(target))
      d = blend(rest,Ops.br(source),alpha,Ops.br(target))
      Qua{a,b,c,d}

def over_case(empty: Bool,full: Bool,depth: Nat,source: Image,alpha: U32,target: Image) -> Image:
  match empty full:
    case True{} _: target
    case False{} True{}: source
    case False{} False{}: blend(depth,source,alpha,target)

def over(depth: Nat,source: Image,+alpha: U32,target: Image) -> Image:
  over_case(U32.is_zero(alpha),U32.is_ge(alpha,255),depth,source,alpha,target)

def masked(+depth: Nat,+source: Image,mask: Image,+opacity: U32,+target: Image) -> Image:
  match depth mask:
    case _ Pix{coverage}:
      over(depth,source,Masked.effective(Color.red(coverage),opacity),target)
    case 0n Qua{a,b,c,d}: target
    case 1n+rest Qua{aa,bb,cc,dd}:
      a = masked(rest,Ops.tl(source),aa,opacity,Ops.tl(target))
      b = masked(rest,Ops.tr(source),bb,opacity,Ops.tr(target))
      c = masked(rest,Ops.bl(source),cc,opacity,Ops.bl(target))
      d = masked(rest,Ops.br(source),dd,opacity,Ops.br(target))
      Qua{a,b,c,d}

def fill_tree(+depth: Nat,+size: U32,+x: U32,+y: U32,
  outside: Bool,inside: Bool,+bounds: Rect.Box,+ink: U32,+opacity: U32,+target: Image) -> Image:
  match depth outside inside:
    case _ True{} _: target
    case _ False{} True{}: over(depth,Pix{ink},opacity,target)
    case 0n False{} False{}: target
    case 1n+rest False{} False{}:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = fill_tree(rest,h,x,y,Bool.not(Rect.overlaps(bounds,Rect.cell(x,y,h))),Rect.contains(bounds,Rect.cell(x,y,h)),bounds,ink,opacity,Ops.tl(target))
      b = fill_tree(rest,h,xx,y,Bool.not(Rect.overlaps(bounds,Rect.cell(xx,y,h))),Rect.contains(bounds,Rect.cell(xx,y,h)),bounds,ink,opacity,Ops.tr(target))
      c = fill_tree(rest,h,x,yy,Bool.not(Rect.overlaps(bounds,Rect.cell(x,yy,h))),Rect.contains(bounds,Rect.cell(x,yy,h)),bounds,ink,opacity,Ops.bl(target))
      d = fill_tree(rest,h,xx,yy,Bool.not(Rect.overlaps(bounds,Rect.cell(xx,yy,h))),Rect.contains(bounds,Rect.cell(xx,yy,h)),bounds,ink,opacity,Ops.br(target))
      Qua{a,b,c,d}

def fill(+depth: Nat,+size: U32,+x: U32,+y: U32,+bounds: Rect.Box,ink: U32,+opacity: U32,target: Image) -> Image:
  fill_tree(depth,size,x,y,Bool.or(U32.is_zero(opacity),Bool.not(Rect.overlaps(bounds,Rect.cell(x,y,size)))),
    Rect.contains(bounds,Rect.cell(x,y,size)),bounds,ink,opacity,target)
