# DRAFT encoded-channel premultiplied RGBA, packed 0xAARRGGBB.
# Separate from every legacy RGB Image/Color API. Canonical channels <= alpha.
# No linear-light/HDR claim; transparent canonical value is exactly zero.
import Base
import ../Color.bend as Color

type Mode is Data:
  Over{}
  Multiply{}
  Screen{}
  Plus{}
  SourceIn{}
  SourceOut{}
  Atop{}
  Xor{}

# Read the independent alpha byte, never legacy Image high-bit garbage.
def alpha(pixel: U32) -> U32:
  U32.shrn(pixel,24n)

# Round one nonnegative product divided by 255, with factors in 0..255.
def mul(a: U32,b: U32) -> U32:
  U32.div(U32.add(U32.mul(a,b),127),255)

# Pack/clamp channels to alpha, establishing a canonical premultiplied word.
def pack(r: U32,g: U32,b: U32,a: U32) -> U32:
  +aa = U32.min(a,255)
  U32.or(U32.shln(aa,24n),Color.rgb(U32.min(r,aa),U32.min(g,aa),U32.min(b,aa)))

# Convert straight encoded RGB once; hidden RGB at alpha zero is discarded.
def straight(+rgb: U32,opacity: U32) -> U32:
  +a = U32.min(opacity,255)
  pack(mul(Color.red(rgb),a),mul(Color.green(rgb),a),mul(Color.blue(rgb),a),a)

# Detect malformed host-created words without silently treating them as straight.
def valid(+pixel: U32) -> Bool:
  +a = alpha(pixel)
  Bool.and(Bool.and(U32.is_le(Color.red(pixel),a),U32.is_le(Color.green(pixel),a)),U32.is_le(Color.blue(pixel),a))

# Scale both alpha and premultiplied channels; this is isolated group opacity.
def scale(+pixel: U32,opacity: U32) -> U32:
  +a = U32.min(opacity,255)
  pack(mul(Color.red(pixel),a),mul(Color.green(pixel),a),mul(Color.blue(pixel),a),mul(alpha(pixel),a))

# Canonical unpremultiplication, used only at a straight-alpha boundary.
def unweight(zero: Bool,+pixel: U32,+a: U32) -> U32:
  match zero:
    case True{}: 0
    case False{}:
      Color.rgb(U32.min(255,U32.div(U32.add(U32.mul(Color.red(pixel),255),U32.div(a,2)),a)),
        U32.min(255,U32.div(U32.add(U32.mul(Color.green(pixel),255),U32.div(a,2)),a)),
        U32.min(255,U32.div(U32.add(U32.mul(Color.blue(pixel),255),U32.div(a,2)),a)))

# Unpremultiplication cannot recover quantized low-alpha source channels.
def rgb(+pixel: U32) -> U32:
  unweight(U32.is_zero(alpha(pixel)),pixel,alpha(pixel))

# Source-over alpha union, rounded once for the destination contribution.
def union(+sa: U32,da: U32) -> U32:
  U32.add(sa,mul(da,U32.sub(255,sa)))

# One channel of the specified encoded-space blend; maximum numerator < 2^18.
def channel(mode: Mode,+s: U32,+d: U32,+sa: U32,+da: U32) -> U32:
  match mode:
    case Over{}: U32.add(s,mul(d,U32.sub(255,sa)))
    case Multiply{}:
      U32.div(U32.add(U32.add(U32.mul(s,d),U32.add(U32.mul(s,U32.sub(255,da)),U32.mul(d,U32.sub(255,sa)))),127),255)
    case Screen{}: U32.sub(U32.add(s,d),mul(s,d))
    case Plus{}: U32.min(255,U32.add(s,d))
    case SourceIn{}: mul(s,da)
    case SourceOut{}: mul(s,U32.sub(255,da))
    case Atop{}: U32.div(U32.add(U32.add(U32.mul(s,da),U32.mul(d,U32.sub(255,sa))),127),255)
    case Xor{}: U32.div(U32.add(U32.add(U32.mul(s,U32.sub(255,da)),U32.mul(d,U32.sub(255,sa))),127),255)

# Alpha equations are independent of RGB blend modes.
def result_alpha(mode: Mode,+sa: U32,+da: U32) -> U32:
  match mode:
    case Over{}: union(sa,da)
    case Multiply{}: union(sa,da)
    case Screen{}: union(sa,da)
    case Plus{}: U32.min(255,U32.add(sa,da))
    case SourceIn{}: mul(sa,da)
    case SourceOut{}: mul(sa,U32.sub(255,da))
    case Atop{}: da
    case Xor{}: U32.div(U32.add(U32.add(U32.mul(sa,U32.sub(255,da)),U32.mul(da,U32.sub(255,sa))),127),255)

# Compose canonical words; final channel<=alpha clamping is part of this NEW API.
def blend(+mode: Mode,+source: U32,+destination: U32) -> U32:
  +sa = alpha(source)
  +da = alpha(destination)
  pack(channel(mode,Color.red(source),Color.red(destination),sa,da),
    channel(mode,Color.green(source),Color.green(destination),sa,da),
    channel(mode,Color.blue(source),Color.blue(destination),sa,da),result_alpha(mode,sa,da))

# Tint a premultiplied word without unpremultiplication; alpha is unchanged.
def tint(+pixel: U32,+color: U32) -> U32:
  pack(mul(Color.red(pixel),Color.red(color)),mul(Color.green(pixel),Color.green(color)),
    mul(Color.blue(pixel),Color.blue(color)),alpha(pixel))
