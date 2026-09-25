# DRAFT alpha-aware gradient brushes in encoded premultiplied channel space.
# Sorted 0..65535 knots, up to 32 stops; duplicates are right-continuous.
# Pixel-center brush sampling is independent of geometric antialias coverage.
import Base
import ./Premul.bend as P
import ../Color.bend as Color
import ../Ramp.bend as Ramp
import ../../Quad.bend as Quad

type Stop is Data:
  Stop{position: U32,pixel: U32}

type Stops is Data:
  Stops{values: List<&2,Stop>}

type Spread is Data:
  Pad{}
  Repeat{}
  Reflect{}

type Brush is Data:
  Solid{pixel: U32}
  Linear{x: F32,y: F32,dx: F32,dy: F32,inverse: F32,stops: Stops,spread: Spread}
  Radial{x: F32,y: F32,ix: F32,iy: F32,stops: Stops,spread: Spread}

type Cursor is Data:
  Cursor{position: U32,pixel: U32,done: Bool}

# Validate the complete stop list without accepting a truncated valid prefix.
def valid(fuel: Nat,values: List<&2,Stop>,+previous: U32) -> Bool:
  match fuel values:
    case _ Nil{}: True{}
    case 0n Con{head,tail}: False{}
    case 1n+rest Con{Stop{+position,pixel},tail}:
      Bool.and(Bool.and(U32.is_ge(position,previous),U32.is_le(position,65535)),Bool.and(P.valid(pixel),valid(rest,tail,position)))

# Reject empty, unsorted, overlong or noncanonical gradients.
def stops_case(ok: Bool,values: List<&2,Stop>) -> Maybe<Stops>:
  match ok values:
    case False{} _: None{}
    case True{} Nil{}: None{}
    case True{} Con{head,tail}: Some{Stops{Con{head,tail}}}

# Public checked gradient construction; callers may share the resulting Data.
def stops(+values: List<&2,Stop>) -> Maybe<Stops>:
  stops_case(valid(32n,values,0),values)

# Interpolate premultiplied channels and alpha with the same exact knot fraction.
def interpolate(+a: U32,+b: U32,+delta: U32,+span: U32) -> U32:
  P.pack(Ramp.channel(Color.red(a),Color.red(b),delta,span),Ramp.channel(Color.green(a),Color.green(b),delta,span),
    Ramp.channel(Color.blue(a),Color.blue(b),delta,span),Ramp.channel(P.alpha(a),P.alpha(b),delta,span))

# Equal-position stops advance without division; the final duplicate wins.
def advance(before: Bool,+q: U32,+old: U32,a: U32,next: U32,b: U32) -> Cursor:
  match before:
    case True{}: Cursor{old,interpolate(a,b,U32.sub(q,old),U32.sub(next,old)),True{}}
    case False{}: Cursor{next,b,False{}}

# Stop traversal immediately on the first enclosing interval.
def walk(values: List<&2,Stop>,+q: U32,cursor: Cursor) -> U32:
  match values cursor:
    case Nil{} Cursor{position,pixel,done}: pixel
    case Con{head,tail} Cursor{position,pixel,True{}}: pixel
    case Con{Stop{+position,pixel},tail} Cursor{old,a,False{}}:
      walk(tail,q,advance(U32.is_lt(q,position),q,old,a,position,pixel))

# Sample exact Q16 position; behavior outside the first/last knot is constant.
def ramp(stops: Stops,position: U32) -> U32:
  match stops:
    case Stops{Nil{}}: 0
    case Stops{Con{Stop{+start,pixel},tail}}:
      +q = U32.min(position,65535)
      walk(tail,q,Cursor{start,pixel,U32.is_lt(q,start)})

# Map a finite continuous parameter to the documented pad/repeat/reflect interval.
def spread(mode: Spread,+value: F32) -> F32:
  match mode:
    case Pad{}: F32.clamp(value,0.0,1.0)
    case Repeat{}: F32.sub(value,F32.floor(value))
    case Reflect{}:
      +q = F32.sub(value,F32.mul(F32.floor(F32.div(value,2.0)),2.0))
      F32.sub(1.0,F32.abs(F32.sub(q,1.0)))

