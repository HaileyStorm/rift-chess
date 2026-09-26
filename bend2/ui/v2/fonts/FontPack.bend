# App-owned RFNT v1 8-bit coverage decoder. The browser transports bounded
# bytes; Bend validates them and builds immutable, native-resolution glyphs.
# Records are sorted by (tier*128+ASCII). No browser text drawing is involved.
import Base
import ../../../lib/graphics/v2/Glyph.bend as Glyph
import ../../../lib/graphics/v2/Shapes.bend as Shapes
import ../../../lib/graphics/v2/ImageOps.bend as Ops

type Entry is Data:
  Entry{tier: U32,code: U32,mask: Glyph.Mask}

type Book is Data:
  Book{entries: List<&2,Entry>}

type Stream is Type:
  Stream{bytes: Array<U32>,used: U32,index: U32,ok: Bool}

type Byte is Type:
  Byte{stream: Stream,value: U32}

type Header is Type:
  Header{stream: Stream,a: U32,b: U32,c: U32,d: U32,e: U32,f: U32}

type Frame is Data:
  First{depth: Nat}
  Second{depth: Nat,a: Image}
  Third{depth: Nat,a: Image,b: Image}
  Fourth{depth: Nat,a: Image,b: Image,c: Image}

type Placed is Data:
  Continue{stack: List<&2,Frame>,depth: Nat}
  Complete{image: Image}

type Machine is Type:
  Tag{byte: Byte,depth: Nat,stack: List<&2,Frame>}
  Alpha{byte: Byte,stack: List<&2,Frame>}
  Place{stream: Stream,placed: Placed}

type Tree is Type:
  Tree{stream: Stream,image: Image}

type Records is Type:
  Records{stream: Stream,entries: List<&2,Entry>,previous: U32}

def byte_cap() -> U32:
  262144

def asset_path() -> String:
  "assets/rift-observatory-font.rga"

def fallback() -> Glyph.Mask:
  Glyph.Mask{10,Shapes.Pos{0},Shapes.Pos{0},0n,1,Pix{0}}

def empty() -> Book:
  Book{Nil{}}

def failed(stream: Stream) -> Stream:
  match stream:
    case Stream{bytes,used,index,ok}: Stream{bytes,used,index,False{}}

def byte_value(+used: U32,+index: U32,result: Array<U32> & U32) -> Byte:
  (bytes,+value) = result
  Byte{Stream{bytes,used,U32.add(index,1),U32.is_le(value,255)},value}

def read_case(allowed: Bool,stream: Stream) -> Byte:
  match allowed stream:
    case False{} _: Byte{failed(stream),0}
    case True{} Stream{bytes,+used,+index,ok}:
      byte_value(used,index,Array.get(U32,bytes,index))

def read(stream: Stream) -> Byte:
  match stream:
    case Stream{bytes,+used,+index,+ok}:
      read_case(Bool.and(ok,U32.is_lt(index,used)),stream)

# Six scalar reads are deliberately staged through parameters; Bend cannot
# destructure a computed result directly at an affine ownership boundary.
def header_5(+a: U32,+b: U32,+c: U32,+d: U32,+e: U32,byte: Byte) -> Header:
  match byte:
    case Byte{stream,f}: Header{stream,a,b,c,d,e,f}

def header_4(+a: U32,+b: U32,+c: U32,+d: U32,byte: Byte) -> Header:
  match byte:
    case Byte{stream,e}: header_5(a,b,c,d,e,read(stream))

def header_3(+a: U32,+b: U32,+c: U32,byte: Byte) -> Header:
  match byte:
    case Byte{stream,d}: header_4(a,b,c,d,read(stream))

def header_2(+a: U32,+b: U32,byte: Byte) -> Header:
  match byte:
    case Byte{stream,c}: header_3(a,b,c,read(stream))

def header_1(+a: U32,byte: Byte) -> Header:
  match byte:
    case Byte{stream,b}: header_2(a,b,read(stream))

