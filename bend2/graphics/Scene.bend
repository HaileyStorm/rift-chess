import Base
import ../core/Model.bend as Model
import ./Pixel.bend as Pixel
import ./Sprites.bend as Sprites
import ./Picking.bend as Picking

type Frame is Data:
  Frame{position: Model.Position, previous: Model.Position, selected: U32,
    hovered: U32, targets: List<&2, U32>, tile: U32,
    tileTargets: List<&2, U32>, lastAction: U32, progress: U32, theme: U32}

def rect(+x: U32, +y: U32, width: U32, height: U32, color: U32, image: Image) -> Image:
  Pixel.fill_rect(Pixel.Rect{x, y, U32.add(x, width), U32.add(y, height)}, color, image)

def has(xs: List<&2, U32>, +value: U32) -> Bool:
  match xs:
    case Nil{}:
      False{}
    case h <> t:
      Bool.or(U32.is_eq(h, value), has(t, value))

def stars(n: Nat, +i: U32, image: Image) -> Image:
  match n:
    case 0n:
      image
    case 1n+p:
      +x = U32.add(16, U32.mod(U32.add(U32.mul(i, 97), U32.mul(i, i)), 480))
      +y = U32.add(20, U32.mod(U32.add(U32.mul(i, 73), U32.mul(i, i)), 380))
      +shade = Bool.pick(U32, U32.is_zero(U32.mod(i, 7)), 13944227, 5592703)
      stars(p, U32.add(i, 1), rect(x, y, 2, 2, shade, image))

def arch(n: Nat, +i: U32, image: Image) -> Image:
  match n:
    case 0n:
      image
    case 1n+p:
      +x = U32.add(48, U32.mul(i, 4))
      +dx = Bool.pick(U32, U32.is_lt(x, 256), U32.sub(256, x), U32.sub(x, 256))
      +y = U32.add(38, U32.div(U32.mul(dx, dx), 350))
      +a = rect(x, y, 4, 7, 3420228, image)
      +b = rect(x, y, 4, 2, 11636056, a)
      +c = rect(x, U32.add(y, 12), 4, 1, 5587296, b)
      arch(p, U32.add(i, 1), c)

def pillar(+x: U32, image: Image) -> Image:
  +a = rect(x, 156, 14, 157, 1580596, image)
  +b = rect(x, 156, 3, 157, 6706033, a)
  +c = rect(U32.add(x, 12), 156, 2, 157, 10978129, b)
  +d = rect(U32.sub(x, 4), 152, 22, 5, 11767128, c)
  +e = rect(U32.sub(x, 4), 307, 22, 7, 7692412, d)
  rect(U32.add(x, 5), 167, 3, 123, 2370628, e)

def backdrop() -> Image:
  +a = rect(0, 96, 512, 260, 1120043, Pix{790561})
  +b = rect(40, 125, 432, 224, 1513776, a)
  +c = rect(92, 166, 328, 193, 1842488, b)
  +d = stars(110n, 1, c)
  +e = arch(105n, 0, d)
  +f = pillar(39, e)
  +g = pillar(459, f)
  +h = rect(252, 25, 8, 28, 14467979, g)
  +j = rect(242, 35, 28, 8, 14467979, h)
  +k = rect(254, 18, 4, 43, 16773305, j)
  +l = rect(214, 72, 84, 1, 6444407, k)
  +m = rect(230, 78, 52, 1, 12161625, l)
  rect(249, 87, 14, 3, 7453383, m)

# Direct clipped quadtree composition avoids repainting every scanline.
def distance(+a: U32, +b: U32) -> U32:
  Bool.pick(U32, U32.is_ge(a, b), U32.sub(a, b), U32.sub(b, a))

def axis_min(+lo: U32, +hi: U32, +center: U32) -> U32:
  Bool.pick(U32, U32.is_lt(center, lo), U32.sub(lo, center),
    Bool.pick(U32, U32.is_gt(center, hi), U32.sub(center, hi), 0))

