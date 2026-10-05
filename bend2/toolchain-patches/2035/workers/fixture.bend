import Base
import ./fixture-tree.bend as Trees

def choose(t: Trees.Tree) -> Nat:
  Nat.add(Trees.sum@2(t), 1n)

def serial(t: Trees.Tree) -> Nat:
  Trees.sum~(t)

def echo(t: Trees.Tree) -> Trees.Tree:
  t

def maximum(n: Nat) -> Nat:
  n

def identity(n: Nat) -> Nat:
  n

def apply(f: Nat -> Nat, n: Nat) -> Nat:
  f(n)

def closure(t: Trees.Tree) -> Nat:
  +n = Trees.sum@2(t)
  apply(x => identity(x), n)

def array_echo(xs: Array<Nat>) -> Array<Nat>:
  xs

def array_required(xs: Array<Nat>, t: Trees.Tree) -> Array<Nat>:
  +n = Trees.sum@(t)
  Array.set(Nat, xs, 0, n)

def array_never(xs: Array<Nat>, t: Trees.Tree) -> Array<Nat>:
  +n = Trees.sum~(t)
  Array.set(Nat, xs, 0, n)

def primitive(a: Nat, b: Nat) -> Nat:
  Nat.add@(a, b)

def lifted(n: Nat) -> Nat -> Nat:
  x => Nat.add(n, x)

def burn(n: Nat, +value: U32) -> U32:
  match n:
    case 0n: value
    case 1n+rest:
      burn(rest, U32.add(U32.mul(value, 1664525), 1013904223))

def delayed(n: Nat) -> U32:
  burn@(n, 0)
