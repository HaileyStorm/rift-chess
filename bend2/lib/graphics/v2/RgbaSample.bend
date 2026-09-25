# DRAFT encoded-channel straight RGB + red-alpha sampling. Bilinear weights
# are 8-bit fractions and accumulate premultiplied channels before unweighting.
# This is alpha-weighted filtering, NOT linear-light/HDR or gamma correction.
import Base
import ../pixels/Pixel.bend as Pixel
import ./Color.bend as Color
import ./AffineTexture.bend as AffineTexture
import ./Gather.bend as Gather

type Texture is Data:
  Texture{depth: Nat,size: U32,colors: Image,mask: Image}

type Texel is Data:
  Texel{color: U32,alpha: U32}

type Filter is Data:
  Nearest{}
  Linear{}

type Axis is Data:
  Axis{index: U32,fraction: U32}

def size(texture: Texture) -> U32:
  match texture:
    case Texture{depth,size,colors,mask}: size

def color(texel: Texel) -> U32:
  match texel:
    case Texel{color,alpha}: color

def alpha(texel: Texel) -> U32:
  match texel:
    case Texel{color,alpha}: alpha

def nearest_valid(valid: Bool, texture: Texture, x: U32, y: U32) -> Texel:
  match valid texture:
    case False{} _: Texel{0,0}
    case True{} Texture{+depth,+size,colors,mask}:
      +xx = U32.min(x,U32.sub(size,1))
      +yy = U32.min(y,U32.sub(size,1))
      Texel{Pixel.sample_xy(depth,xx,yy,colors),Color.red(Pixel.sample_xy(depth,xx,yy,mask))}

def nearest(+texture: Texture, x: U32, y: U32) -> Texel:
  nearest_valid(U32.is_ne(size(texture),0),texture,x,y)

def sum4(a: U32,b: U32,c: U32,d: U32) -> U32:
  U32.add(U32.add(a,b),U32.add(c,d))

def weighted(+sum: U32,a: U32,b: U32,c: U32,d: U32,
  wa: U32,wb: U32,wc: U32,wd: U32) -> U32:
  U32.div(U32.add(sum4(U32.mul(a,wa),U32.mul(b,wb),U32.mul(c,wc),U32.mul(d,wd)),U32.div(sum,2)),sum)

# sum(weights)=65536. sum(alpha*weights)<=16,711,680. Including rounding,
# the largest weighted-channel numerator is 4,269,834,240 < 2^32.
def finish(empty: Bool, coverage: U32, +total: U32,
  +a: U32,+b: U32,+c: U32,+d: U32,
  +wa: U32,+wb: U32,+wc: U32,+wd: U32) -> Texel:
  match empty:
    case True{}: Texel{0,0}
    case False{}:
      Texel{Color.rgb(
        weighted(total,Color.red(a),Color.red(b),Color.red(c),Color.red(d),wa,wb,wc,wd),
        weighted(total,Color.green(a),Color.green(b),Color.green(c),Color.green(d),wa,wb,wc,wd),
        weighted(total,Color.blue(a),Color.blue(b),Color.blue(c),Color.blue(d),wa,wb,wc,wd)),coverage}

def mix_weights(a: Texel,b: Texel,c: Texel,d: Texel,
  wa: U32,wb: U32,wc: U32,wd: U32) -> Texel:
  match a b c d:
    case Texel{ac,aa} Texel{bc,ba} Texel{cc,ca} Texel{dc,da}:
      +aw = U32.mul(wa,aa)
      +bw = U32.mul(wb,ba)
      +cw = U32.mul(wc,ca)
      +dw = U32.mul(wd,da)
      +total = sum4(aw,bw,cw,dw)
      +coverage = U32.div(U32.add(total,32768),65536)
      finish(U32.is_zero(coverage),coverage,total,ac,bc,cc,dc,aw,bw,cw,dw)

def mix(a: Texel,b: Texel,c: Texel,d: Texel,fx: U32,fy: U32) -> Texel:
  +x = U32.min(fx,255)
  +y = U32.min(fy,255)
  +ix = U32.sub(256,x)
  +iy = U32.sub(256,y)
  mix_weights(a,b,c,d,U32.mul(ix,iy),U32.mul(x,iy),U32.mul(ix,y),U32.mul(x,y))

def mix_gather(colors: Gather.Four,mask: Gather.Four,fx: U32,fy: U32) -> Texel:
  match colors mask:
    case Gather.Four{a,b,c,d} Gather.Four{aa,bb,cc,dd}:
      mix(Texel{a,Color.red(aa)},Texel{b,Color.red(bb)},Texel{c,Color.red(cc)},Texel{d,Color.red(dd)},fx,fy)

# Four adjacent samples share their source prefix, instead of four independent
# root-to-leaf walks. This is exact integer sampling, not an approximation.
def linear(texture: Texture,+x: U32,+y: U32,fx: U32,fy: U32) -> Texel:
  match texture:
    case Texture{+depth,+size,colors,mask}:
      mix_gather(Gather.neighbors(depth,size,x,y,colors),Gather.neighbors(depth,size,x,y,mask),fx,fy)

# UV=0 and UV=1 clamp to source edge centers. F32 UVs must be finite.
# Integer filtering fractions are floor(clamped_fraction*256), never 256.
def axis(value: F32,+size: U32) -> Axis:
  +position = F32.clamp(F32.sub(F32.mul(value,U32.to_f32(size)),0.5),
    0.0,U32.to_f32(U32.sub(U32.max(size,1),1)))
  +index = F32.to_u32(position)
  Axis{index,U32.min(255,F32.to_u32(F32.mul(F32.sub(position,U32.to_f32(index)),256.0)))}

def linear_axes(texture: Texture,x: Axis,y: Axis) -> Texel:
  match x y:
    case Axis{ix,fx} Axis{iy,fy}: linear(texture,ix,iy,fx,fy)

def uv(filter: Filter,+texture: Texture,u: F32,v: F32) -> Texel:
  match filter:
    case Nearest{}:
      nearest(texture,AffineTexture.texel(u,size(texture)),AffineTexture.texel(v,size(texture)))
    case Linear{}: linear_axes(texture,axis(u,size(texture)),axis(v,size(texture)))