def axis_max(+lo: U32, +hi: U32, +center: U32) -> U32:
  +a = distance(lo, center)
  +b = distance(hi, center)
  Bool.pick(U32, U32.is_gt(a, b), a, b)

def diamond.out(+depth: Nat, +x: U32, +y: U32, cx: U32, cy: U32, radius: U32) -> Bool:
  +size = U32.sub(U32.shln(1, depth), 1)
  U32.is_gt(U32.add(axis_min(x, U32.add(x, size), cx),
    U32.mul(2, axis_min(y, U32.add(y, size), cy))), U32.mul(radius, 2))

def diamond.in(+depth: Nat, +x: U32, +y: U32, cx: U32, cy: U32, radius: U32) -> Bool:
  +size = U32.sub(U32.shln(1, depth), 1)
  U32.is_le(U32.add(axis_max(x, U32.add(x, size), cx),
    U32.mul(2, axis_max(y, U32.add(y, size), cy))), U32.sub(U32.mul(radius, 2), 2))

def diamond.tree(+depth: Nat, outside: Bool, inside: Bool,
  +x: U32, +y: U32, +cx: U32, +cy: U32, +radius: U32,
  +edge: U32, +face: U32, image: Image) -> Image:
  match depth outside inside:
    case 0n True{} _:
      image
    case 0n False{} True{}:
      Pix{face}
    case 0n False{} False{}:
      Pix{edge}
    case 1n+rest True{} _:
      image
    case 1n+rest False{} True{}:
      Pix{face}
    case 1n+rest False{} False{}:
      match image:
        case Pix{+base}:
          +half = U32.shln(1, rest)
          a b c d = diamond.tree(rest, diamond.out(rest, x, y, cx, cy, radius), diamond.in(rest, x, y, cx, cy, radius), x, y, cx, cy, radius, edge, face, Pix{base})
            diamond.tree(rest, diamond.out(rest, U32.add(x, half), y, cx, cy, radius), diamond.in(rest, U32.add(x, half), y, cx, cy, radius), U32.add(x, half), y, cx, cy, radius, edge, face, Pix{base})
            diamond.tree(rest, diamond.out(rest, x, U32.add(y, half), cx, cy, radius), diamond.in(rest, x, U32.add(y, half), cx, cy, radius), x, U32.add(y, half), cx, cy, radius, edge, face, Pix{base})
            diamond.tree(rest, diamond.out(rest, U32.add(x, half), U32.add(y, half), cx, cy, radius), diamond.in(rest, U32.add(x, half), U32.add(y, half), cx, cy, radius), U32.add(x, half), U32.add(y, half), cx, cy, radius, edge, face, Pix{base})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.shln(1, rest)
          a b c d = diamond.tree(rest, diamond.out(rest, x, y, cx, cy, radius), diamond.in(rest, x, y, cx, cy, radius), x, y, cx, cy, radius, edge, face, tl)
            diamond.tree(rest, diamond.out(rest, U32.add(x, half), y, cx, cy, radius), diamond.in(rest, U32.add(x, half), y, cx, cy, radius), U32.add(x, half), y, cx, cy, radius, edge, face, tr)
            diamond.tree(rest, diamond.out(rest, x, U32.add(y, half), cx, cy, radius), diamond.in(rest, x, U32.add(y, half), cx, cy, radius), x, U32.add(y, half), cx, cy, radius, edge, face, bl)
            diamond.tree(rest, diamond.out(rest, U32.add(x, half), U32.add(y, half), cx, cy, radius), diamond.in(rest, U32.add(x, half), U32.add(y, half), cx, cy, radius), U32.add(x, half), U32.add(y, half), cx, cy, radius, edge, face, br)
          Qua{a, b, c, d}

