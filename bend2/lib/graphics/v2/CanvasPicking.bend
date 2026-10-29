# Picking for accepted CanvasPreview commands. Rectangles have integer F32
# origins and dimensions/source sizes at most 4096, as required by the host.
import Base
import ./CanvasPreview.bend as Preview
import ./RgbaSample.bend as Sample
import ../pixels/Pixel.bend as Pixel

type Layer is Data:
  Layer{left: F32,top: F32,width: U32,height: U32,depth: Nat,
    source_size: U32,mask: Image,label: U32}

type State is Data:
  State{layers: List<&2,Layer>}

def texture_at(textures: List<&2,Sample.Texture>,index: U32) ->
  Maybe<&2,Sample.Texture>:
  match textures index:
    case Nil{} _: None{}
    case texture <> rest 0: Some{texture}
    case texture <> rest _: texture_at(rest,U32.sub(index,1))

def prepare_texture(texture: Maybe<&2,Sample.Texture>,left: F32,top: F32,
  width: U32,height: U32,label: U32,acc: List<&2,Layer>) -> List<&2,Layer>:
  match texture:
    case None{}: acc
    case Some{Sample.Texture{depth,size,colors,mask}}:
      Layer{left,top,width,height,depth,size,mask,label} <> acc

def prepare_sprite(eligible: Bool,texture: U32,left: F32,top: F32,
  width: U32,height: U32,label: U32,textures: List<&2,Sample.Texture>,
  acc: List<&2,Layer>) -> List<&2,Layer>:
  match eligible:
    case False{}: acc
    case True{}:
      prepare_texture(texture_at(textures,texture),left,top,width,height,label,acc)

def prepare_command(command: Preview.Command,textures: List<&2,Sample.Texture>,
  acc: List<&2,Layer>) -> List<&2,Layer>:
  match command:
    case Preview.Sprite{texture,left,top,+width,+height,opacity,+label}:
      prepare_sprite(Bool.and(U32.is_ne(label,0),
        Bool.and(U32.is_ne(width,0),U32.is_ne(height,0))),
        texture,left,top,width,height,label,textures,acc)
    case _: acc

# Commands arrive back to front; prepending retains the frontmost layer first.
# Opacity does not affect labels, matching the displayed command label policy.
def prepare_layers(commands: List<&2,Preview.Command>,+textures: List<&2,Sample.Texture>,
  acc: List<&2,Layer>) -> State:
  match commands:
    case Nil{}: State{acc}
    case command <> rest:
      prepare_layers(rest,textures,prepare_command(command,textures,acc))

def prepare(commands: List<&2,Preview.Command>,textures: List<&2,Sample.Texture>) ->
  State:
  prepare_layers(commands,textures,[])

def sample_layer(inside: Bool,depth: Nat,+source_size: U32,width: U32,height: U32,
  left: F32,top: F32,x: U32,y: U32,mask: Image,label: U32) -> U32:
  match inside:
    case False{}: 0
    case True{}:
      +dx = F32.to_u32(F32.sub(U32.to_f32(x),left))
      +dy = F32.to_u32(F32.sub(U32.to_f32(y),top))
      +sx = U32.div(U32.mul(U32.add(U32.mul(2,dx),1),source_size),U32.mul(2,width))
      +sy = U32.div(U32.mul(U32.add(U32.mul(2,dy),1),source_size),U32.mul(2,height))
      +red = U32.and(U32.div(Pixel.sample_xy(depth,sx,sy,mask),65536),255)
      Bool.pick(U32,U32.is_ne(red,0),label,0)

def layer_at(layer: Layer,+x: U32,+y: U32) -> U32:
  match layer:
    case Layer{+left,+top,+width,+height,depth,+source_size,mask,label}:
      sample_layer(Bool.and(U32.is_ne(source_size,0),
        Bool.and(Bool.and(F32.is_ge(U32.to_f32(x),left),
          F32.is_lt(U32.to_f32(x),F32.add(left,U32.to_f32(width)))),
          Bool.and(F32.is_ge(U32.to_f32(y),top),
            F32.is_lt(U32.to_f32(y),F32.add(top,U32.to_f32(height)))))),
        depth,source_size,width,height,left,top,x,y,mask,label)

def layers_at(layers: List<&2,Layer>,+x: U32,+y: U32) -> U32:
  match layers:
    case Nil{}: 0
    case layer <> rest:
      +label = layer_at(layer,x,y)
      Bool.pick(U32 -> U32,U32.is_zero(label),
        _ => layers_at(rest,x,y),_ => label)(0)

def at(state: State,x: U32,y: U32) -> U32:
  match state:
    case State{layers}: layers_at(layers,x,y)

