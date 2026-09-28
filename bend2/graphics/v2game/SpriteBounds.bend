# Derive an exact alpha support box from an arbitrary immutable sprite mask.
# A malformed depth-zero Qua returns the full cell, never an unsafe crop.
import Base
import ../../lib/graphics/v2/Rect.bend as Rect
import ../../lib/graphics/v2/Color.bend as Color
import ../../lib/graphics/v2/RgbaSample.bend as Sample

def pixel_bounds(alpha: U32, +x: U32, +y: U32, +size: U32) -> Rect.Box:
  Bool.pick(Rect.Box,U32.is_zero(alpha),Rect.empty(),Rect.cell(x,y,size))

def extent(depth: Nat,+size: U32,+x: U32,+y: U32,mask: Image) -> Rect.Box:
  match depth mask:
    case _ Pix{color}: pixel_bounds(Color.red(color),x,y,size)
    # A malformed depth-zero Qua must not permit a narrower clip.
    case 0n Qua{tl,tr,bl,br}: Rect.cell(x,y,size)
    case 1n++rest Qua{tl,tr,bl,br}:
      +half = U32.div(size,2)
      +xx = U32.add(x,half)
      +yy = U32.add(y,half)
      a b c d = extent(rest,half,x,y,tl) extent(rest,half,xx,y,tr)
        extent(rest,half,x,yy,bl) extent(rest,half,xx,yy,br)
      Rect.union(Rect.union(a,b),Rect.union(c,d))

def bounds(texture: Sample.Texture) -> Rect.Box:
  match texture:
    case Sample.Texture{depth,size,colors,mask}: extent(depth,size,0,0,mask)
