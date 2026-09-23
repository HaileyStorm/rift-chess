import Base
import ../ProofKit.bend as Logic
import ./ArithmeticLaws.bend as Laws
import ./Iteration.bend as Iteration
import ./WordNatProof.bend as WordNat
import ./WordNatLaws.bend as WN

def nat_lt_trans_core(+a: Nat, +b: Nat, +c: Nat,
  ab: Logic.Truth(Nat.is_lt(a, b)),
  bc: Logic.Truth(Nat.is_lt(b, c))) -> Logic.Truth(Nat.is_lt(a, c)):
  match a b c:
    case 0n 0n 0n:
      Empty.absurd(Logic.Truth(Nat.is_lt(0n, 0n)), ab)
    case 0n 0n 1n+cp:
      Empty.absurd(Logic.Truth(Nat.is_lt(0n, 1n+cp)), ab)
    case 0n 1n+bp 0n:
      Empty.absurd(Logic.Truth(Nat.is_lt(0n, 0n)), bc)
    case 0n 1n+bp 1n+cp:
      Unit{}
    case 1n+ap 0n 0n:
      Empty.absurd(Logic.Truth(Nat.is_lt(1n+ap, 0n)), ab)
    case 1n+ap 0n 1n+cp:
      Empty.absurd(Logic.Truth(Nat.is_lt(1n+ap, 1n+cp)), ab)
    case 1n+ap 1n+bp 0n:
      Empty.absurd(Logic.Truth(Nat.is_lt(1n+ap, 0n)), bc)
    case 1n+ap 1n+bp 1n+cp:
      nat_lt_trans_core(ap, bp, cp, ab, bc)

def Laws.nat_lt_trans(a, b, c, ab, bc):
  nat_lt_trans_core(a, b, c, ab, bc)

def cmp_eq_same_bit(bit: Bool, t: Cmp,
  e: Logic.Truth(Cmp.is_eq(Word.cmp.fin(bit, bit, t))))
  -> Logic.Truth(Cmp.is_eq(t)):
  match t:
    case LT{}:
      Empty.absurd(Logic.Truth(Cmp.is_eq(LT{})), e)
    case EQ{}:
      Unit{}
    case GT{}:
      Empty.absurd(Logic.Truth(Cmp.is_eq(GT{})), e)

def cmp_eq_mixed_false_true(t: Cmp,
  e: Logic.Truth(Cmp.is_eq(Word.cmp.fin(False{}, True{}, t)))) -> Empty:
  match t:
    case LT{}: e
    case EQ{}: e
    case GT{}: e

def cmp_eq_mixed_true_false(t: Cmp,
  e: Logic.Truth(Cmp.is_eq(Word.cmp.fin(True{}, False{}, t)))) -> Empty:
  match t:
    case LT{}: e
    case EQ{}: e
    case GT{}: e

def word_cmp_eq_core(n: Nat, a: Word(n), b: Word(n),
  e: Logic.Truth(Cmp.is_eq(Word.cmp(n, a, b)))) -> {a == b : Word(n)}:
  match n:
    case 0n:
      match a b:
        case WNil{} WNil{}: {==}
    case 1n++p:
      match a b:
        case WCon{False{}, +at} WCon{False{}, +bt}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{False{}, q}, at, bt,
            word_cmp_eq_core(p, at, bt,
              cmp_eq_same_bit(False{}, Word.cmp(p, at, bt), e)))
        case WCon{True{}, +at} WCon{True{}, +bt}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{True{}, q}, at, bt,
            word_cmp_eq_core(p, at, bt,
              cmp_eq_same_bit(True{}, Word.cmp(p, at, bt), e)))
        case WCon{False{}, +at} WCon{True{}, +bt}:
          Empty.absurd({WCon{False{}, at} == WCon{True{}, bt} : Word(1n+p)},
            cmp_eq_mixed_false_true(Word.cmp(p, at, bt), e))
        case WCon{True{}, +at} WCon{False{}, +bt}:
          Empty.absurd({WCon{True{}, at} == WCon{False{}, bt} : Word(1n+p)},
            cmp_eq_mixed_true_false(Word.cmp(p, at, bt), e))

def Laws.word_cmp_eq(n, a, b, e):
  word_cmp_eq_core(n, a, b, e)

