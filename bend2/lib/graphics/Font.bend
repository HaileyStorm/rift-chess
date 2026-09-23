# Small project-authored bitmap font for the pure Bend Image renderer.
# Glyphs are seven rows of five columns.  Four rows are packed in `top` and
# three rows in `bottom`; rows are expanded into horizontal runs before they
# reach Canvas.rect, avoiding one tree edit per lit pixel.
import Base
import ./Canvas.bend as Canvas

type Glyph is Data:
  Glyph{top: U32, bottom: U32, width: U32}

def glyph(code: U32) -> Glyph:
  match code:
    case 32: Glyph{0, 0, 5}
    case 33: Glyph{135300, 4100, 5}
    case 34: Glyph{10570, 0, 5}
    case 35: Glyph{338922, 10591, 5}
    case 36: Glyph{464836, 4596, 5}
    case 37: Glyph{139635, 26434, 5}
    case 38: Glyph{70950, 22837, 5}
    case 39: Glyph{4228, 0, 5}
    case 40: Glyph{67720, 8322, 5}
    case 41: Glyph{270466, 2184, 5}
    case 42: Glyph{1020224, 324, 5}
    case 43: Glyph{1020032, 132, 5}
    case 44: Glyph{0, 4492, 5}
    case 45: Glyph{1015808, 0, 5}
    case 46: Glyph{0, 12672, 5}
    case 47: Glyph{139536, 1090, 5}
    case 48: Glyph{714286, 14899, 5}
    case 49: Glyph{135364, 14468, 5}
    case 50: Glyph{279086, 31812, 5}
    case 51: Glyph{475663, 15888, 5}
    case 52: Glyph{305544, 8479, 5}
    case 53: Glyph{492607, 15888, 5}
    case 54: Glyph{492590, 14897, 5}
    case 55: Glyph{139807, 2114, 5}
    case 56: Glyph{476718, 14897, 5}
    case 57: Glyph{1001006, 14864, 5}
    case 58: Glyph{12672, 396, 5}
    case 59: Glyph{12672, 4492, 5}
    case 60: Glyph{34952, 8322, 5}
    case 61: Glyph{31744, 31, 5}
    case 62: Glyph{532610, 2184, 5}
    case 63: Glyph{279086, 4100, 5}
    case 64: Glyph{718382, 14397, 5}
    case 65: Glyph{1033774, 17969, 5}
    case 66: Glyph{509487, 15921, 5}
    case 67: Glyph{33854, 30753, 5}
    case 68: Glyph{575023, 15921, 5}
    case 69: Glyph{492607, 31777, 5}
    case 70: Glyph{492607, 1057, 5}
    case 71: Glyph{951358, 31281, 5}
    case 72: Glyph{1033777, 17969, 5}
    case 73: Glyph{135310, 14468, 5}
    case 74: Glyph{270620, 6440, 5}
    case 75: Glyph{103729, 17701, 5}
    case 76: Glyph{33825, 31777, 5}
    case 77: Glyph{710513, 17969, 5}
    case 78: Glyph{841329, 17969, 5}
    case 79: Glyph{575022, 14897, 5}
    case 80: Glyph{509487, 1057, 5}
    case 81: Glyph{575022, 22837, 5}
    case 82: Glyph{509487, 17701, 5}
    case 83: Glyph{459838, 15888, 5}
    case 84: Glyph{135327, 4228, 5}
    case 85: Glyph{575025, 14897, 5}
    case 86: Glyph{575025, 4433, 5}
    case 87: Glyph{706097, 10933, 5}
    case 88: Glyph{141873, 17962, 5}
    case 89: Glyph{141873, 4228, 5}
    case 90: Glyph{139807, 31778, 5}
    case 91: Glyph{67662, 14402, 5}
    case 92: Glyph{133185, 16648, 5}
    case 93: Glyph{270606, 14600, 5}
    case 94: Glyph{17732, 0, 5}
    case 95: Glyph{0, 31744, 5}
    case 96: Glyph{8322, 0, 5}
    case 97: Glyph{538624, 31294, 5}
    case 98: Glyph{635937, 15921, 5}
    case 99: Glyph{63488, 30753, 5}
    case 100: Glyph{842256, 31281, 5}
    case 101: Glyph{571392, 30783, 5}
    case 102: Glyph{232012, 2114, 5}
    case 103: Glyph{587776, 17361, 5}
    case 104: Glyph{635937, 17969, 5}
    case 105: Glyph{137220, 14468, 5}
    case 106: Glyph{274440, 6440, 5}
    case 107: Glyph{173089, 9379, 5}
    case 108: Glyph{135302, 14468, 5}
    case 109: Glyph{699392, 22197, 5}
    case 110: Glyph{635904, 17969, 5}
    case 111: Glyph{571392, 14897, 5}
    case 112: Glyph{572416, 1521, 5}
    case 113: Glyph{587776, 17361, 5}
    case 114: Glyph{128000, 1057, 5}
    case 115: Glyph{63488, 15886, 5}
    case 116: Glyph{80962, 12866, 5}
    case 117: Glyph{574464, 23345, 5}
    case 118: Glyph{574464, 4433, 5}
    case 119: Glyph{705536, 10933, 5}
    case 120: Glyph{345088, 17732, 5}
    case 121: Glyph{574464, 14878, 5}
    case 122: Glyph{293888, 31812, 5}
    case 123: Glyph{69768, 8324, 5}
    case 124: Glyph{135300, 4228, 5}
    case 125: Glyph{266370, 2180, 5}
    case 126: Glyph{444416, 0, 5}
    case _:
      # Replacement glyph is a question mark for non-ASCII input.
      Glyph{279086, 4100, 5}

