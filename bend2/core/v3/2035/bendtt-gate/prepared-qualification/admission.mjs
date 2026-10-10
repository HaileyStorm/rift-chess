// Evidence reader only. Initial trust requires an independently reviewed
// bootstrap to authenticate lineage and dependencies before this import.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../../../../../../',import.meta.url)));
const here='bend2/core/v3/2035/bendtt-gate/prepared-qualification/';
const gate='bend2/core/v3/2035/bendtt-gate/current99-source/';
const privateRoot='.artifacts/bend2/2035-preview/stationary-motion-20261006/';
const prepared='bend2/core/v3/prepared-match/';
const historical='bend2/docs/evidence/prepared-match-20261007/';
const compilerRoot='.artifacts/bend2/toolchain-patches/workers-2035-cli-r2/bend2';
const exports7=['command','erase','carried','frozen','start','from_position','legal'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const keys=(v,k)=>assert.deepEqual(Object.keys(v).sort(),[...k].sort());
const creationLinks={
 manifest:{path:'bend2/laws/semantic-prepared-v3.json',sha256:'1c614f4df66e694a5395ee1b00cc23a1c59c7cf2ad99d6e4c36e3427d1939fa6'},
 parent:{path:'bend2/laws/semantic-v2.json',sha256:'c8dcce907c3c3a6f70e9dfa12a74966879f30ea338b2734637c9acf4579943bf'},
 publication:{path:privateRoot+'prepared-v3-publication-r2.json',sha256:'da6a5bbca81db0daf6640813887b3a3df3c4c638eba485c014b4b7de8d499a32'},
 steps:{path:privateRoot+'prepared-v3-publication-r2.steps.json',sha256:'06f0540409064f12dbda442abef5b01fcb772b87b1e3f192e49e9ad4112c7b65'}
};
const qualificationLinks={
 sourceReview:{path:privateRoot+'prepared-current99-source-review-r1.json',sha256:'c660941f3e2c3fe52bb03d3f55dd76d66052b22c4a313908e8fc224ba9874698'},
 emissionTerminal:{path:privateRoot+'prepared-current99-emission-supervisor-r1/terminal.json',sha256:'6d0c63ab4414240a83ebb80a69e1acde14a891d7e7ee3ad87ad4aa0b84883c79'},
 emissionManifest:{path:privateRoot+'prepared-current99-emission-r1/manifest.json',sha256:'c21318bf005a0c6ded426cf7752c812b6b81d425c4d15ffdbd7a28fa71519a1a'},
 module:{path:privateRoot+'prepared-current99-emission-r1/prepared-match.js',sha256:'5ebc6146c192d40f8c7a71cac9ace6ee16c4dfde5bbb452ec204a71aa4973885'},
 finiteTerminal:{path:privateRoot+'prepared-current99-finite-supervisor-r1/terminal.json',sha256:'d811a4128b12c35fa3197a6aec12cf47263386bad353fccfe8f876b9f5df5018'},
 finiteResult:{path:privateRoot+'prepared-current99-diff-r1/result.json',sha256:'18b1bf254cc5b0f3fdcc51bafcd12f494e94c8defda9e5cb6e8fc1ace7eb63e1'},
 disposition:{path:privateRoot+'prepared-current99-disposition-r1.json',sha256:'f7f60a23785b2ff00b5058d548c0b568ecb9003ab0e73e2cbc0562e36b38da05'}
};
const dependencyPins=[
 [gate+'lineage.json','f4da232cb92a9005b29ed2652fe42cbff0ebdcb26765e0700657e3ba6b5bbcdd'],
 [gate+'admission.mjs','e7d5e1d03d2882761d815d37933fd342226e37d1794ff5da11fb78a1567599d0'],
 [gate+'README.md','766cf717a596eaec7f9b6667409e24bea284b823bb0a4d0832886edefaa64bc1'],
 [privateRoot+'emit-prepared-current99-r1.mjs','e55a1f1845df397b0ce69f4ed378bb67802e2801907d37aa2d61a5c391003b3a'],
 [privateRoot+'prepared-current99-diff-r1.mjs','f69c46bb509f14c2f10cca5579563af705c65f6311a060194dcf8e4c7e2bd4c0'],
 [privateRoot+'PreparedV3ProbeR1.bend','d0c738cbe1a20562b32c054ca1f660ca226e08a054eeba032b6e7555d58f1147'],
 [privateRoot+'indexed-shared-scene-helper-r1.mjs','81641e8fd4ef1b9bb053eb281fd77095604d997df7d8b93c1ca261ffa36cbcef'],
 ['bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs','1508c2620714fd0f96b531400510f1cf997671ec1a0dbc074a35484c24fc84c7'],
 ['bend2/toolchain-patches/2032/tag-identity/preload-root.mjs','8fbf6eb7be20273edc02706cbadd8182d79fa020b91075da6dc652e76158c733'],
 [privateRoot+'worker-cli-wrapper-execution-manifest-r1.json','f079064a5673addec9bfda980c999bfc30f9dbb06d4d10bff95a65a270dd0c14'],
 [privateRoot+'prepared-v3-accepted27-emission-r1/prepared-match.js','cd854476f06baf98a3a08f69cca9fb3c8b52bb84ebf8a7f254572647faed00a5'],
 [privateRoot+'prepared-v3-accepted27-emission-r1/result.json','ccadd6dba04f5ac9e87aeee0e8fb4edb85f507b06d1303399c510898aa966d7c'],
 [privateRoot+'prepared-v3-diff-r1/result.json','9bc70c32044c8f55f8f3e7ca29f05072f8245b28a12cc1878df958d5ca0917af'],
 [historical+'differential.mjs','90f08cb752a2898a8c2bdf9b8a866cd7f887d1a9276a2136054eb31394cb3f0a']
];
const recordNames=['creationManifest','parentManifest','publication','publicationSteps',
 'current99Lineage','current99Records','sourceReview','emissionTerminal','emissionManifest',
 'finiteTerminal','finiteResult','disposition','historicalDifferential','historicalEmissionResult',
 'reviewText','producerText','workloadText'];
const originalFiles=['CHECK.bend','LAWS.bend','Match.bend','PROOF.bend','verify.mjs'].map(n=>prepared+n);
const originalEvidence=['proof.json','emission.json','differential.json','differential-result.json',
 ...['oldids','oldkey'].flatMap(n=>[n+'.json',n+'-result.json',n+'-diagnostic.txt',n+'-mutant.bend']),
 'probe.bend','emitter.mjs','differential.mjs','review.md'].map(n=>historical+n);
const rewrites=[
 ['const tag=name=>name,policy=name=>({$:tag(name)});',"const tag=name=>{assert.ok(tagNames.includes(name));return 'core/MatchSpec.'+name;},policy=name=>({$:tag(name)});"],
 ["assert.equal(value.$,'MoveAccepted')","assert.equal(value.$,'core/v3/prepared-match/Match.MoveAccepted')"],
 ["assert.equal(value.$,'Ordinary')","assert.equal(value.$,'core/v3/prepared-match/Match.Ordinary')"]
];
function relative(p){assert.equal(typeof p,'string');assert.ok(p&&!p.includes('\\')&&!p.includes(':')&&!p.startsWith('/')&&p.split('/').every(x=>x&&x!=='.'&&x!=='..'));return p;}
function ref(r){keys(r,['path','sha256']);relative(r.path);assert.match(r.sha256,/^[a-f0-9]{64}$/);return r;}
function lineageShape(lineage){
 keys(lineage,['schema','files','dependencies','creation','qualification','limits']);assert.equal(lineage.schema,'rift-prepared-qualification-evidence/1');
 assert.deepEqual(lineage.files.map(f=>f.path),[here+'admission.mjs',here+'README.md']);for(const f of lineage.files)ref(f);
 assert.deepEqual(lineage.creation,creationLinks);assert.deepEqual(lineage.qualification,qualificationLinks);
 assert.deepEqual(lineage.dependencies,dependencyPins.map(([path,sha256])=>({path,sha256})));
 assert.deepEqual(lineage.limits,{individualInputBytes:16777216,aggregateReadBytes:33554432,sourceBytes:65536});
}
function inventory(xs,n){assert.equal(xs.length,n);const seen=new Set();for(const f of xs){ref(f);assert.ok(!seen.has(f.path));seen.add(f.path);}return xs;}
function fenceInput(record,p,h){const matches=Object.entries(record.before).filter(([s])=>s.replaceAll('\\','/').endsWith('/'+p));assert.equal(matches.length,1);assert.equal(matches[0][1],h);}
function native(t,h){
 assert.equal(t.passed,true);assert.equal(t.unknown,false);assert.equal(t.checkedJobClosed,true);assert.equal(t.finalSelfOnly,true);
 assert.deepEqual(t.originalUnit,{membershipVerified:true,exitCode:0,handleClosed:true,settled:true});
 assert.equal(t.outerSignaling,false);assert.equal(t.retry,false);assert.equal(t.caughtError,null);assert.equal(t.finalObservationError,null);
 assert.deepEqual(t.before,t.after);assert.deepEqual(t.fenceErrors,{});assert.equal(t.sourceFences,Object.keys(t.before).length);
 keys(t.streams,['stdout','stderr']);for(const s of Object.values(t.streams)){
  assert.equal(s.closed,true);assert.equal(s.overflow,false);assert.equal(s.error,null);assert.ok(Number.isSafeInteger(s.bytes)&&s.bytes>=0&&s.bytes===s.retained&&s.bytes<=65536);
 }
 assert.equal(t.streams.stderr.bytes,0);assert.equal(t.result.ok,true);assert.equal(t.result.networkCalls,0);assert.equal(t.result.resultSHA256,h);
}
function one(text,s){assert.equal(text.split(s).length,2);return text.indexOf(s);}
function inverseWorkload(r){
 const begin='// BEGIN AUTHENTICATED PREPARED WORKLOAD\n',end='// END AUTHENTICATED PREPARED WORKLOAD\n';
 const a=one(r.producerText,begin)+begin.length,b=one(r.producerText,end);
 const c=one(r.workloadText,'const rows=[],controls=[];'),d=one(r.workloadText,'const result={ok:true,');assert.ok(b>a&&d>c);
 const transformed=r.producerText.slice(a,b),original=r.workloadText.slice(c,d);let inverse=transformed;
 for(const [from,to]of rewrites){one(inverse,to);inverse=inverse.replace(to,from);}
 assert.equal(inverse,original);assert.deepEqual(r.finiteResult.sourceDerivation,{originalSHA256:hash(original),transformedSHA256:hash(transformed),rewrites:rewrites.map(([from,to])=>({from,to})),inverseExact:true});
}

// PURE RELATIONAL CHECK ONLY. The caller must first authenticate all lineage,
// dependency and record raw bytes; parsed objects cannot establish provenance.
// This does not independently authenticate bytes or run current99's validator.
export function validatePreparedQualification(lineage,records){
 lineageShape(lineage);
 for(const f of [...Object.values(lineage.creation),...Object.values(lineage.qualification),...lineage.dependencies])ref(f);
 keys(records,recordNames);const r=records,m=r.creationManifest,p=r.publication,e=r.emissionManifest,f=r.finiteResult;
 keys(m,['schema','version','semanticMeaning','parent','files','compiler','evidence']);assert.equal(m.schema,'rift-bend-prepared-match/3');assert.equal(m.version,3);assert.equal(m.semanticMeaning,'unchanged');
 keys(m.files,originalFiles);keys(m.evidence,originalEvidence);assert.deepEqual(m.parent,lineage.creation.parent);
 assert.equal(r.parentManifest.schema,'rift-bend-semantic/2');assert.equal(r.parentManifest.version,2);
 assert.equal(m.compiler.version,'2.0.27');assert.equal(m.compiler.commit,'d37909174ebd664338ae3194799a9e0899dedd51');
 assert.equal(p.passed,true);assert.equal(p.clean,true);assert.equal(p.head,'4e4de878fc1f6bf3c4f119091d47f6bbd5a4e217');assert.equal(p.remote,p.head);assert.equal(p.parent,'ba37749675d31b24320f79339d1ec185caa3c8b5');
 const published={...m.files,...m.evidence,[historical+'README.md']:p.sourceSHA256[historical+'README.md'],[lineage.creation.manifest.path]:lineage.creation.manifest.sha256};
 assert.equal(Object.keys(published).length,23);assert.deepEqual(p.sourceSHA256,published);
 assert.deepEqual(p.verifier,{verified:true,scope:'Frozen meaning-preserving core extension only; UI/browser activation and compiler migration remain separate',canonicalContentSHA256:hash(JSON.stringify(m)),manifestSHA256:lineage.creation.manifest.sha256});
 const steps=r.publicationSteps,find=argv=>{const xs=steps.filter(s=>JSON.stringify(s.argv)===JSON.stringify(argv));assert.equal(xs.length,1);return xs[0];};
 const verifier=find(['C:/Program Files/nodejs/node.exe',prepared+'verify.mjs']);assert.equal(verifier.exit,0);assert.equal(verifier.stderr,'');assert.equal(verifier.stdout,JSON.stringify(p.verifier)+'\n');
 const creator=find(['git','-C','.artifacts/toolchains/bend','rev-parse','HEAD']);assert.equal(creator.exit,0);assert.equal(creator.stderr,'');assert.equal(creator.stdout,m.compiler.commit+'\n');
 const pristine=find(['git','-C','.artifacts/toolchains/bend','status','--porcelain']);assert.equal(pristine.exit,0);assert.equal(pristine.stdout,'');assert.equal(pristine.stderr,'');
 const review=r.reviewText.replaceAll('\r','').split('\n');assert.ok(review.includes('Review disposition: accepted'));
 assert.ok(review.includes('Scope: accepted2.0.27 bridge proof and finite whole-match differential; no UI activation, browser performance or2.0.35adoption'));
 const current=r.current99Records;assert.equal(r.current99Lineage.schema,'rift-current99-source-extension/1');
 assert.equal(e.schema,'rift-private-prepared-current99-emission/1');assert.equal(e.ok,true);assert.equal(e.networkCalls,0);assert.equal(e.retainedCurrent99EvidenceRelationsValid,true);
 assert.equal(e.lineageSHA256,lineage.dependencies.find(x=>x.path===gate+'lineage.json').sha256);
 assert.equal(e.compilerRoot,compilerRoot);inventory(e.compilerInventory,99);
 assert.deepEqual(e.compilerInventory,current.packet.candidateCompiler.files);assert.deepEqual(e.compilerInventory,current.checkReceipt.before.compiler);assert.deepEqual(e.compilerInventory,current.controlsReceipt.before.compiler);
 assert.deepEqual(e.lineageEvidence,r.current99Lineage.evidence);inventory(current.packet.consumerFiles,14);
 const frozen=Object.fromEntries(['Match','LAWS','PROOF','CHECK'].map(n=>[n,m.files[prepared+n+'.bend']]));
 assert.deepEqual(e.frozenPrepared,frozen);assert.equal(e.probeSHA256,m.evidence[historical+'probe.bend']);assert.equal(e.wholeBookValid,true);assert.equal(e.holes,0);assert.deepEqual(e.exports,exports7);
 assert.deepEqual(e.preloaded,[['core/Model.bend','core/Model'],['core/MatchSpec.bend','core/MatchSpec'],['core/v2/Facade.bend','core/v2/Facade'],['core/v3/prepared-match/Match.bend','core/v3/prepared-match/Match'],['core/v3/prepared-match/CHECK.bend','core/v3/prepared-match/CHECK']]);
 inventory(e.sources,18);for(const x of e.sources){
  if(x.path===compilerRoot+'/base.bend')assert.equal(x.sha256,e.compilerInventory.find(y=>y.path===x.path).sha256);
  else if(x.path===privateRoot+'PreparedV3ProbeR1.bend')assert.equal(x.sha256,e.probeSHA256);
  else assert.equal(x.sha256,m.files[x.path]??r.parentManifest.files[x.path]);
 }
 const inputs=inventory(e.authenticatedInputs,e.authenticatedInputs.length),byPath=new Map(inputs.map(x=>[x.path,x.sha256]));
 for(const x of [...e.compilerInventory,...e.sources])assert.equal(byPath.get(x.path),x.sha256);
 for(const x of current.packet.current.closure){const name=x.path==='<derived>/bend2/base.bend'?compilerRoot+'/base.bend':x.path;assert.equal(byPath.get(name),x.sha256);}
 for(const x of lineage.dependencies){
  if(byPath.has(x.path))assert.equal(byPath.get(x.path),x.sha256);
  else {assert.equal(x.path,privateRoot+'prepared-current99-diff-r1.mjs');fenceInput(r.finiteTerminal,x.path,x.sha256);}
 }
 assert.equal(e.wrapperExecutionManifestSHA256,lineage.dependencies.find(x=>x.path===privateRoot+'worker-cli-wrapper-execution-manifest-r1.json').sha256);
 native(r.emissionTerminal,lineage.qualification.emissionManifest.sha256);native(r.finiteTerminal,lineage.qualification.finiteResult.sha256);
 assert.deepEqual(r.emissionTerminal.result.output,e.output);assert.deepEqual(e.output,{file:'prepared-match.js',bytes:121547,sha256:lineage.qualification.module.sha256});
 for(const x of inputs){fenceInput(r.emissionTerminal,x.path,x.sha256);fenceInput(r.finiteTerminal,x.path,x.sha256);}
 for(const x of [lineage.qualification.emissionTerminal,lineage.qualification.emissionManifest,lineage.qualification.module])fenceInput(r.finiteTerminal,x.path,x.sha256);
 assert.equal(r.sourceReview.schema,'rift-private-prepared-current99-source-review/1');assert.equal(r.sourceReview.accepted,true);assert.deepEqual(r.sourceReview.findings,[]);
 for(const name of ['compilerFiles','aggregateClosureAuthenticatedFiles','probeClosureFiles','loadedBendClosureFiles'])assert.equal(r.sourceReview.binding[name],{compilerFiles:99,aggregateClosureAuthenticatedFiles:62,probeClosureFiles:86,loadedBendClosureFiles:18}[name]);
 assert.deepEqual(r.sourceReview.binding.exports,exports7);assert.equal(r.sourceReview.binding.plannedFiniteCases,61);assert.equal(r.sourceReview.binding.plannedFiniteControls,5);
 for(const x of inputs){const matches=Object.entries(r.sourceReview.inputs).filter(([s])=>s.replaceAll('\\','/').endsWith('/'+x.path));assert.equal(matches.length,1);assert.equal(matches[0][1],x.sha256);}
 assert.equal(f.schema,'rift-private-prepared-current99-differential/1');assert.equal(f.ok,true);assert.equal(f.networkCalls,0);assert.equal(f.cases,61);assert.equal(f.controlCases,5);assert.equal(f.rows.length,61);assert.equal(f.controls.length,5);
 assert.equal(f.emissionTerminalSHA256,lineage.qualification.emissionTerminal.sha256);assert.equal(f.emissionManifestSHA256,lineage.qualification.emissionManifest.sha256);assert.equal(f.moduleSHA256,e.output.sha256);
 assert.equal(f.compilerRoot,compilerRoot);assert.equal(f.compilerFiles,99);assert.equal(f.compilerInventorySHA256,hash(JSON.stringify(e.compilerInventory)));
 assert.equal(f.lineageSHA256,e.lineageSHA256);assert.equal(f.probeSHA256,e.probeSHA256);assert.deepEqual(f.frozenPrepared,frozen);assert.equal(f.canonicalConstructorTagsOnly,true);assert.equal(f.sourceFencesPassed,true);inverseWorkload(r);
 assert.deepEqual(e.runtime,{kind:'main-thread guarded Bun emission',bunVersion:'1.4.2',executableSHA256:'15277c59ccd6c6c20f8dc9716c2b59c1776320d606b6a8658f70be8799519ca4',nodeWorker64MiBQualification:false});
 assert.deepEqual(f.runtime,{bunVersion:e.runtime.bunVersion,executableSHA256:e.runtime.executableSHA256});
 assert.equal(e.provenance.accepted27ModuleSHA256,'cd854476f06baf98a3a08f69cca9fb3c8b52bb84ebf8a7f254572647faed00a5');
 assert.equal(e.provenance.accepted27EmissionResultSHA256,lineage.dependencies.find(x=>x.path===privateRoot+'prepared-v3-accepted27-emission-r1/result.json').sha256);
 assert.equal(e.provenance.accepted27DifferentialSHA256,m.evidence[historical+'differential-result.json']);assert.equal(e.provenance.frozenWorkloadSHA256,m.evidence[historical+'differential.mjs']);
 assert.deepEqual(f.historicalAccepted27,{moduleSHA256:e.provenance.accepted27ModuleSHA256,emissionResultSHA256:e.provenance.accepted27EmissionResultSHA256,differentialSHA256:e.provenance.accepted27DifferentialSHA256,reexecuted:false,retagged:false});
 assert.equal(r.historicalDifferential.ok,true);assert.equal(r.historicalDifferential.rows.length,61);assert.equal(r.historicalDifferential.controls.length,5);
 assert.equal(r.historicalEmissionResult.ok,true);assert.equal(r.historicalEmissionResult.compilerVersion,'2.0.27');assert.equal(r.historicalEmissionResult.unfilled,0);assert.equal(r.historicalEmissionResult.networkCalls,0);
 assert.equal(r.historicalEmissionResult.output,'prepared-v3-accepted27-emission-r1/prepared-match.js');assert.equal(r.historicalEmissionResult.outputSHA256,e.provenance.accepted27ModuleSHA256);assert.deepEqual(r.historicalEmissionResult.exports,exports7);
 assert.deepEqual(f.rows.map(x=>({label:x.label,accepted:x.accepted,carriedCount:x.carriedCount})),r.historicalDifferential.rows.map(x=>({label:x.label,accepted:x.accepted,carriedCount:x.carriedCount})));
 assert.deepEqual(f.controls.map(x=>({label:x.label,oldIdsMismatch:x.oldIdsMismatch})),r.historicalDifferential.controls.map(x=>({label:x.label,oldIdsMismatch:x.oldIdsMismatch})));
 assert.ok(f.controls.every(x=>x.oldIdsMismatch===true&&x.oldIdsSHA256!==x.newIdsSHA256));assert.equal(f.rows.filter(x=>x.accepted).length,50);assert.equal(f.rows.filter(x=>x.carriedCount!==null).length,44);
 assert.equal(r.finiteTerminal.result.cases,61);assert.equal(r.finiteTerminal.result.controls,5);
 const disposition=r.disposition;assert.equal(disposition.schema,'rift-private-prepared-current99-disposition/1');assert.equal(disposition.disposition,'accepted finite qualification; unadopted');
 for(const name of ['sourceReview','emissionTerminal','emissionManifest','module','finiteTerminal','finiteResult']){
  const {bytes,...identity}=disposition.evidence[name];assert.ok(Number.isSafeInteger(bytes)&&bytes>0);assert.deepEqual(identity,lineage.qualification[name]);
 }
 assert.equal(disposition.finite.completeWithinCandidateErasedResultEquality,true);assert.equal(disposition.finite.inputPurity,true);assert.equal(disposition.finite.orderedReturnedPositionLegalIDs,true);
 return {creationRelationsValid:true,qualificationRelationsValid:true,authenticatedInputRequirement:true,fullCurrent99ValidationPerformedByThisFunction:false};
}

// No caller-supplied paths, hashes, approvals or execution arms.
export async function capturePreparedQualification(){
 assert.equal(arguments.length,0);assert.equal(fs.realpathSync(root),root);
 const fences=new Map();let readBytes=0;
 function bytes(p,max=16*1024**2){
  p=path.join(root,...relative(p).split('/'));assert.equal(fs.realpathSync(p),p);const before=fs.lstatSync(p,{bigint:true});
  const same=s=>{assert.ok(s.isFile()&&!s.isSymbolicLink());for(const k of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(s[k],before[k]);};
  same(before);assert.ok(before.size>0n&&before.size<=BigInt(max));const fd=fs.openSync(p,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
  try{same(fs.fstatSync(fd,{bigint:true}));const b=fs.readFileSync(fd);same(fs.fstatSync(fd,{bigint:true}));same(fs.lstatSync(p,{bigint:true}));assert.equal(fs.realpathSync(p),p);assert.equal(BigInt(b.length),before.size);readBytes+=b.length;assert.ok(readBytes<=32*1024**2);return b;}finally{fs.closeSync(fd);}
 }
 function bound(reference){ref(reference);const b=bytes(reference.path);assert.equal(hash(b),reference.sha256,reference.path);fences.set(reference.path,reference.sha256);return b;}
 function json(b){const s=b.toString('utf8');assert.ok(Buffer.from(s).equals(b));return JSON.parse(s);}
 const raw=bytes(here+'lineage.json',65536),lineage=json(raw);fences.set(here+'lineage.json',hash(raw));
 lineageShape(lineage);for(const x of lineage.files)bound(x);
 const dependencyBytes=new Map(lineage.dependencies.map(x=>[x.path,bound(x)]));
 const creation=Object.fromEntries(Object.entries(lineage.creation).map(([k,x])=>[k,json(bound(x))]));
 const qualification=Object.fromEntries(Object.entries(lineage.qualification).filter(([k])=>k!=='module').map(([k,x])=>[k,json(bound(x))]));bound(lineage.qualification.module);
 const m=creation.manifest;for(const [p,h]of [...Object.entries(m.files),...Object.entries(m.evidence)])bound({path:p,sha256:h});
 for(const [p,h]of Object.entries(creation.publication.sourceSHA256))bound({path:p,sha256:h});
 const current99Lineage=json(dependencyBytes.get(gate+'lineage.json'));
 for(const x of current99Lineage.files)bound(x);
 const current99Records=Object.fromEntries(Object.entries(current99Lineage.evidence).map(([k,x])=>[k,json(bound(x))]));
 for(const x of current99Records.packet.consumerFiles)bound(x);
 const records={creationManifest:m,parentManifest:creation.parent,publication:creation.publication,publicationSteps:creation.steps,
  current99Lineage,current99Records,...qualification,historicalDifferential:json(dependencyBytes.get(privateRoot+'prepared-v3-diff-r1/result.json')),
  historicalEmissionResult:json(dependencyBytes.get(privateRoot+'prepared-v3-accepted27-emission-r1/result.json')),
  reviewText:bound({path:historical+'review.md',sha256:m.evidence[historical+'review.md']}).toString('utf8'),
  producerText:dependencyBytes.get(privateRoot+'prepared-current99-diff-r1.mjs').toString('utf8'),workloadText:dependencyBytes.get(historical+'differential.mjs').toString('utf8')};
 const relations=validatePreparedQualification(lineage,records);
 // Already authenticated above. Import only the pure relational validator;
 // never call its Git/Worker/compiler-bound capture path.
 const {validateCurrent99Evidence}=await import(pathToFileURL(path.join(root,gate+'admission.mjs')).href);
 validateCurrent99Evidence(current99Lineage,current99Records);
 const creatorObservations=[];for(const group of ['inputs','proofInputs','emissionInputs'])for(const [p,expected]of Object.entries(m.compiler[group])){
  const absolute=path.join(root,...relative(p).split('/'));if(fs.lstatSync(absolute,{throwIfNoEntry:false})===undefined){creatorObservations.push({path:p,retained:false,expectedSHA256:expected});continue;}
  const observed=hash(bytes(p));fences.set(p,observed);creatorObservations.push({path:p,retained:true,expectedSHA256:expected,observedSHA256:observed,historicalBytesMatch:observed===expected});
 }
 for(const [p,h]of fences)assert.equal(hash(bytes(p)),h,p);
 return {schema:'rift-prepared-qualification-capture/1',historicalCreationVerified:true,...relations,current99EvidenceRelationsVerified:true,
  lineage:{path:here+'lineage.json',sha256:hash(raw)},creation:{manifest:lineage.creation.manifest,parent:lineage.creation.parent,
   publication:lineage.creation.publication,verifierReadback:lineage.creation.steps,creatorVersion:m.compiler.version,creatorCommit:m.compiler.commit,
   canonicalContentSHA256:creation.publication.verifier.canonicalContentSHA256,recordedPublicationCommit:creation.publication.head,creatorPathObservations:creatorObservations,parentCurrentMeaningVerified:false},
  laterQualification:{recordedUTC:records.disposition.observedUTC,compilerRoot,compilerInventorySHA256:records.finiteResult.compilerInventorySHA256,
   compilerFiles:99,sourceReview:lineage.qualification.sourceReview,emission:lineage.qualification.emissionManifest,module:lineage.qualification.module,
   finite:lineage.qualification.finiteResult,disposition:lineage.qualification.disposition,cases:61,controls:5,mainThreadBun:true,nodeWorker64MiBQualification:false,
   historicalProjectionOnly:true,commonModeCompilerErrorsCovered:false,liveCompilerFreshnessVerified:false,historicalConsumerProvenanceFiles:14},
  freshProofExecutions:0,generatedModuleExecutedByReader:false,executionAllowed:false,approvedKernel:null,approvedLinuxRuntime:null,adoptionAuthority:false,
  limits:'Retained authenticated historical creation and later finite qualification only. Shared-compiler errors remain outside the differential. Consequential current applicability requires fresh source/compiler/consumer validation and separate adoption/amendment authority; parent current meaning is a separate immutable-freeze duty.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))throw Error('prepared qualification has no CLI or direct execution entry');
