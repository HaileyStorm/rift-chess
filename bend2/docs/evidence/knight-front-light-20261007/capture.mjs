// Factual additive application lineage; original proof/adoption consumers stay exact.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
function read(file){
 assert.ok(file&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.split('/').includes('..'));
 const absolute=path.resolve(root,file);assert.equal(fs.realpathSync(absolute),absolute);
 const before=fs.lstatSync(absolute,{bigint:true});assert.ok(before.isFile()&&!before.isSymbolicLink());
 const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute,{bigint:true});
 for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(before[key],after[key]);return bytes;
}
function exact(entry){assert.match(entry.sha256,/^[0-9a-f]{64}$/);const bytes=read(entry.path);assert.equal(hash(bytes),entry.sha256,`Changed source/evidence: ${entry.path}`);return bytes;}
const manifestPath='bend2/docs/evidence/knight-front-light-20261007/acceptance.json',raw=read(manifestPath),m=JSON.parse(raw);
assert.equal(m.schema,'rift-knight-front-light-application/1');assert.equal(m.scope,'candidate-source-browser-only');
assert.equal(m.disposition,'reviewed');assert.equal(m.adopted,false);
assert.deepEqual(m.parent,{path:'bend2/docs/evidence/canonical-match-20261007/acceptance.json',sha256:'18d1c39fb87299802d527244162bb5d15168b912928d6538d7a16221d9e16e93'});
const parent=JSON.parse(exact(m.parent));assert.equal(parent.schema,'rift-canonical-match-application/1');assert.equal(parent.disposition,'reviewed');assert.equal(parent.adopted,false);
assert.equal(m.candidate,parent.candidate);
exact({path:'bend2/tools/selected-modules.mjs',sha256:'3638db30ce2c4d9e3ba13272bed451c093bf36de6edae227c16463d832ee766d'});
for(const source of parent.sources)if(source.path!=='bend2/toolchain-patches/2035/build-preview.mjs')exact(source);
for(const item of parent.originalConsumers)exact(item);assert.equal(parent.originalConsumers.length,12);
const creation=JSON.parse(exact(parent.creationReceipt));assert.equal(creation.before.sourceFiles.length,315);
const changes=new Map([...parent.creationSourceAmendments,m.knightAmendment].map(x=>[x.path,x]));
assert.equal(changes.size,3);assert.deepEqual([...changes.keys()].sort(),['bend2/graphics/v2game/KnightMesh.bend','bend2/ui/Commands.bend','bend2/ui/State.bend']);
let retained=0;for(const item of creation.before.sourceFiles){const change=changes.get(item.path);if(change){assert.equal(change.beforeSha256,item.sha256);exact({path:item.path,sha256:change.afterSha256});}else{exact(item);retained++;}}assert.equal(retained,312);
for(const item of parent.evidence)exact(item); // Historical successful receipts, not a current-source replay.
const seen=new Set();for(const item of m.sources){assert.ok(!seen.has(item.path));seen.add(item.path);exact(item);}
const review=JSON.parse(exact(m.review));assert.equal(review.disposition,'accepted');
for(const item of m.sources)assert.equal(review.sourceHashes[item.path],item.sha256,'Review postimage differs');
for(const item of m.evidence){const data=JSON.parse(exact(item));if(item.kind==='terminal'){
 assert.equal(data.passed,true);assert.equal(data.exitCode,0);assert.equal(data.samePopenExitObserved,true);
 assert.equal(data.checkedExitedHandleClosed,true);assert.equal(data.postBindingJobSelfOnly,true);assert.equal(data.checkedJobClosed,true);assert.deepEqual(data.before,data.after);
}else if(item.kind==='result')assert.equal(data.passed??data.ok,true);}
const caches=new Map();for(const entry of m.caches){const data=JSON.parse(exact(entry));assert.equal(data.schema,'rift-bend-selected-cache/2035-1');
 assert.equal(data.bindingSha256,hash(JSON.stringify(data.binding)));assert.equal(data.networkCalls,0);
 for(const item of data.binding.sourceFiles)exact(item);
 for(const item of data.binding.pristineFiles)exact({path:'.artifacts/toolchains/bend-2.0.35-scout/bend2/'+item.path,sha256:item.sha256});
 for(const item of data.binding.derivedFiles)exact({path:'.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/'+item.path,sha256:item.sha256});
 const output=exact({path:path.posix.join(path.posix.dirname(entry.path),data.output.file),sha256:data.output.sha256});assert.equal(output.length,data.output.bytes);
 const name=path.posix.basename(data.output.file,'.js');assert.ok(!caches.has(name));caches.set(name,{entry,data});
}
assert.deepEqual([...caches.keys()].sort(),['controller','menu','scene']);
assert.equal(caches.get('controller').data.output.sha256,'b2002a2ac3b522a1e9bacb171dbd5eee3a2061250c657712168190e6da1414ad');
const build=JSON.parse(exact(m.build));assert.equal(build.candidate,m.candidate);assert.equal(build.adopted,false);
for(const [name,{entry,data}]of caches){const selected=build.selected[name];assert.equal(selected.manifest,entry.path);assert.equal(selected.manifestSha256,entry.sha256);assert.equal(selected.outputSha256,data.output.sha256);assert.equal(selected.bindingSha256,data.bindingSha256);}
for(const [name,sha256]of Object.entries(build.files))exact({path:path.posix.join(path.posix.dirname(m.build.path),name),sha256});
for(const item of m.artifacts)exact(item);
assert.deepEqual(read(manifestPath),raw,'Manifest changed during capture');
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
git('merge-base','--is-ancestor',m.baseline,'HEAD');
console.log(JSON.stringify({schema:'rift-knight-front-light-capture/1',manifestSha256:hash(raw),currentCommit:git('rev-parse','HEAD'),currentDirty:Boolean(git('status','--porcelain=v1')),retainedCreationSources:retained,amendedCreationSources:changes.size,originalConsumersUnchanged:parent.originalConsumers.length,buildVersion:build.version,controllerBytesUnchanged:true,newProofWorkers:0,adopted:false,scope:'Exact current application/package bytes and retained execution evidence only; historical canonical and /2 captures stay unchanged. No proof/kernel/native/device/adoption authority.'},null,2));
