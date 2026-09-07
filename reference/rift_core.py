"""Rift Chess 1.0: checked, headless reference API over the supplied move generator.

No renderer, network access or third-party runtime packages are required. Board
arrays have shape [64], a1=0 and h8=63. The stable action space has shape [21760].
The inherited generator is a research dependency, not an independently certified
chess implementation. Only actions returned by this module may be committed.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass, replace
import hashlib
import json
import math
import random
import time
from typing import Any, Literal
import uuid

import sliding_chess_sim as sim

RULES_VERSION = "rift-chess/1.0"
RECORD_VERSION = "rift-record/1"
ACTION_ENCODING = "rift-action/1"
ACTION_SPACE_SIZE = 21760
DRAW_POLICIES = ("prompt", "auto100", "off")
PROMOTIONS = (0, sim.QUEEN, sim.ROOK, sim.BISHOP, sim.KNIGHT)
RULES = sim.RuleSet("rift-chess-1.0", slide_mode="exclusive", max_friendly_load=1,
                    allow_empty_slide=True, king_tiles_anchor=True,
                    transported_pieces_count_as_moved=True, slide_promotion=True,
                    slide_resets_halfmove_if_pawn=False)
DrawPolicy = Literal["prompt", "auto100", "off"]


def validate_state(state: sim.State) -> None:
    """Validate a playable final-rules position; board shape is [64].

    Reachability from the standard opening is not proved. In particular, imported
    castling rights assert the identity/history of the original home rooks. A pawn
    may legally be carried backwards onto its OWN back rank, but must promote on
    the opponent's back rank. Exactly two entire 2x2 tiles must be absent.
    """
    if len(state.board) != 64 or any(type(p) is not int or abs(p) > 7 for p in state.board):
        raise ValueError("board must contain 64 integer piece codes in [-7, 7]")
    if type(state.holes) is not int or not 0 <= state.holes < 65536 or state.holes.bit_count() != 2:
        raise ValueError("holes must be a 16-bit mask with exactly two set bits")
    if type(state.side) is not int or state.side not in (1, -1):
        raise ValueError("side must be +1 or -1")
    if type(state.castling) is not int or not 0 <= state.castling <= 15:
        raise ValueError("castling must be a four-bit mask")
    if type(state.halfmove) is not int or not 0 <= state.halfmove <= 10**9:
        raise ValueError("progress counter must be a nonnegative bounded integer")
    if type(state.fullmove) is not int or not 1 <= state.fullmove <= 10**9:
        raise ValueError("fullmove must be a positive bounded integer")
    for side in (1, -1):
        if state.board.count(side * sim.KING) != 1:
            raise ValueError("exactly one king of each colour is required")
    for square, piece in enumerate(state.board):
        if piece and not state.present(square):
            raise ValueError("a piece occupies an absent square")
        if sim.piece_type(piece) == sim.PAWN:
            if sim.rank_of(square) == (7 if piece > 0 else 0):
                raise ValueError("a pawn on its promotion rank must already be promoted")
            if abs(piece) == sim.VIRGIN_PAWN and sim.rank_of(square) != (1 if piece > 0 else 6):
                raise ValueError("an unmoved pawn must remain on its starting rank")
    for bit, king, rook, side in ((1, 4, 7, 1), (2, 4, 0, 1),
                                  (4, 60, 63, -1), (8, 60, 56, -1)):
        if state.castling & bit and (state.board[king] != side*sim.KING or state.board[rook] != side*sim.ROOK):
            raise ValueError("castling rights require the king and original rook on home squares")
    if type(state.ep_target) is not int or type(state.ep_pawn) is not int:
        raise ValueError("en-passant fields must be integers")
    if (state.ep_target == -1) != (state.ep_pawn == -1):
        raise ValueError("both en-passant fields must be present or both absent")
    if state.ep_target != -1:
        target, pawn = state.ep_target, state.ep_pawn
        target_rank = 5 if state.side == 1 else 2
        pawn_rank = 4 if state.side == 1 else 3
        source_rank = 6 if state.side == 1 else 1
        if not (0 <= target < 64 and 0 <= pawn < 64):
            raise ValueError("en-passant coordinates are out of range")
        if (sim.rank_of(target) != target_rank or sim.rank_of(pawn) != pawn_rank
                or sim.file_of(target) != sim.file_of(pawn)):
            raise ValueError("en-passant geometry is inconsistent with the side to move")
        source = sim.sq(sim.file_of(pawn), source_rank)
        if (not state.present(target) or not state.present(source) or state.board[target]
                or state.board[source] or state.board[pawn] != -state.side*sim.PAWN
                or state.halfmove != 0):
            raise ValueError("en-passant metadata does not follow an ordinary double pawn move")
    if sim.in_check(state, -state.side):
        raise ValueError("the previous mover's king is in check (or kings are adjacent)")


def action_id(action: sim.Action) -> int:
    """Encode a legal action as an integer in [0, 21760); no tensor allocation."""
    promotion = PROMOTIONS.index(action.promotion)
    if isinstance(action, sim.Move):
        return 5 * (64 * action.src + action.dst) + promotion
    return 20480 + 5 * (16 * action.src_macro + action.dst_macro) + promotion


def action_data(action: sim.Action) -> dict[str, Any]:
    """Return stable JSON action metadata; special flags are derived, never trusted."""
    promotion = {0: None, sim.QUEEN: "Q", sim.ROOK: "R", sim.BISHOP: "B", sim.KNIGHT: "N"}[action.promotion]
    if isinstance(action, sim.Move):
        return {"id": action_id(action), "type": "move", "from": sim.square_name(action.src),
                "to": sim.square_name(action.dst), "promotion": promotion,
                "en_passant": action.is_ep, "castle": action.castle}
    return {"id": action_id(action), "type": "shift", "from": sim.macro_name(action.src_macro),
            "to": sim.macro_name(action.dst_macro), "promotion": promotion}


def repetition_key(state: sim.State, actions: list[sim.Action] | None = None) -> tuple:
    """Canonical position identity, ignoring en passant when no LEGAL capture exists.

    This is not a search-state key: progress count, draw policy and the complete
    repetition ledger also affect adjudication. Cosmetic tile identities do not.
    """
    ep = (-1, -1)
    if state.ep_target >= 0:
        if actions is None:
            actions = sim.legal_actions(state, RULES)
        if any(isinstance(action, sim.Move) and action.is_ep for action in actions):
            ep = (state.ep_target, state.ep_pawn)
    return (RULES_VERSION, state.board, state.holes, state.side, state.castling, *ep)


def position_hash(state: sim.State) -> str:
    """Return a stable SHA-256 of repetition identity, not of the full match state."""
    raw = json.dumps(repetition_key(state), separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(raw.encode("ascii")).hexdigest()


def position_data(state: sim.State) -> dict[str, Any]:
    """Serialize a position; board is a flat array [64] of signed piece codes."""
    return {"board": list(state.board), "holes": state.holes, "side": state.side,
            "castling": state.castling, "ep_target": state.ep_target, "ep_pawn": state.ep_pawn,
            "halfmove": state.halfmove, "fullmove": state.fullmove}


def state_from_data(data: dict[str, Any]) -> sim.State:
    """Load and validate position JSON without executing or importing any content."""
    required = {"board", "holes", "side", "castling", "ep_target", "ep_pawn", "halfmove", "fullmove"}
    if not isinstance(data, dict) or set(data) != required or not isinstance(data["board"], list):
        raise ValueError("invalid position schema")
    state = sim.State(board=tuple(data["board"]), **{key: value for key, value in data.items() if key != "board"})
    validate_state(state)
    return state


@dataclass(frozen=True)
class Outcome:
    """Terminal result with an explicit reason and winner (+1, -1, or 0 for draw)."""
    result: str
    reason: str
    winner: int


def board_outcome(state: sim.State, repetitions: Counter, draw_policy: DrawPolicy,
                  actions: list[sim.Action] | None = None) -> Outcome | None:
    """Adjudicate mate before draws; search budget exhaustion is NEVER a draw."""
    if actions is None:
        actions = sim.legal_actions(state, RULES)
    if not actions:
        if sim.in_check(state, state.side):
            return Outcome("white_win" if state.side == -1 else "black_win", "checkmate", -state.side)
        return Outcome("draw", "stalemate", 0)
    if sim.is_bare_kings(state):
        return Outcome("draw", "bare_kings", 0)
    if repetitions[repetition_key(state, actions)] >= 3:
        return Outcome("draw", "threefold", 0)
    if draw_policy == "auto100" and state.halfmove >= 100:
        return Outcome("draw", "progress100", 0)
    return None


class Game:
    """Local match controller with checked actions, replay, offers and undo.

    This reference intentionally separates board actions from offer/accept/resign
    controls. It has no GUI timing, networking, model downloads or telemetry.
    """
    def __init__(self, layout: str = "B", draw_policy: DrawPolicy = "prompt",
                 state: sim.State | None = None) -> None:
        """Create a B/C-rift game or an explicit validated puzzle position."""
        if layout not in ("B", "C") or draw_policy not in DRAW_POLICIES:
            raise ValueError("layout must be B/C and draw_policy must be prompt/auto100/off")
        self.state = state if state is not None else sim.initial_state((5, 9) if layout == "B" else (6, 10))
        validate_state(self.state)
        self.draw_policy = draw_policy
        self.initial = self.state
        self.states = [self.state]
        self.actions: list[int] = []
        self.repetitions: Counter = Counter({repetition_key(self.state): 1})
        self.draw_offer: int | None = None
        self.override: Outcome | None = None
        self.revision = 0
        self.game_id = uuid.uuid4().hex
        self._cached_state: sim.State | None = None
        self._cached_actions: list[sim.Action] = []

    def _legal(self) -> list[sim.Action]:
        """Cache geometric legal actions; terminal sessions suppress them publicly."""
        if self._cached_state != self.state:
            self._cached_actions = sim.legal_actions(self.state, RULES)
            self._cached_state = self.state
        return self._cached_actions

    def outcome(self) -> Outcome | None:
        """Return the current terminal outcome, or None while play may continue."""
        return self.override or board_outcome(self.state, self.repetitions, self.draw_policy, self._legal())

    def legal_actions(self) -> list[sim.Action]:
        """Return legal actions only while the match is ongoing."""
        return [] if self.outcome() else list(self._legal())

    def observe(self) -> dict[str, Any]:
        """Return JSON state and status; no rendered image or opaque UI state is required."""
        outcome = self.outcome()
        return {"rules_version": RULES_VERSION, "action_encoding": ACTION_ENCODING,
                "game_id": self.game_id, "revision": self.revision,
                "position": position_data(self.state), "position_hash": position_hash(self.state),
                "outcome": asdict(outcome) if outcome else None,
                "in_check": sim.in_check(self.state, self.state.side),
                "draw_policy": self.draw_policy, "draw_offer": self.draw_offer,
                "draw_prompt_available": self.draw_policy == "prompt" and self.state.halfmove >= 100 and outcome is None,
                "repetition_count": self.repetitions[repetition_key(self.state)],
                "legal_action_count": 0 if outcome else len(self._legal())}

    def _guard(self, expected_revision: int | None = None) -> None:
        """Reject stale or terminal commands before mutating any state."""
        if expected_revision is not None and (type(expected_revision) is not int or expected_revision != self.revision):
            raise ValueError("stale revision")
        if self.outcome():
            raise ValueError("the game is already over")

    def step(self, identifier: int, expected_revision: int | None = None) -> dict[str, Any]:
        """Commit exactly one generated action; invalid requests leave the game unchanged."""
        self._guard(expected_revision)
        if type(identifier) is not int:
            raise ValueError("action_id must be an integer")
        lookup = {action_id(action): action for action in self._legal()}
        if identifier not in lookup:
            raise ValueError("illegal action_id for this position")
        action = lookup[identifier]
        next_state = sim.apply_action(self.state, action, RULES)
        validate_state(next_state)
        self.state = next_state
        self.states.append(next_state)
        self.actions.append(identifier)
        self.repetitions[repetition_key(next_state)] += 1
        self.draw_offer = None
        self.revision += 1
        result = self.observe()
        result["last_action"] = action_data(action)
        return result

    def undo(self) -> dict[str, Any]:
        """Undo one BOARD action in analysis mode, clearing offers and resignation/agreement.

        A shipping competitive UI should require mutual consent, or disable undo.
        Reference tools intentionally allow it for experimentation and fixture work.
        """
        if not self.actions:
            raise ValueError("no board action to undo")
        self.repetitions[repetition_key(self.state)] -= 1
        self.states.pop()
        self.actions.pop()
        self.state = self.states[-1]
        self.draw_offer = None
        self.override = None
        self.revision += 1
        return self.observe()

    def offer_draw(self, actor: int) -> dict[str, Any]:
        """Offer agreement at any ongoing position without spending a board action."""
        self._guard()
        if type(actor) is not int or actor not in (1, -1):
            raise ValueError("actor must be +1 or -1")
        if self.draw_offer is not None:
            raise ValueError("a draw offer is already pending")
        self.draw_offer = actor
        self.revision += 1
        return self.observe()

    def accept_draw(self, actor: int) -> dict[str, Any]:
        """Accept only the other player's outstanding offer; this is not a unilateral claim."""
        self._guard()
        if type(actor) is not int or actor not in (1, -1) or self.draw_offer != -actor:
            raise ValueError("only the other player may accept a pending offer")
        self.override = Outcome("draw", "agreement", 0)
        self.draw_offer = None
        self.revision += 1
        return self.observe()

    def decline_draw(self, actor: int) -> dict[str, Any]:
        """Decline only the opponent's outstanding offer without spending a turn."""
        self._guard()
        if type(actor) is not int or actor not in (1, -1) or self.draw_offer != -actor:
            raise ValueError("no opponent offer is available to decline")
        self.draw_offer = None
        self.revision += 1
        return self.observe()

    def resign(self, actor: int) -> dict[str, Any]:
        """End the game by explicit resignation, independent of whose turn it is."""
        self._guard()
        if type(actor) is not int or actor not in (1, -1):
            raise ValueError("actor must be +1 or -1")
        self.override = Outcome("black_win" if actor == 1 else "white_win", "resignation", -actor)
        self.draw_offer = None
        self.revision += 1
        return self.observe()

    def export_record(self) -> dict[str, Any]:
        """Export initial position + complete action history, preserving repetition rights."""
        return {"schema": RECORD_VERSION, "rules_version": RULES_VERSION,
                "action_encoding": ACTION_ENCODING, "draw_policy": self.draw_policy,
                "initial": position_data(self.initial), "actions": list(self.actions),
                "draw_offer": self.draw_offer, "override": asdict(self.override) if self.override else None,
                "final_position_hash": position_hash(self.state)}

    @classmethod
    def from_record(cls, record: dict[str, Any]) -> Game:
        """Replay a versioned record, reject corrupt actions, and rebuild its full ledger."""
        required = {"schema", "rules_version", "action_encoding", "draw_policy", "initial",
                    "actions", "draw_offer", "override", "final_position_hash"}
        if not isinstance(record, dict) or set(record) != required:
            raise ValueError("invalid record schema")
        if (record["schema"] != RECORD_VERSION or record["rules_version"] != RULES_VERSION
                or record["action_encoding"] != ACTION_ENCODING):
            raise ValueError("unsupported record/rules/action version")
        actions = record["actions"]
        if not isinstance(actions, list) or len(actions) > 20000:
            raise ValueError("invalid or oversized action history")
        game = cls(draw_policy=record["draw_policy"], state=state_from_data(record["initial"]))
        for identifier in actions:
            game.step(identifier)
        if record["final_position_hash"] != position_hash(game.state):
            raise ValueError("record hash mismatch")
        override = record["override"]
        if override is not None:
            if not isinstance(override, dict) or set(override) != {"result", "reason", "winner"}:
                raise ValueError("invalid terminal override")
            allowed = (Outcome("draw", "agreement", 0), Outcome("white_win", "resignation", 1),
                       Outcome("black_win", "resignation", -1))
            outcome = Outcome(**override)
            if type(outcome.winner) is not int or outcome not in allowed or game.outcome():
                raise ValueError("invalid terminal override for position")
            game.override = outcome
        offer = record["draw_offer"]
        if offer is not None:
            if type(offer) is not int or offer not in (1, -1) or game.outcome():
                raise ValueError("invalid pending draw offer")
            game.draw_offer = offer
        return game


