import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepare, root, derived, sha } from './prepare.mjs';
process.env.BEND_NO_TELEMETRY='1';
globalThis.fetch=async()=>{throw Error('no network in isolated worker diagnostic');};
const compilerBinding=prepare();
const bend=await import(pathToFileURL(path.join(derived,'bend2/bend.ts')).href);
const comp=await import(pathToFileURL(path.join(derived,'bend2/comp.ts')).href);
try {
  const book=bend.book_nil();
  await bend.book_load(book,path.join(root,'bend2/toolchain-patches/2035/workers/fixture.bend'),'',new Map());
  bend.book_valid(book,0);
  const exports=['choose','serial','echo','maximum','closure','array_echo','array_required','array_never','primitive','lifted','delayed'];
  const build=comp.js_worker_lib(book,exports,{mode:'required-only',policy:'strict'});
  assert.ok(!Object.values(build.files).some(source=>source.includes('\x01')||source.includes('\x02')),'unresolved deferred call marker');
  assert.throws(()=>comp.js_lib(book,['choose'],{policy:'strict'}),/required worker disabled/);
  const target=fs.mkdtempSync(path.join(derived,'diagnostic-'));
  for(const [name,source] of Object.entries(build.files)) fs.writeFileSync(path.join(target,name),source,{flag:'wx'});
  const api=await import(pathToFileURL(path.join(target,build.entry)).href);
  const tag=k=>bend.name_key(book.ctrs[k].k);
  const tip=value=>({$:tag('fixture-tree:Tip'),value});
  const branch=(left,right)=>({$:tag('fixture-tree:Branch'),left,right});
  const leaf=tip(4n), tree=branch(leaf,branch(leaf,tip(7n)));
  const results=[];
  for(const transport of ['clone','packed']) {
    const session=api.createSession({workers:3,transport,trace:true});
    try {
      assert.equal(await session.call('choose',[tree]),88n);
      assert.ok(session.stats().remoteJobs>=2);
      const trace=session.trace();
      const witnesses=trace.filter(e=>e.kind==='witness');
      assert.ok(witnesses.length>0);
      const workers=new Set(trace.filter(e=>e.kind==='started').map(e=>e.worker));
      assert.ok(workers.size<=2,'source cap exceeded');
      const before=session.stats().remoteJobs;
      assert.equal(await session.call('serial',[tree]),87n);
      assert.equal(session.stats().remoteJobs,before,'never dispatched');
      const copy=await session.call('echo',[tree]);
      assert.deepEqual(copy,tree); assert.notEqual(copy,tree); assert.equal(copy.left,copy.right.left);
      assert.equal(await session.call('maximum',[281474976710655n]),281474976710655n);
      assert.equal(await session.call('closure',[tree]),87n);
      const array=[4n,7n];
      const arrayCopy=await session.call('array_echo',[array]);
      assert.deepEqual(arrayCopy,array);assert.notEqual(arrayCopy,array);
      assert.deepEqual(array,[4n,7n],'public array mutated during local Nat conversion');
      const localBefore=session.stats().remoteJobs;
      await assert.rejects(session.call('array_required',[array,tree]),error=>error.code==='required_local_boundary');
      assert.deepEqual(await session.call('array_never',[array,tree]),[87n,7n]);
      assert.equal(session.stats().remoteJobs,localBefore);
      assert.equal(await session.call('primitive',[4n,7n]),11n);
      assert.ok(session.stats().remoteJobs>localBefore,'intrinsic required metadata was lost');
      assert.equal(await session.call('lifted',[4n,7n]),11n);
      await assert.rejects(session.call('maximum',[281474976710656n]));
      await assert.rejects(session.call('maximum',[1]));
      const cyclic=branch(leaf,null);cyclic.right=cyclic;
      await assert.rejects(session.call('echo',[cyclic]));
      const controller=new AbortController();controller.abort();
      await assert.rejects(session.call('choose',[tree],{signal:controller.signal}));
      const inflight=session.submit('delayed',[50000000n]);
      const deadline=performance.now()+5000;
      while(!session.trace().some(e=>e.kind==='started'&&e.invocation===inflight.id)) {
        assert.ok(performance.now()<deadline,'cancellation helper never started');
        await new Promise(resolve=>setTimeout(resolve,1));
      }
      assert.equal(inflight.cancel(),true);
      await assert.rejects(inflight.promise);
      assert.equal(await session.call('choose',[tree]),88n);
      assert.equal(session.stats().activeInvocations,0);
      results.push({transport,stats:session.stats(),trace});
    } finally { session.close(); }
    results.at(-1).postClose=session.stats();
    assert.equal(session.stats().inFlight,0,'close retained a running helper job');
  }
  const unavailable=api.createSession({workers:0});
  try { assert.equal(await unavailable.call('serial',[tree]),87n); await assert.rejects(unavailable.call('choose',[tree])); }
  finally { unavailable.close(); }
  const permissive=api.createSession({workers:0,policy:'permissive'});
  try {
    const array=[4n,7n];
    assert.deepEqual(await permissive.call('array_required',[array,tree]),[87n,7n]);
    assert.deepEqual(array,[4n,7n]);
    assert.ok(permissive.diagnostics().some(d=>d.reason==='require_unfulfilled:local_boundary'));
  } finally {permissive.close();}
  const bad=api.createSession({workers:1,workerURL:new URL('./absent.worker.mjs',pathToFileURL(target+'/'))});
  try { await assert.rejects(bad.call('choose',[tree])); } finally { bad.close(); }
  const malformed=api.createSession({workers:1,workerFactory:(url,options)=>{
    const worker=new Worker(url,options), listeners=new Map();
    return {
      addEventListener(type,listener) {
        const wrapped=type==='message'?event=>listener({data:event.data.kind==='result'?{...event.data,value:1n}:event.data}):listener;
        listeners.set(listener,wrapped);worker.addEventListener(type,wrapped);
      },
      removeEventListener(type,listener) {worker.removeEventListener(type,listeners.get(listener));},
      postMessage(...args) {worker.postMessage(...args);},
      terminate() {worker.terminate();},
    };
  }});
  try {
    await assert.rejects(malformed.call('primitive',[4n,7n]),error=>error.code==='input_shape');
    assert.equal(malformed.stats().closed,true,'malformed helper result silently retried');
  } finally {malformed.close();}
  const upstreamBend=await import(pathToFileURL(path.join(root,'.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/bend.ts')).href);
  const upstreamComp=await import(pathToFileURL(path.join(root,'.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/comp.ts')).href);
  const plain=path.join(root,'bend2/toolchain-patches/2035/workers/fixture-plain.bend');
  const pbook=bend.book_nil(), ubook=upstreamBend.book_nil();
  await bend.book_load(pbook,plain,'',new Map());bend.book_valid(pbook,0);
  await upstreamBend.book_load(ubook,plain,'',new Map());upstreamBend.book_valid(ubook,0);
  assert.equal(comp.js_lib(pbook),upstreamComp.js_lib(ubook));
  assert.equal(comp.compile_book(pbook),upstreamComp.compile_book(ubook));
  const receipt={ok:true,target,engine:{bun:process.versions.bun,platform:process.platform,executableSha256:sha(fs.readFileSync(process.execPath))},compiler:compilerBinding.hashes,fixtures:Object.fromEntries(['diagnostic.mjs','fixture.bend','fixture-tree.bend','fixture-plain.bend'].map(name=>[name,sha(fs.readFileSync(path.join(root,'bend2/toolchain-patches/2035/workers',name)))])),program:build.manifest.program,functions:build.manifest.functions.length,sites:build.manifest.sites,results,ordinaryJsAndC:'byte-identical',hashes:Object.fromEntries(Object.entries(build.files).map(([name,source])=>[name,sha(source)]))};
  fs.writeFileSync(path.join(target,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({ok:true,target,program:receipt.program,compiler:Object.fromEntries(['bend.ts','comp.ts','web_runtime.js'].map(name=>[name,compilerBinding.hashes[name]])),functions:receipt.functions,ordinaryJsAndC:receipt.ordinaryJsAndC,results:results.map(({transport,stats})=>({transport,stats}))}));
} catch(e) { console.error(e?.$==='Err'?bend.err_show(e):e); process.exitCode=1; }
