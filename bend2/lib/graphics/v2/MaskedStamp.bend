# Generic two-Image alpha sprite compositor. RGB and mask are independently
# immutable source Images at the same power-of-two depth. The red channel of
# the mask is alpha; its other channels are ignored. No game, angle or mesh
# policy is embedded in this primitive.
import Base
import ./Shapes.bend as Shapes
import ./ImageView.bend as ImageView
import ./MaskedLayer.bend as MaskedLayer
import ./MaskedStampKernel.bend as Kernel

def draw_valid(valid: Bool, +target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      +sx = Shapes.biased(left)
      +sy = Shapes.biased(top)
      Kernel.start(target_depth, target_size,
        ImageView.View{source_depth, source_size, sx, sy, colors},
        ImageView.View{source_depth, source_size, sx, sy, mask}, opacity, image)

def draw_mask(empty: Bool, +target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  match empty:
    case True{}: image
    case False{}:
      draw_valid(Bool.and(Shapes.valid_coord(left), Shapes.valid_coord(top)),
        target_depth, target_size, source_depth, source_size,
        left, top, colors, mask, opacity, image)

def draw_zero(zero: Bool, +target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  match zero:
    case True{}: image
    case False{}:
      draw_mask(MaskedLayer.transparent(mask), target_depth, target_size,
        source_depth, source_size, left, top, colors, mask, opacity, image)

def draw(+target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +colors: Image, +mask: Image,
  +opacity: U32, image: Image) -> Image:
  draw_zero(U32.is_zero(opacity), target_depth, target_size,
    source_depth, source_size, left, top, colors, mask, opacity, image)
