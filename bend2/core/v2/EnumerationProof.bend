import Base
import ../Model.bend as Model
import ../ProofKit.bend as Logic
import ./RuleKernel.bend as Kernel
import ./EnumerationLaws.bend as Laws

# Transport a reflected Boolean witness across an equality of positions or
# action IDs.  This avoids treating host equality as a proof of a different
# predicate and keeps the list induction constructive.
def truth_transport(+a: Bool, +b: Bool, e: {a == b : Bool},
  w: Logic.Truth(a)) -> Logic.Truth(b):
  Logic.truth_of_eq(b,
    Equal.trans(Bool, True{}, a, b,
      Equal.sym(Bool, a, True{}, Logic.truth_eq(a, w)), e))

def member_sound.head(+p: Model.Position, +start: U32, +id: U32,
  e: {True{} == Kernel.fast_allowed(p, start) : Bool},
  eq: {start == id : U32}) -> Logic.Truth(Kernel.fast_allowed(p, id)):
  truth_transport(True{}, Kernel.fast_allowed(p, id),
    Equal.trans(Bool, True{}, Kernel.fast_allowed(p, start), Kernel.fast_allowed(p, id),
      e,
      Equal.cong(U32, Bool, q => Kernel.fast_allowed(p, q), start, id, eq)),
    Unit{})

def member_sound.go(n: Nat, +p: Model.Position, +start: U32, +id: U32, ok: Bool,
  e: {ok == Kernel.fast_allowed(p, start) : Bool},
  w: Laws.Member(id, Kernel.list_if(ok, start,
    Kernel.legal_range(n, p, U32.add(start, 1)))))
  -> Logic.Truth(Kernel.fast_allowed(p, id)):
  match n:
    case 0n:
      match ok:
        case True{}:
          match w:
            case Inl{eq}:
              member_sound.head(p, start, id, e, eq)
            case Inr{tail}:
              Empty.absurd(Logic.Truth(Kernel.fast_allowed(p, id)), tail)
        case False{}:
          Empty.absurd(Logic.Truth(Kernel.fast_allowed(p, id)), w)
    case 1n+rest:
      match ok:
        case True{}:
          match w:
            case Inl{eq}:
              member_sound.head(p, start, id, e, eq)
            case Inr{tail}:
              member_sound.go(rest, p, U32.add(start, 1), id,
                Kernel.fast_allowed(p, U32.add(start, 1)), {==}, tail)
        case False{}:
          member_sound.go(rest, p, U32.add(start, 1), id,
            Kernel.fast_allowed(p, U32.add(start, 1)), {==}, w)

def member_sound(n: Nat, +p: Model.Position, +start: U32, +id: U32,
  w: Laws.Member(id, Kernel.legal_range(n, p, start)))
  -> Logic.Truth(Kernel.fast_allowed(p, id)):
  match n:
    case 0n:
      Empty.absurd(Logic.Truth(Kernel.fast_allowed(p, id)), w)
    case 1n+rest:
      member_sound.go(rest, p, start, id, Kernel.fast_allowed(p, start), {==}, w)

def Laws.range_member_sound(n, p, start, id, w):
  member_sound(n, p, start, id, w)

