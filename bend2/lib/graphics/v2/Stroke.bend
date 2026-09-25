# DRAFT prepared round-cap/round-join strokes for charts, diagrams and drawing.
# A balanced tree unions coverage at quarter samples BEFORE a single blend.
# Finite inputs in [-4096,4096], radius in [0,512], depth<=12 are the public domain.
import Base
import ../Quad.bend as Quad
import ./Rect.bend as Rect
import ./RgbaAffine.bend as Affine
import ./ImageOps.bend as Ops
import ./Shapes.bend as Shapes

type Path is Data:
  Empty{}
  Capsule{ax: F32,ay: F32,bx: F32,by: F32,radius2: F32,bounds: Rect.Box}
  Join{left: Path,right: Path,bounds: Rect.Box}

def bounds(path: Path) -> Rect.Box:
  match path:
    case Empty{}: Rect.empty()
    case Capsule{ax,ay,bx,by,radius2,bounds}: bounds
    case Join{left,right,bounds}: bounds

def line_case(valid: Bool,a: Quad.Point,b: Quad.Point,+radius: F32) -> Path:
  match valid a b:
    case False{} _ _: Empty{}
    case True{} Quad.Point{+ax,+ay} Quad.Point{+bx,+by}:
      Capsule{ax,ay,bx,by,F32.mul(radius,radius),Rect.Box{
        Affine.floor_bound(F32.sub(F32.min(ax,bx),radius)),
        Affine.floor_bound(F32.sub(F32.min(ay,by),radius)),
        Affine.ceil_bound(F32.add(F32.max(ax,bx),radius)),
        Affine.ceil_bound(F32.add(F32.max(ay,by),radius))}}

# Zero radius is an empty stroke; a zero-length positive-radius segment is a disk.
def line(a: Quad.Point,b: Quad.Point,+radius: F32) -> Path:
  line_case(Bool.and(F32.is_gt(radius,0.0),F32.is_le(radius,512.0)),a,b,radius)

def join(+left: Path,+right: Path) -> Path:
  match left right:
    case Empty{} _: right
    case _ Empty{}: left
    case _ _: Join{left,right,Rect.union(bounds(left),bounds(right))}

def middle(a: Quad.Point,b: Quad.Point) -> Quad.Point:
  match a b:
    case Quad.Point{ax,ay} Quad.Point{bx,by}:
      Quad.Point{F32.mul(F32.add(ax,bx),0.5),F32.mul(F32.add(ay,by),0.5)}

# Exactly 2^levels line segments, not a flat list traversed once per pixel.
# levels<=8 is the resource precondition; error tolerance is not inferred.
def quadratic(+levels: Nat,+a: Quad.Point,+control: Quad.Point,+b: Quad.Point,+radius: F32) -> Path:
  match levels:
    case 0n: line(a,b,radius)
    case 1n+rest:
      +ac = middle(a,control)
      +cb = middle(control,b)
      +mid = middle(ac,cb)
      l = quadratic(rest,a,ac,mid,radius)
      r = quadratic(rest,mid,cb,b,radius)
      join(l,r)

def cubic(+levels: Nat,+a: Quad.Point,+c1: Quad.Point,+c2: Quad.Point,+b: Quad.Point,+radius: F32) -> Path:
  match levels:
    case 0n: line(a,b,radius)
    case 1n+rest:
      +ab = middle(a,c1)
      +bc = middle(c1,c2)
      +cd = middle(c2,b)
      +abc = middle(ab,bc)
      +bcd = middle(bc,cd)
      +mid = middle(abc,bcd)
      l = cubic(rest,a,ab,abc,mid,radius)
      r = cubic(rest,mid,bcd,cd,b,radius)
      join(l,r)

def projection(zero: Bool,numerator: F32,denominator: F32) -> F32:
  match zero:
    case True{}: 0.0
    case False{}: F32.clamp(F32.div(numerator,denominator),0.0,1.0)

