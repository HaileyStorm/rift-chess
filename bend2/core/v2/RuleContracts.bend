# Proposed v2. Independent relational specification: no Transitions import,
# no Spec.authorized, no candidate, and no eligible calls. Geometry's attack
# relation and admissibility remain explicitly shared normative dependencies.
import Base
import ../Model.bend as M
import ../Geometry.bend as G

def implies(a: Bool, b: Bool) -> Bool:
  Bool.or(Bool.not(a), b)

def at(p: M.Position, s: U32) -> U32:
  M.board_get(M.pos_board(p), s)

def empty(+p: M.Position, +s: U32) -> Bool:
  Bool.and(M.present(M.pos_holes(p), s), U32.is_zero(at(p, s)))

def last(+p: M.Position, s: U32) -> Bool:
  U32.is_eq(M.rank_of(s), Bool.pick(U32, M.pos_side(p), 7, 0))

def forward(+p: M.Position, +a: U32, +b: U32, +n: U32) -> Bool:
  Bool.pick(Bool, M.pos_side(p), U32.is_eq(M.rank_of(b), U32.add(M.rank_of(a), n)),
    U32.is_eq(M.rank_of(a), U32.add(M.rank_of(b), n)))

def between(+a: U32, +b: U32, +x: U32) -> Bool:
  Bool.or(Bool.and(U32.is_lt(a, x), U32.is_lt(x, b)),
    Bool.and(U32.is_lt(b, x), U32.is_lt(x, a)))

def aligned(+a: U32, +b: U32) -> Bool:
  Bool.or(U32.is_eq(M.file_of(a), M.file_of(b)),
    Bool.or(U32.is_eq(M.rank_of(a), M.rank_of(b)),
      U32.is_eq(G.abs_diff(M.file_of(a), M.file_of(b)), G.abs_diff(M.rank_of(a), M.rank_of(b)))))

# Geometric segment membership via distances, not the implementation ray walk.
def segment(+a: U32, +b: U32, +s: U32) -> Bool:
  Bool.and(U32.is_ne(a, s), Bool.and(U32.is_ne(b, s),
    Bool.and(U32.is_eq(U32.mul(G.abs_diff(M.file_of(a), M.file_of(s)), G.abs_diff(M.rank_of(a), M.rank_of(b))), U32.mul(G.abs_diff(M.rank_of(a), M.rank_of(s)), G.abs_diff(M.file_of(a), M.file_of(b)))), Bool.and(aligned(s, b),
      Bool.and(U32.is_eq(U32.add(G.abs_diff(M.file_of(a), M.file_of(s)), G.abs_diff(M.file_of(s), M.file_of(b))), G.abs_diff(M.file_of(a), M.file_of(b))),
        U32.is_eq(U32.add(G.abs_diff(M.rank_of(a), M.rank_of(s)), G.abs_diff(M.rank_of(s), M.rank_of(b))), G.abs_diff(M.rank_of(a), M.rank_of(b))))))))

def path_scan(n: Nat, +p: M.Position, +a: U32, +b: U32, +s: U32) -> Bool:
  match n:
    case 0n: True{}
    case 1n+rest:
      Bool.and(implies(segment(a, b, s), empty(p, s)), path_scan(rest, p, a, b, U32.add(s, 1)))

def clear_path(p: M.Position, a: U32, b: U32) -> Bool:
  path_scan(64n, p, a, b, 0)

def ep(+p: M.Position, +a: U32, +b: U32) -> Bool:
  Bool.and(M.is_pawn(at(p, a)), Bool.and(U32.is_eq(b, M.pos_ep(p)),
    Bool.and(U32.is_lt(M.pos_ep_pawn(p), 64), U32.is_ne(M.file_of(a), M.file_of(b)))))

def pawn_one(+p: M.Position, +a: U32, +b: U32) -> Bool:
  Bool.and(U32.is_eq(M.file_of(a), M.file_of(b)), Bool.and(forward(p, a, b, 1), empty(p, b)))

