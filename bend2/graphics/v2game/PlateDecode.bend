# Game-owned depth9 plate fast path. RgbImage retains the generic RGA1 contract.
# Its parser checks every byte, row length and trailing payload before building.
import Base
import ../../lib/graphics/v2/assets/RgbImage.bend as RgbImage

def pixel_pairs(top: List<&2, U32>, bottom: List<&2, U32>) ->
  List<&2, Image>:
  match top bottom:
    case Nil{} Nil{}: Nil{}
    case Con{tl, Con{tr, top_rest}} Con{bl, Con{br, bottom_rest}}:
      Con{RgbImage.image_quad(Pix{tl}, Pix{tr}, Pix{bl}, Pix{br}),
        pixel_pairs(top_rest, bottom_rest)}
    case _ _: Nil{}

def pixel_rows(rows: List<&2, List<&2, U32>>) ->
  List<&2, List<&2, Image>>:
  match rows:
    case Nil{}: Nil{}
    case Con{top, Con{bottom, rest}}:
      Con{pixel_pairs(top, bottom), pixel_rows(rest)}
    case _: Nil{}

def quad_pairs(top: List<&2, Image>, bottom: List<&2, Image>) ->
  List<&2, Image>:
  match top bottom:
    case Nil{} Nil{}: Nil{}
    case Con{tl, Con{tr, top_rest}} Con{bl, Con{br, bottom_rest}}:
      Con{RgbImage.image_quad(tl, tr, bl, br),
        quad_pairs(top_rest, bottom_rest)}
    case _ _: Nil{}

def quad_rows(rows: List<&2, List<&2, Image>>) ->
  List<&2, List<&2, Image>>:
  match rows:
    case Nil{}: Nil{}
    case Con{top, Con{bottom, rest}}:
      Con{quad_pairs(top, bottom), quad_rows(rest)}
    case _: Nil{}

def single(rows: List<&2, List<&2, Image>>) -> Image:
  match rows:
    case Con{Con{pixels, Nil{}}, Nil{}}: pixels
    case _: Pix{0}

def coarsen(passes: Nat, rows: List<&2, List<&2, Image>>) -> Image:
  match passes:
    case 0n: single(rows)
    case 1n+rest: coarsen(rest, quad_rows(rows))

# Validated 512x512 rows become 256x256 depth1 nodes, then eight pairwise levels.
# The Nil/Pix fallbacks above are unreachable for those exact validated shapes.
def result(rows: RgbImage.RowsRead) -> RgbImage.DecodeResult:
  match rows:
    case RgbImage.RowsRead{rows}:
      RgbImage.Decoded{9, coarsen(8n, pixel_rows(rows))}
    case RgbImage.RowsRejected{reason}:
      RgbImage.Rejected{reason}

def decode.header(+m0: U32, +m1: U32, +m2: U32, +m3: U32,
  +depth: U32, payload: List<&2, U32>) -> RgbImage.DecodeResult:
  match m0 m1 m2 m3 depth:
    case 82 71 65 49 9:
      result(RgbImage.rows_decode(512n, 512n, Nil{},
        RgbImage.row_pixels(512n, payload, Nil{}), False{}))
    case _ _ _ _ _:
      RgbImage.decode_bytes(Con{m0, Con{m1, Con{m2, Con{m3,
        Con{depth, payload}}}}})

def decode_bytes(bytes: List<&2, U32>) -> RgbImage.DecodeResult:
  match bytes:
    case Con{m0, Con{m1, Con{m2, Con{m3, Con{depth, payload}}}}}:
      decode.header(m0, m1, m2, m3, depth, payload)
    case _:
      RgbImage.Rejected{RgbImage.BadLength{}}