def row(g: Glyph, index: Nat) -> U32:
  match g:
    case Glyph{+top, +bottom, width}:
      match index:
        case 0n: U32.and(top, 31)
        case 1n: U32.and(U32.shrn(top, 5n), 31)
        case 2n: U32.and(U32.shrn(top, 10n), 31)
        case 3n: U32.and(U32.shrn(top, 15n), 31)
        case 4n: U32.and(bottom, 31)
        case 5n: U32.and(U32.shrn(bottom, 5n), 31)
        case 6n: U32.and(U32.shrn(bottom, 10n), 31)
        case _: 0

def advance(scale: U32) -> U32:
  U32.mul(6, scale)

def line_height(scale: U32) -> U32:
  U32.mul(8, scale)

def bit(mask: U32, column: U32) -> Bool:
  U32.is_ne(U32.and(mask, U32.shln(1, U32.to_nat(column))), 0)

# Flush one horizontal run at the end of a row or when a zero bit closes it.
def flush(depth: Nat, in_run: Bool, +run_start: U32, +column: U32, +x: U32, +y: U32,
  +scale: U32, +color: U32, +image: Image) -> Image:
  match in_run:
    case False{}:
      image
    case True{}:
      Canvas.rect_at(depth, U32.add(x, U32.mul(run_start, scale)), y,
        U32.mul(U32.sub(column, run_start), scale), scale, color, image)

def row_step(+depth: Nat, +remaining: Nat, +column: U32, on: Bool, +mask: U32,
  +run_start: U32, in_run: Bool, +x: U32, +y: U32, +scale: U32,
  +color: U32, +image: Image) -> Image:
  match remaining:
    case 0n:
      flush(depth, in_run, run_start, column, x, y, scale, color, image)
    case 1n+rest:
      match on in_run:
        case False{} False{}:
          row_step(depth, rest, U32.add(column, 1), bit(mask, U32.add(column, 1)),
            mask, run_start, False{}, x, y, scale, color, image)
        case False{} True{}:
          +closed = flush(depth, True{}, run_start, column, x, y, scale, color, image)
          row_step(depth, rest, U32.add(column, 1), bit(mask, U32.add(column, 1)),
            mask, run_start, False{}, x, y, scale, color, closed)
        case True{} False{}:
          row_step(depth, rest, U32.add(column, 1), bit(mask, U32.add(column, 1)),
            mask, column, True{}, x, y, scale, color, image)
        case True{} True{}:
          row_step(depth, rest, U32.add(column, 1), bit(mask, U32.add(column, 1)),
            mask, run_start, True{}, x, y, scale, color, image)

def paint_row(depth: Nat, +mask: U32, +x: U32, +y: U32, +scale: U32, +color: U32,
  +image: Image) -> Image:
  row_step(depth, 5n, 0, bit(mask, 0), mask, 0, False{}, x, y, scale, color, image)

