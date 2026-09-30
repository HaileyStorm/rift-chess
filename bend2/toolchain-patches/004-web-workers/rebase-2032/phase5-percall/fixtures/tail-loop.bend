import Base

def identity(x: U32) -> U32:
  x

@unsafe
def recursive_caller(x: U32) -> U32:
  recursive_caller(identity@(x))
