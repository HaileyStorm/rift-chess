# DRAFT composable vector coverage: rectangles, ellipses, rounded boxes,
# closed paths, existing round strokes, and sample-level boolean operations.
# All shape coordinates are finite in [-4096,4096]. Bounds clip to the canvas.
import Base
import ./Brush.bend as Brush
import ./PathFill.bend as Path
import ../Rect.bend as Rect
import ../RgbaAffine.bend as Affine
import ../Stroke.bend as Stroke
import ../Shapes.bend as Shapes

type Quality is Data:
  Center{}
  Four{}
  Sixteen{}

type Shape is Data:
  Empty{}
  Rectangle{left: F32,top: F32,right: F32,bottom: F32,radius: F32,bounds: Rect.Box}
  Ellipse{cx: F32,cy: F32,ix: F32,iy: F32,bounds: Rect.Box}
  Closed{edges: Path.Edges,rule: Path.Rule,bounds: Rect.Box}
  Stroked{path: Stroke.Path,bounds: Rect.Box}
  Union{left: Shape,right: Shape,bounds: Rect.Box}
  Intersection{left: Shape,right: Shape,bounds: Rect.Box}
  Difference{left: Shape,right: Shape,bounds: Rect.Box}

# Bounds are immutable preparation data, not recomputed during every test.
def bounds(shape: Shape) -> Rect.Box:
  match shape:
    case Empty{}: Rect.empty()
    case Rectangle{left,top,right,bottom,radius,bounds}: bounds
    case Ellipse{cx,cy,ix,iy,bounds}: bounds
    case Closed{edges,rule,bounds}: bounds
    case Stroked{path,bounds}: bounds
    case Union{left,right,bounds}: bounds
    case Intersection{left,right,bounds}: bounds
    case Difference{left,right,bounds}: bounds

# Smart constructor rejects reversed, nonfinite and overlarge corner-radius input.
def rounded_case(valid: Bool,+l: F32,+t: F32,+r: F32,+b: F32,radius: F32) -> Shape:
  match valid:
    case False{}: Empty{}
    case True{}: Rectangle{l,t,r,b,radius,Rect.Box{Affine.floor_bound(l),Affine.floor_bound(t),Affine.ceil_bound(r),Affine.ceil_bound(b)}}

# Radius zero is a half-open rectangle; no implicit radius clamping is applied.
def rounded(+l: F32,+t: F32,+r: F32,+b: F32,+radius: F32) -> Shape:
  rounded_case(Bool.and(Bool.and(Bool.and(Brush.finite(l),Brush.finite(t)),Bool.and(Brush.finite(r),Brush.finite(b))),
    Bool.and(Bool.and(F32.is_lt(l,r),F32.is_lt(t,b)),Bool.and(F32.is_ge(radius,0.0),F32.is_le(F32.mul(radius,2.0),F32.min(F32.sub(r,l),F32.sub(b,t)))))),l,t,r,b,radius)

# Prepare ellipse reciprocals once; extremely small radii are explicitly rejected.
def ellipse_case(valid: Bool,+cx: F32,+cy: F32,+rx: F32,+ry: F32) -> Shape:
  match valid:
    case False{}: Empty{}
    case True{}: Ellipse{cx,cy,F32.div(1.0,rx),F32.div(1.0,ry),Rect.Box{Affine.floor_bound(F32.sub(cx,rx)),Affine.floor_bound(F32.sub(cy,ry)),Affine.ceil_bound(F32.add(cx,rx)),Affine.ceil_bound(F32.add(cy,ry))}}

# Ellipse axes are >=1/256 and <=4096; centers use the common finite domain.
def ellipse(+cx: F32,+cy: F32,+rx: F32,+ry: F32) -> Shape:
  ellipse_case(Bool.and(Bool.and(Brush.finite(cx),Brush.finite(cy)),Bool.and(Bool.and(F32.is_ge(rx,0.00390625),F32.is_le(rx,4096.0)),Bool.and(F32.is_ge(ry,0.00390625),F32.is_le(ry,4096.0)))),cx,cy,rx,ry)

# Wrap prepared contours without changing their winding or approximation budget.
def closed(+edges: Path.Edges,rule: Path.Rule) -> Shape:
  Closed{edges,rule,Path.bounds(edges)}

# Reuse existing stroke geometry while keeping the new surface rounding separate.
def stroked(+path: Stroke.Path) -> Shape:
  Stroked{path,Stroke.bounds(path)}

# CSG is evaluated at each coverage sample before alpha quantization.
def union(+left: Shape,+right: Shape) -> Shape:
  Union{left,right,Rect.union(bounds(left),bounds(right))}

