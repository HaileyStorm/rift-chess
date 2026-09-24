# A live reusable 128-word capture contains an owned String box. Each value
# reaches a fork child and survives into the continuation for a second use.
import Base

type R0 is Data:
  R0{a: U32, b: U32, c: U32, d: U32, e: U32, f: U32, g: U32, h: U32}

type R1 is Data:
  R1{a: R0, b: R0, c: R0, d: R0, e: R0, f: R0, g: R0, h: R0}

type R63 is Data:
  R63{a: R0, b: R0, c: R0, d: R0, e: R0, f: R0, g: R0, h: U32, i: U32, j: U32, k: U32, l: U32, m: U32, n: U32}

type R128 is Data:
  R128{a: R1, b: R63, c: String}

def r0(+x: U32) -> R0:
  R0{x, x, x, x, x, x, x, x}

def r1(+x: U32) -> R1:
  R1{r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), r0(x)}

def r63(+x: U32) -> R63:
  R63{r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), x, x, x, x, x, x, x}

def r128(+x: U32) -> R128:
  R128{r1(x), r63(x), "owned"}

def first0(x: R0) -> U32:
  match x:
    case R0{a, b, c, d, e, f, g, h}:
      a

def first1(x: R1) -> U32:
  match x:
    case R1{a, b, c, d, e, f, g, h}:
      first0(a)

def peek(x: R128) -> U32:
  match x:
    case R128{a, b, c}:
      first1(a)

def shared(+a: R128, +b: R128) -> U32:
  x y = peek(a) peek(b)
  U32.add(U32.add(x, y), U32.add(peek(a), peek(b)))

def main() -> IO(Unit):
  IO.print(String.append(Nat.show(U32.to_nat(shared(r128(1), r128(2)))), "n"))

#|6n
