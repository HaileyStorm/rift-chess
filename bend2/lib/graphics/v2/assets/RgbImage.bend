# Generic Raw Graphics Asset v1 decoder.
# The host supplies a byte list; no file, browser, or game API is imported.
import Base

type DecodeError is Data:
  BadMagic{}
  BadDepth{}
  BadLength{}
  NonByte{}

type DecodeResult is Data:
  Decoded{depth: U32, pixels: Image}
  Rejected{reason: DecodeError}

type RowRead is Data:
  RowRead{pixels: List<&2, U32>, rest: List<&2, U32>}
  RowRejected{reason: DecodeError}

type RowsRead is Data:
  RowsRead{rows: List<&2, List<&2, U32>>}
  RowsRejected{reason: DecodeError}

type PixelHalves is Data:
  PixelHalves{left: List<&2, U32>, right: List<&2, U32>}

type RowHalves is Data:
  RowHalves{top: List<&2, Image>, bottom: List<&2, Image>}

type ImagePair is Data:
  ImagePair{left: Image, right: Image}

type ImageRowsPair is Data:
  ImageRowsPair{left: List<&2, Image>, right: List<&2, Image>}

type MatrixParts is Data:
  MatrixParts{
    tl: List<&2, Image>, tr: List<&2, Image>,
    bl: List<&2, Image>, br: List<&2, Image>
  }

def max_depth() -> U32:
  9

def max_pixels() -> U32:
  262144

def max_bytes() -> U32:
  786437

def same_rgb(+a: U32, +b: U32, +c: U32, +d: U32) -> Bool:
  Bool.and(Bool.and(U32.is_eq(a, b), U32.is_eq(a, c)), U32.is_eq(a, d))

def image_quad_pixels(same: Bool, a: U32, b: U32, c: U32, d: U32) -> Image:
  match same:
    case True{}: Pix{a}
    case False{}: Qua{Pix{a}, Pix{b}, Pix{c}, Pix{d}}

def image_quad(+tl: Image, +tr: Image, +bl: Image, +br: Image) -> Image:
  match tl tr bl br:
    case Pix{+a} Pix{+b} Pix{+c} Pix{+d}:
      image_quad_pixels(same_rgb(a, b, c, d), a, b, c, d)
    case _ _ _ _:
      Qua{tl, tr, bl, br}

def pixel_halves.left(halves: PixelHalves) -> List<&2, U32>:
  match halves:
    case PixelHalves{left, right}: left

def pixel_halves.right(halves: PixelHalves) -> List<&2, U32>:
  match halves:
    case PixelHalves{left, right}: right

def row_image.join(+left: Image, +right: Image) -> Image:
  image_quad(left, right, left, right)

def split_prefix(n: Nat, xs: List<&2, U32>, left_rev: List<&2, U32>) ->
  PixelHalves:
  match n xs:
    case 0n _:
      PixelHalves{List.reverse(&2, U32, left_rev), xs}
    case 1n+p Nil{}:
      PixelHalves{List.reverse(&2, U32, left_rev), Nil{}}
    case 1n+p Con{+head, tail}:
      split_prefix(p, tail, Con{head, left_rev})

def row_image(depth: Nat, pixels: List<&2, U32>) -> Image:
  match depth:
    case 0n:
      match pixels:
        case Con{+color, Nil{}}:
          Pix{color}
        case _:
          Pix{0}
    case 1n++rest:
      +half = U32.to_nat(U32.shln(1, rest))
      +halves = split_prefix(half, pixels, Nil{})
      row_image.join(row_image(rest, pixel_halves.left(halves)),
        row_image(rest, pixel_halves.right(halves)))

def split_rows(n: Nat, rows: List<&2, Image>, top_rev: List<&2, Image>) ->
  RowHalves:
  match n rows:
    case 0n _:
      RowHalves{List.reverse(&2, Image, top_rev), rows}
    case 1n+p Nil{}:
      RowHalves{List.reverse(&2, Image, top_rev), Nil{}}
    case 1n+p Con{head, tail}:
      split_rows(p, tail, Con{head, top_rev})