# Intersection bounds cannot exceed either operand's outward bounds.
def intersect(+left: Shape,+right: Shape) -> Shape:
  Intersection{left,right,Rect.intersect(bounds(left),bounds(right))}

# Subtracting a shape never expands the left operand's footprint.
def subtract(+left: Shape,right: Shape) -> Shape:
  Difference{left,right,bounds(left)}

# Evaluate a rounded box using nearest-point distance within half-open extents.
def rounded_hit(+l: F32,+t: F32,+r: F32,+b: F32,+radius: F32,+x: F32,+y: F32) -> Bool:
  +dx = F32.sub(x,F32.clamp(x,F32.add(l,radius),F32.sub(r,radius)))
  +dy = F32.sub(y,F32.clamp(y,F32.add(t,radius),F32.sub(b,radius)))
  Bool.and(Bool.and(Bool.and(F32.is_ge(x,l),F32.is_lt(x,r)),Bool.and(F32.is_ge(y,t),F32.is_lt(y,b))),
    F32.is_le(F32.add(F32.mul(dx,dx),F32.mul(dy,dy)),F32.mul(radius,radius)))

# Bounds checks precede recursive shape or expensive path/stroke membership.
def test(shape: Shape,outside: Bool,+x: F32,+y: F32) -> Bool:
  match shape outside:
    case _ True{}: False{}
    case Empty{} False{}: False{}
    case Rectangle{l,t,r,b,radius,bounds} False{}: rounded_hit(l,t,r,b,radius,x,y)
    case Ellipse{cx,cy,ix,iy,bounds} False{}:
      +dx = F32.mul(F32.sub(x,cx),ix)
      +dy = F32.mul(F32.sub(y,cy),iy)
      F32.is_le(F32.add(F32.mul(dx,dx),F32.mul(dy,dy)),1.0)
    case Closed{edges,rule,bounds} False{}: Path.hit(edges,rule,x,y)
    case Stroked{path,bounds} False{}: Stroke.hit(path,x,y)
    case Union{+left,+right,cached} False{}:
      Bool.or(test(left,Bool.not(Rect.point(bounds(left),F32.to_u32(x),F32.to_u32(y))),x,y),test(right,Bool.not(Rect.point(bounds(right),F32.to_u32(x),F32.to_u32(y))),x,y))
    case Intersection{+left,+right,cached} False{}:
      Bool.and(test(left,Bool.not(Rect.point(bounds(left),F32.to_u32(x),F32.to_u32(y))),x,y),test(right,Bool.not(Rect.point(bounds(right),F32.to_u32(x),F32.to_u32(y))),x,y))
    case Difference{+left,+right,cached} False{}:
      Bool.and(test(left,Bool.not(Rect.point(bounds(left),F32.to_u32(x),F32.to_u32(y))),x,y),Bool.not(test(right,Bool.not(Rect.point(bounds(right),F32.to_u32(x),F32.to_u32(y))),x,y)))

# Public hit query for nonnegative finite screen coordinates, matching raster tests.
def hit(+shape: Shape,+x: F32,+y: F32) -> Bool:
  test(shape,Bool.not(Rect.point(bounds(shape),F32.to_u32(x),F32.to_u32(y))),x,y)

# Select an explicit uniform sample grid; no heuristic skips subpixel features.
def grid(quality: Quality) -> U32:
  match quality:
    case Center{}: 1
    case Four{}: 2
    case Sixteen{}: 4

# Fixed sample-count loop; offsets are exact binary fractions on these grids.
def samples(fuel: Nat,+shape: Shape,+x: F32,+y: F32,+grid: U32,+index: U32,total: U32) -> U32:
  match fuel:
    case 0n: total
    case 1n+rest:
      +xx = F32.add(x,F32.div(F32.add(U32.to_f32(U32.mod(index,grid)),0.5),U32.to_f32(grid)))
      +yy = F32.add(y,F32.div(F32.add(U32.to_f32(U32.div(index,grid)),0.5),U32.to_f32(grid)))
      samples(rest,shape,x,y,grid,U32.add(index,1),U32.add(total,Shapes.bit(hit(shape,xx,yy))))

# Quantize geometric coverage once as floor(255*covered/sample_count).
def coverage(shape: Shape,quality: Quality,x: U32,y: U32) -> U32:
  +n = grid(quality)
  +count = U32.mul(n,n)
  U32.div(U32.mul(samples(U32.to_nat(count),shape,U32.to_f32(x),U32.to_f32(y),n,0,0),255),count)
