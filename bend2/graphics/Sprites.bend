import Base
import ../core/Model.bend as Model
import ./Pixel.bend as Pixel

# Hand-authored twelve by eighteen pixel silhouettes, displayed at 2x.
# Each pixel is a two-bit palette index; transparent pixels remain pick-through.
def rows(kind: U32) -> List<&2, U32>:
  match kind:
    case 1:
      [0, 21760, 114240, 114240, 109120, 21760, 32000, 26880, 26880, 109120, 110144, 437904, 437904, 1398100, 1748964, 1747620, 349520, 0]
    case 2:
      [0, 5120, 30976, 130624, 438160, 438244, 432804, 430416, 451584, 440576, 437824, 438160, 437904, 1398100, 1748964, 1747620, 349520, 0]
    case 3:
      [5120, 30976, 114240, 438160, 433040, 435856, 109120, 21760, 30976, 110144, 110144, 438160, 437904, 1398100, 1748964, 1747620, 349520, 0]
    case 4:
      [0, 332880, 1697680, 1834896, 1747600, 349504, 110144, 110144, 110144, 110144, 110144, 438160, 437904, 1398100, 1748964, 1747620, 349520, 0]
    case 5:
      [0, 267280, 1696868, 1767908, 458640, 436880, 87360, 110144, 110144, 110144, 110144, 438160, 437904, 1398100, 1748964, 1747620, 349520, 0]
    case 6:
      [5120, 29696, 96576, 458304, 95552, 29696, 114240, 438160, 109120, 87360, 110144, 438160, 437904, 1398100, 1748964, 1747620, 349520, 0]
    case _:
      [0, 21760, 114240, 114240, 109120, 21760, 32000, 26880, 26880, 109120, 110144, 437904, 437904, 1398100, 1748964, 1747620, 349520, 0]

def palette_index(+code: U32, +x: U32, y: U32) -> U32:
  +row = Model.board_get(rows(Model.piece_type(code)), U32.div(y, 2))
  U32.and(U32.shrn(row, U32.to_nat(U32.mul(U32.div(x, 2), 2))), 3)

def alpha.inside(inside: Bool, +code: U32, x: U32, y: U32) -> Bool:
  match inside:
    case False{}:
      False{}
    case True{}:
      U32.is_ne(palette_index(code, x, y), 0)

def alpha(+code: U32, +x: U32, +y: U32) -> Bool:
  alpha.inside(Bool.and(Model.occupied(code), Bool.and(U32.is_lt(x, 24),
    U32.is_lt(y, 36))), code, x, y)

def color(+code: U32, index: U32, +y: U32) -> U32:
  match index:
    case 0:
      0
    case 1:
      1053991
    case 2:
      Bool.pick(U32, Model.is_white(code), 12233101, 5326703)
    case _:
      Bool.pick(U32, U32.is_ge(y, 26), 15386241,
        Bool.pick(U32, Model.is_white(code), 16773836, 12034274))

def run_rect(visible: Bool, +left: U32, +top: U32, +start: U32, +end: U32,
  shade: U32, image: Image) -> Image:
  match visible:
    case False{}:
      image
    case True{}:
      Pixel.fill_rect(Pixel.Rect{U32.add(left, U32.mul(start, 2)), top,
        U32.add(left, U32.mul(end, 2)), U32.add(top, 2)}, shade, image)

def draw.row(n: Nat, +word: U32, +x: U32, +start: U32, +previous: U32,
  +code: U32, +left: U32, +top: U32, +y: U32, +tint: U32, image: Image) -> Image:
  match n:
    case 0n:
      run_rect(U32.is_ne(previous, 0), left, top, start, x, Bool.pick(U32, U32.is_zero(tint), color(code, previous, y), tint), image)
    case 1n+p:
      +index = U32.and(word, 3)
      +change = U32.is_ne(index, previous)
      +next = run_rect(Bool.and(change, U32.is_ne(previous, 0)), left, top, start, x,
        Bool.pick(U32, U32.is_zero(tint), color(code, previous, y), tint), image)
      draw.row(p, U32.shrn(word, 2n), U32.add(x, 1), Bool.pick(U32, change, x, start),
        index, code, left, top, y, tint, next)

def draw.rows(words: List<&2, U32>, +y: U32, +code: U32, +left: U32, +top: U32, +tint: U32, image: Image) -> Image:
  match words:
    case Nil{}:
      image
    case word <> rest:
      draw.rows(rest, U32.add(y, 2), code, left, top, tint,
        draw.row(12n, word, 0, 0, 0, code, left, U32.add(top, y), y, tint, image))

def draw(+code: U32, center: U32, floor: U32, image: Image) -> Image:
  draw.rows(rows(Model.piece_type(code)), 0, code, U32.sub(center, 12), U32.sub(floor, 32), 0, image)

def pixel.inside(inside: Bool, +code: U32, x: U32, +y: U32) -> U32:
  match inside:
    case False{}:
      0
    case True{}:
      color(code, palette_index(code, x, y), y)

def pixel(+code: U32, +x: U32, +y: U32) -> U32:
  pixel.inside(alpha(code, x, y), code, x, y)

def draw_tint(+code: U32, center: U32, floor: U32, tint: U32, image: Image) -> Image:
  draw.rows(rows(Model.piece_type(code)), 0, code, U32.sub(center, 12), U32.sub(floor, 32), tint, image)

def outlined(show: Bool, +code: U32, +center: U32, +floor: U32, +tint: U32, image: Image) -> Image:
  match show:
    case False{}:
      draw(code, center, floor, image)
    case True{}:
      +a = draw_tint(code, U32.sub(center, 1), floor, tint, image)
      +b = draw_tint(code, U32.add(center, 1), floor, tint, a)
      +c = draw_tint(code, center, U32.sub(floor, 1), tint, b)
      +d = draw_tint(code, center, U32.add(floor, 1), tint, c)
      draw(code, center, floor, d)

# The actual previous victim survives briefly as a flashing silhouette;
# its original rows then separate sideways and collapse toward the floor.
def dying.rows(words: List<&2, U32>, +y: U32, +code: U32, +center: U32,
  +floor: U32, +progress: U32, image: Image) -> Image:
  match words:
    case Nil{}:
      image
    case word <> rest:
      +phase = Bool.pick(U32, U32.is_gt(progress, 4), U32.sub(progress, 4), 0)
      +shift = Bool.pick(U32, U32.is_zero(U32.mod(y, 4)), U32.add(center, phase), U32.sub(center, phase))
      +top = U32.add(U32.sub(floor, 32), U32.add(y, U32.div(U32.mul(U32.sub(34, y), phase), 12)))
      +tint = Bool.pick(U32, U32.is_lt(U32.mod(progress, 4), 2), 16768672, 13743871)
      dying.rows(rest, U32.add(y, 2), code, center, floor, progress,
        draw.row(12n, word, 0, 0, 0, code, U32.sub(shift, 12), top, y, tint, image))

def dying(show: Bool, +code: U32, center: U32, floor: U32, progress: U32, image: Image) -> Image:
  match show:
    case False{}:
      image
    case True{}:
      dying.rows(rows(Model.piece_type(code)), 0, code, center, floor, progress, image)
