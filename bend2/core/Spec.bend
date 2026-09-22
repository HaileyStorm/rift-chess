import Base
import ./Model.bend as M
import ./Geometry.bend as G
import ./Transitions.bend as T
import ./Enumeration.bend as E

# The public specification guard composes structural validity, transition
# admissibility, successor validity, and postcondition evidence. The transition
# module owns ordinary/Shift effects; this file owns the stable action list.

def valid(p: M.Position) -> Bool:
  G.valid(p)

def in_check(p: M.Position, side: Bool) -> Bool:
  G.in_check(p, side)

def attacked(p: M.Position, target: U32, side: Bool) -> Bool:
  G.attacked(p, target, side)

def candidate(+p: M.Position, id: U32) -> M.Position:
  T.candidate(p, id)

def eligible(+p: M.Position, +id: U32) -> Bool:
  T.eligible(p, id)

def post(+p: M.Position, +id: U32, +next: M.Position) -> Bool:
  T.post(p, id, next)

def authorized(+p: M.Position, +id: U32) -> Bool:
  +next = candidate(p, id)
  Bool.and(valid(p),
    Bool.and(eligible(p, id),
      Bool.and(valid(next), post(p, id, next))))

def step.decide(+p: M.Position, id: U32, allowed: Bool) -> M.Position:
  match allowed:
    case True{}:
      candidate(p, id)
    case False{}:
      p

def step(+p: M.Position, +id: U32) -> M.Position:
  step.decide(p, id, authorized(p, id))

def legal_range.head(xs: List<&2, U32>, +p: M.Position) -> Bool:
  match xs:
    case Nil{}:
      False{}
    case +h <> +t:
      eligible(p, h)

def legal_range.go(xs: List<&2, U32>, +p: M.Position,
  +acc: List<&2, U32>, eligible_ok: Bool) -> List<&2, U32>:
  match xs:
    case Nil{}:
      List.reverse(&2, U32, acc)
    case +h <> +t:
      match eligible_ok:
        case False{}:
          legal_range.go(t, p, acc, legal_range.head(t, p))
        case True{}:
          +authorized_ok = authorized(p, h)
          legal_range.go(t, p,
            Bool.pick(List<&2, U32>, authorized_ok, h <> acc, acc),
            legal_range.head(t, p))

def legal_range.body(n: Nat, +start: U32, +p: M.Position) -> List<&2, U32>:
  +ids = E.range(n, start, p)
  legal_range.go(ids, p, Nil{}, legal_range.head(ids, p))

def legal_range(n: Nat, +start: U32, +p: M.Position) -> List<&2, U32>:
  match p:
    case M.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      legal_range.body(n, start, M.Pos{board, holes, side, rights, ep, epPawn, quiet, full})

def legal_ids(+p: M.Position) -> List<&2, U32>:
  +a = legal_range(5440n, 0, p)
  +b = legal_range(5440n, 5440, p)
  +c = legal_range(5440n, 10880, p)
  +d = legal_range(5440n, 16320, p)
  List.append(&2, U32, a, List.append(&2, U32, b,
    List.append(&2, U32, c, d)))
