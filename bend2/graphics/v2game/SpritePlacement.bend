import Base
import ../../core/Model.bend as Model
import ../Camera.bend as Camera
import ../../lib/graphics/Quad.bend as Quad
import ../../lib/graphics/v2/Transform2D.bend as Transform
import ./PieceSprites.bend as PieceSprites
import ./KnightMesh.bend as KnightMesh

def board_pitch(+size: U32, camera: Camera.Basis) -> F32:
  match camera:
    case Camera.Basis{+cosYaw, +sinYaw, sinPitch, cosPitch, +scale, cx, cy}:
      F32.mul(F32.mul(scale,
        F32.add(F32.abs(cosYaw), F32.abs(sinYaw))),
        F32.div(U32.to_f32(size), 512.0))

def width(+size: U32, camera: Camera.Basis) -> F32:
  F32.mul(board_pitch(size, camera), 1.16)

def height(+size: U32, camera: Camera.Basis) -> F32:
  F32.mul(board_pitch(size, camera), 1.00)

def matrix(+width: F32, +height: F32, center: Quad.Point) -> Transform.Matrix:
  match center:
    case Quad.Point{+x, +y}:
      Transform.Matrix{width, 0.0, 0.0, height,
        F32.sub(x, F32.div(width, 2.0)),
        F32.sub(F32.add(y, F32.mul(width, 0.22)), height)}

# Camera projects centered square coordinates; rounding belongs to rasterization.
def center(+size: U32, +basis: Camera.Basis, +square: U32) -> Quad.Point:
  +file = U32.to_f32(Model.file_of(square))
  +row = U32.to_f32(U32.sub(7, Model.rank_of(square)))
  +scale = F32.div(U32.to_f32(size), 512.0)
  Quad.Point{F32.mul(Camera.project_x(basis, file, row), scale),
    F32.mul(Camera.project_y(basis, file, row), scale)}

def square_matrix(+size: U32, +basis: Camera.Basis, square: U32) -> Transform.Matrix:
  matrix(width(size, basis), height(size, basis), center(size, basis, square))

def piece_matrix(+size: U32, +basis: Camera.Basis, center: Quad.Point,
  kind: U32) -> Transform.Matrix:
  match kind:
    case 2: KnightMesh.frame(board_pitch(size, basis), center)
    case _: matrix(width(size, basis), height(size, basis), center)

def piece_square_matrix(+size: U32, +basis: Camera.Basis, square: U32,
  kind: U32) -> Transform.Matrix:
  piece_matrix(size, basis, center(size, basis, square), kind)

def piece_kind(kind: U32) -> PieceSprites.PieceKind:
  match kind:
    case 2: PieceSprites.Knight{}
    case 3: PieceSprites.Bishop{}
    case 4: PieceSprites.Rook{}
    case 5: PieceSprites.Queen{}
    case 6: PieceSprites.King{}
    case _: PieceSprites.Pawn{}

def piece_side(code: U32) -> PieceSprites.Side:
  Bool.pick(PieceSprites.Side, Model.is_white(code),
    PieceSprites.Ivory{}, PieceSprites.Navy{})
