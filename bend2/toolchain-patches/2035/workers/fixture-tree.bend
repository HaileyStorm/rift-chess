import Base

type Tree is Data:
  Tip{value: Nat}
  Branch{left: Tree, right: Tree}

def sum(t: Tree) -> Nat:
  match t:
    case Tip{value}:
      value
    case Branch{left, right}:
      a b = sum(left) sum(right)
      Nat.add(Nat.mul(a, 10n), b)
