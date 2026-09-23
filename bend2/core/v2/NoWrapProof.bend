import Base
import ../ProofKit.bend as Logic
import ./ArithmeticLaws.bend as A
import ./ArithmeticProof.bend as AP
import ./WordNatLaws.bend as WN
import ./NoWrapLaws.bend as Laws

def word_max(n: Nat) -> Word(n):
  match n:
    case 0n: WNil{}
    case 1n++p: WCon{True{}, word_max(p)}

def word_inc_count_core(n: Nat, w: Word(n),
  no_max: Logic.Truth(Bool.not(A.all_one(n, w))))
  -> {Word.to_nat(n, Word.inc(n, w)) == 1n+Word.to_nat(n, w) : Nat}:
  match n:
    case 0n:
      Empty.absurd({0n == 1n : Nat}, no_max)
    case 1n++p:
      match w:
        case WCon{False{}, +t}:
          {==}
        case WCon{True{}, +t}:
          +ih = word_inc_count_core(p, t, no_max)
          Equal.cong(Nat, Nat, q => Nat.double(q),
            Word.to_nat(p, Word.inc(p, t)), 1n+Word.to_nat(p, t), ih)

def Laws.word_inc_count(n, w, no_max):
  word_inc_count_core(n, w, no_max)

def Laws.u32_inc_count(bits, no_max):
  word_inc_count_core(32n, bits, no_max)

def all_one_eq(n: Nat, w: Word(n),
  all: Logic.Truth(A.all_one(n, w))) -> {w == word_max(n) : Word(n)}:
  match n:
    case 0n:
      match w:
        case WNil{}: {==}
    case 1n++p:
      match w:
        case WCon{False{}, +t}:
          Empty.absurd({WCon{False{}, t} == word_max(1n+p) : Word(1n+p)}, all)
        case WCon{True{}, +t}:
          Equal.cong(Word(p), Word(1n+p), q => WCon{True{}, q}, t,
            word_max(p), all_one_eq(p, t, all))

def max_bound_false() -> {U32.is_lt(U32{word_max(32n)}, 21760) == False{} : Bool}:
  {==}

def truth_transport(+a: Bool, +b: Bool, e: {a == b : Bool},
  w: Logic.Truth(a)) -> Logic.Truth(b):
  Logic.truth_of_eq(b,
    Equal.trans(Bool, True{}, a, b,
      Equal.sym(Bool, a, True{}, Logic.truth_eq(a, w)), e))

def false_bound(+a: Bool, e: {a == False{} : Bool}, w: Logic.Truth(a)) -> Empty:
  %e : Logic.Truth(_)
  w

def bound_transport(+a: U32, +b: U32, e: {a == b : U32},
  w: Logic.Truth(U32.is_lt(a, 21760)))
  -> Logic.Truth(U32.is_lt(b, 21760)):
  +eb = Equal.cong(U32, Bool, q => U32.is_lt(q, 21760), a, b, e)
  truth_transport(U32.is_lt(a, 21760), U32.is_lt(b, 21760), eb, w)

def all_transport(+a: Bool, +b: Bool, e: {a == b : Bool},
  w: Logic.Truth(a)) -> Logic.Truth(b):
  %e : Logic.Truth(_)
  w

def not_all_one_u32.go(+bits: Word(32n), all: Bool,
  all_value: {all == A.all_one(32n, bits) : Bool},
  bound: Logic.Truth(U32.is_lt(U32{bits}, 21760)))
  -> Logic.Truth(Bool.not(all)):
  match all:
    case False{}:
      Unit{}
    case True{}:
      +all_proof = all_transport(all, A.all_one(32n, bits), all_value, Unit{})
      +same = all_one_eq(32n, bits, all_proof)
      +u_same = Equal.cong(Word(32n), U32, q => U32{q}, bits,
        word_max(32n), same)
      +max_bound = bound_transport(U32{bits}, U32{word_max(32n)}, u_same, bound)
      false_bound(U32.is_lt(U32{word_max(32n)}, 21760), max_bound_false(), max_bound)

def not_all_one_u32(+bits: Word(32n),
  bound: Logic.Truth(U32.is_lt(U32{bits}, 21760)))
  -> Logic.Truth(Bool.not(A.all_one(32n, bits))):
  +all = A.all_one(32n, bits)
  not_all_one_u32.go(bits, all, {==}, bound)

def nat_lt_succ_self(+n: Nat) -> Logic.Truth(Nat.is_lt(n, 1n+n)):
  match n:
    case 0n: Unit{}
    case 1n++p: nat_lt_succ_self(p)