def member_complete.go(n: Nat, +p: Model.Position, +start: U32, +id: U32, ok: Bool,
  e: {ok == Kernel.fast_allowed(p, start) : Bool},
  in_range: Laws.InRange(1n+n, start, id),
  w: Logic.Truth(Kernel.fast_allowed(p, id)))
  -> Laws.Member(id, Kernel.list_if(ok, start,
    Kernel.legal_range(n, p, U32.add(start, 1)))):
  match n:
    case 0n:
      match ok:
        case True{}:
          match in_range:
            case Inl{eq}:
              Inl{eq}
            case Inr{tail}:
              Empty.absurd(Laws.Member(id, Kernel.list_if(ok, start,
                Kernel.legal_range(n, p, U32.add(start, 1)))), tail)
        case False{}:
          match in_range:
            case Inl{eq}:
              +start_ok = truth_transport(Kernel.fast_allowed(p, id),
                Kernel.fast_allowed(p, start),
                Equal.cong(U32, Bool, q => Kernel.fast_allowed(p, q), id, start,
                  Equal.sym(U32, start, id, eq)), w)
              +ok_start = truth_transport(Kernel.fast_allowed(p, start), ok,
                Equal.sym(Bool, ok, Kernel.fast_allowed(p, start), e), start_ok)
              Empty.absurd(Laws.Member(id, Kernel.list_if(ok, start,
                Kernel.legal_range(n, p, U32.add(start, 1)))), ok_start)
            case Inr{tail}:
              Empty.absurd(Laws.Member(id, Kernel.list_if(ok, start,
                Kernel.legal_range(n, p, U32.add(start, 1)))), tail)
    case 1n+rest:
      match ok:
        case True{}:
          match in_range:
            case Inl{eq}:
              Inl{eq}
            case Inr{tail}:
              Inr{member_complete.go(rest, p, U32.add(start, 1), id,
                Kernel.fast_allowed(p, U32.add(start, 1)), {==}, tail, w)}
        case False{}:
          match in_range:
            case Inl{eq}:
              +start_ok = truth_transport(Kernel.fast_allowed(p, id),
                Kernel.fast_allowed(p, start),
                Equal.cong(U32, Bool, q => Kernel.fast_allowed(p, q), id, start,
                  Equal.sym(U32, start, id, eq)), w)
              +ok_start = truth_transport(Kernel.fast_allowed(p, start), ok,
                Equal.sym(Bool, ok, Kernel.fast_allowed(p, start), e), start_ok)
              Empty.absurd(Laws.Member(id, Kernel.list_if(ok, start,
                Kernel.legal_range(n, p, U32.add(start, 1)))), ok_start)
            case Inr{tail}:
              member_complete.go(rest, p, U32.add(start, 1), id,
                Kernel.fast_allowed(p, U32.add(start, 1)), {==}, tail, w)

def member_complete(n: Nat, +p: Model.Position, +start: U32, +id: U32,
  in_range: Laws.InRange(n, start, id),
  w: Logic.Truth(Kernel.fast_allowed(p, id)))
  -> Laws.Member(id, Kernel.legal_range(n, p, start)):
  match n:
    case 0n:
      Empty.absurd(Laws.Member(id, Kernel.legal_range(n, p, start)), in_range)
    case 1n+rest:
      member_complete.go(rest, p, start, id, Kernel.fast_allowed(p, start),
        {==}, in_range, w)

def Laws.range_member_complete(n, p, start, id, in_range, w):
  member_complete(n, p, start, id, in_range, w)

# Membership transport through the append shape used by RuleKernel.legal_ids.
def append_member_left(id: U32, xs: List<&2, U32>, ys: List<&2, U32>,
  w: Laws.Member(id, xs))
  -> Laws.Member(id, List.append(&2, U32, xs, ys)):
  match xs:
    case []:
      Empty.absurd(Laws.Member(id, List.append(&2, U32, xs, ys)), w)
    case h <> t:
      match w:
        case Inl{eq}:
          Inl{eq}
        case Inr{tail}:
          Inr{append_member_left(id, t, ys, tail)}

def append_member_right(id: U32, xs: List<&2, U32>, ys: List<&2, U32>,
  w: Laws.Member(id, ys))
  -> Laws.Member(id, List.append(&2, U32, xs, ys)):
  match xs:
    case []:
      w
    case h <> t:
      Inr{append_member_right(id, t, ys, w)}

def or_case(-A: Type, -B: Type, -P: Type, o: Or(A, B),
  left: A -> P, right: B -> P) -> P:
  match o:
    case Inl{a}:
      left(a)
    case Inr{b}:
      right(b)

def append_member_split(id: U32, xs: List<&2, U32>, ys: List<&2, U32>,
  w: Laws.Member(id, List.append(&2, U32, xs, ys)))
  -> Or(Laws.Member(id, xs), Laws.Member(id, ys)):
  match xs:
    case []:
      Inr{w}
    case h <> t:
      match w:
        case Inl{eq}:
          Inl{Inl{eq}}
        case Inr{tail}:
          or_case(Laws.Member(id, t), Laws.Member(id, ys),
            Or(Laws.Member(id, h <> t), Laws.Member(id, ys)),
            append_member_split(id, t, ys, tail),
            wt => Inl{Inr{wt}},
            wy => Inr{wy})

