import Base
import ../ProofKit.bend as L
import ./Iteration.bend as I

def word_dec(n: Nat, w: Word(n)) -> Word(n):
  match n:
    case 0n: WNil{}
    case 1n+p:
      match w:
        case WCon{True{}, t}: WCon{False{}, t}
        case WCon{False{}, t}: WCon{True{}, word_dec(p, t)}
def word_zero(n: Nat, w: Word(n)) -> Bool:
  match n:
    case 0n: True{}
    case 1n+p:
      match w:
        case WCon{b, t}: Bool.and(Bool.not(b), word_zero(p, t))
def previous(id: U32) -> U32:
  match id:
    case U32{bits}: U32{word_dec(32n, bits)}
law word_inc_dec:
  for +n: Nat
  for +w: Word(n)
  {Word.inc(n, word_dec(n, w)) == w : Word(n)}
law word_zero_count:
  for +n: Nat
  for +w: Word(n)
  for zero: L.Truth(word_zero(n, w))
  {Word.to_nat(n, w) == 0n : Nat}
law word_count_zero:
  for +n: Nat
  for +w: Word(n)
  for zero: {Word.to_nat(n, w) == 0n : Nat}
  {w == Word.zero(n) : Word(n)}
law word_dec_count:
  for +n: Nat
  for +w: Word(n)
  for positive: L.Truth(Bool.not(word_zero(n, w)))
  {Word.to_nat(n, w) == 1n+Word.to_nat(n, word_dec(n, w)) : Nat}
law from_nat_value:
  for +n: Nat
  for +id: U32
  for count: {U32.to_nat(id) == n : Nat}
  {U32.from_nat(n) == id : U32}
law u32_nat_roundtrip:
  for +id: U32
  {U32.from_nat(U32.to_nat(id)) == id : U32}
law advance_value_roundtrip:
  for +id: U32
  {I.advance(U32.to_nat(id), 0) == id : U32}
