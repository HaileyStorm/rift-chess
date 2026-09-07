from __future__ import annotations

import csv
import json
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict, replace
from pathlib import Path
from typing import Any

from sliding_chess_sim import Agent, LAYOUTS, RULESETS, RuleSet, play_game, summarize, GameRecord

OUT = Path('/mnt/data/sliding_chess_results')

AGENT = Agent('balanced', depth=1, randomness=28.0, capture_bias=14.0, repetition_penalty=45.0)

RULES: dict[str, RuleSet] = {
    'unrestricted': RULESETS['unrestricted'],
    'any_friendly': RULESETS['any_friendly'],
    'exclusive_2': RULESETS['exclusive_2'],
    'exclusive_1': RULESETS['exclusive_1'],
    'exclusive_1_noempty': RULESETS['exclusive_1_noempty'],
    'majority_count': RULESETS['majority_count'],
    'no_slide_promotion': replace(RULESETS['exclusive_1'], name='no_slide_promotion', slide_promotion=False),
    'no_reverse': replace(RULESETS['exclusive_1'], name='no_reverse', immediate_reverse_forbidden=True),
    'pawn_resets_clock': replace(RULESETS['exclusive_1'], name='pawn_resets_clock', slide_resets_halfmove_if_pawn=True),
    'status_not_consumed': replace(RULESETS['exclusive_1'], name='status_not_consumed', transported_pieces_count_as_moved=False),
    'king_mobile': replace(RULESETS['exclusive_1'], name='king_mobile', king_tiles_anchor=False),
}


def run_seed(seed_index: int) -> list[dict[str, Any]]:
    seed = 12_345_679 + seed_index * 104_729
    layout = LAYOUTS['vertical_center_pair'][seed_index % 2]
    rows = []
    for name, rules in RULES.items():
        record = play_game(rules, layout, AGENT, AGENT, seed=seed, max_plies=180)
        row = asdict(record)
        row.update(config=name, seed_index=seed_index, seed=seed, layout_index=seed_index % 2)
        rows.append(row)
    return rows


def main() -> None:
    rows: list[dict[str, Any]] = []
    with ProcessPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(run_seed, i) for i in range(160)]
        for i, future in enumerate(as_completed(futures), 1):
            rows.extend(future.result())
            if i % 20 == 0:
                print(f'{i}/160 paired seeds complete', flush=True)
    rows.sort(key=lambda r: (r['config'], r['seed_index']))
    (OUT/'paired_rules_records.json').write_text(json.dumps(rows, indent=2))
    with (OUT/'paired_rules_records.csv').open('w', newline='') as f:
        writer=csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader(); writer.writerows(rows)

    fields=set(GameRecord.__dataclass_fields__)
    summaries=[]
    for name in RULES:
        records=[]
        for row in rows:
            if row['config'] != name: continue
            kw={k:row[k] for k in fields}; kw['first_actions']=tuple(kw['first_actions'])
            records.append(GameRecord(**kw))
        sm=summarize(records); sm['config']=name; summaries.append(sm)
    (OUT/'paired_rules_summary.json').write_text(json.dumps(summaries, indent=2))
    with (OUT/'paired_rules_summary.csv').open('w',newline='') as f:
        fieldnames=[]
        for row in summaries:
            for k in row:
                if k not in fieldnames: fieldnames.append(k)
        w=csv.DictWriter(f,fieldnames=fieldnames);w.writeheader();w.writerows(summaries)
    print('done', flush=True)


if __name__=='__main__':
    main()
