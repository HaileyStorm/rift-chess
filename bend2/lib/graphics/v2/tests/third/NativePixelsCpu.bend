# Complete-pixel execution of the same fixture with a different schedule request.
import Base
import ./NativePixels.bend as Fixture

# Offload is tested with --gpu off, which is CPU fallback, not GPU evidence.
def main() -> List<&2,U32>:
  Fixture.pixels(1024n,0,Fixture.render(2n,False{}))
