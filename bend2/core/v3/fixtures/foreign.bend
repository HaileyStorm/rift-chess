import Base

law leaf:
  IO(U32)

def leaf():
  import "./foreign.js"

def caller() -> IO(U32):
  leaf()