def pawn_two(+p: M.Position, +a: U32, +b: U32) -> Bool:
  Bool.and(U32.is_eq(M.piece_type(at(p, a)), 7),
    Bool.and(U32.is_eq(M.rank_of(a), Bool.pick(U32, M.pos_side(p), 1, 6)),
      Bool.and(U32.is_eq(M.file_of(a), M.file_of(b)), Bool.and(forward(p, a, b, 2),
        Bool.and(empty(p, b), empty(p, M.sq(M.file_of(a), U32.div(U32.add(M.rank_of(a), M.rank_of(b)), 2))))))))

def pawn_capture(+p: M.Position, +a: U32, +b: U32) -> Bool:
  Bool.and(U32.is_eq(G.abs_diff(M.file_of(a), M.file_of(b)), 1),
    Bool.and(forward(p, a, b, 1),
      Bool.or(M.same_side(at(p, b), Bool.not(M.pos_side(p))),
        Bool.and(ep(p, a, b), Bool.and(empty(p, b),
          Bool.and(M.is_pawn(at(p, M.pos_ep_pawn(p))), M.same_side(at(p, M.pos_ep_pawn(p)), Bool.not(M.pos_side(p)))))))))

def castle_shape(+p: M.Position, +a: U32, +b: U32) -> Bool:
  Bool.and(U32.is_eq(M.piece_type(at(p, a)), 6), U32.is_eq(G.abs_diff(M.file_of(a), M.file_of(b)), 2))

def rook_source(+p: M.Position, b: U32) -> U32:
  M.sq(Bool.pick(U32, U32.is_eq(M.file_of(b), 6), 7, 0), Bool.pick(U32, M.pos_side(p), 0, 7))

def rook_destination(+p: M.Position, b: U32) -> U32:
  M.sq(Bool.pick(U32, U32.is_eq(M.file_of(b), 6), 5, 3), Bool.pick(U32, M.pos_side(p), 0, 7))

def castle(+p: M.Position, +a: U32, +b: U32) -> Bool:
  +home = Bool.pick(U32, M.pos_side(p), 0, 7)
  +wing = U32.is_eq(M.file_of(b), 6)
  +bit = Bool.pick(U32, M.pos_side(p), Bool.pick(U32, wing, 1, 2), Bool.pick(U32, wing, 4, 8))
  Bool.and(U32.is_eq(a, M.sq(4, home)), Bool.and(U32.is_eq(M.rank_of(b), home),
    Bool.and(Bool.or(wing, U32.is_eq(M.file_of(b), 2)),
      Bool.and(U32.is_ne(U32.and(M.pos_rights(p), bit), 0),
        Bool.and(M.present(M.pos_holes(p), rook_source(p, b)),
          Bool.and(U32.is_eq(at(p, rook_source(p, b)), M.encode_piece(M.pos_side(p), 4)),
            Bool.and(clear_path(p, a, rook_source(p, b)),
              Bool.and(Bool.not(G.in_check(p, M.pos_side(p))),
                Bool.and(Bool.not(G.attacked(p, rook_destination(p, b), Bool.not(M.pos_side(p)))),
                  Bool.not(G.attacked(p, b, Bool.not(M.pos_side(p)))))))))))))

def slider_path_if(aligned: Bool, p: M.Position, a: U32, b: U32) -> Bool:
  match aligned:
    case False{}: False{}
    case True{}: clear_path(p, a, b)

def piece_geometry(kind: U32, +p: M.Position, +a: U32, +b: U32) -> Bool:
  match kind:
    case 1: Bool.or(pawn_one(p, a, b), Bool.or(pawn_two(p, a, b), pawn_capture(p, a, b)))
    case 7: Bool.or(pawn_one(p, a, b), Bool.or(pawn_two(p, a, b), pawn_capture(p, a, b)))
    case 2:
      +df = G.abs_diff(M.file_of(a), M.file_of(b))
      +dr = G.abs_diff(M.rank_of(a), M.rank_of(b))
      Bool.and(U32.is_eq(U32.add(df, dr), 3), U32.is_eq(U32.mul(df, dr), 2))
    case 3: slider_path_if(U32.is_eq(G.abs_diff(M.file_of(a), M.file_of(b)), G.abs_diff(M.rank_of(a), M.rank_of(b))), p, a, b)
    case 4: slider_path_if(Bool.or(U32.is_eq(M.file_of(a), M.file_of(b)), U32.is_eq(M.rank_of(a), M.rank_of(b))), p, a, b)
    case 5: slider_path_if(aligned(a, b), p, a, b)
    case 6: Bool.or(G.king_geometry(a, b), castle(p, a, b))
    case _: False{}

