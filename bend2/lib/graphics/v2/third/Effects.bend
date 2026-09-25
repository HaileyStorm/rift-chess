# DRAFT reusable cached effects, separate from drawing and frame scheduling.
# Softening is repeated exact box filtering, not an analytic Gaussian. Its pass
# count and radius are explicit. Shadows/glows are prepared transparent layers.
import Base
import ./Premul.bend as P
import ./Surface.bend as Surface
import ./Blur.bend as Blur
import ./ImageShift.bend as Shift
import ../Shapes.bend as Shapes
import ../ImageOps.bend as Ops

type Recolor is Data:
  Silhouette{color: U32}
  Tint{color: U32}

# Recolor preserves alpha, whereas tint modulates only premultiplied RGB channels.
def pixel(effect: Recolor,+pixel: U32) -> U32:
  match effect:
    case Silhouette{color}: P.straight(color,P.alpha(pixel))
    case Tint{color}: P.tint(pixel,color)

# Sequential color preparation, preserving uniform nodes whenever possible.
def map(+depth: Nat,image: Image,+effect: Recolor) -> Image:
  match depth image:
    case _ Pix{value}: Pix{pixel(effect,value)}
    case 0n Qua{a,b,c,d}: Pix{0}
    case 1n+rest Qua{a,b,c,d}:
      aa = map(rest,a,effect)
      bb = map(rest,b,effect)
      cc = map(rest,c,effect)
      dd = map(rest,d,effect)
      Ops.quad(aa,bb,cc,dd)

# Apply a color effect without changing surface geometry or ownership.
def recolor(surface: Surface.Surface,effect: Recolor) -> Surface.Surface:
  match surface:
    case Surface.Surface{+depth,size,pixels}: Surface.Surface{depth,size,map(depth,pixels,effect)}

# Shift exact premultiplied words; clipped halo support is not silently padded.
def translate(surface: Surface.Surface,left: Shapes.Coord,top: Shapes.Coord) -> Surface.Surface:
  match surface:
    case Surface.Surface{+depth,+size,pixels}: Surface.Surface{depth,size,Shift.shift(depth,size,pixels,left,top)}

# Repeat bounded filter work while propagating explicit rejection.
def repeat(passes: Nat,current: Maybe<Surface.Surface>,+radius: U32,+border: Blur.Border) -> Maybe<Surface.Surface>:
  match passes current:
    case _ None{}: None{}
    case 0n Some{surface}: Some{surface}
    case 1n+rest Some{surface}: repeat(rest,Blur.box(surface,radius,border),radius,border)

# Reject more than three passes/radius>128; zero passes is an exact identity.
def soften_case(ok: Bool,surface: Surface.Surface,passes: Nat,radius: U32,border: Blur.Border) -> Maybe<Surface.Surface>:
  match ok:
    case False{}: None{}
    case True{}: repeat(passes,Some{surface},radius,border)

# Allocate deliberate preparation buffers, not hidden inside a draw command.
def soften(surface: Surface.Surface,+passes: Nat,+radius: U32,border: Blur.Border) -> Maybe<Surface.Surface>:
  soften_case(Bool.and(Nat.is_le(passes,3n),U32.is_le(radius,128)),surface,passes,radius,border)

# Finish an already softened halo with group opacity and integer translation.
def halo_finish(result: Maybe<Surface.Surface>,strength: U32,left: Shapes.Coord,top: Shapes.Coord) -> Maybe<Surface.Surface>:
  match result:
    case None{}: None{}
    case Some{surface}: Some{translate(Surface.opacity(surface,strength),left,top)}

# A shadow or glow is the same generic tinted alpha field. Composition order,
# blend mode and padding belong to the caller; no app lighting policy is imposed.
def halo(surface: Surface.Surface,color: U32,radius: U32,passes: Nat,strength: U32,left: Shapes.Coord,top: Shapes.Coord) -> Maybe<Surface.Surface>:
  halo_finish(soften(recolor(surface,Silhouette{color}),passes,radius,Blur.Transparent{}),strength,left,top)
