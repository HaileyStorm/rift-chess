# DRAFT exact half-open scissoring. Whole accepted/rejected subtrees are reused.
# Image size/depth must agree. Rectangles and cell origins are screen coordinates.
import Base
import ./Rect.bend as Rect
import ./ImageOps.bend as ImageOps
import ./BlendRect.bend as BlendRect
import ./TileRaster.bend as Tile

def choose(+depth: Nat, +size: U32, +x: U32, +y: U32,
  outside: Bool, inside: Bool, +clip: Rect.Box,
  +source: Image, +target: Image) -> Image:
  match depth outside inside:
    case _ True{} _: target
    case _ False{} True{}: source
    case 0n False{} False{}: source
    case 1n+rest False{} False{}:
      +half = U32.div(size, 2)
      +xx = U32.add(x, half)
      +yy = U32.add(y, half)
      a = choose(rest, half, x, y, Bool.not(Rect.overlaps(clip, Rect.cell(x,y,half))),
        Rect.contains(clip, Rect.cell(x,y,half)), clip, ImageOps.tl(source), ImageOps.tl(target))
      b = choose(rest, half, xx, y, Bool.not(Rect.overlaps(clip, Rect.cell(xx,y,half))),
        Rect.contains(clip, Rect.cell(xx,y,half)), clip, ImageOps.tr(source), ImageOps.tr(target))
      c = choose(rest, half, x, yy, Bool.not(Rect.overlaps(clip, Rect.cell(x,yy,half))),
        Rect.contains(clip, Rect.cell(x,yy,half)), clip, ImageOps.bl(source), ImageOps.bl(target))
      d = choose(rest, half, xx, yy, Bool.not(Rect.overlaps(clip, Rect.cell(xx,yy,half))),
        Rect.contains(clip, Rect.cell(xx,yy,half)), clip, ImageOps.br(source), ImageOps.br(target))
      Qua{a,b,c,d}

def replace(+depth: Nat, +size: U32, +clip: Rect.Box,
  source: Image, target: Image) -> Image:
  choose(depth,size,0,0,Bool.not(Rect.overlaps(clip,Rect.screen(size))),
    Rect.contains(clip,Rect.screen(size)),clip,source,target)

def fill_region(depth: Nat,size: U32,x: U32,y: U32,box: Rect.Box,
  color: U32,opacity: U32,target: Image) -> Image:
  Tile.fill(depth,size,x,y,box,color,opacity,target)

def fill(depth: Nat, size: U32, box: Rect.Box,
  color: U32, opacity: U32, target: Image) -> Image:
  match box:
    case Rect.Box{left,top,right,bottom}:
      BlendRect.fill(depth,size,left,top,right,bottom,color,opacity,target)
