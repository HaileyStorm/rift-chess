import Base
import ../ProofKit.bend as L

def digit(bit: Bool, n: Nat) -> Nat:
  match bit:
    case False{}: Nat.double(n)
    case True{}: 1n+Nat.double(n)
law digit_cmp:
  for +a: Nat
  for +b: Nat
  for +ab: Bool
  for +bb: Bool
  {Nat.cmp(digit(ab, a), digit(bb, b)) == Word.cmp.fin(ab, bb, Nat.cmp(a, b)) : Cmp}
law word_cmp_nat:
  for +n: Nat
  for +a: Word(n)
  for +b: Word(n)
  {Word.cmp(n, a, b) == Nat.cmp(Word.to_nat(n, a), Word.to_nat(n, b)) : Cmp}
law u32_cmp_nat:
  for +a: U32
  for +b: U32
  {U32.cmp(a, b) == Nat.cmp(U32.to_nat(a), U32.to_nat(b)) : Cmp}
law canonical_nat_bound:
  for +id: U32
  for w: L.Truth(U32.is_lt(id, 21760))
  L.Truth(Nat.is_lt(U32.to_nat(id), U32.to_nat(21760)))
