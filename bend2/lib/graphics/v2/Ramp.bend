# DRAFT prepare-once gradients: 16-bit positions, encoded RGB, <=16 stops.
# Duplicate positions are right-continuous (last stop at that position wins).
# Direct sampling is exact integer interpolation. A baked LUT is an EXPLICIT
# nearest lookup approximation, with 1..1024 entries and preserved endpoints.
import Base
import ./Color.bend as Color

type Stop is Data:
  Stop{position: U32,color: U32}

type Gradient is Data:
  Gradient{stops: List<&2,Stop>}

type Strip is Data:
  Solid{color: U32}
  Split{lo: Strip,hi: Strip}

type Table is Data:
  Table{depth: Nat,size: U32,strip: Strip}

def valid(fuel: Nat,stops: List<&2,Stop>,+previous: U32) -> Bool:
  match fuel stops:
    case _ Nil{}: True{}
    case 0n Con{stop,rest}: False{}
    case 1n+left Con{Stop{+position,color},rest}:
      Bool.and(Bool.and(U32.is_ge(position,previous),U32.is_le(position,65535)),
        Bool.and(U32.is_le(color,16777215),valid(left,rest,position)))

def build_case(ok: Bool,stops: List<&2,Stop>) -> Maybe<Gradient>:
  match ok stops:
    case False{} _: None{}
    case True{} Nil{}: None{}
    case True{} Con{head,tail}: Some{Gradient{Con{head,tail}}}

def build(+stops: List<&2,Stop>) -> Maybe<Gradient>:
  build_case(valid(16n,stops,0),stops)

# 255*65535 + floor(65535/2) fits U32. The caller provides delta<=span,
# span>0, and channels<=255; valid gradients establish these conditions.
def channel(a: U32,b: U32,+delta: U32,+span: U32) -> U32:
  U32.div(U32.add(U32.add(U32.mul(a,U32.sub(span,delta)),U32.mul(b,delta)),
    U32.div(span,2)),span)

def interpolate(+a: U32,+b: U32,+delta: U32,+span: U32) -> U32:
  Color.rgb(channel(Color.red(a),Color.red(b),delta,span),
    channel(Color.green(a),Color.green(b),delta,span),
    channel(Color.blue(a),Color.blue(b),delta,span))

type Cursor is Data:
  Cursor{position: U32,color: U32,done: Bool}

def advance(before: Bool,+position: U32,+old_position: U32,old_color: U32,
  next_position: U32,next_color: U32) -> Cursor:
  match before:
    case True{}: Cursor{old_position,interpolate(old_color,next_color,U32.sub(position,old_position),U32.sub(next_position,old_position)),True{}}
    case False{}: Cursor{next_position,next_color,False{}}

# Stop scanning as soon as the first strictly larger knot is reached. Equal
# positions advance without division, establishing right continuity safely.
def walk(stops: List<&2,Stop>,+position: U32,cursor: Cursor) -> U32:
  match stops cursor:
    case Nil{} Cursor{start,color,done}: color
    case Con{head,rest} Cursor{start,color,True{}}: color
    case Con{Stop{+next_position,next_color},rest} Cursor{old_position,old_color,False{}}:
      walk(rest,position,advance(U32.is_lt(position,next_position),position,old_position,old_color,next_position,next_color))

def sample(gradient: Gradient,+position: U32) -> U32:
  match gradient:
    case Gradient{Nil{}}: 0
    case Gradient{Con{Stop{+start,color},rest}}:
      walk(rest,U32.min(position,65535),Cursor{start,color,U32.is_lt(position,start)})

def compact_case(same: Bool,lo: Strip,hi: Strip) -> Strip:
  match same:
    case True{}: lo
    case False{}: Split{lo,hi}

def compact(lo: Strip,hi: Strip) -> Strip:
  match lo hi:
    case Solid{+a} Solid{+b}:
      compact_case(U32.is_eq(a,b),Solid{a},Solid{b})
    case _ _: Split{lo,hi}

def entry(zero: Bool,index: U32,denominator: U32) -> U32:
  match zero:
    case True{}: 0
    case False{}: U32.div(U32.mul(index,65535),denominator)

def tree(+depth: Nat,+size: U32,+offset: U32,+last: U32,+gradient: Gradient) -> Strip:
  match depth:
    case 0n: Solid{sample(gradient,entry(U32.is_zero(last),offset,last))}
    case 1n+rest:
      +half = U32.div(size,2)
      lo = tree(rest,half,offset,last,gradient)
      hi = tree(rest,half,U32.add(offset,half),last,gradient)
      compact(lo,hi)

def bake(+levels: Nat,+gradient: Gradient) -> Table:
  +depth = Nat.min(levels,10n)
  +size = U32.shln(1,depth)
  Table{depth,size,tree(depth,size,0,U32.sub(size,1),gradient)}

def pick(lower: Bool,lo: Strip,hi: Strip) -> Strip:
  match lower:
    case True{}: lo
    case False{}: hi

def index_in(lower: Bool,index: U32,half: U32) -> U32:
  match lower:
    case True{}: index
    case False{}: U32.sub(index,half)

def at(+depth: Nat,strip: Strip,+size: U32,+index: U32) -> U32:
  match depth strip:
    case _ Solid{color}: color
    case 0n Split{lo,hi}: 0
    case 1n+rest Split{lo,hi}:
      +half = U32.div(size,2)
      +lower = U32.is_lt(index,half)
      at(rest,pick(lower,lo,hi),half,index_in(lower,index,half))

def lookup(table: Table,position: U32) -> U32:
  match table:
    case Table{depth,+size,strip}:
      at(depth,strip,size,U32.div(U32.add(U32.mul(U32.min(position,65535),U32.sub(size,1)),32767),65535))