def header_0(byte: Byte) -> Header:
  match byte:
    case Byte{next,a}: header_1(a,read(next))

def header(stream: Stream) -> Header:
  header_0(read(stream))

def bearing_case(negative: Bool,value: U32) -> Shapes.Coord:
  match negative:
    case True{}: Shapes.Neg{U32.sub(128,value)}
    case False{}: Shapes.Pos{U32.sub(value,128)}

def bearing(+value: U32) -> Shapes.Coord:
  bearing_case(U32.is_lt(value,128),value)

def key(tier: U32,code: U32) -> U32:
  U32.add(U32.mul(tier,128),code)

# Put a finished child into the nearest open quad. The final fourth child
# closes its frame and is recursively put in the parent, preserving TL/TR/BL/BR.
def put(frames: List<&2,Frame>,image: Image) -> Placed:
  match frames:
    case Nil{}: Complete{image}
    case Con{First{+depth},tail}:
      Continue{Second{depth,image} <> tail,depth}
    case Con{Second{+depth,a},tail}:
      Continue{Third{depth,a,image} <> tail,depth}
    case Con{Third{+depth,a,b},tail}:
      Continue{Fourth{depth,a,b,image} <> tail,depth}
    case Con{Fourth{depth,a,b,c},tail}:
      put(tail,Ops.quad(a,b,c,image))

# The only recursion here is one bounded tail loop. It decodes preorder nodes
# into an explicit frame stack, avoiding Array clones or computed-result matches.
def tree_loop(fuel: Nat,machine: Machine) -> Tree:
  match fuel machine:
    case 0n Tag{Byte{stream,value},depth,stack}: Tree{failed(stream),Pix{0}}
    case 0n Alpha{Byte{stream,value},stack}: Tree{failed(stream),Pix{0}}
    case 0n Place{stream,placed}: Tree{failed(stream),Pix{0}}
    case 1n+rest Tag{Byte{stream,0},depth,stack}:
      tree_loop(rest,Alpha{read(stream),stack})
    case 1n+rest Tag{Byte{stream,1},0n,stack}:
      Tree{failed(stream),Pix{0}}
    case 1n+rest Tag{Byte{stream,1},1n++lower,stack}:
      tree_loop(rest,Tag{read(stream),lower,First{1n+lower} <> stack})
    case 1n+rest Tag{Byte{stream,value},depth,stack}:
      Tree{failed(stream),Pix{0}}
    case 1n+rest Alpha{Byte{stream,+value},stack}:
      tree_loop(rest,Place{stream,put(stack,Pix{U32.shln(value,16n)})})
    case 1n+rest Place{stream,Complete{image}}:
      Tree{stream,image}
    case 1n+rest Place{stream,Continue{stack,depth}}:
      tree_loop(rest,Tag{read(stream),depth,stack})

def tree(depth: U32,stream: Stream) -> Tree:
  tree_loop(U32.to_nat(16384),Tag{read(stream),U32.to_nat(depth),Nil{}})

def finish_record(+tier: U32,+code: U32,+advance: U32,+left: U32,
  +top: U32,+depth: U32,read: Tree,acc: List<&2,Entry>) -> Records:
  match read:
    case Tree{stream,image}:
      Records{stream,Entry{tier,code,Glyph.Mask{advance,bearing(left),
        bearing(top),U32.to_nat(depth),U32.shln(1,U32.to_nat(depth)),image}} <> acc,
        key(tier,code)}

def record_case(valid: Bool,+previous: U32,tier: U32,code: U32,advance: U32,
  left: U32,top: U32,+depth: U32,stream: Stream,
  acc: List<&2,Entry>) -> Records:
  match valid:
    case False{}: Records{failed(stream),acc,previous}
    case True{}:
      finish_record(tier,code,advance,left,top,depth,tree(depth,stream),acc)

