# DRAFT ordered batching for the new premultiplied surface path.
# Bounded coarse forks partition pixels, NEVER alpha command order. Serial leaves
# execute ordinary Paint.region calls; there are no hidden forks per command.
import Base
import ./Shape.bend as Shape
import ./Brush.bend as Brush
import ./Paint.bend as Paint
import ./Surface.bend as Surface
import ../Rect.bend as Rect
import ../ImageOps.bend as Ops

type Command is Data:
  Command{shape: Shape.Shape,brush: Brush.Brush,quality: Shape.Quality,bounds: Rect.Box}

# Capture explicit scissor/shape intersection once at command construction.
def command(+shape: Shape.Shape,brush: Brush.Brush,quality: Shape.Quality,clip: Rect.Box) -> Command:
  Command{shape,brush,quality,Rect.intersect(Shape.bounds(shape),clip)}

# A command's conservative footprint is independent of its brush transparency.
def bounds(command: Command) -> Rect.Box:
  match command:
    case Command{shape,brush,quality,bounds}: bounds

# Add one visible command without reordering alpha operations.
def keep(visible: Bool,command: Command,tail: List<&2,Command>) -> List<&2,Command>:
  match visible:
    case False{}: tail
    case True{}: Con{command,tail}

# Prepare tile-local lists instead of placing a whole scene behind each pixel.
def select(commands: List<&2,Command>,+region: Rect.Box) -> List<&2,Command>:
  match commands:
    case Nil{}: Nil{}
    case Con{+head,tail}: keep(Rect.overlaps(bounds(head),region),head,select(tail,region))

# Apply one command through the existing new-surface serial coverage kernel.
def one(command: Command,+depth: Nat,+span: U32,+x: U32,+y: U32,target: Image) -> Image:
  match command:
    case Command{shape,brush,quality,+bounds}:
      Paint.region(depth,span,x,y,Bool.not(Rect.overlaps(bounds,Rect.cell(x,y,span))),shape,brush,quality,bounds,target)

# Exact painter-ordered serial execution for an explicitly located square tile.
def serial(commands: List<&2,Command>,+depth: Nat,+span: U32,+x: U32,+y: U32,target: Image) -> Image:
  match commands:
    case Nil{}: target
    case Con{head,tail}: serial(tail,depth,span,x,y,one(head,depth,span,x,y,target))

# Caller chooses a coarse fork budget. Per-child command selection is preparation
# within this convenience call; cache select() output for repeated browser tiles.
def pool(+forks: Nat,+depth: Nat,+span: U32,+x: U32,+y: U32,+commands: List<&2,Command>,+target: Image) -> Image:
  match forks depth commands:
    case _ _ Nil{}: target
    case 0n _ _: serial(commands,depth,span,x,y,target)
    case 1n+rest 0n _: serial(commands,depth,span,x,y,target)
    case 1n+rest 1n+lower _:
      +h = U32.div(span,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a b c d = pool(rest,lower,h,x,y,select(commands,Rect.cell(x,y,h)),Ops.tl(target))
        pool(rest,lower,h,xx,y,select(commands,Rect.cell(xx,y,h)),Ops.tr(target))
        pool(rest,lower,h,x,yy,select(commands,Rect.cell(x,yy,h)),Ops.bl(target))
        pool(rest,lower,h,xx,yy,select(commands,Rect.cell(xx,yy,h)),Ops.br(target))
      Ops.quad(a,b,c,d)

# Render to an immutable same-size PMA surface with explicit scheduling input.
def render(surface: Surface.Surface,commands: List<&2,Command>,forks: Nat) -> Surface.Surface:
  match surface:
    case Surface.Surface{+depth,+size,pixels}: Surface.Surface{depth,size,pool(forks,depth,size,0,0,commands,pixels)}

# Explicit native offload request; CPU fallback is not device execution evidence.
def offload(surface: Surface.Surface,commands: List<&2,Command>,forks: Nat) -> Surface.Surface:
  match surface:
    case Surface.Surface{+depth,+size,pixels}: Surface.Surface{depth,size,pool!(forks,depth,size,0,0,commands,pixels)}
