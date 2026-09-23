import Base
import ../Model.bend as M
import ../ProofKit.bend as L
import ./RuleContracts.bend as R
import ./RuleKernel.bend as K

law admissible_old:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.admissible_old_id(p, id, K.position(K.step(p, id))))

law admissible_new:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.admissible_new_id(p, id, K.position(K.step(p, id))))

law legal_intent:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.legal_intent_id(p, id, K.position(K.step(p, id))))

law exact_cells:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.exact_cells_id(p, id, K.position(K.step(p, id))))

law exact_topology:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.exact_topology_id(p, id, K.position(K.step(p, id))))

law exact_rights:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.exact_rights_id(p, id, K.position(K.step(p, id))))

law ep_creation_expiry_victim:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.ep_creation_expiry_victim_id(p, id, K.position(K.step(p, id))))

law progress_counter:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.progress_counter_id(p, id, K.position(K.step(p, id))))

law turn_fullmove:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.turn_fullmove_id(p, id, K.position(K.step(p, id))))

law king_survival:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.king_survival_id(p, id, K.position(K.step(p, id))))

law pawn_single_step:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.pawn_single_step_id(p, id, K.position(K.step(p, id))))

law pawn_double_step_freshness:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.pawn_double_step_freshness_id(p, id, K.position(K.step(p, id))))

law pawn_diagonal_capture:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.pawn_diagonal_capture_id(p, id, K.position(K.step(p, id))))

law knight_geometry:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.knight_geometry_id(p, id, K.position(K.step(p, id))))

law bishop_geometry_path:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.bishop_geometry_path_id(p, id, K.position(K.step(p, id))))

law rook_geometry_path:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.rook_geometry_path_id(p, id, K.position(K.step(p, id))))

law queen_geometry_path:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.queen_geometry_path_id(p, id, K.position(K.step(p, id))))

law king_geometry_castle:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.king_geometry_castle_id(p, id, K.position(K.step(p, id))))

law ownership_presence_no_king_capture:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.ownership_presence_no_king_capture_id(p, id, K.position(K.step(p, id))))

law castling_kingside:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.castling_kingside_id(p, id, K.position(K.step(p, id))))

law castling_queenside:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.castling_queenside_id(p, id, K.position(K.step(p, id))))

law en_passant_capture:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.en_passant_capture_id(p, id, K.position(K.step(p, id))))

law ordinary_promotion_freshness:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.ordinary_promotion_freshness_id(p, id, K.position(K.step(p, id))))

law shift_adjacent_hole:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.shift_adjacent_hole_id(p, id, K.position(K.step(p, id))))

law shift_zero_or_one_friendly_nonking:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.shift_zero_or_one_friendly_nonking_id(p, id, K.position(K.step(p, id))))

law shift_offset_no_capture_pawn_freshness:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.shift_offset_no_capture_pawn_freshness_id(p, id, K.position(K.step(p, id))))

law shift_promotion_all_four:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(K.accepted(K.step(p, id)))
  L.Truth(R.shift_promotion_all_four_id(p, id, K.position(K.step(p, id))))

law acceptance_complete:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(R.legal(p, id))
  {K.step(p, id) == K.Accepted{id, R.expected(p, id)} : K.StepResult}

law rejected_inert:
  for +p: M.Position
  for +id: U32
  for w: L.Truth(Bool.not(K.accepted(K.step(p, id))))
  {K.step(p, id) == K.Rejected{p} : K.StepResult}

law exact_independent_rules:
  for +p: M.Position
  for +id: U32
  {K.step(p, id) == Bool.pick(K.StepResult, R.legal(p, id), K.Accepted{id, R.expected(p, id)}, K.Rejected{p}) : K.StepResult}
