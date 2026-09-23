import Base
import ./Camera.bend as Camera
import ../core/Model.bend as Model

# Inverse affine projection classifies the board once per image region, rather
# than clipping that region against every tile. All four children are immutable.
type Projection is Data:
  Projection{fx: F32, fy: F32, rx: F32, ry: F32, edgeF: F32, edgeR: F32}

def color(+file: U32, +row: U32, theme: U32) -> U32:
  +light = U32.is_even(U32.add(file, U32.sub(7, row)))
  +warm = U32.is_ne(theme, 0)
  Bool.pick(U32, light, Bool.pick(U32, warm, 13940123, 9868194), Bool.pick(U32, warm, 7358018, 3423317))

type Shade is Data:
  Clear{}
  Split{}
  Solid{color: U32}
# Short-circuit before the expensive hole lookup and palette computation.
# Cross-cell nonleaves must split regardless of their center cell's contents.
def classify.surface(gap: Bool, face: Bool, single: Bool, leaf: Bool,
  file: U32, row: U32, theme: U32) -> Shade:
  match gap face single leaf:
    case True{} _ _ _: Clear{}
    case False{} True{} True{} _: Solid{color(file, row, theme)}
    case False{} _ _ False{}: Split{}
    case False{} _ _ True{}: Solid{10851971}

def classify.present(present: Bool, +f: F32, +r: F32, +fi: F32, +ri: F32,
  +ef: F32, +er: F32, bf: F32, br: F32, theme: U32, single: Bool, leaf: Bool) -> Shade:
  match present:
    case False{}: Clear{}
    case True{}:
      +df = F32.abs((f - fi : F32))
      +dr = F32.abs((r - ri : F32))
      +gap = Bool.or((df - ef > 0.485 : F32), (dr - er > 0.485 : F32))
      +face = Bool.and((df + ef < 0.485 - bf : F32), (dr + er < 0.485 - br : F32))
      classify.surface(gap, face, single, leaf, F32.to_u32(fi), F32.to_u32(ri), theme)

def classify.cell(+single: Bool, +leaf: Bool, f: F32, r: F32, +fi: F32, +ri: F32,
  ef: F32, er: F32, bf: F32, br: F32, holes: U32, theme: U32) -> Shade:
  match single leaf:
    case False{} False{}: Split{}
    case _ _:
      +valid = Bool.and(Bool.and((fi >= 0.0 : F32), (fi < 8.0 : F32)), Bool.and((ri >= 0.0 : F32), (ri < 8.0 : F32)))
      +present = Bool.and(valid, Model.present(holes, Model.sq(F32.to_u32(fi), U32.sub(7, F32.to_u32(ri)))))
      classify.present(present, f, r, fi, ri, ef, er, bf, br, theme, single, leaf)

def classify.inside(outside: Bool, +f: F32, +r: F32, +ef: F32, +er: F32,
  bf: F32, br: F32, holes: U32, theme: U32, leaf: Bool) -> Shade:
  match outside:
    case True{}: Clear{}
    case False{}:
      +fi = F32.floor((f + 0.5 : F32))
      +ri = F32.floor((r + 0.5 : F32))
      +single = Bool.and(Bool.and((f - ef >= fi - 0.5 : F32), (f + ef < fi + 0.5 : F32)),
        Bool.and((r - er >= ri - 0.5 : F32), (r + er < ri + 0.5 : F32)))
      classify.cell(single, leaf, f, r, fi, ri, ef, er, bf, br, holes, theme)

def classify(+f: F32, +r: F32, +ef: F32, +er: F32, bf: F32, br: F32,
  holes: U32, theme: U32, leaf: Bool) -> Shade:
  +outside = Bool.or(Bool.or((f + ef < (0.0 - 0.485 : F32) : F32), (f - ef > 7.485 : F32)),
    Bool.or((r + er < (0.0 - 0.485 : F32) : F32), (r - er > 7.485 : F32)))
  classify.inside(outside, f, r, ef, er, bf, br, holes, theme, leaf)

