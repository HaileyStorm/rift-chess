import Base
import ../Camera.bend as Camera
import ../../lib/graphics/Quad.bend as Quad
import ../../lib/graphics/v2/Facet.bend as Facet
import ../../lib/graphics/v2/Color.bend as Color
import ../../lib/graphics/v2/ImageOps.bend as ImageOps
import ../../lib/graphics/v2/RgbaSample.bend as Sample
import ../../lib/graphics/v2/Transform2D.bend as Transform
import ./PieceArt.bend as PieceArt

type Vertex is Data:
  Vertex{file: F32, row: F32, height: F32}

type Face is Data:
  Face{a: Vertex, b: Vertex, c: Vertex, d: Vertex,
    normal: Vertex, center: Vertex, band: Bool}

type Painted is Data:
  Painted{quad: Quad.Shape, color: U32, depth: F32}

# Model bounds normalized by board pitch; two source texels pad each edge.
# Rendering and picking call this same frame, preserving the world-scale pivot.
def frame_width() -> F32: 0.68266666666666664
def frame_height() -> F32: 1.4250666666666667
def frame_left() -> F32: 0.34133333333333332
def frame_top() -> F32: 1.0605333333333333

def frame(+pitch: F32, center: Quad.Point) -> Transform.Matrix:
  match center:
    case Quad.Point{x, y}:
      Transform.Matrix{F32.mul(pitch, frame_width()), 0.0, 0.0,
        F32.mul(pitch, frame_height()),
        F32.sub(x, F32.mul(pitch, frame_left())),
        F32.sub(y, F32.mul(pitch, frame_top()))}

