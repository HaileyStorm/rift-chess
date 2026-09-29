import Base

def add_two(x: U32) -> U32:
  (x + 2 : U32)

def worker_root(x: U32) -> U32:
  add_two(x)

def secondary_root(x: U32) -> U32:
  (x * 3 : U32)

def hidden_root(x: U32) -> U32:
  (x * 99 : U32)

def io_root(x: U32) -> IO(U32):
  IO.pure(U32, x)

def template_root(~n: U32, x: U32) -> U32:
  (x + n : U32)

def foreign_root(x: U32) -> IO(U32):
  import "./foreign.js"

def main() -> U32:
  worker_root(40)
