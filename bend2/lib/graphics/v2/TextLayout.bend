# DRAFT metric-driven text preparation, independent of any font or host shaper.
# Source/end are explicit logical boundaries (codepoints, graphemes or shaped
# clusters chosen by caller). Input order is visual order; bidi is not inferred.
import Base
import ./Shapes.bend as Shapes

type Item is Data:
  Glyph{source: U32,end: U32,key: U32,advance: U32,kern: Shapes.Coord}
  Space{source: U32,end: U32,advance: U32}
  Tab{source: U32,end: U32}
  Break{source: U32,end: U32}

type Settings is Data:
  Settings{width: U32,line_height: U32,max_lines: U32,tab_size: U32,word_wrap: Bool}

type Placement is Data:
  Placement{source: U32,end: U32,key: U32,x: U32,y: U32,line: U32}

type Caret is Data:
  Caret{source: U32,x: U32,y: U32,line: U32,leading: Bool}

type Metrics is Data:
  Metrics{width: U32,height: U32,lines: U32,consumed: U32,truncated: Bool}

type Layout is Data:
  Layout{glyphs: List<&2,Placement>,carets: List<&2,Caret>,metrics: Metrics}

type State is Data:
  State{x: U32,line: U32,width: U32,consumed: U32,
    glyphs: List<&2,Placement>,carets: List<&2,Caret>}

type Step is Data:
  LayoutMore{state: State}
  LayoutStop{state: State}

# Clamp the presentation domain; max_lines also prevents y exceeding 4096.
def settings(settings: Settings) -> Settings:
  match settings:
    case Settings{width,+line_height,max_lines,tab_size,word_wrap}:
      +h = U32.max(1,U32.min(line_height,4096))
      Settings{U32.min(width,4096),h,U32.min(max_lines,U32.div(4096,h)),
        U32.max(1,U32.min(tab_size,4096)),word_wrap}

# Kerning is an explicit signed offset, saturated at zero; reset at line start.
def kern(+x: U32,offset: Shapes.Coord) -> U32:
  match offset:
    case Shapes.Pos{value}: U32.min(8192,U32.add(x,U32.min(value,4096)))
    case Shapes.Neg{magnitude}: U32.sub(x,U32.min(x,magnitude))

def origin(start: Bool,x: U32,offset: Shapes.Coord) -> U32:
  match start:
    case True{}: 0
    case False{}: kern(x,offset)

def word_extent(items: List<&2,Item>,+x: U32) -> U32:
  match items:
    case Nil{}: x
    case Con{Glyph{source,end,key,advance,offset},rest}:
      word_extent(rest,U32.min(4097,U32.add(origin(U32.is_zero(x),x,offset),U32.min(advance,4096))))
    case Con{_,rest}: x

def caret_equal(a: Caret,b: Caret) -> Bool:
  match a b:
    case Caret{as,ax,ay,al,aa} Caret{bs,bx,by,bl,ba}:
      Bool.and(Bool.and(U32.is_eq(as,bs),U32.is_eq(ax,bx)),
        Bool.and(Bool.and(U32.is_eq(ay,by),U32.is_eq(al,bl)),Bool.not(Bool.xor(aa,ba))))

def caret_cons_case(same: Bool,value: Caret,rest: List<&2,Caret>) -> List<&2,Caret>:
  match same:
    case True{}: rest
    case False{}: Con{value,rest}

def caret_cons(+value: Caret,+rest: List<&2,Caret>) -> List<&2,Caret>:
  match rest:
    case Nil{}: Con{value,Nil{}}
    case Con{head,tail}: caret_cons_case(caret_equal(value,head),value,rest)

def add_glyph(key: Maybe<&2,U32>,source: U32,end: U32,x: U32,y: U32,line: U32,
  rest: List<&2,Placement>) -> List<&2,Placement>:
  match key:
    case None{}: rest
    case Some{key}: Con{Placement{source,end,key,x,y,line},rest}

def wrap_caret(wrapped: Bool,source: U32,state: State,height: U32) -> List<&2,Caret>:
  match wrapped state:
    case False{} State{x,line,width,consumed,glyphs,carets}: carets
    case True{} State{x,+line,width,consumed,glyphs,carets}:
      caret_cons(Caret{source,x,U32.mul(line,height),line,False{}},carets)

def place_valid(valid: Bool,wrapped: Bool,+source: U32,+end: U32,key: Maybe<&2,U32>,
  +x: U32,advance: U32,+line: U32,+height: U32,+state: State) -> Step:
  match valid state:
    case False{} _: LayoutStop{state}
    case True{} State{old_x,old_line,width,consumed,glyphs,carets}:
      +y = U32.mul(line,height)
      +next = U32.add(x,advance)
      +cs = caret_cons(Caret{source,x,y,line,True{}},wrap_caret(wrapped,source,state,height))
      LayoutMore{State{next,line,U32.max(width,next),U32.add(consumed,1),
        add_glyph(key,source,end,x,y,line,glyphs),
        caret_cons(Caret{end,next,y,line,False{}},cs)}}

