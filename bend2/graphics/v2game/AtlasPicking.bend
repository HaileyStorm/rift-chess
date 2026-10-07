import Base
import ../../core/Model.bend as Model
import ../Camera.bend as Camera
import ../../lib/graphics/Quad.bend as Quad
import ../../lib/graphics/v2/Facet.bend as Facet
import ../../lib/graphics/v2/Rect.bend as Rect
import ../../lib/graphics/v2/RgbaAffine.bend as RgbaAffine
import ../../lib/graphics/v2/RgbaSample.bend as Sample
import ../../lib/graphics/v2/MaskedLayer.bend as MaskedLayer
import ../../lib/graphics/v2/Transform2D.bend as Transform
import ./PieceSprites.bend as PieceSprites
import ./SpritePlacement.bend as Placement
import ./SpriteMotion.bend as Motion

def painted_texel(texel: Sample.Texel, opacity: U32, count: U32) -> Bool:
  # Shapes.paint_leaf truncates quarter coverage after MaskedLayer.effective
  # applies layer opacity, so a nonzero sampled alpha can still paint nothing.
  U32.is_ne(U32.div(U32.mul(U32.min(MaskedLayer.effective(
    Sample.alpha(texel), opacity), 255), count), 4), 0)

def geometry_hit_opacity(geometry: RgbaAffine.Geometry, +texture: Sample.Texture,
  +opacity: U32, +x: U32, +y: U32) -> Bool:
  match geometry:
    case RgbaAffine.Empty{}: False{}
    case RgbaAffine.Surface{+shape, inverse, bounds}:
      Bool.and(U32.is_ne(Sample.size(texture), 0),
        Bool.and(Bool.not(RgbaAffine.excluded(shape, Rect.screen(512), x, y, 1)),
          painted_texel(RgbaAffine.sample_point(
            Transform.point(inverse, Quad.Point{F32.add(U32.to_f32(x), 0.5),
              F32.add(U32.to_f32(y), 0.5)}), texture, Sample.Linear{}), opacity,
            Facet.coverage(shape, U32.to_f32(x), U32.to_f32(y)))))

# Named settled geometry compatibility for the existing independent raster gate.
def geometry_hit(geometry: RgbaAffine.Geometry, texture: Sample.Texture,
  x: U32, y: U32) -> Bool:
  geometry_hit_opacity(geometry, texture, 255, x, y)

def piece_hit(show: Bool, +square: U32, +code: U32, basis: Camera.Basis,
  pieces: PieceSprites.Pieces, x: U32, y: U32) -> Bool:
  match show:
    case False{}: False{}
    case True{}:
      geometry_hit(RgbaAffine.prepare(Placement.piece_square_matrix(512, basis, square, Model.piece_type(code))),
        PieceSprites.texture(pieces, Placement.piece_side(code),
          Placement.piece_kind(Model.piece_type(code))), x, y)

def layer_center(dying: Bool, +pose: Motion.Pose, basis: Camera.Basis,
  square: U32) -> Quad.Point:
  match dying:
    case True{}: Motion.dying_center(512, basis, square, Motion.pose_progress(pose))
    case False{}: Motion.center(pose, 512, basis, square)

def posed_hit(show: Bool, +code: U32, +basis: Camera.Basis,
  pieces: PieceSprites.Pieces, +pose: Motion.Pose, square: U32, +dying: Bool,
  x: U32, y: U32) -> Bool:
  match show:
    case False{}: False{}
    case True{}:
      +center = layer_center(dying, pose, basis, square)
      +opacity = Bool.pick(U32, dying, Motion.opacity(Motion.pose_progress(pose)), 255)
      geometry_hit_opacity(RgbaAffine.prepare(Placement.piece_matrix(512, basis,
        center, Model.piece_type(code))), PieceSprites.texture(pieces,
        Placement.piece_side(code), Placement.piece_kind(Model.piece_type(code))),
        opacity, x, y)

# Fold the renderer's dead-before-live layers in painter order. A painted dying
# piece occludes earlier picks without selecting a removed piece (sentinel 64).
def pick.go(order: List<&2, U32>, +board: List<&2, U32>, +holes: U32,
  +pose: Motion.Pose,
  +x: U32, +y: U32, +basis: Camera.Basis, +pieces: PieceSprites.Pieces,
  +best: U32) -> U32:
  match order:
    case Nil{}: best
    case +square <> rest:
      +code = Model.board_get(board, square)
      +present = Model.present(holes, square)
      +dead = posed_hit(Bool.and(present, Motion.dying_visible(pose, square)),
        Model.board_get(Motion.pose_previous_board(pose), square), basis, pieces,
        pose, square, True{}, x, y)
      +hit = posed_hit(Bool.and(present, Model.occupied(code)), code, basis, pieces,
        pose, square, False{}, x, y)
      pick.go(rest, board, holes, pose, x, y, basis, pieces,
        Bool.pick(U32, hit, square, Bool.pick(U32, dead, 64, best)))

def pick_pose(+position: Model.Position, pose: Motion.Pose, +x: U32, +y: U32,
  +basis: Camera.Basis, +pieces: PieceSprites.Pieces) -> U32:
  pick.go(Camera.depth_order(basis), Model.pos_board(position),
    Model.pos_holes(position), pose, x, y, basis, pieces, Camera.square_at(x, y, basis))

def pick(+position: Model.Position, +x: U32, +y: U32,
  +basis: Camera.Basis, +pieces: PieceSprites.Pieces) -> U32:
  pick_pose(position, Motion.stationary(position), x, y, basis, pieces)
