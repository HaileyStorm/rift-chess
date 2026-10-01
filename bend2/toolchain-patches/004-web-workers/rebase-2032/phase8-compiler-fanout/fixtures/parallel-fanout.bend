import Base

def left_leaf(a: U32, b: U32) -> U32:
  a

def right_leaf(a: U32, b: U32) -> U32:
  b

def local_leaf(a: U32, b: U32) -> U32:
  a

def preserve(left: U32, right: U32, repeated: U32, local: U32) -> U32:
  left

def fanout(a: U32) -> U32:
  left_result right_result repeated_result local_result = left_leaf@2(a, 2) right_leaf@2(40, 2) left_leaf@2(7, 2) local_leaf~(40, 2)
  preserve(left_result, right_result, repeated_result, local_result)

def main() -> U32:
  fanout(40)
