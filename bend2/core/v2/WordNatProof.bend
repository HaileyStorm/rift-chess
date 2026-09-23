import Base
import ../ProofKit.bend as L
import ./WordNatLaws.bend as Laws

def Laws.digit_cmp(a, b, ab, bb):
  match a b ab bb:
    case 0n 0n False{} False{}: {==}
    case 0n 0n False{} True{}: {==}
    case 0n 0n True{} False{}: {==}
    case 0n 0n True{} True{}: {==}
    case 0n 1n+bt False{} False{}: {==}
    case 0n 1n+bt False{} True{}: {==}
    case 0n 1n+bt True{} False{}: {==}
    case 0n 1n+bt True{} True{}: {==}
    case 1n+at 0n False{} False{}: {==}
    case 1n+at 0n False{} True{}: {==}
    case 1n+at 0n True{} False{}: {==}
    case 1n+at 0n True{} True{}: {==}
    case 1n+at 1n+bt False{} False{}: Laws.digit_cmp(at, bt, False{}, False{})
    case 1n+at 1n+bt False{} True{}: Laws.digit_cmp(at, bt, False{}, True{})
    case 1n+at 1n+bt True{} False{}: Laws.digit_cmp(at, bt, True{}, False{})
    case 1n+at 1n+bt True{} True{}: Laws.digit_cmp(at, bt, True{}, True{})

def cmp_tail_to_nat(+a: Nat, +b: Nat, +ab: Bool, +bb: Bool, +t: Cmp,
  e: {t == Nat.cmp(a, b) : Cmp})
  -> {Word.cmp.fin(ab, bb, t) == Nat.cmp(Laws.digit(ab, a), Laws.digit(bb, b)) : Cmp}:
  Equal.trans(Cmp, Word.cmp.fin(ab, bb, t), Word.cmp.fin(ab, bb, Nat.cmp(a, b)),
    Nat.cmp(Laws.digit(ab, a), Laws.digit(bb, b)),
    Equal.cong(Cmp, Cmp, q => Word.cmp.fin(ab, bb, q), t, Nat.cmp(a, b), e),
    Equal.sym(Cmp, Nat.cmp(Laws.digit(ab, a), Laws.digit(bb, b)), Word.cmp.fin(ab, bb, Nat.cmp(a, b)), Laws.digit_cmp(a, b, ab, bb)))
def Laws.word_cmp_nat(n, a, b):
  match n:
    case 0n: {==}
    case 1n++p:
      match a b:
        case WCon{False{}, +at} WCon{False{}, +bt}:
          cmp_tail_to_nat(Word.to_nat(p, at), Word.to_nat(p, bt), False{}, False{}, Word.cmp(p, at, bt), Laws.word_cmp_nat(p, at, bt))
        case WCon{False{}, +at} WCon{True{}, +bt}:
          cmp_tail_to_nat(Word.to_nat(p, at), Word.to_nat(p, bt), False{}, True{}, Word.cmp(p, at, bt), Laws.word_cmp_nat(p, at, bt))
        case WCon{True{}, +at} WCon{False{}, +bt}:
          cmp_tail_to_nat(Word.to_nat(p, at), Word.to_nat(p, bt), True{}, False{}, Word.cmp(p, at, bt), Laws.word_cmp_nat(p, at, bt))
        case WCon{True{}, +at} WCon{True{}, +bt}:
          cmp_tail_to_nat(Word.to_nat(p, at), Word.to_nat(p, bt), True{}, True{}, Word.cmp(p, at, bt), Laws.word_cmp_nat(p, at, bt))

def Laws.u32_cmp_nat(a, b):
  match a b:
    case U32{x} U32{y}: Laws.word_cmp_nat(32n, x, y)
def Laws.canonical_nat_bound(id, w):
  e = Equal.cong(Cmp, Bool, q => Cmp.is_lt(q), U32.cmp(id, 21760), Nat.cmp(U32.to_nat(id), U32.to_nat(21760)), Laws.u32_cmp_nat(id, 21760))
  %e : L.Truth(_)
  w
