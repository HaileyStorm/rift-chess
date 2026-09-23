import Base
import ../ProofKit.bend as L
import ./Iteration.bend as I
import ./ArithmeticLaws.bend as A
import ./ArithmeticProof.bend as AP
import ./RoundtripLaws.bend as Laws

def false_true(e: {False{} == True{} : Bool}) -> Empty:
  %e : Bool.pick(Type, _, Empty, Unit)
  Unit{}
def successor_zero(+n: Nat, e: {1n+n == 0n : Nat}) -> Empty:
  false_true(Equal.cong(Nat, Bool, q => Nat.is_eq(q, 0n), 1n+n, 0n, e))
def double_zero(+n: Nat, e: {Nat.double(n) == 0n : Nat}) -> {n == 0n : Nat}:
  match n:
    case 0n: {==}
    case 1n++rest: Empty.absurd({1n+rest == 0n : Nat}, successor_zero(1n+Nat.double(rest), e))

def Laws.word_inc_dec(n, w):
  match n:
    case 0n:
      match w:
        case WNil{}: {==}
    case 1n++p:
      match w:
        case WCon{True{}, t}: {==}
        case WCon{False{}, +t}:
          Equal.cong(Word(p), Word(1n+p), v => WCon{False{}, v}, Word.inc(p, Laws.word_dec(p, t)), t, Laws.word_inc_dec(p, t))
def Laws.word_zero_count(n, w, zero):
  match n:
    case 0n: {==}
    case 1n++p:
      match w:
        case WCon{True{}, t}: Empty.absurd({1n+Nat.double(Word.to_nat(p, t)) == 0n : Nat}, zero)
        case WCon{False{}, +t}:
          Equal.cong(Nat, Nat, v => Nat.double(v), Word.to_nat(p, t), 0n, Laws.word_zero_count(p, t, zero))
def Laws.word_count_zero(n, w, zero):
  match n:
    case 0n:
      match w:
        case WNil{}: {==}
    case 1n++p:
      match w:
        case WCon{True{}, +t}: Empty.absurd({WCon{True{}, t} == Word.zero(1n+p) : Word(1n+p)}, successor_zero(Nat.double(Word.to_nat(p, t)), zero))
        case WCon{False{}, +t}:
          Equal.cong(Word(p), Word(1n+p), v => WCon{False{}, v}, t, Word.zero(p),
            Laws.word_count_zero(p, t, double_zero(Word.to_nat(p, t), zero)))
def Laws.word_dec_count(n, w, positive):
  match n:
    case 0n: Empty.absurd({0n == 1n : Nat}, positive)
    case 1n++p:
      match w:
        case WCon{True{}, t}: {==}
        case WCon{False{}, +t}:
          Equal.cong(Nat, Nat, v => Nat.double(v), Word.to_nat(p, t), 1n+Word.to_nat(p, Laws.word_dec(p, t)), Laws.word_dec_count(p, t, positive))

def positive_count(zero: Bool, +value: Nat, +n: Nat, e: {value == 1n+n : Nat},
  why: L.Truth(zero) -> {value == 0n : Nat}) -> L.Truth(Bool.not(zero)):
  match zero:
    case False{}: Unit{}
    case True{}:
      Empty.absurd(L.Truth(False{}), successor_zero(n,
        Equal.trans(Nat, 1n+n, value, 0n, Equal.sym(Nat, value, 1n+n, e), why(Unit{}))))
def predecessor_count(+n: Nat, +id: U32, e: {U32.to_nat(id) == 1n+n : Nat})
  -> {U32.to_nat(id) == 1n+U32.to_nat(Laws.previous(id)) : Nat}:
  match id:
    case U32{+bits}:
      Laws.word_dec_count(32n, bits,
        positive_count(Laws.word_zero(32n, bits), Word.to_nat(32n, bits), n, e,
          z => Laws.word_zero_count(32n, bits, z)))
def predecessor_restore(+id: U32) -> {U32.inc(Laws.previous(id)) == id : U32}:
  match id:
    case U32{+bits}:
      Equal.cong(Word(32n), U32, w => U32{w}, Word.inc(32n, Laws.word_dec(32n, bits)), bits, Laws.word_inc_dec(32n, bits))
def value_zero(+id: U32, e: {U32.to_nat(id) == 0n : Nat}) -> {id == 0 : U32}:
  match id:
    case U32{+bits}:
      Equal.cong(Word(32n), U32, w => U32{w}, bits, Word.zero(32n), Laws.word_count_zero(32n, bits, e))
def predecessor_value(+n: Nat, +id: U32, +e: {U32.to_nat(id) == 1n+n : Nat}) -> {U32.to_nat(Laws.previous(id)) == n : Nat}:
  Equal.cong(Nat, Nat, v => I.pred(v), 1n+U32.to_nat(Laws.previous(id)), 1n+n,
    Equal.trans(Nat, 1n+U32.to_nat(Laws.previous(id)), U32.to_nat(id), 1n+n,
      Equal.sym(Nat, U32.to_nat(id), 1n+U32.to_nat(Laws.previous(id)), predecessor_count(n, id, e)), e))
def Laws.from_nat_value(n, id, count):
  match n:
    case 0n: Equal.sym(U32, id, 0, value_zero(id, count))
    case 1n++rest:
      Equal.trans(U32, U32.inc(U32.from_nat(rest)), U32.inc(Laws.previous(id)), id,
        Equal.cong(U32, U32, v => U32.inc(v), U32.from_nat(rest), Laws.previous(id),
          Laws.from_nat_value(rest, Laws.previous(id), predecessor_value(rest, id, count))), predecessor_restore(id))
def Laws.u32_nat_roundtrip(id):
  Laws.from_nat_value(U32.to_nat(id), id, {==})
def Laws.advance_value_roundtrip(id):
  Equal.trans(U32, I.advance(U32.to_nat(id), 0), U32.from_nat(U32.to_nat(id)), id,
    A.advance_from_zero(U32.to_nat(id)), Laws.u32_nat_roundtrip(id))
