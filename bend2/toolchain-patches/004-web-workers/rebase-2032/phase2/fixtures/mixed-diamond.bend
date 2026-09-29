import Base

def leaf(x: U32) -> U32:
  x

def shared(x: U32) -> U32:
  leaf@(x)

def normal(x: U32) -> U32:
  shared(x)

def blocked(x: U32) -> U32:
  shared~(x)

def top(+x: U32) -> U32:
  (normal(x) + blocked(x) : U32)