def tree(+depth: Nat, +size: F32, +f: F32, +r: F32, +map: Projection,
  +holes: U32, +theme: U32, result: Shade, image: Image) -> Image:
  match depth map result:
    case 0n _ Clear{}: image
    case 0n _ Solid{color}: Pix{color}
    case 0n _ Split{}: image
    case 1n+rest _ Clear{}: image
    case 1n+rest _ Solid{color}: Pix{color}
    case 1n+rest Projection{+fx, +fy, +rx, +ry, +bf, +br} Split{}:
      match image:
        case Pix{+base}:
          +half = (size / 2.0 : F32)
          +d = (size / 4.0 : F32)
          +ef = ((F32.abs(fx) + F32.abs(fy)) * (half - 1.0) / 2.0 : F32)
          +er = ((F32.abs(rx) + F32.abs(ry)) * (half - 1.0) / 2.0 : F32)
          +leaf = (half <= 2.0 : F32)
          +ff = (f - d * fx - d * fy : F32)
          +rr = (r - d * rx - d * ry : F32)
          a b c d = tree(rest, half, ff, rr, map, holes, theme, classify(ff, rr, ef, er, bf, br, holes, theme, leaf), Pix{base})
            tree(rest, half, (ff + half * fx : F32), (rr + half * rx : F32), map, holes, theme, classify((ff + half * fx : F32), (rr + half * rx : F32), ef, er, bf, br, holes, theme, leaf), Pix{base})
            tree(rest, half, (ff + half * fy : F32), (rr + half * ry : F32), map, holes, theme, classify((ff + half * fy : F32), (rr + half * ry : F32), ef, er, bf, br, holes, theme, leaf), Pix{base})
            tree(rest, half, (ff + half * fx + half * fy : F32), (rr + half * rx + half * ry : F32), map, holes, theme, classify((ff + half * fx + half * fy : F32), (rr + half * rx + half * ry : F32), ef, er, bf, br, holes, theme, leaf), Pix{base})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, brImage}:
          +half = (size / 2.0 : F32)
          +d = (size / 4.0 : F32)
          +ef = ((F32.abs(fx) + F32.abs(fy)) * (half - 1.0) / 2.0 : F32)
          +er = ((F32.abs(rx) + F32.abs(ry)) * (half - 1.0) / 2.0 : F32)
          +leaf = (half <= 2.0 : F32)
          +ff = (f - d * fx - d * fy : F32)
          +rr = (r - d * rx - d * ry : F32)
          a b c d = tree(rest, half, ff, rr, map, holes, theme, classify(ff, rr, ef, er, bf, br, holes, theme, leaf), tl)
            tree(rest, half, (ff + half * fx : F32), (rr + half * rx : F32), map, holes, theme, classify((ff + half * fx : F32), (rr + half * rx : F32), ef, er, bf, br, holes, theme, leaf), tr)
            tree(rest, half, (ff + half * fy : F32), (rr + half * ry : F32), map, holes, theme, classify((ff + half * fy : F32), (rr + half * ry : F32), ef, er, bf, br, holes, theme, leaf), bl)
            tree(rest, half, (ff + half * fx + half * fy : F32), (rr + half * rx + half * ry : F32), map, holes, theme, classify((ff + half * fx + half * fy : F32), (rr + half * rx + half * ry : F32), ef, er, bf, br, holes, theme, leaf), brImage)
          Qua{a, b, c, d}

def draw(background: Image, holes: U32, theme: U32, basis: Camera.Basis) -> Image:
  match basis:
    case Camera.Basis{+cosYaw, +sinYaw, +sinPitch, cosPitch, +scale, +cx, +cy}:
      +fx = (cosYaw / scale : F32)
      +fy = (sinYaw / (scale * sinPitch) : F32)
      +rx = (0.0 - sinYaw / scale : F32)
      +ry = (cosYaw / (scale * sinPitch) : F32)
      +map = {Projection{fx, fy, rx, ry, (F32.abs(fx) + F32.abs(fy) : F32), (F32.abs(rx) + F32.abs(ry) : F32)} : Projection}
      tree(8n, 512.0, (3.5 + (255.5 - cx) * fx + (255.5 - cy) * fy : F32),
        (3.5 + (255.5 - cx) * rx + (255.5 - cy) * ry : F32), map, holes, theme, Split{}, background)


