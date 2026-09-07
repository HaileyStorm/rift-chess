from __future__ import annotations

import argparse
import csv
import json
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict, replace
from pathlib import Path
from typing import Any

from sliding_chess_sim import Agent, LAYOUTS, RULESETS, RuleSet, play_game, summarize


AGENTS: dict[str, Agent] = {
    "balanced": Agent(
        "balanced",
        depth=1,
        randomness=28.0,
        capture_bias=14.0,
        repetition_penalty=45.0,
    ),
    "balanced_low_noise": Agent(
        "balanced_low_noise",
        depth=1,
        randomness=10.0,
        capture_bias=14.0,
        repetition_penalty=45.0,
    ),
    "slide_happy": Agent(
        "slide_happy",
        depth=1,
        randomness=24.0,
        capture_bias=12.0,
        slide_bias=45.0,
        repetition_penalty=45.0,
    ),
    "slide_averse": Agent(
        "slide_averse",
        depth=1,
        randomness=24.0,
        capture_bias=14.0,
        slide_bias=-45.0,
        repetition_penalty=45.0,
    ),
    "no_slide": Agent(
        "no_slide",
        depth=1,
        allow_slides=False,
        randomness=24.0,
        capture_bias=14.0,
        repetition_penalty=45.0,
    ),
    "forced_slide": Agent(
        "forced_slide",
        depth=1,
        force_slide_when_available=True,
        randomness=24.0,
        capture_bias=14.0,
        repetition_penalty=45.0,
    ),
    "random": Agent(
        "random",
        depth=0,
        randomness=0.0,
        repetition_penalty=0.0,
    ),
    "depth2": Agent(
        "depth2",
        depth=2,
        randomness=6.0,
        capture_bias=14.0,
        repetition_penalty=45.0,
    ),
}


RULE_VARIANTS: dict[str, RuleSet] = {
    **RULESETS,
    "exclusive_1_no_slide_promotion": replace(
        RULESETS["exclusive_1"], name="exclusive_1_no_slide_promotion", slide_promotion=False
    ),
    "exclusive_1_no_reverse": replace(
        RULESETS["exclusive_1"], name="exclusive_1_no_reverse", immediate_reverse_forbidden=True
    ),
    "exclusive_1_pawn_resets_clock": replace(
        RULESETS["exclusive_1"], name="exclusive_1_pawn_resets_clock", slide_resets_halfmove_if_pawn=True
    ),
    "exclusive_1_status_not_consumed": replace(
        RULESETS["exclusive_1"], name="exclusive_1_status_not_consumed", transported_pieces_count_as_moved=False
    ),
    "exclusive_1_king_mobile": replace(
        RULESETS["exclusive_1"], name="exclusive_1_king_mobile", king_tiles_anchor=False
    ),
}


EXTRA_LAYOUTS: dict[str, tuple[tuple[int, ...], ...]] = {
    # B2/C2 or B3/C3: a 4x2 horizontal central gap, randomized north/south.
    "horizontal_center_pair": ((5, 6), (9, 10)),
    # Two holes, one close to each army on opposite flanks; randomized mirror.
    "opposite_flank_diagonal": ((4, 11), (7, 8)),
    # Vertical pair one step off the outer edge, preserving the center.
    "inner_flank_lane": ((5, 9), (6, 10)),
}
ALL_LAYOUTS = {**LAYOUTS, **EXTRA_LAYOUTS}


