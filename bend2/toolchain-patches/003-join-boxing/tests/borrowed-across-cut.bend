# Two borrowed readers of one boxed list run in a non-tail fork. The list and
# two wide records remain live across the cut; their String fields are read
# afterward, so copying or freeing an owned nested box incorrectly is visible.
import Base
import ./shared-dynamic-read.bend as Wide

type Xs is Data:
  X0{}
  X1{v: U32, rest: Xs}

def Xs.build(n: Nat, +acc: U32) -> Xs:
  match n:
    case 0n:
      X0{}
    case 1n+p:
      X1{acc, Xs.build(p, (acc + 1 : U32))}

def Xs.len(xs: Xs) -> U32:
  match xs:
    case X0{}:
      0
    case X1{v, rest}:
      (Xs.len(rest) + 1 : U32)

def fan(+xs: Xs) -> U32:
  a b = Xs.len(xs) Xs.len(xs)
  U32.add(a, b)

def held(+xs: Xs, a: Wide.R128, b: Wide.R128) -> String:
  z = fan(xs)
  String.append(U32.show(U32.add(z, Xs.len(xs))), String.append(Wide.content(a), Wide.content(b)))

def main() -> IO(Unit):
  IO.print(held(Xs.build(3n, 1), Wide.r128(1), Wide.r128(2)))

#|91owned2owned
