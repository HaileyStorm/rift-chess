# RGA2: exact 5-byte header followed by interleaved, straight-alpha RGBA.
# Pure bounded decoder; RGA1 and its contracts remain unchanged.
import Base
import ./RgbImage.bend as RGB

type DecodeError is Data:
  BadMagic{}
  BadDepth{}
  BadLength{}
  NonByte{}

type DecodeResult is Data:
  Decoded{depth: U32, colors: Image, mask: Image}
  Rejected{reason: DecodeError}

type RowRead is Data:
  RowRead{colors: List<&2, U32>, masks: List<&2, U32>, rest: List<&2, U32>}
  RowRejected{reason: DecodeError}

type RowsRead is Data:
  RowsRead{colors: List<&2, List<&2, U32>>, masks: List<&2, List<&2, U32>>}
  RowsRejected{reason: DecodeError}

def max_depth() -> U32:
  9

def max_bytes() -> U32:
  1048581

def bytes4(r: U32, g: U32, b: U32, a: U32) -> Bool:
  Bool.and(Bool.and(U32.is_le(r, 255), U32.is_le(g, 255)),
    Bool.and(U32.is_le(b, 255), U32.is_le(a, 255)))

# valid reports the previous complete pixel. Check it before consuming more
# bytes; unlike Bool.pick on recursive values, rejection cannot evaluate
# the rest of an invalid row in a strict compiled target.
def row(remaining: Nat, valid: Bool, bytes: List<&2, U32>,
  colors_rev: List<&2, U32>, masks_rev: List<&2, U32>) -> RowRead:
  match remaining valid:
    case 0n False{}: RowRejected{NonByte{}}
    case 0n True{}:
      RowRead{List.reverse(&2, U32, colors_rev),
        List.reverse(&2, U32, masks_rev), bytes}
    case 1n+rest False{}: RowRejected{NonByte{}}
    case 1n+rest True{}:
      match bytes:
        case Con{+r, Con{+g, Con{+b, Con{+a, tail}}}}:
          row(rest, bytes4(r, g, b, a), tail, Con{RGB.color(r, g, b), colors_rev},
            Con{U32.shln(a, 16n), masks_rev})
        case _: RowRejected{BadLength{}}

def last(colors: List<&2, U32>, masks: List<&2, U32>,
  colors_rev: List<&2, List<&2, U32>>, masks_rev: List<&2, List<&2, U32>>,
  rest: List<&2, U32>) -> RowsRead:
  match rest:
    case Nil{}:
      RowsRead{List.reverse(&2, List<&2, U32>, Con{colors, colors_rev}),
        List.reverse(&2, List<&2, U32>, Con{masks, masks_rev})}
    case Con{head, tail}: RowsRejected{BadLength{}}

def rows(remaining: Nat, +width: Nat,
  colors_rev: List<&2, List<&2, U32>>, masks_rev: List<&2, List<&2, U32>>,
  read: RowRead, final: Bool) -> RowsRead:
  match remaining read final:
    case 0n _ _: RowsRejected{BadLength{}}
    case 1n++rest RowRejected{reason} _: RowsRejected{reason}
    case 1n++rest RowRead{colors, masks, rest_bytes} True{}:
      last(colors, masks, colors_rev, masks_rev, rest_bytes)
    case 1n++rest RowRead{colors, masks, rest_bytes} False{}:
      rows(rest, width, Con{colors, colors_rev}, Con{masks, masks_rev},
        row(width, True{}, rest_bytes, Nil{}, Nil{}),
        U32.is_eq(U32.from_nat(rest), 1))

def image(+depth: U32, rows: List<&2, List<&2, U32>>) -> Image:
  RGB.image_from_rows(U32.to_nat(depth),
    RGB.image_rows(U32.to_nat(depth), rows, Nil{}))

def result(+depth: U32, read: RowsRead) -> DecodeResult:
  match read:
    case RowsRejected{reason}: Rejected{reason}
    case RowsRead{colors, masks}:
      rgb alpha = image(depth, colors)
        image(depth, masks)
      Decoded{depth, rgb, alpha}

def depth_case(valid: Bool, +depth: U32,
  payload: List<&2, U32>) -> DecodeResult:
  match valid:
    case False{}: Rejected{BadDepth{}}
    case True{}:
      +side = U32.shln(1, U32.to_nat(depth))
      +width = U32.to_nat(side)
      result(depth, rows(width, width, Nil{}, Nil{},
        row(width, True{}, payload, Nil{}, Nil{}), U32.is_eq(side, 1)))

def magic_case(valid: Bool, +depth: U32,
  payload: List<&2, U32>) -> DecodeResult:
  match valid:
    case False{}: Rejected{BadMagic{}}
    case True{}: depth_case(U32.is_le(depth, max_depth()), depth, payload)

def header_case(valid: Bool, m0: U32, m1: U32, m2: U32, m3: U32,
  depth: U32, payload: List<&2, U32>) -> DecodeResult:
  match valid:
    case False{}: Rejected{NonByte{}}
    case True{}:
      magic_case(Bool.and(Bool.and(U32.is_eq(m0, 82), U32.is_eq(m1, 71)),
        Bool.and(U32.is_eq(m2, 65), U32.is_eq(m3, 50))), depth, payload)

def decode_bytes(bytes: List<&2, U32>) -> DecodeResult:
  match bytes:
    case Con{+m0, Con{+m1, Con{+m2, Con{+m3, Con{+depth, payload}}}}}:
      header_case(Bool.and(bytes4(m0, m1, m2, m3), U32.is_le(depth, 255)),
        m0, m1, m2, m3, depth, payload)
    case _: Rejected{BadLength{}}
