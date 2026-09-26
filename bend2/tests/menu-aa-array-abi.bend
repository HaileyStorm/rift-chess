# The host may supply a power-of-two JavaScript array at this pure Bend ABI.
import Base

def value(result: Array<U32> & U32) -> U32:
  (array,number) = result
  number

def read_second(bytes: Array<U32>) -> U32:
  value(Array.get(U32,bytes,1))
