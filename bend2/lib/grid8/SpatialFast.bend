# Interaction-grade affine top-face renderer. Each target Image cell is
# classified in board coordinates before descent. Whole cells outside the
# board or inside one tile return the old subtree or one Pix; only boundaries
# recurse. No shadows, sides, antialias or costly scene rebuilding during drag.
# The caller keeps the cached observatory/base Image and supplies the current
# Camera.Basis affine projection; settle with RaisedFacet.draw_cell later.
# Inverse coefficients are formed once per frame. Ideal continuous cells are
# half-open; exact integer board coordinates belong to the next cell. A +1e-5
# board-coordinate F32 bias approximates that tie convention. The finite JS
# oracle treats only pixels within ±1e-5 of any integer board line as
# precision-ambiguous, accepting either neighboring cell; outside that band
# unbiased scalar output must agree exactly. This is not a cross-target proof:
# native/GPU edge pixels need separate device differential checks.
import Base
import ../graphics/Quad.bend as Quad
import ./Board.bend as Board
import ./SpatialBoard.bend as SpatialBoard

type Affine is Data:
  Affine{origin_x: F32, origin_y: F32,
    file_x: F32, file_y: F32, rank_x: F32, rank_y: F32}

type Inverse is Data:
  Inverse{origin_x: F32, origin_y: F32,
    file_x: F32, file_y: F32, rank_x: F32, rank_y: F32}

type Bounds is Data:
  Bounds{min_file: F32, max_file: F32, min_rank: F32, max_rank: F32}

type Region is Data:
  Skip{}
  Fill{color: U32}
  Split{}

def det(a: Affine) -> F32:
  match a:
    case Affine{ox, oy, +fx, +fy, +rx, +ry}:
      F32.sub(F32.mul(fx, ry), F32.mul(fy, rx))

def invert(a: Affine) -> Inverse:
  match a:
    case Affine{ox, oy, +fx, +fy, +rx, +ry}:
      +d = F32.sub(F32.mul(fx, ry), F32.mul(fy, rx))
      Inverse{ox, oy, F32.div(ry, d), F32.div(F32.neg(rx), d),
        F32.div(F32.neg(fy), d), F32.div(fx, d)}

def file_at(a: Inverse, +x: F32, +y: F32) -> F32:
  match a:
    case Inverse{+ox, +oy, +fx, +fy, rx, ry}:
      +dx = F32.sub(x, ox)
      +dy = F32.sub(y, oy)
      F32.add(F32.add(F32.mul(dx, fx), F32.mul(dy, fy)), 0.00001)

def rank_at(a: Inverse, +x: F32, +y: F32) -> F32:
  match a:
    case Inverse{+ox, +oy, fx, fy, +rx, +ry}:
      +dx = F32.sub(x, ox)
      +dy = F32.sub(y, oy)
      F32.add(F32.add(F32.mul(dx, rx), F32.mul(dy, ry)), 0.00001)

def bounds(+a: Inverse, +x: U32, +y: U32, +size: U32) -> Bounds:
  match a:
    case Inverse{ox, oy, +fx, +fy, +rx, +ry}:
      +lo_x = F32.add(U32.to_f32(x), 0.5)
      +lo_y = F32.add(U32.to_f32(y), 0.5)
      +span = U32.to_f32(U32.sub(size, 1))
      +fbase = file_at(a, lo_x, lo_y)
      +rbase = rank_at(a, lo_x, lo_y)
      +fdx = F32.mul(fx, span)
      +fdy = F32.mul(fy, span)
      +rdx = F32.mul(rx, span)
      +rdy = F32.mul(ry, span)
      Bounds{F32.add(fbase, F32.add(F32.min(0.0, fdx), F32.min(0.0, fdy))),
        F32.add(fbase, F32.add(F32.max(0.0, fdx), F32.max(0.0, fdy))),
        F32.add(rbase, F32.add(F32.min(0.0, rdx), F32.min(0.0, rdy))),
        F32.add(rbase, F32.add(F32.max(0.0, rdx), F32.max(0.0, rdy)))}

def color_case(visible: Bool, even: Bool, palette: SpatialBoard.Palette) -> Region:
  match visible even palette:
    case False{} _ _: Skip{}
    case True{} True{} SpatialBoard.Palette{light, dark, ls, ds, edge, shadow, glint}:
      Fill{light}
    case True{} False{} SpatialBoard.Palette{light, dark, ls, ds, edge, shadow, glint}:
      Fill{dark}

