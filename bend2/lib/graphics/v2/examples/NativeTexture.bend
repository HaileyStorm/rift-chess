# Optional C/GPU emission probe. Source emission does not execute native code.
import Base
import ../../pixels/Pixel.bend as Pixel
import ../Texture.bend as Texture

def main() -> U32:
  Pixel.sample_xy(10n, 49, 97,
    Texture.fine_on_pool(1024,
      Texture.Grain{1057074, 4638419, 28, 217}))
