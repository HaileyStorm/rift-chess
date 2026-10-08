// Independent policy results and reordered authentic module-Worker replies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {prepare,root,derived,sha} from '../prepare.mjs';
import {prepare as prepareCurrent} from '../prepare-current.mjs';
process.env.BEND_NO_TELEMETRY='1';
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw Error('no network in Worker semantics');};
const output=path.resolve(root,process.argv[2]);
const compilerOnly=process.argv[3]==='--compiler-only';
const saturationCandidate=process.argv[4]==='--saturation-candidate';
assert.ok(process.argv[2]&&process.argv.length===(compilerOnly?(saturationCandidate?5:4):3));
assert.ok(output.startsWith(path.join(root,'.artifacts/bend2/2035-preview/stationary-motion-20261006')+path.sep));
assert.equal(fs.realpathSync(path.dirname(output)),path.dirname(output));
fs.mkdirSync(output); // Exclusive run identity; no overwrite or replay.
const parent=saturationCandidate?prepare():prepareCurrent();
const verifyCandidate=saturationCandidate?(await import('./saturation-candidate.mjs')).verifySaturationCandidate:null;
const binding=verifyCandidate?verifyCandidate(parent):parent;
const bend=await import(pathToFileURL(path.join(binding.derived,'bend2/bend.ts')).href);
const comp=await import(pathToFileURL(path.join(binding.derived,'bend2/comp.ts')).href);
try {
if(compilerOnly){
 let workerConstructions=0;globalThis.Worker=class {constructor(){workerConstructions++;throw Error('no Worker construction in compiler-only corpus');}};
 const {runCompilerCorpus}=await import('./compiler-corpus.mjs');
 const corpus=await runCompilerCorpus({bend,comp,output,sha});assert.equal(networkCalls,0);assert.equal(workerConstructions,0);
 if(verifyCandidate)assert.deepEqual(verifyCandidate(parent),binding);
 const dependencies=Object.fromEntries(['compiler-corpus.mjs','compiler-fixture.bend',...(verifyCandidate?['saturation-candidate.mjs']:[])].map(n=>[n,sha(fs.readFileSync(fileURLToPath(new URL(n,import.meta.url))))]));
 const receipt={schema:'rift-worker-compiler-corpus/1',passed:true,compiler:binding.hashes,compilerLineage:binding.lineage??null,runnerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),dependencies,engine:{bun:process.versions.bun,executableSha256:sha(fs.readFileSync(process.execPath))},networkCalls,workerConstructions,...corpus,scope:'Checked current compiler-only parser, security/eligibility, equality/erasure and C emission controls. No Worker/native-C execution, full107, browser/proof/device/adoption acceptance.'};
 if(verifyCandidate)receipt.candidate={parentCompiler:binding.parentCompiler,changedFiles:binding.changedFiles,guardSha256:binding.guardSha256,rewriteSha256:binding.rewriteSha256,derived:binding.derived};
 fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({passed:true,output,receiptSha256:sha(fs.readFileSync(path.join(output,'receipt.json'))),cases:corpus.results.length,networkCalls,workerConstructions}));
}else{
const fixture=fileURLToPath(new URL('./policies.bend',import.meta.url));
const book=bend.book_nil();await bend.book_load(book,fixture,'',new Map());bend.book_valid(book,0);
const exports=['plain','never_root','restored','argument_scope','both_required','remote_island','nested_require','conflict','conflict_remote','conditional_never','snapshot','float_remote','text_remote','quad4','nested_caps'];
const build=comp.js_worker_lib(book,exports,{mode:'required-only',policy:'strict'});
for(const [file,bytes]of Object.entries(build.files))fs.writeFileSync(path.join(output,file),bytes,{flag:'wx'});
const api=await import(pathToFileURL(path.join(output,build.entry)).href),results=[];
function clean(session){session.close();const s=session.stats();assert.equal(s.closed,true);for(const key of ['inFlight','ready','activeInvocations','snapshotBytes','completedBytes','queuedBytes','inFlightBytes'])assert.equal(s[key],0,key);return s;}
async function until(predicate){const end=performance.now()+5000;while(!predicate()){assert.ok(performance.now()<end,'authentic replies not observed');await new Promise(r=>setTimeout(r,1));}}
// Instrument actual Workers without replacing their computation or handshake.
function harness({hold=false,workerURL=null,transform=null}={}){
 const h={held:[],created:0,removed:0,terminated:0,errors:0,listeners:new Map()};
 h.release=()=>{hold=false;return h.held.splice(0);};
 h.factory=(url,options)=>{
  h.created++;const worker=new Worker(workerURL??url,options),own=new Map();
  return {addEventListener(type,listener){const wrapped=event=>{
    if(type==='error')h.errors++;
    if(type==='message'&&event.data.kind==='result'){
     if(hold){h.held.push({listener,event});return;}
     if(transform){transform(listener,event);return;}
    }listener(event);
   };own.set(listener,wrapped);worker.addEventListener(type,wrapped);h.listeners.set(listener,type);},
   removeEventListener(type,listener){h.removed++;worker.removeEventListener(type,own.get(listener));h.listeners.delete(listener);},
   postMessage(...args){worker.postMessage(...args);},terminate(){h.terminated++;worker.terminate();}};
 };return h;
}
function retire(session,h){const post=clean(session);assert.equal(h.listeners.size,0);assert.equal(h.terminated,h.created);return {...post,created:h.created,removed:h.removed,terminated:h.terminated,errors:h.errors};}
const tag=k=>bend.name_key(book.ctrs[k].k),tip=value=>({$:tag('../fixture-tree:Tip'),value}),branch=(left,right)=>({$:tag('../fixture-tree:Branch'),left,right});
const faultFile='assigned-helper-fault.mjs';
const faultSource=`import './${Object.keys(build.files).find(n=>n.endsWith('.worker.mjs'))}';\naddEventListener('message',event=>{if(event.data.kind==='job')queueMicrotask(()=>{throw Error('intentional assigned-helper failure');});});\n`;
fs.writeFileSync(path.join(output,faultFile),faultSource,{flag:'wx'});
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
  const ownerBefore=s.stats(),ownerHandle=s.submit('both_required',[18]);
  assert.equal(await ownerHandle.promise,20,'required argument and callee arithmetic');
  const ownerTrace=s.trace().filter(e=>e.invocation===ownerHandle.id);
  const regions=ownerTrace.filter(e=>e.kind==='region'),jobs=ownerTrace.filter(e=>e.kind==='dispatch'),witnesses=ownerTrace.filter(e=>e.kind==='witness');
  const leafFunction=build.manifest.functions.find(f=>f.name==='leaf');assert.ok(leafFunction);const leafId=leafFunction.id;
  assert.equal(regions.length,2);assert.equal(jobs.length,2);assert.equal(witnesses.length,2);
  assert.equal(new Set(jobs.map(e=>e.job)).size,2);assert.equal(new Set(regions.map(e=>e.region)).size,2);
  for(let i=0;i<2;i++){
   const region=regions[i],job=jobs[i];assert.equal(region.functionId,leafId);assert.equal(job.functionId,leafId);
   assert.equal(region.waived,false);assert.deepEqual(job.regions,[region.region]);
   assert.deepEqual(witnesses.filter(e=>e.region===region.region).map(e=>e.job),[job.job]);
   const started=ownerTrace.filter(e=>e.kind==='started'&&e.job===job.job),result=ownerTrace.filter(e=>e.kind==='result'&&e.job===job.job);
   assert.equal(started.length,1);assert.equal(result.length,1);
   assert.ok(ownerTrace.indexOf(region)<ownerTrace.indexOf(job)&&ownerTrace.indexOf(job)<ownerTrace.indexOf(started[0])&&ownerTrace.indexOf(started[0])<ownerTrace.indexOf(result[0])&&ownerTrace.indexOf(result[0])<ownerTrace.indexOf(witnesses[i]));
  }
  assert.ok(ownerTrace.indexOf(witnesses[0])<ownerTrace.indexOf(regions[1]),'argument helper must finish before callee region entry');
  assert.ok(!ownerTrace.some(e=>e.event==='coalesced_require'));
  const ownerAfter=s.stats();for(const key of ['remoteJobs','requiredRegions','requiredWitnesses'])assert.equal(ownerAfter[key]-ownerBefore[key],2,key);
  results.push({case:'dynamic-policy',transport,bothRequired:{invocation:ownerHandle.id,expected:20,leafFunctionId:leafId,trace:ownerTrace,counterDeltas:Object.fromEntries(['remoteJobs','requiredRegions','requiredWitnesses'].map(k=>[k,ownerAfter[k]-ownerBefore[k]]))},stats:ownerAfter,trace:s.trace()});
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
  settled.catch(()=>{}); // Observe failures while authentic-reply waiting is in progress.
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
 const forkHarness=harness({hold:true}),forks=api.createSession({workers:4,transport,trace:true,workerFactory:forkHarness.factory});
 try{
  const handle=forks.submit('quad4',[1,2,3,4]);handle.promise.catch(()=>{});
  await until(()=>forkHarness.held.length===4);
  const packets=forkHarness.release(),identity=packets.map(x=>({job:x.event.data.job,invocation:x.event.data.invocation,fork:x.event.data.fork,slot:x.event.data.slot}));
  assert.ok(identity.every(x=>x.invocation===handle.id));assert.equal(new Set(identity.map(x=>x.fork)).size,2);
  for(const fork of new Set(identity.map(x=>x.fork)))assert.deepEqual(identity.filter(x=>x.fork===fork).map(x=>x.slot).sort(),[0,1]);
  const delivered=[];
  for(const {listener,event}of packets.reverse()){
   const m=event.data;listener({data:{...m,epoch:m.epoch-1}});listener(event);listener(event);
   delivered.push({job:m.job,invocation:m.invocation,fork:m.fork,slot:m.slot});
  }
  assert.equal(await handle.promise,2345,'reversed compound replies changed source-order arithmetic');
  assert.deepEqual(delivered,[...identity].reverse());assert.equal(forks.stats().remoteJobs,4);
  assert.ok(forks.stats().ignoredReplies>=8);assert.ok(forks.stats().expandedForks>0);
  const calls=[['nested_caps',[1,2,3,4],2345],['quad4',[2,3,4,5],3456],['nested_caps',[3,4,5,6],4567]];
  const handles=calls.map(([name,args])=>forks.submit(name,args));
  assert.deepEqual(await Promise.all(handles.map(h=>h.promise)),calls.map(x=>x[2]));
  const trace=forks.trace(),dispatch=trace.filter(e=>e.kind==='dispatch'),regions=trace.filter(e=>e.kind==='region'),helperSets=[];
  for(const region of regions){
   const helpers=[...new Set(dispatch.filter(e=>e.invocation===region.invocation&&e.regions.includes(region.region)).map(e=>e.worker))];
   assert.ok(helpers.length>=1&&helpers.length<=region.cap,'region used helpers beyond its cap');
   helperSets.push({invocation:region.invocation,region:region.region,cap:region.cap,helpers});
  }
  for(const index of [0,2]){
   const own=helperSets.filter(x=>x.invocation===handles[index].id);assert.equal(own.length,3);
   assert.ok(own.every(x=>x.cap===2));assert.equal(own[0].helpers.length,2,'outer two-helper region lacked both witnesses');
   assert.equal(dispatch.filter(e=>e.invocation===handles[index].id).length,4);
  }
  assert.equal(new Set(dispatch.filter(e=>e.invocation===handle.id).map(e=>e.worker)).size,4);
  assert.equal(forks.stats().requiredRegions,forks.stats().requiredWitnesses);assert.equal(forkHarness.created,4);assert.ok(forks.stats().maxInFlight<=4);
  results.push({case:'compound-fork-and-nested-caps',transport,identity,delivered,helperSets,expected:[2345,2345,3456,4567],stats:forks.stats(),trace});
 }finally{const post=retire(forks,forkHarness);if(results.at(-1)?.case==='compound-fork-and-nested-caps'&&results.at(-1)?.transport===transport)results.at(-1).postClose=post;}
 const snapshot=api.createSession({workers:2,transport,trace:true});
 try{
  const leaf=tip(4n),tree=branch(leaf,branch(leaf,tip(7n))),right=tree.right;
  const handle=snapshot.submit('snapshot',[tree]);handle.promise.catch(()=>{});
  leaf.value=100n;tree.right=tip(200n); // Synchronous mutation immediately after submission.
  assert.equal(await handle.promise,87n,'caller mutation changed the submitted value');
  assert.equal(leaf.value,100n);assert.equal(tree.right.value,200n);assert.equal(right.left,leaf);
  assert.equal(Object.isFrozen(tree),false);assert.equal(Object.isFrozen(leaf),false);
  assert.ok(snapshot.stats().remoteJobs>0);assert.ok(snapshot.trace().some(e=>e.kind==='started'));
  results.push({case:'submission-snapshot',transport,expected:'87',callerLeafAfter:'100',callerRightAfter:'200',stats:snapshot.stats(),trace:snapshot.trace()});
 }finally{const post=clean(snapshot);if(results.at(-1)?.case==='submission-snapshot'&&results.at(-1)?.transport===transport)results.at(-1).postClose=post;}
 const pendingHarness=harness({hold:true}),pending=api.createSession({workers:2,transport,trace:true,workerFactory:pendingHarness.factory});
 try{
  const handles=[10,20,30].map(n=>pending.submit('remote_island',[n]));
  const settled=Promise.allSettled(handles.map(h=>h.promise));
  await until(()=>pendingHarness.held.length===2);
  const before=pending.stats();assert.equal(before.activeInvocations,3);assert.equal(before.remoteJobs,2);
  const post=retire(pending,pendingHarness),outcomes=await settled;
  assert.ok(outcomes.every(x=>x.status==='rejected'&&x.reason.code==='closed'));
  for(const {listener,event}of pendingHarness.held)listener(event); // Actual delayed replies remain inert after close.
  assert.deepEqual(pending.stats(),postToStats(post));pending.close();
  await assert.rejects(pending.call('remote_island',[40]),e=>e.code==='closed');assert.equal(pendingHarness.created,2);
  results.push({case:'outstanding-close',transport,before,rejectionCodes:outcomes.map(x=>x.reason.code),heldActualReplies:pendingHarness.held.length,postClose:post});
 }finally{retire(pending,pendingHarness);}
 const fatalHarness=harness({hold:true,workerURL:pathToFileURL(path.join(output,faultFile))});
 const fatal=api.createSession({workers:1,transport,trace:true,workerFactory:fatalHarness.factory});
 try{
  await assert.rejects(fatal.call('remote_island',[50]),e=>e.code==='worker_error');
  assert.equal(fatalHarness.errors,1);assert.equal(fatal.stats().remoteJobs,1);assert.equal(fatal.stats().closed,true);
  const post=retire(fatal,fatalHarness);for(const {listener,event}of fatalHarness.held)listener(event);
  assert.deepEqual(fatal.stats(),postToStats(post));
  results.push({case:'assigned-helper-error',transport,postClose:post,trace:fatal.trace(),heldActualReplies:fatalHarness.held.length});
 }finally{retire(fatal,fatalHarness);}
 const wire=api.createSession({workers:1,transport,trace:true});
 try{
  for(const n of [-0,0,Math.fround(1/3)])assert.ok(Object.is(await wire.call('float_remote',[n]),n),'F32 bits changed');
  const text='Rift ☄️ \0 😀';assert.equal(await wire.call('text_remote',[text]),text);
  const jobs=wire.stats().remoteJobs;assert.equal(jobs,4);
  for(const n of [Infinity,-Infinity,NaN])await assert.rejects(wire.call('float_remote',[n]),e=>e.code==='required_nonfinite_input');
  for(const text of ['\ud800','\udc00'])await assert.rejects(wire.call('text_remote',[text]),e=>e.code==='input_shape');
  assert.equal(wire.stats().remoteJobs,jobs);assert.equal(wire.stats().closed,false);
  results.push({case:'float-string-wire',transport,floatValues:['-0','+0','fround(1/3)'],text,negativeCodes:['required_nonfinite_input','input_shape'],stats:wire.stats(),trace:wire.trace()});
 }finally{const post=clean(wire);if(results.at(-1)?.case==='float-string-wire'&&results.at(-1)?.transport===transport)results.at(-1).postClose=post;}
 const budgetHarness=harness(),budget=api.createSession({workers:1,transport,wire:{maxStringUnits:4},workerFactory:budgetHarness.factory});
 try{await assert.rejects(budget.call('text_remote',['12345']),e=>e.code==='wire_budget');assert.equal(budget.stats().remoteJobs,0);assert.equal(budgetHarness.created,0);
  results.push({case:'string-input-budget',transport,code:'wire_budget',postClose:retire(budget,budgetHarness)});
 }finally{retire(budget,budgetHarness);}
}
// Reply identity is checked before clone/packed decoding. Mutate one field in
// an authentic result once at this shared boundary; do not duplicate a packed
// decoder test or substitute synthetic computation for the real helpers.
const identityRejections=[];
for(const field of ['program','invocation','fork','slot','functionId','schemaId']){
 const h=harness({hold:true}),s=api.createSession({workers:4,transport:'clone',trace:true,workerFactory:h.factory});
 try{
  const owner=s.submit('quad4',[1,2,3,4]);owner.promise.catch(()=>{});
  await until(()=>h.held.length===4);
  const other=s.submit('remote_island',[90]);
  const settled=Promise.allSettled([owner.promise,other.promise]);
  await until(()=>s.stats().ready>0&&s.stats().queuedBytes>0);
  const packets=h.release(),first=packets[0],m=first.event.data;
  assert.equal(packets.length,4);assert.equal(m.invocation,owner.id);
  assert.equal(new Set(packets.map(p=>p.event.data.fork)).size,2);
  const replacement={
   program:(m.program[0]==='0'?'1':'0')+m.program.slice(1),
   invocation:other.id,
   fork:packets.find(p=>p.event.data.fork!==m.fork).event.data.fork,
   slot:m.slot===0?1:0,
   functionId:build.manifest.exports.plain,
   schemaId:build.manifest.exports.plain,
  }[field];
  assert.notEqual(replacement,m[field]);
  const changed={...m,[field]:replacement};
  assert.deepEqual(Object.keys(m).filter(k=>!Object.is(m[k],changed[k])),[field]);
  const before=s.stats();assert.equal(before.activeInvocations,2);assert.equal(before.remoteJobs,4);
  assert.ok(before.ready>0&&before.queuedBytes>0,'second invocation lacks queued continuation');
  first.listener({data:changed});
  const outcomes=await settled;
  assert.ok(outcomes.every(x=>x.status==='rejected'&&x.reason.code==='protocol'));
  assert.equal(s.stats().closed,true);assert.equal(s.stats().remoteJobs,4,'fatal identity mismatch retried work');
  const trace=s.trace();assert.ok(!trace.some(e=>e.kind==='result'||e.kind==='witness'),'mismatched result published a continuation or witness');
  // Observe automatic fatal retirement before an explicit close can mask it.
  const automatic=s.stats();
  for(const key of ['workers','inFlight','ready','activeInvocations','snapshotBytes','completedBytes','queuedBytes','inFlightBytes'])assert.equal(automatic[key],0,field+':'+key);
  assert.equal(h.listeners.size,0);assert.equal(h.terminated,h.created);assert.equal(h.created,4);assert.equal(h.errors,0);
  const post=retire(s,h);assert.deepEqual(s.stats(),automatic);
  for(const {listener,event}of packets)listener(event); // Original valid copies remain inert after fatal close.
  assert.deepEqual(s.stats(),postToStats(post));
  assert.deepEqual(s.trace(),trace);
  identityRejections.push({field,original:m[field],replacement,originalEnvelopeSHA256:sha(JSON.stringify(m)),mutatedEnvelopeSHA256:sha(JSON.stringify(changed)),changedFields:[field],ownerInvocation:owner.id,otherInvocation:other.id,actualHeldResults:packets.length,before,automaticFatalRetirement:{stats:automatic,listeners:h.listeners.size,created:h.created,terminated:h.terminated},rejectionCodes:outcomes.map(x=>x.reason.code),publishedResults:0,publishedWitnesses:0,trace,postClose:post,delayedOriginalRepliesInert:true});
 }finally{retire(s,h);}
}
const identityPositive=results.find(x=>x.case==='compound-fork-and-nested-caps'&&x.transport==='clone');
assert.equal(identityPositive.expected[0],2345);
results.push({case:'authentic-reply-identity',transport:'shared-envelope-before-decode',executedTransport:'clone',rejections:identityRejections,positiveControl:{case:identityPositive.case,transport:'clone',expected:2345},scope:'One-field build/invocation/fork/slot/function/schema identity mismatches in actual replies; shared validation before transport decoding. No wrong-handshake, malformed packed graph, timeout or general ABI claim.'});
function postToStats(post){const {created,removed,terminated,errors,...stats}=post;return stats;}
// Submission guards are shared by both transports. Exercise them once before
// any helper exists, preserving caller descriptors and a usable session.
const shapeHarness=harness(),shapes=api.createSession({workers:2,transport:'clone',workerFactory:shapeHarness.factory});
let getterCalls=0;const read=()=>{getterCalls++;return 4n;},shapeRejections=[];
async function rejectSnapshot(session,h,name,args,code,label){
 const originalArgs=Object.getOwnPropertyDescriptors(args);
 const originalValues=Object.values(originalArgs).filter(d=>'value'in d&&d.value!==null&&typeof d.value==='object').map(d=>[d.value,Object.getOwnPropertyDescriptors(d.value)]);
 await assert.rejects(session.call(name,args),e=>e.code===code,label);
 assert.equal(getterCalls,0,label);assert.equal(h.created,0,label);
 const stats=session.stats();assert.equal(stats.remoteJobs,0,label);assert.equal(stats.closed,false,label);
 for(const key of ['inFlight','ready','activeInvocations','snapshotBytes','completedBytes','queuedBytes','inFlightBytes'])assert.equal(stats[key],0,label+':'+key);
 assert.deepEqual(Object.getOwnPropertyDescriptors(args),originalArgs,label);
 for(const [value,descriptors]of originalValues)assert.deepEqual(Object.getOwnPropertyDescriptors(value),descriptors,label);
 return {case:label,code,getterCalls,workerConstructions:h.created,stats,callerDescriptorsUnchanged:true};
}
try{
 const accessor=tip(4n);Object.defineProperty(accessor,'value',{get:read,enumerable:true,configurable:true});
 const accessorArgs=[];Object.defineProperty(accessorArgs,'0',{get:read,enumerable:true,configurable:true});
 const extra=tip(4n);extra.extra=9n;
 const symbol=tip(4n);symbol[Symbol('extra')]=9n;
 const hidden=tip(4n);Object.defineProperty(hidden,'value',{value:4n,enumerable:false,writable:true,configurable:true});
 class ExoticTip{constructor(){Object.assign(this,tip(4n));}}
 for(const [label,args]of [['constructor-accessor',[accessor]],['argument-accessor',accessorArgs],['extra-string-field',[extra]],['symbol-field',[symbol]],['nonenumerable-field',[hidden]],['exotic-prototype',[new ExoticTip()]]])
  shapeRejections.push(await rejectSnapshot(shapes,shapeHarness,'snapshot',args,'input_shape',label));
 for(const name of ['absent_export','toString'])shapeRejections.push(await rejectSnapshot(shapes,shapeHarness,name,accessorArgs,'unknown_export',name));
 const left=Object.assign(Object.create(null),tip(4n)),tree=branch(left,tip(7n));
 const descriptors=Object.getOwnPropertyDescriptors(left);
 assert.equal(await shapes.call('snapshot',[tree]),47n,'valid null-prototype control after shape rejection');
 assert.deepEqual(Object.getOwnPropertyDescriptors(left),descriptors);assert.equal(Object.getPrototypeOf(left),null);
 assert.ok(shapes.stats().remoteJobs>0);assert.equal(getterCalls,0);
 results.push({case:'submission-shape-guards',transport:'shared-before-dispatch',rejections:shapeRejections,validControl:{expected:'47',nullPrototype:true,callerDescriptorsUnchanged:true},stats:shapes.stats()});
}finally{const post=retire(shapes,shapeHarness);if(results.at(-1)?.case==='submission-shape-guards')results.at(-1).postClose=post;}
const budgetRejections=[];
for(const [label,wire]of [['node-budget',{maxNodes:1}],['depth-budget',{maxDepth:1}]]){
 const h=harness(),s=api.createSession({workers:2,transport:'clone',wire,workerFactory:h.factory});
 try{
  const tree=branch(tip(4n),tip(7n));
  const rejected=await rejectSnapshot(s,h,'snapshot',[tree],'wire_budget',label);
  // This smaller valid public call also proves a budget rejection leaves its
  // session usable; the unrestricted Tree control above established 47n.
  assert.equal(await s.call('text_remote',['R']),'R');assert.ok(s.stats().remoteJobs>0);
  budgetRejections.push({...rejected,wire,validControl:'R',statsAfterControl:s.stats()});
 }finally{const post=retire(s,h);if(budgetRejections.at(-1)?.case===label)budgetRejections.at(-1).postClose=post;}
}
results.push({case:'submission-node-depth-budgets',transport:'shared-before-dispatch',rejections:budgetRejections});
const corruptions=[],decoderHarness=harness({transform:(listener,event)=>{
 const m=event.data;assert.ok(m.packet instanceof ArrayBuffer);const original=new DataView(m.packet);
 assert.equal(original.getUint32(0,true),0x32574442);assert.equal(original.getUint32(4,true),1);
 assert.equal(original.getUint32(8,true),m.packet.byteLength-12);assert.equal(original.getUint8(12),82);
 const packet=m.packet.slice(0);new DataView(packet).setUint8(12,255);
 corruptions.push({originalSHA256:sha(new Uint8Array(m.packet)),mutatedSHA256:sha(new Uint8Array(packet)),bytes:packet.byteLength,changedOffset:12,originalByte:82,mutatedByte:255});
 listener({data:{...m,packet}});
}}),decoder=api.createSession({workers:1,transport:'packed',trace:true,workerFactory:decoderHarness.factory});
try{await assert.rejects(decoder.call('text_remote',['Rift 😀']),e=>e.code==='protocol'&&/UTF-8/.test(e.message));
 assert.equal(corruptions.length,1);assert.equal(decoder.stats().remoteJobs,1);assert.equal(decoder.stats().closed,true);
 results.push({case:'packed-utf8-reply',transport:'packed',code:'protocol',corruptions,trace:decoder.trace(),postClose:retire(decoder,decoderHarness)});
}finally{retire(decoder,decoderHarness);}
assert.equal(networkCalls,0);
const receipt={schema:'rift-worker-policy-semantics/2',passed:true,compiler:binding.hashes,compilerLineage:binding.lineage??null,fixture:{path:path.relative(root,fixture).split(path.sep).join('/'),sha256:sha(fs.readFileSync(fixture))},importedFixtureSha256:sha(fs.readFileSync(path.join(root,'bend2/toolchain-patches/2035/workers/fixture-tree.bend'))),runnerSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),engine:{bun:process.versions.bun,executableSha256:sha(fs.readFileSync(process.execPath))},program:build.manifest.program,files:Object.fromEntries(Object.entries(build.files).map(([n,b])=>[n,sha(b)])),runtimeArtifacts:{[faultFile]:sha(faultSource)},networkCalls,results,scope:'Fresh checked/emitted candidate source and real Windows module-Worker policy/reply, submission snapshot, disposal/fatal and non-Nat wire semantics only. Intentional fault and reply corruption are controlled negative witnesses. No full107 parity, browser/native/kernel/device/adoption acceptance.'};
fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({passed:true,output,receiptSha256:sha(fs.readFileSync(path.join(output,'receipt.json'))),cases:results.length,networkCalls}));
}
} catch(error) {
 const message=error?.$==='Err'?bend.err_show(error):String(error?.stack??error);
 console.error(message.slice(0,32000));process.exitCode=1;
}
