import Base

def target(x: U32) -> U32:
  x

def leaf_a(+x: U32) -> U32:
  target@(x)

def leaf_b(+x: U32) -> U32:
  target@(x)

def d00a(+x: U32) -> U32:
  a b = leaf_a(x) leaf_b(x)
  (a + b : U32)

def d00b(+x: U32) -> U32:
  a b = leaf_a(x) leaf_b(x)
  (a + b : U32)

def d01a(+x: U32) -> U32:
  a b = d00a(x) d00b(x)
  (a + b : U32)

def d01b(+x: U32) -> U32:
  a b = d00a(x) d00b(x)
  (a + b : U32)

def d02a(+x: U32) -> U32:
  a b = d01a(x) d01b(x)
  (a + b : U32)

def d02b(+x: U32) -> U32:
  a b = d01a(x) d01b(x)
  (a + b : U32)

def d03a(+x: U32) -> U32:
  a b = d02a(x) d02b(x)
  (a + b : U32)

def d03b(+x: U32) -> U32:
  a b = d02a(x) d02b(x)
  (a + b : U32)

def d04a(+x: U32) -> U32:
  a b = d03a(x) d03b(x)
  (a + b : U32)

def d04b(+x: U32) -> U32:
  a b = d03a(x) d03b(x)
  (a + b : U32)

def d05a(+x: U32) -> U32:
  a b = d04a(x) d04b(x)
  (a + b : U32)

def d05b(+x: U32) -> U32:
  a b = d04a(x) d04b(x)
  (a + b : U32)

def d06a(+x: U32) -> U32:
  a b = d05a(x) d05b(x)
  (a + b : U32)

def d06b(+x: U32) -> U32:
  a b = d05a(x) d05b(x)
  (a + b : U32)

def d07a(+x: U32) -> U32:
  a b = d06a(x) d06b(x)
  (a + b : U32)

def d07b(+x: U32) -> U32:
  a b = d06a(x) d06b(x)
  (a + b : U32)

def d08a(+x: U32) -> U32:
  a b = d07a(x) d07b(x)
  (a + b : U32)

def d08b(+x: U32) -> U32:
  a b = d07a(x) d07b(x)
  (a + b : U32)

def d09a(+x: U32) -> U32:
  a b = d08a(x) d08b(x)
  (a + b : U32)

def d09b(+x: U32) -> U32:
  a b = d08a(x) d08b(x)
  (a + b : U32)

def d10a(+x: U32) -> U32:
  a b = d09a(x) d09b(x)
  (a + b : U32)

def d10b(+x: U32) -> U32:
  a b = d09a(x) d09b(x)
  (a + b : U32)

def d11a(+x: U32) -> U32:
  a b = d10a(x) d10b(x)
  (a + b : U32)

def d11b(+x: U32) -> U32:
  a b = d10a(x) d10b(x)
  (a + b : U32)

def top(x: U32) -> U32:
  d11a(x)
