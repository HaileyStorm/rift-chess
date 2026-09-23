import Base
import ../Model.bend as Model
import ../ProofKit.bend as Logic
import ./RuleKernel.bend as Kernel
import ./ArithmeticLaws.bend as A
import ./ArithmeticProof.bend as AP
import ./NoWrapLaws.bend as NW
import ./NoWrapProof.bend as NWP
import ./OrderingLaws.bend as Laws
import ./RangeCompositionLaws.bend as RC
import ./RangeCompositionProof.bend as RCP
import ./RangeBridgeProof.bend as RBP

def nat_lt_le_trans(+m: Nat, +n: Nat, +b: Nat,
  mn: Logic.Truth(Nat.is_lt(m, n)),
  nb: Logic.Truth(Nat.is_le(n, b)))
  -> Logic.Truth(Nat.is_lt(m, b)):
  match m n b:
    case 0n 0n 0n:
      Empty.absurd(Logic.Truth(Nat.is_lt(0n, 0n)), mn)
    case 0n 0n 1n+bp:
      Unit{}
    case 0n 1n+np 0n:
      Empty.absurd(Logic.Truth(Nat.is_le(1n+np, 0n)), nb)
    case 0n 1n+np 1n+bp:
      Unit{}
    case 1n+mp 0n 0n:
      Empty.absurd(Logic.Truth(Nat.is_lt(1n+mp, 0n)), mn)
    case 1n+mp 0n 1n+bp:
      Empty.absurd(Logic.Truth(Nat.is_lt(mp, bp)), mn)
    case 1n+mp 1n+np 0n:
      Empty.absurd(Logic.Truth(Nat.is_le(1n+np, 0n)), nb)
    case 1n+mp 1n+np 1n+bp:
      nat_lt_le_trans(mp, np, bp, mn, nb)

def end_gt_start_succ(+rest: Nat, +start: Nat)
  -> Logic.Truth(Nat.is_lt(start, Laws.EndAt(1n+rest, start))):
  match rest:
    case 0n:
      NWP.nat_lt_succ_self(start)
    case 1n++tail:
      +step = end_gt_start_succ(tail, 1n+start)
      A.nat_lt_trans(start, 1n+start, Laws.EndAt(1n+tail, 1n+start),
        NWP.nat_lt_succ_self(start), step)

def start_bound_succ(+rest: Nat, +start: Nat,
  window: Logic.Truth(Nat.is_le(Laws.EndAt(1n+rest, start), 21760n)))
  -> Logic.Truth(Nat.is_lt(start, 21760n)):
  nat_lt_le_trans(start, Laws.EndAt(1n+rest, start), 21760n,
    end_gt_start_succ(rest, start), window)

def next_bound_nonempty(+tail: Nat, +start: Nat,
  window: Logic.Truth(Nat.is_le(Laws.EndAt(1n+tail, 1n+start), 21760n)))
  -> Logic.Truth(Nat.is_lt(1n+start, 21760n)):
  nat_lt_le_trans(1n+start, Laws.EndAt(1n+tail, 1n+start), 21760n,
    end_gt_start_succ(tail, 1n+start), window)

def next_bound_nonempty_at(+tail: Nat, +next_start: Nat,
  window: Logic.Truth(Nat.is_le(Laws.EndAt(1n+tail, next_start), 21760n)))
  -> Logic.Truth(Nat.is_lt(next_start, 21760n)):
  nat_lt_le_trans(next_start, Laws.EndAt(1n+tail, next_start), 21760n,
    end_gt_start_succ(tail, next_start), window)

def next_bound_outer(+tail: Nat, +start: Nat,
  window: Logic.Truth(Nat.is_le(Laws.EndAt(1n+(1n+tail), start), 21760n)))
  -> Logic.Truth(Nat.is_lt(1n+start, 21760n)):
  nat_lt_le_trans(1n+start, Laws.EndAt(1n+tail, 1n+start), 21760n,
    end_gt_start_succ(tail, 1n+start), window)

def next_window_outer(+tail: Nat, +start: Nat,
  window: Logic.Truth(Nat.is_le(Laws.EndAt(1n+(1n+tail), start), 21760n)))
  -> Logic.Truth(Nat.is_le(Laws.EndAt(1n+tail, 1n+start), 21760n)):
  window

def from_nat_succ_add(+start: Nat)
  -> {U32.from_nat(1n+start) == U32.add(U32.from_nat(start), 1) : U32}:
  Equal.trans(U32, U32.from_nat(1n+start), U32.inc(U32.from_nat(start)),
    U32.add(U32.from_nat(start), 1), {==},
    Equal.sym(U32, U32.add(U32.from_nat(start), 1), U32.inc(U32.from_nat(start)),
      A.u32_add_one(U32.from_nat(start))))

