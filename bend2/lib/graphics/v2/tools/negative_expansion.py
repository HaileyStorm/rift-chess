#!/usr/bin/env python3
"""Mutation controls using the real pinned compiler and unchanged finite tests.

Each mutation is confined to a disposable copy of bend2/lib. A successful
negative control must reach an AssertionError, not merely fail to import or
compile. Production source is never edited by this tool.
"""
from __future__ import annotations
import argparse, hashlib, json, os, shutil, subprocess, tempfile
from pathlib import Path
LIB=Path(__file__).resolve().parents[1];ROOT=LIB.parents[3]

def main() -> None:
    """Exercise rounding and painter-order mutations with exact before/after hashes."""
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,default=ROOT/'.artifacts/graphics-negative-local');out=p.parse_args().output.resolve();out.mkdir(parents=True,exist_ok=True)
    compiler=Path(os.environ.get('BEND_COMPILER',ROOT/'.artifacts/toolchains/bend')).resolve();records=[]
    changes=[('alpha-rounding','RgbaSample.bend','32768','0','sampling.mjs'),
        ('painter-order','DrawList.bend','render(rest,depth,size,x,y,draw_one(command,depth,size,x,y,target))','draw_one(command,depth,size,x,y,render(rest,depth,size,x,y,target))','batch.mjs')]
    for name,file,old,new,test in changes:
        with tempfile.TemporaryDirectory(prefix='graphics-negative-') as temp:
            root=Path(temp);shutil.copytree(ROOT/'bend2/lib',root/'lib',ignore=shutil.ignore_patterns('__pycache__'))
            v=root/'lib/graphics/v2';path=v/file;before=path.read_text()
            if before.count(old)!=1:raise RuntimeError(f'Mutation target must occur once: {file}:{old}')
            after=before.replace(old,new);path.write_text(after)
            command=['node','--stack-size=8192','--experimental-strip-types','--import','./main.ts',str(v/'tests/expansion'/test)]
            run=subprocess.run(command,cwd=compiler/'bend2',env=dict(os.environ,BEND_NO_TELEMETRY='1'),text=True,capture_output=True,timeout=180)
            (out/f'{name}.stdout.txt').write_text(run.stdout);(out/f'{name}.stderr.txt').write_text(run.stderr)
            passed=run.returncode!=0 and ('AssertionError' in run.stderr or 'AssertionError' in run.stdout)
            record={'name':name,'file':file,'old':old,'new':new,'source_before_sha256':hashlib.sha256(before.encode()).hexdigest(),'source_after_sha256':hashlib.sha256(after.encode()).hexdigest(),'command':command,'exit_code':run.returncode,'assertion_failure_detected':passed}
            records.append(record);print(json.dumps(record),flush=True)
    report={'ok':all(r['assertion_failure_detected'] for r in records),'scope':'Actual pinned compiler emission; disposable source copies; unchanged test assertions; import/typecheck failures are not accepted as successful controls','results':records}
    (out/'summary.json').write_text(json.dumps(report,indent=2)+'\n');raise SystemExit(0 if report['ok'] else 1)

if __name__=='__main__':main()
