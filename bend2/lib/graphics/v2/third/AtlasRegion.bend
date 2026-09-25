# DRAFT rectangular atlas views. Clamp every filter tap to the selected region.
# Coordinates are half-open source pixels; an empty/outside region is rejected.
# This does not provide packing, trimming, rotation or cross-region mip generation.
import Base
import ../Rect.bend as Rect
import ../RgbaSample.bend as Sample

type View is Data:
  View{texture: Sample.Texture,left: U32,top: U32,width: U32,height: U32}

# Construct a view only after validating its entire rectangle against the atlas.
def make_case(valid: Bool,texture: Sample.Texture,box: Rect.Box) -> Maybe<View>:
  match valid box:
    case False{} _: None{}
    case True{} Rect.Box{+left,+top,right,bottom}:
      Some{View{texture,left,top,U32.sub(right,left),U32.sub(bottom,top)}}

# Source texture depth/size/image well-formedness remains a caller precondition.
def make(+texture: Sample.Texture,+box: Rect.Box) -> Maybe<View>:
  make_case(Bool.and(Bool.not(Rect.is_empty(box)),Rect.contains(Rect.screen(Sample.size(texture)),box)),texture,box)

# Nearest integer local texel lookup with independent rectangle-edge clamping.
def nearest(view: View,x: U32,y: U32) -> Sample.Texel:
  match view:
    case View{texture,left,top,width,height}:
      Sample.nearest(texture,U32.add(left,U32.min(x,U32.sub(width,1))),U32.add(top,U32.min(y,U32.sub(height,1))))

# The final adjacent texel on each axis clamps to this view, not its neighbors.
def linear(+view: View,+x: U32,+y: U32,fx: U32,fy: U32) -> Sample.Texel:
  Sample.mix(nearest(view,x,y),nearest(view,U32.add(U32.min(x,4095),1),y),
    nearest(view,x,U32.add(U32.min(y,4095),1)),
    nearest(view,U32.add(U32.min(x,4095),1),U32.add(U32.min(y,4095),1)),fx,fy)

# Decode two axis records before filtering; UV arguments must be finite.
def linear_axes(view: View,x: Sample.Axis,y: Sample.Axis) -> Sample.Texel:
  match x y:
    case Sample.Axis{ix,fx} Sample.Axis{iy,fy}: linear(view,ix,iy,fx,fy)

# UV=0/1 addresses region edge centers; fraction precision is the existing Q8 rule.
def uv(filter: Sample.Filter,+view: View,u: F32,v: F32) -> Sample.Texel:
  match filter view:
    case Sample.Nearest{} View{texture,left,top,+width,+height}:
      Sample.nearest(texture,U32.add(left,U32.min(U32.sub(width,1),F32.to_u32(F32.mul(F32.clamp(u,0.0,1.0),U32.to_f32(width))))),
        U32.add(top,U32.min(U32.sub(height,1),F32.to_u32(F32.mul(F32.clamp(v,0.0,1.0),U32.to_f32(height))))))
    case Sample.Linear{} View{texture,left,top,+width,+height}:
      linear_axes(View{texture,left,top,width,height},Sample.axis(u,width),Sample.axis(v,height))