def capsule(+ax: F32,+ay: F32,bx: F32,by: F32,radius2: F32,+x: F32,+y: F32) -> Bool:
  +dx = F32.sub(bx,ax)
  +dy = F32.sub(by,ay)
  +denom = F32.add(F32.mul(dx,dx),F32.mul(dy,dy))
  +t = projection(F32.is_eq(denom,0.0),F32.add(F32.mul(F32.sub(x,ax),dx),F32.mul(F32.sub(y,ay),dy)),denom)
  +ex = F32.sub(x,F32.add(ax,F32.mul(dx,t)))
  +ey = F32.sub(y,F32.add(ay,F32.mul(dy,t)))
  F32.is_le(F32.add(F32.mul(ex,ex),F32.mul(ey,ey)),radius2)

# A point bound check uses the pixel containing the quarter sample. Capsule
# bounds are outward-rounded so rejecting this box cannot drop a covered sample.
def hit_case(path: Path,excluded: Bool,+x: F32,+y: F32) -> Bool:
  match path excluded:
    case _ True{}: False{}
    case Empty{} False{}: False{}
    case Capsule{ax,ay,bx,by,radius2,bounds} False{}: capsule(ax,ay,bx,by,radius2,x,y)
    case Join{+left,+right,box} False{}:
      Bool.or(hit_case(left,Bool.not(Rect.point(bounds(left),F32.to_u32(x),F32.to_u32(y))),x,y),
        hit_case(right,Bool.not(Rect.point(bounds(right),F32.to_u32(x),F32.to_u32(y))),x,y))

def hit(+path: Path,+x: F32,+y: F32) -> Bool:
  hit_case(path,Bool.not(Rect.point(bounds(path),F32.to_u32(x),F32.to_u32(y))),x,y)

def coverage(+path: Path,+x: F32,+y: F32) -> U32:
  U32.add(U32.add(Shapes.bit(hit(path,F32.add(x,0.25),F32.add(y,0.25))),
    Shapes.bit(hit(path,F32.add(x,0.75),F32.add(y,0.25)))),
    U32.add(Shapes.bit(hit(path,F32.add(x,0.25),F32.add(y,0.75))),
      Shapes.bit(hit(path,F32.add(x,0.75),F32.add(y,0.75)))))

def region(+depth: Nat,+size: U32,+x: U32,+y: U32,excluded: Bool,
  +path: Path,+clip: Rect.Box,+ink: U32,+opacity: U32,+target: Image) -> Image:
  match depth excluded:
    case _ True{}: target
    case 0n False{}:
      Shapes.paint_leaf(coverage(path,U32.to_f32(x),U32.to_f32(y)),opacity,ink,target)
    case 1n+rest False{}:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = region(rest,h,x,y,Bool.not(Rect.overlaps(clip,Rect.cell(x,y,h))),path,clip,ink,opacity,Ops.tl(target))
      b = region(rest,h,xx,y,Bool.not(Rect.overlaps(clip,Rect.cell(xx,y,h))),path,clip,ink,opacity,Ops.tr(target))
      c = region(rest,h,x,yy,Bool.not(Rect.overlaps(clip,Rect.cell(x,yy,h))),path,clip,ink,opacity,Ops.bl(target))
      d = region(rest,h,xx,yy,Bool.not(Rect.overlaps(clip,Rect.cell(xx,yy,h))),path,clip,ink,opacity,Ops.br(target))
      Qua{a,b,c,d}

def draw(depth: Nat,+size: U32,+path: Path,ink: U32,+opacity: U32,clip: Rect.Box,target: Image) -> Image:
  +visible = Rect.intersect(bounds(path),clip)
  region(depth,size,0,0,Bool.or(U32.is_zero(opacity),Bool.not(Rect.overlaps(visible,Rect.screen(size)))),path,visible,ink,opacity,target)