# Convert a spread parameter to the exact integer interpolation grid.
def position(stops: Stops,mode: Spread,value: F32) -> U32:
  ramp(stops,F32.to_u32(F32.mul(spread(mode,value),65535.0)))

# Brush-space F32 domains are bounded independently from raster canvas bounds.
def finite(+value: F32) -> Bool:
  Bool.and(F32.is_ge(value,F32.sub(0.0,4096.0)),F32.is_le(value,4096.0))

# Validate one point; NaN/Infinity fail ordinary bounded comparisons.
def point(p: Quad.Point) -> Bool:
  match p:
    case Quad.Point{x,y}: Bool.and(finite(x),finite(y))

# Prepare an invertible gradient axis once rather than divide at every pixel.
def linear_case(ok: Bool,a: Quad.Point,b: Quad.Point,stops: Stops,spread: Spread) -> Maybe<Brush>:
  match ok a b:
    case False{} _ _: None{}
    case True{} Quad.Point{+x,+y} Quad.Point{xx,yy}:
      +dx = F32.sub(xx,x)
      +dy = F32.sub(yy,y)
      Some{Linear{x,y,dx,dy,F32.div(1.0,F32.add(F32.mul(dx,dx),F32.mul(dy,dy))),stops,spread}}

# Axes shorter than 1/256 pixel are rejected before reciprocal preparation.
# This excludes F32 squared-length underflow as well as identical endpoints.
def linear(+a: Quad.Point,+b: Quad.Point,stops: Stops,spread: Spread) -> Maybe<Brush>:
  match a b:
    case Quad.Point{+x,+y} Quad.Point{+xx,+yy}:
      linear_case(Bool.and(Bool.and(point(Quad.Point{x,y}),point(Quad.Point{xx,yy})),F32.is_ge(F32.add(F32.mul(F32.sub(xx,x),F32.sub(xx,x)),F32.mul(F32.sub(yy,y),F32.sub(yy,y))),0.0000152587890625)),Quad.Point{x,y},Quad.Point{xx,yy},stops,spread)

# Prepare a bounded elliptical radial gradient; radii must be >=1/256 pixel.
def radial_case(ok: Bool,x: F32,y: F32,rx: F32,ry: F32,stops: Stops,spread: Spread) -> Maybe<Brush>:
  match ok:
    case False{}: None{}
    case True{}: Some{Radial{x,y,F32.div(1.0,rx),F32.div(1.0,ry),stops,spread}}

# Explicit elliptical axes allow shared materials without a transform hierarchy.
def radial(+x: F32,+y: F32,+rx: F32,+ry: F32,stops: Stops,spread: Spread) -> Maybe<Brush>:
  radial_case(Bool.and(Bool.and(finite(x),finite(y)),Bool.and(Bool.and(F32.is_ge(rx,0.00390625),F32.is_le(rx,4096.0)),Bool.and(F32.is_ge(ry,0.00390625),F32.is_le(ry,4096.0)))),x,y,rx,ry,stops,spread)

# Sample a prepared brush at finite screen coordinates in the public domain.
def sample(brush: Brush,+x: F32,+y: F32) -> U32:
  match brush:
    case Solid{pixel}: pixel
    case Linear{xx,yy,+dx,+dy,inverse,stops,spread}:
      position(stops,spread,F32.mul(F32.add(F32.mul(F32.sub(x,xx),dx),F32.mul(F32.sub(y,yy),dy)),inverse))
    case Radial{xx,yy,ix,iy,stops,spread}:
      +dx = F32.mul(F32.sub(x,xx),ix)
      +dy = F32.mul(F32.sub(y,yy),iy)
      position(stops,spread,F32.sqrt(F32.add(F32.mul(dx,dx),F32.mul(dy,dy))))
