import Base

def arithmetic_leaf(a: U32, b: U32) -> U32:
  (a + b : U32)

def local_leaf(a: U32, b: U32) -> U32:
  a

def preserve(left: U32, right: U32, local: U32) -> U32:
  left

def fanout(a: U32) -> U32:
  left_result right_result local_result = arithmetic_leaf@2(a, 2) arithmetic_leaf@2(40, 2) local_leaf~(40, 2)
  preserve(left_result, right_result, local_result)

def main() -> U32:
  fanout(40)
