# Proportional mixed-case text with antialiased two-bit glyph coverage.
# Glyph visual data is baked into FontData.bend from a pinned OFL source.
# All coverage compositing and layout are pure Bend; the host only blits Image.
import Base
import ./BlendRect.bend as BlendRect
import ./FontData.bend as FontData

type Row is Data:
  Row{low: U32, high: U32}

type Decoded is Data:
  Decoded{row: Row, rest: String}

def digit_case(upper: Bool, lower: Bool, numeral: Bool, plus: Bool,
  code: U32) -> U32:
  match upper lower numeral plus:
    case True{} _ _ _: U32.sub(code, 65)
    case False{} True{} _ _: U32.add(U32.sub(code, 97), 26)
    case False{} False{} True{} _: U32.add(U32.sub(code, 48), 52)
    case False{} False{} False{} True{}: 62
    case False{} False{} False{} False{}: 63

def digit(+code: U32) -> U32:
  digit_case(Bool.and(U32.is_ge(code, 65), U32.is_le(code, 90)),
    Bool.and(U32.is_ge(code, 97), U32.is_le(code, 122)),
    Bool.and(U32.is_ge(code, 48), U32.is_le(code, 57)),
    U32.is_eq(code, 43), code)

def char_digit(value: Maybe<&2, Char>) -> U32:
  match value:
    case None{}: 0
    case Some{value}:
      match value:
        case Chr{code}: digit(code)

def get6(+data: String, index: Nat) -> U32:
  char_digit(String.get(data, index))

def unpack(+data: String, +offset: Nat) -> U32:
  U32.or(U32.or(get6(data, offset), U32.shln(get6(data, 1n+offset), 6n)),
    U32.or(U32.shln(get6(data, 2n+offset), 12n),
      U32.shln(get6(data, 3n+offset), 18n)))

def decode(+data: String) -> Decoded:
  Decoded{Row{unpack(data, 0n), unpack(data, 4n)}, String.drop(data, 8n)}

def decoded_row(value: Decoded) -> Row:
  match value:
    case Decoded{row, rest}: row

def decoded_rest(value: Decoded) -> String:
  match value:
    case Decoded{row, rest}: rest

def bit(mask: U32, column: U32) -> U32:
  U32.min(U32.and(U32.shrn(mask, U32.to_nat(column)), 1), 1)

def level(+row: Row, +column: U32) -> U32:
  match row:
    case Row{low, high}:
      U32.add(bit(low, column), U32.mul(2, bit(high, column)))

def flush_case(empty: Bool, +depth: Nat, +size: U32, +x: U32, +y: U32,
  +scale: U32, +start: U32, +end: U32, +shade: U32, +ink: U32,
  image: Image) -> Image:
  match empty:
    case True{}: image
    case False{}:
      +left = U32.add(x, U32.mul(start, scale))
      +top = y
      BlendRect.fill(depth, size, left, top,
        U32.add(x, U32.mul(end, scale)), U32.add(y, scale),
        ink, U32.mul(shade, 85), image)

def flush(+depth: Nat, +size: U32, +x: U32, +y: U32, +scale: U32,
  +start: U32, +end: U32, +shade: U32, +ink: U32, image: Image) -> Image:
  flush_case(U32.is_zero(shade), depth, size, x, y, scale,
    start, end, shade, ink, image)

def row_step(+depth: Nat, +size: U32, +remaining: Nat, +column: U32,
  changed: Bool, +next: U32, +run_level: U32, +run_start: U32, +row: Row,
  +x: U32, +y: U32, +scale: U32, +ink: U32, image: Image) -> Image:
  match remaining changed:
    case 0n _:
      flush(depth, size, x, y, scale, run_start, column, run_level, ink, image)
    case 1n+rest False{}:
      +next_column = U32.add(column, 1)
      +next_level = level(row, next_column)
      row_step(depth, size, rest, next_column,
        U32.is_ne(next_level, run_level), next_level, run_level,
        run_start, row, x, y, scale, ink, image)
    case 1n+rest True{}:
      +painted = flush(depth, size, x, y, scale, run_start, column,
        run_level, ink, image)
      +next_column = U32.add(column, 1)
      +next_level = level(row, next_column)
      row_step(depth, size, rest, next_column,
        U32.is_ne(next_level, next), next_level, next,
        column, row, x, y, scale, ink, painted)

