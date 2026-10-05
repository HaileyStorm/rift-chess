import Base
import ../../lib/graphics/v2/RgbaSample.bend as Sample
import ./PieceSprites.bend as PieceSprites

def alpha_texture(texture: Sample.Texture) -> Sample.Texture:
  match texture:
    case Sample.Texture{depth, size, colors, mask}:
      Sample.Texture{depth, size, Pix{0}, mask}

# Preserve the exact decoded masks and sampler metadata without cloning RGB art.
def from_pieces(pieces: PieceSprites.Pieces) -> PieceSprites.Pieces:
  match pieces:
    case PieceSprites.Pieces{ivory_pawn, ivory_knight, ivory_bishop, ivory_rook,
      ivory_queen, ivory_king, navy_pawn, navy_knight, navy_bishop, navy_rook,
      navy_queen, navy_king}:
      PieceSprites.Pieces{alpha_texture(ivory_pawn), alpha_texture(ivory_knight),
        alpha_texture(ivory_bishop), alpha_texture(ivory_rook),
        alpha_texture(ivory_queen), alpha_texture(ivory_king),
        alpha_texture(navy_pawn), alpha_texture(navy_knight),
        alpha_texture(navy_bishop), alpha_texture(navy_rook),
        alpha_texture(navy_queen), alpha_texture(navy_king)}