def promotion(needed: Bool, +tag: U32) -> Bool:
  Bool.pick(Bool, needed, Bool.and(U32.is_ge(tag, 1), U32.is_le(tag, 4)), U32.is_zero(tag))

def transported(+p: M.Position, +code: U32, +to: U32, +tag: U32) -> U32:
  +kind = Bool.pick(U32, U32.is_eq(tag, 1), 5, Bool.pick(U32, U32.is_eq(tag, 2), 4, Bool.pick(U32, U32.is_eq(tag, 3), 3, 2)))
  Bool.pick(U32, M.is_pawn(code), M.encode_piece(M.pos_side(p), Bool.pick(U32, last(p, to), kind, 1)), code)

def ordinary_target_if(promotion_ok: Bool, +p: M.Position, b: U32) -> Bool:
  match promotion_ok:
    case False{}: False{}
    case True{}:
      +target = at(p, b)
      Bool.and(Bool.not(M.same_side(target, M.pos_side(p))), U32.is_ne(M.piece_type(target), 6))
def ordinary_target(+p: M.Position, a: U32, +b: U32, tag: U32, code: U32) -> Bool:
  ordinary_target_if(promotion(Bool.and(M.is_pawn(code), last(p, b)), tag), p, b)

def ordinary_endpoints(ok: Bool, p: M.Position, a: U32, b: U32, tag: U32, code: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}: ordinary_target(p, a, b, tag, code)
def ordinary_owner(ok: Bool, +p: M.Position, +a: U32, +b: U32, tag: U32, code: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}:
      ordinary_endpoints(Bool.and(U32.is_ne(a, b), Bool.and(M.present(M.pos_holes(p), a), M.present(M.pos_holes(p), b))), p, a, b, tag, code)
def ordinary_base(+p: M.Position, +a: U32, b: U32, tag: U32) -> Bool:
  +code = at(p, a)
  ordinary_owner(M.same_side(code, M.pos_side(p)), p, a, b, tag, code)

def shift_topology(+p: M.Position, +a: U32, +b: U32) -> Bool:
  Bool.and(U32.is_lt(a, 16), Bool.and(U32.is_lt(b, 16),
    Bool.and(U32.is_eq(U32.add(G.abs_diff(M.macro_file(a), M.macro_file(b)), G.abs_diff(M.macro_rank(a), M.macro_rank(b))), 1),
      Bool.and(U32.is_zero(U32.and(M.pos_holes(p), M.macro_mask(a))), U32.is_ne(U32.and(M.pos_holes(p), M.macro_mask(b)), 0)))))

def passenger_count(n: Nat, +p: M.Position, +a: U32, +offset: U32) -> U32:
  match n:
    case 0n: 0
    case 1n+rest: U32.add(Bool.to_u32(M.occupied(at(p, M.square_in_macro(a, offset)))), passenger_count(rest, p, a, U32.add(offset, 1)))

def passengers(n: Nat, +p: M.Position, +a: U32, +b: U32, +tag: U32, +offset: U32) -> Bool:
  match n:
    case 0n: True{}
    case 1n+rest:
      +code = at(p, M.square_in_macro(a, offset))
      Bool.and(implies(M.occupied(code), Bool.and(M.same_side(code, M.pos_side(p)), U32.is_ne(M.piece_type(code), 6))),
        passengers(rest, p, a, b, tag, U32.add(offset, 1)))

