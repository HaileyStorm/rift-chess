"""Focused correctness and invariant tests for the sliding-chess screening engine."""

from __future__ import annotations

from dataclasses import replace
import random

import pytest

from sliding_chess_sim import (
    A2,
    B2,
    B3,
    BLACK,
    B_K,
    EMPTY,
    KING,
    KNIGHT,
    Move,
    PAWN,
    QUEEN,
    ROOK,
    RuleSet,
    Slide,
    VIRGIN_PAWN,
    WHITE,
    W_K,
    apply_action,
    apply_slide,
    file_of,
    find_king,
    in_check,
    initial_state,
    is_attacked,
    legal_actions,
    legal_piece_moves,
    macro_of_square,
    macro_squares,
    perft,
    piece_color,
    piece_type,
    rank_of,
    sq,
    state_from_fen_like,
)

FINAL_RULES = RuleSet("final", slide_mode="exclusive", max_friendly_load=1, allow_empty_slide=True)


def _blank_state(
    *,
    white_king: int = sq(0, 0),
    black_king: int = sq(7, 7),
    holes: tuple[int, ...] = (),
    side: int = WHITE,
    castling: int = 0,
    extra: tuple[tuple[int, int], ...] = (),
):
    """Build a sparse legal-ish state with two kings and selected extra pieces."""

    board = [EMPTY] * 64
    board[white_king] = WHITE * KING
    board[black_king] = BLACK * KING
    for square, piece in extra:
        board[square] = piece
    hole_mask = sum(1 << macro for macro in holes)
    for macro in holes:
        assert all(board[square] == EMPTY for square in macro_squares(macro))
    from sliding_chess_sim import State

    return State(tuple(board), hole_mask, side, castling)


def _find_slide(actions, src_macro: int, dst_macro: int, promotion: int = 0) -> Slide:
    """Return a matching legal slide or fail the test with useful context."""

    for action in actions:
        if (
            isinstance(action, Slide)
            and action.src_macro == src_macro
            and action.dst_macro == dst_macro
            and action.promotion == promotion
        ):
            return action
    pytest.fail(f"Missing slide {src_macro}->{dst_macro} promotion={promotion}; got {actions}")


def test_standard_chess_perft_regression() -> None:
    """The orthodox move generator must retain canonical opening perft counts."""

    state = initial_state(())
    assert [perft(state, depth) for depth in range(1, 4)] == [20, 400, 8902]


def test_gap_blocks_slider_ray() -> None:
    """A rook, bishop, or queen ray cannot pass through absent squares."""

    # A2 removes a3:b4 and therefore severs the a-file between a1 and a8.
    state = _blank_state(
        white_king=sq(7, 0),
        black_king=sq(0, 7),
        holes=(A2,),
        extra=((sq(0, 0), WHITE * ROOK),),
    )
    assert not is_attacked(state, sq(0, 7), WHITE)


def test_knight_ignores_intervening_squares_but_requires_destination() -> None:
    """Knights may jump across a gap, but may not land in one."""

    state = _blank_state(
        extra=((sq(1, 0), WHITE * KNIGHT),),
        holes=(A2,),  # Removes a3:b4; c3 still exists.
    )
    destinations = {move.dst for move in legal_piece_moves(state) if move.src == sq(1, 0)}
    assert sq(2, 2) in destinations

    state_with_missing_destination = _blank_state(
        extra=((sq(1, 0), WHITE * KNIGHT),),
        holes=(B2,),  # Removes c3:d4, including c3.
    )
    destinations = {
        move.dst for move in legal_piece_moves(state_with_missing_destination) if move.src == sq(1, 0)
    }
    assert sq(2, 2) not in destinations


@pytest.mark.parametrize(
    ("pieces", "allowed"),
    [
        ((), True),
        (((sq(0, 2), WHITE * KNIGHT),), True),
        (((sq(0, 2), BLACK * KNIGHT),), False),
        (((sq(0, 2), WHITE * KNIGHT), (sq(1, 2), WHITE * ROOK)), False),
        (((sq(0, 2), WHITE * KNIGHT), (sq(1, 2), BLACK * ROOK)), False),
    ],
)
def test_final_slide_eligibility_load_rule(pieces, allowed: bool) -> None:
    """Only empty tiles or tiles with exactly one mover-owned non-king may shift."""

    state = _blank_state(holes=(B2,), extra=pieces)
    exists = any(
        isinstance(action, Slide) and action.src_macro == A2 and action.dst_macro == B2
        for action in legal_actions(state, FINAL_RULES)
    )
    assert exists is allowed


