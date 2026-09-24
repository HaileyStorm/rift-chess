#!/usr/bin/env python3
"""Source-subset mutation controls in disposable copies; no production edits.

A control passes only when an existing test reaches an AssertionError. Parser,
loader, missing-dependency and other failures do NOT count as detection.
This is not a mutation test of the real Bend checker or emitted backend.
"""
from __future__ import annotations
import argparse,hashlib,importlib.util,json,os,re,shutil,subprocess,sys
from pathlib import Path
LIB=Path(__file__).resolve().parents[1];ROOT=LIB.parents[3]
MUTATIONS=[('opacity_floor','MaskedLayer.bend',
 'U32.add(U32.mul(alpha, U32.min(opacity, 255)), 127)',
 'U32.add(U32.mul(alpha, U32.min(opacity, 255)), 0)', 'alpha-pipeline.ts'),
 ('raw_alpha_instead_of_red','assets/RgbaImage.bend',
 'Con{U32.shln(a, 16n), masks_rev}', 'Con{a, masks_rev}', 'rgba-codec.ts')]
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',type=Path,default=ROOT/'.artifacts/review-negative');a=ap.parse_args();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
    spec=importlib.util.spec_from_file_location('lower',LIB/'tools/portable/lower.py');lower=importlib.util.module_from_spec(spec);spec.loader.exec_module(lower)
    receipts=[]
    for name,file,old,new,test in MUTATIONS:
        scratch=out/name;root=scratch/'copy';root.mkdir(parents=True,exist_ok=True)
        for src in (ROOT/'bend2/lib').rglob('*.bend'):
            dst=root/src.relative_to(ROOT);dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
        target=root/'bend2/lib/graphics/v2'/file;original=target.read_bytes();text=original.decode()
        if text.count(old)!=1:raise ValueError('Mutation anchor must be unique: '+file)
        target.write_text(text.replace(old,new));changed=target.read_bytes()
        src=LIB/'tests/review'/test;body=src.read_text();bindings={}
        for alias,path in re.findall(r"import\s+(\w+)\s+from\s+['\"]([^'\"]+\.bend)['\"];?",body):
            actual=(src.parent/path).resolve();entry=root/actual.relative_to(ROOT);exports=sorted(set(re.findall(r'\b'+re.escape(alias)+r'\.(\w+)\s*\(',body)))
            module=scratch/(alias+'.mjs');bindings[alias]=lower.Lower(root).emit(entry,exports,module)
            body=body.replace("'"+path+"'","'./"+module.name+"'")
        script=scratch/test;script.write_text(body);shutil.copy2(LIB/'tests/review/helpers.ts',scratch/'helpers.ts')
        cmd=['node','--experimental-strip-types',str(script)];run=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=120)
        (scratch/'stdout.txt').write_text(run.stdout);(scratch/'stderr.txt').write_text(run.stderr)
        detected=run.returncode!=0 and 'AssertionError [ERR_ASSERTION]' in run.stderr
        receipts.append({'name':name,'file':file,'replacement':{'from':old,'to':new},'command':cmd,'exit_code':run.returncode,'expected_assertion_failure_detected':detected,
                         'original_source_sha256':hashlib.sha256(original).hexdigest(),'mutated_source_sha256':hashlib.sha256(changed).hexdigest(),
                         'test_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'stderr':run.stderr,'source_bindings':bindings})
        if (LIB/file).read_bytes()!=original:raise RuntimeError('Production source changed unexpectedly')
    report={'ok':all(r['expected_assertion_failure_detected'] for r in receipts),'controls':receipts,
            'scope':'Two actual source mutations in scratch copies, executed only via serial non-authoritative source subset. No real compiler/proof mutation result.'}
    (out/'negative-controls.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'ok':report['ok'],'detected':sum(r['expected_assertion_failure_detected'] for r in receipts),'scope':report['scope']}));sys.exit(0 if report['ok'] else 1)
if __name__=='__main__':main()
