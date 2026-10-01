import Base

def left_leaf(a: U32, b: U32) -> U32:
  a

def right_leaf(a: U32, b: U32) -> U32:
  b

def local_leaf(a: U32, b: U32) -> U32:
  a

def preserve(first: U32, left: U32, right: U32, repeated: U32, local: U32) -> U32:
  first

def fanout(n: Nat) -> U32:
  match n:
    case 0n:
      0
    case 1n+p:
      left right repeated local = left_leaf@2(40, 2) right_leaf@2(40, 2) left_leaf@2(7, 2) local_leaf~(40, 2)
      recursive = fanout(p)
      preserve(recursive, left, right, repeated, local)

def main() -> U32:
  fanout(2n)