def strict_transport(+count: Nat, +p: Model.Position, +a: U32, +b: U32,
  e: {a == b : U32}, w: Laws.Sorted(Kernel.legal_range(count, p, a)))
  -> Laws.Sorted(Kernel.legal_range(count, p, b)):
  %e : Laws.Sorted(Kernel.legal_range(count, p, _))
  w

def all_gt_transport(+base: U32, +count: Nat, +p: Model.Position,
  +a: U32, +b: U32, e: {a == b : U32},
  w: Laws.AllGreater(base, Kernel.legal_range(count, p, a)))
  -> Laws.AllGreater(base, Kernel.legal_range(count, p, b)):
  %e : Laws.AllGreater(base, Kernel.legal_range(count, p, _))
  w

def all_gt_list_transport(+base: U32, +xs: List<&2, U32>, +ys: List<&2, U32>,
  e: {xs == ys : List<&2, U32>},
  w: Laws.AllGreater(base, xs)) -> Laws.AllGreater(base, ys):
  %e : Laws.AllGreater(base, _)
  w

def all_gt_if_transport(+base: U32, +rest: Nat, +p: Model.Position,
  +cursor: U32, ok: Bool,
  e: {ok == Kernel.fast_allowed(p, cursor) : Bool},
  w: Laws.AllGreater(base, Kernel.list_if(ok, cursor,
    Kernel.legal_range(rest, p, U32.add(cursor, 1)))))
  -> Laws.AllGreater(base, Kernel.legal_range(1n+rest, p, cursor)):
  +list_eq = Equal.cong(Bool, List<&2, U32>,
    q => Kernel.list_if(q, cursor, Kernel.legal_range(rest, p, U32.add(cursor, 1))),
    ok, Kernel.fast_allowed(p, cursor), e)
  all_gt_list_transport(base,
    Kernel.list_if(ok, cursor, Kernel.legal_range(rest, p, U32.add(cursor, 1))),
    Kernel.list_if(Kernel.fast_allowed(p, cursor), cursor,
      Kernel.legal_range(rest, p, U32.add(cursor, 1))), list_eq, w)

def all_gt_cursor(rest: Nat, +base_start: Nat,
  +cursor_start: Nat, +p: Model.Position, ok: Bool,
  +base_bound: Logic.Truth(Nat.is_lt(base_start, 21760n)),
  +cursor_bound: Logic.Truth(Nat.is_lt(cursor_start, 21760n)),
  +base_lt_cursor: Logic.Truth(U32.is_lt(U32.from_nat(base_start),
    U32.from_nat(cursor_start))),
  +window: Logic.Truth(Nat.is_le(Laws.EndAt(1n+rest, cursor_start), 21760n)))
  -> Laws.AllGreater(U32.from_nat(base_start),
    Kernel.list_if(ok, U32.from_nat(cursor_start),
      Kernel.legal_range(rest, p, U32.add(U32.from_nat(cursor_start), 1)))):
  match rest:
    case 0n:
      match ok:
        case False{}: Unit{}
        case True{}: (base_lt_cursor, Unit{})
    case 1n++tail:
      match ok:
        case False{}:
          +next_start = Nat.add(1n, cursor_start)
          +next_bound_v = next_bound_outer(tail, cursor_start, window)
          +next_lt = NW.from_nat_lt(cursor_start, next_start, cursor_bound,
            next_bound_v, NWP.nat_lt_succ_self(cursor_start))
          +base_lt_next = A.u32_lt_trans(U32.from_nat(base_start),
            U32.from_nat(cursor_start), U32.from_nat(next_start),
            base_lt_cursor, next_lt)
          +next_ok = Kernel.fast_allowed(p, U32.from_nat(next_start))
          tail_raw = all_gt_cursor(tail, base_start, next_start, p, next_ok,
            base_bound, next_bound_v, base_lt_next,
            next_window_outer(tail, cursor_start, window))
          tail_proof = all_gt_if_transport(U32.from_nat(base_start), tail, p,
            U32.from_nat(next_start), next_ok, {==}, tail_raw)
          all_gt_transport(U32.from_nat(base_start), 1n+tail, p,
            U32.from_nat(next_start), U32.add(U32.from_nat(cursor_start), 1),
            from_nat_succ_add(cursor_start), tail_proof)
        case True{}:
          +next_start = Nat.add(1n, cursor_start)
          +next_bound_v = next_bound_outer(tail, cursor_start, window)
          +next_lt = NW.from_nat_lt(cursor_start, next_start, cursor_bound,
            next_bound_v, NWP.nat_lt_succ_self(cursor_start))
          +base_lt_next = A.u32_lt_trans(U32.from_nat(base_start),
            U32.from_nat(cursor_start), U32.from_nat(next_start),
            base_lt_cursor, next_lt)
          +next_ok = Kernel.fast_allowed(p, U32.from_nat(next_start))
          tail_raw = all_gt_cursor(tail, base_start, next_start, p, next_ok,
            base_bound, next_bound_v, base_lt_next,
            next_window_outer(tail, cursor_start, window))
          tail_proof = all_gt_if_transport(U32.from_nat(base_start), tail, p,
            U32.from_nat(next_start), next_ok, {==}, tail_raw)
          tail_at_add = all_gt_transport(U32.from_nat(base_start), 1n+tail, p,
            U32.from_nat(next_start), U32.add(U32.from_nat(cursor_start), 1),
            from_nat_succ_add(cursor_start), tail_proof)
          (base_lt_cursor, tail_at_add)

