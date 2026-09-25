# DRAFT painter-ordered immutable fills, sprites, mapped RGBA, skins and strokes.
# A command owns immutable source Data; no host callbacks, arrays or UI policy.
import Base
import ./Rect.bend as Rect
import ./Clip.bend as Clip
import ./Shapes.bend as Shapes
import ./ImageView.bend as ImageView
import ./MaskedLayer.bend as MaskedLayer
import ./ClippedStamp.bend as ClippedStamp
import ./RgbaAffine.bend as Affine
import ./RgbaSample.bend as Sample
import ./Stroke.bend as Stroke
import ./NineSlice.bend as Skin

type Command is Data:
  Noop{}
  Fill{bounds: Rect.Box, color: U32, opacity: U32}
  Sprite{bounds: Rect.Box, colors: ImageView.View, mask: ImageView.View, opacity: U32}
  Mapped{bounds: Rect.Box,geometry: Affine.Geometry,texture: Sample.Texture,filter: Sample.Filter,opacity: U32}

  Stroked{bounds: Rect.Box,path: Stroke.Path,ink: U32,opacity: U32}
  Skinned{bounds: Rect.Box,rect: Rect.Box,texture: Sample.Texture,insets: Skin.Insets,opacity: U32}

type Selection is Data:
  Selection{commands: List<&2,Command>, covered: Bool}

def bounds(command: Command) -> Rect.Box:
  match command:
    case Noop{}: Rect.empty()
    case Fill{bounds,color,opacity}: bounds
    case Sprite{bounds,colors,mask,opacity}: bounds
    case Mapped{bounds,geometry,texture,filter,opacity}: bounds
    case Stroked{bounds,path,ink,opacity}: bounds
    case Skinned{bounds,rect,texture,insets,opacity}: bounds

def visible(+command: Command, region: Rect.Box) -> Bool:
  Rect.overlaps(bounds(command),region)

# Only a full-opacity solid fill proves complete occlusion. In particular,
# never infer opacity from one nonuniform sprite sample or reorder alpha draws.
def opaque(command: Command, region: Rect.Box) -> Bool:
  match command:
    case Noop{}: False{}
    case Fill{bounds,color,opacity}:
      Bool.and(U32.is_ge(opacity,255),Rect.contains(bounds,region))
    case Sprite{bounds,colors,mask,opacity}: False{}
    case Mapped{bounds,geometry,texture,filter,opacity}: False{}
    case Stroked{bounds,path,ink,opacity}: False{}
    case Skinned{bounds,rect,texture,insets,opacity}: False{}

def fill_case(valid: Bool, bounds: Rect.Box, color: U32, opacity: U32) -> Command:
  match valid:
    case False{}: Noop{}
    case True{}: Fill{bounds,color,opacity}

def fill(+bounds: Rect.Box, color: U32, +opacity: U32) -> Command:
  fill_case(Bool.and(Bool.not(Rect.is_empty(bounds)),U32.is_ne(opacity,0)),bounds,color,opacity)

def sprite_case(valid: Bool, bounds: Rect.Box, colors: ImageView.View,
  mask: ImageView.View, opacity: U32) -> Command:
  match valid:
    case False{}: Noop{}
    case True{}: Sprite{bounds,colors,mask,opacity}

def sprite(+canvas_size: U32, +source_depth: Nat, +source_size: U32,
  +left: Shapes.Coord, +top: Shapes.Coord, colors: Image, +mask: Image,
  +opacity: U32, clip: Rect.Box) -> Command:
  +box = Rect.intersect(clip,Rect.sprite(canvas_size,left,top,source_size))
  sprite_case(Bool.and(Bool.not(Rect.is_empty(box)),
      Bool.and(U32.is_ne(opacity,0),Bool.not(MaskedLayer.transparent(mask)))),
    box,ImageView.View{source_depth,source_size,Shapes.biased(left),Shapes.biased(top),colors},
    ImageView.View{source_depth,source_size,Shapes.biased(left),Shapes.biased(top),mask},opacity)

def mapped_case(valid: Bool,bounds: Rect.Box,geometry: Affine.Geometry,
  texture: Sample.Texture,filter: Sample.Filter,opacity: U32) -> Command:
  match valid:
    case False{}: Noop{}
    case True{}: Mapped{bounds,geometry,texture,filter,opacity}

