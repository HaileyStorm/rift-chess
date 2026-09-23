import Base
import ../Model.bend as M
import ../ProofKit.bend as L
import ./RuleContracts.bend as R
import ./RuleKernel.bend as K
import ./LAWS.bend as Laws

def accepted_property(-P: M.Position -> Data, b: Bool, +p: M.Position, +id: U32,
  w: L.Truth(K.accepted(K.decide(b, p, id))),
  next: L.Truth(b) -> P(K.proposed(p, id))) -> P(K.position(K.decide(b, p, id))):
  match b:
    case True{}: next(Unit{})
    case False{}: Empty.absurd(P(p), w)

def tail_0(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_0(p, a, q)):
  w

def tail_1(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_1(p, a, q)):
  L.and_right(R.admissible_old(p, a, q), R.clause_1(p, a, q), tail_0(p, a, q, w))

def extract_admissible_old(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.admissible_old_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.admissible_old(p, a, q), R.clause_1(p, a, q), tail_0(p, a, q, w))

def Laws.admissible_old(p, id, w):
  accepted_property(q => L.Truth(R.admissible_old_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_admissible_old(p, K.proposed(p, id), M.decode(id), yes))

def tail_2(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_2(p, a, q)):
  L.and_right(R.admissible_new(p, a, q), R.clause_2(p, a, q), tail_1(p, a, q, w))

def extract_admissible_new(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.admissible_new_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.admissible_new(p, a, q), R.clause_2(p, a, q), tail_1(p, a, q, w))

def Laws.admissible_new(p, id, w):
  accepted_property(q => L.Truth(R.admissible_new_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_admissible_new(p, K.proposed(p, id), M.decode(id), yes))

def tail_3(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_3(p, a, q)):
  L.and_right(R.legal_intent(p, a, q), R.clause_3(p, a, q), tail_2(p, a, q, w))

def extract_legal_intent(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.legal_intent_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.legal_intent(p, a, q), R.clause_3(p, a, q), tail_2(p, a, q, w))

def Laws.legal_intent(p, id, w):
  accepted_property(q => L.Truth(R.legal_intent_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_legal_intent(p, K.proposed(p, id), M.decode(id), yes))

def tail_4(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_4(p, a, q)):
  L.and_right(R.exact_cells(p, a, q), R.clause_4(p, a, q), tail_3(p, a, q, w))

def extract_exact_cells(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.exact_cells_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.exact_cells(p, a, q), R.clause_4(p, a, q), tail_3(p, a, q, w))

def Laws.exact_cells(p, id, w):
  accepted_property(q => L.Truth(R.exact_cells_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_exact_cells(p, K.proposed(p, id), M.decode(id), yes))

def tail_5(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_5(p, a, q)):
  L.and_right(R.exact_topology(p, a, q), R.clause_5(p, a, q), tail_4(p, a, q, w))

def extract_exact_topology(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.exact_topology_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.exact_topology(p, a, q), R.clause_5(p, a, q), tail_4(p, a, q, w))

def Laws.exact_topology(p, id, w):
  accepted_property(q => L.Truth(R.exact_topology_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_exact_topology(p, K.proposed(p, id), M.decode(id), yes))

def tail_6(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_6(p, a, q)):
  L.and_right(R.exact_rights(p, a, q), R.clause_6(p, a, q), tail_5(p, a, q, w))

def extract_exact_rights(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.exact_rights_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.exact_rights(p, a, q), R.clause_6(p, a, q), tail_5(p, a, q, w))

def Laws.exact_rights(p, id, w):
  accepted_property(q => L.Truth(R.exact_rights_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_exact_rights(p, K.proposed(p, id), M.decode(id), yes))

def tail_7(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_7(p, a, q)):
  L.and_right(R.ep_creation_expiry_victim(p, a, q), R.clause_7(p, a, q), tail_6(p, a, q, w))

def extract_ep_creation_expiry_victim(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.ep_creation_expiry_victim_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.ep_creation_expiry_victim(p, a, q), R.clause_7(p, a, q), tail_6(p, a, q, w))

def Laws.ep_creation_expiry_victim(p, id, w):
  accepted_property(q => L.Truth(R.ep_creation_expiry_victim_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_ep_creation_expiry_victim(p, K.proposed(p, id), M.decode(id), yes))

def tail_8(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_8(p, a, q)):
  L.and_right(R.progress_counter(p, a, q), R.clause_8(p, a, q), tail_7(p, a, q, w))

def extract_progress_counter(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.progress_counter_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.progress_counter(p, a, q), R.clause_8(p, a, q), tail_7(p, a, q, w))

def Laws.progress_counter(p, id, w):
  accepted_property(q => L.Truth(R.progress_counter_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_progress_counter(p, K.proposed(p, id), M.decode(id), yes))

def tail_9(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_9(p, a, q)):
  L.and_right(R.turn_fullmove(p, a, q), R.clause_9(p, a, q), tail_8(p, a, q, w))

def extract_turn_fullmove(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.turn_fullmove_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.turn_fullmove(p, a, q), R.clause_9(p, a, q), tail_8(p, a, q, w))

def Laws.turn_fullmove(p, id, w):
  accepted_property(q => L.Truth(R.turn_fullmove_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_turn_fullmove(p, K.proposed(p, id), M.decode(id), yes))

def tail_10(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_10(p, a, q)):
  L.and_right(R.king_survival(p, a, q), R.clause_10(p, a, q), tail_9(p, a, q, w))

def extract_king_survival(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.king_survival_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.king_survival(p, a, q), R.clause_10(p, a, q), tail_9(p, a, q, w))

def Laws.king_survival(p, id, w):
  accepted_property(q => L.Truth(R.king_survival_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_king_survival(p, K.proposed(p, id), M.decode(id), yes))

def tail_11(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_11(p, a, q)):
  L.and_right(R.pawn_single_step(p, a, q), R.clause_11(p, a, q), tail_10(p, a, q, w))

def extract_pawn_single_step(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.pawn_single_step_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.pawn_single_step(p, a, q), R.clause_11(p, a, q), tail_10(p, a, q, w))

def Laws.pawn_single_step(p, id, w):
  accepted_property(q => L.Truth(R.pawn_single_step_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_pawn_single_step(p, K.proposed(p, id), M.decode(id), yes))

def tail_12(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_12(p, a, q)):
  L.and_right(R.pawn_double_step_freshness(p, a, q), R.clause_12(p, a, q), tail_11(p, a, q, w))

def extract_pawn_double_step_freshness(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.pawn_double_step_freshness_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.pawn_double_step_freshness(p, a, q), R.clause_12(p, a, q), tail_11(p, a, q, w))

def Laws.pawn_double_step_freshness(p, id, w):
  accepted_property(q => L.Truth(R.pawn_double_step_freshness_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_pawn_double_step_freshness(p, K.proposed(p, id), M.decode(id), yes))

def tail_13(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_13(p, a, q)):
  L.and_right(R.pawn_diagonal_capture(p, a, q), R.clause_13(p, a, q), tail_12(p, a, q, w))

def extract_pawn_diagonal_capture(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.pawn_diagonal_capture_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.pawn_diagonal_capture(p, a, q), R.clause_13(p, a, q), tail_12(p, a, q, w))

def Laws.pawn_diagonal_capture(p, id, w):
  accepted_property(q => L.Truth(R.pawn_diagonal_capture_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_pawn_diagonal_capture(p, K.proposed(p, id), M.decode(id), yes))

def tail_14(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_14(p, a, q)):
  L.and_right(R.knight_geometry(p, a, q), R.clause_14(p, a, q), tail_13(p, a, q, w))

def extract_knight_geometry(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.knight_geometry_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.knight_geometry(p, a, q), R.clause_14(p, a, q), tail_13(p, a, q, w))

def Laws.knight_geometry(p, id, w):
  accepted_property(q => L.Truth(R.knight_geometry_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_knight_geometry(p, K.proposed(p, id), M.decode(id), yes))

def tail_15(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_15(p, a, q)):
  L.and_right(R.bishop_geometry_path(p, a, q), R.clause_15(p, a, q), tail_14(p, a, q, w))

def extract_bishop_geometry_path(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.bishop_geometry_path_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.bishop_geometry_path(p, a, q), R.clause_15(p, a, q), tail_14(p, a, q, w))

def Laws.bishop_geometry_path(p, id, w):
  accepted_property(q => L.Truth(R.bishop_geometry_path_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_bishop_geometry_path(p, K.proposed(p, id), M.decode(id), yes))

def tail_16(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_16(p, a, q)):
  L.and_right(R.rook_geometry_path(p, a, q), R.clause_16(p, a, q), tail_15(p, a, q, w))

def extract_rook_geometry_path(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.rook_geometry_path_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.rook_geometry_path(p, a, q), R.clause_16(p, a, q), tail_15(p, a, q, w))

def Laws.rook_geometry_path(p, id, w):
  accepted_property(q => L.Truth(R.rook_geometry_path_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_rook_geometry_path(p, K.proposed(p, id), M.decode(id), yes))

def tail_17(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_17(p, a, q)):
  L.and_right(R.queen_geometry_path(p, a, q), R.clause_17(p, a, q), tail_16(p, a, q, w))

def extract_queen_geometry_path(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.queen_geometry_path_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.queen_geometry_path(p, a, q), R.clause_17(p, a, q), tail_16(p, a, q, w))

def Laws.queen_geometry_path(p, id, w):
  accepted_property(q => L.Truth(R.queen_geometry_path_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_queen_geometry_path(p, K.proposed(p, id), M.decode(id), yes))

def tail_18(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_18(p, a, q)):
  L.and_right(R.king_geometry_castle(p, a, q), R.clause_18(p, a, q), tail_17(p, a, q, w))

def extract_king_geometry_castle(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.king_geometry_castle_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.king_geometry_castle(p, a, q), R.clause_18(p, a, q), tail_17(p, a, q, w))

def Laws.king_geometry_castle(p, id, w):
  accepted_property(q => L.Truth(R.king_geometry_castle_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_king_geometry_castle(p, K.proposed(p, id), M.decode(id), yes))

def tail_19(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_19(p, a, q)):
  L.and_right(R.ownership_presence_no_king_capture(p, a, q), R.clause_19(p, a, q), tail_18(p, a, q, w))

def extract_ownership_presence_no_king_capture(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.ownership_presence_no_king_capture_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.ownership_presence_no_king_capture(p, a, q), R.clause_19(p, a, q), tail_18(p, a, q, w))

def Laws.ownership_presence_no_king_capture(p, id, w):
  accepted_property(q => L.Truth(R.ownership_presence_no_king_capture_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_ownership_presence_no_king_capture(p, K.proposed(p, id), M.decode(id), yes))

def tail_20(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_20(p, a, q)):
  L.and_right(R.castling_kingside(p, a, q), R.clause_20(p, a, q), tail_19(p, a, q, w))

def extract_castling_kingside(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.castling_kingside_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.castling_kingside(p, a, q), R.clause_20(p, a, q), tail_19(p, a, q, w))

def Laws.castling_kingside(p, id, w):
  accepted_property(q => L.Truth(R.castling_kingside_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_castling_kingside(p, K.proposed(p, id), M.decode(id), yes))

def tail_21(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_21(p, a, q)):
  L.and_right(R.castling_queenside(p, a, q), R.clause_21(p, a, q), tail_20(p, a, q, w))

def extract_castling_queenside(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.castling_queenside_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.castling_queenside(p, a, q), R.clause_21(p, a, q), tail_20(p, a, q, w))

def Laws.castling_queenside(p, id, w):
  accepted_property(q => L.Truth(R.castling_queenside_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_castling_queenside(p, K.proposed(p, id), M.decode(id), yes))

def tail_22(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_22(p, a, q)):
  L.and_right(R.en_passant_capture(p, a, q), R.clause_22(p, a, q), tail_21(p, a, q, w))

def extract_en_passant_capture(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.en_passant_capture_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.en_passant_capture(p, a, q), R.clause_22(p, a, q), tail_21(p, a, q, w))

def Laws.en_passant_capture(p, id, w):
  accepted_property(q => L.Truth(R.en_passant_capture_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_en_passant_capture(p, K.proposed(p, id), M.decode(id), yes))

def tail_23(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_23(p, a, q)):
  L.and_right(R.ordinary_promotion_freshness(p, a, q), R.clause_23(p, a, q), tail_22(p, a, q, w))

def extract_ordinary_promotion_freshness(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.ordinary_promotion_freshness_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.ordinary_promotion_freshness(p, a, q), R.clause_23(p, a, q), tail_22(p, a, q, w))

def Laws.ordinary_promotion_freshness(p, id, w):
  accepted_property(q => L.Truth(R.ordinary_promotion_freshness_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_ordinary_promotion_freshness(p, K.proposed(p, id), M.decode(id), yes))

def tail_24(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_24(p, a, q)):
  L.and_right(R.shift_adjacent_hole(p, a, q), R.clause_24(p, a, q), tail_23(p, a, q, w))

def extract_shift_adjacent_hole(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.shift_adjacent_hole_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.shift_adjacent_hole(p, a, q), R.clause_24(p, a, q), tail_23(p, a, q, w))

def Laws.shift_adjacent_hole(p, id, w):
  accepted_property(q => L.Truth(R.shift_adjacent_hole_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_shift_adjacent_hole(p, K.proposed(p, id), M.decode(id), yes))

def tail_25(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_25(p, a, q)):
  L.and_right(R.shift_zero_or_one_friendly_nonking(p, a, q), R.clause_25(p, a, q), tail_24(p, a, q, w))

def extract_shift_zero_or_one_friendly_nonking(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.shift_zero_or_one_friendly_nonking_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.shift_zero_or_one_friendly_nonking(p, a, q), R.clause_25(p, a, q), tail_24(p, a, q, w))

def Laws.shift_zero_or_one_friendly_nonking(p, id, w):
  accepted_property(q => L.Truth(R.shift_zero_or_one_friendly_nonking_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_shift_zero_or_one_friendly_nonking(p, K.proposed(p, id), M.decode(id), yes))

def tail_26(+p: M.Position, +a: M.Action, +q: M.Position, w: L.Truth(R.clause_0(p, a, q))) -> L.Truth(R.clause_26(p, a, q)):
  L.and_right(R.shift_offset_no_capture_pawn_freshness(p, a, q), R.clause_26(p, a, q), tail_25(p, a, q, w))

def extract_shift_offset_no_capture_pawn_freshness(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.shift_offset_no_capture_pawn_freshness_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.shift_offset_no_capture_pawn_freshness(p, a, q), R.clause_26(p, a, q), tail_25(p, a, q, w))

def Laws.shift_offset_no_capture_pawn_freshness(p, id, w):
  accepted_property(q => L.Truth(R.shift_offset_no_capture_pawn_freshness_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_shift_offset_no_capture_pawn_freshness(p, K.proposed(p, id), M.decode(id), yes))

def extract_shift_promotion_all_four(+p: M.Position, +q: M.Position, decoded: Maybe<M.Action>,
  w: L.Truth(R.contract_decoded(p, q, decoded))) -> L.Truth(R.shift_promotion_all_four_decoded(p, q, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}: L.and_left(R.shift_promotion_all_four(p, a, q), True{}, tail_26(p, a, q, w))

def Laws.shift_promotion_all_four(p, id, w):
  accepted_property(q => L.Truth(R.shift_promotion_all_four_id(p, id, q)), K.allowed(p, id), p, id, w,
    yes => extract_shift_promotion_all_four(p, K.proposed(p, id), M.decode(id), yes))

def complete_case(b: Bool, +p: M.Position, +id: U32, w: L.Truth(b))
  -> {K.decide(b, p, id) == K.Accepted{id, K.proposed(p, id)} : K.StepResult}:
  match b:
    case True{}: {==}
    case False{}: Empty.absurd({K.Rejected{p} == K.Accepted{id, K.proposed(p, id)} : K.StepResult}, w)
def Laws.acceptance_complete(p, id, w):
  complete_case(K.allowed(p, id), p, id, w)

def rejected_case(b: Bool, +p: M.Position, +id: U32, w: L.Truth(Bool.not(K.accepted(K.decide(b, p, id)))))
  -> {K.decide(b, p, id) == K.Rejected{p} : K.StepResult}:
  match b:
    case False{}: {==}
    case True{}: Empty.absurd({K.Accepted{id, K.proposed(p, id)} == K.Rejected{p} : K.StepResult}, w)
def Laws.rejected_inert(p, id, w):
  rejected_case(K.allowed(p, id), p, id, w)

def exact_case(b: Bool, +p: M.Position, +id: U32)
  -> {K.decide(b, p, id) == Bool.pick(K.StepResult, b, K.Accepted{id, R.expected(p, id)}, K.Rejected{p}) : K.StepResult}:
  match b:
    case False{}: {==}
    case True{}: {==}
def Laws.exact_independent_rules(p, id):
  exact_case(R.legal(p, id), p, id)
