import Base
import ../Model.bend as P
import ./RuleKernel.bend as K
import ./Iteration.bend as I
import ./RangeBridgeLaws.bend as RB
import ./RangeBridgeProof.bend as RBP
import ./RangeCompositionLaws.bend as Laws

def append_if(b: Bool, +id: U32, +left: List<&2, U32>, +right: List<&2, U32>)
  -> {K.list_if(b, id, List.append(&2, U32, left, right)) == List.append(&2, U32, K.list_if(b, id, left), right) : List<&2, U32>}:
  match b:
    case False{}: {==}
    case True{}: {==}
def Laws.range_composes(left, right, p, start):
  match left:
    case 0n: {==}
    case 1n++rest:
      Equal.trans(List<&2, U32>,
        K.list_if(K.fast_allowed(p, start), start, K.legal_range(Nat.add(rest, right), p, U32.add(start, 1))),
        K.list_if(K.fast_allowed(p, start), start, List.append(&2, U32, K.legal_range(rest, p, U32.add(start, 1)), K.legal_range(right, p, I.advance(rest, U32.add(start, 1))))),
        List.append(&2, U32, K.legal_range(1n+rest, p, start), K.legal_range(right, p, I.advance(1n+rest, start))),
        Equal.cong(List<&2, U32>, List<&2, U32>, xs => K.list_if(K.fast_allowed(p, start), start, xs),
          K.legal_range(Nat.add(rest, right), p, U32.add(start, 1)),
          List.append(&2, U32, K.legal_range(rest, p, U32.add(start, 1)), K.legal_range(right, p, I.advance(rest, U32.add(start, 1)))),
          Laws.range_composes(rest, right, p, U32.add(start, 1))),
        append_if(K.fast_allowed(p, start), start, K.legal_range(rest, p, U32.add(start, 1)), K.legal_range(right, p, I.advance(rest, U32.add(start, 1)))))

def append_equal(+a: List<&2, U32>, +b: List<&2, U32>, +c: List<&2, U32>, +d: List<&2, U32>, ab: {a == b : List<&2, U32>}, cd: {c == d : List<&2, U32>})
  -> {List.append(&2, U32, a, c) == List.append(&2, U32, b, d) : List<&2, U32>}:
  Equal.trans(List<&2, U32>, List.append(&2, U32, a, c), List.append(&2, U32, b, c), List.append(&2, U32, b, d),
    Equal.cong(List<&2, U32>, List<&2, U32>, xs => List.append(&2, U32, xs, c), a, b, ab),
    Equal.cong(List<&2, U32>, List<&2, U32>, xs => List.append(&2, U32, b, xs), c, d, cd))

def halves_to_whole(+p: P.Position, +start: U32, +width: U32,
  size: {Nat.is_eq(U32.to_nat(width), Nat.add(U32.to_nat(U32.div(width, 2)), U32.to_nat(U32.div(width, 2)))) == True{} : Bool},
  mid: {I.advance(U32.to_nat(U32.div(width, 2)), start) == U32.add(start, U32.div(width, 2)) : U32})
  -> {List.append(&2, U32, K.legal_range(U32.to_nat(U32.div(width, 2)), p, start), K.legal_range(U32.to_nat(U32.div(width, 2)), p, U32.add(start, U32.div(width, 2)))) == K.legal_range(U32.to_nat(width), p, start) : List<&2, U32>}:
  +half = U32.div(width, 2)
  +n = U32.to_nat(half)
  Equal.trans(List<&2, U32>,
    List.append(&2, U32, K.legal_range(n, p, start), K.legal_range(n, p, U32.add(start, half))),
    List.append(&2, U32, K.legal_range(n, p, start), K.legal_range(n, p, I.advance(n, start))),
    K.legal_range(U32.to_nat(width), p, start),
    Equal.cong(U32, List<&2, U32>, s => List.append(&2, U32, K.legal_range(n, p, start), K.legal_range(n, p, s)),
      U32.add(start, half), I.advance(n, start), Equal.sym(U32, I.advance(n, start), U32.add(start, half), mid)),
    Equal.trans(List<&2, U32>, List.append(&2, U32, K.legal_range(n, p, start), K.legal_range(n, p, I.advance(n, start))),
      K.legal_range(Nat.add(n, n), p, start), K.legal_range(U32.to_nat(width), p, start),
      Equal.sym(List<&2, U32>, K.legal_range(Nat.add(n, n), p, start), List.append(&2, U32, K.legal_range(n, p, start), K.legal_range(n, p, I.advance(n, start))), Laws.range_composes(n, n, p, start)),
      Equal.cong(Nat, List<&2, U32>, count => K.legal_range(count, p, start), Nat.add(n, n), U32.to_nat(width),
        Equal.sym(Nat, U32.to_nat(width), Nat.add(n, n), RBP.nat_equality(U32.to_nat(width), Nat.add(n, n), size)))))

def body_flat(depth: Nat, +board: List<&2, U32>, +holes: U32, +side: Bool, +rights: U32, +ep: U32, +epPawn: U32, +quiet: Nat, +full: Nat,
  +start: U32, +width: U32, plan: RB.Plan(depth, start, width))
  -> {K.legal_tree.body(depth, board, holes, side, rights, ep, epPawn, quiet, full, start, width) == K.legal_range(U32.to_nat(width), P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}, start) : List<&2, U32>}:
  match depth:
    case 0n: {==}
    case 1n++rest:
      match plan:
        case Tuple{size, Tuple{mid, Tuple{left, right}}}:
          +p = {P.Pos{board, holes, side, rights, ep, epPawn, quiet, full} : P.Position}
          +half = U32.div(width, 2)
          Equal.trans(List<&2, U32>,
            List.append(&2, U32, K.legal_tree.body(rest, board, holes, side, rights, ep, epPawn, quiet, full, start, half), K.legal_tree.body(rest, board, holes, side, rights, ep, epPawn, quiet, full, U32.add(start, half), half)),
            List.append(&2, U32, K.legal_range(U32.to_nat(half), p, start), K.legal_range(U32.to_nat(half), p, U32.add(start, half))),
            K.legal_range(U32.to_nat(width), p, start),
            append_equal(K.legal_tree.body(rest, board, holes, side, rights, ep, epPawn, quiet, full, start, half), K.legal_range(U32.to_nat(half), p, start),
              K.legal_tree.body(rest, board, holes, side, rights, ep, epPawn, quiet, full, U32.add(start, half), half), K.legal_range(U32.to_nat(half), p, U32.add(start, half)),
              body_flat(rest, board, holes, side, rights, ep, epPawn, quiet, full, start, half, left),
              body_flat(rest, board, holes, side, rights, ep, epPawn, quiet, full, U32.add(start, half), half, right)),
            halves_to_whole(p, start, width, size, mid))
def Laws.planned_tree_flat(depth, p, start, width, plan):
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      match board:
        case []: body_flat(depth, [], holes, side, rights, ep, epPawn, quiet, full, start, width, plan)
        case h <> t: body_flat(depth, h <> t, holes, side, rights, ep, epPawn, quiet, full, start, width, plan)
