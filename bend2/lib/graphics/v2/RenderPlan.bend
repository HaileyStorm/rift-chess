# DRAFT prepare-once spatial command bins; serial and bounded four-way forks.
# The caller selects partition depth independently from runtime fork depth.
# Stable painter order per pixel; no shared mutable framebuffer or global scene.
import Base
import ./Rect.bend as Rect
import ./Damage.bend as Damage
import ./DrawList.bend as DrawList
import ./ImageOps.bend as ImageOps

type Tree is Data:
  Keep{}
  Tile{commands: List<&2,DrawList.Command>}
  Branch{tl: Tree,tr: Tree,bl: Tree,br: Tree}

type Frame is Data:
  Frame{depth: Nat,size: U32,tree: Tree}

def build(+cuts: Nat, +depth: Nat, +size: U32, +x: U32, +y: U32,
  +commands: List<&2,DrawList.Command>) -> Tree:
  match cuts depth commands:
    case _ _ Nil{}: Keep{}
    case 0n _ _: Tile{commands}
    case 1n+rest 0n _: Tile{commands}
    case 1n+rest 1n+lower _:
      +half = U32.div(size,2)
      +xx = U32.add(x,half)
      +yy = U32.add(y,half)
      a = build(rest,lower,half,x,y,DrawList.filter(commands,Rect.cell(x,y,half)))
      b = build(rest,lower,half,xx,y,DrawList.filter(commands,Rect.cell(xx,y,half)))
      c = build(rest,lower,half,x,yy,DrawList.filter(commands,Rect.cell(x,yy,half)))
      d = build(rest,lower,half,xx,yy,DrawList.filter(commands,Rect.cell(xx,yy,half)))
      Branch{a,b,c,d}

def prepare(cuts: Nat, +depth: Nat, +size: U32,
  commands: List<&2,DrawList.Command>) -> Frame:
  Frame{depth,size,build(cuts,depth,size,0,0,DrawList.filter(commands,Rect.screen(size)))}

# Four sequential calls: this is a true serial baseline, not JS's serialization
# of parallel syntax. A malformed Branch at depth zero preserves its target.
def serial(tree: Tree, +depth: Nat, +size: U32,
  +x: U32, +y: U32, +target: Image) -> Image:
  match tree depth:
    case Keep{} _: target
    case Tile{commands} _: DrawList.render(commands,depth,size,x,y,target)
    case Branch{tl,tr,bl,br} 0n: target
    case Branch{tl,tr,bl,br} 1n+rest:
      +half = U32.div(size,2)
      +xx = U32.add(x,half)
      +yy = U32.add(y,half)
      a = serial(tl,rest,half,x,y,ImageOps.tl(target))
      b = serial(tr,rest,half,xx,y,ImageOps.tr(target))
      c = serial(bl,rest,half,x,yy,ImageOps.bl(target))
      d = serial(br,rest,half,xx,yy,ImageOps.br(target))
      Qua{a,b,c,d}

def pool(+forks: Nat, tree: Tree, +depth: Nat, +size: U32,
  +x: U32, +y: U32, +target: Image) -> Image:
  match forks tree depth:
    case 0n _ _: serial(tree,depth,size,x,y,target)
    case 1n+rest Keep{} _: target
    case 1n+rest Tile{commands} _: DrawList.render(commands,depth,size,x,y,target)
    case 1n+rest Branch{tl,tr,bl,br} 0n: target
    case 1n+rest Branch{tl,tr,bl,br} 1n+lower:
      +half = U32.div(size,2)
      +xx = U32.add(x,half)
      +yy = U32.add(y,half)
      a b c d = pool(rest,tl,lower,half,x,y,ImageOps.tl(target))
        pool(rest,tr,lower,half,xx,y,ImageOps.tr(target))
        pool(rest,bl,lower,half,x,yy,ImageOps.bl(target))
        pool(rest,br,lower,half,xx,yy,ImageOps.br(target))
      Qua{a,b,c,d}

def render(frame: Frame, forks: Nat, target: Image) -> Image:
  match frame:
    case Frame{depth,size,tree}: pool(forks,tree,depth,size,0,0,target)

# Explicit GPU-route request with the pinned runtime's CPU fallback. This is
# an opt-in entrypoint, not a claim that the device backend has been timed.
# Keep the bang at the root; child forks remain plain named definition calls.
def render_offload(frame: Frame,forks: Nat,target: Image) -> Image:
  match frame:
    case Frame{depth,size,tree}: pool!(forks,tree,depth,size,0,0,target)

# Tile-conservative repaint: active leaves rebuild from current background,
# never composite alpha over the previous foreground a second time. Empty
# leaves restore background too, which is necessary for object removal.
def damaged(tree: Tree, +depth: Nat, +size: U32, +x: U32, +y: U32,
  active: Bool, +damage: List<&2,Rect.Box>, +background: Image,
  +previous: Image) -> Image:
  match tree depth active:
    case _ _ False{}: previous
    case Keep{} _ True{}: background
    case Tile{commands} _ True{}: DrawList.render(commands,depth,size,x,y,background)
    case Branch{tl,tr,bl,br} 0n True{}: background
    case Branch{tl,tr,bl,br} 1n+rest True{}:
      +half = U32.div(size,2)
      +xx = U32.add(x,half)
      +yy = U32.add(y,half)
      a = damaged(tl,rest,half,x,y,Damage.touches(damage,Rect.cell(x,y,half)),damage,ImageOps.tl(background),ImageOps.tl(previous))
      b = damaged(tr,rest,half,xx,y,Damage.touches(damage,Rect.cell(xx,y,half)),damage,ImageOps.tr(background),ImageOps.tr(previous))
      c = damaged(bl,rest,half,x,yy,Damage.touches(damage,Rect.cell(x,yy,half)),damage,ImageOps.bl(background),ImageOps.bl(previous))
      d = damaged(br,rest,half,xx,yy,Damage.touches(damage,Rect.cell(xx,yy,half)),damage,ImageOps.br(background),ImageOps.br(previous))
      Qua{a,b,c,d}

def repaint(frame: Frame, +damage: List<&2,Rect.Box>, background: Image,
  previous: Image) -> Image:
  match frame:
    case Frame{depth,+size,tree}:
      damaged(tree,depth,size,0,0,Damage.touches(damage,Rect.screen(size)),damage,background,previous)
