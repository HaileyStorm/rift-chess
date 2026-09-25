# DRAFT prepare-once red-alpha mask arithmetic. Other packed channels ignored.
# Union is probabilistic coverage a+b-a*b, NOT geometric sample-set union.
# Geometric stroke joins instead OR their quarter samples in Stroke.bend.
import Base
import ./Color.bend as Color
import ./ImageOps.bend as Ops

type Operation is Data:
  Product{}
  Union{}
  Subtract{}
  Minimum{}
  Maximum{}

def product(a: U32,b: U32) -> U32:
  U32.div(U32.add(U32.mul(a,b),127),255)

def alpha(operation: Operation,+a: U32,+b: U32) -> U32:
  match operation:
    case Product{}: product(a,b)
    case Union{}: U32.sub(U32.add(a,b),product(a,b))
    case Subtract{}: product(a,U32.sub(255,b))
    case Minimum{}: U32.min(a,b)
    case Maximum{}: U32.max(a,b)

def pixel(operation: Operation,a: U32,b: U32) -> U32:
  U32.shln(alpha(operation,Color.red(a),Color.red(b)),16n)

def combine(+depth: Nat,+operation: Operation,+a: Image,+b: Image) -> Image:
  match depth a b:
    case _ Pix{aa} Pix{bb}: Pix{pixel(operation,aa,bb)}
    case 0n _ _: Pix{0}
    case 1n+rest _ _:
      tl = combine(rest,operation,Ops.tl(a),Ops.tl(b))
      tr = combine(rest,operation,Ops.tr(a),Ops.tr(b))
      bl = combine(rest,operation,Ops.bl(a),Ops.bl(b))
      br = combine(rest,operation,Ops.br(a),Ops.br(b))
      Ops.quad(tl,tr,bl,br)
