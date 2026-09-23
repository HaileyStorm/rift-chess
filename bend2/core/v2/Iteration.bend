import Base

def advance(n: Nat, start: U32) -> U32:
  match n:
    case 0n: start
    case 1n+rest: advance(rest, U32.add(start, 1))
def pred(n: Nat) -> Nat:
  match n:
    case 0n: 0n
    case 1n+rest: rest
