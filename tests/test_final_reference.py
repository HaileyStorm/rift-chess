"""Final-rules API regressions and metamorphic tests; board arrays have shape [64]."""
from __future__ import annotations
from collections import Counter
from dataclasses import replace
import json
import random
import subprocess
import sys
from pathlib import Path

import pytest
import sliding_chess_sim as sim
from rift_core import (Game, RULES, ACTION_SPACE_SIZE, action_data, action_id,
                       position_data, position_hash, repetition_key, validate_state,
                       state_from_data, suggest)


def sparse(pieces: dict[str, int], holes=(4, 8), side=1, castling=0, halfmove=0,
           ep_target=-1, ep_pawn=-1) -> sim.State:
    """Build a [64] sparse fixture; callers specify both kings explicitly."""
    board = [0] * 64
    for name, piece in pieces.items():
        board[(int(name[1])-1)*8 + ord(name[0])-97] = piece
    return sim.State(tuple(board), sum(1 << h for h in holes), side, castling,
                     ep_target, ep_pawn, halfmove)


def matching(game: Game, kind: str, src: str, dst: str, promotion=None) -> int:
    """Find exactly one legal coordinate action including its promotion choice."""
    identifiers = [action_id(a) for a in game.legal_actions()
                   if (d := action_data(a))["type"] == kind and d["from"] == src
                   and d["to"] == dst and d["promotion"] == promotion]
    assert len(identifiers) == 1
    return identifiers[0]