def shift_promotes(n: Nat, +p: M.Position, +a: U32, +b: U32, +offset: U32) -> Bool:
  match n:
    case 0n: False{}
    case 1n+rest:
      Bool.or(Bool.and(M.is_pawn(at(p, M.square_in_macro(a, offset))), last(p, M.square_in_macro(b, offset))),
        shift_promotes(rest, p, a, b, U32.add(offset, 1)))

def ordinary_intent_if(base: Bool, +p: M.Position, +a: U32, +b: U32) -> Bool:
  match base:
    case False{}: False{}
    case True{}: piece_geometry(M.piece_type(at(p, a)), p, a, b)

def intent(+p: M.Position, action: M.Action) -> Bool:
  match action:
    case M.MoveAction{+a, +b, tag}:
      ordinary_intent_if(ordinary_base(p, a, b, tag), p, a, b)
    case M.ShiftAction{+a, +b, +tag}:
      Bool.and(shift_topology(p, a, b), Bool.and(U32.is_le(passenger_count(4n, p, a, 0), 1),
        Bool.and(passengers(4n, p, a, b, tag, 0), promotion(shift_promotes(4n, p, a, b, 0), tag))))

# A relation over each destination square independently, not an update program.
def cell(+p: M.Position, action: M.Action, +s: U32) -> U32:
  match action:
    case M.MoveAction{+a, +b, +tag}:
      Bool.pick(U32, U32.is_eq(s, b), transported(p, at(p, a), b, tag),
        Bool.pick(U32, Bool.and(castle_shape(p, a, b), U32.is_eq(s, rook_destination(p, b))), at(p, rook_source(p, b)),
          Bool.pick(U32, Bool.or(U32.is_eq(s, a), Bool.or(Bool.and(ep(p, a, b), U32.is_eq(s, M.pos_ep_pawn(p))),
            Bool.and(castle_shape(p, a, b), U32.is_eq(s, rook_source(p, b))))), 0, at(p, s))))
    case M.ShiftAction{+a, +b, +tag}:
      +offset = U32.add(U32.mod(M.file_of(s), 2), U32.mul(2, U32.mod(M.rank_of(s), 2)))
      Bool.pick(U32, U32.is_eq(M.macro_of(s), a), 0,
        Bool.pick(U32, U32.is_eq(M.macro_of(s), b), transported(p, at(p, M.square_in_macro(a, offset)), s, tag), at(p, s)))

def board_relation(n: Nat, +p: M.Position, +action: M.Action, +q: M.Position, +s: U32) -> Bool:
  match n:
    case 0n: True{}
    case 1n+rest:
      Bool.and(U32.is_eq(at(q, s), cell(p, action, s)), board_relation(rest, p, action, q, U32.add(s, 1)))

def holes(+p: M.Position, action: M.Action) -> U32:
  match action:
    case M.MoveAction{a, b, tag}: M.pos_holes(p)
    case M.ShiftAction{a, b, tag}: U32.xor(M.pos_holes(p), U32.or(M.macro_mask(a), M.macro_mask(b)))

# Evaluate each original castling entitlement independently. Never restore it.
def right_survives(+p: M.Position, action: M.Action, +home: U32, +side: Bool) -> Bool:
  match action:
    case M.MoveAction{+a, +b, tag}:
      Bool.not(Bool.or(Bool.and(Bool.not(Bool.xor(M.pos_side(p), side)), U32.is_eq(M.piece_type(at(p, a)), 6)),
        Bool.or(Bool.and(U32.is_eq(a, home), U32.is_eq(M.piece_type(at(p, a)), 4)), Bool.and(U32.is_eq(b, home), U32.is_eq(M.piece_type(at(p, b)), 4)))))
    case M.ShiftAction{a, b, tag}: Bool.not(Bool.and(U32.is_eq(a, M.macro_of(home)), U32.is_eq(M.piece_type(at(p, home)), 4)))

def rights(+p: M.Position, +action: M.Action) -> U32:
  U32.and(M.pos_rights(p), U32.add(Bool.to_u32(right_survives(p, action, 7, True{})),
    U32.add(U32.mul(2, Bool.to_u32(right_survives(p, action, 0, True{}))),
      U32.add(U32.mul(4, Bool.to_u32(right_survives(p, action, 63, False{}))), U32.mul(8, Bool.to_u32(right_survives(p, action, 56, False{})))))))

