# DRAFT isolated transparent surfaces; immutable 0xAARRGGBB premultiplied pixels.
# Public depth<=12, size=2^depth and canonical well-formed Image are preconditions.
# Never pass these pixels directly to a legacy RGB/straight-alpha API.
import Base
import ./Premul.bend as P
import ../ImageOps.bend as Ops
import ../RgbaSample.bend as Sample
import ../Color.bend as Color

type Surface is Data:
  Surface{depth: Nat,size: U32,pixels: Image}

# Make a canonical transparent surface without allocating individual pixels.
def blank(+depth: Nat) -> Surface:
  Surface{depth,U32.shln(1,depth),Pix{0}}

# Read image pixels at the explicit representation boundary.
def pixels(surface: Surface) -> Image:
  match surface:
    case Surface{depth,size,pixels}: pixels

# Read the square extent used for same-size composition validation.
def size(surface: Surface) -> U32:
  match surface:
    case Surface{depth,size,pixels}: size

# Convert independent legacy color/red-mask trees, collapsing uniform blocks.
def from_planes(+depth: Nat,+colors: Image,+mask: Image) -> Image:
  match depth colors mask:
    case _ Pix{color} Pix{alpha}: Pix{P.straight(color,Color.red(alpha))}
    case 0n _ _: Pix{0}
    case 1n+rest _ _:
      a = from_planes(rest,Ops.tl(colors),Ops.tl(mask))
      b = from_planes(rest,Ops.tr(colors),Ops.tr(mask))
      c = from_planes(rest,Ops.bl(colors),Ops.bl(mask))
      d = from_planes(rest,Ops.br(colors),Ops.br(mask))
      Ops.quad(a,b,c,d)

# Ingest existing straight-alpha textures without reinterpreting their color bytes.
def from_texture(texture: Sample.Texture) -> Surface:
  match texture:
    case Sample.Texture{+depth,size,colors,mask}: Surface{depth,size,from_planes(depth,colors,mask)}

# Build a colored coverage surface from a red-only legacy mask.
def masked(+depth: Nat,size: U32,color: U32,mask: Image) -> Surface:
  Surface{depth,size,from_planes(depth,Pix{color},mask)}

# Apply group opacity after children have already been composited.
def opacity_tree(+depth: Nat,image: Image,+opacity: U32) -> Image:
  match depth image:
    case _ Pix{pixel}: Pix{P.scale(pixel,opacity)}
    case 0n Qua{a,b,c,d}: Pix{0}
    case 1n+rest Qua{a,b,c,d}:
      aa = opacity_tree(rest,a,opacity)
      bb = opacity_tree(rest,b,opacity)
      cc = opacity_tree(rest,c,opacity)
      dd = opacity_tree(rest,d,opacity)
      Ops.quad(aa,bb,cc,dd)

# Exact structural endpoints; values>=255 mean unchanged full group opacity.
def opacity_case(zero: Bool,full: Bool,surface: Surface,opacity: U32) -> Surface:
  match zero full surface:
    case True{} _ Surface{depth,size,pixels}: Surface{depth,size,Pix{0}}
    case False{} True{} _: surface
    case False{} False{} Surface{+depth,size,pixels}: Surface{depth,size,opacity_tree(depth,pixels,opacity)}

# Scale a complete isolated layer, not each of its former drawing commands.
def opacity(surface: Surface,+value: U32) -> Surface:
  opacity_case(U32.is_zero(value),U32.is_ge(value,255),surface,value)

# Sequential zipper; disjoint higher-level regions may be forked by the caller.
def merge_tree(+depth: Nat,+mode: P.Mode,+source: Image,+destination: Image) -> Image:
  match depth source destination:
    case _ Pix{a} Pix{b}: Pix{P.blend(mode,a,b)}
    case 0n _ _: destination
    case 1n+rest _ _:
      a = merge_tree(rest,mode,Ops.tl(source),Ops.tl(destination))
      b = merge_tree(rest,mode,Ops.tr(source),Ops.tr(destination))
      c = merge_tree(rest,mode,Ops.bl(source),Ops.bl(destination))
      d = merge_tree(rest,mode,Ops.br(source),Ops.br(destination))
      Ops.quad(a,b,c,d)

# Reject mismatched extents; no implicit resizing or canvas policy.
def merge_case(valid: Bool,mode: P.Mode,source: Surface,destination: Surface) -> Maybe<Surface>:
  match valid source destination:
    case False{} _ _: None{}
    case True{} Surface{depth,size,source} Surface{+dd,ds,dest}:
      Some{Surface{dd,ds,merge_tree(dd,mode,source,dest)}}

# Both inputs must be internally well-formed, with matching depth/size metadata.
def merge(mode: P.Mode,+source: Surface,+destination: Surface) -> Maybe<Surface>:
  merge_case(U32.is_eq(size(source),size(destination)),mode,source,destination)

# Extract straight RGB or legacy red-alpha mask. This is an explicit conversion.
def plane(+depth: Nat,image: Image,+mask: Bool) -> Image:
  match depth image mask:
    case _ Pix{pixel} True{}: Pix{U32.shln(P.alpha(pixel),16n)}
    case _ Pix{pixel} False{}: Pix{P.rgb(pixel)}
    case 0n Qua{a,b,c,d} _: Pix{0}
    case 1n+rest Qua{a,b,c,d} _:
      aa = plane(rest,a,mask)
      bb = plane(rest,b,mask)
      cc = plane(rest,c,mask)
      dd = plane(rest,d,mask)
      Ops.quad(aa,bb,cc,dd)

# Return an existing-library texture; low-alpha quantization is irreversible.
def texture(surface: Surface) -> Sample.Texture:
  match surface:
    case Surface{+depth,size,+pixels}: Sample.Texture{depth,size,plane(depth,pixels,False{}),plane(depth,pixels,True{})}

# Flatten a surface onto opaque RGB with this surface API's PMA rounding rule.
def flatten_tree(+depth: Nat,+source: Image,+background: Image) -> Image:
  match depth source background:
    case _ Pix{source} Pix{background}:
      Pix{U32.and(P.blend(P.Over{},source,U32.or(background,4278190080)),16777215)}
    case 0n _ _: background
    case 1n+rest _ _:
      a = flatten_tree(rest,Ops.tl(source),Ops.tl(background))
      b = flatten_tree(rest,Ops.tr(source),Ops.tr(background))
      c = flatten_tree(rest,Ops.bl(source),Ops.bl(background))
      d = flatten_tree(rest,Ops.br(source),Ops.br(background))
      Ops.quad(a,b,c,d)

# Background must be a same-depth well-formed legacy RGB Image.
def flatten(surface: Surface,background: Image) -> Image:
  match surface:
    case Surface{depth,size,pixels}: flatten_tree(depth,pixels,background)
