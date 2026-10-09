// Unarmed current99 Windows evidence admission; immutable historical consumers remain separate.
// Initial execution trust belongs to an independently reviewed private bootstrap.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../../../../../../',import.meta.url)));
const here='bend2/core/v3/2035/bendtt-gate/current99-source/';
const evidence='.artifacts/bend2/2035-preview/stationary-motion-20261006/';
const names=['aggregate','oldids','oldkey','reject_all','wrong_successor','hide_all_moves','omit_repetition_key','wrong_resignation','ignore_draw_agreement'];
const definitions=['core/v3/prepared-match/LAWS:carried_canonical','core/v3/prepared-match/LAWS:apply_exact','core/v2/DomainsProof:accepted_valid_case','core/v2/DomainsProof:accepted_valid_case','core/v2/CanonicalLaws:canonical_member_sound','core/v2/MatchControlLaws:move_effect','core/v2/MatchControlLaws:resign_effect','core/v2/AdjudicationLaws:full_outcome_exact'];
const fields=['packet','checkReceipt','checkTerminal','checkManifest','checkSourceReview','checkOutcomeReview','controlsReceipt','controlsTerminal','controlsManifest','controlsSourceReview','controlsOutcomeReview'];
const evidenceNames=['current-source-admission-20261008-r2.json','current99-check-safe-r1/receipt.json','current99-proof-supervisor-r2/terminal.json','current99-proof-manifest-r1.json','current99-proof-source-review-r1.json','current99-check-safe-disposition-r1.json','current99-controls-r1/receipt.json','current99-controls-supervisor-r1/terminal.json','current99-controls-manifest-r1.json','current99-controls-source-review-r1.json','current99-controls-disposition-r1.json'];
const compilerRoot=path.join(root,'.artifacts/bend2/toolchain-patches/workers-2035-cli-r2/bend2');
const nodeSHA256='2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8';
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const keys=(v,k)=>assert.deepEqual(Object.keys(v).sort(),[...k].sort());
function relative(p){assert.equal(typeof p,'string');assert.ok(p&&!p.includes('\\')&&!p.includes(':')&&!p.startsWith('/')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..'));return p;}
function bytesAt(p,max=16*1024**2,allowEmpty=false){
 assert.equal(path.resolve(p),p);assert.equal(fs.realpathSync(p),p);
 const before=fs.lstatSync(p,{bigint:true});
 const same=s=>{assert.ok(s.isFile()&&!s.isSymbolicLink());for(const k of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(s[k],before[k]);};
 same(before);assert.ok((allowEmpty?before.size>=0n:before.size>0n)&&before.size<=BigInt(max));const fd=fs.openSync(p,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
 try{same(fs.fstatSync(fd,{bigint:true}));const raw=fs.readFileSync(fd);same(fs.fstatSync(fd,{bigint:true}));same(fs.lstatSync(p,{bigint:true}));assert.equal(fs.realpathSync(p),p);assert.equal(BigInt(raw.length),before.size);return raw;}finally{fs.closeSync(fd);}
}
const read=p=>bytesAt(path.join(root,...relative(p).split('/')));
function bound(ref){keys(ref,['path','sha256']);assert.match(ref.sha256,/^[a-f0-9]{64}$/);const raw=read(ref.path);assert.equal(hash(raw),ref.sha256,ref.path);return raw;}
const git=(...args)=>execFileSync('git',['-C',root,...args],{windowsHide:true,timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
const text=(...args)=>git(...args).toString('utf8').trimEnd().replaceAll('\r\n','\n');
const load=p=>import(pathToFileURL(path.join(root,...relative(p).split('/'))).href);
function json(raw){const text=raw.toString('utf8');assert.deepEqual(Buffer.from(text),raw,'invalid UTF-8 evidence');return JSON.parse(text);}
function seal(){
 const raw=read(here+'lineage.json'),m=json(raw);
 keys(m,['schema','baseline','evidence','files']);assert.equal(m.schema,'rift-current99-source-extension/1');
 assert.deepEqual(m.baseline,{commit:'ad988bd2852ca9e289e3f9f5d7a78a9e9284543b',tree:'8702a4655000ca060fd7925aad4f5c742d6ab3ee'});
 keys(m.evidence,fields);for(const [i,k]of fields.entries()){assert.equal(m.evidence[k].path,evidence+evidenceNames[i]);bound(m.evidence[k]);}
 assert.deepEqual(m.files.map(f=>f.path),[here+'admission.mjs',here+'README.md']);for(const f of m.files)bound(f);
 return {m,identity:{path:here+'lineage.json',sha256:hash(raw)},files:[...m.files,{path:here+'lineage.json',sha256:hash(raw)}]};
}
function inventory(files){const seen=new Set();for(const f of files){keys(f,['path','sha256']);assert.ok(!seen.has(f.path));seen.add(f.path);bound(f);}return seen;}
function compilerFiles(directory){
 assert.equal(fs.realpathSync(directory),directory);const stat=fs.lstatSync(directory);assert.ok(stat.isDirectory()&&!stat.isSymbolicLink());
 return fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0).flatMap(e=>{
  assert.ok(!e.isSymbolicLink());const file=path.join(directory,e.name);if(e.isDirectory())return compilerFiles(file);
  assert.ok(e.isFile());return [{path:path.relative(root,file).split(path.sep).join('/'),sha256:hash(bytesAt(file))}];
 });
}
function logs(logs){
 keys(logs,['stdout','stderr']);for(const l of Object.values(logs)){assert.equal(l.truncated,false);assert.ok(Number.isSafeInteger(l.bytes)&&l.bytes>=0&&l.bytes<=64000);assert.equal(Buffer.byteLength(l.text),l.bytes);}
}
function native(t,r,ref){
 assert.equal(t.passed,true);assert.equal(t.unknown,false);assert.equal(t.checkedJobClosed,true);assert.equal(t.finalSelfOnly,true);
 assert.deepEqual(t.fenceErrors,{});assert.deepEqual(t.before,t.after);assert.equal(t.sourceFences,Object.keys(t.before).length);
 assert.deepEqual(t.originalUnit,{membershipVerified:true,exitCode:0,handleClosed:true,settled:true});
 assert.equal(t.outerSignaling,false);assert.equal(t.retry,false);assert.equal(t.caughtError,null);assert.equal(t.finalObservationError,null);
 for(const s of Object.values(t.streams)){assert.equal(s.closed,true);assert.equal(s.overflow,false);assert.equal(s.error,null);assert.ok(s.bytes===s.retained&&s.retained<=65536);}
 assert.equal(t.streams.stderr.bytes,0);assert.equal(t.result.passed,true);assert.equal(t.result.receiptSHA256,ref.sha256);
 assert.equal(r.passed,true);assert.deepEqual(r.before,r.after);assert.equal(r.approvedKernel,null);assert.equal(r.approvedLinuxRuntime,null);
 assert.deepEqual(r.parentResourceLimits,{});assert.deepEqual(r.parentExecArgv,[]);
 assert.equal(r.before.approvedKernel,null);assert.equal(r.before.approvedLinuxRuntime,null);
}
function worker(r){
 assert.equal(r.ok,true);assert.equal(r.fetches,0);assert.equal(r.actualResourceLimits.stackSizeMb,64);assert.deepEqual(r.workerExecArgv,['--experimental-transform-types']);
 assert.equal(r.configuredWorkerResourceLimits.stackSizeMb,64);assert.equal(r.observedWorkerExit,true);assert.equal(r.exitCode,0);
 logs(r.logs);
}
// Pure relational validator; its caller must authenticate all raw bytes against the sealed references.
export function validateCurrent99Evidence(m,records){
 keys(records,fields);const p=records.packet,c=records.controlsReceipt,s=records.checkReceipt;
 assert.equal(p.schema,'rift-current-source-successor-review/2');assert.equal(p.state,'unarmed-review-packet');
 assert.equal(p.approvedKernel,null);assert.equal(p.approvedLinuxRuntime,null);
 assert.equal(s.schema,'rift-current99-windows-check-safe/1');assert.equal(c.schema,'rift-current99-windows-combined-controls/1');
 native(records.checkTerminal,s,m.evidence.checkReceipt);native(records.controlsTerminal,c,m.evidence.controlsReceipt);
 assert.equal(s.before.head,'814a781a2f8ceb14e1d2017ccff0e434b3fdf85d');assert.equal(s.before.tree,p.tree);
 assert.equal(c.before.head,m.baseline.commit);assert.equal(c.before.tree,m.baseline.tree);
 assert.equal(s.before.packetSHA256,m.evidence.packet.sha256);assert.equal(c.before.originalPacketSHA256,m.evidence.packet.sha256);
 assert.equal(c.before.producerManifestSHA256,m.evidence.controlsManifest.sha256);
 assert.deepEqual(s.before.compiler,p.candidateCompiler.files);assert.deepEqual(c.before.compiler,s.before.compiler);assert.equal(c.before.compiler.length,99);
 assert.deepEqual(c.before.runtime,s.before.runtime);assert.equal(c.before.compilerRoot,s.before.compilerRoot);
 assert.equal(c.before.compilerRoot,compilerRoot);assert.equal(s.result.compilerRoot,compilerRoot);
 assert.deepEqual(c.before.runtime,{version:'v24.12.0',platform:'win32',arch:'x64',nodeSHA256});
 assert.deepEqual(c.before.expectedPaths,s.before.expectedPaths);assert.equal(c.before.expectedPaths.length,62);
 assert.deepEqual(c.before.originalSourceReceipt,s.before.originalSourceReceipt);assert.deepEqual(c.before.originalSourceReceipt,p.originalApproval.receipt);
 assert.deepEqual(c.before.closure,s.before.closure);assert.deepEqual(s.before.closure,p.current.closure);assert.equal(c.before.closure.length,62);
 const candidateBase=c.before.compiler.filter(f=>f.path==='.artifacts/bend2/toolchain-patches/workers-2035-cli-r2/bend2/base.bend');assert.equal(candidateBase.length,1);
 assert.equal(c.before.closure.find(f=>f.path==='<derived>/bend2/base.bend')?.sha256,candidateBase[0].sha256);
 const delta=c.before.sourceDelta;assert.equal(delta.path,'bend2/core/v3/2035/README.md');
 assert.equal(delta.beforeSHA256,'ef847aaf115500db289c11f509c5197d8b8f6ef021db27daee3c75d913f51619');assert.equal(delta.afterSHA256,'0e9a0201eec34af955967337b7038d6a0559ced0ec7b0ba648d33d0edfee3aac');
 const inventory=structuredClone(s.before.sourceInventory);const changed=inventory.sourceFiles.filter(f=>f.path===delta.path);assert.equal(changed.length,1);assert.equal(changed[0].sha256,delta.beforeSHA256);changed[0].sha256=delta.afterSHA256;
 assert.deepEqual(inventory,c.before.sourceInventory);
 assert.deepEqual(c.before.sourceInventory.negativeControls,p.current.negativeControls);
 assert.equal(c.actualFreshWorkers,9);assert.equal(c.current99MutationsExecuted,8);assert.equal(c.safeEmissions,0);assert.equal(c.historicalExecutionReuse,false);
 assert.deepEqual(c.records.map(r=>r.name),names);
 const key=hash(JSON.stringify({entry:'bend2/core/v3/2035/PREPARED_CHECK.bend',files:c.before.closure,bindingSHA256:hash(JSON.stringify(c.before))}));assert.equal(c.positiveKey,key);
 for(const [i,r]of c.records.entries()){
  worker(r);assert.equal(r.positiveKey,key);assert.equal(r.compilerRoot,c.before.compilerRoot);assert.equal(r.definitions,1586);
  let closure=c.before.closure;
  if(i===0){assert.equal(r.holes,0);assert.equal(r.owned,965);assert.equal(r.namespaceGuard,'Current99 Comp.js_lib(empty-root full-book view, true)');}
  else{
   const control=p.current.negativeControls[i-1];assert.deepEqual(r.control,control);assert.equal(r.rejected,true);assert.equal(r.definition,definitions[i-1]);
   assert.match(r.rendered,/expected\s*:/i);assert.match(r.rendered,/observed\s*:/i);assert.equal(hash(r.rendered),r.rejectionSha256);
   assert.equal(r.rejection,r.rendered.slice(0,1600));assert.equal(/^Location:\s*(.+)$/m.exec(r.rendered)?.[1],r.location);assert.ok(r.location);
   if(i<3)assert.deepEqual(r.bridge,{path:'bend2/core/v3/prepared-match/LAWS.bend',namespace:'core/v3/prepared-match/LAWS',definition:definitions[i-1]});
   closure=closure.map(f=>f.path===control.target?{...f,sha256:control.mutatedSha256}:f);
  }
  assert.deepEqual(r.closure,closure);
 }
 assert.equal(s.observedWorkerExit,true);assert.equal(s.current99MutationsExecuted,0);
 assert.equal(s.configuredWorkerResourceLimits.stackSizeMb,64);assert.equal(s.result.actualResourceLimits.stackSizeMb,64);assert.deepEqual(s.result.workerExecArgv,['--experimental-transform-types']);
 assert.equal(s.result.holes,0);assert.equal(s.result.definitions,1586);assert.equal(s.result.owned,965);assert.equal(s.result.fetches,0);assert.deepEqual(s.result.closure,c.before.closure);
 assert.equal(s.result.ok,true);assert.equal(s.result.namespaceGuard,'Current99 Comp.js_lib(empty-root full-book view, true)');logs(s.logs);
 const emitted=s.result.emitted;assert.deepEqual(emitted.oos,[]);assert.equal(emitted.bytes,5676608);assert.equal(emitted.file.bytes,5676608);
 assert.equal(emitted.file.sha256,'41f91d9c7982ba092288f92352f177ba5dfce78469a5d081fcd0825c0e38666e');assert.equal(s.serializedEqualsHistorical,true);
 assert.equal(emitted.sha256,emitted.file.sha256);assert.equal(s.historicalSerializationSHA256,p.serializedSource.serializedSha256);assert.equal(s.historicalSerializationSHA256,emitted.sha256);
 const result=records.checkTerminal.result;assert.equal(result.serializedSHA256,emitted.sha256);assert.equal(result.serializedBytes,emitted.bytes);assert.equal(result.serializedEqualsHistorical,true);
 assert.equal(records.controlsTerminal.result.positiveKey,c.positiveKey);assert.equal(records.controlsTerminal.result.actualFreshWorkers,9);assert.equal(records.controlsTerminal.result.current99MutationsExecuted,8);
 for(const label of ['check','controls']){
  const receipt=records[label+'Receipt'],manifest=records[label+'Manifest'],review=records[label+'SourceReview'],outcome=records[label+'OutcomeReview'];
  assert.equal(manifest.head,receipt.before.head);assert.equal(manifest.tree,receipt.before.tree);assert.deepEqual(review.findings,[]);assert.deepEqual(outcome.findings,[]);
  assert.equal(review.manifestSHA256,m.evidence[label+'Manifest'].sha256);assert.equal(outcome.manifestSHA256,m.evidence[label+'Manifest'].sha256);
  assert.equal(outcome.receiptSHA256,m.evidence[label+'Receipt'].sha256);assert.equal(outcome.terminalSHA256,m.evidence[label+'Terminal'].sha256);
  assert.equal(outcome.sourceReviewSHA256,m.evidence[label+'SourceReview'].sha256);assert.equal(outcome.passed,true);assert.equal(outcome.independentOutcomeReviewAccepted,true);
  const terminal=records[label+'Terminal'],expected={...manifest.inputs,
   [path.join(root,m.evidence[label+'Manifest'].path)]:m.evidence[label+'Manifest'].sha256,
   [path.join(root,m.evidence[label+'SourceReview'].path)]:m.evidence[label+'SourceReview'].sha256};
  assert.deepEqual(terminal.before,expected);
 }
 assert.equal(records.checkSourceReview.disposition,'accepted-for-one-current99-full-check-safe-run');
 assert.equal(records.controlsSourceReview.disposition,'accepted-for-one-current99-combined-controls-run');
 return {packet:p,checkSafe:s,controls:c,delta};
}
function preImport(){
 assert.equal(fs.realpathSync(root),root);assert.equal(process.cwd(),root);assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.12.0');
 assert.deepEqual(process.execArgv,[]);assert.equal(process.env.NODE_OPTIONS??'','');assert.equal(process.env.BEND_NO_TELEMETRY,'1');
 assert.equal(hash(bytesAt(path.resolve(process.execPath),128*1024**2)),'2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8');
 const extension=seal(),records=Object.fromEntries(fields.map(k=>[k,json(bound(extension.m.evidence[k]))]));
 const result=validateCurrent99Evidence(extension.m,records),head=text('rev-parse','HEAD'),tree=text('rev-parse','HEAD^{tree}');
 assert.equal(text('status','--porcelain=v1','--untracked-files=all'),'');assert.equal(text('rev-parse',extension.m.baseline.commit+'^{tree}'),extension.m.baseline.tree);
 const change=result.delta,transition=git('diff','--raw','--no-abbrev','--no-renames','-z',result.checkSafe.before.head,extension.m.baseline.commit).toString('utf8').split('\0');
 assert.deepEqual(transition,[`:100644 100644 ${change.beforeBlob} ${change.afterBlob} M`,change.path,'']);
 for(const [commit,h]of [[result.checkSafe.before.head,change.beforeSHA256],[extension.m.baseline.commit,change.afterSHA256]])assert.equal(hash(git('show',commit+':'+change.path)),h);
 const additions=extension.files.map(f=>({path:f.path,status:'A',beforeMode:'000000',afterMode:'100644',beforeBlob:'0'.repeat(40),afterBlob:blob(bound(f))}));
 const fieldsRaw=git('diff','--raw','--no-abbrev','--no-renames','-z',extension.m.baseline.commit,head).toString('utf8').split('\0');assert.equal(fieldsRaw.pop(),'');
 const actual=[];while(fieldsRaw.length){const row=fieldsRaw.shift().slice(1).split(' '),p=relative(fieldsRaw.shift());assert.equal(row.length,5);actual.push({path:p,status:row[4],beforeMode:row[0],afterMode:row[1],beforeBlob:row[2],afterBlob:row[3]});}
 // Exact paths, membership, status, modes and blobs; no documentation exemption.
 assert.deepEqual(actual.sort((a,b)=>a.path.localeCompare(b.path)),additions.sort((a,b)=>a.path.localeCompare(b.path)));
 for(const f of extension.files)assert.deepEqual(bound(f),git('show',head+':'+f.path));
 for(const label of ['check','controls'])for(const [file,h]of Object.entries(records[label+'Terminal'].before)){
  const expected=label==='check'&&file===path.join(root,change.path)?change.afterSHA256:h;
  assert.equal(hash(bytesAt(file,file.endsWith('.exe')?128*1024**2:16*1024**2)),expected,file);
 }
 for(const label of ['check','controls']){
  const terminal=records[label+'Terminal'],directory=path.dirname(path.join(root,extension.m.evidence[label+'Terminal'].path));
  const streams={};for(const n of ['stdout','stderr']){const raw=bytesAt(path.join(directory,n+'.log'),65536,true);assert.equal(raw.length,terminal.streams[n].bytes);streams[n]=raw;}
  assert.equal(streams.stderr.length,0);const text=streams.stdout.toString('utf8');assert.deepEqual(Buffer.from(text),streams.stdout,'invalid UTF-8 native output');const lines=text.trimEnd().split('\n').map(s=>JSON.parse(s));
  if(label==='check'){assert.equal(lines.length,1);assert.deepEqual(lines[0],terminal.result);}
  else{assert.equal(lines.length,10);assert.deepEqual(lines.slice(0,9).map(v=>v.completed),names);assert.deepEqual(lines[9],terminal.result);}
 }
 inventory(result.controls.before.compiler);inventory(result.controls.before.sourceInventory.sourceFiles);
 const actualCompiler=compilerFiles(compilerRoot).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);assert.deepEqual(actualCompiler,result.controls.before.compiler);assert.equal(actualCompiler.length,99);
 for(const r of result.controls.records){const ref={path:evidence+'current99-controls-r1/'+r.name+'.json',sha256:hash(JSON.stringify(r,null,2)+'\n')};assert.deepEqual(json(bound(ref)),r);}
 const emitted=result.checkSafe.result.emitted;assert.equal(emitted.file.path,path.join(root,evidence+'current99-check-safe-r1/PREPARED_CHECK.bendtt'));
 const raw=bytesAt(emitted.file.path);assert.equal(raw.length,5676608);assert.equal(hash(raw),emitted.file.sha256);
 for(const name of ['current99-check-safe-r1','current99-controls-r1'])assert.equal(fs.existsSync(path.join(root,evidence+name+'/active.lock')),false);
 return {extension,records,result,head,tree};
}
export async function captureCurrent99SourceAdmission(){
 assert.equal(arguments.length,0);const before=preImport();
 const {sourceEvidence}=await load('bend2/core/v3/2035/bendtt-gate/binding.mjs');
 const {capturePreparedInputs}=await load('bend2/core/v3/2035/bendtt-gate/source-prepared.mjs');
 const {approvedSource,approvedKernel,approvedLinuxRuntime}=await load('bend2/core/v3/2035/bendtt-gate/approvals.mjs');
 assert.equal(approvedKernel,null);assert.equal(approvedLinuxRuntime,null);assert.deepEqual(approvedSource,before.result.packet.originalApproval);
 const original=sourceEvidence(approvedSource).receipt;assert.equal(original.actualFreshWorkers,9);
 const current=before.result.controls.before.sourceInventory;
 const expectation={before:{negativeControls:current.negativeControls,sourceFiles:current.sourceFiles,compiler:current.compiler,controller:current.controller,v2FrozenFiles:original.before.v2FrozenFiles,frozenFiles:current.frozenFiles},frozenSha256:current.frozenSha256,preparedManifest:current.preparedManifest,aggregate:{closure:{files:current.closure}}};
 const {expectedLoadedPaths,...captured}=capturePreparedInputs(expectation);assert.deepEqual(captured,current);
 const after=preImport();assert.deepEqual(after,before);
 return {schema:'rift-current99-source-admission/1',state:'validated-windows-evidence-unarmed',sourceCommit:before.head,sourceTree:before.tree,
  successor:before.extension,current:captured,current99Compiler:before.result.controls.before.compiler,expectedLoadedPathsOnly:expectedLoadedPaths,
  executions:{checkSafe:before.extension.m.evidence.checkReceipt,controls:before.extension.m.evidence.controlsReceipt},historicalApproval:approvedSource,
  validatedPastCurrent99Workers:10,freshProofExecutions:0,approvedKernel:null,approvedLinuxRuntime:null,executionAllowed:false,
  scope:'Exact Windows current99 source/type/promise/mutation/Safe evidence admission only; no compiler execution, kernel/Linux runtime/native application/device/GPU/performance/pin amendment/adoption authority.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))throw Error('Use a separately reviewed bootstrap; this source admission has no initial execution trust anchor');