def knight_mesh() -> List<&2, Face>:
  Face{Vertex{F32.neg(0.14999999999999999), F32.neg(0.040000000000000001), 0.14000000000000001}, Vertex{0.120000000000, F32.neg(0.040000000000000001), 0.14000000000000001}, Vertex{0.010000000000, F32.neg(0.060666666666666674), 0.45000000000000001}, Vertex{F32.neg(0.14999999999999999), F32.neg(0.070000000000000007), 0.58999999999999997}, Vertex{0.0, F32.neg(0.99778515785660893), F32.neg(0.066519010523773944)}, Vertex{F32.neg(0.042499999999999996), F32.neg(0.052666666666666667), 0.33000000000000002}, False{}} <>
  Face{Vertex{F32.neg(0.14999999999999999), F32.neg(0.070000000000000007), 0.58999999999999997}, Vertex{0.010000000000, F32.neg(0.060666666666666674), 0.45000000000000001}, Vertex{0.160000000000, F32.neg(0.085576800509878884), 0.56999999999999995}, Vertex{F32.neg(0.085000000000000006), F32.neg(0.110000000000), 0.85999999999999999}, Vertex{F32.neg(0.058270351331427273), F32.neg(0.98946083592001643), F32.neg(0.13255874296391801)}, Vertex{F32.neg(0.016250000000000001), F32.neg(0.081560866794136391), 0.61749999999999994}, False{}} <>
  Face{Vertex{0.160000000000, F32.neg(0.085576800509878884), 0.56999999999999995}, Vertex{0.32000000000000001, F32.neg(0.070000000000000007), 0.66000000000000003}, Vertex{0.32000000000000001, F32.neg(0.070000000000000007), 0.81999999999999995}, Vertex{0.110000000000, F32.neg(0.090444550669216028), 1.000000000000}, Vertex{0.096896891912807911, F32.neg(0.99529442495054576), 0.0}, Vertex{0.22750000000000001, F32.neg(0.079005337794773728), 0.76249999999999996}, False{}} <>
  Face{Vertex{0.160000000000, F32.neg(0.085576800509878884), 0.56999999999999995}, Vertex{0.110000000000, F32.neg(0.090444550669216028), 1.000000000000}, Vertex{0.044999999999999998, F32.neg(0.096954650382531926), 0.97999999999999998}, Vertex{F32.neg(0.085000000000000006), F32.neg(0.110000000000), 0.85999999999999999}, Vertex{0.09956149348729712, F32.neg(0.99503136189827235), 0.00031281535799787037}, Vertex{0.057499999999999996, F32.neg(0.095744000390406703), 0.85250000000000004}, False{}} <>
  Face{Vertex{0.120000000000, 0.040000000000000001, 0.14000000000000001}, Vertex{F32.neg(0.14999999999999999), 0.040000000000000001, 0.14000000000000001}, Vertex{F32.neg(0.14999999999999999), 0.070000000000000007, 0.58999999999999997}, Vertex{0.010000000000, 0.060666666666666674, 0.45000000000000001}, Vertex{0.0, 0.99778515785660893, F32.neg(0.066519010523773944)}, Vertex{F32.neg(0.042499999999999996), 0.052666666666666667, 0.33000000000000002}, False{}} <>
  Face{Vertex{0.010000000000, 0.060666666666666674, 0.45000000000000001}, Vertex{F32.neg(0.14999999999999999), 0.070000000000000007, 0.58999999999999997}, Vertex{F32.neg(0.085000000000000006), 0.110000000000, 0.85999999999999999}, Vertex{0.160000000000, 0.085576800509878884, 0.56999999999999995}, Vertex{F32.neg(0.058270351331427307), 0.98946083592001655, F32.neg(0.13255874296391806)}, Vertex{F32.neg(0.016250000000000001), 0.081560866794136391, 0.61749999999999994}, False{}} <>
  Face{Vertex{0.32000000000000001, 0.070000000000000007, 0.66000000000000003}, Vertex{0.160000000000, 0.085576800509878884, 0.56999999999999995}, Vertex{0.110000000000, 0.090444550669216028, 1.000000000000}, Vertex{0.32000000000000001, 0.070000000000000007, 0.81999999999999995}, Vertex{0.096896891912807898, 0.99529442495054588, 0.0}, Vertex{0.22750000000000001, 0.079005337794773728, 0.76249999999999996}, False{}} <>
  Face{Vertex{0.110000000000, 0.090444550669216028, 1.000000000000}, Vertex{0.160000000000, 0.085576800509878884, 0.56999999999999995}, Vertex{F32.neg(0.085000000000000006), 0.110000000000, 0.85999999999999999}, Vertex{0.044999999999999998, 0.096954650382531926, 0.97999999999999998}, Vertex{0.099561493487297079, 0.99503136189827235, 0.00031281535799786749}, Vertex{0.057499999999999996, 0.095744000390406703, 0.85250000000000004}, False{}} <>
  Face{Vertex{F32.neg(0.14999999999999999), F32.neg(0.040000000000000001), 0.14000000000000001}, Vertex{F32.neg(0.14999999999999999), 0.040000000000000001, 0.14000000000000001}, Vertex{0.120000000000, 0.040000000000000001, 0.14000000000000001}, Vertex{0.120000000000, F32.neg(0.040000000000000001), 0.14000000000000001}, Vertex{0.0, 0.0, F32.neg(1.000000000000)}, Vertex{F32.neg(0.014999999999999999), 0.0, 0.14000000000000001}, False{}} <>
  Face{Vertex{0.120000000000, F32.neg(0.040000000000000001), 0.14000000000000001}, Vertex{0.120000000000, 0.040000000000000001, 0.14000000000000001}, Vertex{0.010000000000, 0.060666666666666674, 0.45000000000000001}, Vertex{0.010000000000, F32.neg(0.060666666666666674), 0.45000000000000001}, Vertex{0.94242774548124653, 0.0, 0.33440984517076494}, Vertex{0.065000000000000002, 0.0, 0.29500000000000004}, False{}} <>
  Face{Vertex{0.010000000000, F32.neg(0.060666666666666674), 0.45000000000000001}, Vertex{0.010000000000, 0.060666666666666674, 0.45000000000000001}, Vertex{0.160000000000, 0.085576800509878884, 0.56999999999999995}, Vertex{0.160000000000, F32.neg(0.085576800509878884), 0.56999999999999995}, Vertex{0.62469504755442418, 0.0, F32.neg(0.7808688094430305)}, Vertex{0.085000000000000006, 0.0, 0.51000000000000001}, False{}} <>
  Face{Vertex{0.160000000000, F32.neg(0.085576800509878884), 0.56999999999999995}, Vertex{0.160000000000, 0.085576800509878884, 0.56999999999999995}, Vertex{0.32000000000000001, 0.070000000000000007, 0.66000000000000003}, Vertex{0.32000000000000001, F32.neg(0.070000000000000007), 0.66000000000000003}, Vertex{0.4902612396325593, 0.0, F32.neg(0.87157553712454905)}, Vertex{0.23999999999999999, 0.0, 0.61499999999999999}, False{}} <>
  Face{Vertex{0.32000000000000001, F32.neg(0.070000000000000007), 0.66000000000000003}, Vertex{0.32000000000000001, 0.070000000000000007, 0.66000000000000003}, Vertex{0.32000000000000001, 0.070000000000000007, 0.81999999999999995}, Vertex{0.32000000000000001, F32.neg(0.070000000000000007), 0.81999999999999995}, Vertex{1.000000000000, 0.0, 0.0}, Vertex{0.32000000000000001, 0.0, 0.73999999999999999}, False{}} <>
  Face{Vertex{0.32000000000000001, F32.neg(0.070000000000000007), 0.81999999999999995}, Vertex{0.32000000000000001, 0.070000000000000007, 0.81999999999999995}, Vertex{0.110000000000, 0.090444550669216028, 1.000000000000}, Vertex{0.110000000000, F32.neg(0.090444550669216028), 1.000000000000}, Vertex{0.65079137345596849, 0.0, 0.75925660236529646}, Vertex{0.215000000000, 0.0, 0.90999999999999992}, False{}} <>
  Face{Vertex{0.110000000000, F32.neg(0.090444550669216028), 1.000000000000}, Vertex{0.110000000000, 0.090444550669216028, 1.000000000000}, Vertex{0.044999999999999998, 0.096954650382531926, 0.97999999999999998}, Vertex{0.044999999999999998, F32.neg(0.096954650382531926), 0.97999999999999998}, Vertex{F32.neg(0.29408584883752337), 0.0, 0.95577900872194999}, Vertex{0.077499999999999999, 0.0, 0.98999999999999999}, False{}} <>
  Face{Vertex{F32.neg(0.085000000000000006), F32.neg(0.110000000000), 0.85999999999999999}, Vertex{F32.neg(0.085000000000000006), 0.110000000000, 0.85999999999999999}, Vertex{F32.neg(0.14999999999999999), 0.070000000000000007, 0.58999999999999997}, Vertex{F32.neg(0.14999999999999999), F32.neg(0.070000000000000007), 0.58999999999999997}, Vertex{F32.neg(0.97222363715777771), 0.0, 0.23405383857502052}, Vertex{F32.neg(0.11749999999999999), 0.0, 0.72499999999999998}, False{}} <>
  Face{Vertex{F32.neg(0.14999999999999999), F32.neg(0.070000000000000007), 0.58999999999999997}, Vertex{F32.neg(0.14999999999999999), 0.070000000000000007, 0.58999999999999997}, Vertex{F32.neg(0.14999999999999999), 0.040000000000000001, 0.14000000000000001}, Vertex{F32.neg(0.14999999999999999), F32.neg(0.040000000000000001), 0.14000000000000001}, Vertex{F32.neg(1.000000000000), 0.0, 0.0}, Vertex{F32.neg(0.14999999999999999), 0.0, 0.36499999999999999}, False{}} <>
  Face{Vertex{F32.neg(0.085000000000000006), F32.neg(0.110000000000), 0.85999999999999999}, Vertex{0.044999999999999998, F32.neg(0.096954650382531926), 0.97999999999999998}, Vertex{F32.neg(0.10000000000000001), F32.neg(0.065000000000000002), 1.1699999999999999}, Vertex{F32.neg(0.10000000000000001), F32.neg(0.065000000000000002), 1.1699999999999999}, Vertex{F32.neg(0.031864410525121865), F32.neg(0.98934324658288231), 0.14207251593017059}, Vertex{F32.neg(0.060000000000000005), F32.neg(0.084238662595632979), 1.0449999999999999}, False{}} <>
  Face{Vertex{0.044999999999999998, 0.096954650382531926, 0.97999999999999998}, Vertex{F32.neg(0.085000000000000006), 0.110000000000, 0.85999999999999999}, Vertex{F32.neg(0.10000000000000001), 0.065000000000000002, 1.1699999999999999}, Vertex{F32.neg(0.10000000000000001), 0.065000000000000002, 1.1699999999999999}, Vertex{F32.neg(0.031864410525121865), 0.98934324658288231, 0.14207251593017056}, Vertex{F32.neg(0.060000000000000005), 0.084238662595632979, 1.0449999999999999}, False{}} <>
  Face{Vertex{0.044999999999999998, F32.neg(0.096954650382531926), 0.97999999999999998}, Vertex{F32.neg(0.020000000000000004), 0.0, 0.89500000000000002}, Vertex{F32.neg(0.10000000000000001), F32.neg(0.065000000000000002), 1.1699999999999999}, Vertex{F32.neg(0.10000000000000001), F32.neg(0.065000000000000002), 1.1699999999999999}, Vertex{0.61039037162247767, 0.71254225235898694, 0.34598718593866329}, Vertex{F32.neg(0.043750000000000004), F32.neg(0.056738662595632983), 1.053750000000}, False{}} <>
  Face{Vertex{F32.neg(0.020000000000000004), 0.0, 0.89500000000000002}, Vertex{0.044999999999999998, 0.096954650382531926, 0.97999999999999998}, Vertex{F32.neg(0.10000000000000001), 0.065000000000000002, 1.1699999999999999}, Vertex{F32.neg(0.10000000000000001), 0.065000000000000002, 1.1699999999999999}, Vertex{0.61039037162247767, F32.neg(0.71254225235898694), 0.34598718593866329}, Vertex{F32.neg(0.043750000000000004), 0.056738662595632983, 1.053750000000}, False{}} <>
  Face{Vertex{F32.neg(0.020000000000000004), 0.0, 0.89500000000000002}, Vertex{F32.neg(0.085000000000000006), F32.neg(0.110000000000), 0.85999999999999999}, Vertex{F32.neg(0.10000000000000001), F32.neg(0.065000000000000002), 1.1699999999999999}, Vertex{F32.neg(0.10000000000000001), F32.neg(0.065000000000000002), 1.1699999999999999}, Vertex{F32.neg(0.83804446745920314), 0.53271543012203004, F32.neg(0.1178801979592884)}, Vertex{F32.neg(0.076250000000000012), F32.neg(0.059999999999999998), 1.0237499999999999}, False{}} <>
  Face{Vertex{F32.neg(0.085000000000000006), 0.110000000000, 0.85999999999999999}, Vertex{F32.neg(0.020000000000000004), 0.0, 0.89500000000000002}, Vertex{F32.neg(0.10000000000000001), 0.065000000000000002, 1.1699999999999999}, Vertex{F32.neg(0.10000000000000001), 0.065000000000000002, 1.1699999999999999}, Vertex{F32.neg(0.83804446745920314), F32.neg(0.53271543012203004), F32.neg(0.1178801979592884)}, Vertex{F32.neg(0.076250000000000012), 0.059999999999999998, 1.0237499999999999}, False{}} <>
  Face{Vertex{0.044999999999999998, F32.neg(0.096954650382531926), 0.97999999999999998}, Vertex{0.044999999999999998, 0.096954650382531926, 0.97999999999999998}, Vertex{F32.neg(0.020000000000000004), 0.0, 0.89500000000000002}, Vertex{F32.neg(0.020000000000000004), 0.0, 0.89500000000000002}, Vertex{F32.neg(0.79435783297719609), 0.0, 0.6074501075707972}, Vertex{0.012499999999999997, 0.0, 0.937500000000}, False{}} <>
  Face{Vertex{F32.neg(0.085000000000000006), 0.110000000000, 0.85999999999999999}, Vertex{F32.neg(0.085000000000000006), F32.neg(0.110000000000), 0.85999999999999999}, Vertex{F32.neg(0.020000000000000004), 0.0, 0.89500000000000002}, Vertex{F32.neg(0.020000000000000004), 0.0, 0.89500000000000002}, Vertex{F32.neg(0.4740998230350178), 0.0, 0.88047109992217509}, Vertex{F32.neg(0.052500000000000005), 0.0, 0.87749999999999995}, False{}} <>
  Face{Vertex{0.16, F32.neg(0.16), 0.0}, Vertex{0.16, 0.16, 0.0}, Vertex{0.16, 0.16, 0.14}, Vertex{0.16, F32.neg(0.16), 0.14}, Vertex{1.0, 0.0, 0.0}, Vertex{0.16, 0.0, 0.07}, True{}} <>
  Face{Vertex{0.16, 0.16, 0.0}, Vertex{F32.neg(0.16), 0.16, 0.0}, Vertex{F32.neg(0.16), 0.16, 0.14}, Vertex{0.16, 0.16, 0.14}, Vertex{0.0, 1.0, 0.0}, Vertex{0.0, 0.16, 0.07}, True{}} <>
  Face{Vertex{F32.neg(0.16), 0.16, 0.0}, Vertex{F32.neg(0.16), F32.neg(0.16), 0.0}, Vertex{F32.neg(0.16), F32.neg(0.16), 0.14}, Vertex{F32.neg(0.16), 0.16, 0.14}, Vertex{F32.neg(1.0), 0.0, 0.0}, Vertex{F32.neg(0.16), 0.0, 0.07}, True{}} <>
  Face{Vertex{F32.neg(0.16), F32.neg(0.16), 0.0}, Vertex{0.16, F32.neg(0.16), 0.0}, Vertex{0.16, F32.neg(0.16), 0.14}, Vertex{F32.neg(0.16), F32.neg(0.16), 0.14}, Vertex{0.0, F32.neg(1.0), 0.0}, Vertex{0.0, F32.neg(0.16), 0.07}, True{}} <>
  Face{Vertex{F32.neg(0.16), F32.neg(0.16), 0.0}, Vertex{F32.neg(0.16), 0.16, 0.0}, Vertex{0.16, 0.16, 0.0}, Vertex{0.16, F32.neg(0.16), 0.0}, Vertex{0.0, 0.0, F32.neg(1.0)}, Vertex{0.0, 0.0, 0.0}, True{}} <>
  Face{Vertex{0.16, F32.neg(0.16), 0.14}, Vertex{0.16, 0.16, 0.14}, Vertex{F32.neg(0.16), 0.16, 0.14}, Vertex{F32.neg(0.16), F32.neg(0.16), 0.14}, Vertex{0.0, 0.0, 1.0}, Vertex{0.0, 0.0, 0.14}, True{}} <>
  Nil{}

