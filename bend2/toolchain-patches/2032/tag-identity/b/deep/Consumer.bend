import Base
import ../../shared/Frame.bend as F

def plus_one(frame: F.Frame) -> Nat:
  match frame:
    case F.Frame{value}: Nat.add(value, 1n)
