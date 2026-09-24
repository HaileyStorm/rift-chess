# Three raw 128-word results in one parallel join remain outside this patch.
# Rejection is intentional until result-delivery ABI boxing is reviewed.
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

def id2(x: R2) -> R2:
  x

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

def three() -> U32:
  a b c = id2(r2(1)) id2(r2(2)) id2(r2(3))
  U32.add(U32.add(first2(a), first2(b)), first2(c))

def main() -> IO(Unit):
  IO.print(String.append(Nat.show(U32.to_nat(three())), "n"))

#|6n
