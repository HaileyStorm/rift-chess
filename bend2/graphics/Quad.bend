# Projected convex quads, composed directly into the immutable pixel tree.
# Floating-point rasterization is presentation code, outside the frozen laws.
import Base

type Point is Data:
  Point{x: F32, y: F32}
type Edge is Data:
  Edge{a: F32, b: F32, c: F32, inset: F32}
type Shape is Data:
  Shape{ab: Edge, bc: Edge, cd: Edge, da: Edge, area: F32}

def edge(p: Point, q: Point, center: Point) -> Edge:
  match p q center:
    case Point{+x, +y} Point{+xx, +yy} Point{cx, cy}:
      +a = (y - yy : F32)
      +b = (xx - x : F32)
      +c = (x * yy - xx * y : F32)
      +sign = Bool.pick(F32, ((a * cx + b * cy + c) < 0.0 : F32), (0.0 - 1.0 : F32), 1.0)
      Edge{(a * sign : F32), (b * sign : F32), (c * sign : F32), (F32.abs(a) + F32.abs(b) : F32)}

def make(+a: Point, +b: Point, +c: Point, +d: Point) -> Shape:
  match a b c d:
    case Point{+ax, +ay} Point{+bx, +by} Point{+cx, +cy} Point{+dx, +dy}:
      +center = {Point{((ax + bx + cx + dx) / 4.0 : F32), ((ay + by + cy + dy) / 4.0 : F32)} : Point}
      Shape{edge(a, b, center), edge(b, c, center), edge(c, d, center), edge(d, a, center),
        F32.abs(((bx - ax) * (dy - ay) - (by - ay) * (dx - ax) : F32))}

def edge.low(e: Edge, +x: F32, +y: F32, +size: F32) -> F32:
  match e:
    case Edge{+a, +b, c, inset}:
      (a * x + b * y + c + F32.min(0.0, (a * size : F32)) + F32.min(0.0, (b * size : F32)) : F32)

def edge.high(e: Edge, +x: F32, +y: F32, +size: F32) -> F32:
  match e:
    case Edge{+a, +b, c, inset}:
      (a * x + b * y + c + F32.max(0.0, (a * size : F32)) + F32.max(0.0, (b * size : F32)) : F32)

def edge.inside(+e: Edge, x: F32, y: F32, size: F32) -> Bool:
  match e:
    case Edge{a, b, c, inset}:
      (edge.low(e, x, y, size) >= inset : F32)

def outside(q: Shape, +x: F32, +y: F32, +size: F32) -> Bool:
  match q:
    case Shape{a, b, c, d, area}:
      Bool.or((edge.high(a, x, y, size) < 0.0 : F32),
        Bool.or((edge.high(b, x, y, size) < 0.0 : F32),
          Bool.or((edge.high(c, x, y, size) < 0.0 : F32), (edge.high(d, x, y, size) < 0.0 : F32))))

def inside(q: Shape, +x: F32, +y: F32, +size: F32) -> Bool:
  match q:
    case Shape{a, b, c, d, area}:
      Bool.and(edge.inside(a, x, y, size), Bool.and(edge.inside(b, x, y, size),
        Bool.and(edge.inside(c, x, y, size), edge.inside(d, x, y, size))))

def face(solid: Bool, color: U32, image: Image) -> Image:
  match solid:
    case False{}: image
    case True{}: Pix{color}

def tree(+depth: Nat, out: Bool, full: Bool, +q: Shape, +solid: Bool,
  +border: U32, +color: U32, +x: F32, +y: F32, image: Image) -> Image:
  match depth out full:
    case 0n True{} _: image
    case 0n False{} True{}: face(solid, color, image)
    case 0n False{} False{}: Pix{border}
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}: face(solid, color, image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+base}:
          +half = U32.to_f32(U32.shln(1, rest))
          +size = (half - 1.0 : F32)
          +xx = (x + half : F32)
          +yy = (y + half : F32)
          a b c d = tree(rest, outside(q, x, y, size), inside(q, x, y, size), q, solid, border, color, x, y, Pix{base})
            tree(rest, outside(q, xx, y, size), inside(q, xx, y, size), q, solid, border, color, xx, y, Pix{base})
            tree(rest, outside(q, x, yy, size), inside(q, x, yy, size), q, solid, border, color, x, yy, Pix{base})
            tree(rest, outside(q, xx, yy, size), inside(q, xx, yy, size), q, solid, border, color, xx, yy, Pix{base})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.to_f32(U32.shln(1, rest))
          +size = (half - 1.0 : F32)
          +xx = (x + half : F32)
          +yy = (y + half : F32)
          a b c d = tree(rest, outside(q, x, y, size), inside(q, x, y, size), q, solid, border, color, x, y, tl)
            tree(rest, outside(q, xx, y, size), inside(q, xx, y, size), q, solid, border, color, xx, y, tr)
            tree(rest, outside(q, x, yy, size), inside(q, x, yy, size), q, solid, border, color, x, yy, bl)
            tree(rest, outside(q, xx, yy, size), inside(q, xx, yy, size), q, solid, border, color, xx, yy, br)
          Qua{a, b, c, d}

def draw.valid(valid: Bool, +q: Shape, solid: Bool, border: U32, color: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      tree(9n, outside(q, 0.0, 0.0, 511.0), inside(q, 0.0, 0.0, 511.0), q, solid, border, color, 0.0, 0.0, image)

def draw(+q: Shape, solid: Bool, border: U32, color: U32, image: Image) -> Image:
  match q:
    case Shape{a, b, c, d, area}:
      draw.valid((area > 0.1 : F32), q, solid, border, color, image)
