# Actual emitted JS/native complete-pixel fixture for the third-pass surface path.
# Includes integer blur buffers, winding, coverage, PMA gradients and group blend.
import Base
import ../../third/Surface.bend as Surface
import ../../third/Premul.bend as P
import ../../third/Brush.bend as Brush
import ../../third/Shape.bend as Shape
import ../../third/PathFill.bend as Path
import ../../third/Effects.bend as Fx
import ../../third/Raster.bend as Raster
import ../../Rect.bend as Rect
import ../../Shapes.bend as Shapes
import ../../../Quad.bend as Quad
import ../../../pixels/Pixel.bend as Pixel

# A checked-in, canonical two-stop PMA gradient, not a host-provided color array.
def brush() -> Brush.Brush:
  Brush.Linear{0.0,0.0,32.0,0.0,0.0009765625,Brush.Stops{Con{Brush.Stop{0,P.straight(4615871,217)},Con{Brush.Stop{65535,P.straight(16737600,153)},Nil{}}}},Brush.Pad{}}

# Closed contour with a hole specified independently of any game geometry.
def edges() -> Path.Edges:
  +outer = Path.join(Path.edge(Quad.Point{3.0,3.0},Quad.Point{29.0,3.0}),Path.join(Path.edge(Quad.Point{29.0,3.0},Quad.Point{26.0,29.0}),Path.join(Path.edge(Quad.Point{26.0,29.0},Quad.Point{4.0,27.0}),Path.edge(Quad.Point{4.0,27.0},Quad.Point{3.0,3.0}))))
  +inner = Path.join(Path.edge(Quad.Point{11.0,10.0},Quad.Point{13.0,22.0}),Path.join(Path.edge(Quad.Point{13.0,22.0},Quad.Point{23.0,19.0}),Path.edge(Quad.Point{23.0,19.0},Quad.Point{11.0,10.0})))
  Path.join(outer,inner)

# Layers overlap deliberately to make painter order and isolated opacity observable.
def commands() -> List<&2,Raster.Command>:
  Con{Raster.command(Shape.rounded(1.0,1.0,30.0,31.0,5.0),Brush.Solid{P.straight(1390931,223)},Shape.Four{},Rect.screen(32)),
    Con{Raster.command(Shape.closed(edges(),Path.NonZero{}),brush(),Shape.Sixteen{},Rect.Box{2,1,31,30}),
      Con{Raster.command(Shape.ellipse(23.0,9.0,7.0,6.0),Brush.Solid{P.straight(11397887,149)},Shape.Sixteen{},Rect.screen(32)),Nil{}}}}

# Serial, coarse-parallel and explicit offload request have the same source meaning.
def draw(offload: Bool,forks: Nat) -> Surface.Surface:
  match offload:
    case False{}: Raster.render(Surface.blank(5n),commands(),forks)
    case True{}: Raster.offload(Surface.blank(5n),commands(),forks)

# Propagate failed effect construction instead of silently changing the blur radius.
def composite(halo: Maybe<Surface.Surface>,surface: Surface.Surface) -> Image:
  match halo:
    case None{}: Pix{0}
    case Some{Surface.Surface{depth,size,halo_pixels}}:
      Surface.flatten_tree(5n,Surface.merge_tree(5n,P.Over{},Surface.pixels(Surface.opacity(surface,181)),halo_pixels),Pix{920338})

# Complete pipeline fixture; no foreign host loops or mutable scene globals.
def render(forks: Nat,offload: Bool) -> Image:
  +surface = draw(offload,forks)
  composite(Fx.halo(surface,3658495,2,2n,143,Shapes.Pos{1},Shapes.Pos{2}),surface)

# Row-major full pixels, not merely a checksum, form the parity witness.
def pixels(count: Nat,+index: U32,+image: Image) -> List<&2,U32>:
  match count:
    case 0n: Nil{}
    case 1n+rest: Con{Pixel.sample_xy(5n,U32.mod(index,32),U32.div(index,32),image),pixels(rest,U32.add(index,1),image)}

# Native executable prints the entire fixture for byte-for-byte comparison.
def main() -> List<&2,U32>:
  pixels(1024n,0,render(0n,False{}))
