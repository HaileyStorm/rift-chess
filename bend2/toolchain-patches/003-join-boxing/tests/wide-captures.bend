# Two 128-word values survive a non-tail cut and a two-child fork. The
# continuation would otherwise need 257 and 258 words, respectively.
import Base

type R0 is Data:
  R0{a: U32, b: U32, c: U32, d: U32, e: U32, f: U32, g: U32, h: U32}

type R1 is Data:
  R1{a: R0, b: R0, c: R0, d: R0, e: R0, f: R0, g: R0, h: R0}

type R2 is Data:
  R2{a: R1, b: R1}

def r0(+x: U32) -> R0:
  R0{x, x, x, x, x, x, x, x}

def r1(+x: U32) -> R1:
  R1{r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), r0(x)}

def r2(+x: U32) -> R2:
  R2{r1(x), r1(x)}

def first0(x: R0) -> U32:
  match x:
    case R0{a, b, c, d, e, f, g, h}:
      a

def first1(x: R1) -> U32:
  match x:
    case R1{a, b, c, d, e, f, g, h}:
      first0(a)

def first2(x: R2) -> U32:
  match x:
    case R2{a, b}:
      first1(a)

def leaf(x: U32) -> U32:
  U32.add(x, 1)

def bump(+x: U32) -> U32:
  a b = leaf(x) leaf(x)
  U32.add(a, b)

def across_cut(a: R2, b: R2) -> U32:
  z = bump(3)
  U32.add(z, U32.add(first2(a), first2(b)))

def across_fork(a: R2, b: R2) -> U32:
  x y = bump(4) bump(5)
  U32.add(U32.add(x, y), U32.add(first2(a), first2(b)))

def main() -> IO(Unit):
  IO.print(String.append(Nat.show(U32.to_nat(U32.add(
    across_cut(r2(1), r2(2)), across_fork(r2(1), r2(2))))), "n"))

#|36n
