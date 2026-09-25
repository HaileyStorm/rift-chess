# DRAFT native-resolution positioned glyph groups on isolated PMA surfaces.
# Shares existing Glyph.Mask/Placed metrics and signed bearings. No shaping,
# implicit line layout, font selection, hinting or low-resolution upscaling.
# Prepare once, then apply group opacity, recolor, halo, blend and image shifts.
import Base
import ../Glyph.bend as Glyph
import ../Shapes.bend as Shapes
import ../Rect.bend as Rect
import ./PreparedSprite.bend as Cached
import ./Premul.bend as P
import ./Surface.bend as Surface

# Convert already clipped/aligned legacy glyph coverage at the explicit boundary.
def composite(patch: Cached.Patch,+depth: Nat,target: Image) -> Image:
  match patch:
    case Cached.Patch{patch_depth,size,bounds,colors,mask}:
      Surface.merge_tree(depth,P.Over{},Surface.from_planes(depth,colors,mask),target)

# Existing signed bearings are relative to the placed baseline/origin.
def glyph(placed: Glyph.Placed,+depth: Nat,+size: U32,color: U32,clip: Rect.Box,target: Image) -> Image:
  match placed:
    case Glyph.Placed{x,y,Glyph.Mask{advance,left,top,source_depth,source_size,coverage}}:
      composite(Cached.prepare(depth,size,source_depth,source_size,Glyph.translate(x,left),Glyph.translate(y,top),Pix{color},coverage,clip),depth,target)

# Glyph order is preserved, including overlapping glyphs and negative bearings.
def run(glyphs: List<&2,Glyph.Placed>,+depth: Nat,+size: U32,+color: U32,+clip: Rect.Box,target: Image) -> Image:
  match glyphs:
    case Nil{}: target
    case Con{head,tail}: run(tail,depth,size,color,clip,glyph(head,depth,size,color,clip,target))

# Return a reusable isolated group. Apply Surface.opacity AFTER this constructor
# for true group opacity instead of per-glyph rounding or darkened overlaps.
def prepare(glyphs: List<&2,Glyph.Placed>,+depth: Nat,color: U32,clip: Rect.Box) -> Surface.Surface:
  +size = U32.shln(1,depth)
  Surface.Surface{depth,size,run(glyphs,depth,size,color,clip,Pix{0})}