def render_rows(+depth: Nat, +size: U32, +remaining: Nat, data: String,
  +row_index: U32, +x: U32, +y: U32, +scale: U32, +ink: U32,
  image: Image) -> Image:
  match remaining:
    case 0n: image
    case 1n+rest:
      +decoded = decode(data)
      +row = decoded_row(decoded)
      +first = level(row, 0)
      +painted = row_step(depth, size, 24n, 0, U32.is_ne(first, 0),
        first, 0, 0, row,
        x, U32.add(y, U32.mul(row_index, scale)), scale, ink, image)
      render_rows(depth, size, rest, decoded_rest(decoded), U32.add(row_index, 1),
        x, y, scale, ink, painted)

def draw_glyph(+depth: Nat, +size: U32, glyph: FontData.Glyph,
  +x: U32, +y: U32, +scale: U32, +ink: U32, image: Image) -> Image:
  match glyph:
    case FontData.Glyph{advance, top, count, rows}:
      render_rows(depth, size, count, rows, top, x, y, scale, ink, image)

def advance(glyph: FontData.Glyph) -> U32:
  match glyph:
    case FontData.Glyph{advance, top, count, rows}: advance

def kern_case(pair: Bool, close: Bool) -> U32:
  match pair close:
    case True{} _: 2
    case False{} True{}: 1
    case False{} False{}: 0

def kerning(+previous: U32, +current: U32) -> U32:
  +strong = Bool.or(Bool.and(U32.is_eq(previous, 65), U32.is_eq(current, 86)),
    Bool.or(Bool.and(U32.is_eq(previous, 65), U32.is_eq(current, 87)),
      Bool.and(U32.is_eq(previous, 86), U32.is_eq(current, 65))))
  +soft = Bool.or(Bool.and(U32.is_eq(previous, 84), U32.is_eq(current, 111)),
    Bool.or(Bool.and(U32.is_eq(previous, 84), U32.is_eq(current, 97)),
      Bool.or(Bool.and(U32.is_eq(previous, 89), U32.is_eq(current, 111)),
        Bool.and(U32.is_eq(previous, 87), U32.is_eq(current, 97)))))
  kern_case(strong, soft)

def draw_line(+depth: Nat, +size: U32, text: String,
  +x: U32, +y: U32, +scale: U32, +ink: U32, +previous: U32,
  image: Image) -> Image:
  match text:
    case SNil{}: image
    case SCon{head, tail}:
      match head:
        case Chr{+code}:
          +glyph = FontData.glyph(code)
          +start = U32.sub(x, U32.mul(kerning(previous, code), scale))
          +painted = draw_glyph(depth, size, glyph, start, y, scale, ink, image)
          draw_line(depth, size, tail,
            U32.add(start, U32.mul(advance(glyph), scale)), y,
            scale, ink, code, painted)

def draw_lines(+depth: Nat, +size: U32, lines: List<&2, String>,
  +x: U32, +y: U32, +scale: U32, +ink: U32, image: Image) -> Image:
  match lines:
    case Nil{}: image
    case head <> tail:
      +painted = draw_line(depth, size, head, x, y, scale, ink, 0, image)
      draw_lines(depth, size, tail, x, U32.add(y, U32.mul(28, scale)),
        scale, ink, painted)

def draw_valid(valid: Bool, +depth: Nat, +size: U32, text: String,
  +x: U32, +y: U32, +scale: U32, +ink: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}: draw_lines(depth, size, String.lines(text), x, y, scale, ink, image)

def draw(+depth: Nat, +size: U32, text: String,
  +x: U32, +y: U32, +scale: U32, +ink: U32, image: Image) -> Image:
  draw_valid(Bool.and(U32.is_ne(scale, 0), U32.is_le(scale, 4)),
    depth, size, text, x, y, scale, ink, image)

def width_line(text: String, +scale: U32, +previous: U32) -> U32:
  match text:
    case SNil{}: 0
    case SCon{head, tail}:
      match head:
        case Chr{+code}:
          +glyph = FontData.glyph(code)
          U32.add(U32.sub(U32.mul(advance(glyph), scale),
              U32.mul(kerning(previous, code), scale)),
            width_line(tail, scale, code))

def width(text: String, scale: U32) -> U32:
  width_line(text, scale, 0)

def line_height(scale: U32) -> U32:
  U32.mul(28, scale)
