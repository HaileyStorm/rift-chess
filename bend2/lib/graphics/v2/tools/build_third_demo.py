#!/usr/bin/env python3
"""Emit the review demo from exact Bend sources; no compiler modifications or font files."""
from pathlib import Path
import hashlib,json,os,subprocess
LIB=Path(__file__).resolve().parents[1];ROOT=LIB.parents[3]

def main() -> None:
    """Retain the compiler's complete source-closure receipts for every demo module."""
    output=LIB/'review-third/demo/compiled';output.mkdir(parents=True,exist_ok=True)
    receipts=LIB/'review-third/receipts/demo-build-local';receipts.mkdir(parents=True,exist_ok=True);records=[]
    sources=[LIB/'third'/f'{name}.bend' for name in ['Premul','Brush','Shape','PathFill','Surface','Effects','Raster','Paint','ImageShift','GlyphLayer']]+[LIB/'Stroke.bend',LIB/'tests/third/NativePixels.bend']
    for source in sources:
        destination=output/f'{source.stem}.mjs';command=['node','--experimental-strip-types',str(LIB/'tools/actual_compiler.mjs'),'js',str(source),str(destination)]
        result=subprocess.run(command,cwd=ROOT,env=dict(os.environ,BEND_NO_TELEMETRY='1'),capture_output=True,text=True,timeout=180)
        (receipts/f'{source.stem}.stdout.txt').write_text(result.stdout);(receipts/f'{source.stem}.stderr.txt').write_text(result.stderr)
        if result.returncode:raise RuntimeError(f'Demo emission failed: {source}; see {receipts}')
        record=json.loads(result.stdout.strip().splitlines()[-1]);record.update(command=command,output=str(destination.relative_to(ROOT)),output_sha256=hashlib.sha256(destination.read_bytes()).hexdigest());records.append(record)
    (output/'BUILD.json').write_text(json.dumps({'scope':'Actual pinned compiler emitted JavaScript, not a replacement renderer. Node host, not pinned Bun. No GPU backend.','modules':records},indent=2)+'\n')
    print(json.dumps({'ok':True,'modules':len(records)}))

if __name__=='__main__':main()
