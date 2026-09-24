# A source cursor retains the smallest existing quadtree ancestor containing
# a target square. No copying, raster sampling, rounding or mutable cache.
# All bounds here use the existing 4096-biased integer coordinate domain.
import Base
import ../pixels/Pixel.bend as Pixel

type View is Data:
  View{depth: Nat, size: U32, x: U32, y: U32, pixels: Image}

type Choice is Data:
  Stay{}
  TL{}
  TR{}
  BL{}
  BR{}

def contains(+x: U32, +y: U32, +size: U32,
  +sx: U32, +sy: U32, +span: U32) -> Bool:
  Bool.and(Bool.and(U32.is_ge(x, sx), U32.is_ge(y, sy)),
    Bool.and(U32.is_le(U32.add(x, size), U32.add(sx, span)),
      U32.is_le(U32.add(y, size), U32.add(sy, span))))

# Classify axes once rather than checking four full child rectangles.
def axis_case(valid: Bool, low: Bool, high: Bool) -> U32:
  match valid low high:
    case False{} _ _: 0
    case True{} True{} _: 1
    case True{} False{} True{}: 2
    case True{} False{} False{}: 0

def axis(+source: U32, +half: U32, +start: U32, size: U32) -> U32:
  +end = U32.add(start, size)
  +middle = U32.add(source, half)
  axis_case(Bool.and(U32.is_ge(start, source), U32.is_le(end, U32.add(middle, half))),
    U32.is_le(end, middle), U32.is_ge(start, middle))

def choose_axes(horizontal: U32, vertical: U32) -> Choice:
  match horizontal vertical:
    case 1 1: TL{}
    case 2 1: TR{}
    case 1 2: BL{}
    case 2 2: BR{}
    case _ _: Stay{}

def choose(sx: U32, sy: U32, span: U32,
  x: U32, y: U32, +size: U32) -> Choice:
  +half = U32.div(span, 2)
  choose_axes(axis(sx, half, x, size), axis(sy, half, y, size))

# Do not classify quadrants below a leaf or for a uniform source region.
def child_choice(depth: Nat, sx: U32, sy: U32, span: U32,
  x: U32, y: U32, size: U32, pixels: Image) -> Choice:
  match depth pixels:
    case 0n _: Stay{}
    case 1n+rest Pix{color}: Stay{}
    case 1n+rest Qua{tl, tr, bl, br}: choose(sx, sy, span, x, y, size)

# Recursion is on depth; selected child is a genuine source subtree. A Pix
# fills all remaining depths and is kept without further coordinate descent.
def focus(+depth: Nat, +span: U32, +sx: U32, +sy: U32,
  +x: U32, +y: U32, +size: U32, pixels: Image, choice: Choice) -> View:
  match depth pixels choice:
    case 0n _ _: View{depth, span, sx, sy, pixels}
    case 1n+rest Pix{color} _: View{depth, span, sx, sy, Pix{color}}
    case 1n+rest Qua{tl, tr, bl, br} Stay{}:
      View{depth, span, sx, sy, Qua{tl, tr, bl, br}}
    case 1n+rest Qua{+tl, tr, bl, br} TL{}:
      +half = U32.div(span, 2)
      +xx = sx
      +yy = sy
      focus(rest, half, xx, yy, x, y, size, tl,
        child_choice(rest, xx, yy, half, x, y, size, tl))
    case 1n+rest Qua{tl, +tr, bl, br} TR{}:
      +half = U32.div(span, 2)
      +xx = U32.add(sx, half)
      +yy = sy
      focus(rest, half, xx, yy, x, y, size, tr,
        child_choice(rest, xx, yy, half, x, y, size, tr))
    case 1n+rest Qua{tl, tr, +bl, br} BL{}:
      +half = U32.div(span, 2)
      +xx = sx
      +yy = U32.add(sy, half)
      focus(rest, half, xx, yy, x, y, size, bl,
        child_choice(rest, xx, yy, half, x, y, size, bl))
    case 1n+rest Qua{tl, tr, bl, +br} BR{}:
      +half = U32.div(span, 2)
      +xx = U32.add(sx, half)
      +yy = U32.add(sy, half)
      focus(rest, half, xx, yy, x, y, size, br,
        child_choice(rest, xx, yy, half, x, y, size, br))

def narrow(view: View, +x: U32, +y: U32, +size: U32) -> View:
  match view:
    case View{+depth, +span, +sx, +sy, Pix{color}}:
      View{depth, span, sx, sy, Pix{color}}
    case View{+depth, +span, +sx, +sy, +pixels}:
      focus(depth, span, sx, sy, x, y, size, pixels,
        child_choice(depth, sx, sy, span, x, y, size, pixels))

def outside(view: View, +x: U32, +y: U32, +size: U32) -> Bool:
  match view:
    case View{depth, +span, +sx, +sy, pixels}:
      Bool.or(Bool.or(U32.is_ge(x, U32.add(sx, span)),
          U32.is_le(U32.add(x, size), sx)),
        Bool.or(U32.is_ge(y, U32.add(sy, span)),
          U32.is_le(U32.add(y, size), sy)))

def shape_matches(+sx: U32, +sy: U32, span: U32,
  +x: U32, +y: U32, size: U32, pixels: Image) -> Bool:
  match pixels:
    case Pix{color}: True{}
    case Qua{tl, tr, bl, br}:
      Bool.and(Bool.and(U32.is_eq(sx, x), U32.is_eq(sy, y)),
        U32.is_eq(span, size))

def matches(view: View, +x: U32, +y: U32, +size: U32) -> Bool:
  match view:
    case View{depth, +span, +sx, +sy, pixels}:
      Bool.and(contains(x, y, size, sx, sy, span),
        shape_matches(sx, sy, span, x, y, size, pixels))

def pixels(view: View) -> Image:
  match view:
    case View{depth, size, x, y, pixels}: pixels

def sample(view: View, x: U32, y: U32) -> U32:
  match view:
    case View{depth, size, sx, sy, pixels}:
      Pixel.sample_xy(depth, U32.sub(x, sx), U32.sub(y, sy), pixels)
