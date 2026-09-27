import Base

type Mark is Data:
  Mark{value: U32}

def read(mark: Mark) -> U32:
  match mark:
    case Mark{value}: value

law read_exact:
  for x: U32
  {read(Mark{x}) == x : U32}

def read_exact(x):
  {==}
