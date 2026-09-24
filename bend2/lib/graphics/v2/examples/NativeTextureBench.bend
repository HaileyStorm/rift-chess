# Full 4^7 balanced Texture.fine_on_pool CPU/device benchmark entrypoint.
# Source checking/C emission alone cannot establish native speed.
import Base
import ./NativeTextureWork.bend as Work

def main() -> U32:
  Work.run(64n, 217, 2166136261, True{})
