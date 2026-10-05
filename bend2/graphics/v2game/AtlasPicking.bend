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

def painted_texel(texel: Sample.Texel, count: U32) -> Bool:
  # Settled opacity is 255. Shapes.paint_leaf truncates quarter coverage after
  # MaskedLayer.effective, so a nonzero sampled alpha can still paint nothing.
  U32.is_ne(U32.div(U32.mul(U32.min(MaskedLayer.effective(
    Sample.alpha(texel), 255), 255), count), 4), 0)

def geometry_hit(geometry: RgbaAffine.Geometry, +texture: Sample.Texture,
  +x: U32, +y: U32) -> Bool:
  match geometry:
    case RgbaAffine.Empty{}: False{}
    case RgbaAffine.Surface{+shape, inverse, bounds}:
      Bool.and(U32.is_ne(Sample.size(texture), 0),
        Bool.and(Bool.not(RgbaAffine.excluded(shape, Rect.screen(512), x, y, 1)),
          painted_texel(RgbaAffine.sample_point(
            Transform.point(inverse, Quad.Point{F32.add(U32.to_f32(x), 0.5),
              F32.add(U32.to_f32(y), 0.5)}), texture, Sample.Linear{}),
            Facet.coverage(shape, U32.to_f32(x), U32.to_f32(y)))))

def piece_hit(show: Bool, +square: U32, +code: U32, basis: Camera.Basis,
  pieces: PieceSprites.Pieces, x: U32, y: U32) -> Bool:
  match show:
    case False{}: False{}
    case True{}:
      geometry_hit(RgbaAffine.prepare(Placement.square_matrix(512, basis, square)),
        PieceSprites.texture(pieces, Placement.piece_side(code),
          Placement.piece_kind(Model.piece_type(code))), x, y)

# Fold in painter order so a later visible piece replaces an earlier hit.
def pick.go(order: List<&2, U32>, +board: List<&2, U32>, +holes: U32,
  +x: U32, +y: U32, +basis: Camera.Basis, +pieces: PieceSprites.Pieces,
  +best: U32) -> U32:
  match order:
    case Nil{}: best
    case +square <> rest:
      +code = Model.board_get(board, square)
      +hit = piece_hit(Bool.and(Model.present(holes, square), Model.occupied(code)),
        square, code, basis, pieces, x, y)
      pick.go(rest, board, holes, x, y, basis, pieces,
        Bool.pick(U32, hit, square, best))

def pick(+position: Model.Position, +x: U32, +y: U32,
  +basis: Camera.Basis, +pieces: PieceSprites.Pieces) -> U32:
  pick.go(Camera.depth_order(basis), Model.pos_board(position),
    Model.pos_holes(position), x, y, basis, pieces, Camera.square_at(x, y, basis))
