# DRAFT: half-open integer screen rectangles. Valid public coordinates are
# 0..4096; empty/reversed boxes denote no pixels. No camera/layout policy.
import Base
import ./Shapes.bend as Shapes

type Box is Data:
  Box{left: U32, top: U32, right: U32, bottom: U32}

def empty() -> Box:
  Box{0, 0, 0, 0}

def screen(+size: U32) -> Box:
  Box{0, 0, size, size}

def cell(+x: U32, +y: U32, +size: U32) -> Box:
  Box{x, y, U32.add(x, size), U32.add(y, size)}

def is_empty(box: Box) -> Bool:
  match box:
    case Box{left, top, right, bottom}:
      Bool.or(U32.is_ge(left, right), U32.is_ge(top, bottom))

def width(box: Box) -> U32:
  match box:
    case Box{+left, top, +right, bottom}: U32.sub(U32.max(left, right), left)

def height(box: Box) -> U32:
  match box:
    case Box{left, +top, right, +bottom}: U32.sub(U32.max(top, bottom), top)

def intersect(a: Box, b: Box) -> Box:
  match a b:
    case Box{al, at, ar, ab} Box{bl, bt, br, bb}:
      Box{U32.max(al, bl), U32.max(at, bt), U32.min(ar, br), U32.min(ab, bb)}

def overlaps(a: Box, b: Box) -> Bool:
  Bool.not(is_empty(intersect(a, b)))

def contains_parts(a: Box, b: Box) -> Bool:
  match a b:
    case Box{al, at, ar, ab} Box{bl, bt, br, bb}:
      Bool.and(Bool.and(U32.is_le(al, bl), U32.is_le(at, bt)),
        Bool.and(U32.is_ge(ar, br), U32.is_ge(ab, bb)))

def contains(+a: Box, +b: Box) -> Bool:
  Bool.or(is_empty(b), Bool.and(Bool.not(is_empty(a)), contains_parts(a, b)))

def point(box: Box, +x: U32, +y: U32) -> Bool:
  match box:
    case Box{left, top, right, bottom}:
      Bool.and(Bool.and(U32.is_ge(x, left), U32.is_lt(x, right)),
        Bool.and(U32.is_ge(y, top), U32.is_lt(y, bottom)))

def union_parts(a: Box, b: Box) -> Box:
  match a b:
    case Box{al, at, ar, ab} Box{bl, bt, br, bb}:
      Box{U32.min(al, bl), U32.min(at, bt), U32.max(ar, br), U32.max(ab, bb)}

def union_case(a_empty: Bool, b_empty: Bool, a: Box, b: Box) -> Box:
  match a_empty b_empty:
    case True{} _: b
    case False{} True{}: a
    case False{} False{}: union_parts(a, b)

def union(+a: Box, +b: Box) -> Box:
  union_case(is_empty(a), is_empty(b), a, b)

# Signed sprite bounds are clipped before bias removal; no U32 wrap for negatives.
def sprite_valid(valid: Bool, +size: U32, +sx: U32, +sy: U32,
  +span: U32) -> Box:
  match valid:
    case False{}: empty()
    case True{}:
      intersect(screen(size), Box{U32.sub(U32.max(sx, 4096), 4096),
        U32.sub(U32.max(sy, 4096), 4096),
        U32.sub(U32.max(U32.add(sx, span), 4096), 4096),
        U32.sub(U32.max(U32.add(sy, span), 4096), 4096)})

def sprite(+size: U32, +left: Shapes.Coord, +top: Shapes.Coord,
  +span: U32) -> Box:
  sprite_valid(Bool.and(Bool.and(Shapes.valid_coord(left), Shapes.valid_coord(top)),
    Bool.and(U32.is_le(size, 4096), U32.is_le(span, 4096))),
    size, Shapes.biased(left), Shapes.biased(top), span)