def record_from(+previous: U32,acc: List<&2,Entry>,record: Header) -> Records:
  match record:
    case Header{stream,+tier,+code,+advance,left,top,+depth}:
      +valid = Bool.and(Bool.and(U32.is_lt(tier,4),
        Bool.and(U32.is_ge(code,32),U32.is_le(code,126))),
        Bool.and(Bool.and(U32.is_gt(key(tier,code),previous),U32.is_le(advance,128)),
          U32.is_le(depth,7)))
      record_case(valid,previous,tier,code,advance,left,top,depth,stream,acc)

def records(fuel: Nat,result: Records) -> Records:
  match fuel result:
    case 0n _: result
    case 1n+rest Records{stream,entries,previous}:
      records(rest,record_from(previous,entries,header(stream)))

def complete_case(valid: Bool,entries: List<&2,Entry>) -> Maybe<Book>:
  match valid:
    case False{}: None{}
    case True{}: Some{Book{List.reverse(&2,Entry,entries)}}

def complete(recorded: Records) -> Maybe<Book>:
  match recorded:
    case Records{Stream{bytes,used,index,ok},entries,previous}:
      complete_case(Bool.and(ok,U32.is_eq(index,used)),entries)

def decode_records(valid: Bool,count: U32,stream: Stream) -> Maybe<Book>:
  match valid:
    case False{}: None{}
    case True{}: complete(records(U32.to_nat(count),Records{stream,Nil{},0}))

def decode_header(record: Header) -> Maybe<Book>:
  match record:
    case Header{stream,r,f,n,t,version,+count}:
      +valid = Bool.and(Bool.and(Bool.and(U32.is_eq(r,82),U32.is_eq(f,70)),
        Bool.and(U32.is_eq(n,78),U32.is_eq(t,84))),
        Bool.and(U32.is_eq(version,1),Bool.and(U32.is_gt(count,0),U32.is_le(count,255))))
      decode_records(valid,count,stream)

def decode_case(valid: Bool,bytes: Array<U32>,used: U32) -> Maybe<Book>:
  match valid:
    case False{}: None{}
    case True{}: decode_header(header(Stream{bytes,used,0,True{}}))

# Host-provided backing Array must be a power-of-two length >= used. Array.get
# wraps indexes, so every read checks `index < used` before accessing it.
def decode_backing(+used: U32,result: Array<U32> & U32) -> Maybe<Book>:
  (bytes,+size) = result
  +valid = Bool.and(Bool.and(U32.is_ge(used,12),U32.is_le(used,byte_cap())),
    Bool.and(Bool.and(U32.is_ge(size,used),U32.is_le(size,byte_cap())),
      U32.is_zero(U32.and(size,U32.sub(size,1)))))
  decode_case(valid,bytes,used)

def decode(bytes: Array<U32>,+used: U32) -> Maybe<Book>:
  decode_backing(used,Array.size(U32,bytes))

def choose(found: Bool,mask: Glyph.Mask) -> Maybe<Glyph.Mask>:
  match found:
    case True{}: Some{mask}
    case False{}: None{}

def seek(entries: List<&2,Entry>,+tier: U32,+code: U32,
  candidate: Maybe<Glyph.Mask>) -> Maybe<Glyph.Mask>:
  match entries candidate:
    case _ Some{mask}: Some{mask}
    case Nil{} None{}: None{}
    case Con{Entry{+t,+c,mask},tail} None{}:
      seek(tail,tier,code,choose(Bool.and(U32.is_eq(t,tier),U32.is_eq(c,code)),mask))

def found(mask: Maybe<Glyph.Mask>) -> Glyph.Mask:
  match mask:
    case None{}: fallback()
    case Some{mask}: mask

def glyph(+book: Book,+tier: U32,+code: U32) -> Glyph.Mask:
  match book:
    case Book{entries}: found(seek(entries,tier,code,None{}))
