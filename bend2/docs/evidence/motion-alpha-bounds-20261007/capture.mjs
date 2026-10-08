// Additive factual application capture. Historical captures remain unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const D='.artifacts/bend2/2035-preview/stationary-motion-20261006/';
const manifestPath='bend2/docs/evidence/motion-alpha-bounds-20261007/acceptance.json';
function read(file){
 assert.ok(file&&!path.isAbsolute(file)&&!file.includes('\\')&&!file.split('/').some(x=>x==='..'||x===''));
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
const raw=read(manifestPath),m=JSON.parse(raw);
assert.equal(m.schema,'rift-motion-alpha-bounds-application/1');assert.equal(m.scope,'candidate-source-browser-only');
assert.equal(m.disposition,'reviewed','Application evidence/review is still pending');assert.equal(m.adopted,false);
assert.deepEqual(m.parent,{path:'bend2/docs/evidence/worker-parser-preview-20261007/acceptance.json',sha256:'a57db81ac5747908d18911323486545b9d8ce6c67fc33fbbefb9cffb8f95abf0'});
const amendments=[
 ['bend2/graphics/v2game/BoardScene.bend','b52a576f00b90acbfcfba1901e6e832177a843a2cd2b3cbce60e61e889cf0b26','4ca7329967d5bb33f7dd338c05a3265021801cbec055fc8ac0d5505aa51c903b','BoardScene.bend'],
 ['bend2/platform/browser/worker-v2.ts','2637866a8050bb9a95b73f84b90715c1c25c1e2c51a06ce79efd995e96c397d5','f162c72ab30d804e4c644d9f8a7ecbe05dab444cce4068e9001ba269eabdfa75','worker-v2.ts'],
 ['bend2/toolchain-patches/2035/build-preview.mjs','d513913e8bc9ff0a4918e04dacd0e594a848c6b101c8e2248d41153563d9d545','729a491088e700a8394775f80ce57c8db99f7800ede64a539d485821023f65c4','build-preview.mjs'],
 ['bend2/toolchain-patches/2035/browser-tag-boundary.mjs','06fa04c515ca42c49dbdfdb0fb69d1ad8141723eca25484dc18ae95e05e6ab4c','8b9baab2fe7cc66d888a90c03f841ce8664397d538528c84647bcae7774a01b7','browser-tag-boundary.mjs']
].map(([path,beforeSha256,afterSha256,name])=>({path,beforeSha256,afterSha256,preimage:{path:D+'motion-bounds-preimage-'+name,sha256:beforeSha256}}));
assert.deepEqual(m.amendments,amendments);assert.deepEqual(m.sources,amendments.map(x=>({path:x.path,sha256:x.afterSha256})));
for(const item of amendments){exact(item.preimage);exact({path:item.path,sha256:item.afterSha256});}
const historical=new Map(amendments.map(x=>[x.path+'\0'+x.beforeSha256,x.preimage]));
// Historical lookup requires BOTH the original logical path and exact expected
// hash. It is never used by current source/cache/build/browser input checks.
function historicalExact(entry){const original=historical.get(entry.path+'\0'+entry.sha256);return original?exact(original):exact(entry);}
function historicalJSON(entry){return JSON.parse(historicalExact(entry));}
function historicalTerminal(entry){const t=historicalJSON(entry);assert.equal(t.passed,true);assert.equal(t.exitCode,entry.kind==='negative-terminal'?1:0);
 for(const k of ['samePopenExitObserved','checkedExitedHandleClosed','postBindingJobSelfOnly','checkedJobClosed'])assert.equal(t[k],true);
 assert.deepEqual(t.before,t.after);return t;
}
function nativeInputs(t,old=false){
 assert.deepEqual(t.before,t.after);
 for(const [file,digest]of Object.entries(t.before)){
  assert.match(digest,/^[0-9a-f]{64}$/);assert.ok(path.isAbsolute(file));const absolute=path.resolve(file),relative=path.relative(root,absolute);
  if(relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)){
   const logical=relative.split(path.sep).join('/');(old?historicalExact:exact)({path:logical,sha256:digest});
  }else{
   // External executable/adapter inputs remain their original authenticated
   // native paths, never aliases supplied by an application amendment.
   assert.equal(fs.realpathSync(absolute),absolute);const before=fs.lstatSync(absolute,{bigint:true});assert.ok(before.isFile()&&!before.isSymbolicLink());
   assert.equal(hash(fs.readFileSync(absolute)),digest,`Native input changed: ${absolute}`);const after=fs.lstatSync(absolute,{bigint:true});
   for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(before[key],after[key]);
  }
 }
}
function validateHistoricalParent(){
const manifestPath='bend2/docs/evidence/worker-parser-preview-20261007/acceptance.json',raw=read(manifestPath),m=JSON.parse(raw);
assert.equal(hash(raw),'a57db81ac5747908d18911323486545b9d8ce6c67fc33fbbefb9cffb8f95abf0');
assert.equal(m.schema,'rift-worker-parser-preview-application/1');assert.equal(m.scope,'candidate-source-browser-only');
assert.equal(m.disposition,'reviewed');assert.equal(m.adopted,false);
assert.deepEqual(m.parent,{path:'bend2/docs/evidence/knight-front-light-20261007/acceptance.json',sha256:'765058d5fca26d587b705bd49ecf40294af6ef5c27192fc7411b87d683a6ca8b'});
const front=historicalJSON(m.parent);assert.equal(front.schema,'rift-knight-front-light-application/1');assert.equal(front.disposition,'reviewed');assert.equal(front.adopted,false);
assert.deepEqual(front.parent,{path:'bend2/docs/evidence/canonical-match-20261007/acceptance.json',sha256:'18d1c39fb87299802d527244162bb5d15168b912928d6538d7a16221d9e16e93'});
const parent=historicalJSON(front.parent);assert.equal(parent.schema,'rift-canonical-match-application/1');assert.equal(parent.disposition,'reviewed');assert.equal(parent.adopted,false);
assert.equal(m.candidate,front.candidate);assert.equal(m.candidate,parent.candidate);
historicalExact({path:'bend2/tools/selected-modules.mjs',sha256:'3638db30ce2c4d9e3ba13272bed451c093bf36de6edae227c16463d832ee766d'});
const builder='bend2/toolchain-patches/2035/build-preview.mjs';
for(const source of [...parent.sources,...front.sources])if(source.path!==builder)historicalExact(source);
assert.equal(m.builderAmendment.path,builder);assert.equal(m.builderAmendment.beforeSha256,front.sources.find(x=>x.path===builder).sha256);
assert.equal(m.builderAmendment.beforeSha256,'4f66d30233f041b41c71031ac813dd580a0ba7110f1a0ba4f2ba2015dfcaed29');
assert.equal(hash(historicalExact(m.builderAmendment.preimage)),m.builderAmendment.beforeSha256);historicalExact({path:builder,sha256:m.builderAmendment.afterSha256});
for(const item of parent.originalConsumers)historicalExact(item);assert.equal(parent.originalConsumers.length,12);
const creation=historicalJSON(parent.creationReceipt);assert.equal(creation.before.sourceFiles.length,315);
const changes=new Map([...parent.creationSourceAmendments,front.knightAmendment].map(x=>[x.path,x]));
assert.equal(changes.size,3);assert.deepEqual([...changes.keys()].sort(),['bend2/graphics/v2game/KnightMesh.bend','bend2/ui/Commands.bend','bend2/ui/State.bend']);
let retained=0;for(const item of creation.before.sourceFiles){const change=changes.get(item.path);if(change){assert.equal(change.beforeSha256,item.sha256);historicalExact({path:item.path,sha256:change.afterSha256});}else{historicalExact(item);retained++;}}assert.equal(retained,312);
for(const item of [...parent.evidence,...front.evidence,...front.artifacts])historicalExact(item); // Retained original records, not current execution retags.
const oldReview=historicalJSON(front.review);assert.equal(oldReview.disposition,'accepted');for(const source of front.sources)assert.equal(oldReview.sourceHashes[source.path],source.sha256);
const seen=new Set();for(const source of m.sources){assert.ok(!seen.has(source.path));seen.add(source.path);historicalExact(source);}
assert.equal(m.sources.find(x=>x.path===builder).sha256,m.builderAmendment.afterSha256);
const review=historicalJSON(m.review);assert.equal(review.disposition,'accepted');for(const source of m.sources)assert.equal(review.sourceHashes[source.path],source.sha256);
const workerReview=historicalJSON(m.workerReview);assert.equal(workerReview.disposition,'accepted');for(const [file,digest]of Object.entries(workerReview.sourceHashes))historicalExact({path:file,sha256:digest});
const verification=historicalJSON(m.workerVerification);assert.equal(verification.passed,true);assert.equal(workerReview.verificationSHA256,m.workerVerification.sha256);
for(const item of m.evidence)if(item.kind?.endsWith('terminal'))historicalTerminal(item);else historicalExact(item);
const bot=historicalJSON(m.botBinding);assert.equal(m.botBinding.sha256,'e33380e50eda1db29c5ba4526de408f9fdcb3aa95356c75e3e390eaf84581363');
assert.equal(bot.schema,'rift-bend-worker-source-binding/2035-2');assert.equal(bot.ok,true);assert.equal(bot.upstreamCommit,m.candidate);
assert.equal(bot.networkCalls,0);assert.equal(bot.sourceRoot,'bend2/platform/worker/BotAdapter.bend');assert.deepEqual(bot.exports,['choose']);
assert.equal(bot.compilerSourceTreeSha256,hash(JSON.stringify(bot.compiler)));assert.equal(Object.keys(bot.compiler).length,98);
assert.equal(bot.compilerLineage.revision,'rift-worker-parser/2035-1');assert.deepEqual(bot.compilerLineage.changedFiles,['bend.ts']);
const corrected='.artifacts/bend2/toolchain-patches/workers-2035-parser-r1/bend2/';
const original='.artifacts/bend2/toolchain-patches/workers-2035-candidate/bend2/';
assert.equal(path.resolve(bot.compilerLineage.parentDirectory),path.resolve(root,'.artifacts/bend2/toolchain-patches/workers-2035-candidate'));
assert.deepEqual(Object.keys(bot.compiler).sort(),Object.keys(bot.compilerLineage.parentCompiler).sort());
for(const [name,digest]of Object.entries(bot.compiler)){
 historicalExact({path:corrected+name,sha256:digest});historicalExact({path:original+name,sha256:bot.compilerLineage.parentCompiler[name]});
 if(name!=='bend.ts')assert.equal(digest,bot.compilerLineage.parentCompiler[name]);
}
assert.equal(bot.compiler['bend.ts'],'0eab46d06cd349ecd2dd0495b116a6f57f1e483040597cf7aded953711bf8d26');
assert.equal(hash(read('.artifacts/bend2/toolchain-patches/workers-stage2-20260925/bend2/bend.ts').toString('utf8').replaceAll('\r\n','\n')),bot.compilerLineage.acceptedNormalizedSHA256);
for(const item of bot.sources)historicalExact(item);
for(const group of [bot.implementation,bot.loaderDependencies,bot.compilerLineage.implementation])for(const [file,digest]of Object.entries(group))historicalExact({path:file,sha256:digest});
const diagnostic=historicalJSON(bot.diagnostic);assert.equal(diagnostic.ok,true);assert.deepEqual(diagnostic.compiler,bot.compiler);assert.deepEqual(diagnostic.compilerLineage,bot.compilerLineage);
assert.deepEqual(diagnostic.fixtures,bot.diagnostic.fixtures);assert.deepEqual(diagnostic.engine,bot.diagnostic.engine);assert.equal(diagnostic.program,bot.diagnostic.program);
for(const [file,digest]of Object.entries(diagnostic.fixtures))historicalExact({path:'bend2/toolchain-patches/2035/workers/'+file,sha256:digest});
const botDir=path.posix.dirname(m.botBinding.path),botManifest=historicalJSON({path:botDir+'/manifest.json',sha256:bot.manifestSha256});
assert.equal(botManifest.program,bot.program);assert.equal(botManifest.mode,'required-only');assert.equal(botManifest.policy,'strict');assert.equal(botManifest.protocol,1);
assert.deepEqual(Object.keys(bot.artifacts).sort(),Object.values(botManifest.artifacts).sort());assert.equal(Object.keys(bot.artifacts).length,5);
for(const [file,digest]of Object.entries(bot.artifacts))historicalExact({path:botDir+'/'+file,sha256:digest});
const oldBot=historicalJSON(m.oldBotBinding);assert.deepEqual(oldBot.artifacts,bot.artifacts);for(const [file,digest]of Object.entries(oldBot.artifacts))historicalExact({path:path.posix.dirname(m.oldBotBinding.path)+'/'+file,sha256:digest});
const caches=new Map();assert.deepEqual(m.caches,front.caches);
for(const entry of m.caches){const data=historicalJSON(entry);assert.equal(data.schema,'rift-bend-selected-cache/2035-1');assert.equal(data.bindingSha256,hash(JSON.stringify(data.binding)));assert.equal(data.networkCalls,0);
 for(const item of data.binding.sourceFiles)historicalExact(item);
 for(const item of data.binding.pristineFiles)historicalExact({path:'.artifacts/toolchains/bend-2.0.35-scout/bend2/'+item.path,sha256:item.sha256});
 for(const item of data.binding.derivedFiles)historicalExact({path:'.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/'+item.path,sha256:item.sha256});
 const output=historicalExact({path:path.posix.join(path.posix.dirname(entry.path),data.output.file),sha256:data.output.sha256});assert.equal(output.length,data.output.bytes);
 const name=path.posix.basename(data.output.file,'.js');assert.ok(!caches.has(name));caches.set(name,{entry,data});
}
assert.deepEqual([...caches.keys()].sort(),['controller','menu','scene']);
const oldBuild=historicalJSON(front.build),build=historicalJSON(m.build);assert.equal(build.candidate,m.candidate);assert.equal(build.adopted,false);assert.equal(build.sourceRevision,m.baseline);assert.equal(build.sourceDirty,true);
assert.deepEqual(build.files,oldBuild.files);assert.equal(build.version,oldBuild.version); // Exact package asset identity; metadata/creation binding differs.
for(const source of build.sources)historicalExact(source);
assert.deepEqual(build.browserBoundary,oldBuild.browserBoundary);historicalExact(build.browserBoundary.transformer);historicalExact(build.browserBoundary.bindingHelper);
for(const item of [...build.browserBoundary.definitions,...build.browserBoundary.generated])historicalExact(item);
for(const item of build.browserBoundary.transformations)historicalExact({path:item.path,sha256:item.sourceSha256});
// These two historical attempts used their then-current builder and inputs.
// Earlier Worker terminals keep their separate historical unused-emitter amendment.
for(const t of [historicalTerminal(m.buildTerminal),historicalTerminal(m.browserTerminal)]) nativeInputs(t,true);
for(const [name,{entry,data}]of caches){const selected=build.selected[name];assert.equal(selected.manifest,entry.path);assert.equal(selected.manifestSha256,entry.sha256);assert.equal(selected.outputSha256,data.output.sha256);assert.equal(selected.bindingSha256,data.bindingSha256);}
for(const [name,digest]of Object.entries(build.files)){historicalExact({path:path.posix.join(path.posix.dirname(m.build.path),name),sha256:digest});historicalExact({path:path.posix.join(path.posix.dirname(front.build.path),name),sha256:digest});}
assert.equal(build.workerLibraries.bot.sourceBinding,m.botBinding.path);assert.equal(build.workerLibraries.bot.sourceBindingSha256,m.botBinding.sha256);assert.deepEqual(build.workerLibraries.bot.artifacts,bot.artifacts);
assert.equal(build.runtime.sha256,bot.diagnostic.engine.executableSha256);
const browser=historicalTerminal(m.browserTerminal).result;assert.equal(browser.ok,true);assert.equal(browser.buildSha256,m.build.sha256);assert.equal(browser.botBindingSha256,m.botBinding.sha256);
assert.deepEqual(browser.online,browser.offline);assert.equal(browser.offlineSavedReload,true);assert.deepEqual(browser.errors,[]);
for(const phase of ['onlineTransport','offlineTransport']){
 const observation=browser[phase];assert.ok(observation.jobs>0);const jobs=observation.events.filter(x=>x.direction==='send'&&x.kind==='job'),results=observation.events.filter(x=>x.direction==='receive'&&x.kind==='result');
 assert.equal(jobs.length,observation.jobs);assert.equal(jobs.length,results.length);
 for(const job of jobs){assert.equal(job.program,bot.program);const reply=results.find(x=>x.helper===job.helper&&x.job===job.job);assert.ok(reply);for(const key of ['protocol','program','epoch','job','invocation','fork','slot','functionId','schemaId'])assert.equal(reply[key],job[key]);}
}
for(const item of m.artifacts)historicalExact(item);
assert.deepEqual(read(manifestPath),raw,'Manifest changed during capture');

 return {m,front,parent,creation,caches,build,bot};
}
const retained=validateHistoricalParent(),oldBuild=retained.build;
assert.equal(m.candidate,retained.m.candidate);assert.equal(m.baseline,'041a86582fc09f628dddeb126fff486d44757384');
assert.equal(retained.creation.before.sourceFiles.length,315);
for(const item of amendments)assert.ok(!retained.creation.before.sourceFiles.some(x=>x.path===item.path),'New amendment must not exempt an original creation input');
const review=json(m.review);assert.equal(review.disposition,'accepted');for(const item of m.sources)assert.equal(review.sourceHashes[item.path],item.sha256);
assert.equal(review.parentManifestSHA256,m.parent.sha256);assert.equal(review.scope,m.scope);
const caches=new Map();assert.equal(m.caches.length,3);
for(const entry of m.caches){const data=json(entry);assert.equal(data.schema,'rift-bend-selected-cache/2035-1');assert.equal(data.bindingSha256,hash(JSON.stringify(data.binding)));assert.equal(data.networkCalls,0);
 for(const item of data.binding.sourceFiles)exact(item);
 for(const item of data.binding.pristineFiles)exact({path:'.artifacts/toolchains/bend-2.0.35-scout/bend2/'+item.path,sha256:item.sha256});
 for(const item of data.binding.derivedFiles)exact({path:'.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/'+item.path,sha256:item.sha256});
 const output=exact({path:path.posix.join(path.posix.dirname(entry.path),data.output.file),sha256:data.output.sha256});assert.equal(output.length,data.output.bytes);
 const name=path.posix.basename(data.output.file,'.js');assert.ok(!caches.has(name));caches.set(name,{entry,data});
}
assert.deepEqual([...caches.keys()].sort(),['controller','menu','scene']);
for(const name of ['controller','menu'])assert.deepEqual(caches.get(name).entry,retained.caches.get(name).entry);
const scene=caches.get('scene');assert.equal(scene.entry.sha256,'4fbb0917f634927a459fee0c8d5d8dcb6e47cc5e6b28e4a71173fbb6f8e9fb33');
assert.equal(scene.data.output.sha256,'2e9d01b233fb2e45c8e76ec72344a5bbdd8cc18ef0f994cce5d7ce3fb832f09b');
const build=json(m.build);assert.equal(build.candidate,m.candidate);assert.equal(build.adopted,false);assert.equal(build.sourceRevision,m.baseline);assert.equal(build.sourceDirty,true);
for(const item of build.sources)exact(item);
assert.deepEqual(build.toolchain,oldBuild.toolchain);assert.deepEqual(build.runtime,oldBuild.runtime);assert.deepEqual(build.preparedCore,oldBuild.preparedCore);assert.deepEqual(build.workerLibraries,oldBuild.workerLibraries);
for(const [name,{entry,data}]of caches){const selected=build.selected[name];assert.equal(selected.manifest,entry.path);assert.equal(selected.manifestSha256,entry.sha256);assert.equal(selected.outputSha256,data.output.sha256);assert.equal(selected.bindingSha256,data.bindingSha256);}
assert.deepEqual(Object.keys(build.selected).sort(),['controller','menu','scene']);
for(const [name,digest]of Object.entries(build.files))exact({path:path.posix.join(path.posix.dirname(m.build.path),name),sha256:digest});
const unchangedAssets=Object.entries(build.files).filter(([name,digest])=>name.startsWith('assets/')&&oldBuild.files[name]===digest).map(([path,sha256])=>({path,sha256})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
assert.deepEqual(m.unchangedAssets,unchangedAssets);assert.ok(unchangedAssets.length>0);
for(const item of unchangedAssets){exact({path:path.posix.join(path.posix.dirname(m.build.path),item.path),sha256:item.sha256});historicalExact({path:path.posix.join(path.posix.dirname(retained.m.build.path),item.path),sha256:item.sha256});}
// Constructor maps/counts and their retained generated evidence are unchanged.
// They are distinct from the fresh scene cache, not freshly emitted old modules.
const boundary=build.browserBoundary,oldBoundary=oldBuild.browserBoundary;
for(const key of ['schema','candidate','bindingHelper','map','assetResponse','unchangedBaseTags','definitions','generated'])assert.deepEqual(boundary[key],oldBoundary[key]);
assert.equal(boundary.transformer.path,amendments[3].path);assert.equal(boundary.transformer.sha256,amendments[3].afterSha256);exact(boundary.transformer);exact(boundary.bindingHelper);
for(const item of [...boundary.definitions,...boundary.generated])exact(item);
assert.deepEqual(boundary.transformations.map(x=>x.path),oldBoundary.transformations.map(x=>x.path));
for(let i=0;i<boundary.transformations.length;i++){const now=boundary.transformations[i],old=oldBoundary.transformations[i];exact({path:now.path,sha256:now.sourceSha256});
 assert.deepEqual(now.changes,old.changes);assert.deepEqual(now.unchangedBaseLiteralCounts,old.unchangedBaseLiteralCounts);
 if(now.path!==amendments[1].path)assert.deepEqual(now,old);else assert.equal(now.sourceSha256,amendments[1].afterSha256);
}
const privateFinite=json(m.privateFinite.result),alpha=json(m.correctedAlpha.result),product=json(m.productFinite.result);
assert.equal(privateFinite.ok,true);assert.equal(privateFinite.rows.length,153);assert.equal(privateFinite.metadata.length,9);
assert.equal(alpha.ok,true);assert.equal(alpha.rows.length,6);assert.equal(product.ok,true);assert.equal(product.rows.length,54);assert.equal(product.metadata.length,9);
assert.equal(product.productManifestSHA256,scene.entry.sha256);assert.equal(product.productSHA256,scene.data.output.sha256);
assert.equal(product.retainedResultSHA256,m.privateFinite.result.sha256);assert.equal(product.correctedAlphaSHA256,m.correctedAlpha.result.sha256);
assert.equal(privateFinite.buildSHA256,retained.m.build.sha256);assert.equal(product.buildSHA256,retained.m.build.sha256);
const rowKey=x=>JSON.stringify([x.label,x.view,x.amount]);const references=new Map(privateFinite.rows.map(x=>[rowKey(x),x.rgbaSHA256]));assert.equal(references.size,153);
for(const row of product.rows)assert.equal(row.rgbaSHA256,references.get(rowKey(row)));
const variants=product.alphaVariants.filter(x=>['transparent','opaque'].includes(x.label));assert.equal(variants.length,6);
for(const amount of [0,8,16]){
 const transparent=variants.find(x=>x.label==='transparent'&&x.amount===amount),opaque=variants.find(x=>x.label==='opaque'&&x.amount===amount);
 assert.ok(transparent&&opaque);assert.notEqual(transparent.rgbaSHA256,opaque.rgbaSHA256);
 const expected=alpha.rows.filter(x=>x.amount===amount);assert.equal(expected.length,2);
 for(const value of expected)assert.equal(variants.find(x=>x.label===value.label&&x.amount===amount)?.rgbaSHA256,value.rgbaSHA256);
}
const fallback=product.alphaVariants.find(x=>x.label==='invalid dimensions conservative screen fallback');assert.ok(fallback);assert.deepEqual([fallback.clip.left,fallback.clip.top,fallback.clip.right,fallback.clip.bottom],[0,0,512,512]);
for(const [entry,old]of [[m.privateFinite.terminal,true],[m.correctedAlpha.terminal,true],[m.sceneTerminal,false],[m.productFinite.terminal,false],[m.buildTerminal,false]]){
 const t=terminal(entry);nativeInputs(t,old);
 if(entry===m.privateFinite.terminal)assert.equal(t.result.resultSHA256,m.privateFinite.result.sha256);
 if(entry===m.correctedAlpha.terminal)assert.equal(t.result.resultSHA256,m.correctedAlpha.result.sha256);
 if(entry===m.productFinite.terminal)assert.equal(t.result.resultSHA256,m.productFinite.result.sha256);
 if(entry===m.sceneTerminal){assert.equal(t.result.manifestSha256,scene.entry.sha256);assert.deepEqual(t.result.output,{bytes:scene.data.output.bytes,sha256:scene.data.output.sha256});}
 if(entry===m.buildTerminal)assert.equal(t.result.buildSha256,m.build.sha256);
}
// Descriptors and all evidence remain pending until actual closed browser
// records and a separate independent application review are supplied.
assert.ok(m.browser&&m.offline&&m.movingPick);
const natural=json(m.browser.result),naturalTerminal=terminal(m.browser.terminal);nativeInputs(naturalTerminal);
assert.equal(natural.ok,true);assert.equal(naturalTerminal.result.resultSHA256,m.browser.result.sha256);
assert.equal(natural.runs.length,6);assert.equal(naturalTerminal.result.runs,6);assert.equal(naturalTerminal.result.actions,36);
assert.deepEqual(naturalTerminal.result.distributions,natural.distributions);
assert.equal(natural.runs.reduce((n,run)=>n+run.observation.actions.length,0),36);
for(const pair of [0,1,2]){
 const runs=natural.runs.filter(x=>x.pair===pair);assert.deepEqual(runs.map(x=>x.name).sort(),['baseline','candidate']);
 assert.equal(runs[0].pngSHA256,runs[1].pngSHA256);
 for(const run of runs){assert.equal(run.buildSHA256,run.name==='candidate'?m.build.sha256:retained.m.build.sha256);assert.deepEqual(run.errors,[]);assert.deepEqual(run.external,[]);
  exact({path:path.posix.join(path.posix.dirname(m.browser.result.path),`${pair}-${run.name}.png`),sha256:run.pngSHA256});
  for(const revision of [1,2]){const rows=run.observation.rows.filter(x=>x.shown.revision===revision);
   assert.ok(rows.some(x=>x.dirty&&x.shown.pose?.progress<16&&x.sceneTimes?.sprite>0));
   assert.ok(rows.some(x=>x.dirty&&x.shown.pose?.progress===16&&x.atlas&&x.sceneTimes?.sprite>0));
   for(const row of rows.filter(x=>x.dirty&&x.shown.pose?.progress<16&&x.sceneTimes?.sprite>0)){assert.equal(row.sceneTimes.ground,0);assert.equal(row.sceneTimes.prepared,0);}
  }
 }
}
const offlineTerminal=terminal(m.offline.terminal);nativeInputs(offlineTerminal);const offline=offlineTerminal.result;
assert.equal(offline.ok,true);assert.equal(offline.buildVersion,build.version);assert.equal(offline.offlineMove,'e2-e4');assert.equal(offline.offlineSavedReload,true);
assert.equal(offline.offlinePreparedGroundHit,1);assert.equal(offline.onlineInitialSha256,offline.offlineInitialSha256);
exact({path:D+'motion-bounds-offline-r1/online-initial.png',sha256:offline.onlineInitialSha256});
exact({path:D+'motion-bounds-offline-r1/offline-initial.png',sha256:offline.offlineInitialSha256});
for(const key of ['savedRecordSHA256','positionSHA256'])assert.match(offline[key],/^[0-9a-f]{64}$/);
const moving=json(m.movingPick.result),movingTerminal=terminal(m.movingPick.terminal);nativeInputs(movingTerminal);
assert.equal(moving.ok,true);assert.equal(movingTerminal.result.resultSHA256,m.movingPick.result.sha256);assert.equal(moving.buildSHA256,m.build.sha256);
const observed=json(m.movingPick.observerBinding);assert.equal(observed.originalSHA256,moving.originalWorkerSHA256);assert.equal(observed.servedSHA256,moving.observedWorkerSHA256);
const workerFiles=Object.keys(build.files).filter(x=>/^worker-v2-[^/]+\.js$/.test(x));assert.equal(workerFiles.length,1);assert.equal(build.files[workerFiles[0]],moving.originalWorkerSHA256);
const originalWorker=exact({path:path.posix.join(path.posix.dirname(m.build.path),workerFiles[0]),sha256:moving.originalWorkerSHA256});
const observedWorker=exact({path:path.posix.join(path.posix.dirname(m.movingPick.result.path),'worker-observer.js'),sha256:moving.observedWorkerSHA256});
assert.ok(observedWorker.length>originalWorker.length);assert.ok(observedWorker.subarray(0,originalWorker.length).equals(originalWorker));
assert.equal(hash(observedWorker.subarray(originalWorker.length)),observed.footerSHA256);
const controllerEmission=historicalTerminal(m.movingPick.controllerEmissionTerminal);nativeInputs(controllerEmission,true);
assert.equal(controllerEmission.result.manifestSha256,caches.get('controller').entry.sha256);
assert.equal(controllerEmission.result.output.sha256,caches.get('controller').data.output.sha256);
assert.deepEqual(moving.expectationInputs,['scene','controller'].map(name=>({name,moduleSHA256:caches.get(name).data.output.sha256,
 manifestSHA256:caches.get(name).entry.sha256,emissionTerminalSHA256:name==='scene'?m.sceneTerminal.sha256:m.movingPick.controllerEmissionTerminal.sha256})));
assert.deepEqual(moving.errors,[]);assert.deepEqual(moving.external,[]);assert.equal(moving.witness.planScale,2);
assert.equal(moving.witness.refinementsBefore,moving.witness.refinementsAfter);
assert.equal(moving.witness.firstPresentation.pose.progress,0);assert.equal(moving.witness.secondPresentation.pose.progress,8);
assert.equal(moving.witness.firstPresentation.atlasMaskId,moving.witness.secondPresentation.atlasMaskId);
assert.equal(moving.witness.oldProbe.probe.incoming.pose.progress,0);assert.equal(moving.witness.oldProbe.probe.frame.progress,8);
assert.equal(moving.witness.oldProbe.probe.frame.hovered,28);assert.equal(moving.witness.oldProbe.probe.focus,28);
assert.equal(moving.witness.clearProbe.probe.incoming.pose.progress,8);assert.equal(moving.witness.clearProbe.probe.frame.hovered,moving.witness.point.floor);
assert.equal(moving.witness.clearProbe.probe.focus,moving.witness.point.floor);assert.equal(moving.observation.shown.pose.progress,16);
for(const item of m.evidence)exact(item);
assert.deepEqual(read(manifestPath),raw,'Manifest changed during capture');
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',windowsHide:true,timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
git('merge-base','--is-ancestor',m.baseline,'HEAD');
console.log(JSON.stringify({schema:'rift-motion-alpha-bounds-capture/1',manifestSha256:hash(raw),currentCommit:git('rev-parse','HEAD'),currentDirty:Boolean(git('status','--porcelain=v1')),parentManifestSHA256:m.parent.sha256,retainedCreationSources:312,amendedCreationSources:3,originalConsumersUnchanged:12,newApplicationAmendments:amendments.length,privateFullClippedPairs:153,productFullClippedPairs:54,correctedAlphaPairs:6,unchangedAssetCount:unchangedAssets.length,newProofWorkers:0,adopted:false,scope:'Exact current candidate application/source/package/browser bindings with retained historical proof evidence; no stable performance/device/nativeCPU/Safe/kernel/Linux/adoption authority.'},null,2));
