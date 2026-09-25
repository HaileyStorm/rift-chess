# DRAFT stable-pose sprite preparation. Existing RGB/alpha rules are unchanged.
# A Patch is bound to its canvas extent, signed origin and scissor. Rebuild it
# when any of those or source pixels change; opacity/background may change freely.
import Base
import ../Rect.bend as Rect
import ../Shapes.bend as Shapes
import ../ImageOps.bend as Ops
import ../ImageView.bend as View
import ../MaskedStampKernel.bend as Kernel
import ../TileRaster.bend as Tile
import ../DrawList.bend as Draw
import ../Color.bend as Color

type Planes is Data:
  Planes{colors: Image,mask: Image}

type Patch is Data:
  Patch{depth: Nat,size: U32,bounds: Rect.Box,colors: Image,mask: Image}

# Assemble/compact each plane independently without rounding source alpha.
def join(a: Planes,b: Planes,c: Planes,d: Planes) -> Planes:
  match a b c d:
    case Planes{ac,am} Planes{bc,bm} Planes{cc,cm} Planes{dc,dm}:
      Planes{Ops.quad(ac,bc,cc,dc),Ops.quad(am,bm,cm,dm)}

# Alpha-zero pixels need neither hidden RGB lookup nor hidden-color storage.
def leaf_case(empty: Bool,colors: View.View,x: U32,y: U32,alpha: U32) -> Planes:
  match empty:
    case True{}: Planes{Pix{0},Pix{0}}
    case False{}: Planes{Pix{View.sample(colors,x,y)},Pix{U32.shln(alpha,16n)}}

# Sample one in-bounds source location; ignored mask G/B never affect coverage.
def leaf(+x: U32,+y: U32,colors: View.View,mask: View.View) -> Planes:
  +alpha = Color.red(View.sample(mask,x,y))
  leaf_case(U32.is_zero(alpha),colors,x,y,alpha)

# Translate once, retaining aligned subtrees and pruning zero-mask regions.
def focused(+depth: Nat,+size: U32,+x: U32,+y: U32,work: Kernel.Work) -> Planes:
  match depth work:
    case _ Kernel.Unchanged{}: Planes{Pix{0},Pix{0}}
    case _ Kernel.Aligned{colors,mask}: Planes{colors,mask}
    case 0n Kernel.Split{colors,mask}: leaf(x,y,colors,mask)
    case 1n+rest Kernel.Split{+colors,+mask}:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = focused(rest,h,x,y,Kernel.prepare(x,y,h,colors,mask))
      b = focused(rest,h,xx,y,Kernel.prepare(xx,y,h,colors,mask))
      c = focused(rest,h,x,yy,Kernel.prepare(x,yy,h,colors,mask))
      d = focused(rest,h,xx,yy,Kernel.prepare(xx,yy,h,colors,mask))
      join(a,b,c,d)

# Outside scissor nodes are transparent; the bias is removed only by View.
def region(+depth: Nat,+size: U32,+x: U32,+y: U32,outside: Bool,inside: Bool,
  +bounds: Rect.Box,+colors: View.View,+mask: View.View) -> Planes:
  match depth outside inside:
    case _ True{} _: Planes{Pix{0},Pix{0}}
    case _ False{} True{}:
      focused(depth,size,U32.add(x,4096),U32.add(y,4096),
        Kernel.prepare(U32.add(x,4096),U32.add(y,4096),size,colors,mask))
    case 0n False{} False{}: leaf(U32.add(x,4096),U32.add(y,4096),colors,mask)
    case 1n+rest False{} False{}:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = region(rest,h,x,y,Bool.not(Rect.overlaps(bounds,Rect.cell(x,y,h))),Rect.contains(bounds,Rect.cell(x,y,h)),bounds,colors,mask)
      b = region(rest,h,xx,y,Bool.not(Rect.overlaps(bounds,Rect.cell(xx,y,h))),Rect.contains(bounds,Rect.cell(xx,y,h)),bounds,colors,mask)
      c = region(rest,h,x,yy,Bool.not(Rect.overlaps(bounds,Rect.cell(x,yy,h))),Rect.contains(bounds,Rect.cell(x,yy,h)),bounds,colors,mask)
      d = region(rest,h,xx,yy,Bool.not(Rect.overlaps(bounds,Rect.cell(xx,yy,h))),Rect.contains(bounds,Rect.cell(xx,yy,h)),bounds,colors,mask)
      join(a,b,c,d)

# Retain geometry metadata beside immutable canvas-aligned color/mask planes.
def finish(depth: Nat,size: U32,bounds: Rect.Box,pair: Planes) -> Patch:
  match pair:
    case Planes{colors,mask}: Patch{depth,size,bounds,colors,mask}

# Prepare valid well-formed square sources/targets, each depth<=12,size=2^depth.
# Out-of-range signed coordinates and empty clips produce an inert patch.
def prepare(+depth: Nat,+size: U32,+source_depth: Nat,+source_size: U32,
  +left: Shapes.Coord,+top: Shapes.Coord,colors: Image,mask: Image,clip: Rect.Box) -> Patch:
  +bounds = Rect.intersect(Rect.sprite(size,left,top,source_size),clip)
  finish(depth,size,bounds,region(depth,size,0,0,Rect.is_empty(bounds),Rect.contains(bounds,Rect.screen(size)),bounds,
    View.View{source_depth,source_size,Shapes.biased(left),Shapes.biased(top),colors},
    View.View{source_depth,source_size,Shapes.biased(left),Shapes.biased(top),mask}))

# Reblend a prepared patch with the original rounded red-mask/opacity formula.
def draw_zero(zero: Bool,patch: Patch,opacity: U32,target: Image) -> Image:
  match zero patch:
    case True{} _: target
    case False{} Patch{depth,size,bounds,colors,mask}: Tile.masked(depth,colors,mask,opacity,target)

# The zero-opacity path preserves the exact target tree.
def draw(patch: Patch,+opacity: U32,target: Image) -> Image:
  draw_zero(U32.is_zero(opacity),patch,opacity,target)

# Reuse the existing ordered planner with tight bounds and aligned plane cursors.
def command(patch: Patch,opacity: U32) -> Draw.Command:
  match patch:
    case Patch{+depth,+size,bounds,colors,mask}:
      Draw.Sprite{bounds,View.View{depth,size,4096,4096,colors},View.View{depth,size,4096,4096,mask},opacity}
