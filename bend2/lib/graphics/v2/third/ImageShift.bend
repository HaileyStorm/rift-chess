# DRAFT exact U32-word translation. Suitable for RGB, PMA and scalar-mask Images.
# Outside pixels are zero; no blending, color conversion or alpha rounding occurs.
import Base
import ../ImageView.bend as View
import ../ImageOps.bend as Ops
import ../Shapes.bend as Shapes

# Resolve a narrowed source only after its outside/alignment classification.
def tree(+depth: Nat,+span: U32,+x: U32,+y: U32,outside: Bool,aligned: Bool,+view: View.View) -> Image:
  match depth outside aligned:
    case _ True{} _: Pix{0}
    case _ False{} True{}: View.pixels(view)
    case 0n False{} False{}: Pix{View.sample(view,x,y)}
    case 1n+rest False{} False{}:
      +h = U32.div(span,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      +va = View.narrow(view,x,y,h)
      +vb = View.narrow(view,xx,y,h)
      +vc = View.narrow(view,x,yy,h)
      +vd = View.narrow(view,xx,yy,h)
      a = tree(rest,h,x,y,View.outside(va,x,y,h),View.matches(va,x,y,h),va)
      b = tree(rest,h,xx,y,View.outside(vb,xx,y,h),View.matches(vb,xx,y,h),vb)
      c = tree(rest,h,x,yy,View.outside(vc,x,yy,h),View.matches(vc,x,yy,h),vc)
      d = tree(rest,h,xx,yy,View.outside(vd,xx,yy,h),View.matches(vd,xx,yy,h),vd)
      Ops.quad(a,b,c,d)

# Invalid signed coordinates are rejected as an all-zero image.
def start(valid: Bool,+depth: Nat,+size: U32,view: View.View) -> Image:
  match valid:
    case False{}: Pix{0}
    case True{}:
      +v = View.narrow(view,4096,4096,size)
      tree(depth,size,4096,4096,View.outside(v,4096,4096,size),View.matches(v,4096,4096,size),v)

# Translate within a same-size square. Source/target extent is an explicit domain.
def shift(+depth: Nat,+size: U32,image: Image,+left: Shapes.Coord,+top: Shapes.Coord) -> Image:
  start(Bool.and(Shapes.valid_coord(left),Shapes.valid_coord(top)),depth,size,View.View{depth,size,Shapes.biased(left),Shapes.biased(top),image})