def test_king_tile_is_anchored() -> None:
    """A tile containing either king may never be shifted."""

    # Put the white king in A2 and the gap in B2.
    state = _blank_state(white_king=sq(0, 2), holes=(B2,))
    assert not any(
        isinstance(action, Slide) and action.src_macro == A2 and action.dst_macro == B2
        for action in legal_actions(state, FINAL_RULES)
    )


def test_shift_that_opens_check_is_illegal() -> None:
    """Restoring a missing segment of an enemy ray may not expose one's own king."""

    # C2 (e3:f4) currently interrupts the e-file. Filling it from B2 would expose Ke1.
    C2 = 6
    state = _blank_state(
        white_king=sq(4, 0),
        black_king=sq(7, 7),
        holes=(C2,),
        extra=((sq(4, 7), BLACK * ROOK),),
    )
    assert not in_check(state, WHITE)
    assert not any(
        isinstance(action, Slide) and action.src_macro == B2 and action.dst_macro == C2
        for action in legal_actions(state, FINAL_RULES)
    )


def test_shift_can_answer_check_by_cutting_the_ray() -> None:
    """A legal shift may create a gap that interposes against a sliding attack."""

    C2 = 6
    state = _blank_state(
        white_king=sq(4, 0),
        black_king=sq(7, 7),
        holes=(B2,),
        extra=((sq(4, 7), BLACK * ROOK),),
    )
    assert in_check(state, WHITE)
    slide = _find_slide(legal_actions(state, FINAL_RULES), C2, B2)
    next_state = apply_slide(state, slide, FINAL_RULES)
    assert not in_check(next_state, WHITE)


def test_slide_transports_one_piece_two_squares_and_preserves_square_color() -> None:
    """A loaded shift moves its passenger rigidly by two files or ranks."""

    state = _blank_state(
        holes=(B2,),
        extra=((sq(0, 2), WHITE * KNIGHT),),
    )
    slide = _find_slide(legal_actions(state, FINAL_RULES), A2, B2)
    next_state = apply_slide(state, slide, FINAL_RULES)
    old_square = sq(0, 2)
    new_square = sq(2, 2)
    assert next_state.board[old_square] == EMPTY
    assert next_state.board[new_square] == WHITE * KNIGHT
    assert (file_of(old_square) + rank_of(old_square)) % 2 == (file_of(new_square) + rank_of(new_square)) % 2


def test_rook_shift_consumes_castling_right() -> None:
    """Transporting an original rook counts as moving it for castling rights."""

    D1, D2 = 3, 7
    state = _blank_state(
        white_king=sq(4, 0),
        black_king=sq(4, 7),
        holes=(D2,),
        castling=W_K,
        extra=((sq(7, 0), WHITE * ROOK),),
    )
    slide = _find_slide(legal_actions(state, FINAL_RULES), D1, D2)
    next_state = apply_slide(state, slide, FINAL_RULES)
    assert next_state.castling & W_K == 0


def test_pawn_shift_consumes_virgin_status() -> None:
    """A transported pawn may not later claim its initial two-square move."""

    A1 = 0
    state = _blank_state(
        white_king=sq(7, 0),
        black_king=sq(7, 7),
        holes=(A2,),
        extra=((sq(0, 1), WHITE * VIRGIN_PAWN),),
    )
    slide = _find_slide(legal_actions(state, FINAL_RULES), A1, A2)
    next_state = apply_slide(state, slide, FINAL_RULES)
    assert next_state.board[sq(0, 3)] == WHITE * PAWN


def test_every_shift_expires_en_passant() -> None:
    """The immediate-response en-passant window closes when the reply is a shift."""

    C2 = 6
    state = _blank_state(holes=(B2,))
    state = replace(state, ep_target=sq(3, 5), ep_pawn=sq(3, 4))
    slide = _find_slide(legal_actions(state, FINAL_RULES), C2, B2)
    next_state = apply_slide(state, slide, FINAL_RULES)
    assert next_state.ep_target == -1
    assert next_state.ep_pawn == -1


