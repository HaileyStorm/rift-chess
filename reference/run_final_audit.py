"""Replayable final-rules experiments; budget caps are truncations, never draws.

Run: python reference/run_final_audit.py --workers 4
All games use prompted agreement; no policy issues or accepts draw offers.
The policies are shallow diagnostics, not a human-balance certification.
"""
from __future__ import annotations
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed
import argparse
import csv
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
import platform
import random
import statistics
import sys
import time
from typing import Any
import sliding_chess_sim as sim
from rift_core import Game, RULES, RULES_VERSION, action_id, repetition_key, suggest

ROOT = Path(__file__).resolve().parents[1]


def screening_choice(game: Game, profile: str, rng: random.Random) -> tuple[sim.Action, bool]:
    """Choose a legal action using one-ply material/PST screening or bounded two-ply search.

    Piece-first falls back to Shifts if no orthodox move exists; such fallbacks are
    recorded. Shift-first requires a Shift when possible. Shift-seeking adds 45
    heuristic points to Shifts. These are policy restrictions, not rule variants.
    """
    actions = game.legal_actions()
    fallback = False
    if profile == "two_ply":
        report = suggest(game, depth=2, max_nodes=3000, seed=rng.randrange(2**31))
        return next(a for a in actions if action_id(a) == report["action"]["id"]), False
    if profile == "piece_first":
        pieces = [a for a in actions if isinstance(a, sim.Move)]
        if pieces:
            actions = pieces
        else:
            fallback = True
    elif profile == "shift_first":
        shifts = [a for a in actions if isinstance(a, sim.Slide)]
        if shifts:
            actions = shifts
    scored = []
    for action in actions:
        nxt = sim.apply_action(game.state, action, RULES)
        key = repetition_key(nxt)
        score = sim.static_eval(nxt, RULES, perspective=game.state.side)
        if sim.in_check(nxt, nxt.side) and not sim.legal_actions(nxt, RULES):
            score = 100000.0
        elif sim.is_bare_kings(nxt) or game.repetitions[key] >= 2:
            score = 0.0
        if isinstance(action, sim.Slide) and profile == "shift_seeking":
            score += 45
        elif isinstance(action, sim.Move) and (game.state.board[action.dst] or action.is_ep):
            score += 14
        score -= 45 * max(0, game.repetitions[key]-1)
        score += rng.gauss(0, 28)
        scored.append((score, action))
    top = max(score for score, _ in scored)
    return rng.choice([action for score, action in scored if score >= top-9.8]), fallback


def specifications() -> list[dict[str, Any]]:
    """Build colour/layout-paired restrictions, baseline games and deeper-search probes."""
    specs = []
    for seed_index in range(8):
        for layout in ("B", "C"):
            specs.append(dict(group="baseline", layout=layout, seed_index=seed_index,
                              challenger_side=0, white="balanced", black="balanced", cap=180))
            for profile in ("piece_first", "shift_first", "shift_seeking"):
                for side in (1, -1):
                    specs.append(dict(group=profile, layout=layout, seed_index=seed_index,
                                      challenger_side=side, white=profile if side == 1 else "balanced",
                                      black=profile if side == -1 else "balanced", cap=180))
    for seed_index in range(2):
        for layout in ("B", "C"):
            for side in (1, -1):
                specs.append(dict(group="two_ply", layout=layout, seed_index=seed_index,
                                  challenger_side=side, white="two_ply" if side == 1 else "balanced",
                                  black="two_ply" if side == -1 else "balanced", cap=100))
    return specs


def run_one(spec: dict[str, Any]) -> dict[str, Any]:
    """Play one bounded match and retain the complete action history for independent replay."""
    seed = 6062026 + spec["seed_index"]*104729 + (0 if spec["layout"] == "B" else 13007)
    if spec["challenger_side"]:
        streams = {spec["challenger_side"]: random.Random(seed), -spec["challenger_side"]: random.Random(seed+7919)}
    else:
        streams = {1: random.Random(seed), -1: random.Random(seed+7919)}
    game = Game(spec["layout"], draw_policy="prompt")
    shifts = loaded = captures = promotions = check_answers = checks_by_shift = fallbacks = 0
    first_shift_action = None
    seen_holes = {game.state.holes}
    branching = []
    for turn_index in range(spec["cap"]):
        if game.outcome():
            break
        actions = game.legal_actions()
        branching.append(len(actions))
        state = game.state
        actor = state.side
        was_check = sim.in_check(state, actor)
        profile = spec["white"] if actor == 1 else spec["black"]
        action, fallback = screening_choice(game, profile, streams[actor])
        fallbacks += int(fallback)
        if isinstance(action, sim.Slide):
            shifts += 1
            loaded += int(any(state.board[s] for s in sim.macro_squares(action.src_macro)))
            if first_shift_action is None:
                first_shift_action = turn_index+1
            check_answers += int(was_check)
        else:
            captures += int(bool(state.board[action.dst] or action.is_ep))
        promotions += int(bool(action.promotion))
        game.step(action_id(action))
        if isinstance(action, sim.Slide) and sim.in_check(game.state, game.state.side):
            checks_by_shift += 1
        seen_holes.add(game.state.holes)
    outcome = game.outcome()  # Check the final permitted action BEFORE labelling the cap.
    return {**spec, "seed": seed, "plies": len(game.actions), "shifts": shifts,
            "loaded_shifts": loaded, "empty_shifts": shifts-loaded, "captures": captures,
            "promotions": promotions, "shift_check_answers": check_answers,
            "shift_checks": checks_by_shift, "restriction_fallbacks": fallbacks,
            "first_shift_action": first_shift_action, "distinct_hole_masks": len(seen_holes),
            "average_branching": statistics.mean(branching) if branching else 0,
            "outcome": asdict(outcome) if outcome else None, "truncated": outcome is None,
            "record": game.export_record()}


