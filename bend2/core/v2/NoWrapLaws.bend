import Base
import ../ProofKit.bend as Logic
import ./ArithmeticLaws.bend as A

law word_inc_count:
  for +n: Nat
  for +w: Word(n)
  for no_max: Logic.Truth(Bool.not(A.all_one(n, w)))
  {Word.to_nat(n, Word.inc(n, w)) == 1n+Word.to_nat(n, w) : Nat}

law u32_inc_count:
  for +bits: Word(32n)
  for no_max: Logic.Truth(Bool.not(A.all_one(32n, bits)))
  {U32.to_nat(U32.inc(U32{bits})) == 1n+U32.to_nat(U32{bits}) : Nat}

law from_nat_count:
  for +n: Nat
  for bound: Logic.Truth(Nat.is_lt(n, 21760n))
  {U32.to_nat(U32.from_nat(n)) == n : Nat}

law from_nat_injective:
  for +a: Nat
  for +b: Nat
  for bound_a: Logic.Truth(Nat.is_lt(a, 21760n))
  for bound_b: Logic.Truth(Nat.is_lt(b, 21760n))
  for equal: {U32.from_nat(a) == U32.from_nat(b) : U32}
  {a == b : Nat}

law from_nat_lt:
  for +a: Nat
  for +b: Nat
  for bound_a: Logic.Truth(Nat.is_lt(a, 21760n))
  for bound_b: Logic.Truth(Nat.is_lt(b, 21760n))
  for order: Logic.Truth(Nat.is_lt(a, b))
  Logic.Truth(U32.is_lt(U32.from_nat(a), U32.from_nat(b)))