def row_halves.top(halves: RowHalves) -> List<&2, Image>:
  match halves:
    case RowHalves{top, bottom}: top

def row_halves.bottom(halves: RowHalves) -> List<&2, Image>:
  match halves:
    case RowHalves{top, bottom}: bottom

def split_row_image(image: Image) -> ImagePair:
  match image:
    case Pix{+color}:
      ImagePair{Pix{color}, Pix{color}}
    case Qua{tl, tr, bl, br}:
      ImagePair{tl, tr}

def image_pair.left(pair: ImagePair) -> Image:
  match pair:
    case ImagePair{left, right}: left

def image_pair.right(pair: ImagePair) -> Image:
  match pair:
    case ImagePair{left, right}: right

def image_rows_pair.left(pair: ImageRowsPair) -> List<&2, Image>:
  match pair:
    case ImageRowsPair{left, right}: left

def image_rows_pair.right(pair: ImageRowsPair) -> List<&2, Image>:
  match pair:
    case ImageRowsPair{left, right}: right

def split_row_images.cons(+row_pair: ImagePair,
  +tail_pair: ImageRowsPair) -> ImageRowsPair:
  ImageRowsPair{Con{image_pair.left(row_pair), image_rows_pair.left(tail_pair)},
    Con{image_pair.right(row_pair), image_rows_pair.right(tail_pair)}}

def split_row_images(rows: List<&2, Image>) ->
  ImageRowsPair:
  match rows:
    case Nil{}:
      ImageRowsPair{Nil{}, Nil{}}
    case Con{head, tail}:
      split_row_images.cons(split_row_image(head), split_row_images(tail))

def matrix_parts(half: Nat, rows: List<&2, Image>) -> MatrixParts:
  +vertical = split_rows(half, rows, Nil{})
  +upper = split_row_images(row_halves.top(vertical))
  +lower = split_row_images(row_halves.bottom(vertical))
  MatrixParts{image_rows_pair.left(upper), image_rows_pair.right(upper),
    image_rows_pair.left(lower), image_rows_pair.right(lower)}

def matrix_parts.tl(parts: MatrixParts) -> List<&2, Image>:
  match parts:
    case MatrixParts{tl, tr, bl, br}: tl

def matrix_parts.tr(parts: MatrixParts) -> List<&2, Image>:
  match parts:
    case MatrixParts{tl, tr, bl, br}: tr

def matrix_parts.bl(parts: MatrixParts) -> List<&2, Image>:
  match parts:
    case MatrixParts{tl, tr, bl, br}: bl

def matrix_parts.br(parts: MatrixParts) -> List<&2, Image>:
  match parts:
    case MatrixParts{tl, tr, bl, br}: br

def image_from_rows(depth: Nat, rows: List<&2, Image>) -> Image:
  match depth:
    case 0n:
      match rows:
        case Con{pixels, Nil{}}:
          pixels
        case _:
          Pix{0}
    case 1n++rest:
      +half = U32.to_nat(U32.shln(1, rest))
      +parts = matrix_parts(half, rows)
      image_quad(image_from_rows(rest, matrix_parts.tl(parts)),
        image_from_rows(rest, matrix_parts.tr(parts)),
        image_from_rows(rest, matrix_parts.bl(parts)),
        image_from_rows(rest, matrix_parts.br(parts)))

def color(r: U32, g: U32, b: U32) -> U32:
  U32.or(U32.shln(r, 16n), U32.or(U32.shln(g, 8n), b))

def row_pixels(remaining: Nat, bytes: List<&2, U32>,
  pixels_rev: List<&2, U32>) -> RowRead:
  match remaining:
    case 0n:
      RowRead{List.reverse(&2, U32, pixels_rev), bytes}
    case 1n+rest:
      match bytes:
        case Con{+r, Con{+g, Con{+b, tail}}}:
          Bool.pick(RowRead,
            Bool.and(U32.is_le(r, 255),
              Bool.and(U32.is_le(g, 255), U32.is_le(b, 255))),
            row_pixels(rest, tail, Con{color(r, g, b), pixels_rev}),
            RowRejected{NonByte{}})
        case _:
          RowRejected{BadLength{}}

