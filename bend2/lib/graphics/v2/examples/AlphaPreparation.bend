# Minimal library-neutral prepare-once / compose example. DRAFT; pin check pending.
import Base
import ../Mip.bend as Mip
import ../MaskedStamp.bend as MaskedStamp
import ../Shapes.bend as Shapes

# A deliberately hidden blue RGB must not leak into the one visible red texel.
def prepare_once() -> Mip.Level:
  Mip.level(1n, 1n, 2,
    Qua{Pix{16711680}, Pix{255}, Pix{255}, Pix{255}},
    Qua{Pix{16711680}, Pix{0}, Pix{0}, Pix{0}})

def compose(level: Mip.Level, image: Image) -> Image:
  match level:
    case Mip.Level{depth, size, colors, mask}:
      MaskedStamp.draw(2n, 4, depth, size, Shapes.Pos{1}, Shapes.Pos{1},
        colors, mask, 255, image)

# A real caller caches prepare_once's result outside its draw loop.
def main() -> Image:
  compose(prepare_once(), Pix{1193046})