def view_dot(vertex: Vertex, camera: Camera.Basis) -> F32:
  match vertex camera:
    case Vertex{+file, +row, +height} Camera.Basis{cosYaw, sinYaw, sinPitch, +cosPitch, scale, cx, cy}:
      F32.add(F32.mul(cosPitch, F32.add(F32.mul(file, sinYaw), F32.mul(row, cosYaw))),
        F32.mul(height, sinPitch))

def project(vertex: Vertex, +size: U32, camera: Camera.Basis) -> Quad.Point:
  match vertex camera:
    case Vertex{+file, +row, height}
        Camera.Basis{+cosYaw, +sinYaw, sinPitch, cosPitch, scale, cx, cy}:
      +span = F32.add(F32.abs(cosYaw), F32.abs(sinYaw))
      +x = F32.div(F32.sub(F32.mul(cosYaw, file), F32.mul(sinYaw, row)), span)
      +y = F32.div(F32.sub(F32.mul(sinPitch,
        F32.add(F32.mul(sinYaw, file), F32.mul(cosYaw, row))),
        F32.mul(cosPitch, height)), span)
      Quad.Point{F32.mul(U32.to_f32(size), F32.div(F32.add(x, frame_left()), frame_width())),
        F32.mul(U32.to_f32(size), F32.div(F32.add(y, frame_top()), frame_height()))}

