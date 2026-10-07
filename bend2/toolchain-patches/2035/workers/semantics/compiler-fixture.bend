import Base

@unsafe
def boom() -> Empty:
  boom()

def indirect() -> Empty:
  boom()

def effect() -> IO(Unit):
  IO.print("worker security boundary")

def safe(n: U32) -> U32:
  U32.add(n, 1)

def representation(value: F32) -> U32:
  F32{word} = value
  U32{word}

def from_bits(value: U32) -> F32:
  U32{word} = value
  F32{word}

def bit_intermediate(value: U32) -> U32:
  representation(from_bits(value))

def forbidden_bits(value: F32) -> U32:
  representation@(value)

def forbidden_intermediate(value: U32) -> U32:
  bit_intermediate@(value)

def finite(value: F32) -> F32:
  F32.add(value, 0.0)
