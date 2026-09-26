# Small native Window checkpoint for the real Rift position kernel.
# This is a deliberately reduced playtest entrypoint, not NativeV2 or the full UI.
import Base
import ./core/Model.bend as Model
import ./core/Kernel.bend as Kernel

type State is Data:
  Game{position: Model.Position, legal: List<&2, U32>, selected: U32,
    last_from: U32, last_to: U32, ply: U32, image: Image}

def in_range(+value: U32, low: U32, high: U32) -> Bool:
  Bool.and(U32.is_ge(value, low), U32.is_le(value, high))

def glyph_mask_parts(+kind: U32, +body: Bool, +base: Bool,
  +pawn_head: Bool, +knight_head: Bool, +bishop_head: Bool,
  +rook_head: Bool, +queen_head: Bool, +king_head: Bool) -> Bool:
  match kind:
    case 1: Bool.or(body, Bool.or(base, pawn_head))
    case 2: Bool.or(body, Bool.or(base, knight_head))
    case 3: Bool.or(body, Bool.or(base, bishop_head))
    case 4: Bool.or(body, Bool.or(base, rook_head))
    case 5: Bool.or(body, Bool.or(base, queen_head))
    case 6: Bool.or(body, Bool.or(base, king_head))
    case _: False{}

def glyph_mask(+kind: U32, +x: U32, +y: U32) -> Bool:
  +body = Bool.and(in_range(x, 10, 21), in_range(y, 14, 25))
  +base = Bool.and(in_range(x, 7, 24), in_range(y, 26, 29))
  +pawn_head = Bool.and(in_range(x, 14, 17), in_range(y, 7, 11))
  +knight_head = Bool.or(
    Bool.and(in_range(x, 15, 22), in_range(y, 7, 12)),
    Bool.and(in_range(x, 10, 16), in_range(y, 11, 16)))
  +bishop_head = Bool.or(
    Bool.and(in_range(x, 14, 17), in_range(y, 5, 9)),
    Bool.and(in_range(x, 11, 20), in_range(y, 9, 13)))
  +rook_head = Bool.and(in_range(x, 8, 23), in_range(y, 7, 13))
  +queen_head = Bool.or(
    Bool.or(Bool.and(in_range(x, 8, 11), in_range(y, 7, 10)),
      Bool.and(in_range(x, 14, 17), in_range(y, 5, 9))),
    Bool.and(in_range(x, 20, 23), in_range(y, 7, 10)))
  +king_head = Bool.or(
    Bool.and(in_range(x, 14, 17), in_range(y, 4, 11)),
    Bool.and(in_range(x, 11, 20), in_range(y, 7, 10)))
  glyph_mask_parts(kind, body, base, pawn_head, knight_head,
    bishop_head, rook_head, queen_head, king_head)

def glyph_tree(level: Nat, +background: U32, +ink: U32, +kind: U32,
  +x: U32, +y: U32) -> Image:
  match level:
    case 0n:
      Pix{Bool.pick(U32, glyph_mask(kind, x, y), ink, background)}
    case 1n++p:
      +step = U32.shln(1, p)
      tl tr bl br = glyph_tree(p, background, ink, kind, x, y)
        glyph_tree(p, background, ink, kind, U32.add(x, step), y)
        glyph_tree(p, background, ink, kind, x, U32.add(y, step))
        glyph_tree(p, background, ink, kind,
          U32.add(x, step), U32.add(y, step))
      Qua{tl, tr, bl, br}

def piece_kind(+code: U32) -> U32:
  Bool.pick(U32, Model.is_pawn(code), 1, Model.piece_type(code))

def cell_picture(has_piece: Bool, background: U32, ink: U32,
  kind: U32) -> Image:
  match has_piece:
    case False{}: Pix{background}
    case True{}: glyph_tree(5n, background, ink, kind, 0, 0)

def cell_image(+position: Model.Position, +file: U32, +rank: U32,
  selected: U32, last_from: U32, last_to: U32) -> Image:
  +square = Model.sq(file, rank)
  +present = Model.present(Model.pos_holes(position), square)
  +raw_code = Model.board_get(Model.pos_board(position), square)
  +code = Bool.pick(U32, present, raw_code, 0)
  +light = U32.is_zero(U32.mod(U32.add(file, rank), 2))
  +ordinary = Bool.pick(U32, light, 13161358, 5073237)
  +last = Bool.or(U32.is_eq(square, last_from), U32.is_eq(square, last_to))
  +background = Bool.pick(U32, U32.is_eq(square, selected), 14104391,
    Bool.pick(U32, last, 7252433,
      Bool.pick(U32, present, ordinary, 1514535)))
  +ink = Bool.pick(U32, Model.is_white(code), 16314837, 1185570)
  +kind = piece_kind(code)
  cell_picture(Model.occupied(code), background, ink, kind)

def tile_tree(level: Nat, +position: Model.Position,
  +x: U32, +y: U32, +selected: U32,
  +last_from: U32, +last_to: U32) -> Image:
  match level:
    case 0n:
      cell_image(position, x, U32.sub(7, y), selected, last_from, last_to)
    case 1n++p:
      +step = U32.shln(1, p)
      tl tr bl br = tile_tree(p, position, x, y, selected, last_from, last_to)
        tile_tree(p, position, U32.add(x, step), y,
          selected, last_from, last_to)
        tile_tree(p, position, x, U32.add(y, step),
          selected, last_from, last_to)
        tile_tree(p, position, U32.add(x, step), U32.add(y, step),
          selected, last_from, last_to)
      Qua{tl, tr, bl, br}

