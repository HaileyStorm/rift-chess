#!/usr/bin/env python3
"""Run separately labeled host-subset or pinned-Bend review gates.

Default --host is NOT compiler/proof/native evidence. --pinned never falls back
and exits nonzero when the exact wrapper/toolchain is unavailable. It does not
install, modify, or bypass the pinned toolchain or its dirty-tree checks.
"""
from __future__ import annotations
import argparse, hashlib, importlib.util, json, os, platform, re, shutil, subprocess, sys, time
from pathlib import Path

LIB = Path(__file__).resolve().parents[1]
ROOT = LIB.parents[3]
TESTS = ['assets/tests/rgb-image.ts', 'tests/masked-stamp.ts', 'tests/affine-texture.ts',
         'tests/review/alpha-pipeline.ts', 'tests/review/rgba-codec.ts']

def call(cmd: list[str], cwd: Path, output: Path, env: dict | None = None, timeout=300) -> dict:
    start=time.perf_counter()
    p=subprocess.run(cmd,cwd=cwd,capture_output=True,text=True,env=env,timeout=timeout)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.with_suffix('.stdout.txt').write_text(p.stdout)
    output.with_suffix('.stderr.txt').write_text(p.stderr)
    data={'command':cmd,'exit_code':p.returncode,'elapsed_seconds':time.perf_counter()-start,
          'stdout_sha256':hashlib.sha256(p.stdout.encode()).hexdigest(),
          'stderr_sha256':hashlib.sha256(p.stderr.encode()).hexdigest()}
    values=[]
    for line in p.stdout.splitlines():
        try: values.append(json.loads(line))
        except json.JSONDecodeError: pass
    if values:data['results']=values
    if p.returncode: print(p.stdout+p.stderr,file=sys.stderr)
    return data

