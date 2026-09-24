# Equal material/checksum workload with the non-bang four-way Texture.tree.
# Its parallel let may still schedule work; this is not a serial baseline.
import Base
import ./NativeTextureWork.bend as Work

def main() -> U32:
  Work.run(64n, 217, 2166136261, False{})