def strength(normal: Vertex) -> U32:
  match normal:
    case Vertex{file, row, height}:
      +light = F32.add(F32.add(F32.mul(file, F32.neg(0.45)), F32.mul(row, F32.neg(0.55))),
        F32.mul(height, 0.75))
      F32.to_u32(F32.mul(F32.max(0.0, light), 86.0))

def navy_ink(normal: Vertex) -> U32:
  match normal:
    case Vertex{file, row, height}:
      +light = F32.add(F32.add(F32.mul(file, F32.neg(0.45)), F32.mul(row, F32.neg(0.55))),
        F32.mul(height, 0.75))
      +alpha = F32.to_u32(F32.min(255.0, F32.max(0.0,
        F32.add(160.0, F32.mul(144.0, light)))))
      Color.over(9417676, 2377308, alpha)

def nonband_ink(+normal: Vertex, +body: U32, glint: U32, shadow: U32) -> U32:
  match body:
    case 5208464: navy_ink(normal)
    case _: Color.over(glint, Color.over(body, shadow, 220), strength(normal))

def ink(band: Bool, +normal: Vertex, style: PieceArt.Material) -> U32:
  match band style:
    case False{} PieceArt.Material{body, shade, glint, shadow}:
      nonband_ink(normal, body, glint, shadow)
    case True{} PieceArt.Material{body, shade, glint, shadow}:
      Color.over(glint, shade, U32.add(66, strength(normal)))

