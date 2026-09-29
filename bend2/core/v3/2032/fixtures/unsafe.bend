import Base

@unsafe
def leaf(x: U32) -> U32:
  x

def caller(x: U32) -> U32:
  leaf(x)
