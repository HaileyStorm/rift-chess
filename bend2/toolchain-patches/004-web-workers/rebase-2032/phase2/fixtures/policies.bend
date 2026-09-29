import Base

def identity(x: U32) -> U32:
  x

def required(x: U32) -> U32:
  identity@(x)

def capped(x: U32) -> U32:
  identity@2(x)

def never_call(x: U32) -> U32:
  identity~(x)

def native_required(x: U32) -> U32:
  identity!@(x)

def hidden_require(x: U32) -> U32:
  identity@(x)

def conflict(x: U32) -> U32:
  hidden_require~(x)

def arithmetic(x: U32) -> U32:
  (x + 1 : U32)

def required_arithmetic(x: U32) -> U32:
  arithmetic@(x)

def float_identity(x: F32) -> F32:
  x

def apply_one(f: U32 -> U32, x: U32) -> U32:
  f(x)

def main() -> U32:
  identity(40)
