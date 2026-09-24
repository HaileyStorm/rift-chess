# Flat captures plus a one-word cut result occupy exactly 255 or 256 words.
import Base

type R0 is Data:
  R0{a: U32, b: U32, c: U32, d: U32, e: U32, f: U32, g: U32, h: U32}

type R1 is Data:
  R1{a: R0, b: R0, c: R0, d: R0, e: R0, f: R0, g: R0, h: R0}

type R63 is Data:
  R63{a: R0, b: R0, c: R0, d: R0, e: R0, f: R0, g: R0, h: U32, i: U32, j: U32, k: U32, l: U32, m: U32, n: U32}

type R127 is Data:
  R127{a: R1, b: R63}

type R128 is Data:
  R128{a: R1, b: R1}

def r0(+x: U32) -> R0:
  R0{x, x, x, x, x, x, x, x}

def r1(+x: U32) -> R1:
  R1{r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), r0(x)}

def r63(+x: U32) -> R63:
  R63{r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), r0(x), x, x, x, x, x, x, x}

def r127(+x: U32) -> R127:
  R127{r1(x), r63(x)}

def r128(+x: U32) -> R128:
  R128{r1(x), r1(x)}

def first0(x: R0) -> U32:
  match x:
    case R0{a, b, c, d, e, f, g, h}:
      a

def first1(x: R1) -> U32:
  match x:
    case R1{a, b, c, d, e, f, g, h}:
      first0(a)

def first127(x: R127) -> U32:
  match x:
    case R127{a, b}:
      first1(a)

def first128(x: R128) -> U32:
  match x:
    case R128{a, b}:
      first1(a)

def leaf(x: U32) -> U32:
  U32.add(x, 1)

def bump(+x: U32) -> U32:
  a b = leaf(x) leaf(x)
  U32.add(a, b)

def at255(a: R127, b: R127) -> U32:
  z = bump(1)
  U32.add(z, U32.add(first127(a), first127(b)))

def at256(a: R127, b: R128) -> U32:
  z = bump(1)
  U32.add(z, U32.add(first127(a), first128(b)))

def main() -> IO(Unit):
  IO.print(String.append(Nat.show(U32.to_nat(U32.add(
    at255(r127(1), r127(2)), at256(r127(3), r128(4))))), "n"))

#|18n