def nat_lt_pred(+n: Nat, +bound: Nat,
  w: Logic.Truth(Nat.is_lt(1n+n, bound)))
  -> Logic.Truth(Nat.is_lt(n, bound)):
  A.nat_lt_trans(n, 1n+n, bound, nat_lt_succ_self(n), w)

def u32_bound_from_nat(+n: Nat, bound: Logic.Truth(Nat.is_lt(n, 21760n)),
  count: {U32.to_nat(U32.from_nat(n)) == n : Nat})
  -> Logic.Truth(U32.is_lt(U32.from_nat(n), 21760)):
  +nat_eq = Equal.cong(Nat, Bool, q => Nat.is_lt(q, 21760n),
    U32.to_nat(U32.from_nat(n)), n, count)
  +nat_bound = truth_transport(Nat.is_lt(n, 21760n),
    Nat.is_lt(U32.to_nat(U32.from_nat(n)), 21760n),
    Equal.sym(Bool, Nat.is_lt(U32.to_nat(U32.from_nat(n)), 21760n),
      Nat.is_lt(n, 21760n), nat_eq), bound)
  +cmp_eq = Equal.cong(Cmp, Bool, q => Cmp.is_lt(q),
    U32.cmp(U32.from_nat(n), 21760),
    Nat.cmp(U32.to_nat(U32.from_nat(n)), 21760n),
    WN.u32_cmp_nat(U32.from_nat(n), 21760))
  truth_transport(Nat.is_lt(U32.to_nat(U32.from_nat(n)), 21760n),
    U32.is_lt(U32.from_nat(n), 21760),
    Equal.sym(Bool, U32.is_lt(U32.from_nat(n), 21760),
      Nat.is_lt(U32.to_nat(U32.from_nat(n)), 21760n), cmp_eq), nat_bound)

def from_nat_count_step.go(+p: Nat, +id: U32,
  +same_id: {id == U32.from_nat(p) : U32},
  pb: Logic.Truth(Nat.is_lt(p, 21760n)),
  +ih: {U32.to_nat(U32.from_nat(p)) == p : Nat})
  -> {U32.to_nat(U32.from_nat(1n+p)) == 1n+p : Nat}:
  match id:
    case U32{+bits}:
      +u_bound = u32_bound_from_nat(p, pb, ih)
      +bits_eq = Equal.sym(U32, U32{bits}, U32.from_nat(p), same_id)
      +bits_bound = bound_transport(U32.from_nat(p), U32{bits}, bits_eq, u_bound)
      +not_max = not_all_one_u32(bits, bits_bound)
      +inc = Laws.u32_inc_count(bits, not_max)
      +inc_eq = Equal.cong(U32, Nat, q => U32.to_nat(U32.inc(q)),
        U32.from_nat(p), U32{bits}, bits_eq)
      +value_eq = Equal.cong(U32, Nat, q => U32.to_nat(q),
        U32{bits}, U32.from_nat(p), same_id)
      +right_eq = Equal.cong(Nat, Nat, q => 1n+q,
        U32.to_nat(U32{bits}), U32.to_nat(U32.from_nat(p)), value_eq)
      +inc_right = Equal.trans(Nat,
        U32.to_nat(U32.inc(U32{bits})),
        1n+U32.to_nat(U32{bits}),
        1n+U32.to_nat(U32.from_nat(p)), inc, right_eq)
      +inc_full = Equal.trans(Nat,
        U32.to_nat(U32.inc(U32.from_nat(p))),
        U32.to_nat(U32.inc(U32{bits})),
        1n+U32.to_nat(U32.from_nat(p)), inc_eq, inc_right)
      +step = Equal.trans(Nat,
        U32.to_nat(U32.from_nat(1n+p)),
        U32.to_nat(U32.inc(U32.from_nat(p))),
        1n+U32.to_nat(U32.from_nat(p)), {==}, inc_full)
      +lift = Equal.cong(Nat, Nat, q => 1n+q,
        U32.to_nat(U32.from_nat(p)), p, ih)
      Equal.trans(Nat,
        U32.to_nat(U32.from_nat(1n+p)),
        1n+U32.to_nat(U32.from_nat(p)),
        1n+p, step, lift)

def from_nat_count_step(+p: Nat,
  pb: Logic.Truth(Nat.is_lt(p, 21760n)),
  ih: {U32.to_nat(U32.from_nat(p)) == p : Nat})
  -> {U32.to_nat(U32.from_nat(1n+p)) == 1n+p : Nat}:
  +id = U32.from_nat(p)
  from_nat_count_step.go(p, id, {==}, pb, ih)

