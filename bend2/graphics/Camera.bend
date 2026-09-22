import Base
import ../core/Model.bend as Model

# A view is the small, serializable camera control surface.  Basis caches the
# trigonometric values used by both the renderer and input path so they cannot
# drift apart at a call site.
type View is Data:
  View{yaw: U32, pitch: U32, zoom: U32}

type Basis is Data:
  Basis{cosYaw: F32, sinYaw: F32, sinPitch: F32, cosPitch: F32,
    scale: F32, cx: F32, cy: F32}

def default_view() -> View:
  View{0, 65, 100}

def normalize(view: View) -> View:
  match view:
    case View{yaw, pitch, zoom}:
      View{U32.mod(yaw, 360), U32.clamp(pitch, 35, 90), U32.clamp(zoom, 75, 115)}

def radians(degrees: U32) -> F32:
  F32.mul(U32.to_f32(degrees), F32.div(F32.pi(), 180.0))

def basis.normalized(normalized: View) -> Basis:
  match normalized:
    case View{yaw, pitch, zoom}:
      +yaw_angle = radians(yaw)
      +pitch_angle = radians(pitch)
      +cos_yaw = F32.cos(yaw_angle)
      +sin_yaw = F32.sin(yaw_angle)
      +sin_pitch = F32.sin(pitch_angle)
      +cos_pitch = F32.cos(pitch_angle)
      +axis = F32.add(F32.abs(cos_yaw), F32.abs(sin_yaw))
      +base_scale = F32.div(360.0, F32.mul(8.0, axis))
      +scale = F32.div(F32.mul(base_scale, U32.to_f32(zoom)), 100.0)
      Basis{cos_yaw, sin_yaw, sin_pitch, cos_pitch, scale, 256.0, 274.0}

def basis(view: View) -> Basis:
  basis.normalized(normalize(view))

def project_x(basis: Basis, file: F32, row: F32) -> F32:
  match basis:
    case Basis{+cos_yaw, +sin_yaw, sin_pitch, cos_pitch, +scale, cx, cy}:
      +df = F32.sub(file, 3.5)
      +dr = F32.sub(row, 3.5)
      +horizontal = F32.sub(F32.mul(cos_yaw, df), F32.mul(sin_yaw, dr))
      F32.add(cx, F32.mul(scale, horizontal))

def project_y(basis: Basis, file: F32, row: F32) -> F32:
  match basis:
    case Basis{cos_yaw, sin_yaw, sin_pitch, cos_pitch, scale, cx, cy}:
      +df = F32.sub(file, 3.5)
      +dr = F32.sub(row, 3.5)
      +vertical = F32.add(F32.mul(sin_yaw, df), F32.mul(cos_yaw, dr))
      F32.add(cy, F32.mul(F32.mul(scale, sin_pitch), vertical))

def displayed_row(square: U32) -> U32:
  U32.sub(7, Model.rank_of(square))

def pixel(a: F32) -> U32:
  F32.to_u32(F32.max(F32.round(a), 0.0))

def center_x(+square: U32, basis: Basis) -> U32:
  pixel(project_x(basis, U32.to_f32(Model.file_of(square)),
    U32.to_f32(displayed_row(square))))

def center_y(+square: U32, basis: Basis) -> U32:
  pixel(project_y(basis, U32.to_f32(Model.file_of(square)),
    U32.to_f32(displayed_row(square))))

def inverse_file(cos_yaw: F32, sin_yaw: F32, dx: F32, dy: F32) -> F32:
  F32.add(3.5, F32.add(F32.mul(cos_yaw, dx), F32.mul(sin_yaw, dy)))

def inverse_row(cos_yaw: F32, sin_yaw: F32, dx: F32, dy: F32) -> F32:
  F32.add(3.5, F32.add(F32.mul(F32.neg(sin_yaw), dx), F32.mul(cos_yaw, dy)))

def square_at(+x: U32, +y: U32, basis: Basis) -> U32:
  match basis:
    case Basis{+cos_yaw, +sin_yaw, sin_pitch, cos_pitch, +scale, cx, cy}:
      +inside_image = Bool.and(U32.is_lt(x, 512), U32.is_lt(y, 512))
      +screen_x = U32.to_f32(x)
      +screen_y = U32.to_f32(y)
      +dx = F32.div(F32.sub(screen_x, cx), scale)
      +dy = F32.div(F32.sub(screen_y, cy), F32.mul(scale, sin_pitch))
      +file = inverse_file(cos_yaw, sin_yaw, dx, dy)
      +row = inverse_row(cos_yaw, sin_yaw, dx, dy)
      +file_floor = F32.floor(F32.add(file, 0.5))
      +row_floor = F32.floor(F32.add(row, 0.5))
      +inside_board = Bool.and(Bool.and(F32.is_ge(file, F32.neg(0.5)), F32.is_lt(file, 7.5)),
        Bool.and(F32.is_ge(row, F32.neg(0.5)), F32.is_lt(row, 7.5)))
      +inside = Bool.and(inside_image, inside_board)
      Bool.pick(U32, inside,
        Model.sq(F32.to_u32(file_floor), U32.sub(7, F32.to_u32(row_floor))), 64)

type DepthKey is Data:
  DepthKey{square: U32, y: U32}

def depth_key(+square: U32, basis: Basis) -> DepthKey:
  DepthKey{square, center_y(square, basis)}

def depth_keys(n: Nat, +square: U32, +basis: Basis) -> List<&2, DepthKey>:
  match n:
    case 0n:
      Nil{}
    case 1n+p:
      depth_key(square, basis) <> depth_keys(p, U32.add(square, 1), basis)

def depth_key_le(a: DepthKey, b: DepthKey) -> Bool:
  match a b:
    case DepthKey{a_square, +a_y} DepthKey{b_square, +b_y}:
      Bool.or(U32.is_lt(a_y, b_y),
        Bool.and(U32.is_eq(a_y, b_y), U32.is_le(a_square, b_square)))

def depth_ids(xs: List<&2, DepthKey>) -> List<&2, U32>:
  match xs:
    case Nil{}:
      Nil{}
    case head <> tail:
      match head:
        case DepthKey{square, y}:
          square <> depth_ids(tail)

def depth_order(basis: Basis) -> List<&2, U32>:
  depth_ids(List.sort(~DepthKey, ~depth_key_le, depth_keys(64n, 0, basis)))

def extrusion(basis: Basis) -> U32:
  match basis:
    case Basis{cos_yaw, sin_yaw, sin_pitch, cos_pitch, scale, cx, cy}:
      pixel(F32.mul(9.0, cos_pitch))
