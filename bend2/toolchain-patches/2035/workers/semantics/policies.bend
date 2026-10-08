import Base
import ../fixture-tree.bend as Trees

def snapshot(t: Trees.Tree) -> Nat:
  Trees.sum@2(t)

def float_value(n: F32) -> F32:
  n

def float_remote(n: F32) -> F32:
  float_value@(n)

def text_value(s: String) -> String:
  s

def text_remote(s: String) -> String:
  text_value@(s)

def leaf(n: U32) -> U32:
  U32.add(n, 1)

def pair(+a: U32, +b: U32) -> U32:
  left right = leaf(a) leaf(b)
  U32.add(U32.mul(left, 10), right)

def quad_body(+a: U32, +b: U32, +c: U32, +d: U32) -> U32:
  left right = pair(a, b) pair(c, d)
  U32.add(U32.mul(left, 100), right)

def quad4(a: U32, b: U32, c: U32, d: U32) -> U32:
  quad_body@4(a, b, c, d)

def capped_body(+a: U32, +b: U32, +c: U32, +d: U32) -> U32:
  left right = pair@8(a, b) pair@8(c, d)
  U32.add(U32.mul(left, 100), right)

def nested_caps(a: U32, b: U32, c: U32, d: U32) -> U32:
  capped_body@2(a, b, c, d)

def plain(n: U32) -> U32:
  leaf(n)

def never_body(n: U32) -> U32:
  leaf~(n)

def never_root(n: U32) -> U32:
  never_body~(n)

def restored(n: U32) -> U32:
  +left = leaf~(n)
  leaf@(left)

def argument_scope(n: U32) -> U32:
  never_body~(leaf@(n))

def both_required(n: U32) -> U32:
  leaf@(leaf@(n))

def remote_island(n: U32) -> U32:
  never_body@(n)

def required_body(n: U32) -> U32:
  leaf@1(n)

def nested_require(n: U32) -> U32:
  required_body@(n)

def conflict_body(n: U32) -> U32:
  leaf@(n)

def conflict(n: U32) -> U32:
  conflict_body~(n)

def conflict_remote(n: U32) -> U32:
  conflict@(n)

def conditional_body(on: Bool, n: U32) -> U32:
  match on:
    case True{}: leaf@(n)
    case False{}: n

def conditional_never(on: Bool, n: U32) -> U32:
  conditional_body~(on, n)

type ResumePair is Data:
  ResumePair{left: U32, right: U32}

def resume_fields(+n: U32) -> ResumePair:
  ResumePair{leaf@(n), U32.add(40, leaf@(U32.add(n, 2)))}

def resume_match_body(value: ResumePair) -> U32:
  ResumePair{left, right} = value
  U32.add(U32.mul(left, 100), right)

def resume_match(n: U32) -> U32:
  resume_match_body(resume_fields(n))

def resume_capture(n: U32) -> U32 -> U32:
  x => U32.add(n, x)

def resume_closure(+n: U32) -> U32:
  f = resume_capture(n)
  +first = leaf@(U32.add(n, 2))
  f(U32.add(first, leaf@(n)))

def resume_tail(n: Nat, value: U32) -> U32:
  match n:
    case 0n: leaf@(value)
    case 1n+rest: resume_tail(rest, U32.add(value, 1))

def resume_non_tail(n: Nat, +seed: U32) -> U32:
  match n:
    case 0n: seed
    case 1n+rest:
      U32.add(leaf@(seed), resume_non_tail(rest, seed))

def resume_drop(-ghost: U32, value: U32) -> U32:
  value

def resume_erased(n: U32) -> U32:
  resume_drop(leaf@(n), 7)

def tree_value(t: Trees.Tree) -> Trees.Tree:
  t

def tree_remote(t: Trees.Tree) -> Trees.Tree:
  tree_value@(t)