def Laws.from_nat_count(n, bound):
  match n:
    case 0n:
      {==}
    case 1n++p:
      +pb = nat_lt_pred(p, 21760n, bound)
      +ih = Laws.from_nat_count(p, pb)
      from_nat_count_step(p, pb, ih)

def Laws.from_nat_injective(a, b, bound_a, bound_b, equal):
  +ca = Laws.from_nat_count(a, bound_a)
  +cb = Laws.from_nat_count(b, bound_b)
  +to_eq = Equal.cong(U32, Nat, q => U32.to_nat(q),
    U32.from_nat(a), U32.from_nat(b), equal)
  +left = Equal.sym(Nat, U32.to_nat(U32.from_nat(a)), a, ca)
  +mid = Equal.trans(Nat, a, U32.to_nat(U32.from_nat(a)),
    U32.to_nat(U32.from_nat(b)), left, to_eq)
  Equal.trans(Nat, a, U32.to_nat(U32.from_nat(b)), b, mid, cb)

def from_nat_lt_core(+a: Nat, +b: Nat, +x: U32, +y: U32,
  +x_same: {x == U32.from_nat(a) : U32},
  +y_same: {y == U32.from_nat(b) : U32},
  +ca: {U32.to_nat(U32.from_nat(a)) == a : Nat},
  +cb: {U32.to_nat(U32.from_nat(b)) == b : Nat},
  order: Logic.Truth(Nat.is_lt(a, b)))
  -> Logic.Truth(U32.is_lt(U32.from_nat(a), U32.from_nat(b))):
  +x_count = Equal.cong(U32, Nat, q => U32.to_nat(q),
    x, U32.from_nat(a), x_same)
  +y_count = Equal.cong(U32, Nat, q => U32.to_nat(q),
    y, U32.from_nat(b), y_same)
  +x_to_a = Equal.trans(Nat, U32.to_nat(x),
    U32.to_nat(U32.from_nat(a)), a, x_count, ca)
  +y_to_b = Equal.trans(Nat, U32.to_nat(y),
    U32.to_nat(U32.from_nat(b)), b, y_count, cb)
  +cmp_words = WN.u32_cmp_nat(x, y)
  +cmp_x = Equal.cong(Nat, Cmp, q => Nat.cmp(q, U32.to_nat(y)),
    U32.to_nat(x), a, x_to_a)
  +cmp_y = Equal.cong(Nat, Cmp, q => Nat.cmp(a, q),
    U32.to_nat(y), b, y_to_b)
  +nat_cmp = Equal.trans(Cmp,
    Nat.cmp(U32.to_nat(x), U32.to_nat(y)),
    Nat.cmp(a, U32.to_nat(y)), Nat.cmp(a, b), cmp_x, cmp_y)
  +cmp_bool = Equal.trans(Bool,
    U32.is_lt(x, y), Cmp.is_lt(Nat.cmp(U32.to_nat(x), U32.to_nat(y))),
    Cmp.is_lt(Nat.cmp(a, b)),
    Equal.cong(Cmp, Bool, q => Cmp.is_lt(q), U32.cmp(x, y),
      Nat.cmp(U32.to_nat(x), U32.to_nat(y)), cmp_words),
    Equal.cong(Cmp, Bool, q => Cmp.is_lt(q),
      Nat.cmp(U32.to_nat(x), U32.to_nat(y)), Nat.cmp(a, b), nat_cmp))
  +xy_order = truth_transport(Nat.is_lt(a, b), U32.is_lt(x, y),
    Equal.sym(Bool, U32.is_lt(x, y), Nat.is_lt(a, b), cmp_bool), order)
  +x_to_goal = Equal.cong(U32, Bool, q => U32.is_lt(q, y),
    x, U32.from_nat(a), x_same)
  +y_to_goal = Equal.cong(U32, Bool, q => U32.is_lt(U32.from_nat(a), q),
    y, U32.from_nat(b), y_same)
  +all_to_goal = Equal.trans(Bool, U32.is_lt(x, y),
    U32.is_lt(U32.from_nat(a), y),
    U32.is_lt(U32.from_nat(a), U32.from_nat(b)), x_to_goal, y_to_goal)
  truth_transport(U32.is_lt(x, y),
    U32.is_lt(U32.from_nat(a), U32.from_nat(b)), all_to_goal, xy_order)

def Laws.from_nat_lt(a, b, bound_a, bound_b, order):
  +ca = Laws.from_nat_count(a, bound_a)
  +cb = Laws.from_nat_count(b, bound_b)
  from_nat_lt_core(a, b, U32.from_nat(a), U32.from_nat(b),
    {==}, {==}, ca, cb, order)
