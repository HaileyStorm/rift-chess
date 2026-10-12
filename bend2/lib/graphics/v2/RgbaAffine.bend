# DRAFT prepared transformed alpha images. Geometry is independent of textures,
# and filtering is an explicit opt-in separate from AffineTexture's old rule.
import Base
import ../Quad.bend as Quad
import ./Rect.bend as Rect
import ./ImageOps.bend as ImageOps
import ./Facet.bend as Facet
import ./Shapes.bend as Shapes
import ./RgbaSample.bend as Sample
import ./AffineTexture.bend as AffineTexture
import ./MaskedLayer.bend as MaskedLayer
import ./Transform2D.bend as Transform
import ../pixels/Pixel.bend as Pixel
import ./Color.bend as Color

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

# The existing inside predicate includes a conservative one-pixel inset.
# Inherited full coverage skips quad tests, while every child still checks its
# clip and every surviving pixel keeps the original sampling and alpha paint.
def region_inside(full: Bool,shape: Quad.Shape,x: U32,y: U32,size: U32) -> Bool:
  match full:
    case True{}: True{}
    case False{}: Facet.inside_pixels(shape,U32.to_f32(x),U32.to_f32(y),size)

def region_excluded(full: Bool,+shape: Quad.Shape,+clip: Rect.Box,+x: U32,+y: U32,+size: U32) -> Bool:
  match full:
    case True{}: Bool.not(Rect.overlaps(clip,Rect.cell(x,y,size)))
    case False{}: excluded(shape,clip,x,y,size)

def region_count(full: Bool,shape: Quad.Shape,x: U32,y: U32) -> U32:
  match full:
    case True{}: 4
    case False{}: Facet.coverage(shape,U32.to_f32(x),U32.to_f32(y))

# Bounded sequential quadtree work. The surrounding prepared RenderPlan can
# parallelize independent coarse tiles without per-pixel task creation.
def region(+depth: Nat,+size: U32,+x: U32,+y: U32,outside: Bool,full: Bool,
  +shape: Quad.Shape,+inverse: Transform.Matrix,+clip: Rect.Box,
  +texture: Sample.Texture,+filter: Sample.Filter,+opacity: U32,+target: Image) -> Image:
  match depth outside:
    case _ True{}: target
    case 0n False{}:
      leaf(region_count(full,shape,x,y),inverse,x,y,texture,filter,opacity,target)
    case 1n+rest False{}:
      +covered = region_inside(full,shape,x,y,size)
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = region(rest,h,x,y,region_excluded(covered,shape,clip,x,y,h),covered,shape,inverse,clip,texture,filter,opacity,ImageOps.tl(target))
      b = region(rest,h,xx,y,region_excluded(covered,shape,clip,xx,y,h),covered,shape,inverse,clip,texture,filter,opacity,ImageOps.tr(target))
      c = region(rest,h,x,yy,region_excluded(covered,shape,clip,x,yy,h),covered,shape,inverse,clip,texture,filter,opacity,ImageOps.bl(target))
      d = region(rest,h,xx,yy,region_excluded(covered,shape,clip,xx,yy,h),covered,shape,inverse,clip,texture,filter,opacity,ImageOps.br(target))
      Qua{a,b,c,d}

def region_geometry(geometry: Geometry,+depth: Nat,+size: U32,+x: U32,+y: U32,
  texture: Sample.Texture,filter: Sample.Filter,opacity: U32,+clip: Rect.Box,target: Image) -> Image:
  match geometry:
    case Empty{}: target
    case Surface{+shape,inverse,bounds}:
      region(depth,size,x,y,excluded(shape,clip,x,y,size),False{},shape,inverse,clip,texture,filter,opacity,target)

def draw_zero(zero: Bool,depth: Nat,size: U32,geometry: Geometry,
  texture: Sample.Texture,filter: Sample.Filter,opacity: U32,clip: Rect.Box,target: Image) -> Image:
  match zero:
    case True{}: target
    case False{}: region_geometry(geometry,depth,size,0,0,texture,filter,opacity,clip,target)

