from __future__ import annotations

from dataclasses import dataclass, replace
from functools import lru_cache
from typing import Iterable, Iterator, Optional, Sequence
import math
import random
import time

WHITE = 1
BLACK = -1

EMPTY = 0
PAWN = 1
KNIGHT = 2
BISHOP = 3
ROOK = 4
QUEEN = 5
KING = 6
VIRGIN_PAWN = 7

PIECE_VALUE = {
    PAWN: 100,
    VIRGIN_PAWN: 100,
    KNIGHT: 320,
    BISHOP: 330,
    ROOK: 500,
    QUEEN: 900,
    KING: 0,
}

# Castling rights bits.
W_K = 1
W_Q = 2
B_K = 4
B_Q = 8

KNIGHT_DELTAS = (
    (-1, -2), (1, -2), (-2, -1), (2, -1),
    (-2, 1), (2, 1), (-1, 2), (1, 2),
)
KING_DELTAS = tuple(
    (df, dr)
    for dr in (-1, 0, 1)
    for df in (-1, 0, 1)
    if (df, dr) != (0, 0)
)
BISHOP_DIRS = ((1, 1), (1, -1), (-1, 1), (-1, -1))
ROOK_DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))
QUEEN_DIRS = BISHOP_DIRS + ROOK_DIRS


def sq(file_: int, rank: int) -> int:
    return rank * 8 + file_


def file_of(square: int) -> int:
    return square & 7


def rank_of(square: int) -> int:
    return square >> 3


def square_name(square: int) -> str:
    return chr(ord('a') + file_of(square)) + str(rank_of(square) + 1)


