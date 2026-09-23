# Proposed independent v2 evaluator. V1 remains an immutable comparison target.
import Base
import ../Model.bend as M
import ./RuleContracts.bend as R

type StepResult is Data:
  Accepted{id: U32, next: M.Position}
  Rejected{old: M.Position}

def proposed(p: M.Position, id: U32) -> M.Position:
  R.expected(p, id)

def decide(ok: Bool, +p: M.Position, +id: U32) -> StepResult:
  match ok:
    case False{}: Rejected{p}
    case True{}: Accepted{id, proposed(p, id)}

def allowed(+p: M.Position, +id: U32) -> Bool:
  R.contract(p, id, proposed(p, id))

def step(+p: M.Position, +id: U32) -> StepResult:
  decide(allowed(p, id), p, id)

def position(result: StepResult) -> M.Position:
  match result:
    case Accepted{id, q}: q
    case Rejected{p}: p

def accepted(result: StepResult) -> Bool:
  match result:
    case Accepted{id, q}: True{}
    case Rejected{p}: False{}

def replay(ids: List<&2, U32>, p: M.Position) -> M.Position:
  match ids:
    case []: p
    case id <> rest: replay(rest, position(step(p, id)))

# Exhaustive canonical enumeration, deliberately independent of v1's pruning.
def list_if(ok: Bool, id: U32, rest: List<&2, U32>) -> List<&2, U32>:
  match ok:
    case False{}: rest
    case True{}: id <> rest

def input_intent_decoded(p: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: R.intent(p, a)
def input_intent(+p: M.Position, id: U32) -> Bool:
  input_intent_decoded(p, M.decode(id))
def fast_decide(ok: Bool, p: M.Position, id: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}: allowed(p, id)
def fast_allowed(+p: M.Position, +id: U32) -> Bool:
  fast_decide(input_intent(p, id), p, id)

def legal_range(n: Nat, +p: M.Position, +id: U32) -> List<&2, U32>:
  match n:
    case 0n: []
    case 1n+rest: list_if(fast_allowed(p, id), id, legal_range(rest, p, U32.add(id, 1)))

# A fixed balanced tree caps non-tail leaf recursion at 680, including Chrome.
# Depth/width are implementation constants, never host-controlled tuning.  The
# public wrapper destructures the position and board before the depth match;
# this preserves the exact runtime tree while stopping proof normalization from
# unfolding all leaves for an abstract position.
def legal_tree.body(+depth: Nat, +board: List<&2, U32>, +holes: U32, +side: Bool,
  +rights: U32, +ep: U32, +epPawn: U32, +quiet: Nat, +full: Nat,
  +start: U32, +width: U32) -> List<&2, U32>:
  match depth:
    case 0n:
      +p = {M.Pos{board, holes, side, rights, ep, epPawn, quiet, full} : M.Position}
      legal_range(U32.to_nat(width), p, start)
    case 1n++rest:
      +half = U32.div(width, 2)
      a b = legal_tree.body(rest, board, holes, side, rights, ep, epPawn, quiet, full, start, half)
        legal_tree.body(rest, board, holes, side, rights, ep, epPawn, quiet, full,
          U32.add(start, half), half)
      List.append(&2, U32, a, b)

def legal_tree(depth: Nat, +p: M.Position, +start: U32, +width: U32) -> List<&2, U32>:
  match p:
    case M.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      match board:
        case []:
          legal_tree.body(depth, [], holes, side, rights, ep, epPawn, quiet, full, start, width)
        case h <> t:
          legal_tree.body(depth, h <> t, holes, side, rights, ep, epPawn, quiet, full, start, width)

def legal_ids(p: M.Position) -> List<&2, U32>:
  legal_tree(5n, p, 0, 21760)