def draw(depth: Nat,size: U32,geometry: Geometry,+texture: Sample.Texture,
  filter: Sample.Filter,+opacity: U32,clip: Rect.Box,target: Image) -> Image:
  draw_zero(Bool.or(U32.is_zero(opacity),U32.is_zero(Sample.size(texture))),
    depth,size,geometry,texture,filter,opacity,clip,target)

# DRAFT separable preparation for finite diagonal inverse transforms only.
# Keep Transform.point and AffineTexture.texel arithmetic exactly as in the generic
# nearest leaf. Pixel centers are positive, so the omitted cross-axis term is the
# same signed zero. Do not replace these calls with incremental UV stepping.
type AxisTree is Data:
  AxisEmpty{}
  AxisLeaf{axis: U32}
  AxisBranch{low: AxisTree,high: AxisTree}

def axis_finite(+value: F32) -> Bool:
  F32.is_eq(F32.sub(value,value),0.0)

def axis_ready(matrix: Transform.Matrix) -> Bool:
  match matrix:
    case Transform.Matrix{+a,+b,+c,+d,+tx,+ty}:
      Bool.and(Bool.and(F32.is_eq(b,0.0),F32.is_eq(c,0.0)),
        Bool.and(Bool.and(axis_finite(a),axis_finite(b)),
          Bool.and(Bool.and(axis_finite(c),axis_finite(d)),
            Bool.and(axis_finite(tx),axis_finite(ty)))))

def axis_coordinate(horizontal: Bool,coordinate: U32,inverse: Transform.Matrix,
  source_size: U32) -> U32:
  match horizontal:
    case True{}:
      AffineTexture.texel(px(Transform.point(inverse,Quad.Point{
        F32.add(U32.to_f32(coordinate),0.5),0.5})),source_size)
    case False{}:
      AffineTexture.texel(py(Transform.point(inverse,Quad.Point{
        0.5,F32.add(U32.to_f32(coordinate),0.5)})),source_size)

# Clip-pruned binary trees cost O(width+height), not O(width*height).
# A draw owns its trees; no quantized phases or stale cross-frame cache.
def axis_prepare(+depth: Nat,+size: U32,+coordinate: U32,outside: Bool,
  +horizontal: Bool,+inverse: Transform.Matrix,+source_size: U32,
  +low: U32,+high: U32) -> AxisTree:
  match depth outside:
    case _ True{}: AxisEmpty{}
    case 0n False{}:
      AxisLeaf{axis_coordinate(horizontal,coordinate,inverse,source_size)}
    case 1n+rest False{}:
      +half = U32.div(size,2)
      +middle = U32.add(coordinate,half)
      AxisBranch{
        axis_prepare(rest,half,coordinate,
          Bool.or(U32.is_ge(coordinate,high),U32.is_le(middle,low)),
          horizontal,inverse,source_size,low,high),
        axis_prepare(rest,half,middle,
          Bool.or(U32.is_ge(middle,high),U32.is_le(U32.add(middle,half),low)),
          horizontal,inverse,source_size,low,high)}

def axis_low(tree: AxisTree) -> AxisTree:
  match tree:
    case AxisBranch{low,high}: low
    case AxisEmpty{}: AxisEmpty{}
    case AxisLeaf{axis}: AxisLeaf{axis}

def axis_high(tree: AxisTree) -> AxisTree:
  match tree:
    case AxisBranch{low,high}: high
    case AxisEmpty{}: AxisEmpty{}
    case AxisLeaf{axis}: AxisLeaf{axis}

# Nearest-only scalar paint. Preserve Shapes.paint_leaf's two rounded opacity
# stages and malformed target rule; a zero-opacity Pix may share its input.
def nearest_paint_zero(empty: Bool,color: U32,background: U32,opacity: U32,
  target: Image) -> Image:
  match empty:
    case True{}: target
    case False{}: Pix{Color.over(color,background,opacity)}

def nearest_paint_coverage(+count: U32,+opacity: U32,color: U32,+target: Image) -> Image:
  match target:
    case Pix{background}:
      +amount = U32.div(U32.mul(U32.min(opacity,255),count),4)
      nearest_paint_zero(U32.is_zero(amount),color,background,amount,target)
    case Qua{tl,tr,bl,br}: Pix{0}

