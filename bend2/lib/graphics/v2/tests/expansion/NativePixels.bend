# Cross-backend full-pixel fixture. Native printing is outside timed rendering.
import Base
import ../../RenderPlan.bend as Plan
import ../../DrawList.bend as Draw
import ../../Rect.bend as Rect
import ../../RgbaAffine.bend as Affine
import ../../Transform2D.bend as Transform
import ../../RgbaSample.bend as Sample
import ../../Stroke.bend as Stroke
import ../../NineSlice.bend as Skin
import ../../Ramp.bend as Ramp
import ../../Field.bend as Field
import ../../Shapes.bend as Shapes
import ../../../Quad.bend as Quad
import ../../../pixels/Pixel.bend as Pixel

def source() -> Sample.Texture:
  +gradient: Ramp.Gradient = Ramp.Gradient{Con{Ramp.Stop{0,872887},Con{Ramp.Stop{65535,14662785},Nil{}}}}
  Sample.Texture{3n,8,Field.bake(3n,Field.Recipe{1777,3,4n},Ramp.bake(5n,gradient)),Pix{10158080}}

def commands() -> List<&2,Draw.Command>:
  +texture = source()
  +clip: Rect.Box = Rect.Box{2,3,62,61}
  +geometry = Affine.prepare(Transform.Matrix{24.75,2.25,F32.neg(3.5),23.25,20.125,21.75})
  +path = Stroke.join(Stroke.line(Quad.Point{3.5,50.25},Quad.Point{55.25,11.5},1.75),
    Stroke.cubic(3n,Quad.Point{4.25,30.5},Quad.Point{18.5,3.75},Quad.Point{43.5,60.25},Quad.Point{59.75,29.5},2.25))
  Con{Draw.fill(Rect.Box{7,2,45,53},2634818,181),
    Con{Draw.skin(Rect.Box{3,5,59,27},texture,Skin.Insets{2,2,2,2},137,clip),
      Con{Draw.mapped(geometry,texture,Sample.Linear{},203,clip),
        Con{Draw.sprite(64,3n,8,Shapes.Neg{2},Shapes.Pos{41},Pix{15058303},Pix{8388608},191,clip),
          Con{Draw.stroke(path,15320424,167,clip),Nil{}}}}}}


def execute(offload: Bool,frame: Plan.Frame,forks: Nat) -> Image:
  match offload:
    case False{}: Plan.render(frame,forks,Pix{1056816})
    case True{}: Plan.render_offload(frame,forks,Pix{1056816})

def render(forks: Nat,offload: Bool) -> Image:
  execute(offload,Plan.prepare(3n,6n,64,commands()),forks)

def pixels(count: Nat,+index: U32,+image: Image) -> List<&2,U32>:
  match count:
    case 0n: Nil{}
    case 1n+rest:
      Con{Pixel.sample_xy(6n,U32.mod(index,64),U32.div(index,64),image),pixels(rest,U32.add(index,1),image)}

def main() -> List<&2,U32>:
  pixels(4096n,0,render(0n,False{}))
