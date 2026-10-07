import Base

def leaf(n: U32) -> U32:
  U32.add(n, 1)

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