def macro_of_square(square: int) -> int:
    return (rank_of(square) // 2) * 4 + (file_of(square) // 2)


def macro_xy(macro: int) -> tuple[int, int]:
    return macro % 4, macro // 4


def macro_name(macro: int) -> str:
    x, y = macro_xy(macro)
    return f"{chr(ord('A') + x)}{y + 1}"


def macro_squares(macro: int) -> tuple[int, int, int, int]:
    x, y = macro_xy(macro)
    f0 = 2 * x
    r0 = 2 * y
    return (sq(f0, r0), sq(f0 + 1, r0), sq(f0, r0 + 1), sq(f0 + 1, r0 + 1))


def piece_type(piece: int) -> int:
    t = abs(piece)
    return PAWN if t == VIRGIN_PAWN else t


def piece_color(piece: int) -> int:
    return WHITE if piece > 0 else BLACK


def make_piece(color: int, ptype: int, virgin_pawn: bool = False) -> int:
    if ptype == PAWN and virgin_pawn:
        ptype = VIRGIN_PAWN
    return color * ptype


@dataclass(frozen=True, slots=True)
class Move:
    """A standard chess move on board-space coordinates."""

    src: int
    dst: int
    promotion: int = 0
    is_ep: bool = False
    castle: int = 0  # 1 king-side, -1 queen-side

    def label(self) -> str:
        promo = "" if not self.promotion else "=" + {KNIGHT: "N", BISHOP: "B", ROOK: "R", QUEEN: "Q"}[self.promotion]
        if self.castle == 1:
            return "O-O"
        if self.castle == -1:
            return "O-O-O"
        return f"{square_name(self.src)}{square_name(self.dst)}{promo}"


@dataclass(frozen=True, slots=True)
class Slide:
    """A 2x2 tile slide from a present macro-cell into an adjacent hole."""

    src_macro: int
    dst_macro: int
    promotion: int = 0

    def label(self) -> str:
        sx, sy = macro_xy(self.src_macro)
        dx, dy = macro_xy(self.dst_macro)
        arrow = {(0, 1): "↑", (0, -1): "↓", (1, 0): "→", (-1, 0): "←"}[(dx - sx, dy - sy)]
        promo = "" if not self.promotion else "=" + {KNIGHT: "N", BISHOP: "B", ROOK: "R", QUEEN: "Q"}[self.promotion]
        return f"[{macro_name(self.src_macro)}]{arrow}{promo}"


Action = Move | Slide


@dataclass(frozen=True, slots=True)
class RuleSet:
    """Parameters defining the sliding component of the variant."""

    name: str
    gap_count: int = 2
    slide_mode: str = "exclusive"  # unrestricted, exclusive, majority_count, majority_value
    max_friendly_load: Optional[int] = 1
    allow_empty_slide: bool = True
    king_tiles_anchor: bool = True
    transported_pieces_count_as_moved: bool = True
    slide_promotion: bool = True
    multi_slide: bool = False
    immediate_reverse_forbidden: bool = False
    slide_resets_halfmove_if_pawn: bool = False


@dataclass(frozen=True, slots=True)
class State:
    """Immutable game state for search and simulation."""

    board: tuple[int, ...]
    holes: int  # 16-bit macro-cell mask
    side: int
    castling: int
    ep_target: int = -1
    ep_pawn: int = -1
    halfmove: int = 0
    fullmove: int = 1
    last_slide_src: int = -1
    last_slide_dst: int = -1

    def present(self, square: int) -> bool:
        return not ((self.holes >> macro_of_square(square)) & 1)

    def is_hole_macro(self, macro: int) -> bool:
        return bool((self.holes >> macro) & 1)

    def key(self) -> tuple:
        # Halfmove/fullmove and last slide are excluded from repetition identity.
        # Last slide enters only if a ko-like immediate reverse rule is enabled; callers
        # that enable it append that pair when counting repetition.
        return (self.board, self.holes, self.side, self.castling, self.ep_target, self.ep_pawn)


START_BACK = (ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK)


def initial_state(hole_macros: Sequence[int] = ()) -> State:
    """Construct the standard chess setup with selected empty 2x2 macro-cells."""

    board = [EMPTY] * 64
    for f, p in enumerate(START_BACK):
        board[sq(f, 0)] = make_piece(WHITE, p)
        board[sq(f, 1)] = make_piece(WHITE, PAWN, virgin_pawn=True)
        board[sq(f, 6)] = make_piece(BLACK, PAWN, virgin_pawn=True)
        board[sq(f, 7)] = make_piece(BLACK, p)
    holes = 0
    for m in hole_macros:
        holes |= 1 << m
        for s in macro_squares(m):
            if board[s] != EMPTY:
                raise ValueError(f"Initial hole {macro_name(m)} overlaps a starting piece on {square_name(s)}")
    return State(tuple(board), holes, WHITE, W_K | W_Q | B_K | B_Q)


def state_from_fen_like(
    rows: Sequence[str],
    *,
    holes: Sequence[int] = (),
    side: int = WHITE,
    castling: int = 0,
    ep_target: int = -1,
    ep_pawn: int = -1,
) -> State:
    """Build a state from 8 rank strings (rank 8 to rank 1) for focused tests.

    Characters use FEN piece letters. Digits are supported. Pawns created this way are
    treated as already moved unless written as U/u (virgin white/black pawn).
    """

    if len(rows) != 8:
        raise ValueError("Need exactly 8 rows")
    board = [0] * 64
    pmap = {'p': PAWN, 'n': KNIGHT, 'b': BISHOP, 'r': ROOK, 'q': QUEEN, 'k': KING}
    for row_i, text in enumerate(rows):
        rank = 7 - row_i
        f = 0
        for ch in text:
            if ch.isdigit():
                f += int(ch)
                continue
            if ch in 'Uu':
                color = WHITE if ch == 'U' else BLACK
                board[sq(f, rank)] = make_piece(color, PAWN, virgin_pawn=True)
            else:
                color = WHITE if ch.isupper() else BLACK
                board[sq(f, rank)] = make_piece(color, pmap[ch.lower()])
            f += 1
        if f != 8:
            raise ValueError(f"Bad row {text!r}")
    hole_mask = sum(1 << m for m in holes)
    for m in holes:
        for s in macro_squares(m):
            if board[s] != 0:
                raise ValueError("Hole overlaps piece")
    return State(tuple(board), hole_mask, side, castling, ep_target, ep_pawn)


def find_king(state: State, color: int) -> int:
    target = color * KING
    for i, p in enumerate(state.board):
        if p == target:
            return i
    return -1


def is_attacked(state: State, target: int, by_color: int) -> bool:
    """Return whether target is attacked by `by_color`, respecting missing squares."""

    if target < 0 or not state.present(target):
        return False
    tf, tr = file_of(target), rank_of(target)
    board = state.board

    # Pawn attacks: reverse lookup from target.
    pawn_src_rank = tr - (1 if by_color == WHITE else -1)
    if 0 <= pawn_src_rank < 8:
        for sf in (tf - 1, tf + 1):
            if 0 <= sf < 8:
                s = sq(sf, pawn_src_rank)
                if state.present(s) and board[s] * by_color > 0 and piece_type(board[s]) == PAWN:
                    return True

    for df, dr in KNIGHT_DELTAS:
        sf, sr = tf + df, tr + dr
        if 0 <= sf < 8 and 0 <= sr < 8:
            s = sq(sf, sr)
            if state.present(s) and board[s] == by_color * KNIGHT:
                return True

    for df, dr in KING_DELTAS:
        sf, sr = tf + df, tr + dr
        if 0 <= sf < 8 and 0 <= sr < 8:
            s = sq(sf, sr)
            if state.present(s) and board[s] == by_color * KING:
                return True

    for dirs, types in ((BISHOP_DIRS, (BISHOP, QUEEN)), (ROOK_DIRS, (ROOK, QUEEN))):
        for df, dr in dirs:
            sf, sr = tf + df, tr + dr
            while 0 <= sf < 8 and 0 <= sr < 8:
                s = sq(sf, sr)
                if not state.present(s):
                    break
                p = board[s]
                if p:
                    if p * by_color > 0 and piece_type(p) in types:
                        return True
                    break
                sf += df
                sr += dr
    return False


def in_check(state: State, color: int) -> bool:
    king = find_king(state, color)
    return king < 0 or is_attacked(state, king, -color)


def _pseudo_piece_moves(state: State) -> Iterator[Move]:
    board = state.board
    side = state.side
    for src, piece in enumerate(board):
        if piece * side <= 0 or not state.present(src):
            continue
        ptype = piece_type(piece)
        f, r = file_of(src), rank_of(src)
        if ptype == PAWN:
            dr = 1 if side == WHITE else -1
            promotion_rank = 7 if side == WHITE else 0
            r1 = r + dr
            if 0 <= r1 < 8:
                dst = sq(f, r1)
                if state.present(dst) and board[dst] == EMPTY:
                    if r1 == promotion_rank:
                        for promo in (QUEEN, ROOK, BISHOP, KNIGHT):
                            yield Move(src, dst, promotion=promo)
                    else:
                        yield Move(src, dst)
                        start_rank = 1 if side == WHITE else 6
                        r2 = r + 2 * dr
                        if abs(piece) == VIRGIN_PAWN and r == start_rank and 0 <= r2 < 8:
                            dst2 = sq(f, r2)
                            if state.present(dst2) and board[dst2] == EMPTY:
                                yield Move(src, dst2)
            for df in (-1, 1):
                cf, cr = f + df, r + dr
                if not (0 <= cf < 8 and 0 <= cr < 8):
                    continue
                dst = sq(cf, cr)
                if not state.present(dst):
                    continue
                target = board[dst]
                if target * side < 0 and piece_type(target) != KING:
                    if cr == promotion_rank:
                        for promo in (QUEEN, ROOK, BISHOP, KNIGHT):
                            yield Move(src, dst, promotion=promo)
                    else:
                        yield Move(src, dst)
                elif dst == state.ep_target and state.ep_pawn >= 0:
                    ep_piece = board[state.ep_pawn]
                    if ep_piece * side < 0 and piece_type(ep_piece) == PAWN:
                        yield Move(src, dst, is_ep=True)

        elif ptype == KNIGHT:
            for df, dr in KNIGHT_DELTAS:
                nf, nr = f + df, r + dr
                if 0 <= nf < 8 and 0 <= nr < 8:
                    dst = sq(nf, nr)
                    if not state.present(dst):
                        continue
                    target = board[dst]
                    if target * side <= 0 and piece_type(target) != KING:
                        yield Move(src, dst)

        elif ptype in (BISHOP, ROOK, QUEEN):
            dirs = BISHOP_DIRS if ptype == BISHOP else ROOK_DIRS if ptype == ROOK else QUEEN_DIRS
            for df, dr in dirs:
                nf, nr = f + df, r + dr
                while 0 <= nf < 8 and 0 <= nr < 8:
                    dst = sq(nf, nr)
                    if not state.present(dst):
                        break
                    target = board[dst]
                    if target == EMPTY:
                        yield Move(src, dst)
                    else:
                        if target * side < 0 and piece_type(target) != KING:
                            yield Move(src, dst)
                        break
                    nf += df
                    nr += dr

        elif ptype == KING:
            for df, dr in KING_DELTAS:
                nf, nr = f + df, r + dr
                if 0 <= nf < 8 and 0 <= nr < 8:
                    dst = sq(nf, nr)
                    if not state.present(dst):
                        continue
                    target = board[dst]
                    if target * side <= 0 and piece_type(target) != KING:
                        yield Move(src, dst)
            yield from _pseudo_castles(state, src)


def _pseudo_castles(state: State, king_src: int) -> Iterator[Move]:
    side = state.side
    home_rank = 0 if side == WHITE else 7
    if king_src != sq(4, home_rank) or state.board[king_src] != side * KING:
        return
    if in_check(state, side):
        return
    rights_k = W_K if side == WHITE else B_K
    rights_q = W_Q if side == WHITE else B_Q
    enemy = -side

    # King-side: e -> g, rook h -> f.
    if state.castling & rights_k:
        rook_sq = sq(7, home_rank)
        path = (sq(5, home_rank), sq(6, home_rank))
        if (
            state.present(rook_sq)
            and state.board[rook_sq] == side * ROOK
            and all(state.present(s) and state.board[s] == EMPTY for s in path)
            and not is_attacked(state, path[0], enemy)
            and not is_attacked(state, path[1], enemy)
        ):
            yield Move(king_src, path[1], castle=1)

    # Queen-side: e -> c, rook a -> d. All squares between must exist.
    if state.castling & rights_q:
        rook_sq = sq(0, home_rank)
        empties = (sq(1, home_rank), sq(2, home_rank), sq(3, home_rank))
        king_path = (sq(3, home_rank), sq(2, home_rank))
        if (
            state.present(rook_sq)
            and state.board[rook_sq] == side * ROOK
            and all(state.present(s) and state.board[s] == EMPTY for s in empties)
            and not is_attacked(state, king_path[0], enemy)
            and not is_attacked(state, king_path[1], enemy)
        ):
            yield Move(king_src, king_path[1], castle=-1)


def apply_move(state: State, move: Move) -> State:
    board = list(state.board)
    side = state.side
    piece = board[move.src]
    ptype = piece_type(piece)
    target = board[move.dst]
    capture = target != EMPTY or move.is_ep

    board[move.src] = EMPTY
    if move.is_ep:
        board[state.ep_pawn] = EMPTY
    if move.castle:
        home_rank = 0 if side == WHITE else 7
        if move.castle == 1:
            rook_src, rook_dst = sq(7, home_rank), sq(5, home_rank)
        else:
            rook_src, rook_dst = sq(0, home_rank), sq(3, home_rank)
        board[rook_dst] = board[rook_src]
        board[rook_src] = EMPTY
    if move.promotion:
        board[move.dst] = side * move.promotion
    elif ptype == PAWN:
        board[move.dst] = side * PAWN  # moving a pawn consumes virginity
    else:
        board[move.dst] = piece

    castling = state.castling
    if ptype == KING:
        castling &= ~(W_K | W_Q) if side == WHITE else ~(B_K | B_Q)
    if ptype == ROOK:
        if move.src == sq(0, 0): castling &= ~W_Q
        if move.src == sq(7, 0): castling &= ~W_K
        if move.src == sq(0, 7): castling &= ~B_Q
        if move.src == sq(7, 7): castling &= ~B_K
    # Capturing an original rook removes that castling right.
    if target and piece_type(target) == ROOK:
        if move.dst == sq(0, 0): castling &= ~W_Q
        if move.dst == sq(7, 0): castling &= ~W_K
        if move.dst == sq(0, 7): castling &= ~B_Q
        if move.dst == sq(7, 7): castling &= ~B_K

    ep_target = -1
    ep_pawn = -1
    if ptype == PAWN and abs(rank_of(move.dst) - rank_of(move.src)) == 2:
        ep_target = sq(file_of(move.src), (rank_of(move.src) + rank_of(move.dst)) // 2)
        ep_pawn = move.dst

    return State(
        board=tuple(board),
        holes=state.holes,
        side=-side,
        castling=castling,
        ep_target=ep_target,
        ep_pawn=ep_pawn,
        halfmove=0 if (ptype == PAWN or capture) else state.halfmove + 1,
        fullmove=state.fullmove + (1 if side == BLACK else 0),
        last_slide_src=-1,
        last_slide_dst=-1,
    )


def _tile_occupancy(state: State, macro: int) -> tuple[int, int, int, int, bool]:
    """Return friendly count/value, enemy count/value, and whether any king is present."""

    fc = fv = ec = ev = 0
    king = False
    for s in macro_squares(macro):
        p = state.board[s]
        if not p:
            continue
        if piece_type(p) == KING:
            king = True
        if p * state.side > 0:
            fc += 1
            fv += PIECE_VALUE[abs(p)]
        else:
            ec += 1
            ev += PIECE_VALUE[abs(p)]
    return fc, fv, ec, ev, king


def _slide_base_allowed(state: State, macro: int, rules: RuleSet) -> bool:
    fc, fv, ec, ev, king = _tile_occupancy(state, macro)
    if rules.king_tiles_anchor and king:
        return False
    total = fc + ec
    if total == 0:
        return rules.allow_empty_slide
    if rules.slide_mode == "unrestricted":
        return True
    if rules.slide_mode == "exclusive":
        if ec != 0 or fc == 0:
            return False
        if rules.max_friendly_load is not None and fc > rules.max_friendly_load:
            return False
        return True
    if rules.slide_mode == "majority_count":
        if fc == 0 or fc < ec:
            return False
        if rules.max_friendly_load is not None and fc > rules.max_friendly_load:
            return False
        return True
    if rules.slide_mode == "majority_value":
        if fc == 0 or fv < ev:
            return False
        if rules.max_friendly_load is not None and fc > rules.max_friendly_load:
            return False
        return True
    raise ValueError(f"Unknown slide_mode {rules.slide_mode}")


def _pseudo_slides(state: State, rules: RuleSet) -> Iterator[Slide]:
    holes = [m for m in range(16) if state.is_hole_macro(m)]
    for dst in holes:
        dx, dy = macro_xy(dst)
        for sx, sy in ((dx - 1, dy), (dx + 1, dy), (dx, dy - 1), (dx, dy + 1)):
            if not (0 <= sx < 4 and 0 <= sy < 4):
                continue
            src = sy * 4 + sx
            if state.is_hole_macro(src):
                continue
            if rules.immediate_reverse_forbidden and src == state.last_slide_dst and dst == state.last_slide_src:
                continue
            if not _slide_base_allowed(state, src, rules):
                continue

            # Determine whether one transported pawn promotes. Under the intended load-1
            # rule there can be at most one; for permissive test variants, auto-queen if
            # multiple would promote to avoid combinatorial blow-up.
            delta_f = (dx - sx) * 2
            delta_r = (dy - sy) * 2
            promoting = []
            for s in macro_squares(src):
                p = state.board[s]
                if p and p * state.side > 0 and piece_type(p) == PAWN:
                    dr = rank_of(s) + delta_r
                    if dr == (7 if state.side == WHITE else 0):
                        promoting.append(s)
            if promoting:
                if not rules.slide_promotion:
                    # Forbidding promotion-by-slide means the entire slide is illegal.
                    # Leaving a pawn stranded on the back rank would create an awkward
                    # extra state and is not a useful rules candidate.
                    continue
                if len(promoting) == 1:
                    for promo in (QUEEN, ROOK, BISHOP, KNIGHT):
                        yield Slide(src, dst, promotion=promo)
                else:
                    yield Slide(src, dst, promotion=QUEEN)
            else:
                yield Slide(src, dst)


def apply_slide(state: State, slide: Slide, rules: RuleSet) -> State:
    board = list(state.board)
    sx, sy = macro_xy(slide.src_macro)
    dx, dy = macro_xy(slide.dst_macro)
    delta_f = (dx - sx) * 2
    delta_r = (dy - sy) * 2

    moved: list[tuple[int, int, int]] = []
    for s in macro_squares(slide.src_macro):
        p = board[s]
        if p:
            ns = sq(file_of(s) + delta_f, rank_of(s) + delta_r)
            moved.append((s, ns, p))
        board[s] = EMPTY
    # Destination is a hole and therefore has no pieces.
    for _, ns, p in moved:
        if rules.transported_pieces_count_as_moved and abs(p) == VIRGIN_PAWN:
            p = state.side * PAWN if p * state.side > 0 else -state.side * PAWN
        if piece_type(p) == PAWN and rank_of(ns) == (7 if piece_color(p) == WHITE else 0):
            if rules.slide_promotion:
                # Intended rules only move the mover's pieces. For permissive variants,
                # auto-queen enemy pawns; otherwise use the chosen promotion.
                if piece_color(p) == state.side and slide.promotion:
                    p = state.side * slide.promotion
                else:
                    p = piece_color(p) * QUEEN
        board[ns] = p

    holes = state.holes
    holes &= ~(1 << slide.dst_macro)
    holes |= 1 << slide.src_macro

    castling = state.castling
    if rules.transported_pieces_count_as_moved:
        # If an original rook leaves its home square on a slide, its right is gone.
        for old, _, p in moved:
            if piece_type(p) == ROOK:
                if old == sq(0, 0): castling &= ~W_Q
                if old == sq(7, 0): castling &= ~W_K
                if old == sq(0, 7): castling &= ~B_Q
                if old == sq(7, 7): castling &= ~B_K
            if piece_type(p) == KING:
                castling &= ~(W_K | W_Q) if p > 0 else ~(B_K | B_Q)

    pawn_carried = any(piece_type(p) == PAWN for _, _, p in moved)
    # A promotion is irreversible progress and resets the progress counter. Ordinary
    # pawn transport does not: otherwise a pawn could be shuttled forever to evade
    # the draw clock.
    halfmove = (
        0
        if slide.promotion or (rules.slide_resets_halfmove_if_pawn and pawn_carried)
        else state.halfmove + 1
    )
    return State(
        board=tuple(board),
        holes=holes,
        side=-state.side,
        castling=castling,
        ep_target=-1,
        ep_pawn=-1,
        halfmove=halfmove,
        fullmove=state.fullmove + (1 if state.side == BLACK else 0),
        last_slide_src=slide.src_macro,
        last_slide_dst=slide.dst_macro,
    )


def apply_action(state: State, action: Action, rules: RuleSet) -> State:
    return apply_move(state, action) if isinstance(action, Move) else apply_slide(state, action, rules)


def legal_actions(state: State, rules: RuleSet, include_slides: bool = True) -> list[Action]:
    side = state.side
    out: list[Action] = []
    for move in _pseudo_piece_moves(state):
        nxt = apply_move(state, move)
        if not in_check(nxt, side):
            out.append(move)
    if include_slides:
        for slide in _pseudo_slides(state, rules):
            nxt = apply_slide(state, slide, rules)
            if not in_check(nxt, side):
                out.append(slide)
    return out


def legal_piece_moves(state: State) -> list[Move]:
    side = state.side
    return [m for m in _pseudo_piece_moves(state) if not in_check(apply_move(state, m), side)]


def perft(state: State, depth: int) -> int:
    if depth == 0:
        return 1
    total = 0
    for move in legal_piece_moves(state):
        total += perft(apply_move(state, move), depth - 1)
    return total


def board_ascii(state: State) -> str:
    symbols = {
        WHITE * PAWN: 'P', WHITE * VIRGIN_PAWN: 'P', WHITE * KNIGHT: 'N', WHITE * BISHOP: 'B',
        WHITE * ROOK: 'R', WHITE * QUEEN: 'Q', WHITE * KING: 'K',
        BLACK * PAWN: 'p', BLACK * VIRGIN_PAWN: 'p', BLACK * KNIGHT: 'n', BLACK * BISHOP: 'b',
        BLACK * ROOK: 'r', BLACK * QUEEN: 'q', BLACK * KING: 'k',
    }
    lines = []
    for r in range(7, -1, -1):
        row = []
        for f in range(8):
            s = sq(f, r)
            if not state.present(s):
                row.append('·')
            else:
                row.append(symbols.get(state.board[s], '.'))
        lines.append(f"{r+1} " + ' '.join(row))
    lines.append("  a b c d e f g h")
    return '\n'.join(lines)


def is_bare_kings(state: State) -> bool:
    """Return whether the only remaining pieces are the two kings."""

    non_empty = [piece_type(piece) for piece in state.board if piece]
    return len(non_empty) == 2 and all(ptype == KING for ptype in non_empty)


def terminal_status(
    state: State,
    rules: RuleSet,
    repetition_counts: Optional[dict[tuple, int]] = None,
    *,
    max_halfmoves: int = 100,
) -> Optional[str]:
    """Return the terminal result, with checkmate taking precedence over draws."""

    actions = legal_actions(state, rules)
    if not actions:
        if in_check(state, state.side):
            return "black_win" if state.side == WHITE else "white_win"
        return "draw_stalemate"

    if is_bare_kings(state):
        return "draw_dead"

    key = state.key()
    if rules.immediate_reverse_forbidden:
        key = key + (state.last_slide_src, state.last_slide_dst)
    if repetition_counts is not None and repetition_counts.get(key, 0) >= 3:
        return "draw_repetition"
    if state.halfmove >= max_halfmoves:
        return "draw_50move"
    return None


# Piece-square tables are deliberately modest; the simulation is for rule screening,
# not chess strength. Values are from White's perspective and mirrored for Black.
PAWN_PST = (
      0,   0,   0,   0,   0,   0,   0,   0,
      5,  10,  10, -20, -20,  10,  10,   5,
      5,  -5, -10,   0,   0, -10,  -5,   5,
      0,   0,   0,  20,  20,   0,   0,   0,
      5,   5,  10,  25,  25,  10,   5,   5,
     10,  10,  20,  30,  30,  20,  10,  10,
     50,  50,  50,  50,  50,  50,  50,  50,
      0,   0,   0,   0,   0,   0,   0,   0,
)
KNIGHT_PST = (
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
)
BISHOP_PST = (
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
)
ROOK_PST = (
      0,  0,  0,  5,  5,  0,  0,  0,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      5, 10, 10, 10, 10, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0,
)
QUEEN_PST = (
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -10,  5,  5,  5,  5,  5,  0,-10,
      0,  0,  5,  5,  5,  5,  0, -5,
     -5,  0,  5,  5,  5,  5,  0, -5,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
)
PST = {PAWN: PAWN_PST, KNIGHT: KNIGHT_PST, BISHOP: BISHOP_PST, ROOK: ROOK_PST, QUEEN: QUEEN_PST}


def material_balance(state: State, perspective: int = WHITE) -> int:
    """Return signed non-king material balance in centipawn-like units."""

    total = 0
    for piece in state.board:
        if piece:
            total += piece_color(piece) * PIECE_VALUE[abs(piece)]
    return total * perspective


def static_eval(state: State, rules: RuleSet, perspective: int = WHITE, mobility: bool = False) -> float:
    """Heuristic evaluation; positive means advantage for `perspective`."""

    score = 0.0
    bishops = {WHITE: 0, BLACK: 0}
    for s, p in enumerate(state.board):
        if not p:
            continue
        color = piece_color(p)
        pt = piece_type(p)
        score += color * PIECE_VALUE[abs(p)]
        if pt in PST:
            idx = s if color == WHITE else sq(file_of(s), 7 - rank_of(s))
            score += color * PST[pt][idx]
        if pt == BISHOP:
            bishops[color] += 1
    if bishops[WHITE] >= 2:
        score += 25
    if bishops[BLACK] >= 2:
        score -= 25

    # King safety: check is severe; available adjacent extant squares mildly helpful.
    for color in (WHITE, BLACK):
        k = find_king(state, color)
        if k < 0:
            score += -100000 * color
            continue
        if is_attacked(state, k, -color):
            score -= color * 70
        kf, kr = file_of(k), rank_of(k)
        safe = 0
        for df, dr in KING_DELTAS:
            nf, nr = kf + df, kr + dr
            if 0 <= nf < 8 and 0 <= nr < 8:
                d = sq(nf, nr)
                if state.present(d) and state.board[d] * color <= 0 and not is_attacked(state, d, -color):
                    safe += 1
        score += color * safe * 3

    # Reward attacks on enemy pieces and central extant presence a little.
    for color in (WHITE, BLACK):
        enemy_king = find_king(state, -color)
        if enemy_king >= 0 and is_attacked(state, enemy_king, color):
            score += color * 45

    if mobility:
        # Expensive; only use at leaves of shallow searches if requested.
        original_side = state.side
        own_state = state if original_side == perspective else replace(state, side=perspective)
        opp_state = state if original_side == -perspective else replace(state, side=-perspective)
        score += perspective * 1.5 * (len(legal_actions(own_state, rules)) - len(legal_actions(opp_state, rules)))

    return score * perspective


def action_order_score(state: State, action: Action, rules: RuleSet) -> float:
    """Cheap ordering score for alpha-beta and greedy selection."""

    if isinstance(action, Slide):
        nxt = apply_slide(state, action, rules)
        moved_count = sum(1 for s in macro_squares(action.dst_macro) if nxt.board[s] != 0)
        score = 5 + 10 * moved_count
        if in_check(nxt, nxt.side):
            score += 80
        if action.promotion:
            score += PIECE_VALUE[action.promotion] - 100
        return score
    target = state.board[action.dst]
    score = 0.0
    if target:
        score += 10 * PIECE_VALUE[abs(target)] - PIECE_VALUE[abs(state.board[action.src])]
    if action.is_ep:
        score += 1000
    if action.promotion:
        score += 8 * PIECE_VALUE[action.promotion]
    if action.castle:
        score += 100
    nxt = apply_move(state, action)
    if in_check(nxt, nxt.side):
        score += 80
    return score


MATE_SCORE = 100000.0


def negamax(
    state: State,
    rules: RuleSet,
    depth: int,
    alpha: float,
    beta: float,
    repetition_counts: dict[tuple, int],
    *,
    allow_slides: bool = True,
    slide_bias: float = 0.0,
) -> float:
    status = terminal_status(state, rules, repetition_counts)
    if status:
        if status.endswith("win"):
            winner = WHITE if status == "white_win" else BLACK
            return (MATE_SCORE + depth) if winner == state.side else -(MATE_SCORE + depth)
        return 0.0
    if depth <= 0:
        return static_eval(state, rules, perspective=state.side)

    actions = legal_actions(state, rules, include_slides=allow_slides)
    actions.sort(key=lambda a: action_order_score(state, a, rules), reverse=True)
    best = -math.inf
    for action in actions:
        nxt = apply_action(state, action, rules)
        key = nxt.key()
        if rules.immediate_reverse_forbidden:
            key = key + (nxt.last_slide_src, nxt.last_slide_dst)
        repetition_counts[key] = repetition_counts.get(key, 0) + 1
        value = -negamax(
            nxt, rules, depth - 1, -beta, -alpha, repetition_counts,
            allow_slides=allow_slides, slide_bias=slide_bias,
        )
        repetition_counts[key] -= 1
        if repetition_counts[key] == 0:
            del repetition_counts[key]
        if isinstance(action, Slide):
            value += slide_bias
        if value > best:
            best = value
        if value > alpha:
            alpha = value
        if alpha >= beta:
            break
    return best


@dataclass(slots=True)
class Agent:
    """A lightweight search persona for automated rule screening."""

    name: str
    depth: int = 1
    allow_slides: bool = True
    force_slide_when_available: bool = False
    slide_bias: float = 0.0
    randomness: float = 0.0
    capture_bias: float = 0.0
    repetition_penalty: float = 30.0

    def choose(
        self,
        state: State,
        rules: RuleSet,
        repetition_counts: dict[tuple, int],
        rng: random.Random,
        precomputed_actions: Optional[Sequence[Action]] = None,
    ) -> Action:
        if precomputed_actions is None:
            actions = legal_actions(state, rules, include_slides=self.allow_slides)
        elif self.allow_slides:
            actions = list(precomputed_actions)
        else:
            actions = [a for a in precomputed_actions if isinstance(a, Move)]
        if self.force_slide_when_available:
            slides = [a for a in actions if isinstance(a, Slide)]
            if slides:
                actions = slides
        if not actions:
            raise RuntimeError("No legal action")
        if self.depth <= 0:
            return rng.choice(actions)

        scored: list[tuple[float, Action]] = []
        ordered = sorted(actions, key=lambda a: action_order_score(state, a, rules), reverse=True)
        for action in ordered:
            nxt = apply_action(state, action, rules)
            key = nxt.key()
            if rules.immediate_reverse_forbidden:
                key = key + (nxt.last_slide_src, nxt.last_slide_dst)
            repetition_counts[key] = repetition_counts.get(key, 0) + 1
            if self.depth == 1:
                value = static_eval(nxt, rules, perspective=state.side)
                # Checkmate is worth detecting; most candidate states are not checks, so
                # avoid generating an entire reply list unless the enemy king is attacked.
                if in_check(nxt, nxt.side) and not legal_actions(nxt, rules):
                    value = MATE_SCORE
            else:
                value = -negamax(
                    nxt,
                    rules,
                    self.depth - 1,
                    -math.inf,
                    math.inf,
                    repetition_counts,
                    allow_slides=self.allow_slides,
                    slide_bias=self.slide_bias,
                )
            repetition_counts[key] -= 1
            if isinstance(action, Slide):
                value += self.slide_bias
            elif self.capture_bias and (state.board[action.dst] or action.is_ep):
                value += self.capture_bias
            # Weak agents otherwise get trapped in meaningless reversible shuffles.
            # Humans also tend to avoid repeating a position unless it serves a purpose.
            if self.repetition_penalty:
                prior_occurrences = max(0, repetition_counts.get(key, 0) - 1)
                value -= self.repetition_penalty * prior_occurrences
            if self.randomness:
                value += rng.gauss(0.0, self.randomness)
            scored.append((value, action))
        best_val = max(v for v, _ in scored)
        # Tie/random-window choice creates opening variety without swamping evaluation.
        window = max(0.01, self.randomness * 0.35)
        best = [a for v, a in scored if v >= best_val - window]
        return rng.choice(best)


@dataclass(slots=True)
class GameRecord:
    """Compact trace summary for one automated game."""

    result: str
    plies: int
    slides: int
    empty_slides: int
    loaded_slides: int
    carried_pieces: int
    max_slide_load: int
    white_slides: int
    black_slides: int
    captures: int
    promotions: int
    slide_promotions: int
    checks: int
    first_slide_ply: int
    first_actions: tuple[str, ...]
    max_branching: int
    avg_branching: float
    terminal_halfmove: int
    distinct_hole_pairs: int
    distinct_positions: int
    max_position_repetitions: int
    terminal_material_white: int
    terminal_eval_white: float


def _make_game_record(
    *,
    result: str,
    plies: int,
    slides: int,
    empty_slides: int,
    loaded_slides: int,
    carried_pieces: int,
    max_slide_load: int,
    white_slides: int,
    black_slides: int,
    captures: int,
    promotions: int,
    slide_promotions: int,
    checks: int,
    first_slide_ply: int,
    first_actions: Sequence[str],
    max_branching: int,
    branch_sum: int,
    terminal_halfmove: int,
    seen_holes: set[int],
    repetition_counts: dict[tuple, int],
    terminal_state: State,
    rules: RuleSet,
) -> GameRecord:
    """Build a record while keeping every game termination path consistent."""

    return GameRecord(
        result=result,
        plies=plies,
        slides=slides,
        empty_slides=empty_slides,
        loaded_slides=loaded_slides,
        carried_pieces=carried_pieces,
        max_slide_load=max_slide_load,
        white_slides=white_slides,
        black_slides=black_slides,
        captures=captures,
        promotions=promotions,
        slide_promotions=slide_promotions,
        checks=checks,
        first_slide_ply=first_slide_ply,
        first_actions=tuple(first_actions),
        max_branching=max_branching,
        avg_branching=branch_sum / max(1, plies),
        terminal_halfmove=terminal_halfmove,
        distinct_hole_pairs=len(seen_holes),
        distinct_positions=sum(1 for count in repetition_counts.values() if count > 0),
        max_position_repetitions=max((count for count in repetition_counts.values() if count > 0), default=1),
        terminal_material_white=material_balance(terminal_state, WHITE),
        terminal_eval_white=static_eval(terminal_state, rules, perspective=WHITE),
    )


def play_game(
    rules: RuleSet,
    hole_macros: Sequence[int],
    white: Agent,
    black: Agent,
    *,
    seed: int,
    max_plies: int = 240,
    opening_capture: int = 12,
) -> GameRecord:
    """Play one deterministic-seed game between lightweight screening agents."""

    rng = random.Random(seed)
    state = initial_state(hole_macros)
    key0 = state.key()
    if rules.immediate_reverse_forbidden:
        key0 = key0 + (state.last_slide_src, state.last_slide_dst)
    reps = {key0: 1}
    seen_holes = {state.holes}
    slides = empty_slides = loaded_slides = carried_pieces = max_slide_load = 0
    white_slides = black_slides = captures = promotions = slide_promotions = checks = 0
    first_slide_ply = -1
    first_actions: list[str] = []
    branch_sum = 0
    max_branch = 0

    def finish(result: str, plies: int) -> GameRecord:
        return _make_game_record(
            result=result,
            plies=plies,
            slides=slides,
            empty_slides=empty_slides,
            loaded_slides=loaded_slides,
            carried_pieces=carried_pieces,
            max_slide_load=max_slide_load,
            white_slides=white_slides,
            black_slides=black_slides,
            captures=captures,
            promotions=promotions,
            slide_promotions=slide_promotions,
            checks=checks,
            first_slide_ply=first_slide_ply,
            first_actions=first_actions,
            max_branching=max_branch,
            branch_sum=branch_sum,
            terminal_halfmove=state.halfmove,
            seen_holes=seen_holes,
            repetition_counts=reps,
            terminal_state=state,
            rules=rules,
        )

    for ply in range(max_plies):
        actions = legal_actions(state, rules)
        if not actions:
            result = (
                ("black_win" if state.side == WHITE else "white_win")
                if in_check(state, state.side)
                else "draw_stalemate"
            )
            return finish(result, ply)
        if is_bare_kings(state):
            return finish("draw_dead", ply)
        key = state.key()
        if rules.immediate_reverse_forbidden:
            key = key + (state.last_slide_src, state.last_slide_dst)
        if reps.get(key, 0) >= 3:
            return finish("draw_repetition", ply)
        if state.halfmove >= 100:
            return finish("draw_50move", ply)

        branch_sum += len(actions)
        max_branch = max(max_branch, len(actions))
        agent = white if state.side == WHITE else black
        action = agent.choose(state, rules, reps, rng, actions)
        if len(first_actions) < opening_capture:
            first_actions.append(action.label())

        if isinstance(action, Slide):
            slides += 1
            occupied = sum(1 for s in macro_squares(action.src_macro) if state.board[s])
            carried_pieces += occupied
            max_slide_load = max(max_slide_load, occupied)
            if occupied:
                loaded_slides += 1
            else:
                empty_slides += 1
            if first_slide_ply < 0:
                first_slide_ply = ply
            if state.side == WHITE:
                white_slides += 1
            else:
                black_slides += 1
            if action.promotion:
                promotions += 1
                slide_promotions += 1
        else:
            if state.board[action.dst] or action.is_ep:
                captures += 1
            if action.promotion:
                promotions += 1

        state = apply_action(state, action, rules)
        seen_holes.add(state.holes)
        if in_check(state, state.side):
            checks += 1
        key = state.key()
        if rules.immediate_reverse_forbidden:
            key = key + (state.last_slide_src, state.last_slide_dst)
        reps[key] = reps.get(key, 0) + 1

    return finish("draw_maxplies", max_plies)


def run_matchup(
    rules: RuleSet,
    layouts: Sequence[Sequence[int]],
    white: Agent,
    black: Agent,
    games: int,
    *,
    seed: int = 1,
    max_plies: int = 240,
) -> list[GameRecord]:
    records = []
    for i in range(games):
        layout = layouts[i % len(layouts)]
        records.append(play_game(rules, layout, white, black, seed=seed + i * 7919, max_plies=max_plies))
    return records


def summarize(records: Sequence[GameRecord]) -> dict[str, float]:
    """Aggregate screening metrics across a set of game records."""

    n = len(records)
    if n == 0:
        raise ValueError("Cannot summarize an empty record set")
    outcomes: dict[str, int] = {}
    for record in records:
        outcomes[record.result] = outcomes.get(record.result, 0) + 1
    white_wins = outcomes.get("white_win", 0)
    black_wins = outcomes.get("black_win", 0)
    draws = n - white_wins - black_wins
    total_plies = sum(record.plies for record in records)
    games_with_slide = [record for record in records if record.first_slide_ply >= 0]
    return {
        "games": n,
        "white_win_pct": 100 * white_wins / n,
        "black_win_pct": 100 * black_wins / n,
        "draw_pct": 100 * draws / n,
        "avg_plies": sum(record.plies for record in records) / n,
        "median_plies": sorted(record.plies for record in records)[n // 2],
        "avg_slides": sum(record.slides for record in records) / n,
        "slide_action_pct": 100 * sum(record.slides for record in records) / max(1, total_plies),
        "loaded_share_of_slides_pct": 100 * sum(record.loaded_slides for record in records) / max(1, sum(record.slides for record in records)),
        "avg_pieces_carried_per_slide": sum(record.carried_pieces for record in records) / max(1, sum(record.slides for record in records)),
        "avg_pieces_carried_per_loaded_slide": sum(record.carried_pieces for record in records) / max(1, sum(record.loaded_slides for record in records)),
        "max_observed_slide_load": max(record.max_slide_load for record in records),
        "avg_captures": sum(record.captures for record in records) / n,
        "avg_checks": sum(record.checks for record in records) / n,
        "promotion_game_pct": 100 * sum(1 for record in records if record.promotions) / n,
        "slide_promotion_game_pct": 100 * sum(1 for record in records if record.slide_promotions) / n,
        "games_with_slide_pct": 100 * len(games_with_slide) / n,
        "avg_first_slide_ply": (
            sum(record.first_slide_ply for record in games_with_slide) / len(games_with_slide)
            if games_with_slide else math.nan
        ),
        "avg_branching": sum(record.avg_branching for record in records) / n,
        "max_branching": max(record.max_branching for record in records),
        "avg_distinct_hole_pairs": sum(record.distinct_hole_pairs for record in records) / n,
        "avg_distinct_positions": sum(record.distinct_positions for record in records) / n,
        "avg_terminal_material_white": sum(record.terminal_material_white for record in records) / n,
        "avg_terminal_eval_white": sum(record.terminal_eval_white for record in records) / n,
        "white_ahead_material_pct": 100 * sum(record.terminal_material_white > 0 for record in records) / n,
        "black_ahead_material_pct": 100 * sum(record.terminal_material_white < 0 for record in records) / n,
        **{f"result_{key}": value for key, value in outcomes.items()},
    }


# Common layouts. Macro rows 2 and 3 are empty in the standard setup.
A2, B2, C2, D2 = 4, 5, 6, 7
A3, B3, C3, D3 = 8, 9, 10, 11
LAYOUTS = {
    "vertical_center_pair": ((B2, B3), (C2, C3)),
    "central_diagonals": ((B2, C3), (C2, B3)),
    "edge_diagonals": ((A2, D3), (D2, A3)),
    "same_flank": ((A2, A3), (D2, D3)),
    "one_gap_center": ((B2,), (C2,), (B3,), (C3,)),
}

RULESETS = {
    "unrestricted": RuleSet("unrestricted", slide_mode="unrestricted", max_friendly_load=None, allow_empty_slide=True, king_tiles_anchor=False, transported_pieces_count_as_moved=False),
    "any_friendly": RuleSet("any_friendly", slide_mode="exclusive", max_friendly_load=None, allow_empty_slide=True),
    "exclusive_2": RuleSet("exclusive_2", slide_mode="exclusive", max_friendly_load=2, allow_empty_slide=True),
    "exclusive_1": RuleSet("exclusive_1", slide_mode="exclusive", max_friendly_load=1, allow_empty_slide=True),
    "exclusive_1_noempty": RuleSet("exclusive_1_noempty", slide_mode="exclusive", max_friendly_load=1, allow_empty_slide=False),
    "majority_count": RuleSet("majority_count", slide_mode="majority_count", max_friendly_load=None, allow_empty_slide=True),
}


if __name__ == "__main__":
    # Known standard-chess perft smoke test.
    s = initial_state(())
    print("initial legal", len(legal_piece_moves(s)))
    for d in range(1, 4):
        t0 = time.time()
        count = perft(s, d)
        print("perft", d, count, f"{time.time()-t0:.3f}s")