def tree_member_sound.base(+p: Model.Position, +start: U32, +width: U32, +id: U32,
  w: Laws.Member(id, Kernel.legal_tree(0n, p, start, width)))
  -> Logic.Truth(Kernel.fast_allowed(p, id)):
  match p:
    case Model.Pos{+board, +holes, +side, +rights, +ep, +epPawn, +quiet, +full}:
      match board:
        case []:
          +q = {Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full} : Model.Position}
          Laws.range_member_sound(U32.to_nat(width), q, start, id, w)
        case h <> t:
          +q = {Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full} : Model.Position}
          Laws.range_member_sound(U32.to_nat(width), q, start, id, w)

def tree_member_complete.base(+p: Model.Position, +start: U32, +width: U32, +id: U32,
  in_tree: Laws.TreeRange(0n, start, width, id),
  w: Logic.Truth(Kernel.fast_allowed(p, id)))
  -> Laws.Member(id, Kernel.legal_tree(0n, p, start, width)):
  match p:
    case Model.Pos{+board, +holes, +side, +rights, +ep, +epPawn, +quiet, +full}:
      match board:
        case []:
          +q = {Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full} : Model.Position}
          Laws.range_member_complete(U32.to_nat(width), q, start, id, in_tree, w)
        case h <> t:
          +q = {Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full} : Model.Position}
          Laws.range_member_complete(U32.to_nat(width), q, start, id, in_tree, w)

def tree_member_sound.empty(depth: Nat, +holes: U32, +side: Bool, +rights: U32,
  +ep: U32, +epPawn: U32, +quiet: Nat, +full: Nat, +start: U32, +width: U32, +id: U32,
  w: Laws.Member(id, Kernel.legal_tree(depth,
    Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, start, width)))
  -> Logic.Truth(Kernel.fast_allowed(Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, id)):
  match depth:
    case 0n:
      Laws.range_member_sound(U32.to_nat(width),
        Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, start, id, w)
    case 1n++rest:
      +half = U32.div(width, 2)
      or_case(Laws.Member(id, Kernel.legal_tree(rest,
          Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, start, half)),
        Laws.Member(id, Kernel.legal_tree(rest,
          Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full},
          U32.add(start, half), half)),
        Logic.Truth(Kernel.fast_allowed(Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, id)),
        append_member_split(id, Kernel.legal_tree(rest,
            Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, start, half),
          Kernel.legal_tree(rest,
            Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full},
            U32.add(start, half), half), w),
        left => tree_member_sound.empty(rest, holes, side, rights, ep, epPawn, quiet, full,
          start, half, id, left),
        right => tree_member_sound.empty(rest, holes, side, rights, ep, epPawn, quiet, full,
          U32.add(start, half), half, id, right))

def tree_member_sound.cons(depth: Nat, +h: U32, +t: List<&2, U32>, +holes: U32,
  +side: Bool, +rights: U32, +ep: U32, +epPawn: U32, +quiet: Nat, +full: Nat,
  +start: U32, +width: U32, +id: U32,
  w: Laws.Member(id, Kernel.legal_tree(depth,
    Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, start, width)))
  -> Logic.Truth(Kernel.fast_allowed(Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, id)):
  match depth:
    case 0n:
      Laws.range_member_sound(U32.to_nat(width),
        Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, start, id, w)
    case 1n++rest:
      +half = U32.div(width, 2)
      or_case(Laws.Member(id, Kernel.legal_tree(rest,
          Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, start, half)),
        Laws.Member(id, Kernel.legal_tree(rest,
          Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full},
          U32.add(start, half), half)),
        Logic.Truth(Kernel.fast_allowed(Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, id)),
        append_member_split(id, Kernel.legal_tree(rest,
            Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, start, half),
          Kernel.legal_tree(rest,
            Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full},
            U32.add(start, half), half), w),
        left => tree_member_sound.cons(rest, h, t, holes, side, rights, ep, epPawn, quiet, full,
          start, half, id, left),
        right => tree_member_sound.cons(rest, h, t, holes, side, rights, ep, epPawn, quiet, full,
          U32.add(start, half), half, id, right))

def tree_member_sound(depth: Nat, +p: Model.Position, +start: U32,
  +width: U32, +id: U32,
  w: Laws.Member(id, Kernel.legal_tree(depth, p, start, width)))
  -> Logic.Truth(Kernel.fast_allowed(p, id)):
  match p:
    case Model.Pos{+board, +holes, +side, +rights, +ep, +epPawn, +quiet, +full}:
      match board:
        case []:
          tree_member_sound.empty(depth, holes, side, rights, ep, epPawn, quiet, full,
            start, width, id, w)
        case h <> t:
          tree_member_sound.cons(depth, h, t, holes, side, rights, ep, epPawn, quiet, full,
            start, width, id, w)