def diamond(+cx: U32, +cy: U32, +radius: U32, edge: U32, face: U32, image: Image) -> Image:
  diamond.tree(9n, False{}, False{}, 0, 0, cx, cy, radius, edge, face, image)

def marker(show: Bool, +x: U32, +y: U32, +color: U32, image: Image) -> Image:
  match show:
    case False{}:
      image
    case True{}:
      diamond(x, y, 3, color, color, image)

# Animation remains pure: positions are interpolated from the canonical action.
def motion_source.action(action: Model.Action, +square: U32) -> U32:
  match action:
    case Model.MoveAction{from, to, promotion}:
      Bool.pick(U32, U32.is_eq(square, to), from, square)
    case Model.ShiftAction{from, to, promotion}:
      Bool.pick(U32, U32.is_eq(Model.macro_of(square), to),
        Model.square_in_macro(from, U32.add(U32.mod(Model.file_of(square), 2),
          U32.mul(U32.mod(Model.rank_of(square), 2), 2))), square)

def motion_source(decoded: Maybe<Model.Action>, +square: U32) -> U32:
  match decoded:
    case None{}:
      square
    case Some{action}:
      motion_source.action(action, square)

def lerp(+a: U32, b: U32, +progress: U32) -> U32:
  U32.div(U32.add(U32.mul(a, U32.sub(16, progress)), U32.mul(b, progress)), 16)

def moving_x(+square: U32, +action: U32, progress: U32) -> U32:
  lerp(Picking.center_x(motion_source(Model.decode(action), square)), Picking.center_x(square), progress)

def moving_y(+square: U32, +action: U32, +progress: U32) -> U32:
  +source = motion_source(Model.decode(action), square)
  +hop = Bool.pick(U32, U32.is_ne(source, square), U32.div(U32.mul(progress, U32.sub(16, progress)), 4), 0)
  U32.sub(lerp(Picking.center_y(source), Picking.center_y(square), progress), hop)

def face_color(+square: U32, holes: U32, theme: U32) -> U32:
  +checker = U32.is_zero(U32.mod(U32.add(Model.file_of(square), Model.rank_of(square)), 2))
  +warm = U32.is_ne(theme, 0)
  Bool.pick(U32, Model.present(holes, square),
    Bool.pick(U32, checker, Bool.pick(U32, warm, 13940123, 9868194),
      Bool.pick(U32, warm, 7358018, 3423317)), 1058614)

def tile(+square: U32, +holes: U32, +selected: U32, +hovered: U32,
  +targets: List<&2, U32>, +chosen: U32, +tileTargets: List<&2, U32>, +action: U32, +progress: U32, +theme: U32, image: Image) -> Image:
  +tile_action = Bool.pick(U32, U32.is_ge(action, 20480), action, 21760)
  +x = moving_x(square, tile_action, progress)
  +y = moving_y(square, tile_action, progress)
  +present = Model.present(holes, square)
  +face = face_color(square, holes, theme)
  +base_edge = Bool.pick(U32, present, 10851971, 2854299)
  +active = Bool.or(U32.is_eq(selected, square), U32.is_eq(chosen, Model.macro_of(square)))
  +edge = Bool.pick(U32, active, 16767113,
    Bool.pick(U32, U32.is_eq(hovered, square), 11073279, base_edge))
  +a = diamond(x, U32.add(y, 9), 11, 1121328, Bool.pick(U32, present, 2634058, 727079), image)
  +b = diamond(x, U32.add(y, 5), 11, Bool.pick(U32, present, 5000036, 2053993), 2370626, a)
  +c = diamond(x, y, 11, edge, face, b)
  +d = marker(Bool.not(present), x, y, 5558735, c)
  +e = marker(has(targets, square), U32.add(x, 14), y, 16769440, d)
  marker(has(tileTargets, Model.macro_of(square)), x, U32.sub(y, 3), 16034408, e)