def nearest_paint_channels(color: U32,alpha: U32,count: U32,opacity: U32,
  target: Image) -> Image:
  nearest_paint_coverage(count,MaskedLayer.effective(alpha,opacity),color,target)

# Descend the two original trees together while both branch. Once one becomes
# uniform, only its mate still needs a walk. No packing, cache or alpha-based
# source omission; preserve full U32 RGB and each depth-zero Qua's zero sample.
def joint_nearest_paint(+depth: Nat,+x: U32,+y: U32,+colors: Image,+mask: Image,
  count: U32,opacity: U32,target: Image) -> Image:
  match depth colors mask:
    case _ Pix{color} Pix{alpha}:
      nearest_paint_channels(color,Color.red(alpha),count,opacity,target)
    case 0n _ _:
      nearest_paint_channels(Pixel.sample_xy(0n,x,y,colors),
        Color.red(Pixel.sample_xy(0n,x,y,mask)),count,opacity,target)
    case 1n+rest Pix{color} _:
      nearest_paint_channels(color,Color.red(Pixel.sample_xy(depth,x,y,mask)),
        count,opacity,target)
    case 1n+rest _ Pix{alpha}:
      nearest_paint_channels(Pixel.sample_xy(depth,x,y,colors),Color.red(alpha),
        count,opacity,target)
    case 1n+rest Qua{ctl,ctr,cbl,cbr} Qua{mtl,mtr,mbl,mbr}:
      +half = U32.shln(1,rest)
      +horizontal = U32.is_ge(x,half)
      +vertical = U32.is_ge(y,half)
      +ctop = Bool.pick(Image,horizontal,ctr,ctl)
      +cbottom = Bool.pick(Image,horizontal,cbr,cbl)
      +mtop = Bool.pick(Image,horizontal,mtr,mtl)
      +mbottom = Bool.pick(Image,horizontal,mbr,mbl)
      +next_x = Bool.pick(U32,horizontal,U32.sub(x,half),x)
      +next_y = Bool.pick(U32,vertical,U32.sub(y,half),y)
      joint_nearest_paint(rest,next_x,next_y,Bool.pick(Image,vertical,cbottom,ctop),
        Bool.pick(Image,vertical,mbottom,mtop),count,opacity,target)

def nearest_paint_valid(valid: Bool,texture: Sample.Texture,x: U32,y: U32,
  count: U32,opacity: U32,target: Image) -> Image:
  match valid texture:
    case False{} _: nearest_paint_channels(0,0,count,opacity,target)
    case True{} Sample.Texture{depth,+size,colors,mask}:
      joint_nearest_paint(depth,U32.min(x,U32.sub(size,1)),
        U32.min(y,U32.sub(size,1)),colors,mask,count,opacity,target)

def nearest_paint(+texture: Sample.Texture,x: U32,y: U32,count: U32,
  opacity: U32,target: Image) -> Image:
  nearest_paint_valid(U32.is_ne(Sample.size(texture),0),texture,x,y,count,opacity,target)

def axis_leaf(empty: Bool,count: U32,xaxis: AxisTree,yaxis: AxisTree,
  texture: Sample.Texture,opacity: U32,target: Image) -> Image:
  match empty xaxis yaxis:
    case False{} AxisLeaf{x} AxisLeaf{y}:
      nearest_paint(texture,x,y,count,opacity,target)
    case _ _ _: target