def all_gt_range(+cursor_start: Nat, +base_start: Nat, +count: Nat,
  +p: Model.Position,
  base_bound: Logic.Truth(Nat.is_lt(base_start, 21760n)),
  cursor_bound: Logic.Truth(Nat.is_lt(cursor_start, 21760n)),
  base_lt_cursor: Logic.Truth(U32.is_lt(U32.from_nat(base_start),
    U32.from_nat(cursor_start))),
  +window: Logic.Truth(Nat.is_le(Laws.EndAt(count, cursor_start), 21760n)))
  -> Laws.AllGreater(U32.from_nat(base_start),
    Kernel.legal_range(count, p, U32.from_nat(cursor_start))):
  match count:
    case 0n: Unit{}
    case 1n++rest:
      +ok = Kernel.fast_allowed(p, U32.from_nat(cursor_start))
      result = all_gt_cursor(rest, base_start, cursor_start, p, ok,
        base_bound, cursor_bound, base_lt_cursor, window)
      all_gt_if_transport(U32.from_nat(base_start), rest, p,
        U32.from_nat(cursor_start), ok, {==}, result)

def all_sorted_list_transport(+xs: List<&2, U32>, +ys: List<&2, U32>,
  e: {xs == ys : List<&2, U32>},
  w: Laws.Sorted(xs)) -> Laws.Sorted(ys):
  %e : Laws.Sorted(_)
  w

def strict_if_transport(+rest: Nat, +p: Model.Position, +start: Nat,
  ok: Bool, e: {ok == Kernel.fast_allowed(p, U32.from_nat(start)) : Bool},
  w: Laws.Sorted(Kernel.list_if(ok, U32.from_nat(start),
    Kernel.legal_range(rest, p, U32.add(U32.from_nat(start), 1)))))
  -> Laws.Sorted(Kernel.legal_range(1n+rest, p, U32.from_nat(start))):
  +list_eq = Equal.cong(Bool, List<&2, U32>,
    q => Kernel.list_if(q, U32.from_nat(start),
      Kernel.legal_range(rest, p, U32.add(U32.from_nat(start), 1))),
    ok, Kernel.fast_allowed(p, U32.from_nat(start)), e)
  sorted_if = all_sorted_list_transport(
    Kernel.list_if(ok, U32.from_nat(start),
      Kernel.legal_range(rest, p, U32.add(U32.from_nat(start), 1))),
    Kernel.list_if(Kernel.fast_allowed(p, U32.from_nat(start)), U32.from_nat(start),
      Kernel.legal_range(rest, p, U32.add(U32.from_nat(start), 1))), list_eq, w)
  sorted_if

def strict_cursor(+rest: Nat, +start: Nat, +p: Model.Position, ok: Bool,
  +window: Logic.Truth(Nat.is_le(Laws.EndAt(1n+rest, start), 21760n)))
  -> Laws.Sorted(Kernel.list_if(ok, U32.from_nat(start),
    Kernel.legal_range(rest, p, U32.add(U32.from_nat(start), 1)))):
  match rest:
    case 0n:
      match ok:
        case False{}: Unit{}
        case True{}: (Unit{}, Unit{})
    case 1n++tail:
      match ok:
        case False{}:
          +start_bound = start_bound_succ(1n+tail, start, window)
          +next_start = Nat.add(1n, start)
          +next_bound_v = next_bound_outer(tail, start, window)
          +next_ok = Kernel.fast_allowed(p, U32.from_nat(next_start))
          tail_raw = strict_cursor(tail, next_start, p, next_ok,
            next_window_outer(tail, start, window))
          tail_proof = strict_if_transport(tail, p, next_start, next_ok, {==}, tail_raw)
          strict_transport(1n+tail, p, U32.from_nat(next_start),
            U32.add(U32.from_nat(start), 1), from_nat_succ_add(start), tail_proof)
        case True{}:
          +start_bound = start_bound_succ(1n+tail, start, window)
          +next_start = Nat.add(1n, start)
          +next_bound_v = next_bound_outer(tail, start, window)
          +next_lt = NW.from_nat_lt(start, next_start, start_bound,
            next_bound_v, NWP.nat_lt_succ_self(start))
          +next_ok = Kernel.fast_allowed(p, U32.from_nat(next_start))
          tail_raw = strict_cursor(tail, next_start, p, next_ok,
            next_window_outer(tail, start, window))
          tail_proof = strict_if_transport(tail, p, next_start, next_ok, {==}, tail_raw)
          tail_at_add = strict_transport(1n+tail, p, U32.from_nat(next_start),
            U32.add(U32.from_nat(start), 1), from_nat_succ_add(start), tail_proof)
          all_tail_nat = all_gt_range(next_start, start, 1n+tail, p,
            start_bound, next_bound_v, next_lt, window)
          all_tail = all_gt_transport(U32.from_nat(start), 1n+tail, p,
            U32.from_nat(next_start), U32.add(U32.from_nat(start), 1),
            from_nat_succ_add(start), all_tail_nat)
          (all_tail, tail_at_add)

