#!/usr/bin/env python3
"""Reproduce explicitly non-authoritative source-subset A/B timing and call counts."""
from __future__ import annotations
import argparse,hashlib,importlib.util,json,os,platform,shutil,subprocess,sys
from pathlib import Path
LIB=Path(__file__).resolve().parents[1];ROOT=LIB.parents[3]
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',type=Path,default=ROOT/'.artifacts/review-bench');a=ap.parse_args();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
    spec=importlib.util.spec_from_file_location('lower',LIB/'tools/portable/lower.py');lower=importlib.util.module_from_spec(spec);spec.loader.exec_module(lower)
    old=out/'baseline';(old/'bend2/lib').mkdir(parents=True,exist_ok=True)
    for path in (ROOT/'bend2/lib').rglob('*.bend'):
        dest=old/path.relative_to(ROOT);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest)
    for name in ['MaskedStamp.bend','AffineTexture.bend']:
        shutil.copy2(LIB/'tests/review/baseline'/name,old/'bend2/lib/graphics/v2'/name)
    paths={};sources={}
    entries=[('sprite_before',old,'MaskedStamp.bend','draw'),('sprite_after',ROOT,'MaskedStamp.bend','draw'),('texture_before',old,'AffineTexture.bend','draw'),('texture_after',ROOT,'AffineTexture.bend','draw'),('mask',ROOT,'Mask.bend','prepare')]
    for label,root,file,export in entries:
        target=out/(label+'.mjs');entry=root/'bend2/lib/graphics/v2'/file
        sources[label]=lower.Lower(root).emit(entry,[export],target);paths[label]=str(target)
    m=out/'modules.json';m.write_text(json.dumps({'modules':paths,'sources':sources},indent=2)+'\n')
    cmd=['node','--expose-gc',str(LIB/'tools/portable/benchmark.mjs'),str(m),str(out/'benchmark.json')]
    run=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=300)
    (out/'stdout.txt').write_text(run.stdout);(out/'stderr.txt').write_text(run.stderr)
    cpu='unknown'
    if Path('/proc/cpuinfo').exists():
        cpu=next((l.split(':',1)[1].strip() for l in Path('/proc/cpuinfo').read_text().splitlines() if l.startswith('model name')),cpu)
    receipt={'command':cmd,'exit_code':run.returncode,'python':sys.version,'platform':platform.platform(),'cpu':cpu,'cpu_count':os.cpu_count(),
             'environment_scope':'Container CPU, serial Node; not user RTX 5090/Ryzen system',
             'sources':sources,'benchmark_sha256':hashlib.sha256((out/'benchmark.json').read_bytes()).hexdigest() if (out/'benchmark.json').exists() else None}
    (out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(run.stdout);print(run.stderr,file=sys.stderr);sys.exit(run.returncode)
if __name__=='__main__':main()
