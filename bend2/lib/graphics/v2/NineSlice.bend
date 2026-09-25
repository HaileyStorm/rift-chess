# DRAFT nearest-sampled nine-slice skins. Corners retain original pixel size;
# edges stretch one axis and center stretches both. No invented shrink policy:
# a destination smaller than its opposing margins is an exact no-op.
import Base
import ./Rect.bend as Rect
import ./ImageOps.bend as ImageOps
import ./RgbaSample.bend as Sample
import ./RgbaAffine.bend as Affine

type Insets is Data:
  Insets{left: U32,top: U32,right: U32,bottom: U32}

def axis_case(leading: Bool,trailing: Bool,+index: U32,+destination: U32,
  +source: U32,+before: U32,+after: U32) -> U32:
  match leading trailing:
    case True{} _: index
    case False{} True{}: U32.sub(source,U32.sub(destination,index))
    case False{} False{}:
      U32.add(before,U32.div(U32.mul(U32.add(U32.mul(U32.sub(index,before),2),1),
        U32.sub(U32.sub(source,before),after)),
        U32.mul(U32.sub(U32.sub(destination,before),after),2)))

def axis(+index: U32,+destination: U32,+source: U32,+before: U32,+after: U32) -> U32:
  axis_case(U32.is_lt(index,before),U32.is_ge(index,U32.sub(destination,after)),
    index,destination,source,before,after)

def leaf(rect: Rect.Box,insets: Insets,+texture: Sample.Texture,
  x: U32,y: U32,opacity: U32,target: Image) -> Image:
  match rect insets:
    case Rect.Box{+left,+top,right,bottom} Insets{l,t,r,b}:
      Affine.paint(Sample.nearest(texture,
        axis(U32.sub(x,left),U32.sub(right,left),Sample.size(texture),l,r),
        axis(U32.sub(y,top),U32.sub(bottom,top),Sample.size(texture),t,b)),4,opacity,target)

def region(+depth: Nat,+size: U32,+x: U32,+y: U32,outside: Bool,
  +rect: Rect.Box,+clip: Rect.Box,+insets: Insets,+texture: Sample.Texture,
  +opacity: U32,+target: Image) -> Image:
  match depth outside:
    case _ True{}: target
    case 0n False{}: leaf(rect,insets,texture,x,y,opacity,target)
    case 1n+rest False{}:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = region(rest,h,x,y,Bool.not(Rect.overlaps(clip,Rect.cell(x,y,h))),rect,clip,insets,texture,opacity,ImageOps.tl(target))
      b = region(rest,h,xx,y,Bool.not(Rect.overlaps(clip,Rect.cell(xx,y,h))),rect,clip,insets,texture,opacity,ImageOps.tr(target))
      c = region(rest,h,x,yy,Bool.not(Rect.overlaps(clip,Rect.cell(x,yy,h))),rect,clip,insets,texture,opacity,ImageOps.bl(target))
      d = region(rest,h,xx,yy,Bool.not(Rect.overlaps(clip,Rect.cell(xx,yy,h))),rect,clip,insets,texture,opacity,ImageOps.br(target))
      Qua{a,b,c,d}

def margins_valid(insets: Insets,+source: U32,width: U32,height: U32) -> Bool:
  match insets:
    case Insets{+l,+t,+r,+b}:
      Bool.and(Bool.and(U32.is_lt(l,source),U32.is_lt(r,source)),
        Bool.and(Bool.and(U32.is_lt(t,source),U32.is_lt(b,source)),
          Bool.and(Bool.and(U32.is_lt(U32.add(l,r),source),U32.is_lt(U32.add(t,b),source)),
            Bool.and(U32.is_ge(width,U32.add(l,r)),U32.is_ge(height,U32.add(t,b))))))

def draw_valid(valid: Bool,depth: Nat,+size: U32,+rect: Rect.Box,
  texture: Sample.Texture,insets: Insets,opacity: U32,clip: Rect.Box,target: Image) -> Image:
  match valid:
    case False{}: target
    case True{}:
      +visible = Rect.intersect(rect,clip)
      region(depth,size,0,0,Bool.not(Rect.overlaps(visible,Rect.screen(size))),
        rect,visible,insets,texture,opacity,target)

# Shared constructor validation; size/depth still describe a well-formed canvas.
def valid(+rect: Rect.Box,+texture: Sample.Texture,+insets: Insets,opacity: U32) -> Bool:
  Bool.and(Bool.and(U32.is_ne(opacity,0),Bool.not(Rect.is_empty(rect))),
    Bool.and(Bool.and(U32.is_le(Rect.width(rect),4096),U32.is_le(Rect.height(rect),4096)),
      Bool.and(U32.is_le(Sample.size(texture),512),
        margins_valid(insets,Sample.size(texture),Rect.width(rect),Rect.height(rect)))))

def draw(depth: Nat,+size: U32,+rect: Rect.Box,+texture: Sample.Texture,
  +insets: Insets,+opacity: U32,clip: Rect.Box,target: Image) -> Image:
  draw_valid(valid(rect,texture,insets,opacity),depth,size,rect,texture,insets,opacity,clip,target)
