# DRAFT exclusively owned Morton-order U32 buffers for preparation kernels.
# Coordinates are 0..size-1, size=2^depth,depth<=12. Array indices wrap upstream;
# index() interleaves at most 12 valid bits and never reaches outside allocation.
# Morton ordering allows zero-copy array partitioning during Image conversion.
import Base
import ../ImageOps.bend as Ops

# Spread the low sixteen bits into even positions; callers use at most twelve.
def spread(value: U32) -> U32:
  +a = U32.and(value,65535)
  +b = U32.and(U32.or(a,U32.shln(a,8n)),16711935)
  +c = U32.and(U32.or(b,U32.shln(b,4n)),252645135)
  +d = U32.and(U32.or(c,U32.shln(c,2n)),858993459)
  U32.and(U32.or(d,U32.shln(d,1n)),1431655765)

# Morton index: x in even bits, y in odd bits, quadrants TL/TR/BL/BR.
def index(x: U32,y: U32) -> U32:
  U32.or(spread(x),U32.shln(spread(y),1n))

# Expand immutable uniform pixels into an owned array of exactly 4^depth words.
def from_image(+depth: Nat,image: Image) -> Array<U32>:
  match depth image:
    case _ Pix{pixel}: Array.new(U32,Nat.add(depth,depth),pixel)
    case 0n Qua{a,b,c,d}: Array.new(U32,0n,0)
    case 1n+rest Qua{a,b,c,d}:
      aa = from_image(rest,a)
      bb = from_image(rest,b)
      cc = from_image(rest,c)
      dd = from_image(rest,d)
      ANode{ANode{aa,bb},ANode{cc,dd}}

# Consume the owner while freezing into an immutable compact Image.
# Malformed depth/storage pairs are outside the public domain.
def image(+depth: Nat,buffer: Array<U32>) -> Image:
  match depth buffer:
    case 0n ALeaf{pixel}: Pix{pixel}
    case 1n+rest ANode{ANode{a,b},ANode{c,d}}:
      aa = image(rest,a)
      bb = image(rest,b)
      cc = image(rest,c)
      dd = image(rest,d)
      Ops.quad(aa,bb,cc,dd)
    case _ _: Pix{0}
