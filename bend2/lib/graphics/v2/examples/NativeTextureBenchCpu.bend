# Rejected CPU default, retained as a reproducible negative control.
# Bounded 64-branch pool loses to serial_tree for the measured cheap material.
# Same 64x4^7 checksum workload as NativeTextureBench.bend.
import Base
import ../Texture.bend as Texture
import ./NativeTextureWork.bend as Work

def run(+rounds: Nat, +seed: U32, +acc: U32) -> U32:
  match rounds:
    case 0n: acc
    case 1n+rest:
      +value = Work.checksum(7n, Texture.pool_top(3n, 7n, 1024, 0, 0,
        Texture.Grain{1057074, 4638419, 28, seed}))
      run(rest, U32.add(seed, 1),
        U32.xor(U32.mul(acc, 16777619), value))

def main() -> U32:
  run(64n, 217, 2166136261)