def region_case(outside: Bool, uniform: Bool,
  +min_file: F32, +min_rank: F32, +mask: Board.Mask,
  +palette: SpatialBoard.Palette) -> Region:
  match outside uniform:
    case True{} _: Skip{}
    case False{} False{}: Split{}
    case False{} True{}:
      +file = F32.to_u32(F32.floor(min_file))
      +rank = F32.to_u32(F32.floor(min_rank))
      color_case(Board.present(mask, U32.add(file, U32.mul(rank, 8))),
        U32.is_zero(U32.mod(U32.add(file, rank), 2)), palette)

def from_bounds(value: Bounds, +mask: Board.Mask,
  +palette: SpatialBoard.Palette) -> Region:
  match value:
    case Bounds{+min_f, +max_f, +min_r, +max_r}:
      +outside = Bool.or(Bool.or(F32.is_lt(max_f, 0.0), F32.is_ge(min_f, 8.0)),
        Bool.or(F32.is_lt(max_r, 0.0), F32.is_ge(min_r, 8.0)))
      +within = Bool.and(Bool.and(F32.is_ge(min_f, 0.0), F32.is_lt(max_f, 8.0)),
        Bool.and(F32.is_ge(min_r, 0.0), F32.is_lt(max_r, 8.0)))
      +same = Bool.and(F32.is_eq(F32.floor(min_f), F32.floor(max_f)),
        F32.is_eq(F32.floor(min_r), F32.floor(max_r)))
      region_case(outside, Bool.and(within, same), min_f, min_r, mask, palette)

def classify(+a: Inverse, +x: U32, +y: U32, +size: U32,
  +mask: Board.Mask, +palette: SpatialBoard.Palette) -> Region:
  from_bounds(bounds(a, x, y, size), mask, palette)

def tree(+depth: Nat, +size: U32, region: Region,
  +x: U32, +y: U32, +a: Inverse, +mask: Board.Mask,
  +palette: SpatialBoard.Palette, image: Image) -> Image:
  match depth region:
    case 0n Skip{}: image
    case 0n Fill{color}: Pix{color}
    case 0n Split{}: image
    case 1n+rest Skip{}: image
    case 1n+rest Fill{color}: Pix{color}
    case 1n+rest Split{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          tl tr bl br = tree(rest, half, classify(a, x, y, half, mask, palette), x, y, a, mask, palette, Pix{background})
            tree(rest, half, classify(a, xx, y, half, mask, palette), xx, y, a, mask, palette, Pix{background})
            tree(rest, half, classify(a, x, yy, half, mask, palette), x, yy, a, mask, palette, Pix{background})
            tree(rest, half, classify(a, xx, yy, half, mask, palette), xx, yy, a, mask, palette, Pix{background})
          Qua{tl, tr, bl, br}
        case Qua{old_tl, old_tr, old_bl, old_br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          tl tr bl br = tree(rest, half, classify(a, x, y, half, mask, palette), x, y, a, mask, palette, old_tl)
            tree(rest, half, classify(a, xx, y, half, mask, palette), xx, y, a, mask, palette, old_tr)
            tree(rest, half, classify(a, x, yy, half, mask, palette), x, yy, a, mask, palette, old_bl)
            tree(rest, half, classify(a, xx, yy, half, mask, palette), xx, yy, a, mask, palette, old_br)
          Qua{tl, tr, bl, br}

def valid_case(valid: Bool, +depth: Nat, +size: U32, +a: Affine,
  +mask: Board.Mask, +palette: SpatialBoard.Palette, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      +inverse = invert(a)
      tree(depth, size, classify(inverse, 0, 0, size, mask, palette),
        0, 0, inverse, mask, palette, image)

def draw(+depth: Nat, +size: U32, +a: Affine,
  +mask: Board.Mask, +palette: SpatialBoard.Palette, image: Image) -> Image:
  valid_case(Bool.and(Bool.not(Board.empty_mask(mask)), F32.is_ne(det(a), 0.0)),
    depth, size, a, mask, palette, image)

def preset(p: SpatialBoard.Projection) -> Affine:
  match p:
    case SpatialBoard.Projection{ox, oy, fdx, fup, rdx, rdown, thick}:
      Affine{U32.to_f32(ox), U32.to_f32(oy), U32.to_f32(fdx),
        F32.neg(U32.to_f32(fup)), U32.to_f32(rdx), U32.to_f32(rdown)}

def center(a: Affine, +file: U32, +rank: U32) -> Quad.Point:
  match a:
    case Affine{+ox, +oy, +fx, +fy, +rx, +ry}:
      +f = F32.add(U32.to_f32(file), 0.5)
      +r = F32.add(U32.to_f32(rank), 0.5)
      Quad.Point{F32.add(ox, F32.add(F32.mul(f, fx), F32.mul(r, rx))),
        F32.add(oy, F32.add(F32.mul(f, fy), F32.mul(r, ry)))}