# Geometry can be reused across frames and textures; source pixels remain Data.
def mapped(+geometry: Affine.Geometry,+texture: Sample.Texture,filter: Sample.Filter,
  +opacity: U32,clip: Rect.Box) -> Command:
  +box = Rect.intersect(clip,Affine.bounds(geometry))
  mapped_case(Bool.and(Bool.not(Rect.is_empty(box)),Bool.and(U32.is_ne(opacity,0),
    U32.is_ne(Sample.size(texture),0))),box,geometry,texture,filter,opacity)

def stroke_case(valid: Bool,bounds: Rect.Box,path: Stroke.Path,ink: U32,opacity: U32) -> Command:
  match valid:
    case False{}: Noop{}
    case True{}: Stroked{bounds,path,ink,opacity}

def stroke(+path: Stroke.Path,ink: U32,+opacity: U32,clip: Rect.Box) -> Command:
  +box = Rect.intersect(clip,Stroke.bounds(path))
  stroke_case(Bool.and(Bool.not(Rect.is_empty(box)),U32.is_ne(opacity,0)),box,path,ink,opacity)

def skin_case(valid: Bool,bounds: Rect.Box,rect: Rect.Box,texture: Sample.Texture,
  insets: Skin.Insets,opacity: U32) -> Command:
  match valid:
    case False{}: Noop{}
    case True{}: Skinned{bounds,rect,texture,insets,opacity}

def skin(+rect: Rect.Box,+texture: Sample.Texture,+insets: Skin.Insets,
  +opacity: U32,clip: Rect.Box) -> Command:
  +box = Rect.intersect(rect,clip)
  skin_case(Bool.and(Skin.valid(rect,texture,insets,opacity),Bool.not(Rect.is_empty(box))),box,rect,texture,insets,opacity)

def selection_add(keep: Bool, +command: Command, commands: List<&2,Command>,
  region: Rect.Box) -> Selection:
  match keep:
    case False{}: Selection{commands,False{}}
    case True{}: Selection{Con{command,commands},opaque(command,region)}

# Working from the back preserves order and drops only commands behind a
# certified full-tile overwrite. Allocation happens during preparation, not pixels.
def selection_cons(+command: Command, selection: Selection, +region: Rect.Box) -> Selection:
  match selection:
    case Selection{commands,True{}}: Selection{commands,True{}}
    case Selection{commands,False{}}:
      selection_add(visible(command,region),command,commands,region)

def select(commands: List<&2,Command>, +region: Rect.Box) -> Selection:
  match commands:
    case Nil{}: Selection{Nil{},False{}}
    case Con{command,rest}: selection_cons(command,select(rest,region),region)

def selected(selection: Selection) -> List<&2,Command>:
  match selection:
    case Selection{commands,covered}: commands

def filter(commands: List<&2,Command>, region: Rect.Box) -> List<&2,Command>:
  selected(select(commands,region))

def draw_one(command: Command, +depth: Nat, +size: U32,
  +x: U32, +y: U32, target: Image) -> Image:
  match command:
    case Noop{}: target
    case Stroked{+bounds,path,ink,opacity}:
      Stroke.region(depth,size,x,y,Bool.not(Rect.overlaps(bounds,Rect.cell(x,y,size))),path,bounds,ink,opacity,target)
    case Skinned{+bounds,rect,texture,insets,opacity}:
      Skin.region(depth,size,x,y,Bool.not(Rect.overlaps(bounds,Rect.cell(x,y,size))),rect,bounds,insets,texture,opacity,target)
    case Mapped{bounds,geometry,texture,filter,opacity}:
      Affine.region_geometry(geometry,depth,size,x,y,texture,filter,opacity,bounds,target)
    case Fill{bounds,color,opacity}: Clip.fill_region(depth,size,x,y,bounds,color,opacity,target)
    case Sprite{+bounds,colors,mask,opacity}:
      ClippedStamp.region(depth,size,x,y,Bool.not(Rect.overlaps(bounds,Rect.cell(x,y,size))),
        Rect.contains(bounds,Rect.cell(x,y,size)),bounds,colors,mask,opacity,target)

def render(commands: List<&2,Command>, +depth: Nat, +size: U32,
  +x: U32, +y: U32, target: Image) -> Image:
  match commands:
    case Nil{}: target
    case Con{command,rest}:
      render(rest,depth,size,x,y,draw_one(command,depth,size,x,y,target))
