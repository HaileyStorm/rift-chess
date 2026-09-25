#!/usr/bin/env python3
"""Check third-pass source/proofs and execute unchanged independent oracles.

The real pinned compiler runs under Node's TypeScript stripping. This does not
claim the unavailable pinned Bun wrapper, browser, native or GPU gates. Mutation
controls copy the library into ignored build storage and never modify delivery
sources. Historical verification is a separate optional, unchanged command.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

LIB = Path(__file__).resolve().parents[1]
ROOT = LIB.parents[3]


def sha(path: Path) -> str:
    """Hash exact source bytes, not a normalized or parsed representation."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def execute(command: list[str], cwd: Path, env: dict[str, str], output: Path) -> dict:
    """Preserve commands, streams, duration and exit status for every attempt."""
    started = time.perf_counter()
    result = subprocess.run(command, cwd=cwd, env=env, text=True, capture_output=True, timeout=420)
    output.with_suffix('.stdout.txt').write_text(result.stdout)
    output.with_suffix('.stderr.txt').write_text(result.stderr)
    record = {'command': command, 'cwd': str(cwd), 'exit_code': result.returncode,
              'seconds': time.perf_counter() - started,
              'stdout': output.with_suffix('.stdout.txt').name,
              'stderr': output.with_suffix('.stderr.txt').name}
    output.with_suffix('.command.json').write_text(json.dumps(record, indent=2) + '\n')
    return record


def require(record: dict) -> None:
    """Fail on an actual unsuccessful gate instead of counting it as a pass."""
    if record['exit_code']:
        raise RuntimeError(f"Gate failed: {record['command']}; see {record['stderr']}")


def main() -> None:
    """Run source closure, syntax, finite oracles and deliberate mutation controls."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.artifacts/graphics-third-local')
    parser.add_argument('--baseline', action='store_true', help='Also rerun the unchanged 85-gate second-pass suite.')
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    compiler = Path(os.environ.get('BEND_COMPILER', ROOT / '.artifacts/toolchains/bend')).resolve()
    env = dict(os.environ, BEND_COMPILER=str(compiler), BEND_NO_TELEMETRY='1')
    records = []
    sources = sorted((LIB / 'third').glob('*.bend')) + [LIB / 'contracts/third/PROOF.bend']
    sources += sorted((LIB / 'tests/third').glob('*.bend')) + sorted((LIB / 'bench/third').glob('*.bend'))
    for source in sources:
        command = ['node', '--experimental-strip-types', str(LIB / 'tools/actual_compiler.mjs'), 'check', str(source)]
        record = execute(command, ROOT, env, out / ('check-' + '-'.join(source.relative_to(LIB).parts).replace('.bend', '')))
        require(record)
        payload = json.loads((out / record['stdout']).read_text().strip().splitlines()[-1])
        if payload['promises']:
            raise AssertionError(f'New unsafe/foreign promises: {payload["promises"]}')
        records.append(record)
    print('Source closures checked:', len(sources), flush=True)
    js_files = sorted((LIB / 'tests/third').glob('*.mjs')) + [LIB / 'host' / name for name in ['FrameWorkers.mjs', 'frame-worker.mjs', 'TileDamage.mjs', 'TilePresenter.mjs']]
    js_files += sorted((LIB / 'review-third/demo').glob('*.mjs'))
    js_files += [LIB / 'bench/third.mjs', LIB / 'bench/third-path.mjs']
    for i, source in enumerate(js_files):
        record = execute(['node', '--check', str(source)], ROOT, env, out / f'syntax-{i:02}')
        require(record)
        records.append(record)
    tests = ['core', 'vectors', 'retained', 'glyph-layer']
    for name in tests:
        command = ['node', str(ROOT / 'bend2/tools/bend.mjs'), '--run', str(LIB / f'tests/third/{name}.mjs')] if os.name == 'nt' else ['node', '--stack-size=8192', '--experimental-strip-types', '--import', './main.ts', str(LIB / f'tests/third/{name}.mjs')]
        record = execute(command, ROOT if os.name == 'nt' else compiler / 'bend2', env, out / name)
        require(record)
        records.append(record)
        print(name, (out / record['stdout']).read_text().strip().splitlines()[-1], flush=True)
    mutants = [
        ('alpha-rounding', 'Premul.bend', 'U32.add(U32.mul(a,b),127)', 'U32.add(U32.mul(a,b),0)', 'core'),
        ('edge-boundary', 'PathFill.bend', 'F32.is_gt(F32.sub(F32.mul(dx,F32.sub(y,ay))', 'F32.is_ge(F32.sub(F32.mul(dx,F32.sub(y,ay))', 'vectors'),
    ]
    mutation_records = []
    for name, filename, before, after, test in mutants:
        target = ROOT / '.artifacts/third-mutations' / name
        if not target.resolve().is_relative_to((ROOT / '.artifacts/third-mutations').resolve()):
            raise RuntimeError('Mutation output escapes ignored test storage')
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(ROOT / 'bend2/lib', target / 'lib', ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
        copied_lib = target / 'lib/graphics/v2'
        changed = copied_lib / 'third' / filename
        text = changed.read_text()
        if text.count(before) != 1:
            raise AssertionError(f'Mutant target is ambiguous: {name}')
        changed.write_text(text.replace(before, after))
        command = ['node', str(ROOT / 'bend2/tools/bend.mjs'), '--run', str(copied_lib / f'tests/third/{test}.mjs')] if os.name == 'nt' else ['node', '--stack-size=8192', '--experimental-strip-types', '--import', './main.ts', str(copied_lib / f'tests/third/{test}.mjs')]
        record = execute(command, ROOT if os.name == 'nt' else compiler / 'bend2', env, out / ('mutant-' + name))
        stderr = (out / record['stderr']).read_text()
        if record['exit_code'] == 0 or ('AssertionError' not in stderr and 'ERR_ASSERTION' not in stderr):
            raise AssertionError(f'Mutation must fail through the unchanged oracle assertion, not compilation: {name}')
        record.update(name=name, replacement={'before': before, 'after': after}, expected_assertion_failure=True,
                      source_sha256=sha(changed), oracle_unchanged=sha(copied_lib / f'tests/third/{test}.mjs') == sha(LIB / f'tests/third/{test}.mjs'))
        mutation_records.append(record)
        print('Mutation rejected by oracle:', name, flush=True)
    if args.baseline:
        record = execute(['python', str(LIB / 'tools/verify_expansion.py'), '--output', str(out / 'baseline')], ROOT, env, out / 'baseline-run')
        require(record)
        records.append(record)
    inventory = {str(p.relative_to(ROOT)): sha(p) for p in sources + js_files}
    report = {'ok': True, 'method': __doc__, 'source_checks': len(sources), 'syntax_checks': len(js_files),
              'records': records, 'mutations': mutation_records, 'source_sha256': inventory,
              'baseline_rerun': args.baseline, 'limits': 'Source and finite JS gates only. Native and actual browser receipts are separate. Bun and GPU not validated.'}
    (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'ok': True, 'source_checks': len(sources), 'syntax_checks': len(js_files), 'oracles': len(tests), 'mutation_controls': len(mutants)}), flush=True)


if __name__ == '__main__':
    main()
