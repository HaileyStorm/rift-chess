# DRAFT integer layout arithmetic, not a widget tree or application UI policy.
# Bounded public domain: canvas/track extents, gaps, counts and margins <=4096.
import Base
import ./Rect.bend as Rect

type Align is Data:
  Start{}
  Center{}
  End{}

type Insets is Data:
  Insets{left: U32,top: U32,right: U32,bottom: U32}

type Span is Data:
  Span{offset: U32,size: U32}

def offset_room(align: Align,room: U32) -> U32:
  match align:
    case Start{}: 0
    case Center{}: U32.div(room,2)
    case End{}: room

def offset(align: Align,+outer: U32,inner: U32) -> U32:
  offset_room(align,U32.sub(outer,U32.min(outer,inner)))

def inset(rect: Rect.Box,insets: Insets) -> Rect.Box:
  match rect insets:
    case Rect.Box{+l,+t,r,b} Insets{il,it,ir,ib}:
      +w = U32.sub(U32.max(l,r),l)
      +h = U32.sub(U32.max(t,b),t)
      +x = U32.min(il,w)
      +y = U32.min(it,h)
      Rect.Box{U32.add(l,x),U32.add(t,y),
        U32.add(l,U32.sub(w,U32.min(ir,U32.sub(w,x)))),
        U32.add(t,U32.sub(h,U32.min(ib,U32.sub(h,y))))}

# Exact-sum equal tracks; the first remainder tracks receive one extra pixel.
# Impossible gap/count requests return None instead of silently compressing gaps.
def track_valid(valid: Bool,total: U32,+count: U32,+gap: U32,+index: U32) -> Maybe<&2,Span>:
  match valid:
    case False{}: None{}
    case True{}:
      +free = U32.sub(total,U32.mul(gap,U32.sub(count,1)))
      +base = U32.div(free,count)
      +extra = U32.mod(free,count)
      Some{Span{U32.add(U32.mul(index,U32.add(base,gap)),U32.min(index,extra)),
        U32.add(base,Bool.to_u32(U32.is_lt(index,extra)))}}

def track(+total: U32,+count: U32,+gap: U32,+index: U32) -> Maybe<&2,Span>:
  +bounded = Bool.and(Bool.and(U32.is_ge(count,1),U32.is_le(count,4096)),
    Bool.and(U32.is_le(total,4096),U32.is_le(gap,4096)))
  +fits = Bool.and(U32.is_lt(index,count),U32.is_le(U32.mul(gap,U32.sub(count,1)),total))
  track_valid(Bool.and(bounded,fits),total,count,gap,index)

def grid_spans(rect: Rect.Box,x: Maybe<&2,Span>,y: Maybe<&2,Span>) -> Maybe<&2,Rect.Box>:
  match rect x y:
    case _ None{} _: None{}
    case _ _ None{}: None{}
    case Rect.Box{l,t,r,b} Some{Span{dx,w}} Some{Span{dy,h}}:
      +x = U32.add(l,dx)
      +y = U32.add(t,dy)
      Some{Rect.Box{x,y,U32.add(x,w),U32.add(y,h)}}

# Direct indexed cells support virtualized lists/grids without allocating them all.
def grid_cell(+rect: Rect.Box,columns: U32,rows: U32,gap_x: U32,gap_y: U32,column: U32,row: U32) -> Maybe<&2,Rect.Box>:
  grid_spans(rect,track(Rect.width(rect),columns,gap_x,column),track(Rect.height(rect),rows,gap_y,row))

def fitted(rect: Rect.Box,+w: U32,+h: U32,horizontal: Align,vertical: Align) -> Rect.Box:
  match rect:
    case Rect.Box{+l,+t,r,b}:
      +x = U32.add(l,offset(horizontal,U32.sub(r,l),w))
      +y = U32.add(t,offset(vertical,U32.sub(b,t),h))
      Rect.Box{x,y,U32.add(x,w),U32.add(y,h)}

def fit_axis(by_width: Bool,+rect: Rect.Box,+sw: U32,+sh: U32,horizontal: Align,vertical: Align) -> Rect.Box:
  match by_width:
    case True{}: fitted(rect,Rect.width(rect),U32.div(U32.mul(Rect.width(rect),sh),sw),horizontal,vertical)
    case False{}: fitted(rect,U32.div(U32.mul(Rect.height(rect),sw),sh),Rect.height(rect),horizontal,vertical)

def fit_valid(valid: Bool,+rect: Rect.Box,+sw: U32,+sh: U32,horizontal: Align,vertical: Align) -> Maybe<&2,Rect.Box>:
  match valid:
    case False{}: None{}
    case True{}: Some{fit_axis(U32.is_le(U32.mul(Rect.width(rect),sh),U32.mul(Rect.height(rect),sw)),rect,sw,sh,horizontal,vertical)}

# Contain-fit rounds the dependent extent down, never paints outside the box.
def fit(+rect: Rect.Box,+source_width: U32,+source_height: U32,horizontal: Align,vertical: Align) -> Maybe<&2,Rect.Box>:
  fit_valid(Bool.and(Bool.not(Rect.is_empty(rect)),Bool.and(
    Bool.and(U32.is_ge(source_width,1),U32.is_le(source_width,4096)),
    Bool.and(U32.is_ge(source_height,1),U32.is_le(source_height,4096)))),
    rect,source_width,source_height,horizontal,vertical)
