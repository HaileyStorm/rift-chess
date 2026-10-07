// Independent policy results and reordered authentic module-Worker replies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {prepare,root,derived,sha} from '../prepare.mjs';
process.env.BEND_NO_TELEMETRY='1';
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw Error('no network in Worker semantics');};
const output=path.resolve(root,process.argv[2]);
assert.ok(process.argv[2]&&process.argv.length===3);
assert.ok(output.startsWith(path.join(root,'.artifacts/bend2/2035-preview/stationary-motion-20261006')+path.sep));
assert.equal(fs.realpathSync(path.dirname(output)),path.dirname(output));
fs.mkdirSync(output); // Exclusive run identity; no overwrite or replay.
const binding=prepare(),bend=await import(pathToFileURL(path.join(derived,'bend2/bend.ts')).href);
const comp=await import(pathToFileURL(path.join(derived,'bend2/comp.ts')).href);
try {
const fixture=fileURLToPath(new URL('./policies.bend',import.meta.url));
const book=bend.book_nil();await bend.book_load(book,fixture,'',new Map());bend.book_valid(book,0);
const exports=['plain','never_root','restored','argument_scope','remote_island','nested_require','conflict','conflict_remote','conditional_never'];
const build=comp.js_worker_lib(book,exports,{mode:'required-only',policy:'strict'});
for(const [file,bytes]of Object.entries(build.files))fs.writeFileSync(path.join(output,file),bytes,{flag:'wx'});
const api=await import(pathToFileURL(path.join(output,build.entry)).href),results=[];
function clean(session){session.close();const s=session.stats();assert.equal(s.closed,true);for(const key of ['inFlight','ready','activeInvocations','snapshotBytes','completedBytes','queuedBytes','inFlightBytes'])assert.equal(s[key],0,key);return s;}
async function until(predicate){const end=performance.now()+5000;while(!predicate()){assert.ok(performance.now()<end,'authentic replies not observed');await new Promise(r=>setTimeout(r,1));}}
for(const transport of ['clone','packed']){
 const s=api.createSession({workers:3,transport,trace:true});
 try{
  for(const [name,expected,jobs]of [['never_root',19,0],['restored',20,1],['argument_scope',20,1],['remote_island',19,1],['nested_require',19,1]]){
   const before=s.stats();assert.equal(await s.call(name,[18]),expected);
   assert.equal(s.stats().remoteJobs-before.remoteJobs,jobs,name);
  }
  assert.ok(s.trace().some(e=>e.kind==='remote_region'&&e.event==='never'));
  assert.ok(s.trace().some(e=>e.kind==='remote_region'&&e.event==='coalesced_require'&&e.cap===1));
  for(const [name,jobs]of [['conflict',0],['conflict_remote',1]]){
   const before=s.stats().remoteJobs;await assert.rejects(s.call(name,[18]),e=>e.code==='policy_conflict');
   assert.equal(s.stats().remoteJobs-before,jobs);assert.equal(s.stats().closed,false);
  }
  const before=s.stats().remoteJobs;assert.equal(await s.call('conditional_never',[false,18]),18);
  await assert.rejects(s.call('conditional_never',[true,18]),e=>e.code==='policy_conflict');assert.equal(s.stats().remoteJobs,before);
  assert.equal(await s.call('restored',[28]),30,'session remains usable after policy errors');
  results.push({case:'dynamic-policy',transport,stats:s.stats(),trace:s.trace()});
 }finally{const post=clean(s);if(results.at(-1)?.case==='dynamic-policy'&&results.at(-1)?.transport===transport)results.at(-1).postClose=post;}
 // Hold only actual result messages; handshake and started messages pass through.
 let holding=true;const held=[],delivered=[],listeners=new Map();let created=0,removed=0,terminated=0;
 const concurrent=api.createSession({workers:3,transport,trace:true,workerFactory:(url,options)=>{
  created++;const worker=new Worker(url,options),own=new Map();
  return {addEventListener(type,listener){const wrapped=type==='message'?event=>{
    if(event.data.kind==='result'&&holding){held.push({listener,event});return;}listener(event);
   }:listener;own.set(listener,wrapped);worker.addEventListener(type,wrapped);listeners.set(listener,type);},
   removeEventListener(type,listener){removed++;worker.removeEventListener(type,own.get(listener));listeners.delete(listener);},
   postMessage(...args){worker.postMessage(...args);},terminate(){terminated++;worker.terminate();}};
 }});
 try{
  const calls=[['remote_island',[30],31],['nested_require',[60],61],['restored',[90],92],['never_root',[120],121],['plain',[150],151]];
  const handles=calls.map(([name,args])=>concurrent.submit(name,args));
  const settled=Promise.all(handles.map(h=>h.promise)); // Attach immediately, including any rejection.
  await until(()=>held.length>=2);
  const originalOrder=held.map(x=>({job:x.event.data.job,invocation:x.event.data.invocation}));
  holding=false;const packets=held.splice(0).reverse();
  for(const {listener,event}of packets){
   const m=event.data;listener({data:{...m,epoch:m.epoch-1}}); // Stale authentic envelope copy.
   listener(event);listener(event); // Authentic result, then duplicate.
   delivered.push({job:m.job,invocation:m.invocation});
  }
  assert.deepEqual(await settled,calls.map(x=>x[2]));
  assert.deepEqual(delivered,[...originalOrder].reverse(),'reply delivery was not reversed');
  const trace=concurrent.trace(),dispatch=trace.filter(e=>e.kind==='dispatch');
  for(const index of [3,4])assert.ok(!dispatch.some(e=>e.invocation===handles[index].id),'never/plain root inherited require permission');
  for(const index of [0,1,2])assert.ok(dispatch.some(e=>e.invocation===handles[index].id),'required root lacked an actual helper');
  assert.equal(concurrent.stats().remoteJobs,3);assert.equal(created,3);
  assert.ok(concurrent.stats().ignoredReplies>=packets.length*2);
  for(const region of trace.filter(e=>e.kind==='region')){
   const workers=new Set(dispatch.filter(e=>e.invocation===region.invocation&&e.regions.includes(region.region)).map(e=>e.worker));
   assert.ok(workers.size>=1&&workers.size<=region.cap);
  }
  results.push({case:'concurrent-policy-reply-identity',transport,originalOrder,delivered,stats:concurrent.stats(),trace});
 }finally{const post=clean(concurrent);assert.equal(listeners.size,0);assert.equal(terminated,created);if(results.at(-1)?.case==='concurrent-policy-reply-identity'&&results.at(-1)?.transport===transport)results.at(-1).postClose={...post,created,removed,terminated};}
 const permissive=api.createSession({workers:3,transport,policy:'permissive'});
 try{for(let i=0;i<3;i++)assert.equal(await permissive.call('conflict',[18]),19);
  assert.equal(permissive.stats().remoteJobs,0);assert.equal(permissive.diagnostics().filter(x=>x.reason==='require_unfulfilled:policy_conflict').length,1);
  results.push({case:'permissive-never',transport,stats:permissive.stats(),diagnostics:permissive.diagnostics()});
 }finally{const post=clean(permissive);if(results.at(-1)?.case==='permissive-never'&&results.at(-1)?.transport===transport)results.at(-1).postClose=post;}
}
assert.equal(networkCalls,0);
const receipt={schema:'rift-worker-policy-semantics/1',passed:true,compiler:binding.hashes,fixture:{path:path.relative(root,fixture).split(path.sep).join('/'),sha256:sha(fs.readFileSync(fixture))},runnerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),engine:{bun:process.versions.bun,executableSha256:sha(fs.readFileSync(process.execPath))},program:build.manifest.program,files:Object.fromEntries(Object.entries(build.files).map(([n,b])=>[n,sha(b)])),networkCalls,results,scope:'Fresh checked/emitted candidate source and real Windows module-Worker policy/reply semantics only. No full107 parity, browser/native/kernel/device/adoption acceptance.'};
fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,output,receiptSha256:sha(fs.readFileSync(path.join(output,'receipt.json'))),cases:results.length,networkCalls}));
} catch(error) {
 const message=error?.$==='Err'?bend.err_show(error):String(error?.stack??error);
 console.error(message.slice(0,32000));process.exitCode=1;
}
