import Base
import ../ProofKit.bend as Logic
import ./Iteration.bend as Iteration

law nat_lt_trans:
  for +a: Nat
  for +b: Nat
  for +c: Nat
  for ab: Logic.Truth(Nat.is_lt(a, b))
  for bc: Logic.Truth(Nat.is_lt(b, c))
  Logic.Truth(Nat.is_lt(a, c))

law u32_lt_trans:
  for +a: U32
  for +b: U32
  for +c: U32
  for ab: Logic.Truth(U32.is_lt(a, b))
  for bc: Logic.Truth(U32.is_lt(b, c))
  Logic.Truth(U32.is_lt(a, c))

law word_cmp_eq:
  for +n: Nat
  for +a: Word(n)
  for +b: Word(n)
  for e: Logic.Truth(Cmp.is_eq(Word.cmp(n, a, b)))
  {a == b : Word(n)}

law u32_cmp_eq:
  for +a: U32
  for +b: U32
  for e: Logic.Truth(Cmp.is_eq(U32.cmp(a, b)))
  {a == b : U32}

def all_one(n: Nat, w: Word(n)) -> Bool:
  match n:
    case 0n:
      True{}
    case 1n+p:
      match w:
        case WCon{b, t}:
          Bool.and(b, all_one(p, t))

def word_one(n: Nat) -> Word(n):
  match n:
    case 0n:
      WNil{}
    case 1n+p:
      WCon{True{}, Word.zero(p)}

law word_cmp_refl:
  for n: Nat
  for w: Word(n)
  {Word.cmp(n, w, w) == EQ{} : Cmp}

law word_inc_strict:
  for n: Nat
  for w: Word(n)
  for no_max: Logic.Truth(Bool.not(all_one(n, w)))
  Logic.Truth(Cmp.is_lt(Word.cmp(n, w, Word.inc(n, w))))

law word_add_one:
  for n: Nat
  for w: Word(n)
  {Word.add(n, w, word_one(n)) == Word.inc(n, w) : Word(n)}

law u32_add_one:
  for +x: U32
  {U32.add(x, 1) == U32.inc(x) : U32}

law advance_successor:
  for +n: Nat
  for +start: U32
  {Iteration.advance(n, U32.add(start, 1)) ==
    U32.add(Iteration.advance(n, start), 1) : U32}

law advance_from_zero:
  for +n: Nat
  {Iteration.advance(n, 0) == U32.from_nat(n) : U32}
