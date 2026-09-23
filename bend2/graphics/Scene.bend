import Base
import ../core/Model.bend as Model
import ../lib/graphics/pixels/Pixel.bend as Pixel
import ./Sprites.bend as Sprites
import ./Camera.bend as Camera
import ../lib/graphics/Quad.bend as Quad
import ./FastGround.bend as FastGround

# targets: destination squares to mark (empty unless overlays are enabled);
# tileTargets: destination holes of the selected tile; shifts: legal Shift
# indicators as from*16+to platform pairs; check: the checked king or 64.
type Frame is Data:
  Frame{position: Model.Position, previous: Model.Position, selected: U32, hovered: U32, targets: List<&2, U32>, tile: U32, tileTargets: List<&2, U32>, lastAction: U32, progress: U32, theme: U32, view: Camera.View, shifts: List<&2, U32>, check: U32}

# BEGIN GENERATED ACCESSORS: Frame prefix=frame_ getters
def frame_position(s: Frame) -> Model.Position:
  match s:
    case Frame{position, _, _, _, _, _, _, _, _, _, _, _, _}: position

def frame_previous(s: Frame) -> Model.Position:
  match s:
    case Frame{_, previous, _, _, _, _, _, _, _, _, _, _, _}: previous

def frame_selected(s: Frame) -> U32:
  match s:
    case Frame{_, _, selected, _, _, _, _, _, _, _, _, _, _}: selected

def frame_hovered(s: Frame) -> U32:
  match s:
    case Frame{_, _, _, hovered, _, _, _, _, _, _, _, _, _}: hovered

def frame_targets(s: Frame) -> List<&2, U32>:
  match s:
    case Frame{_, _, _, _, targets, _, _, _, _, _, _, _, _}: targets

def frame_tile(s: Frame) -> U32:
  match s:
    case Frame{_, _, _, _, _, tile, _, _, _, _, _, _, _}: tile

def frame_tileTargets(s: Frame) -> List<&2, U32>:
  match s:
    case Frame{_, _, _, _, _, _, tileTargets, _, _, _, _, _, _}: tileTargets

def frame_lastAction(s: Frame) -> U32:
  match s:
    case Frame{_, _, _, _, _, _, _, lastAction, _, _, _, _, _}: lastAction

def frame_progress(s: Frame) -> U32:
  match s:
    case Frame{_, _, _, _, _, _, _, _, progress, _, _, _, _}: progress

def frame_theme(s: Frame) -> U32:
  match s:
    case Frame{_, _, _, _, _, _, _, _, _, theme, _, _, _}: theme

def frame_view(s: Frame) -> Camera.View:
  match s:
    case Frame{_, _, _, _, _, _, _, _, _, _, view, _, _}: view

def frame_shifts(s: Frame) -> List<&2, U32>:
  match s:
    case Frame{_, _, _, _, _, _, _, _, _, _, _, shifts, _}: shifts

def frame_check(s: Frame) -> U32:
  match s:
    case Frame{_, _, _, _, _, _, _, _, _, _, _, _, check}: check
# END GENERATED ACCESSORS

def rect(+x: U32, +y: U32, width: U32, height: U32, color: U32, image: Image) -> Image:
  Pixel.fill_rect(Pixel.Rect{x, y, U32.add(x, width), U32.add(y, height)}, color, image)

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

def moving_x(+square: U32, +action: U32, progress: U32, +camera: Camera.Basis) -> U32:
  lerp(Camera.center_x(motion_source(Model.decode(action), square), camera), Camera.center_x(square, camera), progress)

def moving_y(+square: U32, +action: U32, +progress: U32, +camera: Camera.Basis) -> U32:
  +source = motion_source(Model.decode(action), square)
  +hop = Bool.pick(U32, U32.is_ne(source, square), U32.div(U32.mul(progress, U32.sub(16, progress)), 4), 0)
  U32.sub(lerp(Camera.center_y(source, camera), Camera.center_y(square, camera), progress), hop)

def face_color(+square: U32, theme: U32) -> U32:
  +checker = U32.is_zero(U32.mod(U32.add(Model.file_of(square), Model.rank_of(square)), 2))
  +warm = U32.is_ne(theme, 0)
  Bool.pick(U32, checker, Bool.pick(U32, warm, 13940123, 9868194), Bool.pick(U32, warm, 7358018, 3423317))

