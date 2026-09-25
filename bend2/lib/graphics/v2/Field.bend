# DRAFT deterministic tileable value-noise materials, prepared outside frames.
# Coordinates are unsigned q8 lattice units. Integer fade/interpolation avoids
# floating back-end drift. period clamps 1..256; octaves clamp 1..8. A sample
# at coordinate x+period*256 is identical when the coordinate addition fits U32.
# This is band-limited-at-preparation value noise, NOT a physical BRDF or an
# analytic anti-aliasing claim. Generate mips before minifying the result.
import Base
import ./Texture.bend as Texture
import ./Ramp.bend as Ramp
import ./ImageOps.bend as Ops

type Recipe is Data:
  Recipe{seed: U32,period: U32,octaves: Nat}

def period(recipe: Recipe) -> U32:
  match recipe:
    case Recipe{seed,period,octaves}: U32.max(1,U32.min(period,256))

# Cubic smoothstep quantized to q8: maximum numerator <2^25.
def fade(t: U32) -> U32:
  +x = U32.min(t,256)
  U32.div(U32.add(U32.mul(U32.mul(x,x),U32.sub(768,U32.mul(x,2))),32768),65536)

def mix(a: U32,b: U32,+weight: U32) -> U32:
  U32.div(U32.add(U32.add(U32.mul(a,U32.sub(256,weight)),U32.mul(b,weight)),128),256)

def vertex(x: U32,y: U32,seed: U32) -> U32:
  U32.and(Texture.hash(x,y,seed),65535)

def value(+x: U32,+y: U32,+period: U32,+seed: U32) -> U32:
  +ix = U32.mod(U32.div(x,256),period)
  +iy = U32.mod(U32.div(y,256),period)
  +jx = U32.mod(U32.add(ix,1),period)
  +jy = U32.mod(U32.add(iy,1),period)
  +fx = fade(U32.mod(x,256))
  +fy = fade(U32.mod(y,256))
  mix(mix(vertex(ix,iy,seed),vertex(jx,iy,seed),fx),
    mix(vertex(ix,jy,seed),vertex(jx,jy,seed),fx),fy)

# Wrapped coordinates are doubled only after reducing below period*256;
# weights 128..1 total <=255, so accumulated 16-bit values remain within U32.
def fractal(levels: Nat,+x: U32,+y: U32,+period: U32,+seed: U32,
  +weight: U32,total: U32,+weight_sum: U32) -> U32:
  match levels:
    case 0n: U32.div(U32.add(total,U32.div(weight_sum,2)),weight_sum)
    case 1n+rest:
      +modulus = U32.mul(period,256)
      fractal(rest,U32.mod(U32.mul(U32.mod(x,modulus),2),modulus),
        U32.mod(U32.mul(U32.mod(y,modulus),2),modulus),period,U32.add(seed,1013904223),
        U32.div(weight,2),U32.add(total,U32.mul(value(x,y,period,seed),weight)),U32.add(weight_sum,weight))

def sample(recipe: Recipe,x: U32,y: U32) -> U32:
  match recipe:
    case Recipe{seed,period,octaves}:
      fractal(Nat.max(1n,Nat.min(octaves,8n)),x,y,U32.max(1,U32.min(period,256)),seed,128,0,0)

# Pixel centers cover exactly one fundamental period. Extent<=4096,
# period<=256 keeps (2*x+1)*period*256 within U32.
def coordinate(index: U32,extent: U32,period: U32) -> U32:
  U32.div(U32.mul(U32.add(U32.mul(index,2),1),U32.mul(period,256)),U32.mul(extent,2))

def tree(+depth: Nat,+size: U32,+x: U32,+y: U32,+extent: U32,
  +recipe: Recipe,+ramp: Ramp.Table) -> Image:
  match depth:
    case 0n: Pix{Ramp.lookup(ramp,sample(recipe,coordinate(x,extent,period(recipe)),coordinate(y,extent,period(recipe))))}
    case 1n+rest:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      a = tree(rest,h,x,y,extent,recipe,ramp)
      b = tree(rest,h,xx,y,extent,recipe,ramp)
      c = tree(rest,h,x,yy,extent,recipe,ramp)
      d = tree(rest,h,xx,yy,extent,recipe,ramp)
      Ops.quad(a,b,c,d)

# Cap preparation at 512x512 to avoid an accidentally enormous material bake.
def bake(+levels: Nat,recipe: Recipe,ramp: Ramp.Table) -> Image:
  +depth = Nat.min(levels,9n)
  +size = U32.shln(1,depth)
  tree(depth,size,0,0,size,recipe,ramp)