def _run_chunk(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rules = RULE_VARIANTS[payload["rules"]]
    layouts = ALL_LAYOUTS[payload["layout"]]
    white = AGENTS[payload["white"]]
    black = AGENTS[payload["black"]]
    start = payload["start"]
    count = payload["count"]
    seed_base = payload["seed_base"]
    max_plies = payload["max_plies"]
    records: list[dict[str, Any]] = []
    for game_index in range(start, start + count):
        layout = layouts[game_index % len(layouts)]
        record = play_game(
            rules,
            layout,
            white,
            black,
            seed=seed_base + game_index * 7919,
            max_plies=max_plies,
        )
        row = asdict(record)
        row.update(
            experiment=payload["experiment"],
            config=payload["config"],
            rules=payload["rules"],
            layout=payload["layout"],
            white_agent=payload["white"],
            black_agent=payload["black"],
            game_index=game_index,
            seed=seed_base + game_index * 7919,
        )
        records.append(row)
    return records


def build_specs(session: str) -> list[dict[str, Any]]:
    specs: list[dict[str, Any]] = []

    if session in {"all", "rules"}:
        names = [
            "unrestricted",
            "any_friendly",
            "exclusive_2",
            "exclusive_1",
            "exclusive_1_noempty",
            "majority_count",
        ]
        for name in names:
            specs.append(dict(
                experiment="rule_screen",
                config=name,
                rules=name,
                layout="vertical_center_pair",
                white="balanced",
                black="balanced",
                games=240,
                max_plies=180,
                seed_base=110_000 + len(specs) * 100_000,
            ))

    if session in {"all", "layouts"}:
        names = [
            "vertical_center_pair",
            "same_flank",
            "central_diagonals",
            "edge_diagonals",
            "horizontal_center_pair",
            "opposite_flank_diagonal",
            "one_gap_center",
        ]
        for name in names:
            specs.append(dict(
                experiment="layout_screen",
                config=name,
                rules="exclusive_1",
                layout=name,
                white="balanced",
                black="balanced",
                games=240,
                max_plies=180,
                seed_base=2_000_000 + len(specs) * 100_000,
            ))

    if session in {"all", "tuning"}:
        names = [
            "exclusive_1",
            "exclusive_1_no_slide_promotion",
            "exclusive_1_no_reverse",
            "exclusive_1_pawn_resets_clock",
            "exclusive_1_status_not_consumed",
            "exclusive_1_king_mobile",
        ]
        for name in names:
            specs.append(dict(
                experiment="rule_tuning",
                config=name,
                rules=name,
                layout="vertical_center_pair",
                white="balanced",
                black="balanced",
                games=240,
                max_plies=200,
                seed_base=4_000_000 + len(specs) * 100_000,
            ))

    if session in {"all", "restricted"}:
        matchups = [
            ("balanced_balanced", "balanced", "balanced"),
            ("no_slide_vs_balanced", "no_slide", "balanced"),
            ("balanced_vs_no_slide", "balanced", "no_slide"),
            ("forced_slide_vs_balanced", "forced_slide", "balanced"),
            ("balanced_vs_forced_slide", "balanced", "forced_slide"),
            ("slide_happy_vs_balanced", "slide_happy", "balanced"),
            ("balanced_vs_slide_happy", "balanced", "slide_happy"),
            ("slide_averse_vs_balanced", "slide_averse", "balanced"),
            ("balanced_vs_slide_averse", "balanced", "slide_averse"),
            ("random_vs_balanced", "random", "balanced"),
            ("balanced_vs_random", "balanced", "random"),
        ]
        for config, white, black in matchups:
            specs.append(dict(
                experiment="restricted_play",
                config=config,
                rules="exclusive_1",
                layout="vertical_center_pair",
                white=white,
                black=black,
                games=180,
                max_plies=180,
                seed_base=6_000_000 + len(specs) * 100_000,
            ))

    if session in {"all", "depth"}:
        matchups = [
            ("depth2_vs_balanced", "depth2", "balanced"),
            ("balanced_vs_depth2", "balanced", "depth2"),
            ("depth2_selfplay", "depth2", "depth2"),
        ]
        for config, white, black in matchups:
            specs.append(dict(
                experiment="search_depth",
                config=config,
                rules="exclusive_1",
                layout="vertical_center_pair",
                white=white,
                black=black,
                games=16,
                max_plies=120,
                seed_base=9_000_000 + len(specs) * 100_000,
            ))

    return specs


def chunk_specs(specs: list[dict[str, Any]], chunk_size: int) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for spec in specs:
        for start in range(0, spec["games"], chunk_size):
            payload = dict(spec)
            payload["start"] = start
            payload["count"] = min(chunk_size, spec["games"] - start)
            del payload["games"]
            chunks.append(payload)
    return chunks


def write_results(rows: list[dict[str, Any]], output_dir: Path, session: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    rows.sort(key=lambda row: (row["experiment"], row["config"], row["game_index"]))
    json_path = output_dir / f"{session}_records.json"
    json_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")

    csv_path = output_dir / f"{session}_records.csv"
    fieldnames = list(rows[0])
    with csv_path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    grouped: dict[tuple[str, str], list[Any]] = {}
    from sliding_chess_sim import GameRecord

    record_fields = set(GameRecord.__dataclass_fields__)
    for row in rows:
        key = (row["experiment"], row["config"])
        record_kwargs = {name: row[name] for name in record_fields}
        record_kwargs["first_actions"] = tuple(record_kwargs["first_actions"])
        grouped.setdefault(key, []).append(GameRecord(**record_kwargs))

    summaries = []
    for (experiment, config), records in sorted(grouped.items()):
        summary = summarize(records)
        first = next(row for row in rows if row["experiment"] == experiment and row["config"] == config)
        summary.update(
            experiment=experiment,
            config=config,
            rules=first["rules"],
            layout=first["layout"],
            white_agent=first["white_agent"],
            black_agent=first["black_agent"],
        )
        summaries.append(summary)

    summary_path = output_dir / f"{session}_summary.json"
    summary_path.write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    summary_csv = output_dir / f"{session}_summary.csv"
    fieldnames = []
    for summary in summaries:
        for key in summary:
            if key not in fieldnames:
                fieldnames.append(key)
    with summary_csv.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(summaries)

    print(f"Wrote {len(rows)} records and {len(summaries)} summaries to {output_dir}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("session", choices=("all", "rules", "layouts", "tuning", "restricted", "depth"))
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--chunk-size", type=int, default=10)
    parser.add_argument("--output-dir", type=Path, default=Path("/mnt/data/sliding_chess_results"))
    args = parser.parse_args()

    specs = build_specs(args.session)
    chunks = chunk_specs(specs, args.chunk_size)
    rows: list[dict[str, Any]] = []
    completed = 0
    with ProcessPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(_run_chunk, payload) for payload in chunks]
        for future in as_completed(futures):
            rows.extend(future.result())
            completed += 1
            if completed % 10 == 0 or completed == len(futures):
                print(f"completed {completed}/{len(futures)} chunks; {len(rows)} games", flush=True)

    write_results(rows, args.output_dir, args.session)


if __name__ == "__main__":
    main()
