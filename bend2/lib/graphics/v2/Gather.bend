# DRAFT integer 2x2 gather. Strip the shared quadtree prefix once before four
# corner reads; uniform source subtrees return immediately. Coordinates clamp.
import Base
import ../pixels/Pixel.bend as Pixel

type Four is Data:
  Four{a: U32,b: U32,c: U32,d: U32}

type Work is Data:
  GatherDone{values: Four}
  GatherNext{size: U32,x: U32,y: U32,xx: U32,yy: U32,image: Image}

def split(+depth: Nat,+x: U32,+y: U32,+xx: U32,+yy: U32,+image: Image) -> Work:
  GatherDone{Four{Pixel.sample_xy(depth,x,y,image),Pixel.sample_xy(depth,xx,y,image),
    Pixel.sample_xy(depth,x,yy,image),Pixel.sample_xy(depth,xx,yy,image)}}

def choose(same_x: Bool,same_y: Bool,right: Bool,bottom: Bool,+depth: Nat,+half: U32,
  +x: U32,+y: U32,+xx: U32,+yy: U32,+image: Image) -> Work:
  match same_x same_y right bottom image:
    case True{} True{} False{} False{} Qua{a,b,c,d}: GatherNext{half,x,y,xx,yy,a}
    case True{} True{} True{} False{} Qua{a,b,c,d}:
      GatherNext{half,U32.sub(x,half),y,U32.sub(xx,half),yy,b}
    case True{} True{} False{} True{} Qua{a,b,c,d}:
      GatherNext{half,x,U32.sub(y,half),xx,U32.sub(yy,half),c}
    case True{} True{} True{} True{} Qua{a,b,c,d}:
      GatherNext{half,U32.sub(x,half),U32.sub(y,half),U32.sub(xx,half),U32.sub(yy,half),d}
    case _ _ _ _ _: split(depth,x,y,xx,yy,image)

def prepare(+depth: Nat,size: U32,+x: U32,+y: U32,+xx: U32,+yy: U32,+image: Image) -> Work:
  match depth image:
    case _ Pix{+color}: GatherDone{Four{color,color,color,color}}
    case 0n Qua{a,b,c,d}: GatherDone{Four{0,0,0,0}}
    case 1n+rest Qua{a,b,c,d}:
      +h = U32.div(size,2)
      +right = U32.is_ge(x,h)
      +bottom = U32.is_ge(y,h)
      choose(Bool.not(Bool.xor(right,U32.is_ge(xx,h))),Bool.not(Bool.xor(bottom,U32.is_ge(yy,h))),
        right,bottom,depth,h,x,y,xx,yy,image)

def descend(+depth: Nat,work: Work) -> Four:
  match depth work:
    case _ GatherDone{values}: values
    case 0n GatherNext{size,x,y,xx,yy,image}: Four{0,0,0,0}
    case 1n+rest GatherNext{size,x,y,xx,yy,image}:
      descend(rest,prepare(rest,size,x,y,xx,yy,image))

def valid(valid: Bool,+depth: Nat,+size: U32,x: U32,y: U32,image: Image) -> Four:
  match valid:
    case False{}: Four{0,0,0,0}
    case True{}:
      +last = U32.sub(size,1)
      +x = U32.min(x,last)
      +y = U32.min(y,last)
      descend(depth,prepare(depth,size,x,y,U32.min(U32.add(x,1),last),U32.min(U32.add(y,1),last),image))

def neighbors(depth: Nat,+size: U32,x: U32,y: U32,image: Image) -> Four:
  valid(U32.is_ne(size,0),depth,size,x,y,image)
