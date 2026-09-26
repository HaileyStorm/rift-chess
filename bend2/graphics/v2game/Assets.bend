# Game-owned request/decode boundary for the two Rift Chess observatory plates.
# Transport is deliberately generic: it returns bytes for Bend-provided IDs;
# this module validates and maps one requested theme to one retained Image.
import Base
import ../../lib/graphics/v2/assets/RgbImage.bend as RgbImage

type AssetId is Data:
  Astral{}
  Stone{}

type AssetRequest is Data:
  AssetRequest{id: AssetId, path: String, max_bytes: U32}

type AssetResponse is Data:
  AssetResponse{id: AssetId, bytes: List<&2, U32>, ok: Bool}

type Plate is Data:
  Missing{}
  Ready{depth: U32, pixels: Image}

type ObservatoryPlates is Data:
  ObservatoryPlates{astral: Plate, stone: Plate}

def asset.max_bytes() -> U32:
  U32.add(RgbImage.max_bytes(), 1)

def asset.request(stone: Bool) -> AssetRequest:
  match stone:
    case False{}:
      AssetRequest{Astral{}, "assets/observatory-astral.rga", asset.max_bytes()}
    case True{}:
      AssetRequest{Stone{}, "assets/observatory-stone.rga", asset.max_bytes()}

# Only the Bend-selected theme is requested, limiting decoded background
# retention to one 512x512 Image on mobile.
def asset_ids(theme: U32) -> List<&2, AssetRequest>:
  Con{asset.request(Bool.not(U32.is_zero(theme))), Nil{}}

def decoded.plate.depth9(valid: Bool, depth: U32, pixels: Image) -> Plate:
  match valid:
    case False{}:
      Missing{}
    case True{}:
      Ready{depth, pixels}

def decoded.plate(result: RgbImage.DecodeResult) -> Plate:
  match result:
    case RgbImage.Decoded{+depth, pixels}:
      decoded.plate.depth9(U32.is_eq(depth, 9), depth, pixels)
    case RgbImage.Rejected{reason}:
      Missing{}

def response.plate(ok: Bool, bytes: List<&2, U32>) -> Plate:
  match ok:
    case False{}:
      Missing{}
    case True{}:
      decoded.plate(RgbImage.decode_bytes(bytes))

def response.into_plates(id: AssetId, plate: Plate) -> ObservatoryPlates:
  match id:
    case Astral{}:
      ObservatoryPlates{plate, Missing{}}
    case Stone{}:
      ObservatoryPlates{Missing{}, plate}

def load.response(response: AssetResponse) -> ObservatoryPlates:
  match response:
    case AssetResponse{id, bytes, ok}:
      +plate = response.plate(ok, bytes)
      response.into_plates(id, plate)

# asset_ids returns exactly one request. Ignore any extra transport entries so
# a stale/duplicated response cannot make this value retain two decoded trees.
def load_plates(responses: List<&2, AssetResponse>) -> ObservatoryPlates:
  match responses:
    case Nil{}:
      ObservatoryPlates{Missing{}, Missing{}}
    case Con{head, tail}:
      load.response(head)