type Patch is Data:
  Patch{a: Quad.Point, b: Quad.Point, c: Quad.Point, d: Quad.Point}

def projected(+camera: Camera.Basis, +file: F32, +row: F32, drop: F32) -> Quad.Point:
  Quad.Point{Camera.project_x(camera, file, row), (Camera.project_y(camera, file, row) + drop : F32)}

def patch(+camera: Camera.Basis, +file: F32, +row: F32, +drop: F32) -> Patch:
  Patch{projected(camera, (file - 0.485 : F32), (row - 0.485 : F32), drop),
    projected(camera, (file + 0.485 : F32), (row - 0.485 : F32), drop),
    projected(camera, (file + 0.485 : F32), (row + 0.485 : F32), drop),
    projected(camera, (file - 0.485 : F32), (row + 0.485 : F32), drop)}

def patch.draw(p: Patch, solid: Bool, edge: U32, face: U32, image: Image) -> Image:
  match p:
    case Patch{a, b, c, d}:
      Quad.draw(Quad.make(a, b, c, d), solid, edge, face, image)

def edge.front(a: Quad.Point, b: Quad.Point) -> Bool:
  match a b:
    case Quad.Point{ax, ay} Quad.Point{bx, by}: (ax > bx : F32)

def wall(show: Bool, a: Quad.Point, b: Quad.Point, bb: Quad.Point, aa: Quad.Point,
  shade: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: Quad.draw(Quad.make(a, b, bb, aa), True{}, 1121328, shade, image)

def walls(show: Bool, +square: U32, top: Patch, lower: Patch, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}:
      match top lower:
        case Patch{+a, +b, +c, +d} Patch{+aa, +bb, +cc, +dd}:
          +left = U32.is_even(Model.file_of(square))
          +bottom = U32.is_even(Model.rank_of(square))
          # A platform is 2x2: its internal checker lines have no side walls.
          # Back-facing walls are hidden by the top and need no raster work.
          +one = wall(Bool.and(Bool.not(bottom), edge.front(a, b)), a, b, bb, aa, 2634058, image)
          +two = wall(Bool.and(Bool.not(left), edge.front(b, c)), b, c, cc, bb, 5000036, one)
          +three = wall(Bool.and(bottom, edge.front(c, d)), c, d, dd, cc, 5000036, two)
          wall(Bool.and(left, edge.front(d, a)), d, a, aa, dd, 2634058, three)

def tile.present(present: Bool, +square: U32, action: U32, +progress: U32,
  theme: U32, +camera: Camera.Basis, image: Image) -> Image:
  match present:
    case False{}:
      # A missing platform contributes no surface, wall, base or center marker.
      image
    case True{}:
      +source = motion_source(Model.decode(action), square)
      +t = (U32.to_f32(progress) / 16.0 : F32)
      +file = F32.lerp(U32.to_f32(Model.file_of(source)), U32.to_f32(Model.file_of(square)), t)
      +row = F32.lerp(U32.to_f32(U32.sub(7, Model.rank_of(source))), U32.to_f32(U32.sub(7, Model.rank_of(square))), t)
      +top = patch(camera, file, row, 0.0)
      +height = Camera.extrusion(camera)
      +lower = patch(camera, file, row, U32.to_f32(height))
      +sides = walls(U32.is_ne(height, 0), square, top, lower, image)
      patch.draw(top, True{}, 10851971, face_color(square, theme), sides)

def tiles(order: List<&2, U32>, +holes: U32, +action: U32, +progress: U32,
  +theme: U32, +camera: Camera.Basis, image: Image) -> Image:
  match order:
    case Nil{}: image
    case +square <> rest:
      tiles(rest, holes, action, progress, theme, camera,
        tile.present(Model.present(holes, square), square, action, progress, theme, camera, image))

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

# Avoid strict evaluation of invisible sprites and completed animation sources.
def piece_at.ready(settled: Bool, +square: U32, code: U32, +action: U32, +progress: U32,
  selected: Bool, hovered: Bool, +camera: Camera.Basis, image: Image) -> Image:
  match settled:
    case True{}:
      piece(True{}, code, Camera.center_x(square, camera), Camera.center_y(square, camera), selected, hovered, image)
    case False{}:
      piece(True{}, code, moving_x(square, action, progress, camera), moving_y(square, action, progress, camera), selected, hovered, image)

def piece_at(show: Bool, square: U32, code: U32, action: U32, +progress: U32,
  selected: Bool, hovered: Bool, camera: Camera.Basis, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: piece_at.ready(U32.is_eq(progress, 16), square, code, action, progress, selected, hovered, camera, image)

def dying_at(show: Bool, +square: U32, code: U32, progress: U32, +camera: Camera.Basis, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: Sprites.dying(True{}, code, Camera.center_x(square, camera), Camera.center_y(square, camera), progress, image)

def pieces(order: List<&2, U32>, +board: List<&2, U32>, +action: U32, +progress: U32,
  +selected: U32, +hovered: U32, +victim: U32, +victim_code: U32, +camera: Camera.Basis, image: Image) -> Image:
  match order:
    case Nil{}: image
    case +square <> rest:
      +code = Model.board_get(board, square)
      +a = dying_at(Bool.and(U32.is_eq(victim, square), U32.is_lt(progress, 16)), square, victim_code, progress, camera, image)
      +b = piece_at(Model.occupied(code), square, code, action, progress,
        U32.is_eq(selected, square), U32.is_eq(hovered, square), camera, a)
      pieces(rest, board, action, progress, selected, hovered, victim, victim_code, camera, b)

def impact.show(show: Bool, +square: U32, +progress: U32, +camera: Camera.Basis, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}:
      +x = Camera.center_x(square, camera)
      +y = U32.sub(Camera.center_y(square, camera), 10)
      +spread = U32.add(6, progress)
      +a = rect(U32.sub(x, spread), U32.sub(y, progress), 3, 3, 16768672, image)
      +b = rect(U32.add(x, spread), U32.sub(y, progress), 3, 3, 11069183, a)
      +c = rect(U32.sub(x, U32.div(spread, 2)), U32.sub(y, spread), 2, 4, 16768672, b)
      rect(U32.add(x, U32.div(spread, 2)), U32.add(y, 3), 3, 2, 11069183, c)

def impact(decoded: Maybe<Model.Action>, previous: Model.Position, +progress: U32, camera: Camera.Basis, image: Image) -> Image:
  +victim = capture_square(decoded, previous)
  impact.show(Bool.and(U32.is_lt(victim, 64), U32.is_lt(progress, 16)), victim, progress, camera, image)

def background() -> Image:
  # The stars behind absent platforms remain visible through the board.
  backdrop()

# Floor-plane overlays. All of them are outlines or small insets inside a
# present square, so highlighting a hole never fills it back in.
def floor_patch(+camera: Camera.Basis, +file: F32, +row: F32, +half_file: F32, +half_row: F32) -> Patch:
  Patch{projected(camera, F32.sub(file, half_file), F32.sub(row, half_row), 0.0),
    projected(camera, F32.add(file, half_file), F32.sub(row, half_row), 0.0),
    projected(camera, F32.add(file, half_file), F32.add(row, half_row), 0.0),
    projected(camera, F32.sub(file, half_file), F32.add(row, half_row), 0.0)}

def square_file(+square: U32) -> F32:
  U32.to_f32(Model.file_of(square))

def square_row(+square: U32) -> F32:
  U32.to_f32(U32.sub(7, Model.rank_of(square)))

def platform_file(+macro: U32) -> F32:
  F32.add(U32.to_f32(U32.mul(U32.mod(macro, 4), 2)), 0.5)

def platform_row(+macro: U32) -> F32:
  F32.sub(6.5, U32.to_f32(U32.mul(U32.div(macro, 4), 2)))

def square_ring(+square: U32, +half: F32, color: U32, +camera: Camera.Basis, image: Image) -> Image:
  patch.draw(floor_patch(camera, square_file(square), square_row(square), half, half), False{}, color, 0, image)

def platform_ring(+macro: U32, +half: F32, color: U32, +camera: Camera.Basis, image: Image) -> Image:
  patch.draw(floor_patch(camera, platform_file(macro), platform_row(macro), half, half), False{}, color, 0, image)

def rim(show: Bool, +square: U32, color: U32, +camera: Camera.Basis, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: square_ring(square, 0.485, color, camera, image)

def double_rim(show: Bool, +square: U32, +color: U32, +camera: Camera.Basis, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: square_ring(square, 0.43, color, camera, square_ring(square, 0.485, color, camera, image))

def tile_rim(show: Bool, +macro: U32, +color: U32, +camera: Camera.Basis, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: platform_ring(macro, 0.93, color, camera, platform_ring(macro, 0.97, color, camera, image))

def hole_rims(holes: List<&2, U32>, +camera: Camera.Basis, image: Image) -> Image:
  match holes:
    case Nil{}: image
    case +macro <> rest: hole_rims(rest, camera, tile_rim(True{}, macro, 16034408, camera, image))

# Destination markers: a centred floor inset on an empty square, a double rim
# around an occupied one so the capture victim stays visible.
def target_mark(capture: Bool, +square: U32, +camera: Camera.Basis, image: Image) -> Image:
  match capture:
    case True{}: double_rim(True{}, square, 16739179, camera, image)
    case False{}: patch.draw(floor_patch(camera, square_file(square), square_row(square), 0.13, 0.13), True{}, 1320228, 8512460, image)

def target_marks(targets: List<&2, U32>, +board: List<&2, U32>, +camera: Camera.Basis, image: Image) -> Image:
  match targets:
    case Nil{}: image
    case +square <> rest:
      target_marks(rest, board, camera, target_mark(Model.occupied(Model.board_get(board, square)), square, camera, image))

# Legal Shift indicator for a from*16+to platform pair: a bar along the edge
# that faces the destination hole and an arrowhead pointing into it.
def shift_mark(+pair: U32, +strong: Bool, +camera: Camera.Basis, image: Image) -> Image:
  +from = U32.div(pair, 16)
  +to = U32.mod(pair, 16)
  +cf = platform_file(from)
  +cr = platform_row(from)
  +df = F32.sub(U32.to_f32(U32.mod(to, 4)), U32.to_f32(U32.mod(from, 4)))
  +dr = F32.sub(U32.to_f32(U32.div(from, 4)), U32.to_f32(U32.div(to, 4)))
  +bar = floor_patch(camera, F32.add(cf, F32.mul(df, 0.86)), F32.add(cr, F32.mul(dr, 0.86)),
    F32.sub(0.9, F32.mul(0.82, F32.abs(df))), F32.sub(0.9, F32.mul(0.82, F32.abs(dr))))
  +ink = Bool.pick(U32, strong, 16766606, 10485730)
  +fill = Bool.pick(U32, strong, 16766606, 8053195)
  +marked = patch.draw(bar, True{}, ink, ink, image)
  +tip = projected(camera, F32.add(cf, F32.mul(df, 0.74)), F32.add(cr, F32.mul(dr, 0.74)), 0.0)
  +bf = F32.add(cf, F32.mul(df, 0.4))
  +br = F32.add(cr, F32.mul(dr, 0.4))
  +left = projected(camera, F32.sub(bf, F32.mul(dr, 0.22)), F32.add(br, F32.mul(df, 0.22)), 0.0)
  +right = projected(camera, F32.add(bf, F32.mul(dr, 0.22)), F32.sub(br, F32.mul(df, 0.22)), 0.0)
  Quad.draw(Quad.make(tip, left, right, right), True{}, 998198, fill, marked)

def shift_marks(pairs: List<&2, U32>, +camera: Camera.Basis, image: Image) -> Image:
  match pairs:
    case Nil{}: image
    case +pair <> rest: shift_marks(rest, camera, shift_mark(pair, False{}, camera, image))

def strong_mark(show: Bool, +pair: U32, +camera: Camera.Basis, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: shift_mark(pair, True{}, camera, image)

def strong_marks(pairs: List<&2, U32>, +tile: U32, +camera: Camera.Basis, image: Image) -> Image:
  match pairs:
    case Nil{}: image
    case +pair <> rest: strong_marks(rest, tile, camera, strong_mark(U32.is_eq(U32.div(pair, 16), tile), pair, camera, image))

def recent.action(action: Model.Action, +camera: Camera.Basis, image: Image) -> Image:
  match action:
    case Model.MoveAction{+from, +to, promotion}: rim(True{}, to, 7112872, camera, rim(True{}, from, 7112872, camera, image))
    case Model.ShiftAction{from, +to, promotion}: platform_ring(to, 0.97, 7112872, camera, image)

def recent(settled: Bool, decoded: Maybe<Model.Action>, +camera: Camera.Basis, image: Image) -> Image:
  match settled decoded:
    case True{} Some{action}: recent.action(action, camera, image)
    case _ _: image

def ground_base(background: Image, position: Model.Position, theme: U32, view: Camera.View) -> Image:
  +camera = Camera.basis(view)
  tiles(Camera.depth_order(camera), Model.pos_holes(position), 21760, 16, theme, camera, background)

# The settled ground, cached by Application, carries the Shift indicators.
def ground_marked(background: Image, position: Model.Position, theme: U32, +view: Camera.View, shifts: List<&2, U32>) -> Image:
  shift_marks(shifts, Camera.basis(view), ground_base(background, position, theme, view))

# Per-frame overlays, drawn under the pieces: last move, check, hover, the
# selected tile and its holes, the selected piece, then destination markers.
def feedback_on(base: Image, frame: Frame) -> Image:
  match frame:
    case Frame{position, previous, +selected, +hovered, targets, +tile, tileTargets, +lastAction, +progress, theme, view, shifts, +check}:
      +camera = Camera.basis(view)
      +a = recent(U32.is_eq(progress, 16), Model.decode(lastAction), camera, base)
      +b = double_rim(U32.is_lt(check, 64), check, 16731983, camera, a)
      +c = rim(Bool.and(U32.is_lt(hovered, 64), U32.is_ne(hovered, selected)), hovered, 11073279, camera, b)
      +d = hole_rims(tileTargets, camera, c)
      +e = strong_marks(shifts, tile, camera, tile_rim(U32.is_lt(tile, 16), tile, 16767113, camera, d))
      +f = double_rim(U32.is_lt(selected, 64), selected, 16767113, camera, e)
      target_marks(targets, Model.pos_board(position), camera, f)

def ground_on(background: Image, frame: Frame) -> Image:
  match frame:
    case Frame{position, previous, selected, hovered, targets, tile, tileTargets, +lastAction, progress, theme, view, shifts, check}:
      +camera = Camera.basis(view)
      +tile_action = Bool.pick(U32, U32.is_ge(lastAction, 20480), lastAction, 21760)
      tiles(Camera.depth_order(camera), Model.pos_holes(position), tile_action, progress, theme, camera, background)

def pieces_on(ground: Image, frame: Frame) -> Image:
  match frame:
    case Frame{position, +previous, selected, hovered, targets, tile, tileTargets, +lastAction, +progress, theme, view, shifts, check}:
      +camera = Camera.basis(view)
      +victim = capture_square(Model.decode(lastAction), previous)
      +e = pieces(Camera.depth_order(camera), Model.pos_board(position), lastAction, progress, selected, hovered, victim,
        Model.board_get(Model.pos_board(previous), victim), camera, ground)
      impact(Model.decode(lastAction), previous, progress, camera, e)

# Interactive camera frames use a single inverse-projection pass. Settled frames
# retain full-resolution platform walls; sprites and feedback keep their detail.
def motion_ground.ready(settled: Bool, background: Image, +frame: Frame) -> Image:
  match settled:
    case False{}: ground_on(background, frame)
    case True{}:
      match frame:
        case Frame{position, previous, selected, hovered, targets, tile, tileTargets, lastAction, progress, theme, view, shifts, check}:
          FastGround.draw(background, Model.pos_holes(position), theme, Camera.basis(view))

def motion_ground(background: Image, +frame: Frame) -> Image:
  motion_ground.ready(U32.is_ge(frame_progress(frame), 16), background, frame)

def render_on(moving: Bool, background: Image, +frame: Frame) -> Image:
  match moving:
    case False{}: pieces_on(feedback_on(ground_on(background, frame), frame), frame)
    case True{}: pieces_on(feedback_on(motion_ground(background, frame), frame), frame)

