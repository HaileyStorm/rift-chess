# DRAFT generic finite-F32 affine transforms, independent of camera/UI policy.
# Matrix maps (x,y) -> (a*x+c*y+tx, b*x+d*y+ty). Composition applies inner first.
import Base
import ../Quad.bend as Quad

type Matrix is Data:
  Matrix{a: F32,b: F32,c: F32,d: F32,tx: F32,ty: F32}

def identity() -> Matrix:
  Matrix{1.0,0.0,0.0,1.0,0.0,0.0}

def translate(x: F32,y: F32) -> Matrix:
  Matrix{1.0,0.0,0.0,1.0,x,y}

def scale(x: F32,y: F32) -> Matrix:
  Matrix{x,0.0,0.0,y,0.0,0.0}

def rotate(+radians: F32) -> Matrix:
  +c = F32.cos(radians)
  +s = F32.sin(radians)
  Matrix{c,s,F32.neg(s),c,0.0,0.0}

def point(matrix: Matrix,point: Quad.Point) -> Quad.Point:
  match matrix point:
    case Matrix{a,b,c,d,tx,ty} Quad.Point{+x,+y}:
      Quad.Point{F32.add(F32.add(F32.mul(a,x),F32.mul(c,y)),tx),
        F32.add(F32.add(F32.mul(b,x),F32.mul(d,y)),ty)}

def compose(outer: Matrix,inner: Matrix) -> Matrix:
  match outer inner:
    case Matrix{+a,+b,+c,+d,tx,ty} Matrix{+e,+f,+g,+h,+ux,+uy}:
      Matrix{F32.add(F32.mul(a,e),F32.mul(c,f)),F32.add(F32.mul(b,e),F32.mul(d,f)),
        F32.add(F32.mul(a,g),F32.mul(c,h)),F32.add(F32.mul(b,g),F32.mul(d,h)),
        F32.add(F32.add(F32.mul(a,ux),F32.mul(c,uy)),tx),
        F32.add(F32.add(F32.mul(b,ux),F32.mul(d,uy)),ty)}

# Singular/near-singular transforms are explicitly rejected before division.
# The epsilon is an input, not a universal numerical-accuracy promise.
def inverse_case(valid: Bool,matrix: Matrix,det: F32) -> Maybe<&2,Matrix>:
  match valid matrix:
    case False{} _: None{}
    case True{} Matrix{a,b,c,d,+tx,+ty}:
      +inv = F32.div(1.0,det)
      +ia = F32.mul(d,inv)
      +ib = F32.neg(F32.mul(b,inv))
      +ic = F32.neg(F32.mul(c,inv))
      +id = F32.mul(a,inv)
      Some{Matrix{ia,ib,ic,id,F32.neg(F32.add(F32.mul(ia,tx),F32.mul(ic,ty))),
        F32.neg(F32.add(F32.mul(ib,tx),F32.mul(id,ty)))}}

def inverse(+matrix: Matrix,epsilon: F32) -> Maybe<&2,Matrix>:
  match matrix:
    case Matrix{a,b,c,d,tx,ty}:
      +det = F32.sub(F32.mul(a,d),F32.mul(b,c))
      inverse_case(F32.is_gt(F32.abs(det),F32.abs(epsilon)),matrix,det)