def rows_last(pixels: List<&2, U32>,
  rows_rev: List<&2, List<&2, U32>>,
  rest_bytes: List<&2, U32>) -> RowsRead:
  match rest_bytes:
    case Nil{}:
      RowsRead{List.reverse(&2, List<&2, U32>, Con{pixels, rows_rev})}
    case Con{head, tail}:
      RowsRejected{BadLength{}}

def rows_decode(remaining: Nat, +width: Nat,
  rows_rev: List<&2, List<&2, U32>>, row: RowRead, last: Bool) -> RowsRead:
  match remaining row last:
    case 0n _ _:
      RowsRejected{BadLength{}}
    case 1n++rest RowRejected{reason} _:
      RowsRejected{reason}
    case 1n++rest RowRead{pixels, rest_bytes} True{}:
      rows_last(pixels, rows_rev, rest_bytes)
    case 1n++rest RowRead{pixels, rest_bytes} False{}:
      rows_decode(rest, width, Con{pixels, rows_rev},
        row_pixels(width, rest_bytes, Nil{}),
        U32.is_eq(U32.from_nat(rest), 1))

def image_rows(+depth: Nat, rows: List<&2, List<&2, U32>>,
  rows_rev: List<&2, Image>) -> List<&2, Image>:
  match rows:
    case Nil{}:
      List.reverse(&2, Image, rows_rev)
    case Con{head, tail}:
      image_rows(depth, tail, Con{row_image(depth, head), rows_rev})

def build_result(+depth: U32, rows: RowsRead) -> DecodeResult:
  match rows:
    case RowsRead{rows}:
      Decoded{depth, image_from_rows(U32.to_nat(depth),
        image_rows(U32.to_nat(depth), rows, Nil{}))}
    case RowsRejected{reason}:
      Rejected{reason}

def decode.pixel_limit(valid: Bool, depth: U32, +side: U32,
  payload: List<&2, U32>) -> DecodeResult:
  match valid:
    case False{}:
      Rejected{BadDepth{}}
    case True{}:
      +side_nat = U32.to_nat(side)
      build_result(depth, rows_decode(side_nat, side_nat, Nil{},
        row_pixels(side_nat, payload, Nil{}), U32.is_eq(side, 1)))

def decode.domain(+depth: U32, payload: List<&2, U32>) -> DecodeResult:
  +side = U32.shln(1, U32.to_nat(depth))
  decode.pixel_limit(U32.is_le(U32.mul(side, side), max_pixels()),
    depth, side, payload)

def decode.depth_case(valid: Bool, depth: U32,
  payload: List<&2, U32>) -> DecodeResult:
  match valid:
    case False{}:
      Rejected{BadDepth{}}
    case True{}:
      decode.domain(depth, payload)

def decode.magic_case(valid: Bool, +depth: U32,
  payload: List<&2, U32>) -> DecodeResult:
  match valid:
    case False{}:
      Rejected{BadMagic{}}
    case True{}:
      decode.depth_case(U32.is_le(depth, max_depth()), depth, payload)

def decode.header_bytes(valid: Bool, m0: U32, m1: U32, m2: U32,
  m3: U32, depth: U32, payload: List<&2, U32>) -> DecodeResult:
  match valid:
    case False{}:
      Rejected{NonByte{}}
    case True{}:
      decode.magic_case(Bool.and(U32.is_eq(m0, 82),
        Bool.and(U32.is_eq(m1, 71),
          Bool.and(U32.is_eq(m2, 65), U32.is_eq(m3, 49)))),
        depth, payload)

def decode_bytes(bytes: List<&2, U32>) -> DecodeResult:
  match bytes:
    case Con{+m0, Con{+m1, Con{+m2, Con{+m3, Con{+depth, payload}}}}}:
      decode.header_bytes(Bool.and(U32.is_le(m0, 255),
          Bool.and(U32.is_le(m1, 255),
            Bool.and(U32.is_le(m2, 255),
              Bool.and(U32.is_le(m3, 255), U32.is_le(depth, 255))))),
        m0, m1, m2, m3, depth, payload)
    case _:
      Rejected{BadLength{}}
