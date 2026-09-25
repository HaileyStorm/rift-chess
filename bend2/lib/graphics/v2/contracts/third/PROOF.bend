# NEW DRAFT witnesses. Source algebra does not prove compiler/device correctness.
import ./LAWS.bend as Laws
import Base
import ../../third/Surface.bend as Surface
import ../../third/Blur.bend as Blur
import ../../third/PreparedSprite.bend as Cached
import ../../third/Raster.bend as Raster
import ../../third/Paint.bend as Paint
import ../../third/Shape.bend as Shape
import ../../third/Brush.bend as Brush
import ../../Rect.bend as Rect
import ../../ImageOps.bend as Ops

# Exact full opacity uses the explicit endpoint branch, not arithmetic cancellation.
def Laws.group_full_identity(surface):
  match surface:
    case Surface.Surface{depth,size,pixels}: {==}

# Extent preservation is observable even though all image samples become transparent.
def Laws.group_zero_preserves_extent(depth,size,pixels):
  {==}

# The zero-radius branch does not allocate or convert an owned pixel buffer.
def Laws.blur_zero_identity(surface,border):
  match surface:
    case Surface.Surface{depth,size,pixels}: {==}

# The cache is not traversed at zero opacity; no source shape assumption is needed.
def Laws.cached_zero_identity(patch,target):
  match patch:
    case Cached.Patch{depth,size,bounds,colors,mask}: {==}

# Empty painter lists are a structural identity at every tile location.
def Laws.empty_raster_identity(depth,size,x,y,target):
  {==}

# Transparent coverage skips all brush evaluation by the explicit branch.
def Laws.zero_coverage_identity(brush,x,y,target):
  match target:
    case Pix{pixel}: {==}
    case Qua{a,b,c,d}: {==}

# Congruence through the same compaction constructor retains structural equality.
def quad_equal(+a: Image,+b: Image,+c: Image,+d: Image,+aa: Image,+bb: Image,+cc: Image,+dd: Image,
  ea: {a == aa : Image},eb: {b == bb : Image},ec: {c == cc : Image},ed: {d == dd : Image})
  -> {Ops.quad(a,b,c,d) == Ops.quad(aa,bb,cc,dd) : Image}:
  %ea : {Ops.quad(a,b,c,d) == Ops.quad(_,bb,cc,dd) : Image}
  %eb : {Ops.quad(a,b,c,d) == Ops.quad(a,_,cc,dd) : Image}
  %ec : {Ops.quad(a,b,c,d) == Ops.quad(a,b,_,dd) : Image}
  %ed : {Ops.quad(a,b,c,d) == Ops.quad(a,b,c,_) : Image}
  {==}

# Induction on bounded fork count and image depth; child regions remain ordered.
def agrees(+forks: Nat,+depth: Nat,+span: U32,+x: U32,+y: U32,+outside: Bool,
  +shape: Shape.Shape,+brush: Brush.Brush,+quality: Shape.Quality,+clip: Rect.Box,+target: Image)
  -> {Paint.pool(forks,depth,span,x,y,outside,shape,brush,quality,clip,target) == Paint.region(depth,span,x,y,outside,shape,brush,quality,clip,target) : Image}:
  match forks depth outside:
    case 0n 0n True{}: {==}
    case 0n 1n+lower True{}: {==}
    case 1n+rest 0n True{}: {==}
    case 1n+rest 1n+lower True{}: {==}
    case 0n _ False{}: {==}
    case 1n+rest 0n False{}: {==}
    case 1n+rest 1n+lower False{}:
      +h = U32.div(span,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      +a = Ops.tl(target)
      +b = Ops.tr(target)
      +c = Ops.bl(target)
      +d = Ops.br(target)
      +oa = Bool.not(Rect.overlaps(clip,Rect.cell(x,y,h)))
      +ob = Bool.not(Rect.overlaps(clip,Rect.cell(xx,y,h)))
      +oc = Bool.not(Rect.overlaps(clip,Rect.cell(x,yy,h)))
      +od = Bool.not(Rect.overlaps(clip,Rect.cell(xx,yy,h)))
      quad_equal(Paint.pool(rest,lower,h,x,y,oa,shape,brush,quality,clip,a),Paint.pool(rest,lower,h,xx,y,ob,shape,brush,quality,clip,b),
        Paint.pool(rest,lower,h,x,yy,oc,shape,brush,quality,clip,c),Paint.pool(rest,lower,h,xx,yy,od,shape,brush,quality,clip,d),
        Paint.region(lower,h,x,y,oa,shape,brush,quality,clip,a),Paint.region(lower,h,xx,y,ob,shape,brush,quality,clip,b),
        Paint.region(lower,h,x,yy,oc,shape,brush,quality,clip,c),Paint.region(lower,h,xx,yy,od,shape,brush,quality,clip,d),
        agrees(rest,lower,h,x,y,oa,shape,brush,quality,clip,a),agrees(rest,lower,h,xx,y,ob,shape,brush,quality,clip,b),
        agrees(rest,lower,h,x,yy,oc,shape,brush,quality,clip,c),agrees(rest,lower,h,xx,yy,od,shape,brush,quality,clip,d))

# Universal typed source refinement; runtime evidence is separately recorded.
def Laws.paint_scheduling_refinement(forks,depth,span,x,y,outside,shape,brush,quality,clip,target):
  agrees(forks,depth,span,x,y,outside,shape,brush,quality,clip,target)

# Explicit offload changes scheduling intent, not the source value being returned.
def Laws.raster_offload_source_refinement(surface,commands,forks):
  match surface:
    case Surface.Surface{depth,size,pixels}: {==}