def glyph_rows(+depth: Nat, +remaining: Nat, +index: Nat, +g: Glyph, +x: U32, +y: U32,
  +scale: U32, +color: U32, +image: Image) -> Image:
  match remaining:
    case 0n:
      image
    case 1n+rest:
      +painted = paint_row(depth, row(g, index), x, y, scale, color, image)
      glyph_rows(depth, rest, 1n+index, g, x, U32.add(y, scale), scale, color, painted)

def draw_line(+depth: Nat, text: String, +x: U32, +y: U32, +scale: U32, +color: U32,
  +image: Image) -> Image:
  match text:
    case SNil{}:
      image
    case SCon{head, tail}:
      match head:
        case Chr{code}:
          +painted = glyph_rows(depth, 7n, 0n, glyph(code), x, y, scale, color, image)
          draw_line(depth, tail, U32.add(x, advance(scale)), y, scale, color, painted)

def draw_lines(+depth: Nat, lines: List<&2, String>, +origin_x: U32, +y: U32,
  +scale: U32, +color: U32, +image: Image) -> Image:
  match lines:
    case Nil{}:
      image
    case +head <> tail:
      +painted = draw_line(depth, head, origin_x, y, scale, color, image)
      draw_lines(depth, tail, origin_x, U32.add(y, line_height(scale)), scale, color, painted)

def draw_scaled(+depth: Nat, nonzero: Bool, text: String, +x: U32, +y: U32,
  +scale: U32, +color: U32, +image: Image) -> Image:
  match nonzero:
    case False{}:
      image
    case True{}:
      draw_lines(depth, String.lines(text), x, y, scale, color, image)

def draw_at_text(+depth: Nat, text: String, +x: U32, +y: U32, +scale: U32,
  +color: U32, +image: Image) -> Image:
  match text:
    case SNil{}:
      image
    case SCon{head, tail}:
      draw_scaled(depth, U32.is_ne(scale, 0), text, x, y, scale, color, image)

def draw_at(depth: Nat, text: String, x: U32, y: U32, +scale: U32, color: U32,
  image: Image) -> Image:
  draw_at_text(depth, text, x, y, scale, color, image)

def draw(text: String, x: U32, y: U32, scale: U32, color: U32,
  image: Image) -> Image:
  draw_at(10n, text, x, y, scale, color, image)

def line_width(text: String, +scale: U32) -> U32:
  match text:
    case SNil{}:
      0
    case SCon{head, tail}:
      U32.add(advance(scale), line_width(tail, scale))

def widths(lines: List<&2, String>, +scale: U32) -> U32:
  match lines:
    case Nil{}:
      0
    case head <> tail:
      U32.max(line_width(head, scale), widths(tail, scale))

def width(text: String, scale: U32) -> U32:
  widths(String.lines(text), scale)

# `wrap` is word-aware and preserves a single separator between words.  A
# word wider than max_width occupies its own line, which guarantees progress.
def wrap_fit(words: List<&2, String>, +current: String, max_width: U32,
  scale: U32) -> Bool:
  match words:
    case Nil{}:
      False{}
    case +head <> tail:
      +candidate = Bool.pick(String, String.is_empty(current), head,
        String.append(String.append(current, " "), head))
      Bool.or(String.is_empty(current), U32.is_le(width(candidate, scale), max_width))

def wrap_end(empty_current: Bool, +current: String, +acc: List<&2, String>) ->
  List<&2, String>:
  match empty_current:
    case True{}:
      List.reverse(&2, String, acc)
    case False{}:
      List.reverse(&2, String, current <> acc)

def wrap_words(words: List<&2, String>, fits: Bool, +max_width: U32,
  +scale: U32, +current: String, +acc: List<&2, String>) -> List<&2, String>:
  match words fits:
    case Nil{} _:
      wrap_end(String.is_empty(current), current, acc)
    case +head <> +tail False{}:
      +next_fits = wrap_fit(tail, head, max_width, scale)
      wrap_words(tail, next_fits, max_width, scale, head, current <> acc)
    case +head <> +tail True{}:
      +candidate = Bool.pick(String, String.is_empty(current), head,
        String.append(String.append(current, " "), head))
      +next_fits = wrap_fit(tail, candidate, max_width, scale)
      wrap_words(tail, next_fits, max_width, scale, candidate, acc)

def wrap(text: String, +max_width: U32, +scale: U32) -> List<&2, String>:
  +words = String.split(text, ' ')
  +fits = wrap_fit(words, SNil{}, max_width, scale)
  wrap_words(words, fits, max_width, scale, SNil{}, Nil{})