def ep_target(+p: M.Position, action: M.Action) -> U32:
  match action:
    case M.MoveAction{+a, +b, tag}: Bool.pick(U32, Bool.and(M.is_pawn(at(p, a)), U32.is_eq(G.abs_diff(M.rank_of(a), M.rank_of(b)), 2)), M.sq(M.file_of(a), U32.div(U32.add(M.rank_of(a), M.rank_of(b)), 2)), 64)
    case M.ShiftAction{a, b, tag}: 64

def ep_victim(+p: M.Position, action: M.Action) -> U32:
  match action:
    case M.MoveAction{+a, +b, tag}: Bool.pick(U32, Bool.and(M.is_pawn(at(p, a)), U32.is_eq(G.abs_diff(M.rank_of(a), M.rank_of(b)), 2)), b, 64)
    case M.ShiftAction{a, b, tag}: 64

def quiet(+p: M.Position, action: M.Action) -> Nat:
  match action:
    case M.MoveAction{+a, +b, tag}: Bool.pick(Nat, Bool.or(M.is_pawn(at(p, a)), Bool.or(M.occupied(at(p, b)), ep(p, a, b))), 0n, Nat.add(M.pos_quiet(p), 1n))
    case M.ShiftAction{a, b, tag}: Bool.pick(Nat, U32.is_zero(tag), Nat.add(M.pos_quiet(p), 1n), 0n)

def full(+p: M.Position) -> Nat:
  Nat.add(M.pos_full(p), Bool.pick(Nat, M.pos_side(p), 0n, 1n))

