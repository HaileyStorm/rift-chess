#!/usr/bin/env python3
"""Reproduce actual pinned-compiler source and emitted-JS gates under Node.

BEND_COMPILER selects a clean exact checkout, defaulting to the ignored pinned
location. No mock fallback. REVIEW_FONT_PATH optionally tests a local font;
font files are never copied into the delivery. Bun/browser/GPU are not implied.
"""
from __future__ import annotations
import argparse, hashlib, json, os, platform, subprocess, sys, time
from pathlib import Path
LIB=Path(__file__).resolve().parents[1]
ROOT=LIB.parents[3]

def digest(path: Path) -> str:
    """Hash exact source or receipt bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()

def execute(command: list[str], cwd: Path, out: Path, env: dict[str,str]) -> dict:
    """Run one bounded gate, retaining command, both streams and exit status."""
    start=time.perf_counter()
    try:
        p=subprocess.run(command,cwd=cwd,env=env,capture_output=True,text=True,timeout=300)
        stdout,stderr,code=p.stdout,p.stderr,p.returncode
    except subprocess.TimeoutExpired as e:
        stdout=e.stdout or b'';stderr=e.stderr or b''
        stdout=stdout.decode(errors='replace') if isinstance(stdout,bytes) else stdout
        stderr=stderr.decode(errors='replace') if isinstance(stderr,bytes) else stderr
        stderr+='\nGATE TIMEOUT\n';code=124
    out.parent.mkdir(parents=True,exist_ok=True)
    out.with_suffix('.stdout.txt').write_text(stdout);out.with_suffix('.stderr.txt').write_text(stderr)
    results=[]
    for line in stdout.splitlines():
        try:results.append(json.loads(line))
        except json.JSONDecodeError:pass
    return {'command':command,'cwd':str(cwd),'exit_code':code,'seconds':time.perf_counter()-start,
        'stdout':str(out.with_suffix('.stdout.txt')),'stderr':str(out.with_suffix('.stderr.txt')),
        'stdout_sha256':digest(out.with_suffix('.stdout.txt')),'stderr_sha256':digest(out.with_suffix('.stderr.txt')),'results':results}

def main() -> None:
    """Check proofs, finite regressions, production modules and source inventory."""
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--output',type=Path,default=ROOT/'.artifacts/graphics-expansion-local')
    ap.add_argument('--historical-benchmarks',action='store_true',help='Also run the unchanged grid8 delta demo benchmark; the first 4-GiB-container attempt exhausted the loader heap.')
    args=ap.parse_args();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
    compiler=Path(os.environ.get('BEND_COMPILER',ROOT/'.artifacts/toolchains/bend')).resolve()
    if not (compiler/'bend2/main.ts').is_file():raise SystemExit('A clean exact pinned compiler checkout is required; see REPRODUCE.md')
    env=dict(os.environ,BEND_NO_TELEMETRY='1',BEND_COMPILER=str(compiler),PIXEL_OUTPUT=str(out/'native-reference.json'))
    loader=['node',str(ROOT/'bend2/tools/bend.mjs'),'--run'] if os.name=='nt' else ['node','--stack-size=8192','--experimental-strip-types','--import','./main.ts']
    checker=['node','--experimental-strip-types',str(LIB/'tools/actual_compiler.mjs'),'check']
    proofs=[LIB/'contracts/PROOF.bend',LIB/'contracts/extensions/PROOF.bend',LIB/'assets/contracts/PROOF.bend',LIB.parent.parent/'grid8/contracts/PROOF.bend',LIB/'contracts/expansion/PROOF.bend']
    tests=['tests/library.ts','tests/grain.ts','tests/texture-pool.ts','tests/affine-grain.ts','tests/affine-texture.ts','tests/masked-stamp.ts','assets/tests/rgb-image.ts','tests/review/alpha-pipeline.ts','tests/review/rgba-codec.ts']
    tests += [f'tests/expansion/{n}.mjs' for n in ['batch','sampling','text','utilities','stroke','materials','host','native-pixels']]
    jobs=[('actual-source-proof',p,checker+[str(p)],ROOT) for p in proofs]
    paths=[LIB/t for t in tests]+[LIB.parent.parent/f'grid8/tests/{n}.ts' for n in (['library','camera','spatial-fast']+(['delta'] if args.historical_benchmarks else []))]
    jobs += [('actual-emitted-JS' if p.name!='host.mjs' else 'host-adapter',p,loader+[str(p)],ROOT if os.name=='nt' else compiler/'bend2') for p in paths]
    jobs += [('offline-python',p,[sys.executable,str(p)],ROOT) for p in [LIB/'tests/review/offline_tools.py',LIB/'assets/tools/test_encode_rgb.py']]
    jobs += [('actual-source-check',p,checker+[str(p)],ROOT) for p in sorted(LIB.glob('*.bend'))+sorted((LIB/'examples').glob('*.bend'))]
    records=[]
    for i,(kind,p,command,cwd) in enumerate(jobs):
        rec=execute(command,cwd,out/f'gate-{i:03}',env);rec.update(kind=kind,entrypoint=str(p.relative_to(ROOT)));records.append(rec)
        print(kind,rec['entrypoint'],rec['exit_code'],flush=True)
    sources={str(p.relative_to(ROOT)):digest(p) for p in sorted((ROOT/'bend2/lib').rglob('*')) if p.is_file() and p.suffix in {'.bend','.ts','.mjs','.py'} and '__pycache__' not in p.parts}
    report={'schema':'bend-graphics-expansion-gates/1','ok':all(r['exit_code']==0 for r in records),'compiler_pin':json.loads((ROOT/'bend2/TOOLCHAIN.json').read_text()),'pinned_bun_executed':False,'node':subprocess.check_output(['node','--version'],text=True).strip(),'platform':platform.platform(),'sources':sources,'gates':records,'unfilled_candidates':['contracts/expansion/presentation/LAWS.bend:empty_stroke_radius','contracts/expansion/presentation/LAWS.bend:transform_identity_origin'],'limits':'Finite JS is not native/GPU evidence. Source scheduling equality is not runtime correctness. Pinned Bun wrapper/browser/GPU gates unexecuted.'}
    (out/'summary.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'ok':report['ok'],'gates':len(records),'source_files':len(sources)}),flush=True)
    raise SystemExit(0 if report['ok'] else 1)

if __name__=='__main__':main()
