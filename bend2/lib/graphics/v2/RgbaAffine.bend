# DRAFT prepared transformed alpha images. Geometry is independent of textures,
# and filtering is an explicit opt-in separate from AffineTexture's old rule.
import Base
import ../Quad.bend as Quad
import ./Rect.bend as Rect
import ./ImageOps.bend as ImageOps
import ./Facet.bend as Facet
import ./Shapes.bend as Shapes
import ./RgbaSample.bend as Sample
import ./MaskedLayer.bend as MaskedLayer
import ./Transform2D.bend as Transform

type Geometry is Data:
  Empty{}
  Surface{shape: Quad.Shape,inverse: Transform.Matrix,bounds: Rect.Box}

def px(p: Quad.Point) -> F32:
  match p:
    case Quad.Point{x,y}: x

def py(p: Quad.Point) -> F32:
  match p:
    case Quad.Point{x,y}: y

def floor_bound(value: F32) -> U32:
  F32.to_u32(F32.floor(F32.clamp(value,0.0,4096.0)))

def ceil_bound(value: F32) -> U32:
  F32.to_u32(F32.ceil(F32.clamp(value,0.0,4096.0)))

def bounds4(+a: Quad.Point,+b: Quad.Point,+c: Quad.Point,+d: Quad.Point) -> Rect.Box:
  Rect.Box{floor_bound(F32.min(F32.min(px(a),px(b)),F32.min(px(c),px(d)))),
    floor_bound(F32.min(F32.min(py(a),py(b)),F32.min(py(c),py(d)))),
    ceil_bound(F32.max(F32.max(px(a),px(b)),F32.max(px(c),px(d)))),
    ceil_bound(F32.max(F32.max(py(a),py(b)),F32.max(py(c),py(d))))}

def prepared_inverse(valid: Bool,shape: Quad.Shape,
  inverse: Maybe<&2,Transform.Matrix>,bounds: Rect.Box) -> Geometry:
  match valid inverse:
    case False{} _: Empty{}
    case True{} None{}: Empty{}
    case True{} Some{matrix}: Surface{shape,matrix,bounds}

def prepared_shape(+shape: Quad.Shape,matrix: Transform.Matrix,bounds: Rect.Box) -> Geometry:
  match shape:
    case Quad.Shape{ab,bc,cd,da,area}:
      prepared_inverse(F32.is_gt(area,0.1),shape,Transform.inverse(matrix,0.1),bounds)

# Matrix maps the unit UV square into the caller's screen. Finite points and
# derived corners in [-4096,4096] are the same presentation-domain precondition
# as the existing affine primitive; invalid determinant/area returns Empty.
def prepare(+matrix: Transform.Matrix) -> Geometry:
  +a = Transform.point(matrix,Quad.Point{0.0,0.0})
  +b = Transform.point(matrix,Quad.Point{1.0,0.0})
  +c = Transform.point(matrix,Quad.Point{1.0,1.0})
  +d = Transform.point(matrix,Quad.Point{0.0,1.0})
  prepared_shape(Quad.make(a,b,c,d),matrix,bounds4(a,b,c,d))

def prepare_points(+a: Quad.Point,+b: Quad.Point,+d: Quad.Point) -> Geometry:
  prepare(Transform.Matrix{F32.sub(px(b),px(a)),F32.sub(py(b),py(a)),
    F32.sub(px(d),px(a)),F32.sub(py(d),py(a)),px(a),py(a)})

def bounds(geometry: Geometry) -> Rect.Box:
  match geometry:
    case Empty{}: Rect.empty()
    case Surface{shape,inverse,bounds}: bounds

def paint(texel: Sample.Texel,count: U32,opacity: U32,target: Image) -> Image:
  match texel:
    case Sample.Texel{color,alpha}:
      Shapes.paint_leaf(count,MaskedLayer.effective(alpha,opacity),color,target)

def sample_point(point: Quad.Point,texture: Sample.Texture,filter: Sample.Filter) -> Sample.Texel:
  match point:
    case Quad.Point{u,v}: Sample.uv(filter,texture,u,v)

def leaf_case(empty: Bool,count: U32,inverse: Transform.Matrix,
  x: U32,y: U32,texture: Sample.Texture,filter: Sample.Filter,
  opacity: U32,target: Image) -> Image:
  match empty:
    case True{}: target
    case False{}:
      paint(sample_point(Transform.point(inverse,Quad.Point{F32.add(U32.to_f32(x),0.5),
        F32.add(U32.to_f32(y),0.5)}),texture,filter),count,opacity,target)

def leaf(+count: U32,inverse: Transform.Matrix,x: U32,y: U32,
  texture: Sample.Texture,filter: Sample.Filter,opacity: U32,target: Image) -> Image:
  leaf_case(U32.is_zero(count),count,inverse,x,y,texture,filter,opacity,target)

def excluded(+shape: Quad.Shape,+clip: Rect.Box,+x: U32,+y: U32,+size: U32) -> Bool:
  Bool.or(Bool.not(Rect.overlaps(clip,Rect.cell(x,y,size))),
    Facet.outside_pixels(shape,U32.to_f32(x),U32.to_f32(y),size))

# Bounded sequential quadtree work. The surrounding prepared RenderPlan can
# parallelize independent coarse tiles without per-pixel task creation.
def region(+depth: Nat,+size: U32,+x: U32,+y: U32,outside: Bool,
  +shape: Quad.Shape,+inverse: Transform.Matrix,+clip: Rect.Box,
  +texture: Sample.Texture,+filter: Sample.Filter,+opacity: U32,+target: Image) -> Image:
  match depth outside:
    case _ True{}: target
    case 0n False{}:
      leaf(Facet.coverage(shape,U32.to_f32(x),U32.to_f32(y)),inverse,x,y,texture,filter,opacity,target)
    case 1n+rest False{}:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = region(rest,h,x,y,excluded(shape,clip,x,y,h),shape,inverse,clip,texture,filter,opacity,ImageOps.tl(target))
      b = region(rest,h,xx,y,excluded(shape,clip,xx,y,h),shape,inverse,clip,texture,filter,opacity,ImageOps.tr(target))
      c = region(rest,h,x,yy,excluded(shape,clip,x,yy,h),shape,inverse,clip,texture,filter,opacity,ImageOps.bl(target))
      d = region(rest,h,xx,yy,excluded(shape,clip,xx,yy,h),shape,inverse,clip,texture,filter,opacity,ImageOps.br(target))
      Qua{a,b,c,d}

def region_geometry(geometry: Geometry,+depth: Nat,+size: U32,+x: U32,+y: U32,
  texture: Sample.Texture,filter: Sample.Filter,opacity: U32,+clip: Rect.Box,target: Image) -> Image:
  match geometry:
    case Empty{}: target
    case Surface{+shape,inverse,bounds}:
      region(depth,size,x,y,excluded(shape,clip,x,y,size),shape,inverse,clip,texture,filter,opacity,target)

def draw_zero(zero: Bool,depth: Nat,size: U32,geometry: Geometry,
  texture: Sample.Texture,filter: Sample.Filter,opacity: U32,clip: Rect.Box,target: Image) -> Image:
  match zero:
    case True{}: target
    case False{}: region_geometry(geometry,depth,size,0,0,texture,filter,opacity,clip,target)

def draw(depth: Nat,size: U32,geometry: Geometry,+texture: Sample.Texture,
  filter: Sample.Filter,+opacity: U32,clip: Rect.Box,target: Image) -> Image:
  draw_zero(Bool.or(U32.is_zero(opacity),U32.is_zero(Sample.size(texture))),
    depth,size,geometry,texture,filter,opacity,clip,target)