def admissible_old(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  G.valid(p)
def admissible_new(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  G.valid(q)
def legal_intent(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  intent(p, action)
def exact_cells(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  board_relation(64n, p, action, q, 0)
def exact_topology(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  U32.is_eq(M.pos_holes(q), holes(p, action))
def exact_rights(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  U32.is_eq(M.pos_rights(q), rights(p, action))
def ep_creation_expiry_victim(+p: M.Position, +action: M.Action, +q: M.Position) -> Bool:
  Bool.and(U32.is_eq(M.pos_ep(q), ep_target(p, action)), U32.is_eq(M.pos_ep_pawn(q), ep_victim(p, action)))
def progress_counter(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  Nat.is_eq(M.pos_quiet(q), quiet(p, action))
def turn_fullmove(+p: M.Position, action: M.Action, +q: M.Position) -> Bool:
  Bool.and(Bool.xor(M.pos_side(p), M.pos_side(q)), Nat.is_eq(M.pos_full(q), full(p)))
def king_survival(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  Bool.not(G.in_check(q, M.pos_side(p)))




# Explicit rule-family consequences. Each is a distinct part of the acceptance
# contract, and each receives an actual-accepted-result law.
def pawn_single_step(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{+a, +b, tag}: implies(Bool.and(M.is_pawn(at(p, a)), Bool.and(U32.is_eq(M.file_of(a), M.file_of(b)), forward(p, a, b, 1))), empty(p, b))
    case M.ShiftAction{a, b, tag}: True{}
def pawn_double_step_freshness(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{+a, +b, tag}: implies(Bool.and(M.is_pawn(at(p, a)), U32.is_eq(G.abs_diff(M.rank_of(a), M.rank_of(b)), 2)), pawn_two(p, a, b))
    case M.ShiftAction{a, b, tag}: True{}
def pawn_diagonal_capture(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{+a, +b, tag}: implies(Bool.and(M.is_pawn(at(p, a)), U32.is_ne(M.file_of(a), M.file_of(b))), pawn_capture(p, a, b))
    case M.ShiftAction{a, b, tag}: True{}
def piece_law(+kind: U32, +p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{+a, +b, tag}: implies(U32.is_eq(M.piece_type(at(p, a)), kind), piece_geometry(kind, p, a, b))
    case M.ShiftAction{a, b, tag}: True{}
def knight_geometry(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  piece_law(2, p, action, q)
def bishop_geometry_path(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  piece_law(3, p, action, q)
def rook_geometry_path(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  piece_law(4, p, action, q)
def queen_geometry_path(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  piece_law(5, p, action, q)
def king_geometry_castle(p: M.Position, action: M.Action, q: M.Position) -> Bool:
  piece_law(6, p, action, q)
def ownership_presence_no_king_capture(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{a, b, tag}: ordinary_base(p, a, b, tag)
    case M.ShiftAction{a, b, tag}: True{}
def castle_wing(+king_side: Bool, +p: M.Position, action: M.Action, +q: M.Position) -> Bool:
  match action:
    case M.MoveAction{+a, +b, tag}:
      implies(Bool.and(castle_shape(p, a, b), Bool.not(Bool.xor(U32.is_eq(M.file_of(b), 6), king_side))),
        Bool.and(castle(p, a, b), Bool.and(U32.is_zero(at(q, a)),
          Bool.and(U32.is_zero(at(q, rook_source(p, b))), Bool.and(U32.is_eq(at(q, b), M.encode_piece(M.pos_side(p), 6)),
            U32.is_eq(at(q, rook_destination(p, b)), M.encode_piece(M.pos_side(p), 4)))))))
    case M.ShiftAction{a, b, tag}: True{}
def castling_kingside(p: M.Position, a: M.Action, q: M.Position) -> Bool:
  castle_wing(True{}, p, a, q)
def castling_queenside(p: M.Position, a: M.Action, q: M.Position) -> Bool:
  castle_wing(False{}, p, a, q)
def en_passant_capture(+p: M.Position, action: M.Action, +q: M.Position) -> Bool:
  match action:
    case M.MoveAction{+a, +b, tag}: implies(ep(p, a, b), Bool.and(pawn_capture(p, a, b), Bool.and(U32.is_zero(at(q, M.pos_ep_pawn(p))), Bool.not(G.in_check(q, M.pos_side(p))))))
    case M.ShiftAction{a, b, tag}: True{}
def ordinary_promotion_freshness(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{+a, +b, +tag}: implies(M.is_pawn(at(p, a)), Bool.and(promotion(last(p, b), tag), U32.is_eq(at(q, b), transported(p, at(p, a), b, tag))))
    case M.ShiftAction{a, b, tag}: True{}
def shift_adjacent_hole(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{a, b, tag}: True{}
    case M.ShiftAction{a, b, tag}: shift_topology(p, a, b)
def shift_zero_or_one_friendly_nonking(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{a, b, tag}: True{}
    case M.ShiftAction{+a, b, tag}: Bool.and(U32.is_le(passenger_count(4n, p, a, 0), 1), passengers(4n, p, a, b, tag, 0))
def shift_cells(n: Nat, +p: M.Position, +q: M.Position, +a: U32, +b: U32, +tag: U32, +offset: U32) -> Bool:
  match n:
    case 0n: True{}
    case 1n+rest:
      +src = M.square_in_macro(a, offset)
      +dst = M.square_in_macro(b, offset)
      Bool.and(U32.is_zero(at(p, dst)), Bool.and(U32.is_zero(at(q, src)),
        Bool.and(U32.is_eq(at(q, dst), transported(p, at(p, src), dst, tag)),
          shift_cells(rest, p, q, a, b, tag, U32.add(offset, 1)))))
def shift_offset_no_capture_pawn_freshness(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{a, b, tag}: True{}
    case M.ShiftAction{a, b, tag}: shift_cells(4n, p, q, a, b, tag, 0)
def shift_promotion_all_four(+p: M.Position, action: M.Action, q: M.Position) -> Bool:
  match action:
    case M.MoveAction{a, b, tag}: True{}
    case M.ShiftAction{+a, +b, +tag}: Bool.and(promotion(shift_promotes(4n, p, a, b, 0), tag), shift_cells(4n, p, q, a, b, tag, 0))

def clause_26(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(shift_promotion_all_four(p, a, q), True{})

def clause_25(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(shift_offset_no_capture_pawn_freshness(p, a, q), clause_26(p, a, q))

def clause_24(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(shift_zero_or_one_friendly_nonking(p, a, q), clause_25(p, a, q))

def clause_23(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(shift_adjacent_hole(p, a, q), clause_24(p, a, q))

def clause_22(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(ordinary_promotion_freshness(p, a, q), clause_23(p, a, q))

def clause_21(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(en_passant_capture(p, a, q), clause_22(p, a, q))

def clause_20(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(castling_queenside(p, a, q), clause_21(p, a, q))

def clause_19(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(castling_kingside(p, a, q), clause_20(p, a, q))

def clause_18(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(ownership_presence_no_king_capture(p, a, q), clause_19(p, a, q))

def clause_17(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(king_geometry_castle(p, a, q), clause_18(p, a, q))

def clause_16(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(queen_geometry_path(p, a, q), clause_17(p, a, q))

def clause_15(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(rook_geometry_path(p, a, q), clause_16(p, a, q))

def clause_14(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(bishop_geometry_path(p, a, q), clause_15(p, a, q))

def clause_13(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(knight_geometry(p, a, q), clause_14(p, a, q))

def clause_12(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(pawn_diagonal_capture(p, a, q), clause_13(p, a, q))

def clause_11(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(pawn_double_step_freshness(p, a, q), clause_12(p, a, q))

def clause_10(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(pawn_single_step(p, a, q), clause_11(p, a, q))

def clause_9(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(king_survival(p, a, q), clause_10(p, a, q))

def clause_8(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(turn_fullmove(p, a, q), clause_9(p, a, q))

def clause_7(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(progress_counter(p, a, q), clause_8(p, a, q))

def clause_6(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(ep_creation_expiry_victim(p, a, q), clause_7(p, a, q))

def clause_5(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(exact_rights(p, a, q), clause_6(p, a, q))

def clause_4(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(exact_topology(p, a, q), clause_5(p, a, q))

def clause_3(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(exact_cells(p, a, q), clause_4(p, a, q))

def clause_2(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(legal_intent(p, a, q), clause_3(p, a, q))

def clause_1(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(admissible_new(p, a, q), clause_2(p, a, q))

def clause_0(+p: M.Position, +a: M.Action, +q: M.Position) -> Bool:
  Bool.and(admissible_old(p, a, q), clause_1(p, a, q))

def contract_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: clause_0(p, a, q)
def contract(+p: M.Position, id: U32, q: M.Position) -> Bool:
  contract_decoded(p, q, M.decode(id))

def admissible_old_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: admissible_old(p, a, q)
def admissible_old_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  admissible_old_decoded(p, q, M.decode(id))

def admissible_new_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: admissible_new(p, a, q)
def admissible_new_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  admissible_new_decoded(p, q, M.decode(id))

def legal_intent_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: legal_intent(p, a, q)
def legal_intent_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  legal_intent_decoded(p, q, M.decode(id))

def exact_cells_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: exact_cells(p, a, q)
def exact_cells_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  exact_cells_decoded(p, q, M.decode(id))

def exact_topology_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: exact_topology(p, a, q)
def exact_topology_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  exact_topology_decoded(p, q, M.decode(id))

def exact_rights_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: exact_rights(p, a, q)
def exact_rights_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  exact_rights_decoded(p, q, M.decode(id))

def ep_creation_expiry_victim_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: ep_creation_expiry_victim(p, a, q)
def ep_creation_expiry_victim_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  ep_creation_expiry_victim_decoded(p, q, M.decode(id))

def progress_counter_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: progress_counter(p, a, q)
def progress_counter_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  progress_counter_decoded(p, q, M.decode(id))

def turn_fullmove_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: turn_fullmove(p, a, q)
def turn_fullmove_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  turn_fullmove_decoded(p, q, M.decode(id))

def king_survival_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: king_survival(p, a, q)
def king_survival_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  king_survival_decoded(p, q, M.decode(id))

def pawn_single_step_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: pawn_single_step(p, a, q)
def pawn_single_step_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  pawn_single_step_decoded(p, q, M.decode(id))

def pawn_double_step_freshness_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: pawn_double_step_freshness(p, a, q)
def pawn_double_step_freshness_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  pawn_double_step_freshness_decoded(p, q, M.decode(id))

def pawn_diagonal_capture_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: pawn_diagonal_capture(p, a, q)
def pawn_diagonal_capture_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  pawn_diagonal_capture_decoded(p, q, M.decode(id))

def knight_geometry_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: knight_geometry(p, a, q)
def knight_geometry_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  knight_geometry_decoded(p, q, M.decode(id))

def bishop_geometry_path_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: bishop_geometry_path(p, a, q)
def bishop_geometry_path_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  bishop_geometry_path_decoded(p, q, M.decode(id))

def rook_geometry_path_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: rook_geometry_path(p, a, q)
def rook_geometry_path_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  rook_geometry_path_decoded(p, q, M.decode(id))

def queen_geometry_path_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: queen_geometry_path(p, a, q)
def queen_geometry_path_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  queen_geometry_path_decoded(p, q, M.decode(id))

def king_geometry_castle_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: king_geometry_castle(p, a, q)
def king_geometry_castle_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  king_geometry_castle_decoded(p, q, M.decode(id))

def ownership_presence_no_king_capture_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: ownership_presence_no_king_capture(p, a, q)
def ownership_presence_no_king_capture_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  ownership_presence_no_king_capture_decoded(p, q, M.decode(id))

def castling_kingside_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: castling_kingside(p, a, q)
def castling_kingside_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  castling_kingside_decoded(p, q, M.decode(id))

def castling_queenside_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: castling_queenside(p, a, q)
def castling_queenside_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  castling_queenside_decoded(p, q, M.decode(id))

def en_passant_capture_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: en_passant_capture(p, a, q)
def en_passant_capture_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  en_passant_capture_decoded(p, q, M.decode(id))

def ordinary_promotion_freshness_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: ordinary_promotion_freshness(p, a, q)
def ordinary_promotion_freshness_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  ordinary_promotion_freshness_decoded(p, q, M.decode(id))

def shift_adjacent_hole_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: shift_adjacent_hole(p, a, q)
def shift_adjacent_hole_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  shift_adjacent_hole_decoded(p, q, M.decode(id))

def shift_zero_or_one_friendly_nonking_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: shift_zero_or_one_friendly_nonking(p, a, q)
def shift_zero_or_one_friendly_nonking_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  shift_zero_or_one_friendly_nonking_decoded(p, q, M.decode(id))

def shift_offset_no_capture_pawn_freshness_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: shift_offset_no_capture_pawn_freshness(p, a, q)
def shift_offset_no_capture_pawn_freshness_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  shift_offset_no_capture_pawn_freshness_decoded(p, q, M.decode(id))

def shift_promotion_all_four_decoded(p: M.Position, q: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{a}: shift_promotion_all_four(p, a, q)
def shift_promotion_all_four_id(p: M.Position, id: U32, q: M.Position) -> Bool:
  shift_promotion_all_four_decoded(p, q, M.decode(id))

# Normative constructive successor. This belongs to the independently frozen
# relation, not to the implementation-owned kernel or its acceptance premise.
def expected_board(n: Nat, +p: M.Position, +a: M.Action, +s: U32) -> List<&2, U32>:
  match n:
    case 0n: []
    case 1n+rest: cell(p, a, s) <> expected_board(rest, p, a, U32.add(s, 1))
def expected_action(+p: M.Position, +a: M.Action) -> M.Position:
  M.Pos{expected_board(64n, p, a, 0), holes(p, a), Bool.not(M.pos_side(p)),
    rights(p, a), ep_target(p, a), ep_victim(p, a), quiet(p, a), full(p)}
def expected_decoded(p: M.Position, decoded: Maybe<M.Action>) -> M.Position:
  match decoded:
    case None{}: p
    case Some{a}: expected_action(p, a)
def expected(+p: M.Position, id: U32) -> M.Position:
  expected_decoded(p, M.decode(id))
def legal(+p: M.Position, +id: U32) -> Bool:
  contract(p, id, expected(p, id))