def host(out: Path, font: Path | None) -> dict:
    spec=importlib.util.spec_from_file_location('subset_lower',LIB/'tools/portable/lower.py')
    lower=importlib.util.module_from_spec(spec);spec.loader.exec_module(lower)
    mods=out/'modules';mods.mkdir(parents=True,exist_ok=True)
    staging=out/'tests';staging.mkdir(exist_ok=True)
    manifests={};results=[]
    # Each test is copied with import-only substitutions. Its assertions are not
    # modified. One historical execution-label string is relabeled, not a test.
    for test in TESTS:
        source=LIB/test;target=staging/test;target.parent.mkdir(parents=True,exist_ok=True)
        text=source.read_text();exports={}
        imports=re.findall(r"import\s+(\w+)\s+from\s+['\"]([^'\"]+\.bend)['\"];?",text)
        for alias,relative in imports:
            path=(source.parent/relative).resolve()
            names=sorted(set(re.findall(r'\b'+re.escape(alias)+r'\.(\w+)\s*\(',text)))
            if not names:raise ValueError(f'No requested exports for {alias}')
            key=hashlib.sha256(str(path.relative_to(ROOT)).encode()).hexdigest()[:12]
            output=mods/(key+'.mjs')
            manifest=lower.Lower(ROOT).emit(path,names,output)
            manifests[test+':'+alias]=manifest
            replacement=os.path.relpath(output,target.parent).replace(os.sep,'/')
            text=text.replace("'"+relative+"'","'"+replacement+"'").replace('"'+relative+'"','"'+replacement+'"')
        text=text.replace('finite emitted JS only','NON-AUTHORITATIVE source-subset execution only')
        target.write_text(text)
        if test.startswith('tests/review/'):
            shutil.copy2(LIB/'tests/review/helpers.ts',target.parent/'helpers.ts')
        rec=call(['node','--experimental-strip-types',str(target)],ROOT,out/'logs'/Path(test).stem)
        rec['original_test_sha256']=hashlib.sha256(source.read_bytes()).hexdigest()
        rec['transformed_test_sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
        rec['transform']='Bend import paths only; original historical emitted-JS label relabeled. Assertions unchanged.'
        results.append(rec)
    env=os.environ.copy()
    if font:env['REVIEW_FONT_PATH']=str(font.resolve())
    results.append(call([sys.executable,str(LIB/'tests/review/offline_tools.py')],ROOT,out/'logs/offline-tools',env))
    results.append(call([sys.executable,str(LIB/'assets/tools/test_encode_rgb.py')],ROOT,out/'logs/original-rga1-encoder',env))
    (out/'source-subset-manifests.json').write_text(json.dumps(manifests,indent=2)+'\n')
    return {'mode':'NON-AUTHORITATIVE serial JS source-subset + actual Python offline tools',
            'host_checks_passed':all(x['exit_code']==0 for x in results),'runs':results,
            'pinned_bend':'NOT RUN','type_ownership_termination_checks':'NOT RUN',
            'proofs':'NOT RUN','native_cpu_multicore_gpu':'NOT RUN',
            'browser_blit_interaction':'NOT RUN'}

def pinned(out: Path) -> dict:
    env=os.environ.copy();env['BEND_NO_TELEMETRY']='1'
    wrapper=['node','bend2/tools/bend.mjs']
    runs=[call(wrapper+['version'],ROOT,out/'logs/pinned-version',env)]
    if runs[0]['exit_code']:
        return {'mode':'pinned Bend','status':'BLOCKED; no fallback performed','passed':False,'runs':runs}
    for entry in ['bend2/lib/graphics/v2/contracts/PROOF.bend',
                  'bend2/lib/grid8/contracts/PROOF.bend',
                  'bend2/lib/graphics/v2/assets/contracts/PROOF.bend',
                  'bend2/lib/graphics/v2/contracts/extensions/PROOF.bend']:
        label=entry.replace('/','_')
        rec=call(wrapper+[entry,'--check-only'],ROOT,out/'logs'/label,env)
        log_path=out/'logs'/label
        text=log_path.with_suffix('.stdout.txt').read_text()+log_path.with_suffix('.stderr.txt').read_text()
        warnings=[line for line in text.splitlines() if re.search(r'\b(warning|unsafe|foreign)\b',line,re.I)]
        rec['warning_review_required']=bool(warnings)
        if warnings:rec['warning_lines']=warnings
        runs.append(rec)
    for test in ['tests/library.ts','tests/grain.ts','tests/texture-pool.ts','tests/affine-grain.ts']+TESTS:
        runs.append(call(wrapper+['--run',str(LIB/test)],ROOT,out/'logs'/Path(test).stem,env))
    return {'mode':'pinned Bend','passed':all(x['exit_code']==0 and not x.get('warning_review_required',False) for x in runs),'runs':runs,
            'scope':'Source checks and emitted-JS finite tests only; no native/GPU/browser result implied.'}

def main() -> None:
    p=argparse.ArgumentParser(description=__doc__)
    mode=p.add_mutually_exclusive_group();mode.add_argument('--host',action='store_true');mode.add_argument('--pinned',action='store_true')
    p.add_argument('--out',type=Path,help='Override output directory; defaults are mode-specific.')
    p.add_argument('--font',type=Path,help='Optional explicit local test font; never copied into the deliverable.')
    a=p.parse_args()
    out=(a.out or ROOT/'.artifacts'/('review-pinned' if a.pinned else 'review-host')).resolve()
    out.mkdir(parents=True,exist_ok=True)
    try:report=pinned(out) if a.pinned else host(out,a.font)
    except (OSError,ValueError,subprocess.TimeoutExpired) as e:
        report={'mode':'pinned Bend' if a.pinned else 'host subset','passed':False,'error':str(e)}
    report['environment']={'python':sys.version,'platform':platform.platform(),'machine':platform.machine(),
                           'node':subprocess.run(['node','--version'],capture_output=True,text=True).stdout.strip()}
    (out/'summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
    sys.exit(0 if report.get('passed',report.get('host_checks_passed',False)) else 1)
if __name__=='__main__':main()
