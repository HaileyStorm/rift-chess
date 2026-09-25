#!/usr/bin/env python3
"""Build unmodified-compiler native CPU tests and time stable-pose sprite caching.

No GPU device is used. Whole-process times include initialization, preparation,
24 render/checksum rounds and output. Exact full-pixel tests are separate from
performance checksums. All compiler/build streams and commands are retained.
"""
from __future__ import annotations
import argparse, hashlib, json, os, platform, shutil, statistics, subprocess, time
from pathlib import Path
LIB=Path(__file__).resolve().parents[1]; ROOT=LIB.parents[3]

def sha(path: Path) -> str:
    """Hash final source/C/binary bytes for receipt traceability."""
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(command: list[str],cwd: Path,out: Path,env: dict[str,str],timeout: int=300) -> subprocess.CompletedProcess:
    """Retain stdout/stderr and a command receipt, including failed executions."""
    start=time.perf_counter()
    result=subprocess.run(command,cwd=cwd,env=env,capture_output=True,text=True,timeout=timeout)
    out.with_suffix('.stdout.txt').write_text(result.stdout);out.with_suffix('.stderr.txt').write_text(result.stderr)
    out.with_suffix('.command.json').write_text(json.dumps({'command':command,'cwd':str(cwd),'exit_code':result.returncode,'seconds':time.perf_counter()-start},indent=2)+'\n')
    if result.returncode:raise RuntimeError(f'Failed: {command}; see {out}')
    return result

def main() -> None:
    """Run complete native fixture parity and rotated comparative measurements."""
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--samples',type=int,default=5);ap.add_argument('--output',type=Path,default=ROOT/'.artifacts/graphics-native-third-local');args=ap.parse_args()
    if args.samples<3:ap.error('samples must be at least 3')
    out=args.output.resolve();out.mkdir(parents=True,exist_ok=True);build=ROOT/'.artifacts/third-native';build.mkdir(parents=True,exist_ok=True)
    compiler=Path(os.environ.get('BEND_COMPILER',ROOT/'.artifacts/toolchains/bend')).resolve();env=dict(os.environ,BEND_COMPILER=str(compiler),BEND_NO_TELEMETRY='1');artifacts={}
    targets={**{n:LIB/f'tests/third/{n}.bend' for n in ['NativePixels','NativePixelsCpu','NativePixelsOffload']},**{n:LIB/f'bench/third/{n}.bend' for n in ['Immediate','CachedSerial','CachedCpu']}}
    for name,source in targets.items():
        c=build/f'{name}.c';binary=build/name
        emit=['node','--experimental-strip-types',str(LIB/'tools/actual_compiler.mjs'),'c',str(source),str(c)]
        run(emit,ROOT,out/f'{name}-emit',env)
        flags=['clang','-std=c11','-O3',str(c),'-lpthread','-lm','-o',str(binary)];run(flags,ROOT,out/f'{name}-build',env)
        artifacts[name]={'source':str(source.relative_to(ROOT)),'source_sha256':sha(source),'emit_command':emit,'compile_command':flags,'c_sha256':sha(c),'binary_sha256':sha(binary)}
        print('Built',name,flush=True)
    env['PIXEL_OUTPUT']=str(out/'reference.json');run(['node','--stack-size=8192','--experimental-strip-types','--import','./main.ts',str(LIB/'tests/third/native-pixels.mjs')],compiler/'bend2',out/'js-reference',env)
    expected=json.loads((out/'reference.json').read_text());checks=[]
    for name in ['NativePixels','NativePixelsCpu','NativePixelsOffload']:
        for threads in [1,4]:
            command=[str(build/name),'--threads',str(threads),'--gpu','off'];p=run(command,ROOT,out/f'{name}-t{threads}',env)
            actual=json.loads(p.stdout)
            if actual!=expected:
                differences=[{'index':i,'js':a,'native':b} for i,(a,b) in enumerate(zip(expected,actual)) if a!=b]
                (out/f'{name}-differences.json').write_text(json.dumps({'js_length':len(expected),'native_length':len(actual),'differences':differences},indent=2));raise AssertionError(f'{name}/{threads}: native pixels disagree')
            checks.append({'name':name,'threads':threads,'pixels':len(actual),'exact':True,'command':command})
    affinity=sorted(os.sched_getaffinity(0))[:4] if hasattr(os,'sched_getaffinity') else []
    prefix=['taskset','-c',','.join(map(str,affinity))] if affinity and shutil.which('taskset') else []
    rows=[{'name':n,'threads':t,'command':prefix+[str(build/n),'--threads',str(t),'--gpu','off'],'samples_s':[],'outputs':[]} for n,t in [('Immediate',1),('CachedSerial',1),('CachedCpu',1),('CachedCpu',4)]]
    for row in rows:row['warmup_output']=subprocess.check_output(row['command'],env=env,text=True,timeout=120).strip()
    for i in range(args.samples):
        order=list(range(len(rows)));order=order[i%len(rows):]+order[:i%len(rows)]
        if i%2:order.reverse()
        for j in order:
            row=rows[j];start=time.perf_counter();p=subprocess.run(row['command'],env=env,capture_output=True,text=True,check=True,timeout=120);row['samples_s'].append(time.perf_counter()-start);row['outputs'].append(p.stdout.strip());row['stderr']=p.stderr
        print('Measured round',i+1,flush=True)
    if len({v for row in rows for v in row['outputs']+[row['warmup_output']]})!=1:raise AssertionError('Benchmark checksums disagree')
    for row in rows:row['median_s']=statistics.median(row['samples_s'])
    report={'ok':True,'method':__doc__,'artifacts':artifacts,'pixel_checks':checks,'samples':args.samples,'affinity':affinity,'cpu_quota':Path('/sys/fs/cgroup/cpu.max').read_text().strip(),'memory_limit':Path('/sys/fs/cgroup/memory.max').read_text().strip(),'platform':platform.platform(),'cpu_model':next((s.split(':',1)[1].strip() for s in Path('/proc/cpuinfo').read_text().splitlines() if s.startswith('model name')),None),'clang':subprocess.check_output(['clang','--version'],text=True).splitlines()[0],'results':rows,'limits':'Native CPU only; explicit offload used --gpu off. Full-pixel finite fixtures are separate from benchmark checksums. Bun unavailable. One stable-pose workload, not user-hardware or universal speed claims.'}
    (out/'summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'ok':True,'pixels':sum(x['pixels'] for x in checks),'times':[(r['name'],r['threads'],r['median_s']) for r in rows]}),flush=True)

if __name__=='__main__':main()
