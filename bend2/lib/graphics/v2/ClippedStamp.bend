# DRAFT scissored translated alpha image. Clip and target-region coordinates
# are unbiassed screen pixels; ImageView source origins retain the 4096 bias.
import Base
import ./Rect.bend as Rect
import ./ImageOps.bend as ImageOps
import ./ImageView.bend as ImageView
import ./MaskedStampKernel.bend as Kernel
import ./Shapes.bend as Shapes
import ./TileRaster.bend as Tile

# Sequential analogue of the immutable cursor kernel. Aligned work uses a
# sequential zipper as well, so no hidden per-pixel forks escape a plan tile.
def full(+depth: Nat,+size: U32,+x: U32,+y: U32,work: Kernel.Work,small: Bool,
  +opacity: U32,+target: Image) -> Image:
  match depth work small:
    case _ Kernel.Unchanged{} _: target
    case _ Kernel.Aligned{colors,mask} _: Tile.masked(depth,colors,mask,opacity,target)
    case 0n Kernel.Split{colors,mask} _: Kernel.leaf(x,y,colors,mask,opacity,target)
    case 1n+rest Kernel.Split{colors,mask} True{}:
      Kernel.scalar_tree(depth,size,x,y,colors,mask,opacity,False{},target)
    case 1n+rest Kernel.Split{+colors,+mask} False{}:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      +small = U32.is_le(h,Kernel.leaf_span())
      a = full(rest,h,x,y,Kernel.prepare(x,y,h,colors,mask),small,opacity,ImageOps.tl(target))
      b = full(rest,h,xx,y,Kernel.prepare(xx,y,h,colors,mask),small,opacity,ImageOps.tr(target))
      c = full(rest,h,x,yy,Kernel.prepare(x,yy,h,colors,mask),small,opacity,ImageOps.bl(target))
      d = full(rest,h,xx,yy,Kernel.prepare(xx,yy,h,colors,mask),small,opacity,ImageOps.br(target))
      Qua{a,b,c,d}

def region(+depth: Nat, +size: U32, +x: U32, +y: U32,
  outside: Bool, inside: Bool, +clip: Rect.Box,
  +colors: ImageView.View, +mask: ImageView.View, +opacity: U32,
  +target: Image) -> Image:
  match depth outside inside:
    case _ True{} _: target
    case _ False{} True{}:
      full(depth,size,U32.add(x,4096),U32.add(y,4096),
        Kernel.prepare(U32.add(x,4096),U32.add(y,4096),size,colors,mask),
        U32.is_le(size,Kernel.leaf_span()),opacity,target)
    case 0n False{} False{}:
      Kernel.leaf(U32.add(x,4096),U32.add(y,4096),colors,mask,opacity,target)
    case 1n+rest False{} False{}:
      +half = U32.div(size,2)
      +xx = U32.add(x,half)
      +yy = U32.add(y,half)
      a = region(rest,half,x,y,Bool.not(Rect.overlaps(clip,Rect.cell(x,y,half))),
        Rect.contains(clip,Rect.cell(x,y,half)),clip,colors,mask,opacity,ImageOps.tl(target))
      b = region(rest,half,xx,y,Bool.not(Rect.overlaps(clip,Rect.cell(xx,y,half))),
        Rect.contains(clip,Rect.cell(xx,y,half)),clip,colors,mask,opacity,ImageOps.tr(target))
      c = region(rest,half,x,yy,Bool.not(Rect.overlaps(clip,Rect.cell(x,yy,half))),
        Rect.contains(clip,Rect.cell(x,yy,half)),clip,colors,mask,opacity,ImageOps.bl(target))
      d = region(rest,half,xx,yy,Bool.not(Rect.overlaps(clip,Rect.cell(xx,yy,half))),
        Rect.contains(clip,Rect.cell(xx,yy,half)),clip,colors,mask,opacity,ImageOps.br(target))
      Qua{a,b,c,d}

def start_zero(zero: Bool, depth: Nat, +size: U32, +clip: Rect.Box,
  colors: ImageView.View, mask: ImageView.View, opacity: U32, target: Image) -> Image:
  match zero:
    case True{}: target
    case False{}:
      region(depth,size,0,0,Bool.not(Rect.overlaps(clip,Rect.screen(size))),
        Rect.contains(clip,Rect.screen(size)),clip,colors,mask,opacity,target)

def draw(+depth: Nat, +size: U32, +source_depth: Nat, +source_size: U32,
  +left: Shapes.Coord, +top: Shapes.Coord, colors: Image, mask: Image,
  +opacity: U32, clip: Rect.Box, target: Image) -> Image:
  +bounds = Rect.intersect(clip,Rect.sprite(size,left,top,source_size))
  start_zero(U32.is_zero(opacity),depth,size,bounds,
    ImageView.View{source_depth,source_size,Shapes.biased(left),Shapes.biased(top),colors},
    ImageView.View{source_depth,source_size,Shapes.biased(left),Shapes.biased(top),mask},
    opacity,target)