def tiles(n: Nat, +i: U32, +holes: U32, +selected: U32, +hovered: U32,
  +targets: List<&2, U32>, +chosen: U32, +tileTargets: List<&2, U32>, +action: U32, +progress: U32, +theme: U32, image: Image) -> Image:
  match n:
    case 0n:
      image
    case 1n+p:
      +square = Model.sq(U32.mod(i, 8), U32.sub(7, U32.div(i, 8)))
      tiles(p, U32.add(i, 1), holes, selected, hovered, targets, chosen, tileTargets, action, progress, theme,
        tile(square, holes, selected, hovered, targets, chosen, tileTargets, action, progress, theme, image))

def capture_square(decoded: Maybe<Model.Action>, +previous: Model.Position) -> U32:
  match decoded:
    case None{}:
      64
    case Some{action}:
      match action:
        case Model.ShiftAction{from, to, promotion}:
          64
        case Model.MoveAction{+from, +to, promotion}:
          +board = Model.pos_board(previous)
          +ep = Bool.and(U32.is_eq(to, Model.pos_ep(previous)), Model.is_pawn(Model.board_get(board, from)))
          Bool.pick(U32, Model.occupied(Model.board_get(board, to)), to,
            Bool.pick(U32, ep, Model.pos_ep_pawn(previous), 64))

def piece(show: Bool, code: U32, x: U32, y: U32, +selected: Bool, hovered: Bool, image: Image) -> Image:
  match show:
    case False{}:
      image
    case True{}:
      Sprites.outlined(Bool.or(selected, hovered), code, x, y,
        Bool.pick(U32, selected, 8388607, 13743871), image)

def pieces.cell(valid: Bool, +file: U32, +row: U32, +board: List<&2, U32>,
  +action: U32, +progress: U32, +selected: U32, +hovered: U32,
  +victim: U32, +victim_code: U32, image: Image) -> Image:
  match valid:
    case False{}:
      image
    case True{}:
      +square = Model.sq(file, U32.sub(7, row))
      +code = Model.board_get(board, square)
      +a = Sprites.dying(Bool.and(U32.is_eq(victim, square), U32.is_lt(progress, 16)),
        victim_code, Picking.center_x(square), Picking.center_y(square), progress, image)
      piece(Model.occupied(code), code, moving_x(square, action, progress), moving_y(square, action, progress),
        U32.is_eq(selected, square), U32.is_eq(hovered, square), a)

def pieces(n: Nat, +i: U32, +board: List<&2, U32>, +action: U32, +progress: U32,
  +selected: U32, +hovered: U32, +victim: U32, +victim_code: U32, image: Image) -> Image:
  match n:
    case 0n:
      image
    case 1n+p:
      +file = U32.mod(i, 8)
      +depth = U32.div(i, 8)
      +row = U32.sub(depth, file)
      pieces(p, U32.add(i, 1), board, action, progress, selected, hovered, victim, victim_code,
        pieces.cell(U32.is_lt(row, 8), file, row, board, action, progress, selected, hovered, victim, victim_code, image))

def impact.show(show: Bool, +square: U32, +progress: U32, image: Image) -> Image:
  match show:
    case False{}:
      image
    case True{}:
      +x = Picking.center_x(square)
      +y = U32.sub(Picking.center_y(square), 10)
      +spread = U32.add(6, progress)
      +a = rect(U32.sub(x, spread), U32.sub(y, progress), 3, 3, 16768672, image)
      +b = rect(U32.add(x, spread), U32.sub(y, progress), 3, 3, 11069183, a)
      +c = rect(U32.sub(x, U32.div(spread, 2)), U32.sub(y, spread), 2, 4, 16768672, b)
      rect(U32.add(x, U32.div(spread, 2)), U32.add(y, 3), 3, 2, 11069183, c)