def summarize(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Aggregate diagnostics without assigning a chess result to an unfinished game."""
    summaries = []
    for group in sorted({row["group"] for row in rows}):
        selected = [row for row in rows if row["group"] == group]
        outcomes = Counter(row["outcome"]["reason"] if row["outcome"] else "truncated" for row in selected)
        total_plies = sum(row["plies"] for row in selected)
        total_shifts = sum(row["shifts"] for row in selected)
        firsts = [row["first_shift_action"] for row in selected if row["first_shift_action"] is not None]
        wins = sum(bool(r["outcome"]) and r["outcome"]["winner"] == r["challenger_side"] for r in selected if r["challenger_side"])
        losses = sum(bool(r["outcome"]) and r["outcome"]["winner"] == -r["challenger_side"] for r in selected if r["challenger_side"])
        draws = sum(bool(r["outcome"]) and r["outcome"]["winner"] == 0 for r in selected)
        summaries.append({"group": group, "games": len(selected), "plies": total_plies,
                          "shifts": total_shifts, "shift_action_percent": 100*total_shifts/max(1,total_plies),
                          "loaded_share_percent": 100*sum(r["loaded_shifts"] for r in selected)/max(1,total_shifts),
                          "mean_first_shift_action_1based": statistics.mean(firsts) if firsts else None,
                          "mean_hole_masks": statistics.mean(r["distinct_hole_masks"] for r in selected),
                          "mean_branching": statistics.mean(r["average_branching"] for r in selected),
                          "wins_challenger": wins if group != "baseline" else None,
                          "losses_challenger": losses if group != "baseline" else None,
                          "white_wins": sum(bool(r["outcome"]) and r["outcome"]["winner"] == 1 for r in selected),
                          "black_wins": sum(bool(r["outcome"]) and r["outcome"]["winner"] == -1 for r in selected),
                          "true_draws": draws, "truncated": outcomes["truncated"],
                          "shift_check_answers": sum(r["shift_check_answers"] for r in selected),
                          "shift_checks": sum(r["shift_checks"] for r in selected),
                          "restriction_fallbacks": sum(r["restriction_fallbacks"] for r in selected),
                          "end_reasons": dict(outcomes)})
    return summaries


def main() -> None:
    """Run experiments and save versioned replays, aggregates, command and source hashes."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--output", type=Path, default=ROOT / "research" / "fresh")
    args = parser.parse_args()
    if not 1 <= args.workers <= 32:
        parser.error("workers must be 1..32")
    args.output.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    specs = specifications()
    rows = []
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(run_one, spec) for spec in specs]
        for index, future in enumerate(as_completed(futures), 1):
            rows.append(future.result())
            if index % 16 == 0 or index == len(specs):
                print(f"{index}/{len(specs)} games complete", flush=True)
    rows.sort(key=lambda r: (r["group"], r["seed_index"], r["layout"], r["challenger_side"]))
    (args.output / "games.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    summaries = summarize(rows)
    (args.output / "summary.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    with (args.output / "summary.csv").open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(summaries[0]))
        writer.writeheader()
        for row in summaries:
            writer.writerow({**row, "end_reasons": json.dumps(row["end_reasons"], sort_keys=True)})
    meta = {"rules_version": RULES_VERSION, "python": sys.version, "platform": platform.platform(),
            "command": "python reference/run_final_audit.py --workers 4", "workers": args.workers,
            "elapsed_seconds": round(time.perf_counter()-started, 3), "games": len(rows),
            "draw_policy": "prompt", "time_limits_are_truncations_not_draws": True,
            "source_sha256": {path.name: hashlib.sha256(path.read_bytes()).hexdigest()
                              for path in [Path(__file__), ROOT/"reference/rift_core.py", ROOT/"reference/sliding_chess_sim.py"]}}
    (args.output / "metadata.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(summaries, indent=2), flush=True)


if __name__ == "__main__":
    main()