def place(wrapped: Bool,source: U32,end: U32,key: Maybe<&2,U32>,advance: U32,
  offset: Shapes.Coord,settings: Settings,+state: State) -> Step:
  match wrapped settings state:
    case False{} Settings{width,height,max_lines,tab_size,word_wrap} State{+x,+line,w,n,gs,cs}:
      place_valid(U32.is_lt(line,max_lines),False{},source,end,key,
        origin(U32.is_zero(x),x,offset),advance,line,height,state)
    case True{} Settings{width,height,max_lines,tab_size,word_wrap} State{x,line,w,n,gs,cs}:
      +next_line = U32.add(line,1)
      place_valid(U32.is_lt(next_line,max_lines),True{},source,end,key,
        0,advance,next_line,height,state)

# A break/soft-space wrap consumes that item and gives its end boundary a
# leading caret at the next line. No trailing-space advance leaks into width.
def newline_valid(valid: Bool,source: U32,end: U32,+height: U32,+state: State) -> Step:
  match valid state:
    case False{} _: LayoutStop{state}
    case True{} State{+x,+line,width,consumed,glyphs,carets}:
      +next = U32.add(line,1)
      +cs = caret_cons(Caret{source,x,U32.mul(line,height),line,True{}},carets)
      LayoutMore{State{0,next,U32.max(width,x),U32.add(consumed,1),glyphs,
        caret_cons(Caret{end,0,U32.mul(next,height),next,True{}},cs)}}

def newline(source: U32,end: U32,settings: Settings,+state: State) -> Step:
  match settings state:
    case Settings{width,height,max_lines,tab_size,word_wrap} State{x,line,w,n,gs,cs}:
      newline_valid(U32.is_lt(U32.add(line,1),max_lines),source,end,height,state)

def space_case(wrap: Bool,source: U32,end: U32,advance: U32,settings: Settings,state: State) -> Step:
  match wrap:
    case True{}: newline(source,end,settings,state)
    case False{}: place(False{},source,end,None{},advance,Shapes.Pos{0},settings,state)

def step(item: Item,rest: List<&2,Item>,+settings: Settings,+state: State) -> Step:
  match item settings state:
    case Glyph{source,end,key,advance,+offset} Settings{width,height,max_lines,tab_size,word_wrap} State{+x,line,w,n,gs,cs}:
      +advance = U32.min(advance,4096)
      place(Bool.and(U32.is_ne(x,0),U32.is_gt(U32.add(origin(U32.is_zero(x),x,offset),advance),width)),
        source,end,Some{key},advance,offset,settings,state)
    case Space{source,end,advance} Settings{+width,height,max_lines,tab_size,word_wrap} State{+x,line,w,n,gs,cs}:
      +advance = U32.min(advance,4096)
      +word = word_extent(rest,0)
      space_case(Bool.and(U32.is_ne(x,0),Bool.or(U32.is_gt(U32.add(x,advance),width),
        Bool.and(word_wrap,Bool.and(U32.is_le(word,width),U32.is_gt(U32.add(U32.add(x,advance),word),width))))),
        source,end,advance,settings,state)
    case Tab{source,end} Settings{width,height,max_lines,+tab_size,word_wrap} State{+x,line,w,n,gs,cs}:
      +advance = U32.sub(tab_size,U32.mod(x,tab_size))
      space_case(Bool.and(U32.is_ne(x,0),U32.is_gt(U32.add(x,advance),width)),
        source,end,advance,settings,state)
    case Break{source,end} _ _: newline(source,end,settings,state)

def reverse_glyphs(items: List<&2,Placement>,acc: List<&2,Placement>) -> List<&2,Placement>:
  match items:
    case Nil{}: acc
    case Con{head,tail}: reverse_glyphs(tail,Con{head,acc})

def reverse_carets(items: List<&2,Caret>,acc: List<&2,Caret>) -> List<&2,Caret>:
  match items:
    case Nil{}: acc
    case Con{head,tail}: reverse_carets(tail,Con{head,acc})

def finish(truncated: Bool,state: State,settings: Settings) -> Layout:
  match state settings:
    case State{x,line,width,+consumed,gs,cs} Settings{w,height,max_lines,tab_size,word_wrap}:
      +lines = Bool.pick(U32,U32.is_zero(consumed),0,U32.add(line,1))
      Layout{reverse_glyphs(gs,Nil{}),reverse_carets(cs,Nil{}),
        Metrics{width,U32.mul(lines,height),lines,consumed,truncated}}

def run(items: List<&2,Item>,+settings: Settings,result: Step) -> Layout:
  match items result:
    case _ LayoutStop{state}: finish(True{},state,settings)
    case Nil{} LayoutMore{state}: finish(False{},state,settings)
    case Con{item,+rest} LayoutMore{state}:
      run(rest,settings,step(item,rest,settings,state))

def layout(items: List<&2,Item>,config: Settings) -> Layout:
  run(items,settings(config),LayoutMore{State{0,0,0,0,Nil{},Nil{}}})