def reflect(state: sim.State) -> sim.State:
    """Reflect north/south and exchange colours, retaining pawn and castle semantics."""
    board = tuple(-state.board[i ^ 56] for i in range(64))
    holes = sum(1 << ((3-h//4)*4+h%4) for h in range(16) if state.is_hole_macro(h))
    rights = ((state.castling & 3) << 2) | ((state.castling & 12) >> 2)
    return replace(state, board=board, holes=holes, side=-state.side, castling=rights,
                   ep_target=state.ep_target ^ 56 if state.ep_target >= 0 else -1,
                   ep_pawn=state.ep_pawn ^ 56 if state.ep_pawn >= 0 else -1)


def reflected_action(action: sim.Action) -> sim.Action:
    """Map a generated action through the same colour/reflection transformation."""
    if isinstance(action, sim.Move):
        return replace(action, src=action.src ^ 56, dst=action.dst ^ 56)
    return replace(action, src_macro=(3-action.src_macro//4)*4+action.src_macro%4,
                   dst_macro=(3-action.dst_macro//4)*4+action.dst_macro%4)


@pytest.mark.parametrize("layout", ["B", "C"])
def test_opening_has_19_actions_four_empty_shifts(layout):
    """Both default openings expose four Shifts and fifteen orthodox moves."""
    game = Game(layout)
    assert len(game.legal_actions()) == 19
    assert sum(isinstance(a, sim.Slide) for a in game.legal_actions()) == 4
    validate_state(game.state)


@pytest.mark.parametrize("policy", ["prompt", "auto100", "off"])
def test_threshold_is_policy_not_an_unconditional_draw(policy):
    """A quiet hundredth action only auto-ends an explicitly Auto100 match."""
    state = sparse({"a1": 6, "h8": -6, "g1": 2}, holes=(5, 9), halfmove=99)
    game = Game(state=state, draw_policy=policy)
    game.step(matching(game, "move", "g1", "f3"))
    assert game.state.halfmove == 100
    assert (game.outcome() is not None) == (policy == "auto100")
    assert game.observe()["draw_prompt_available"] == (policy == "prompt")


@pytest.mark.parametrize("policy", ["prompt", "auto100", "off"])
def test_checkmate_precedes_threshold(policy):
    """Qg7# on action 100 wins even in Auto100 mode."""
    game = Game(state=sparse({"f6": 6, "g6": 5, "h8": -6}, halfmove=99), draw_policy=policy)
    game.step(matching(game, "move", "g6", "g7"))
    assert game.outcome().reason == "checkmate"
    assert game.outcome().winner == 1


@pytest.mark.parametrize("policy", ["prompt", "auto100", "off"])
def test_threefold_remains_automatic_in_all_progress_modes(policy):
    """Reversing one empty tile twice reproduces the starting position three times."""
    game = Game(draw_policy=policy)
    for _ in range(2):
        game.step(matching(game, "shift", "A2", "B2"))
        game.step(matching(game, "shift", "B2", "A2"))
    assert game.outcome().reason == "threefold"
    assert game.state.halfmove == 4
    assert game.legal_actions() == []
    with pytest.raises(ValueError):
        game.step(20825)


def test_uncapturable_ep_does_not_change_repetition():
    """An irrelevant raw en-passant target cannot prevent a repetition draw."""
    game = Game("B")
    game.step(matching(game, "move", "e2", "e4"))
    assert game.state.ep_target >= 0
    assert repetition_key(game.state) == repetition_key(replace(game.state, ep_target=-1, ep_pawn=-1))


def test_legal_ep_changes_repetition_and_captures_correct_pawn():
    """A genuinely available EP capture is part of legal position identity."""
    state = sparse({"a1": 6, "h8": -6, "e5": 1, "d5": -1}, holes=(4, 7), ep_target=43, ep_pawn=35)
    game = Game(state=state)
    assert repetition_key(state) != repetition_key(replace(state, ep_target=-1, ep_pawn=-1))
    game.step(matching(game, "move", "e5", "d6"))
    assert game.state.board[43] == 1 and game.state.board[35] == 0
    assert game.state.halfmove == 0


def test_pinned_ep_is_not_effective_for_repetition():
    """An EP capture that exposes the mover's king does not count as an available right."""
    state = sparse({"e1": 6, "h8": -6, "e8": -4, "e5": 1, "d5": -1}, holes=(4, 7), ep_target=43, ep_pawn=35)
    game = Game(state=state)
    assert not any(isinstance(a, sim.Move) and a.is_ep for a in game.legal_actions())
    assert repetition_key(state) == repetition_key(replace(state, ep_target=-1, ep_pawn=-1))


@pytest.mark.parametrize("side", [1, -1])
def test_pawn_can_ride_back_to_own_back_rank(side):
    """Only the OPPOSITE back rank requires promotion after transport."""
    state = sparse({"h1": 6, "h8": -6, "a3": 1}, holes=(0, 10))
    if side == -1:
        state = reflect(state)
    game = Game(state=state)
    src, dst = ("A2", "A1") if side == 1 else ("A3", "A4")
    game.step(matching(game, "shift", src, dst))
    assert game.state.board[0 if side == 1 else 56] == side
    validate_state(game.state)


@pytest.mark.parametrize("promotion", ["Q", "R", "B", "N"])
def test_shift_underpromotions_roundtrip(promotion):
    """All four Shift promotion choices survive ID encoding, replay and undo."""
    game = Game(state=sparse({"a1": 6, "h8": -6, "c6": 1}, holes=(13, 7), halfmove=73))
    before = position_data(game.state)
    game.step(matching(game, "shift", "B3", "B4", promotion))
    assert game.state.halfmove == 0
    loaded = Game.from_record(game.export_record())
    assert position_data(loaded.state) == position_data(game.state)
    game.undo()
    assert position_data(game.state) == before


def test_castling_and_missing_tile_case():
    """Castling uses orthodox coordinates; a hole on the path forbids it."""
    game = Game(state=sparse({"e1": 6, "h1": 4, "a1": 4, "e8": -6}, holes=(5, 9), castling=3))
    game.step(matching(game, "move", "e1", "g1"))
    assert game.state.board[6] == 6 and game.state.board[5] == 4
    assert game.state.castling == 0
    blocked = Game(state=sparse({"e1": 6, "a1": 4, "e8": -6}, holes=(1, 9), castling=2))
    assert not any(isinstance(a, sim.Move) and a.castle for a in blocked.legal_actions())


def test_check_answer_and_check_creation_by_shift():
    """Topology edits may cut or restore a ray, always evaluated in the completed state."""
    defence = Game(state=sparse({"e1": 6, "h8": -6, "e8": -4}, holes=(5, 11)))
    assert sim.in_check(defence.state, 1)
    defence.step(matching(defence, "shift", "C2", "B2"))
    assert not sim.in_check(defence.state, 1)
    attack = Game(state=sparse({"a1": 6, "e8": -6, "e1": 4}, holes=(6, 11)))
    attack.step(matching(attack, "shift", "B2", "C2"))
    assert sim.in_check(attack.state, -1)


def test_offer_is_bilateral_and_does_not_spend_turn():
    """Draw agreements are match controls, not chess actions or unilateral claims."""
    game = Game()
    initial = position_data(game.state)
    game.offer_draw(-1)
    with pytest.raises(ValueError):
        game.accept_draw(-1)
    game.accept_draw(1)
    assert game.outcome().reason == "agreement"
    assert position_data(game.state) == initial
    assert Game.from_record(game.export_record()).outcome().reason == "agreement"


def test_board_action_declines_pending_offer():
    """An outstanding offer is cancelled when the next board action is committed."""
    game = Game()
    game.offer_draw(1)
    game.step(action_id(game.legal_actions()[0]))
    assert game.draw_offer is None


@pytest.mark.parametrize("bad", [-1, ACTION_SPACE_SIZE, True, 0.5, "20825"])
def test_bad_action_does_not_mutate_state(bad):
    """The public API never feeds unvalidated IDs to the inherited raw reducer."""
    game = Game()
    before = game.export_record()
    with pytest.raises(ValueError):
        game.step(bad)
    assert game.export_record() == before


def test_stale_revision_is_rejected():
    """A late local bot response cannot commit against a changed match revision."""
    game = Game()
    identifier = action_id(game.legal_actions()[0])
    game.offer_draw(1)
    with pytest.raises(ValueError, match="stale"):
        game.step(identifier, expected_revision=0)


@pytest.mark.parametrize("mutation", ["piece_in_gap", "one_hole", "extra_king", "enemy_back_pawn", "bad_ep", "bad_castle"])
def test_import_validation_rejects_corruption(mutation):
    """Malformed snapshots are rejected rather than silently repaired."""
    state = Game().state
    data = position_data(state)
    if mutation == "piece_in_gap": data["board"][18] = 2
    if mutation == "one_hole": data["holes"] = 1 << 5
    if mutation == "extra_king": data["board"][16] = 6
    if mutation == "enemy_back_pawn": data["board"][56] = 1
    if mutation == "bad_ep": data["ep_target"] = 20
    if mutation == "bad_castle": data["board"][7] = 0
    with pytest.raises(ValueError):
        state_from_data(data)


def test_colour_reflection_for_256_live_positions():
    """Colour exchange + rank reflection preserves every legal move and Shift."""
    rng = random.Random(90061)
    game = Game()
    for index in range(256):
        state = game.state
        mirrored = reflect(state)
        validate_state(mirrored)
        actions = sim.legal_actions(state, RULES)
        expected = {action_id(reflected_action(a)) for a in actions}
        actual = {action_id(a) for a in sim.legal_actions(mirrored, RULES)}
        assert actual == expected
        if game.outcome():
            game = Game("B" if index % 2 else "C")
        else:
            game.step(action_id(rng.choice(game.legal_actions())))


def test_1000_legal_actions_encoding_invariants_and_replay():
    """Generated actions are unique, preserve 14 tiles, and roundtrip whole histories."""
    rng = random.Random(6062026)
    game = Game()
    for index in range(1000):
        if game.outcome(): game = Game("B" if index % 2 else "C")
        actions = game.legal_actions()
        ids = [action_id(a) for a in actions]
        assert len(ids) == len(set(ids)) and all(0 <= x < ACTION_SPACE_SIZE for x in ids)
        mover = game.state.side
        game.step(action_id(rng.choice(actions)))
        validate_state(game.state)
        assert not sim.in_check(game.state, mover)
        if index % 100 == 0:
            loaded = Game.from_record(game.export_record())
            assert position_data(loaded.state) == position_data(game.state)
            assert loaded.repetitions == game.repetitions
            assert loaded.outcome() == game.outcome()


@pytest.mark.parametrize("nodes", [1, 100, 2000])
def test_bot_budget_returns_legal_action_without_mutation(nodes):
    """Even an interrupted search yields a legal, version-bound result."""
    game = Game()
    before = game.export_record()
    result = suggest(game, depth=2, max_nodes=nodes, seed=7)
    assert result["action"]["id"] in {action_id(a) for a in game.legal_actions()}
    assert result["nodes"] <= nodes
    assert game.export_record() == before


def test_stdio_adapter_smoke_and_error_recovery():
    """One malformed request must not corrupt the NDJSON session or its next reply."""
    cli = Path(__file__).parents[1] / "reference" / "rift_cli.py"
    data = '\n'.join([json.dumps({"id": 1, "command": "new"}), '{broken',
                      json.dumps({"id": 3, "command": "legal"})]) + '\n'
    proc = subprocess.run([sys.executable, str(cli)], input=data, text=True, capture_output=True, check=True)
    responses = [json.loads(line) for line in proc.stdout.splitlines()]
    assert [r["ok"] for r in responses] == [True, False, True]
    assert len(responses[2]["result"]["actions"]) == 19


@pytest.mark.parametrize("constant", ["NaN", "Infinity", "-Infinity"])
def test_stdio_rejects_nonfinite_json_without_exiting(constant):
    """Malformed non-finite JSON cannot crash serialization or mutate the session."""
    cli = Path(__file__).parents[1] / "reference" / "rift_cli.py"
    data = '{"id":' + constant + ',"command":"observe"}\n' + '{"id":2,"command":"observe"}\n'
    proc = subprocess.run([sys.executable, str(cli)], input=data, text=True, capture_output=True, check=True)
    rows = [json.loads(line) for line in proc.stdout.splitlines()]
    assert len(rows) == 2 and rows[0]["ok"] is False and rows[1]["ok"] is True
    assert rows[1]["result"]["revision"] == 0


def test_meta_revision_rejects_boolean():
    """Boolean equality with integer zero is not accepted as a valid protocol revision."""
    from rift_cli import dispatch
    game = Game()
    with pytest.raises(ValueError, match="revision"):
        dispatch(game, {"command": "offer_draw", "actor": 1, "revision": False})
    assert game.draw_offer is None and game.revision == 0


def test_terminal_override_winner_must_be_integer():
    """A replay terminal result may not use a Boolean masquerading as a side code."""
    game = Game()
    game.resign(-1)
    record = game.export_record()
    record["override"]["winner"] = True
    with pytest.raises(ValueError):
        Game.from_record(record)
