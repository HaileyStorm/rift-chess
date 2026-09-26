# Rift Chess maps its twelve fixed-facing source sprites to generic RGBA pages.
# Asset loading and view preparation happen once; each frame only selects an
# immutable texture and supplies its board-space affine quad, clip and opacity.
import Base
import ../../lib/graphics/v2/RgbaSample.bend as Sample
import ../../lib/graphics/v2/ImageView.bend as ImageView
import ../../lib/graphics/v2/RgbaAffine.bend as RgbaAffine
import ../../lib/graphics/v2/Transform2D.bend as Transform
import ../../lib/graphics/v2/Rect.bend as Rect
import ../../lib/graphics/v2/assets/RgbaImage.bend as RgbaImage

type Side is Data:
  Ivory{}
  Navy{}

type PieceKind is Data:
  Pawn{}
  Knight{}
  Bishop{}
  Rook{}
  Queen{}
  King{}

# Each RGA2 page is a 2x2 grid of square sprites. The interactive 64px
# sprite tier has a 128px page; the retained source also has 128/256px tiers.
type Page is Data:
  Page{depth: Nat, size: U32, colors: Image, mask: Image}

def valid_depth(expected: U32, +depth: U32) -> Bool:
  Bool.and(U32.is_eq(expected, depth),
    Bool.or(U32.is_eq(depth, 7),
      Bool.or(U32.is_eq(depth, 8), U32.is_eq(depth, 9))))

def decoded_page(valid: Bool, +depth: U32,
  colors: Image, mask: Image) -> Maybe<&2, Page>:
  match valid:
    case False{}: None{}
    case True{}:
      +nat_depth = U32.to_nat(depth)
      Some{Page{nat_depth, U32.shln(1, nat_depth), colors, mask}}

def page_result(expected: U32, result: RgbaImage.DecodeResult) -> Maybe<&2, Page>:
  match result:
    case RgbaImage.Decoded{+depth, colors, mask}:
      decoded_page(valid_depth(expected, depth), depth, colors, mask)
    case RgbaImage.Rejected{reason}: None{}

# Reject bad headers, wrong tier dimensions, and corrupt payload lengths before
# the renderer constructs its retained sprite views.
def decode_page(bytes: List<&2, U32>, expected_depth: U32) -> Maybe<&2, Page>:
  page_result(expected_depth, RgbaImage.decode_bytes(bytes))

type Pieces is Data:
  Pieces{ivory_pawn: Sample.Texture, ivory_knight: Sample.Texture,
    ivory_bishop: Sample.Texture, ivory_rook: Sample.Texture,
    ivory_queen: Sample.Texture, ivory_king: Sample.Texture,
    navy_pawn: Sample.Texture, navy_knight: Sample.Texture,
    navy_bishop: Sample.Texture, navy_rook: Sample.Texture,
    navy_queen: Sample.Texture, navy_king: Sample.Texture}

def sprite_view(+depth: Nat, +size: U32, +pixels: Image,
  +left: U32, +top: U32, +span: U32) -> ImageView.View:
  ImageView.narrow(ImageView.View{depth, size, 0, 0, pixels}, left, top, span)

def tile_depth(depth: Nat) -> Nat:
  match depth:
    case 0n: 0n
    case 1n+rest: rest

def texture_views(+page_depth: Nat, +span: U32,
  colors: ImageView.View, mask: ImageView.View) -> Sample.Texture:
  match colors mask:
    case ImageView.View{depth, size, x, y, pixels}
      ImageView.View{mask_depth, mask_size, mask_x, mask_y, mask_pixels}:
      # A uniform channel may remain at a larger source ancestor than its
      # nonuniform mate. Both trees must be interpreted at the exact same
      # 2x2-cropped sprite extent; Pix safely denotes a uniform region there.
      Sample.Texture{tile_depth(page_depth), span, pixels, mask_pixels}

def slot(+page: Page, +index: U32) -> Sample.Texture:
  match page:
    case Page{depth, size, colors, mask}:
      +span = U32.div(size, 2)
      +left = U32.mul(U32.mod(index, 2), span)
      +top = U32.mul(U32.div(index, 2), span)
      texture_views(depth, span, sprite_view(depth, size, colors, left, top, span),
        sprite_view(depth, size, mask, left, top, span))

# Source atlas order is ivory pawn..king, then navy pawn..king. Four entries
# occupy each page, in row-major order. Cropped texture views are built once so
# animation frames do not repeatedly descend into the source atlas.
def prepare(+page0: Page, +page1: Page, +page2: Page) -> Pieces:
  Pieces{slot(page0, 0), slot(page0, 1), slot(page0, 2), slot(page0, 3),
    slot(page1, 0), slot(page1, 1), slot(page1, 2), slot(page1, 3),
    slot(page2, 0), slot(page2, 1), slot(page2, 2), slot(page2, 3)}

def ivory_texture(pieces: Pieces, kind: PieceKind) -> Sample.Texture:
  match pieces:
    case Pieces{ivory_pawn, ivory_knight, ivory_bishop, ivory_rook,
      ivory_queen, ivory_king, navy_pawn, navy_knight, navy_bishop,
      navy_rook, navy_queen, navy_king}:
      match kind:
        case Pawn{}: ivory_pawn
        case Knight{}: ivory_knight
        case Bishop{}: ivory_bishop
        case Rook{}: ivory_rook
        case Queen{}: ivory_queen
        case King{}: ivory_king

def navy_texture(pieces: Pieces, kind: PieceKind) -> Sample.Texture:
  match pieces:
    case Pieces{ivory_pawn, ivory_knight, ivory_bishop, ivory_rook,
      ivory_queen, ivory_king, navy_pawn, navy_knight, navy_bishop,
      navy_rook, navy_queen, navy_king}:
      match kind:
        case Pawn{}: navy_pawn
        case Knight{}: navy_knight
        case Bishop{}: navy_bishop
        case Rook{}: navy_rook
        case Queen{}: navy_queen
        case King{}: navy_king

def texture(pieces: Pieces, side: Side, kind: PieceKind) -> Sample.Texture:
  match side:
    case Ivory{}: ivory_texture(pieces, kind)
    case Navy{}: navy_texture(pieces, kind)

# Matrix maps the sprite's unit square to its board-space quadrilateral. Bend
# owns the source sprite and alpha sampling; the caller owns board projection,
# depth order, game rules and animation timing. Opacity supports transient
# effects such as a fading captured piece without changing its source pixels.
def draw(+target_depth: Nat, +target_size: U32, +pieces: Pieces,
  side: Side, kind: PieceKind, +matrix: Transform.Matrix, +opacity: U32,
  clip: Rect.Box, target: Image) -> Image:
  +source = texture(pieces, side, kind)
  RgbaAffine.draw(target_depth, target_size, RgbaAffine.prepare(matrix),
    source, Sample.Linear{}, opacity, clip, target)