def tree_member_complete.empty(depth: Nat, +holes: U32, +side: Bool, +rights: U32,
  +ep: U32, +epPawn: U32, +quiet: Nat, +full: Nat, +start: U32, +width: U32, +id: U32,
  in_tree: Laws.TreeRange(depth, start, width, id),
  w: Logic.Truth(Kernel.fast_allowed(Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, id)))
  -> Laws.Member(id, Kernel.legal_tree(depth,
    Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, start, width)):
  match depth in_tree:
    case 0n base:
      Laws.range_member_complete(U32.to_nat(width),
        Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, start, id, base, w)
    case 1n++rest Inl{left}:
      +half = U32.div(width, 2)
      append_member_left(id, Kernel.legal_tree(rest,
          Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, start, half),
        Kernel.legal_tree(rest,
          Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full},
          U32.add(start, half), half),
        tree_member_complete.empty(rest, holes, side, rights, ep, epPawn, quiet, full,
          start, half, id, left, w))
    case 1n++rest Inr{right}:
      +half = U32.div(width, 2)
      append_member_right(id, Kernel.legal_tree(rest,
          Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full}, start, half),
        Kernel.legal_tree(rest,
          Model.Pos{[], holes, side, rights, ep, epPawn, quiet, full},
          U32.add(start, half), half),
        tree_member_complete.empty(rest, holes, side, rights, ep, epPawn, quiet, full,
          U32.add(start, half), half, id, right, w))

def tree_member_complete.cons(depth: Nat, +h: U32, +t: List<&2, U32>, +holes: U32,
  +side: Bool, +rights: U32, +ep: U32, +epPawn: U32, +quiet: Nat, +full: Nat,
  +start: U32, +width: U32, +id: U32, in_tree: Laws.TreeRange(depth, start, width, id),
  w: Logic.Truth(Kernel.fast_allowed(Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, id)))
  -> Laws.Member(id, Kernel.legal_tree(depth,
    Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, start, width)):
  match depth in_tree:
    case 0n base:
      Laws.range_member_complete(U32.to_nat(width),
        Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, start, id, base, w)
    case 1n++rest Inl{left}:
      +half = U32.div(width, 2)
      append_member_left(id, Kernel.legal_tree(rest,
          Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, start, half),
        Kernel.legal_tree(rest,
          Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full},
          U32.add(start, half), half),
        tree_member_complete.cons(rest, h, t, holes, side, rights, ep, epPawn, quiet, full,
          start, half, id, left, w))
    case 1n++rest Inr{right}:
      +half = U32.div(width, 2)
      append_member_right(id, Kernel.legal_tree(rest,
          Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full}, start, half),
        Kernel.legal_tree(rest,
          Model.Pos{h <> t, holes, side, rights, ep, epPawn, quiet, full},
          U32.add(start, half), half),
        tree_member_complete.cons(rest, h, t, holes, side, rights, ep, epPawn, quiet, full,
          U32.add(start, half), half, id, right, w))

def tree_member_complete(depth: Nat, +p: Model.Position, +start: U32,
  +width: U32, +id: U32, in_tree: Laws.TreeRange(depth, start, width, id),
  w: Logic.Truth(Kernel.fast_allowed(p, id)))
  -> Laws.Member(id, Kernel.legal_tree(depth, p, start, width)):
  match p:
    case Model.Pos{+board, +holes, +side, +rights, +ep, +epPawn, +quiet, +full}:
      match board:
        case []:
          tree_member_complete.empty(depth, holes, side, rights, ep, epPawn, quiet, full,
            start, width, id, in_tree, w)
        case h <> t:
          tree_member_complete.cons(depth, h, t, holes, side, rights, ep, epPawn, quiet, full,
            start, width, id, in_tree, w)

def Laws.tree_member_sound(depth, p, start, width, id, w):
  tree_member_sound(depth, p, start, width, id, w)

def Laws.tree_member_complete(depth, p, start, width, id, in_tree, w):
  tree_member_complete(depth, p, start, width, id, in_tree, w)