def prepare_case(visible: Bool, face: Face, +camera: Camera.Basis,
  +size: U32, style: PieceArt.Material) -> Maybe<Painted>:
  match visible face:
    case False{} _: None{}
    case True{} Face{a, b, c, d, normal, middle, band}:
      Some{Painted{Quad.make(project(a, size, camera), project(b, size, camera),
        project(c, size, camera), project(d, size, camera)),
        ink(band, normal, style), view_dot(middle, camera)}}

def prepare(+face: Face, +camera: Camera.Basis,
  size: U32, style: PieceArt.Material) -> Maybe<Painted>:
  match face:
    case Face{a, b, c, d, normal, middle, band}:
      prepare_case(F32.is_gt(view_dot(normal, camera), 0.00001), face,
        camera, size, style)

def prepared_next(next: Maybe<Painted>, rest: List<&2, Painted>) -> List<&2, Painted>:
  match next:
    case None{}: rest
    case Some{face}: face <> rest

def prepared(mesh: List<&2, Face>, +camera: Camera.Basis,
  +size: U32, +style: PieceArt.Material) -> List<&2, Painted>:
  match mesh:
    case Nil{}: Nil{}
    case face <> rest:
      prepared_next(prepare(face, camera, size, style), prepared(rest, camera, size, style))

