#!/usr/bin/env python3
"""Reproduce native full-pixel checks and a controlled four-walk/gather benchmark.

Requires the exact clean pinned compiler, Node and clang. Uses --gpu off.
Generated C, binaries and the before-variant library stay in ignored .artifacts.
Timing includes process startup, scene preparation, 16 render/checksum rounds
and output. Configurations alternate across sample rounds; no speed thresholds.
"""
from __future__ import annotations
import argparse, hashlib, json, os, platform, shutil, statistics, subprocess, time
from pathlib import Path
LIB=Path(__file__).resolve().parents[1];ROOT=LIB.parents[3]

def sha(path: Path) -> str:
    """Hash exact artifacts for source/C/binary traceability."""
    return hashlib.sha256(path.read_bytes()).hexdigest()

def call(command: list[str], cwd: Path, output: Path, env: dict[str,str]) -> subprocess.CompletedProcess:
    """Run a bounded compiler/build/reference step and retain both streams."""
    result=subprocess.run(command,cwd=cwd,env=env,text=True,capture_output=True,timeout=300)
    output.with_suffix('.stdout.txt').write_text(result.stdout);output.with_suffix('.stderr.txt').write_text(result.stderr)
    if result.returncode:raise RuntimeError(f'Failed {command}: see {output}')
    return result

def main() -> None:
    """Measure an exact source-isolated A/B and independently compare native pixels."""
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--samples',type=int,default=5);ap.add_argument('--output',type=Path,default=ROOT/'.artifacts/graphics-native-expansion-local')
    args=ap.parse_args()
    if args.samples<3:raise SystemExit('At least three measured samples are required')
    out=args.output.resolve();out.mkdir(parents=True,exist_ok=True);build=ROOT/'.artifacts/expansion-native';build.mkdir(parents=True,exist_ok=True)
    compiler=Path(os.environ.get('BEND_COMPILER',ROOT/'.artifacts/toolchains/bend')).resolve();env=dict(os.environ,BEND_NO_TELEMETRY='1',BEND_COMPILER=str(compiler))
    before=build/'before/lib';shutil.rmtree(before.parent,ignore_errors=True);shutil.copytree(ROOT/'bend2/lib',before,ignore=shutil.ignore_patterns('__pycache__'))
    baseline=LIB/'review-expansion/experiments/RgbaSample-four-walks.bend.txt';shutil.copyfile(baseline,before/'graphics/v2/RgbaSample.bend')
    targets={'BeforeGather':before/'graphics/v2/bench/NativePlanSerial.bend',**{n:LIB/f'bench/{n}.bend' for n in ['NativePlanSerial','NativePlanCpu1','NativePlanCpu2','NativePlanCpu3']},**{n:LIB/f'tests/expansion/{n}.bend' for n in ['NativePixels','NativePixelsCpu','NativePixelsOffload']}}
    artifacts={}
    for name,source in targets.items():
        c=build/f'{name}.c';binary=build/name
        command=['node','--experimental-strip-types',str(LIB/'tools/actual_compiler.mjs'),'c',str(source),str(c)]
        call(command,ROOT,out/f'{name}-emit',env)
        flags=['clang','-std=c11','-O3',str(c),'-lpthread','-lm','-o',str(binary)];call(flags,ROOT,out/f'{name}-build',env)
        artifacts[name]={'entrypoint':str(source),'emit_command':command,'compile_command':flags,'c_sha256':sha(c),'binary_sha256':sha(binary)}
    env['PIXEL_OUTPUT']=str(out/'reference.json')
    call(['node','--stack-size=8192','--experimental-strip-types','--import','./main.ts',str(LIB/'tests/expansion/native-pixels.mjs')],compiler/'bend2',out/'js-pixel-reference',env)
    reference=json.loads((out/'reference.json').read_text());pixel_records=[]
    for name in ['NativePixels','NativePixelsCpu','NativePixelsOffload']:
        for threads in [1,4]:
            command=[str(build/name),'--threads',str(threads),'--gpu','off'];p=call(command,ROOT,out/f'{name}-t{threads}',env)
            actual=json.loads(p.stdout)
            if actual!=reference:raise AssertionError(f'Native pixel mismatch: {name}/{threads}')
            pixel_records.append({'name':name,'threads':threads,'pixels':len(actual),'exact':True,'command':command,'output_sha256':hashlib.sha256(p.stdout.encode()).hexdigest()})
    affinity=sorted(os.sched_getaffinity(0))[:4] if hasattr(os,'sched_getaffinity') else []
    prefix=['taskset','-c',','.join(map(str,affinity))] if affinity and shutil.which('taskset') else []
    configurations=[('BeforeGather',1),('NativePlanSerial',1),('NativePlanCpu1',1),('NativePlanCpu1',4),('NativePlanCpu2',4),('NativePlanCpu3',4)]
    rows=[{'name':n,'threads':t,'command':prefix+[str(build/n),'--threads',str(t),'--gpu','off'],'samples_s':[],'outputs':[],**artifacts[n]} for n,t in configurations]
    # Finish compilation and references before timing. One warmup per process
    # configuration; rotate then reverse traversal to expose order effects.
    for row in rows:
        p=subprocess.run(row['command'],env=env,text=True,capture_output=True,check=True,timeout=120);row['warmup_output']=p.stdout.strip()
    for round_index in range(args.samples):
        order=list(range(len(rows)));order=order[round_index%len(rows):]+order[:round_index%len(rows)]
        if round_index%2:order.reverse()
        for index in order:
            row=rows[index];start=time.perf_counter();p=subprocess.run(row['command'],env=env,text=True,capture_output=True,check=True,timeout=120)
            row['samples_s'].append(time.perf_counter()-start);row['outputs'].append(p.stdout.strip());row['last_stderr']=p.stderr
        print('Measured round',round_index+1,flush=True)
    outputs={value for row in rows for value in row['outputs']+[row['warmup_output']]}
    if len(outputs)!=1:raise AssertionError('Native benchmark checksum disagreement')
    for row in rows:row['median_s']=statistics.median(row['samples_s'])
    report={'ok':True,'method':__doc__,'samples':args.samples,'frames_per_process':16,'affinity':affinity,'cpu_quota':Path('/sys/fs/cgroup/cpu.max').read_text().strip() if Path('/sys/fs/cgroup/cpu.max').exists() else None,'memory_limit_bytes':Path('/sys/fs/cgroup/memory.max').read_text().strip() if Path('/sys/fs/cgroup/memory.max').exists() else None,'cpu_model':next((s.split(':',1)[1].strip() for s in Path('/proc/cpuinfo').read_text().splitlines() if s.startswith('model name')),None) if Path('/proc/cpuinfo').exists() else None,'platform':platform.platform(),'clang':subprocess.check_output(['clang','--version'],text=True).splitlines()[0],'before_sampler_sha256':sha(baseline),'after_sampler_sha256':sha(LIB/'RgbaSample.bend'),'pixel_comparisons':pixel_records,'artifacts':artifacts,'results':rows,'limits':'Native CPU only. One workload and finite full-pixel fixture, not a general F32/GPU theorem. No browser upload. No claim about users hardware.'}
    (out/'summary.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'ok':True,'pixel_comparisons':sum(r['pixels'] for r in pixel_records),'medians_s':[(r['name'],r['threads'],r['median_s']) for r in rows]}),flush=True)

if __name__=='__main__':main()
