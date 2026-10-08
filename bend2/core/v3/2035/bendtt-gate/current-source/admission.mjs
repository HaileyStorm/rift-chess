// Source-only successor. Initial execution trust belongs to the reviewed bootstrap.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../../../../../../',import.meta.url)));
const here='bend2/core/v3/2035/bendtt-gate/current-source/';
const evidence='.artifacts/bend2/2035-preview/stationary-motion-20261006/';
const packetPath=evidence+'current-source-admission-20261008-r1.json';
const packetSha256='31e07114e10c872355ae9cba3b13980f9b9cfef9a022ee409eaef5b8b2a85bdb';
const inventoryReview={path:evidence+'current-source-admission-reviewed-20261008-r1.json',
 sha256:'f6caabf25d24f91edd94fb8a6d765c10252eb1629b785800c02c35dec938b40f'};
const lineageReview={path:evidence+'current-source-admission-lineage-review-20261008-r1.json',
 sha256:'af390ef391af39cef3af052000473972f03fba7458099164abde2a05491f28a4'};
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const keys=(v,expected,label)=>assert.deepEqual(Object.keys(v).sort(),[...expected].sort(),label);
function relative(p){
 assert.equal(typeof p,'string');assert.ok(p&&!p.includes('\\')&&!p.includes(':')&&!p.startsWith('/')
  &&p.split('/').every(x=>x&&x!=='.'&&x!=='..'),'input must be repository relative');return p;
}
function bytesAt(absolute,maxBytes=16*1024**2){
 assert.equal(path.resolve(absolute),absolute);assert.equal(fs.realpathSync(absolute),absolute,'redirected input');
 const before=fs.lstatSync(absolute,{bigint:true});
 const same=s=>{assert.ok(s.isFile()&&!s.isSymbolicLink());for(const k of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(s[k],before[k],'input changed during read');};
 same(before);assert.ok(before.size>0n&&before.size<=BigInt(maxBytes),'input byte bound');
 const fd=fs.openSync(absolute,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
 try{same(fs.fstatSync(fd,{bigint:true}));const b=fs.readFileSync(fd);same(fs.fstatSync(fd,{bigint:true}));same(fs.lstatSync(absolute,{bigint:true}));assert.equal(fs.realpathSync(absolute),absolute);return b;}
 finally{fs.closeSync(fd);}
}
const read=p=>bytesAt(path.join(root,...relative(p).split('/')));
function bound(ref){
 if(Object.hasOwn(ref,'disposition')){keys(ref,['path','sha256','disposition'],'review reference');assert.equal(ref.disposition,'accepted');}
 else keys(ref,['path','sha256'],'source reference');
 assert.match(ref.sha256,/^[0-9a-f]{64}$/);const b=read(ref.path);assert.equal(hash(b),ref.sha256,`source hash differs: ${ref.path}`);return b;
}
const git=(...args)=>execFileSync('git',['-C',root,...args],{windowsHide:true,timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});
const text=(...args)=>git(...args).toString('utf8').replaceAll('\r\n','\n').trimEnd();
const load=p=>import(pathToFileURL(path.join(root,...relative(p).split('/'))).href);
function inventory(files,label){
 assert.ok(Array.isArray(files)&&files.length>0,label);const seen=new Set();
 for(const f of files){keys(f,['path','sha256'],label);relative(f.path);assert.match(f.sha256,/^[0-9a-f]{64}$/);assert.ok(!seen.has(f.path),`duplicate ${label}`);seen.add(f.path);bound(f);}return seen;
}

// Pure exact-set comparison also used by the bounded negative admission controls.
export function validateLineageRecords(actual,expected){
 const canonical=rows=>{
  assert.ok(Array.isArray(rows));const seen=new Set();
  return rows.map(r=>{keys(r,['path','status','beforeMode','afterMode','beforeBlob','afterBlob'],'lineage record');relative(r.path);
   assert.ok(!seen.has(r.path),'duplicate lineage path');seen.add(r.path);assert.match(r.status,/^[AMD]$/);
   for(const k of ['beforeMode','afterMode'])assert.match(r[k],/^\d{6}$/);
   for(const k of ['beforeBlob','afterBlob'])assert.match(r[k],/^[0-9a-f]{40}$/);return r;
  }).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 };
 assert.deepEqual(canonical(actual),canonical(expected),'undeclared source lineage drift');
}
function gitRecords(base,head){
 const fields=git('diff','--raw','--no-abbrev','--no-renames','-z',base,head).toString('utf8').split('\0');
 assert.equal(fields.pop(),'');const result=[];
 while(fields.length){const header=fields.shift(),p=fields.shift();assert.match(header,/^:\d{6} \d{6} [a-f0-9]{40} [a-f0-9]{40} [AMD]$/);
  const [beforeMode,afterMode,beforeBlob,afterBlob,status]=header.slice(1).split(' ');result.push({path:relative(p),status,beforeMode,afterMode,beforeBlob,afterBlob});}
 return result;
}
function extension(packet){
 const raw=read(here+'lineage.json'),m=JSON.parse(raw);
 keys(m,['schema','baseline','packet','files'],'successor manifest');assert.equal(m.schema,'rift-bend-2035-current-source-extension/1');
 assert.deepEqual(m.baseline,{commit:packet.head,tree:packet.tree});assert.deepEqual(m.packet,{path:packetPath,sha256:packetSha256});
 assert.equal(m.files.length,2);assert.deepEqual(m.files.map(f=>f.path).sort(),[here+'README.md',here+'admission.mjs']);
 inventory(m.files,'successor files');
 return {manifest:m,identity:{path:here+'lineage.json',sha256:hash(raw)},files:[...m.files,{path:here+'lineage.json',sha256:hash(raw)}]};
}
function preImport(){
 assert.equal(fs.realpathSync(root),root);assert.equal(fs.realpathSync(process.cwd()),root);
 assert.equal(process.platform,'win32','this raw-byte source admission is Windows-only');assert.equal(process.arch,'x64');
 assert.equal(process.version,'v24.12.0');assert.deepEqual(process.execArgv,[]);assert.equal(process.env.NODE_OPTIONS??'','');
 assert.equal(process.env.BEND_NO_TELEMETRY,'1');
 const executable=bytesAt(path.resolve(process.execPath),128*1024**2);
 assert.equal(hash(executable),'2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8');
 const raw=bound({path:packetPath,sha256:packetSha256}),packet=JSON.parse(raw);
 assert.equal(packet.state,'unarmed-review-packet');assert.equal(packet.approvedKernel,null);assert.equal(packet.approvedLinuxRuntime,null);
 const ir=JSON.parse(bound(inventoryReview)),lr=JSON.parse(bound(lineageReview));
 assert.equal(ir.disposition,'accepted-as-reviewed-inventory-packet');assert.equal(lr.disposition,'accepted-inventory-classification-only');
 assert.equal(ir.packetSHA256,packetSha256);assert.equal(lr.packetSHA256,packetSha256);assert.deepEqual(ir.findings,[]);assert.deepEqual(lr.findings,[]);
 assert.equal(packet.current.sourceFiles.length,316);assert.equal(packet.current.controller.sourceFiles.length,145);
 assert.equal(packet.current.closure.length,62);assert.equal(packet.current.negativeControls.length,8);assert.equal(packet.postSourceChanges.length,59);
 inventory(packet.current.sourceFiles,'current input');inventory(packet.consumerFiles,'original consumer');
 for(const compiler of [packet.current.compiler,packet.current.controller]){
  assert.equal(compiler.pristineFiles.length,97);assert.equal(compiler.derivedFiles.length,97);
  for(const [field,base]of [['pristineFiles','.artifacts/toolchains/bend-2.0.35-scout/bend2/'],['derivedFiles','.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/']])
   for(const f of compiler[field])bound({path:base+relative(f.path),sha256:f.sha256});
 }
 for(const ref of packet.evidence)bound(ref);
 const approvalText=read('bend2/core/v3/2035/bendtt-gate/approvals.mjs').toString('utf8');
 const literals=[...approvalText.matchAll(/^export const approvedSource = (\{[\s\S]*?^\});$/gm)];assert.equal(literals.length,1);
 const approval=JSON.parse(literals[0][1]);assert.deepEqual(approval,packet.originalApproval);
 for(const ref of [approval.receipt,approval.review,...Object.values(approval.native)])bound(ref);
 const ext=extension(packet),head=text('rev-parse','HEAD'),tree=text('rev-parse','HEAD^{tree}');
 assert.equal(text('status','--porcelain=v1','--untracked-files=all'),'','successor admission requires a clean committed checkout');
 git('merge-base','--is-ancestor',packet.head,head);git('merge-base','--is-ancestor',packet.historicalSource.commit,packet.head);
 assert.equal(text('rev-parse',packet.head+'^{tree}'),packet.tree);assert.equal(text('rev-parse',packet.historicalSource.commit+'^{tree}'),packet.historicalSource.tree);
 const historic=packet.postSourceChanges.map(r=>({path:r.path,status:r.status,beforeMode:r.beforeMode,afterMode:r.afterMode,beforeBlob:r.beforeBlob,afterBlob:r.afterBlob}));
 const added=ext.files.map(f=>({path:f.path,status:'A',beforeMode:'000000',afterMode:'100644',beforeBlob:'0'.repeat(40),afterBlob:blob(bound(f))}));
 validateLineageRecords(gitRecords(packet.historicalSource.commit,head),[...historic,...added]);
 validateLineageRecords(gitRecords(packet.head,head),added);
 for(const r of packet.postSourceChanges){assert.equal(r.inProofCone,false);assert.equal(r.workingEqualsCommitted,true);
  assert.equal(hash(read(r.path)),r.workingSha256);assert.equal(r.workingSha256,r.committedSha256);assert.deepEqual(read(r.path),git('show',head+':'+r.path));}
 for(const f of ext.files)assert.deepEqual(bound(f),git('show',head+':'+f.path));
 return {packet,approval,extension:ext,head,tree,executableSha256:hash(executable)};
}

export async function captureCurrentSourceAdmission(){
 assert.equal(arguments.length,0,'source admission has no caller overrides');
 // The external bootstrap authenticates this module before initial evaluation.
 // Recheck every project executable/input before any project module import here.
 const before=preImport();
 const {sourceEvidence}=await load('bend2/core/v3/2035/bendtt-gate/binding.mjs');
 const {capturePreparedInputs}=await load('bend2/core/v3/2035/bendtt-gate/source-prepared.mjs');
 const {approvedSource,approvedKernel,approvedLinuxRuntime}=await load('bend2/core/v3/2035/bendtt-gate/approvals.mjs');
 assert.deepEqual(approvedSource,before.approval);assert.equal(approvedKernel,null);assert.equal(approvedLinuxRuntime,null);
 const original=sourceEvidence(approvedSource).receipt;
 assert.equal(original.before.sourceFiles.length,315);assert.equal(original.actualFreshWorkers,9);
 assert.equal(original.sourceCommit,before.packet.historicalSource.commit);assert.equal(original.sourceTree,before.packet.historicalSource.tree);
 assert.deepEqual(original.aggregate.closure.files,before.packet.current.closure);
 assert.deepEqual(original.before.frozenFiles,before.packet.current.frozenFiles);
 assert.deepEqual(original.before.negativeControls,before.packet.current.negativeControls);
 // This projection is a current inventory expectation, never an execution receipt
 // or an approval. The original historical validator received only original records.
 const current=before.packet.current;
 const expectation={before:{negativeControls:current.negativeControls,sourceFiles:current.sourceFiles,compiler:current.compiler,
  controller:current.controller,v2FrozenFiles:original.before.v2FrozenFiles,frozenFiles:current.frozenFiles},
  frozenSha256:current.frozenSha256,preparedManifest:current.preparedManifest,aggregate:{closure:{files:current.closure}}};
 const captured=capturePreparedInputs(expectation);
 const {expectedLoadedPaths,...portable}=captured;assert.deepEqual(portable,current,'fresh independent current inventory differs');
 const after=preImport();assert.deepEqual(after,before,'source changed during admission');
 const recaptured=capturePreparedInputs(expectation);assert.deepEqual(recaptured,captured,'current inventory changed after admission');
 return {schema:'rift-bend-2035-current-source-admission/1',state:'source-only-unarmed',sourceCommit:before.head,sourceTree:before.tree,
  reviewedPacket:{path:packetPath,sha256:packetSha256},inventoryReview,lineageReview,successor:before.extension,
  historical:{approval:approvedSource,sourceCommit:original.sourceCommit,sourceTree:original.sourceTree,
   bindingSha256:original.bindingSha256,originalFreshWorkers:original.actualFreshWorkers,validatedOriginalRecords:true},
  current:portable,loadedPathsExpectedOnly:expectedLoadedPaths,freshProofExecutions:0,
  approvedKernel:null,approvedLinuxRuntime:null,executionAllowed:false,
  runtime:{version:process.version,platform:process.platform,arch:process.arch,executableSha256:before.executableSha256,execArgv:[],nodeOptions:''},
  scope:'Reviewed exact Windows current-source inventory and lineage only; original /2 consumer unchanged. No CHECK/mutation/Safe/kernel execution, carrier proof, Linux runtime/native/device/GPU/performance or adoption authority.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 throw new Error('Use the independently reviewed bootstrap; direct source admission has no execution trust anchor');