def strict_range(+start: Nat, +count: Nat, +p: Model.Position,
  +window: Logic.Truth(Nat.is_le(Laws.EndAt(count, start), 21760n)))
  -> Laws.Sorted(Kernel.legal_range(count, p, U32.from_nat(start))):
  match count:
    case 0n: Unit{}
    case 1n++rest:
      +ok = Kernel.fast_allowed(p, U32.from_nat(start))
      result = strict_cursor(rest, start, p, ok, window)
      strict_if_transport(rest, p, start, ok, {==}, result)

def Laws.flat_range_sorted(count, start, p, window):
  strict_range(start, count, p, window)

def cmp_ne_of_lt(c: Cmp, w: Logic.Truth(Cmp.is_lt(c)))
  -> Logic.Truth(Bool.not(Cmp.is_eq(c))):
  match c:
    case LT{}: Unit{}
    case EQ{}:
      Empty.absurd(Logic.Truth(Bool.not(Cmp.is_eq(EQ{}))), w)
    case GT{}:
      Empty.absurd(Logic.Truth(Bool.not(Cmp.is_eq(GT{}))), w)

def u32_ne_of_lt(a: U32, b: U32,
  w: Logic.Truth(U32.is_lt(a, b)))
  -> Logic.Truth(Bool.not(U32.is_eq(a, b))):
  +c = U32.cmp(a, b)
  cmp_ne_of_lt(c, w)

def no_member_from_all_greater(+id: U32, +xs: List<&2, U32>,
  w: Laws.AllGreater(id, xs)) -> Laws.NoMember(id, xs):
  match xs:
    case []: Unit{}
    case h <> t:
      match w:
        case Tuple{head, tail}:
          (u32_ne_of_lt(id, h, head), no_member_from_all_greater(id, t, tail))

def unique_from_sorted(+xs: List<&2, U32>,
  w: Laws.Sorted(xs)) -> Laws.Unique(xs):
  match xs:
    case []: Unit{}
    case h <> t:
      match w:
        case Tuple{greater, rest}:
          (no_member_from_all_greater(h, t, greater),
            unique_from_sorted(t, rest))

def sorted_list_transport(+xs: List<&2, U32>, +ys: List<&2, U32>,
  e: {xs == ys : List<&2, U32>},
  w: Laws.Sorted(xs)) -> Laws.Sorted(ys):
  %e : Laws.Sorted(_)
  w

def unique_list_transport(+xs: List<&2, U32>, +ys: List<&2, U32>,
  e: {xs == ys : List<&2, U32>},
  w: Laws.Unique(xs)) -> Laws.Unique(ys):
  %e : Laws.Unique(_)
  w

def Laws.planned_tree_sorted(depth, start, p, width, plan, window):
  flat = Laws.flat_range_sorted(U32.to_nat(width), start, p, window)
  tree_eq = RC.planned_tree_flat(depth, p, U32.from_nat(start), width, plan)
  sorted_list_transport(Kernel.legal_range(U32.to_nat(width), p, U32.from_nat(start)),
    Kernel.legal_tree(depth, p, U32.from_nat(start), width),
    Equal.sym(List<&2, U32>,
      Kernel.legal_tree(depth, p, U32.from_nat(start), width),
      Kernel.legal_range(U32.to_nat(width), p, U32.from_nat(start)), tree_eq), flat)

def canonical_window() -> Logic.Truth(Nat.is_le(
  Laws.EndAt(U32.to_nat(21760), 0n), 21760n)):
  Unit{}

def Laws.canonical_ascending(p):
  Laws.planned_tree_sorted(5n, 0n, p, 21760, RBP.canonical_plan(), canonical_window())

def Laws.canonical_unique(p):
  sorted = Laws.canonical_ascending(p)
  unique_from_sorted(Kernel.legal_ids(p), sorted)