def painted_le(a: Painted, b: Painted) -> Bool:
  match a b:
    case Painted{q1, c1, +d1} Painted{q2, c2, +d2}:
      F32.is_le(d1, d2)

def solid_material(kind: U32, +code: U32) -> PieceArt.Material:
  match kind:
    case 2:
      Bool.pick(PieceArt.Material, U32.is_ge(code, 8),
        PieceArt.Material{5208464, 4877436, 12819815, 726816},
        PieceArt.material(code))
    case _: PieceArt.material(code)

type Channels is Data:
  Channels{colors: Image, mask: Image}

def paint(faces: List<&2, Painted>, +depth: Nat, +size: U32,
  channels: Channels) -> Channels:
  match faces channels:
    case Nil{} Channels{colors, mask}: Channels{colors, mask}
    case Painted{+quad, color, distance} <> rest Channels{colors, mask}:
      rgb alpha = Facet.draw(depth, size, quad, color, 255, colors)
        Facet.draw(depth, size, quad, 16777215, 255, mask)
      paint(rest, depth, size, Channels{rgb, alpha})

def straight_channel(value: U32, +alpha: U32) -> U32:
  U32.min(255, U32.div(U32.add(U32.mul(value, 255), U32.div(alpha, 2)), alpha))

def straight_leaf(empty: Bool, +color: U32, +alpha: U32) -> Image:
  match empty:
    case True{}: Pix{0}
    case False{}:
      Pix{Color.rgb(straight_channel(Color.red(color), alpha),
        straight_channel(Color.green(color), alpha),
        straight_channel(Color.blue(color), alpha))}

# Mask geometry supplies alpha; black RGB is valid artwork, not transparency.
def straight(+colors: Image, +mask: Image) -> Image:
  match colors mask:
    case Pix{color} Pix{grey}:
      +alpha = Color.red(grey)
      straight_leaf(U32.is_zero(alpha), color, alpha)
    case Pix{color} Qua{tl, tr, bl, br}:
      a b c d = straight(colors, tl) straight(colors, tr)
        straight(colors, bl) straight(colors, br)
      Qua{a, b, c, d}
    case Qua{tl, tr, bl, br} _:
      a b c d = straight(tl, ImageOps.tl(mask))
        straight(tr, ImageOps.tr(mask))
        straight(bl, ImageOps.bl(mask))
        straight(br, ImageOps.br(mask))
      Qua{a, b, c, d}

def texture_result(+depth: Nat, +size: U32, channels: Channels) -> Sample.Texture:
  match channels:
    case Channels{colors, +mask}: Sample.Texture{depth, size, straight(colors, mask), mask}

def texture(+depth: Nat, +size: U32, camera: Camera.Basis, code: U32) -> Sample.Texture:
  +faces = prepared(knight_mesh(), camera, size, solid_material(2, code))
  texture_result(depth, size,
    paint(List.sort(~Painted, ~painted_le, faces), depth, size, Channels{Pix{0}, Pix{0}}))
