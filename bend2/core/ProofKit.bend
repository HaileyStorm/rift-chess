# Small constructive logic kit. No promises, foreign definitions or unchecked
# recursion. Truth reflects a runtime Boolean into a proposition.
import Base

def Truth(b: Bool) -> Data:
  match b:
    case True{}: Unit
    case False{}: Empty

def sym(-A: Type, -a: A, -b: A, e: {a == b : A}) -> {b == a : A}:
  %e : {_ == a : A}
  {==}

def bool_case(+b: Bool, -P: Bool -> Type,
  yes: {True{} == b : Bool} -> P(True{}),
  no: {False{} == b : Bool} -> P(False{})) -> P(b):
  match b:
    case True{}: yes({==})
    case False{}: no({==})

def and_left(+a: Bool, -b: Bool, w: Truth(a && b)) -> Truth(a):
  match a:
    case True{}: Unit{}
    case False{}: w

def and_right(+a: Bool, -b: Bool, w: Truth(a && b)) -> Truth(b):
  match a:
    case True{}: w
    case False{}: Empty.absurd(Truth(b), w)

def and_intro(+a: Bool, -b: Bool, wa: Truth(a), wb: Truth(b)) -> Truth(a && b):
  match a:
    case True{}: wb
    case False{}: Empty.absurd(Truth(False{} && b), wa)

def truth_eq(+b: Bool, w: Truth(b)) -> {b == True{} : Bool}:
  match b:
    case True{}: {==}
    case False{}: Empty.absurd({False{} == True{} : Bool}, w)

def truth_of_eq(+b: Bool, e: {True{} == b : Bool}) -> Truth(b):
  %e : Truth(_)
  Unit{}

def append(-A: Data, xs: List<&2, A>, ys: List<&2, A>) -> List<&2, A>:
  match xs:
    case []: ys
    case h <> t: h <> append(A, t, ys)
