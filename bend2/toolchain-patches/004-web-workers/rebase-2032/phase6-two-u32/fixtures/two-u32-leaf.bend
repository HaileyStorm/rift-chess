import Base

def identity(x: U32) -> U32:
  x

def second(a: U32, b: U32) -> U32:
  b

def pattern_choose(a: U32, b: U32) -> U32:
  match a:
    case 0:
      b
    case _:
      a

def require_pattern(x: U32) -> U32:
  pattern_choose@(x, 2)

def after(x: U32) -> U32:
  (x + 1 : U32)

def caller(x: U32) -> U32:
  after(second@(x, 2))

def unary_caller(x: U32) -> U32:
  after(identity@(x))

def helper(x: U32) -> U32:
  x

def nonleaf_pair(a: U32, b: U32) -> U32:
  helper(a)

def require_nonleaf(x: U32) -> U32:
  nonleaf_pair@(x, 2)

def triple(a: U32, b: U32, c: U32) -> U32:
  a

def require_triple(x: U32) -> U32:
  triple@(x, 2, 3)

def wrong_types(a: Bool, b: U32) -> U32:
  b

def require_wrong_types(x: U32) -> U32:
  wrong_types@(True{}, x)

def capped_caller(x: U32) -> U32:
  second@1(x, 2)

def multi_caller(x: U32) -> U32:
  (second@(x, 2) + second@(0, 3) : U32)

def hidden_require(x: U32) -> U32:
  second@(x, 2)

def nested_caller(x: U32) -> U32:
  hidden_require(x)

def require_under_never(x: U32) -> U32:
  hidden_require~(x)

def main() -> U32:
  caller(40)
