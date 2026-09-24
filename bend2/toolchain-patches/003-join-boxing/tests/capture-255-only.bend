# The exactly-255-word non-tail continuation must remain accepted at the pin.
import Base
import ./capture-boundary.bend as Boundary

def main() -> IO(Unit):
  IO.print(String.append(Nat.show(U32.to_nat(
    Boundary.at255(Boundary.r127(1), Boundary.r127(2)))), "n"))

#|7n