def render_board(+position: Model.Position, +selected: U32,
  +last_from: U32, +last_to: U32) -> Image:
  tile_tree(3n, position, 0, 0, selected, last_from, last_to)

def rebuild(+position: Model.Position, legal: List<&2, U32>,
  +selected: U32, +last_from: U32, +last_to: U32, ply: U32) -> State:
  +image = render_board(position, selected, last_from, last_to)
  Game{position, legal, selected, last_from, last_to, ply, image}

def initial_state() -> State:
  +position = Model.start(False{})
  +legal = Kernel.legal_ids(position)
  rebuild(position, legal, 64, 64, 64, 0)

def view(state: State) -> State & Image:
  match state:
    case Game{position, legal, selected, last_from, last_to, ply, +output}:
      (Game{position, legal, selected, last_from, last_to, ply, output}, output)

def candidate_matches(action: Model.Action, selected: U32,
  target: U32) -> Bool:
  match action:
    case Model.MoveAction{from, to, _}:
      Bool.and(U32.is_eq(from, selected), U32.is_eq(to, target))
    case Model.ShiftAction{from, to, _}:
      Bool.and(U32.is_eq(from, Model.macro_of(selected)),
        U32.is_eq(to, Model.macro_of(target)))

def candidate_ids(matches: Bool, id: U32) -> List<&2, U32>:
  match matches:
    case False{}: []
    case True{}: id <> []

def decode_candidate(decoded: Maybe<Model.Action>, id: U32,
  selected: U32, target: U32) -> List<&2, U32>:
  match decoded:
    case None{}: []
    case Some{action}:
      candidate_ids(candidate_matches(action, selected, target), id)

def matching_ids(ids: List<&2, U32>, +selected: U32,
  +target: U32) -> List<&2, U32>:
  match ids:
    case Nil{}: []
    case +id <> rest:
      +here = decode_candidate(Model.decode(id), id, selected, target)
      +later = matching_ids(rest, selected, target)
      List.append(&2, U32, here, later)

def first_id(ids: List<&2, U32>) -> Maybe<U32>:
  match ids:
    case Nil{}: None{}
    case id <> _: Some{id}

def find_action(legal: List<&2, U32>, selected: U32,
  target: U32) -> Maybe<U32>:
  first_id(matching_ids(legal, selected, target))

def choose_selection(present: Bool, position: Model.Position,
  legal: List<&2, U32>, target: U32, last_from: U32,
  last_to: U32, ply: U32) -> State:
  match present:
    case False{}: rebuild(position, legal, 64, last_from, last_to, ply)
    case True{}: rebuild(position, legal, target, last_from, last_to, ply)

def apply_result(result: Kernel.StepResult, legal: List<&2, U32>,
  selected: U32, target: U32, last_from: U32,
  last_to: U32, ply: U32) -> State:
  match result:
    case Kernel.Accepted{_, +next}:
      +next_legal = Kernel.legal_ids(next)
      rebuild(next, next_legal, 64, selected, target, U32.add(ply, 1))
    case Kernel.Rejected{old}:
      rebuild(old, legal, 64, last_from, last_to, ply)

def second_click(found: Maybe<U32>, +position: Model.Position,
  +legal: List<&2, U32>, selected: U32, +target: U32,
  last_from: U32, last_to: U32, ply: U32) -> State:
  match found:
    case None{}:
      choose_selection(Model.present(Model.pos_holes(position), target),
        position, legal, target, last_from, last_to, ply)
    case Some{id}:
      apply_result(Kernel.step(position, id), legal, selected, target,
        last_from, last_to, ply)

def click_choice(has_selection: Bool, +position: Model.Position,
  +legal: List<&2, U32>, +selected: U32, +target: U32,
  last_from: U32, last_to: U32, ply: U32) -> State:
  match has_selection:
    case False{}:
      choose_selection(Model.present(Model.pos_holes(position), target),
        position, legal, target, last_from, last_to, ply)
    case True{}:
      second_click(find_action(legal, selected, target), position, legal,
        selected, target, last_from, last_to, ply)

def click(state: State, x: U32, y: U32) -> State:
  match state:
    case Game{+position, +legal, +selected, last_from, last_to, ply, _}:
      +file = U32.div(x, 32)
      +rank = U32.sub(7, U32.div(y, 32))
      +target = Model.sq(file, rank)
      click_choice(U32.is_ne(selected, 64), position, legal,
        selected, target, last_from, last_to, ply)

def events(native_events: List<Event>, state: State) -> Maybe<State>:
  match native_events:
    case Nil{}: Some{state}
    case Close{} <> _: None{}
    case Key{27, True{}} <> _: None{}
    case Mouse{x, y, 0, True{}} <> rest:
      events(rest, click(state, x, y))
    case _ <> rest: events(rest, state)

def tick(native_events: List<Event>, state: State) -> IO(Maybe<State>):
  IO.pure(Maybe<State>, events(native_events, state))

def main() -> IO(Unit):
  App.run(~State, ~App{view, tick}, "Rift Chess Experimental Native Mini", 256, 256,
    initial_state())
