import Base
import ./NativePixels.bend as Fixture

def main() -> List<&2,U32>:
  Fixture.pixels(4096n,0,Fixture.render(3n,True{}))