def test_shift_promotion_offers_all_four_pieces_and_resets_progress_counter() -> None:
    """A pawn delivered to its back rank by a shift promotes immediately."""

    B4 = 13
    state = _blank_state(
        white_king=sq(0, 0),
        black_king=sq(7, 7),
        holes=(B4,),
        extra=((sq(2, 5), WHITE * PAWN),),  # c6 -> c8
    )
    state = replace(state, halfmove=73)
    slides = [
        action
        for action in legal_actions(state, FINAL_RULES)
        if isinstance(action, Slide) and action.src_macro == B3 and action.dst_macro == B4
    ]
    assert {slide.promotion for slide in slides} == {QUEEN, ROOK, 3, KNIGHT}
    promoted = apply_slide(state, _find_slide(slides, B3, B4, QUEEN), FINAL_RULES)
    assert promoted.board[sq(2, 7)] == WHITE * QUEEN
    assert promoted.halfmove == 0


def test_nonpromoting_pawn_shift_does_not_reset_progress_counter() -> None:
    """Pawn shuttling cannot indefinitely evade the variant's progress draw."""

    A1 = 0
    state = _blank_state(
        white_king=sq(7, 0),
        black_king=sq(7, 7),
        holes=(A2,),
        extra=((sq(0, 1), WHITE * VIRGIN_PAWN),),
    )
    state = replace(state, halfmove=73)
    slide = _find_slide(legal_actions(state, FINAL_RULES), A1, A2)
    next_state = apply_slide(state, slide, FINAL_RULES)
    assert next_state.halfmove == 74


def test_queenside_castling_requires_the_middle_tile_to_exist() -> None:
    """Missing c1/d1 squares prevent orthodox queenside castling."""

    B1 = 1
    state = _blank_state(
        white_king=sq(4, 0),
        black_king=sq(4, 7),
        holes=(B1,),
        castling=2,
        extra=((sq(0, 0), WHITE * ROOK),),
    )
    assert not any(isinstance(action, Move) and action.castle == -1 for action in legal_actions(state, FINAL_RULES))


def test_repetition_identity_includes_gap_locations_and_pawn_status() -> None:
    """Topology and first-move rights are part of position identity."""

    base = initial_state((B2, B3))
    other_holes = replace(base, holes=(1 << 6) | (1 << 10))
    assert base.key() != other_holes.key()

    board = list(base.board)
    board[sq(0, 1)] = WHITE * PAWN
    moved_pawn = replace(base, board=tuple(board))
    assert base.key() != moved_pawn.key()


def test_random_play_preserves_core_invariants() -> None:
    """Random legal play cannot lose holes, put pieces in gaps, or transport overloads."""

    rng = random.Random(0xC0FFEE)
    for game_index in range(12):
        state = initial_state((B2, B3) if game_index % 2 == 0 else (6, 10))
        for _ in range(120):
            assert state.holes.bit_count() == 2
            assert all(
                state.board[square] == EMPTY
                for macro in range(16)
                if state.is_hole_macro(macro)
                for square in macro_squares(macro)
            )
            assert find_king(state, WHITE) >= 0
            assert find_king(state, BLACK) >= 0
            assert all(
                piece_type(piece) != PAWN or rank_of(square) not in (0, 7)
                for square, piece in enumerate(state.board)
                if piece
            )

            actions = legal_actions(state, FINAL_RULES)
            if not actions:
                break
            action = rng.choice(actions)
            if isinstance(action, Slide):
                passengers = [state.board[square] for square in macro_squares(action.src_macro) if state.board[square]]
                assert len(passengers) <= 1
                assert all(piece_color(piece) == state.side for piece in passengers)
                assert all(piece_type(piece) != KING for piece in passengers)
                sx, sy = action.src_macro % 4, action.src_macro // 4
                dx, dy = action.dst_macro % 4, action.dst_macro // 4
                assert abs(sx - dx) + abs(sy - dy) == 1

            mover = state.side
            state = apply_action(state, action, FINAL_RULES)
            assert not in_check(state, mover)