# Same clip, shape exclusion, full-coverage inheritance, edge coverage and
# painter order as region. Reuse uniform target inputs without constructing
# four temporary Pix nodes; preserve the exact output Qua structure.
def axes_region(+depth: Nat,+size: U32,+x: U32,+y: U32,outside: Bool,full: Bool,
  +shape: Quad.Shape,+clip: Rect.Box,+texture: Sample.Texture,+opacity: U32,
  +xaxis: AxisTree,+yaxis: AxisTree,+target: Image) -> Image:
  match depth outside:
    case _ True{}: target
    case 0n False{}:
      +count = region_count(full,shape,x,y)
      axis_leaf(U32.is_zero(count),count,xaxis,yaxis,texture,opacity,target)
    case 1n+rest False{}:
      match target:
        case Pix{background}:
          +covered = region_inside(full,shape,x,y,size)
          +half = U32.div(size,2)
          +xx = U32.add(x,half)
          +yy = U32.add(y,half)
          +xl = axis_low(xaxis)
          +xh = axis_high(xaxis)
          +yl = axis_low(yaxis)
          +yh = axis_high(yaxis)
          a = axes_region(rest,half,x,y,region_excluded(covered,shape,clip,x,y,half),covered,
            shape,clip,texture,opacity,xl,yl,target)
          b = axes_region(rest,half,xx,y,region_excluded(covered,shape,clip,xx,y,half),covered,
            shape,clip,texture,opacity,xh,yl,target)
          c = axes_region(rest,half,x,yy,region_excluded(covered,shape,clip,x,yy,half),covered,
            shape,clip,texture,opacity,xl,yh,target)
          d = axes_region(rest,half,xx,yy,region_excluded(covered,shape,clip,xx,yy,half),covered,
            shape,clip,texture,opacity,xh,yh,target)
          Qua{a,b,c,d}
        case Qua{tl,tr,bl,br}:
          +covered = region_inside(full,shape,x,y,size)
          +half = U32.div(size,2)
          +xx = U32.add(x,half)
          +yy = U32.add(y,half)
          +xl = axis_low(xaxis)
          +xh = axis_high(xaxis)
          +yl = axis_low(yaxis)
          +yh = axis_high(yaxis)
          a = axes_region(rest,half,x,y,region_excluded(covered,shape,clip,x,y,half),covered,
            shape,clip,texture,opacity,xl,yl,tl)
          b = axes_region(rest,half,xx,y,region_excluded(covered,shape,clip,xx,y,half),covered,
            shape,clip,texture,opacity,xh,yl,tr)
          c = axes_region(rest,half,x,yy,region_excluded(covered,shape,clip,x,yy,half),covered,
            shape,clip,texture,opacity,xl,yh,bl)
          d = axes_region(rest,half,xx,yy,region_excluded(covered,shape,clip,xx,yy,half),covered,
            shape,clip,texture,opacity,xh,yh,br)
          Qua{a,b,c,d}

def draw_axes_nearest_case(ready: Bool,+depth: Nat,+size: U32,+shape: Quad.Shape,
  +inverse: Transform.Matrix,+texture: Sample.Texture,opacity: U32,
  +clip: Rect.Box,target: Image) -> Image:
  match ready clip:
    case False{} _:
      region(depth,size,0,0,excluded(shape,clip,0,0,size),False{},
        shape,inverse,clip,texture,Sample.Nearest{},opacity,target)
    case True{} Rect.Box{left,top,right,bottom}:
      +xaxis = axis_prepare(depth,size,0,False{},True{},inverse,Sample.size(texture),left,right)
      +yaxis = axis_prepare(depth,size,0,False{},False{},inverse,Sample.size(texture),top,bottom)
      axes_region(depth,size,0,0,excluded(shape,clip,0,0,size),False{},
        shape,clip,texture,opacity,xaxis,yaxis,target)

def draw_axes_nearest_geometry(geometry: Geometry,depth: Nat,size: U32,
  texture: Sample.Texture,opacity: U32,clip: Rect.Box,target: Image) -> Image:
  match geometry:
    case Empty{}: target
    case Surface{shape,+inverse,bounds}:
      draw_axes_nearest_case(axis_ready(inverse),depth,size,shape,inverse,texture,opacity,clip,target)

def draw_axes_nearest_zero(zero: Bool,depth: Nat,size: U32,geometry: Geometry,
  texture: Sample.Texture,opacity: U32,clip: Rect.Box,target: Image) -> Image:
  match zero:
    case True{}: target
    case False{}: draw_axes_nearest_geometry(geometry,depth,size,texture,opacity,clip,target)

def draw_axes_nearest(depth: Nat,size: U32,geometry: Geometry,+texture: Sample.Texture,
  +opacity: U32,clip: Rect.Box,target: Image) -> Image:
  draw_axes_nearest_zero(Bool.or(U32.is_zero(opacity),U32.is_zero(Sample.size(texture))),
    depth,size,geometry,texture,opacity,clip,target)
