# DRAFT prepare-once RGB transforms in encoded-channel space, not linear light.
# These transform color only; an associated alpha mask stays separate/unmodified.
import Base
import ./Color.bend as Color
import ./ImageOps.bend as Ops

type Effect is Data:
  Tint{rgb: U32}
  Grayscale{}
  Duotone{low: U32,high: U32}
  Invert{}

def multiply(a: U32,b: U32) -> U32:
  U32.div(U32.add(U32.mul(a,b),127),255)

def gray(+color: U32) -> U32:
  U32.div(U32.add(U32.add(U32.mul(Color.red(color),77),U32.mul(Color.green(color),150)),
    U32.add(U32.mul(Color.blue(color),29),128)),256)

def pixel(effect: Effect,+color: U32) -> U32:
  match effect:
    case Tint{+rgb}: Color.rgb(multiply(Color.red(color),Color.red(rgb)),
      multiply(Color.green(color),Color.green(rgb)),multiply(Color.blue(color),Color.blue(rgb)))
    case Grayscale{}:
      +v = gray(color)
      Color.rgb(v,v,v)
    case Duotone{low,high}: Color.over(high,low,gray(color))
    case Invert{}: U32.xor(U32.and(color,16777215),16777215)

def map(+depth: Nat,+effect: Effect,image: Image) -> Image:
  match depth image:
    case _ Pix{color}: Pix{pixel(effect,color)}
    case 0n Qua{a,b,c,d}: Qua{a,b,c,d}
    case 1n+rest Qua{tl,tr,bl,br}:
      a = map(rest,effect,tl)
      b = map(rest,effect,tr)
      c = map(rest,effect,bl)
      d = map(rest,effect,br)
      Ops.quad(a,b,c,d)
