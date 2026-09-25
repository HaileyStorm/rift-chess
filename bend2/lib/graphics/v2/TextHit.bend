# DRAFT caret hit testing and coalesced selection rectangles for prepared runs.
# Input carets must be in TextLayout order, with monotonic source boundaries.
# A shaped item is atomic: selecting part of its source interval selects its cell.
import Base
import ./TextLayout.bend as Text
import ./Rect.bend as Rect

def distance(+a: U32,+b: U32) -> U32:
  U32.sub(U32.max(a,b),U32.min(a,b))

def nearer(a: Text.Caret,b: Text.Caret,+x: U32,+line: U32) -> Bool:
  match a b:
    case Text.Caret{as,ax,ay,al,+aa} Text.Caret{bs,bx,by,bl,ba}:
      +ad = distance(al,line)
      +bd = distance(bl,line)
      +ap = distance(ax,x)
      +bp = distance(bx,x)
      Bool.or(U32.is_lt(ad,bd),Bool.and(U32.is_eq(ad,bd),
        Bool.or(U32.is_lt(ap,bp),Bool.and(U32.is_eq(ap,bp),Bool.and(aa,Bool.not(ba))))))

def choose_case(take: Bool,a: Text.Caret,b: Text.Caret) -> Maybe<&2,Text.Caret>:
  match take:
    case True{}: Some{a}
    case False{}: Some{b}

def choose(+value: Text.Caret,best: Maybe<&2,Text.Caret>,x: U32,line: U32) -> Maybe<&2,Text.Caret>:
  match best:
    case None{}: Some{value}
    case Some{+old}: choose_case(nearer(value,old,x,line),value,old)

def nearest(carets: List<&2,Text.Caret>,+x: U32,+line: U32,best: Maybe<&2,Text.Caret>) -> Maybe<&2,Text.Caret>:
  match carets:
    case Nil{}: best
    case Con{head,tail}: nearest(tail,x,line,choose(head,best,x,line))

# y is relative to the layout origin. Exact distance ties prefer a leading caret;
# remaining ties preserve list order. An empty run returns None, not source zero.
def hit(carets: List<&2,Text.Caret>,x: U32,y: U32,line_height: U32) -> Maybe<&2,Text.Caret>:
  nearest(carets,x,U32.div(y,U32.max(line_height,1)),None{})

def merge_case(same_line: Bool,value: Rect.Box,old: Rect.Box,tail: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match same_line:
    case True{}: Con{Rect.union(value,old),tail}
    case False{}: Con{value,Con{old,tail}}

def merge(+value: Rect.Box,acc: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match value acc:
    case _ Nil{}: Con{value,Nil{}}
    case Rect.Box{l,t,r,b} Con{+old,tail}:
      match old:
        case Rect.Box{ol,ot,orr,ob}:
          merge_case(Bool.and(U32.is_eq(t,ot),U32.is_eq(b,ob)),value,old,tail)

def selected_case(valid: Bool,a: Text.Caret,b: Text.Caret,height: U32,acc: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match valid a b:
    case False{} _ _: acc
    case True{} Text.Caret{as,+ax,+ay,al,aa} Text.Caret{bs,+bx,by,bl,ba}:
      merge(Rect.Box{U32.min(ax,bx),ay,U32.max(ax,bx),U32.add(ay,height)},acc)

def pair(+a: Text.Caret,+b: Text.Caret,start: U32,end: U32,height: U32,acc: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match a b:
    case Text.Caret{+as,+ax,ay,al,aa} Text.Caret{+bs,+bx,by,bl,ba}:
      selected_case(Bool.and(U32.is_eq(al,bl),Bool.and(U32.is_ne(ax,bx),
        Bool.and(U32.is_lt(as,bs),Bool.and(U32.is_lt(as,end),U32.is_gt(bs,start))))),a,b,height,acc)

def collect(carets: List<&2,Text.Caret>,+start: U32,+end: U32,+height: U32,acc: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match carets:
    case Nil{}: acc
    case Con{a,Nil{}}: acc
    case Con{a,Con{+b,+rest}}:
      collect(Con{b,rest},start,end,height,pair(a,b,start,end,height,acc))

def reverse(items: List<&2,Rect.Box>,acc: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match items:
    case Nil{}: acc
    case Con{a,rest}: reverse(rest,Con{a,acc})

def selection_valid(valid: Bool,carets: List<&2,Text.Caret>,start: U32,end: U32,height: U32) -> List<&2,Rect.Box>:
  match valid:
    case False{}: Nil{}
    case True{}: reverse(collect(carets,start,end,height,Nil{}),Nil{})

# Hard line breaks have no ink cell. Rectangles on a line are unioned, avoiding
# darker overlaps when a translucent selection fill covers kerned glyph cells.
def selection(carets: List<&2,Text.Caret>,+start: U32,+end: U32,+height: U32) -> List<&2,Rect.Box>:
  selection_valid(Bool.and(U32.is_lt(start,end),U32.is_ne(height,0)),carets,start,end,U32.min(height,4096))
