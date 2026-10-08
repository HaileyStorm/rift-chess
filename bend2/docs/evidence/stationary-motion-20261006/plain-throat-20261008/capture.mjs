// Current candidate graphics/package evidence; retained proof receipts are historical.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
function read(file){
 assert.ok(file&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.split('/').some(x=>!x||x==='..'));
 const absolute=path.resolve(root,file);assert.equal(fs.realpathSync(absolute),absolute);
 const a=fs.lstatSync(absolute,{bigint:true});assert.ok(a.isFile()&&!a.isSymbolicLink());
 const bytes=fs.readFileSync(absolute),b=fs.lstatSync(absolute,{bigint:true});
 for(const k of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(a[k],b[k]);return bytes;
}
function exact(x){assert.match(x.sha256,/^[0-9a-f]{64}$/);const b=read(x.path);assert.equal(hash(b),x.sha256,`Changed source/evidence: ${x.path}`);return b;}
const json=x=>JSON.parse(exact(x));
const file='bend2/docs/evidence/stationary-motion-20261006/plain-throat-20261008/acceptance.json',raw=read(file),m=JSON.parse(raw);
assert.equal(m.schema,'rift-plain-throat-application/1');assert.equal(m.scope,'candidate-source-browser-only');assert.equal(m.disposition,'reviewed');assert.equal(m.adopted,false);
assert.equal(m.candidate,'79df8d9c40722ee9507a1e253f283b51025f9d6c');
assert.deepEqual(m.parent,{path:'bend2/docs/evidence/motion-alpha-bounds-20261007/acceptance.json',sha256:'94c49592c364877be3dfd9d5deeb18a76e7b47ec8b7b1bb73697525b3f122b97'});
const parent=json(m.parent);assert.equal(parent.disposition,'reviewed');assert.equal(parent.adopted,false);
const retained=json(m.historicalCapture);assert.equal(retained.exitCode,0);assert.equal(JSON.parse(retained.stdout).manifestSha256,m.parent.sha256);
// Preserve accepted parent as a dated checkpoint. Do not rewrite or replay it
// against changed current sources, or promote it to new proof authority.
const parser=json(parent.parent),front=json(parser.parent),canonical=json(front.parent);
const creation=json(canonical.creationReceipt);assert.equal(creation.before.sourceFiles.length,315);
const changes=new Map([...canonical.creationSourceAmendments,front.knightAmendment].map(x=>[x.path,x]));assert.equal(changes.size,3);
assert.deepEqual(m.amendments.map(x=>[x.path,x.beforeSha256,x.afterSha256]),[
 ['bend2/graphics/v2game/KnightMesh.bend','a8a5585f8fe82e593514bfbe25fe140a1f05c9ebdbf2a2b778bbb0c2a49c6046','db4def8865d00938ee41999a9d47cd9014c8fc755218fcf263cc9bd84901a6e1'],
 ['bend2/toolchain-patches/2035/build-preview.mjs','729a491088e700a8394775f80ce57c8db99f7800ede64a539d485821023f65c4','2811acb8467471f2fae6571f64fde68863cb4dff4eecb06f04edc9d58b21aac8']]);
for(const x of m.amendments){assert.equal(x.preimage.sha256,x.beforeSha256);exact(x.preimage);exact({path:x.path,sha256:x.afterSha256});}
assert.equal(changes.get(m.amendments[0].path).afterSha256,m.amendments[0].beforeSha256);
changes.set(m.amendments[0].path,{...changes.get(m.amendments[0].path),afterSha256:m.amendments[0].afterSha256});
let retainedSources=0;for(const x of creation.before.sourceFiles){const amendment=changes.get(x.path);if(amendment){assert.equal(amendment.beforeSha256,x.sha256);exact({path:x.path,sha256:amendment.afterSha256});}else{exact(x);retainedSources++;}}assert.equal(retainedSources,312);
for(const x of canonical.originalConsumers)exact(x);assert.equal(canonical.originalConsumers.length,12);
// Manifest hashes predate reviewed law-document/tool amendments. Their exact
// current bytes are already in creation.sourceFiles; use the existing verified
// amendment chain for frozen-manifest expectations, never an ad hoc exception.
const {resolveFrozen}=await import('../../../../tools/amendments.mjs');
for(const key of ['frozenFiles','v2FrozenFiles'])for(const [path,sha256]of Object.entries(creation.before[key]))exact({path,sha256:resolveFrozen(path,sha256)});
exact({path:'bend2/tools/selected-modules.mjs',sha256:'3638db30ce2c4d9e3ba13272bed451c093bf36de6edae227c16463d832ee766d'});
for(const x of parent.sources)if(x.path!==m.amendments[1].path)exact(x);
const review=json(m.review);assert.equal(review.disposition,'accepted');assert.equal(review.scope,m.scope);
for(const x of m.amendments)assert.equal(review.sourceHashes[x.path],x.afterSha256);
const build=json(m.build);assert.equal(build.candidate,m.candidate);assert.equal(build.adopted,false);assert.equal(build.sourceRevision,m.baseline);assert.equal(build.sourceDirty,true);
for(const x of build.sources)exact(x);
const oldBuild=json(parent.build);for(const k of ['toolchain','runtime','preparedCore','workerLibraries'])assert.deepEqual(build[k],oldBuild[k]);
assert.deepEqual(build.files&&Object.keys(build.selected).sort(),['controller','menu','scene']);
for(const [name,x]of Object.entries(build.selected)){
 const c=json({path:x.manifest,sha256:x.manifestSha256});assert.equal(c.bindingSha256,hash(JSON.stringify(c.binding)));assert.equal(c.networkCalls,0);
 assert.equal(c.bindingSha256,x.bindingSha256);assert.equal(c.output.sha256,x.outputSha256);
 for(const p of c.binding.sourceFiles)exact(p);
 for(const [key,prefix]of [['pristineFiles','.artifacts/toolchains/bend-2.0.35-scout/bend2/'],['derivedFiles','.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/']])for(const p of c.binding[key])exact({path:prefix+p.path,sha256:p.sha256});
 assert.equal(exact({path:path.posix.dirname(x.manifest)+'/'+c.output.file,sha256:c.output.sha256}).length,c.output.bytes);
}
for(const [name,sha256]of Object.entries(build.files))exact({path:path.posix.dirname(m.build.path)+'/'+name,sha256});
const metadata=build.preparedGround.metadataFile;assert.equal(metadata,oldBuild.preparedGround.metadataFile);
for(const [name,sha256]of Object.entries(oldBuild.files).filter(([n])=>n.startsWith('assets/')&&n!==metadata))assert.equal(build.files[name],sha256);
const oldMeta=json({path:path.posix.dirname(parent.build.path)+'/'+metadata,sha256:oldBuild.files[metadata]}),newMeta=json({path:path.posix.dirname(m.build.path)+'/'+metadata,sha256:build.files[metadata]});
const withoutSelection=x=>Object.fromEntries(Object.entries(x).filter(([k])=>k!=='selected'));assert.deepEqual(withoutSelection(newMeta),withoutSelection(oldMeta));
for(const name of ['scene','controller'])for(const [key,selectedKey]of [['manifestPath','manifest'],['manifestSha256','manifestSha256'],['outputSha256','outputSha256'],['bindingSha256','bindingSha256']])assert.equal(newMeta.selected[name][key],build.selected[name][selectedKey]);
function terminal(x){const t=json(x);assert.equal(t.passed,true);assert.equal(t.exitCode,0);assert.deepEqual(t.before,t.after);
 for(const k of ['samePopenExitObserved','checkedExitedHandleClosed','postBindingJobSelfOnly','checkedJobClosed'])assert.equal(t[k],true);
 for(const [absolute,sha256]of Object.entries(t.before)){assert.ok(path.isAbsolute(absolute));assert.equal(fs.realpathSync(absolute),absolute);assert.equal(hash(fs.readFileSync(absolute)),sha256,`Native input changed: ${absolute}`);}return t;
}
const terminals=new Map(m.terminals.map(x=>[x.path,terminal(x)]));
for(const [name,index]of [['scene',0],['controller',1]]){const t=terminals.get(m.terminals[index].path);assert.equal(t.result.manifestSha256,build.selected[name].manifestSha256);assert.equal(t.result.output.sha256,build.selected[name].outputSha256);}
assert.equal(terminals.get(m.terminals[3].path).result.buildSha256,m.build.sha256);
for(const [field,index]of [['textures',2],['focused',4],['moving',5]])assert.equal(terminals.get(m.terminals[index].path).result.resultSHA256,m[field].sha256);
const textures=json(m.textures);assert.equal(textures.passed,true);assert.equal(textures.records.length,12);assert.equal(textures.boards.length,2);assert.equal(textures.networkCalls,0);assert.equal(textures.manifestSHA256,build.selected.scene.manifestSha256);
for(const r of textures.records){assert.equal(r.exactRetainedPlainRGB,true);assert.equal(r.exactRetainedPlainAlpha,true);}
const focused=json(m.focused);assert.equal(focused.passed,true);assert.equal(focused.buildSHA256,m.build.sha256);assert.equal(focused.picks.length,4);assert.deepEqual(focused.errors,[]);assert.deepEqual(focused.external,[]);
const moving=json(m.moving);assert.equal(moving.ok,true);assert.equal(moving.buildSHA256,m.build.sha256);assert.equal(moving.witness.planScale,1);assert.deepEqual(moving.errors,[]);assert.deepEqual(moving.external,[]);
const w=moving.witness;assert.equal(w.oldProbe.probe.incoming.pose.progress,0);assert.equal(w.oldProbe.probe.frame.progress,8);assert.equal(w.oldProbe.probe.frame.hovered,23);assert.equal(w.clearProbe.probe.incoming.pose.progress,8);assert.equal(w.clearProbe.probe.frame.hovered,14);
assert.deepEqual(w.staging.map(x=>x.row.probe.revision),[1,1,1,2]);assert.ok(w.retirement.retirements.some(r=>r.masks.some(x=>x.id===w.beforeOrbit.shown.atlasMaskId&&x.offer>=w.beforeOrbit.shown.atlasMaskOffer)));
assert.deepEqual(m.offline,m.terminals[6]);const offline=terminals.get(m.offline.path).result;assert.equal(offline.ok,true);assert.equal(offline.buildVersion,build.version);assert.equal(offline.offlineMove,'g1-h3');assert.equal(offline.offlineSavedReload,true);assert.equal(offline.offlinePreparedGroundHit,1);assert.equal(offline.onlineInitialSha256,offline.offlineInitialSha256);
for(const x of m.artifacts)exact(x);assert.deepEqual(read(file),raw);
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:30000,stdio:['ignore','pipe','pipe']}).trim();git('merge-base','--is-ancestor',m.baseline,'HEAD');
console.log(JSON.stringify({schema:'rift-plain-throat-capture/1',manifestSha256:hash(raw),currentCommit:git('rev-parse','HEAD'),currentDirty:Boolean(git('status','--porcelain=v1')),retainedCreationSources:312,amendedCreationSources:3,originalConsumersUnchanged:12,texturePairs:12,boards:2,opaqueAndTransparentPicks:4,movingPosePick:true,offlineSavedReload:true,adopted:false,scope:'Current graphics/source/package/browser checks; parent capture is historical. No new proof/kernel/Linux/native/device/performance/owner acceptance.'},null,2));