def cmp_eq_transport(+a: Bool, +b: Bool, e: {a == b : Bool},
  w: Logic.Truth(a)) -> Logic.Truth(b):
  Logic.truth_of_eq(b,
    Equal.trans(Bool, True{}, a, b,
      Equal.sym(Bool, a, True{}, Logic.truth_eq(a, w)), e))

def Laws.u32_cmp_eq(a, b, e):
  match a b:
    case U32{+x} U32{+y}:
      +eq = word_cmp_eq_core(32n, x, y, e)
      Equal.cong(Word(32n), U32, q => U32{q}, x, y, eq)

def Laws.u32_lt_trans(a, b, c, ab, bc):
  +eab = Equal.cong(Cmp, Bool, q => Cmp.is_lt(q),
    U32.cmp(a, b), Nat.cmp(U32.to_nat(a), U32.to_nat(b)),
    WN.u32_cmp_nat(a, b))
  +ebc = Equal.cong(Cmp, Bool, q => Cmp.is_lt(q),
    U32.cmp(b, c), Nat.cmp(U32.to_nat(b), U32.to_nat(c)),
    WN.u32_cmp_nat(b, c))
  +nab = cmp_eq_transport(U32.is_lt(a, b),
    Nat.is_lt(U32.to_nat(a), U32.to_nat(b)), eab, ab)
  +nbc = cmp_eq_transport(U32.is_lt(b, c),
    Nat.is_lt(U32.to_nat(b), U32.to_nat(c)), ebc, bc)
  +nac = nat_lt_trans_core(U32.to_nat(a), U32.to_nat(b), U32.to_nat(c), nab, nbc)
  +eac = Equal.cong(Cmp, Bool, q => Cmp.is_lt(q),
    U32.cmp(a, c), Nat.cmp(U32.to_nat(a), U32.to_nat(c)),
    WN.u32_cmp_nat(a, c))
  cmp_eq_transport(Nat.is_lt(U32.to_nat(a), U32.to_nat(c)),
    U32.is_lt(a, c), Equal.sym(Bool,
      U32.is_lt(a, c), Nat.is_lt(U32.to_nat(a), U32.to_nat(c)), eac), nac)

def cmp_fin_refl(b: Bool, t: Cmp) -> {Word.cmp.fin(b, b, t) == t : Cmp}:
  match b t:
    case False{} LT{}: {==}
    case False{} EQ{}: {==}
    case False{} GT{}: {==}
    case True{} LT{}: {==}
    case True{} EQ{}: {==}
    case True{} GT{}: {==}

def truth_transport(+a: Bool, +b: Bool, e: {a == b : Bool},
  w: Logic.Truth(a)) -> Logic.Truth(b):
  Logic.truth_of_eq(b,
    Equal.trans(Bool, True{}, a, b,
      Equal.sym(Bool, a, True{}, Logic.truth_eq(a, w)), e))

def Laws.word_cmp_refl(n, w):
  match n:
    case 0n:
      {==}
    case 1n++p:
      match w:
        case WCon{False{}, +t}:
          Equal.trans(Cmp, Word.cmp.fin(False{}, False{}, Word.cmp(p, t, t)),
            Word.cmp(p, t, t), EQ{}, cmp_fin_refl(False{}, Word.cmp(p, t, t)),
            Laws.word_cmp_refl(p, t))
        case WCon{True{}, +t}:
          Equal.trans(Cmp, Word.cmp.fin(True{}, True{}, Word.cmp(p, t, t)),
            Word.cmp(p, t, t), EQ{}, cmp_fin_refl(True{}, Word.cmp(p, t, t)),
            Laws.word_cmp_refl(p, t))

def cmp_fin_false_true(t: Cmp, e: {t == EQ{} : Cmp})
  -> Logic.Truth(Cmp.is_lt(Word.cmp.fin(False{}, True{}, t))):
  +eq_bool = Equal.cong(Cmp, Bool,
    q => Cmp.is_lt(Word.cmp.fin(False{}, True{}, q)), t, EQ{}, e)
  truth_transport(Cmp.is_lt(Word.cmp.fin(False{}, True{}, EQ{})),
    Cmp.is_lt(Word.cmp.fin(False{}, True{}, t)), Equal.sym(Bool,
      Cmp.is_lt(Word.cmp.fin(False{}, True{}, t)),
      Cmp.is_lt(Word.cmp.fin(False{}, True{}, EQ{})), eq_bool), Unit{})

