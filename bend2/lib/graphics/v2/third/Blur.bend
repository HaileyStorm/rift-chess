# DRAFT separable box filter on canonical premultiplied RGBA surfaces.
# Horizontal then vertical; round each channel at EACH pass using (sum+k/2)/k.
# Fixed denominator k=2r+1, explicit Transparent or Clamp borders, radius<=128.
# Owned arrays never cross a parallel fork; this is an explicit preparation API.
import Base
import ./Premul.bend as P
import ./PixelBuffer.bend as Buffer
import ./Surface.bend as Surface
import ../Color.bend as Color

type Border is Data:
  Transparent{}
  Clamp{}

type Axis is Data:
  Horizontal{}
  Vertical{}

type Totals is Data:
  Totals{r: U32,g: U32,b: U32,a: U32}

type Initial is Type:
  Initial{source: Array<U32>,total: Totals}

type Step is Type:
  Step{source: Array<U32>,remove: U32,add: U32}

# Add one canonical pixel to a bounded 257-sample running sum.
def plus(total: Totals,+pixel: U32) -> Totals:
  match total:
    case Totals{r,g,b,a}: Totals{U32.add(r,Color.red(pixel)),U32.add(g,Color.green(pixel)),U32.add(b,Color.blue(pixel)),U32.add(a,P.alpha(pixel))}

# Remove an existing window member; sums cannot underflow on a valid scan.
def minus(total: Totals,+pixel: U32) -> Totals:
  match total:
    case Totals{r,g,b,a}: Totals{U32.sub(r,Color.red(pixel)),U32.sub(g,Color.green(pixel)),U32.sub(b,Color.blue(pixel)),U32.sub(a,P.alpha(pixel))}

# Round each nonnegative accumulated channel; channel<=alpha remains monotone.
def average(total: Totals,+width: U32) -> U32:
  match total:
    case Totals{r,g,b,a}:
      +half = U32.div(width,2)
      P.pack(U32.div(U32.add(r,half),width),U32.div(U32.add(g,half),width),U32.div(U32.add(b,half),width),U32.div(U32.add(a,half),width))

# Select an in-range Morton index for one scanline axis.
def index(axis: Axis,position: U32,line: U32) -> U32:
  match axis:
    case Horizontal{}: Buffer.index(position,line)
    case Vertical{}: Buffer.index(line,position)

# Read one owned array entry, or an explicit zero outside transparent borders.
def read(active: Bool,source: Array<U32>,index: U32) -> Array<U32> & U32:
  match active:
    case False{}: (source,0)
    case True{}: Array.get(U32,source,index)

# Border activity is separate from clamped addressing; no wrapped index is read.
def active(border: Border,inside: Bool) -> Bool:
  match border:
    case Transparent{}: inside
    case Clamp{}: True{}

# position uses a 4096 bias, sufficient for the supported radius/canvas domain.
def tap(source: Array<U32>,+size: U32,axis: Axis,line: U32,+position: U32,border: Border) -> Array<U32> & U32:
  read(active(border,Bool.and(U32.is_ge(position,4096),U32.is_lt(position,U32.add(4096,size)))),source,
    index(axis,U32.min(U32.sub(size,1),U32.sub(U32.max(position,4096),4096)),line))

# Scan the initial window. Matching the read result parameter preserves ownership.
def initial(fuel: Nat,result: Array<U32> & U32,+size: U32,+axis: Axis,+line: U32,
  +position: U32,+border: Border,total: Totals) -> Initial:
  match fuel:
    case 0n:
      (source,pixel) = result
      Initial{source,total}
    case 1n+rest:
      (source,pixel) = result
      initial(rest,tap(source,size,axis,line,U32.add(position,1),border),size,axis,line,U32.add(position,1),border,plus(total,pixel))

# Combine the two read values needed to advance one window.
def second(result: Array<U32> & U32,remove: U32) -> Step:
  (source,add) = result
  Step{source,remove,add}

# Read the incoming value after returning the outgoing value's array owner.
def first(result: Array<U32> & U32,size: U32,axis: Axis,line: U32,position: U32,border: Border) -> Step:
  (source,remove) = result
  second(tap(source,size,axis,line,position,border),remove)

# Each next window costs two reads, independent of radius.
def samples(source: Array<U32>,+size: U32,+axis: Axis,+line: U32,+x: U32,+radius: U32,+border: Border) -> Step:
  first(tap(source,size,axis,line,U32.sub(U32.add(x,4096),radius),border),size,axis,line,U32.add(U32.add(U32.add(x,4096),radius),1),border)

# One output scanline. The structurally shrinking fuel is independent of buffers.
def scan(fuel: Nat,step: Step,output: Array<U32>,+size: U32,+axis: Axis,+line: U32,+x: U32,
  +radius: U32,+border: Border,+total: Totals) -> Array<U32> & Array<U32>:
  match fuel step:
    case 0n Step{source,remove,add}: (source,output)
    case 1n+rest Step{source,remove,add}:
      scan(rest,samples(source,size,axis,line,U32.add(x,1),radius,border),
        Array.set(U32,output,index(axis,x,line),average(total,U32.add(U32.mul(radius,2),1))),
        size,axis,line,U32.add(x,1),radius,border,plus(minus(total,remove),add))

# Start a line only after its initial window has been accumulated.
def start(initial: Initial,output: Array<U32>,+size: U32,+axis: Axis,+line: U32,+radius: U32,+border: Border) -> Array<U32> & Array<U32>:
  match initial:
    case Initial{source,total}:
      scan(U32.to_nat(size),samples(source,size,axis,line,0,radius,border),output,size,axis,line,0,radius,border,total)

# Traverse every line, retaining source ownership and updating only the output.
def lines(fuel: Nat,state: Array<U32> & Array<U32>,+size: U32,+axis: Axis,+line: U32,+radius: U32,+border: Border) -> Array<U32> & Array<U32>:
  match fuel:
    case 0n: state
    case 1n+rest:
      (source,output) = state
      +position = U32.sub(4096,radius)
      next = start(initial(U32.to_nat(U32.add(U32.mul(radius,2),1)),tap(source,size,axis,line,position,border),size,axis,line,position,border,Totals{0,0,0,0}),output,size,axis,line,radius,border)
      lines(rest,next,size,axis,U32.add(line,1),radius,border)

# One separable axis; discard the old source owner after the full scan.
def axis(+depth: Nat,+size: U32,axis: Axis,radius: U32,border: Border,source: Array<U32>) -> Array<U32>:
  Pair.snd(Array<U32>,Array<U32>,lines(U32.to_nat(size),(source,Array.new(U32,Nat.add(depth,depth),0)),size,axis,0,radius,border))

# Reject an unsupported radius. Zero radius preserves the exact surface.
def box_case(valid: Bool,zero: Bool,surface: Surface.Surface,+radius: U32,+border: Border) -> Maybe<Surface.Surface>:
  match valid zero surface:
    case False{} _ _: None{}
    case True{} True{} _: Some{surface}
    case True{} False{} Surface.Surface{+depth,+size,pixels}:
      source = Buffer.from_image(depth,pixels)
      horizontal = axis(depth,size,Horizontal{},radius,border,source)
      vertical = axis(depth,size,Vertical{},radius,border,horizontal)
      Some{Surface.Surface{depth,size,Buffer.image(depth,vertical)}}

# Public exact box filter. This is not a Gaussian or a linear-light filter.
def box(surface: Surface.Surface,+radius: U32,border: Border) -> Maybe<Surface.Surface>:
  box_case(U32.is_le(radius,128),U32.is_zero(radius),surface,radius,border)
