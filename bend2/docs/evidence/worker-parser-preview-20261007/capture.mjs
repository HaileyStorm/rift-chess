// Additive factual application lineage. Historical proof/adoption consumers stay exact.
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
function json(entry){return JSON.parse(exact(entry));}
function terminal(entry){const t=json(entry);assert.equal(t.passed,true);assert.equal(t.exitCode,entry.kind==='negative-terminal'?1:0);
 for(const k of ['samePopenExitObserved','checkedExitedHandleClosed','postBindingJobSelfOnly','checkedJobClosed'])assert.equal(t[k],true);
 assert.deepEqual(t.before,t.after);return t;
}
const manifestPath='bend2/docs/evidence/worker-parser-preview-20261007/acceptance.json',raw=read(manifestPath),m=JSON.parse(raw);
assert.equal(m.schema,'rift-worker-parser-preview-application/1');assert.equal(m.scope,'candidate-source-browser-only');
assert.equal(m.disposition,'reviewed');assert.equal(m.adopted,false);
assert.deepEqual(m.parent,{path:'bend2/docs/evidence/knight-front-light-20261007/acceptance.json',sha256:'765058d5fca26d587b705bd49ecf40294af6ef5c27192fc7411b87d683a6ca8b'});
const front=json(m.parent);assert.equal(front.schema,'rift-knight-front-light-application/1');assert.equal(front.disposition,'reviewed');assert.equal(front.adopted,false);
assert.deepEqual(front.parent,{path:'bend2/docs/evidence/canonical-match-20261007/acceptance.json',sha256:'18d1c39fb87299802d527244162bb5d15168b912928d6538d7a16221d9e16e93'});
const parent=json(front.parent);assert.equal(parent.schema,'rift-canonical-match-application/1');assert.equal(parent.disposition,'reviewed');assert.equal(parent.adopted,false);
assert.equal(m.candidate,front.candidate);assert.equal(m.candidate,parent.candidate);
exact({path:'bend2/tools/selected-modules.mjs',sha256:'3638db30ce2c4d9e3ba13272bed451c093bf36de6edae227c16463d832ee766d'});
const builder='bend2/toolchain-patches/2035/build-preview.mjs';
for(const source of [...parent.sources,...front.sources])if(source.path!==builder)exact(source);
assert.equal(m.builderAmendment.path,builder);assert.equal(m.builderAmendment.beforeSha256,front.sources.find(x=>x.path===builder).sha256);
assert.equal(m.builderAmendment.beforeSha256,'4f66d30233f041b41c71031ac813dd580a0ba7110f1a0ba4f2ba2015dfcaed29');
assert.equal(hash(exact(m.builderAmendment.preimage)),m.builderAmendment.beforeSha256);exact({path:builder,sha256:m.builderAmendment.afterSha256});
for(const item of parent.originalConsumers)exact(item);assert.equal(parent.originalConsumers.length,12);
const creation=json(parent.creationReceipt);assert.equal(creation.before.sourceFiles.length,315);
const changes=new Map([...parent.creationSourceAmendments,front.knightAmendment].map(x=>[x.path,x]));
assert.equal(changes.size,3);assert.deepEqual([...changes.keys()].sort(),['bend2/graphics/v2game/KnightMesh.bend','bend2/ui/Commands.bend','bend2/ui/State.bend']);
let retained=0;for(const item of creation.before.sourceFiles){const change=changes.get(item.path);if(change){assert.equal(change.beforeSha256,item.sha256);exact({path:item.path,sha256:change.afterSha256});}else{exact(item);retained++;}}assert.equal(retained,312);
for(const item of [...parent.evidence,...front.evidence,...front.artifacts])exact(item); // Retained original records, not current execution retags.
const oldReview=json(front.review);assert.equal(oldReview.disposition,'accepted');for(const source of front.sources)assert.equal(oldReview.sourceHashes[source.path],source.sha256);
const seen=new Set();for(const source of m.sources){assert.ok(!seen.has(source.path));seen.add(source.path);exact(source);}
assert.equal(m.sources.find(x=>x.path===builder).sha256,m.builderAmendment.afterSha256);
const review=json(m.review);assert.equal(review.disposition,'accepted');for(const source of m.sources)assert.equal(review.sourceHashes[source.path],source.sha256);
const workerReview=json(m.workerReview);assert.equal(workerReview.disposition,'accepted');for(const [file,digest]of Object.entries(workerReview.sourceHashes))exact({path:file,sha256:digest});
const verification=json(m.workerVerification);assert.equal(verification.passed,true);assert.equal(workerReview.verificationSHA256,m.workerVerification.sha256);
for(const item of m.evidence)if(item.kind?.endsWith('terminal'))terminal(item);else exact(item);
const bot=json(m.botBinding);assert.equal(m.botBinding.sha256,'e33380e50eda1db29c5ba4526de408f9fdcb3aa95356c75e3e390eaf84581363');
assert.equal(bot.schema,'rift-bend-worker-source-binding/2035-2');assert.equal(bot.ok,true);assert.equal(bot.upstreamCommit,m.candidate);
assert.equal(bot.networkCalls,0);assert.equal(bot.sourceRoot,'bend2/platform/worker/BotAdapter.bend');assert.deepEqual(bot.exports,['choose']);
assert.equal(bot.compilerSourceTreeSha256,hash(JSON.stringify(bot.compiler)));assert.equal(Object.keys(bot.compiler).length,98);
assert.equal(bot.compilerLineage.revision,'rift-worker-parser/2035-1');assert.deepEqual(bot.compilerLineage.changedFiles,['bend.ts']);
const corrected='.artifacts/bend2/toolchain-patches/workers-2035-parser-r1/bend2/';
const original='.artifacts/bend2/toolchain-patches/workers-2035-candidate/bend2/';
assert.equal(path.resolve(bot.compilerLineage.parentDirectory),path.resolve(root,'.artifacts/bend2/toolchain-patches/workers-2035-candidate'));
assert.deepEqual(Object.keys(bot.compiler).sort(),Object.keys(bot.compilerLineage.parentCompiler).sort());
for(const [name,digest]of Object.entries(bot.compiler)){
 exact({path:corrected+name,sha256:digest});exact({path:original+name,sha256:bot.compilerLineage.parentCompiler[name]});
 if(name!=='bend.ts')assert.equal(digest,bot.compilerLineage.parentCompiler[name]);
}
assert.equal(bot.compiler['bend.ts'],'0eab46d06cd349ecd2dd0495b116a6f57f1e483040597cf7aded953711bf8d26');
assert.equal(hash(read('.artifacts/bend2/toolchain-patches/workers-stage2-20260925/bend2/bend.ts').toString('utf8').replaceAll('\r\n','\n')),bot.compilerLineage.acceptedNormalizedSHA256);
for(const item of bot.sources)exact(item);
for(const group of [bot.implementation,bot.loaderDependencies,bot.compilerLineage.implementation])for(const [file,digest]of Object.entries(group))exact({path:file,sha256:digest});
const diagnostic=json(bot.diagnostic);assert.equal(diagnostic.ok,true);assert.deepEqual(diagnostic.compiler,bot.compiler);assert.deepEqual(diagnostic.compilerLineage,bot.compilerLineage);
assert.deepEqual(diagnostic.fixtures,bot.diagnostic.fixtures);assert.deepEqual(diagnostic.engine,bot.diagnostic.engine);assert.equal(diagnostic.program,bot.diagnostic.program);
for(const [file,digest]of Object.entries(diagnostic.fixtures))exact({path:'bend2/toolchain-patches/2035/workers/'+file,sha256:digest});
const botDir=path.posix.dirname(m.botBinding.path),botManifest=json({path:botDir+'/manifest.json',sha256:bot.manifestSha256});
assert.equal(botManifest.program,bot.program);assert.equal(botManifest.mode,'required-only');assert.equal(botManifest.policy,'strict');assert.equal(botManifest.protocol,1);
assert.deepEqual(Object.keys(bot.artifacts).sort(),Object.values(botManifest.artifacts).sort());assert.equal(Object.keys(bot.artifacts).length,5);
for(const [file,digest]of Object.entries(bot.artifacts))exact({path:botDir+'/'+file,sha256:digest});
const oldBot=json(m.oldBotBinding);assert.deepEqual(oldBot.artifacts,bot.artifacts);for(const [file,digest]of Object.entries(oldBot.artifacts))exact({path:path.posix.dirname(m.oldBotBinding.path)+'/'+file,sha256:digest});
const caches=new Map();assert.deepEqual(m.caches,front.caches);
for(const entry of m.caches){const data=json(entry);assert.equal(data.schema,'rift-bend-selected-cache/2035-1');assert.equal(data.bindingSha256,hash(JSON.stringify(data.binding)));assert.equal(data.networkCalls,0);
 for(const item of data.binding.sourceFiles)exact(item);
 for(const item of data.binding.pristineFiles)exact({path:'.artifacts/toolchains/bend-2.0.35-scout/bend2/'+item.path,sha256:item.sha256});
 for(const item of data.binding.derivedFiles)exact({path:'.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/'+item.path,sha256:item.sha256});
 const output=exact({path:path.posix.join(path.posix.dirname(entry.path),data.output.file),sha256:data.output.sha256});assert.equal(output.length,data.output.bytes);
 const name=path.posix.basename(data.output.file,'.js');assert.ok(!caches.has(name));caches.set(name,{entry,data});
}
assert.deepEqual([...caches.keys()].sort(),['controller','menu','scene']);
const oldBuild=json(front.build),build=json(m.build);assert.equal(build.candidate,m.candidate);assert.equal(build.adopted,false);assert.equal(build.sourceRevision,m.baseline);assert.equal(build.sourceDirty,true);
assert.deepEqual(build.files,oldBuild.files);assert.equal(build.version,oldBuild.version); // Exact package asset identity; metadata/creation binding differs.
for(const source of build.sources)exact(source);
assert.deepEqual(build.browserBoundary,oldBuild.browserBoundary);exact(build.browserBoundary.transformer);exact(build.browserBoundary.bindingHelper);
for(const item of [...build.browserBoundary.definitions,...build.browserBoundary.generated])exact(item);
for(const item of build.browserBoundary.transformations)exact({path:item.path,sha256:item.sourceSha256});
// These two fresh attempts used the current builder and all their recorded inputs.
// Earlier Worker terminals keep their separate historical unused-emitter amendment.
for(const t of [terminal(m.buildTerminal),terminal(m.browserTerminal)])for(const [file,digest]of Object.entries(t.before)){
 const before=fs.lstatSync(file,{bigint:true});assert.ok(before.isFile()&&!before.isSymbolicLink());
 assert.equal(hash(fs.readFileSync(file)),digest,`Fresh native input changed: ${file}`);
 const after=fs.lstatSync(file,{bigint:true});for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(before[key],after[key]);
}
for(const [name,{entry,data}]of caches){const selected=build.selected[name];assert.equal(selected.manifest,entry.path);assert.equal(selected.manifestSha256,entry.sha256);assert.equal(selected.outputSha256,data.output.sha256);assert.equal(selected.bindingSha256,data.bindingSha256);}
for(const [name,digest]of Object.entries(build.files)){exact({path:path.posix.join(path.posix.dirname(m.build.path),name),sha256:digest});exact({path:path.posix.join(path.posix.dirname(front.build.path),name),sha256:digest});}
assert.equal(build.workerLibraries.bot.sourceBinding,m.botBinding.path);assert.equal(build.workerLibraries.bot.sourceBindingSha256,m.botBinding.sha256);assert.deepEqual(build.workerLibraries.bot.artifacts,bot.artifacts);
assert.equal(build.runtime.sha256,bot.diagnostic.engine.executableSha256);
const browser=terminal(m.browserTerminal).result;assert.equal(browser.ok,true);assert.equal(browser.buildSha256,m.build.sha256);assert.equal(browser.botBindingSha256,m.botBinding.sha256);
assert.deepEqual(browser.online,browser.offline);assert.equal(browser.offlineSavedReload,true);assert.deepEqual(browser.errors,[]);
for(const phase of ['onlineTransport','offlineTransport']){
 const observation=browser[phase];assert.ok(observation.jobs>0);const jobs=observation.events.filter(x=>x.direction==='send'&&x.kind==='job'),results=observation.events.filter(x=>x.direction==='receive'&&x.kind==='result');
 assert.equal(jobs.length,observation.jobs);assert.equal(jobs.length,results.length);
 for(const job of jobs){assert.equal(job.program,bot.program);const reply=results.find(x=>x.helper===job.helper&&x.job===job.job);assert.ok(reply);for(const key of ['protocol','program','epoch','job','invocation','fork','slot','functionId','schemaId'])assert.equal(reply[key],job[key]);}
}
for(const item of m.artifacts)exact(item);
assert.deepEqual(read(manifestPath),raw,'Manifest changed during capture');
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
git('merge-base','--is-ancestor',m.baseline,'HEAD');
console.log(JSON.stringify({schema:'rift-worker-parser-preview-capture/1',manifestSha256:hash(raw),currentCommit:git('rev-parse','HEAD'),currentDirty:Boolean(git('status','--porcelain=v1')),retainedCreationSources:retained,amendedCreationSources:changes.size,originalConsumersUnchanged:parent.originalConsumers.length,buildVersion:build.version,packageAssetsByteIdenticalToParent:true,botCreationBindingChanged:true,onlineHelperJobs:browser.onlineTransport.jobs,offlineHelperJobs:browser.offlineTransport.jobs,onlineOfflineChoices:browser.online,newProofWorkers:0,adopted:false,scope:'Exact current application/creation/package bindings and fresh local bot/offline evidence, retaining historical proof records. No Safe/kernel/native/device/Linux admission/adoption authority.'},null,2));