def cmp_fin_true_false(t: Cmp,
  w: Logic.Truth(Cmp.is_lt(t)))
  -> Logic.Truth(Cmp.is_lt(Word.cmp.fin(True{}, False{}, t))):
  match t:
    case LT{}:
      Unit{}
    case EQ{}:
      Empty.absurd(Logic.Truth(Cmp.is_lt(Word.cmp.fin(True{}, False{}, t))), w)
    case GT{}:
      Empty.absurd(Logic.Truth(Cmp.is_lt(Word.cmp.fin(True{}, False{}, t))), w)

def word_inc_strict.go(n: Nat, w: Word(n),
  no_max: Logic.Truth(Bool.not(Laws.all_one(n, w))))
  -> Logic.Truth(Cmp.is_lt(Word.cmp(n, w, Word.inc(n, w)))):
  match n:
    case 0n:
      Empty.absurd(Logic.Truth(Cmp.is_lt(Word.cmp(n, w, Word.inc(n, w)))), no_max)
    case 1n++p:
      match w:
        case WCon{False{}, +t}:
          cmp_fin_false_true(Word.cmp(p, t, t), Laws.word_cmp_refl(p, t))
        case WCon{True{}, +t}:
          cmp_fin_true_false(Word.cmp(p, t, Word.inc(p, t)),
            word_inc_strict.go(p, t, no_max))

def Laws.word_inc_strict(n, w, no_max):
  word_inc_strict.go(n, w, no_max)

def adc_zero_carry(n: Nat, w: Word(n), carry: Bool)
  -> {Word.adc(n, w, Word.zero(n), False{}, carry)
      == Bool.pick(Word(n), carry, Word.inc(n, w), w) : Word(n)}:
  match n:
    case 0n:
      match w carry:
        case WNil{} False{}: {==}
        case WNil{} True{}: {==}
    case 1n+p:
      match w carry:
        case WCon{False{}, +t} False{}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{False{}, q},
            Word.adc(p, t, Word.zero(p), False{}, False{}), t,
            adc_zero_carry(p, t, False{}))
        case WCon{False{}, +t} True{}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{True{}, q},
            Word.adc(p, t, Word.zero(p), False{}, False{}), t,
            adc_zero_carry(p, t, False{}))
        case WCon{True{}, +t} False{}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{True{}, q},
            Word.adc(p, t, Word.zero(p), False{}, False{}), t,
            adc_zero_carry(p, t, False{}))
        case WCon{True{}, +t} True{}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{False{}, q},
            Word.adc(p, t, Word.zero(p), False{}, True{}), Word.inc(p, t),
            adc_zero_carry(p, t, True{}))

def Laws.word_add_one(n, w):
  match n:
    case 0n:
      {==}
    case 1n+p:
      match w:
        case WCon{False{}, +t}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{True{}, q},
            Word.adc(p, t, Word.zero(p), False{}, False{}), t,
            adc_zero_carry(p, t, False{}))
        case WCon{True{}, +t}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{False{}, q},
            Word.adc(p, t, Word.zero(p), False{}, True{}), Word.inc(p, t),
            adc_zero_carry(p, t, True{}))

def Laws.u32_add_one(x):
  match x:
    case U32{+w}:
      Equal.cong(Word(32n), U32, q => U32{q},
        Word.add(32n, w, Laws.word_one(32n)), Word.inc(32n, w),
        Laws.word_add_one(32n, w))

def Laws.advance_successor(n, start):
  match n:
    case 0n:
      {==}
    case 1n+p:
      Laws.advance_successor(p, U32.add(start, 1))

def Laws.advance_from_zero(n):
  match n:
    case 0n:
      {==}
    case 1n+p:
      +step = Laws.advance_successor(p, 0)
      +ih = Laws.advance_from_zero(p)
      +ih_add = Equal.cong(U32, U32, q => U32.add(q, 1),
        Iteration.advance(p, 0), U32.from_nat(p), ih)
      +inc = Laws.u32_add_one(U32.from_nat(p))
      +mid = Equal.trans(U32,
        Iteration.advance(p, U32.add(0, 1)),
        U32.add(Iteration.advance(p, 0), 1),
        U32.add(U32.from_nat(p), 1), step, ih_add)
      Equal.trans(U32,
        Iteration.advance(p, U32.add(0, 1)),
        U32.add(U32.from_nat(p), 1),
        U32.inc(U32.from_nat(p)), mid, inc)