class _SearchBudget(Exception):
    """Internal cancellation signal; not a chess outcome or a playable action."""


def suggest(game: Game, *, depth: int = 2, max_nodes: int = 10000, seed: int = 0) -> dict[str, Any]:
    """Choose an offline heuristic move using full-width iterative-deepening alpha-beta.

    No neural model is used. Search values use inherited material/PST guidance,
    not trained Rift piece values. Node-budget exhaustion returns the last fully
    completed iteration (or a legal fallback). This baseline is a beginner bot,
    not evidence of human-level strength. State shape: board [64].
    """
    if type(depth) is not int or not 1 <= depth <= 3 or type(max_nodes) is not int or not 1 <= max_nodes <= 1000000:
        raise ValueError("depth must be 1..3 and max_nodes 1..1000000")
    roots = game.legal_actions()
    if not roots:
        raise ValueError("no action is available in a terminal game")
    started = time.perf_counter()
    nodes = 0
    repetitions = game.repetitions.copy()
    rng = random.Random(seed)
    rng.shuffle(roots)
    roots.sort(key=lambda action: sim.action_order_score(game.state, action, RULES), reverse=True)
    chosen = roots[0]
    value: float | None = None
    completed_depth = 0

    def search(state: sim.State, remaining: int, alpha: float, beta: float, ply: int) -> float:
        """Evaluate a node from its mover's perspective with history-correct draws."""
        nonlocal nodes
        if nodes >= max_nodes:
            raise _SearchBudget
        nodes += 1
        actions = sim.legal_actions(state, RULES)
        outcome = board_outcome(state, repetitions, game.draw_policy, actions)
        if outcome:
            return 0.0 if outcome.winner == 0 else (100000-ply)*outcome.winner*state.side
        if remaining == 0:
            return sim.static_eval(state, RULES, perspective=state.side)
        actions.sort(key=lambda action: sim.action_order_score(state, action, RULES), reverse=True)
        best = -math.inf
        for action in actions:
            nxt = sim.apply_action(state, action, RULES)
            key = repetition_key(nxt)
            repetitions[key] += 1
            try:
                score = -search(nxt, remaining-1, -beta, -alpha, ply+1)
            finally:
                repetitions[key] -= 1
            best = max(best, score)
            alpha = max(alpha, score)
            if alpha >= beta:
                break
        return best

    for iteration in range(1, depth+1):
        iteration_best, iteration_action, alpha = -math.inf, roots[0], -math.inf
        try:
            for action in roots:
                nxt = sim.apply_action(game.state, action, RULES)
                key = repetition_key(nxt)
                repetitions[key] += 1
                try:
                    score = -search(nxt, iteration-1, -math.inf, -alpha, 1)
                finally:
                    repetitions[key] -= 1
                if score > iteration_best:
                    iteration_best, iteration_action = score, action
                alpha = max(alpha, score)
        except _SearchBudget:
            break
        chosen, value, completed_depth = iteration_action, iteration_best, iteration
        roots.remove(chosen)
        roots.insert(0, chosen)
    return {"game_id": game.game_id, "revision": game.revision,
            "position_hash": position_hash(game.state), "action": action_data(chosen),
            "completed_depth": completed_depth, "nodes": nodes, "score": value,
            "elapsed_ms": round((time.perf_counter()-started)*1000, 3),
            "budget_exhausted": completed_depth < depth}