def impact(decoded: Maybe<Model.Action>, previous: Model.Position, +progress: U32, image: Image) -> Image:
  +victim = capture_square(decoded, previous)
  impact.show(Bool.and(U32.is_lt(victim, 64), U32.is_lt(progress, 16)), victim, progress, image)

def background() -> Image:
  +a = diamond(256, 352, 58, 2631743, 1449009, backdrop())
  +b = diamond(256, 348, 52, 5522268, 1974842, a)
  diamond(256, 344, 44, 8676428, 2303551, b)

def ground_base(background: Image, position: Model.Position, theme: U32) -> Image:
  tiles(64n, 0, Model.pos_holes(position), 64, 64, Nil{}, 16, Nil{}, 21760, 16, theme, background)

def feedback.rim(show: Bool, +square: U32, +holes: U32, theme: U32, color: U32, image: Image) -> Image:
  match show:
    case False{}:
      image
    case True{}:
      +face = face_color(square, holes, theme)
      diamond(Picking.center_x(square), Picking.center_y(square), 11, color, face, image)

def feedback.go(n: Nat, +square: U32, +holes: U32, +selected: U32, +hovered: U32,
  +targets: List<&2, U32>, +chosen: U32, +tileTargets: List<&2, U32>, +theme: U32, image: Image) -> Image:
  match n:
    case 0n:
      image
    case 1n+p:
      +active = Bool.or(U32.is_eq(selected, square), U32.is_eq(chosen, Model.macro_of(square)))
      +a = feedback.rim(Bool.or(active, U32.is_eq(hovered, square)), square, holes, theme,
        Bool.pick(U32, active, 16767113, 11073279), image)
      +b = marker(has(targets, square), U32.add(Picking.center_x(square), 14), Picking.center_y(square), 16769440, a)
      +c = marker(has(tileTargets, Model.macro_of(square)), Picking.center_x(square),
        U32.sub(Picking.center_y(square), 3), 16034408, b)
      feedback.go(p, U32.add(square, 1), holes, selected, hovered, targets, chosen, tileTargets, theme, c)

def feedback_on(base: Image, frame: Frame) -> Image:
  match frame:
    case Frame{position, previous, selected, hovered, targets, tile, tileTargets, lastAction, progress, theme}:
      feedback.go(64n, 0, Model.pos_holes(position), selected, hovered, targets, tile, tileTargets, theme, base)

# Cache this layer by holes/selection/hover/targets and settled shift state.
def ground_on(background: Image, frame: Frame) -> Image:
  match frame:
    case Frame{position, previous, selected, hovered, targets, tile, tileTargets, lastAction, progress, theme}:
      tiles(64n, 0, Model.pos_holes(position), selected, hovered, targets, tile, tileTargets, lastAction, progress, theme, background)

# Destination beacons stay visible above foreground silhouettes. They are
# visual feedback only; Picking deliberately keeps opaque-piece priority.
def target_beacons(targets: List<&2, U32>, image: Image) -> Image:
  match targets:
    case Nil{}:
      image
    case +square <> rest:
      +x = U32.add(Picking.center_x(square), 14)
      +y = Picking.center_y(square)
      +a = diamond(x, y, 4, 790561, 16769440, image)
      target_beacons(rest, a)

# Piece move animation may reuse ground_on; shift animation must rebuild it.
def pieces_on(ground: Image, frame: Frame) -> Image:
  match frame:
    case Frame{position, +previous, selected, hovered, targets, tile, tileTargets, +lastAction, +progress, theme}:
      +victim = capture_square(Model.decode(lastAction), previous)
      +e = pieces(120n, 0, Model.pos_board(position), lastAction, progress, selected, hovered, victim,
        Model.board_get(Model.pos_board(previous), victim), ground)
      target_beacons(targets, impact(Model.decode(lastAction), previous, progress, e))

def view_on(background: Image, +frame: Frame) -> Image:
  pieces_on(ground_on(background, frame), frame)

def view(frame: Frame) -> Image:
  view_on(background(), frame)


