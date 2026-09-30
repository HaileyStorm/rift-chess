import Base

def identity(x: U32) -> U32:
  x

def after(x: U32) -> U32:
  (x + 1 : U32)

def caller(x: U32) -> U32:
  after(identity@(x))

def capped_caller(x: U32) -> U32:
  identity@1(x)

def native_required(x: U32) -> U32:
  identity!@(x)

def multi_caller(x: U32) -> U32:
  (identity@(x) + identity@(0) : U32)

def never_call(x: U32) -> U32:
  identity~(x)

def intrinsic(x: U32) -> U32:
  (x + 1 : U32)

def required_intrinsic(x: U32) -> U32:
  intrinsic@(x)

def pair(x: U32, y: U32) -> U32:
  x

def required_pair(x: U32) -> U32:
  pair@(x, 1)

def hidden_require(x: U32) -> U32:
  identity@(x)

def nested_caller(x: U32) -> U32:
  hidden_require(x)

def require_under_never(x: U32) -> U32:
  hidden_require~(x)

def main() -> U32:
  caller(40)
