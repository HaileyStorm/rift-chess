# DRAFT pure surface rasterization with prepared shape/brush inputs.
# Brush sampled at pixel center; coverage quantized once then scales PMA once.
# Source-over only here. Other blend/group modes are explicit Surface operations.
import Base
import ./Shape.bend as Shape
import ./Brush.bend as Brush
import ./Premul.bend as P
import ./Surface.bend as Surface
import ../Rect.bend as Rect
import ../ImageOps.bend as Ops

# Branch before gradient sampling; zero geometric coverage is exact target identity.
def pixel(zero: Bool,coverage: U32,brush: Brush.Brush,x: U32,y: U32,target: Image) -> Image:
  match zero target:
    case True{} _: target
    case False{} Pix{background}:
      Pix{P.blend(P.Over{},P.scale(Brush.sample(brush,F32.add(U32.to_f32(x),0.5),F32.add(U32.to_f32(y),0.5)),coverage),background)}
    case False{} Qua{a,b,c,d}: Qua{a,b,c,d}

# True serial region; no parallel lets in this leaf kernel or its dependencies.
def region(+depth: Nat,+span: U32,+x: U32,+y: U32,outside: Bool,
  +shape: Shape.Shape,+brush: Brush.Brush,+quality: Shape.Quality,+clip: Rect.Box,+target: Image) -> Image:
  match depth outside:
    case _ True{}: target
    case 0n False{}:
      +coverage = Shape.coverage(shape,quality,x,y)
      pixel(U32.is_zero(coverage),coverage,brush,x,y,target)
    case 1n+rest False{}:
      +h = U32.div(span,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = region(rest,h,x,y,Bool.not(Rect.overlaps(clip,Rect.cell(x,y,h))),shape,brush,quality,clip,Ops.tl(target))
      b = region(rest,h,xx,y,Bool.not(Rect.overlaps(clip,Rect.cell(xx,y,h))),shape,brush,quality,clip,Ops.tr(target))
      c = region(rest,h,x,yy,Bool.not(Rect.overlaps(clip,Rect.cell(x,yy,h))),shape,brush,quality,clip,Ops.bl(target))
      d = region(rest,h,xx,yy,Bool.not(Rect.overlaps(clip,Rect.cell(xx,yy,h))),shape,brush,quality,clip,Ops.br(target))
      Ops.quad(a,b,c,d)

# Bounded native forks above the same substantial serial kernel.
def pool(+forks: Nat,+depth: Nat,+span: U32,+x: U32,+y: U32,outside: Bool,
  +shape: Shape.Shape,+brush: Brush.Brush,+quality: Shape.Quality,+clip: Rect.Box,+target: Image) -> Image:
  match forks depth outside:
    case _ _ True{}: target
    case 0n _ False{}: region(depth,span,x,y,False{},shape,brush,quality,clip,target)
    case 1n+rest 0n False{}: region(depth,span,x,y,False{},shape,brush,quality,clip,target)
    case 1n+rest 1n+lower False{}:
      +h = U32.div(span,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a b c d = pool(rest,lower,h,x,y,Bool.not(Rect.overlaps(clip,Rect.cell(x,y,h))),shape,brush,quality,clip,Ops.tl(target))
        pool(rest,lower,h,xx,y,Bool.not(Rect.overlaps(clip,Rect.cell(xx,y,h))),shape,brush,quality,clip,Ops.tr(target))
        pool(rest,lower,h,x,yy,Bool.not(Rect.overlaps(clip,Rect.cell(x,yy,h))),shape,brush,quality,clip,Ops.bl(target))
        pool(rest,lower,h,xx,yy,Bool.not(Rect.overlaps(clip,Rect.cell(xx,yy,h))),shape,brush,quality,clip,Ops.br(target))
      Ops.quad(a,b,c,d)

# Public same-size surface draw. The application chooses sampling and fork budget.
def fill(surface: Surface.Surface,+shape: Shape.Shape,brush: Brush.Brush,quality: Shape.Quality,forks: Nat,clip: Rect.Box) -> Surface.Surface:
  match surface:
    case Surface.Surface{+depth,+size,pixels}:
      +bounds = Rect.intersect(clip,Shape.bounds(shape))
      Surface.Surface{depth,size,pool(forks,depth,size,0,0,Bool.not(Rect.overlaps(bounds,Rect.screen(size))),shape,brush,quality,bounds,pixels)}
