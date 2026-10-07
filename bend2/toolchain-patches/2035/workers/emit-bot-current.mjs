import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadWithStableImports } from '../../2032/tag-identity/preload-root.mjs';
import { prepare, root, derived, sha } from './prepare-current.mjs';

process.env.BEND_NO_TELEMETRY='1';
let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw Error('isolated bot emitter denies network');};
const sourceRoot='bend2/platform/worker/BotAdapter.bend';
const binding=prepare();
const args=process.argv.slice(2);
assert.ok(args.length===2&&args[0]==='--diagnostic'&&/^diagnostic-[A-Za-z0-9]+$/.test(args[1]),'use --diagnostic <owned diagnostic directory name>');
const diagnosticPath=path.join(derived,args[1],'receipt.json');
const diagnosticBytes=fs.readFileSync(diagnosticPath), diagnostic=JSON.parse(diagnosticBytes);
assert.equal(diagnostic.ok,true);
assert.deepEqual(diagnostic.compiler,binding.hashes,'diagnostic does not bind current compiler');
assert.deepEqual(diagnostic.compilerLineage,binding.lineage,'diagnostic preparation lineage mismatch');
for(const [file,digest] of Object.entries(diagnostic.fixtures)) assert.equal(sha(fs.readFileSync(path.join(root,'bend2/toolchain-patches/2035/workers',file))),digest,'diagnostic fixture changed');
const implementationFiles=['bend2/toolchain-patches/2035/workers/prepare.mjs','bend2/toolchain-patches/2035/workers/prepare-current.mjs','bend2/toolchain-patches/2035/workers/emit-bot-current.mjs'];
const loaderFiles=['bend2/toolchain-patches/2035/windows-source-loader.mjs','bend2/toolchain-patches/2032/tag-identity/preload-root.mjs',
  'bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch'];
const fileBindings=files=>Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));
const implementation=fileBindings(implementationFiles), loaderDependencies=fileBindings(loaderFiles);
function sourceClosure(file, seen=new Map()) {
  const resolved=fs.realpathSync(path.join(root,file));
  assert.ok(resolved.startsWith(path.join(root,'bend2')+path.sep));
  if(seen.has(resolved)) return seen;
  const bytes=fs.readFileSync(resolved), source=bytes.toString('utf8');
  seen.set(resolved,{path:path.relative(root,resolved).replaceAll('\\','/'),sha256:sha(bytes)});
  for(const line of source.split(/\r?\n/)) {
    const imported=/^\s*import\s+(\S+)(?:\s+as\s+\w+)?\s*$/.exec(line)?.[1];
    if(!imported||imported==='Base') continue;
    assert.ok(imported.startsWith('./')||imported.startsWith('../'));
    sourceClosure(path.relative(root,path.resolve(path.dirname(resolved),imported)),seen);
  }
  return seen;
}
const inputs=[...sourceClosure(sourceRoot).values()].sort((a,b)=>a.path.localeCompare(b.path));
const target=fs.mkdtempSync(path.join(derived,'bot-'));
const bend=await import(pathToFileURL(path.join(derived,'bend2/bend.ts')).href);
try {
  const comp=await import(pathToFileURL(path.join(derived,'bend2/comp.ts')).href);
  const book=bend.book_nil(), start=performance.now();
  const identity=await loadWithStableImports(bend,book,path.join(root,sourceRoot),path.join(root,'bend2'));
  bend.book_valid(book,0); assert.equal(book.hols,0);
  const checkedMs=performance.now()-start;
  const base=fs.realpathSync(path.join(derived,'bend2/base.bend'));
  assert.ok(identity.seen.has(base),'bound compiler Base was not loaded');
  const loaded=[...identity.seen.keys()].filter(file=>file!==base).map(file=>({path:path.relative(root,file).replaceAll('\\','/'),sha256:sha(fs.readFileSync(file))})).sort((a,b)=>a.path.localeCompare(b.path));
  assert.deepEqual(loaded,inputs,'loaded closure differs from frozen source input');
  const build=comp.js_worker_lib(book,['choose'],{mode:'required-only',policy:'strict'});
  assert.equal(build.manifest.natRepresentation,'number48-host-bigint');
  assert.ok(build.manifest.functions.find(f=>f.name==='core/AI:parallel')?.hasFork,'balanced recursive bot fork missing');
  assert.equal(build.manifest.functions.find(f=>f.name==='choose')?.reachesRequire,true);
  assert.deepEqual([...sourceClosure(sourceRoot).values()].sort((a,b)=>a.path.localeCompare(b.path)),inputs);
  assert.deepEqual(prepare(),binding,'derived compiler source changed during emission');
  assert.deepEqual(fileBindings(implementationFiles),implementation,'implementation changed during emission');
  assert.deepEqual(fileBindings(loaderFiles),loaderDependencies,'loader dependencies changed during emission');
  assert.deepEqual(fs.readFileSync(diagnosticPath),diagnosticBytes,'diagnostic receipt changed');
  for(const [name,source] of Object.entries(build.files)) fs.writeFileSync(path.join(target,name),source,{flag:'wx'});
  const artifacts=Object.fromEntries(Object.entries(build.files).map(([name,source])=>[name,sha(source)]));
  for(const [name,digest] of Object.entries(artifacts)) assert.equal(sha(fs.readFileSync(path.join(target,name))),digest);
  const receipt={schema:'rift-bend-worker-source-binding/2035-2',ok:true,sourceRoot,exports:['choose'],upstreamCommit:'79df8d9c40722ee9507a1e253f283b51025f9d6c',
    sources:inputs,compiler:binding.hashes,compilerLineage:binding.lineage,compilerSourceTreeSha256:sha(JSON.stringify(binding.hashes)),implementation,loaderDependencies,
    diagnostic:{path:path.relative(root,diagnosticPath).replaceAll('\\','/'),sha256:sha(diagnosticBytes),program:diagnostic.program,fixtures:diagnostic.fixtures,engine:diagnostic.engine},
    artifacts,program:build.manifest.program,manifestSha256:artifacts['manifest.json'],apiExports:['manifest','createSession'],entry:build.entry,
    mode:build.manifest.mode,policy:build.manifest.policy,natRepresentation:build.manifest.natRepresentation,
    commonTags:Object.fromEntries(['core/Model:Pos','Nil','Cons','Tuple'].filter(k=>book.ctrs[k]).map(k=>[k,bend.name_key(k)])),
    timing:{checkedMs,emitMs:performance.now()-start-checkedMs},memory:process.memoryUsage(),networkCalls,
    evidence:'current full BotAdapter source checked and compiler-emitted recursive worker library; execution/browser/proof/native/GPU acceptance separate'};
  assert.equal(networkCalls,0);
  fs.writeFileSync(path.join(target,'source-binding.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target,'source-binding.json'),'utf8')),receipt);
  console.log(JSON.stringify({ok:true,target,program:receipt.program,sources:inputs.length,functions:build.manifest.functions.length,sites:build.manifest.sites.length,timing:receipt.timing,memory:receipt.memory}));
} catch(e) {
  const error=e?.$==='Err'?bend.err_show(e):String(e);
  fs.writeFileSync(path.join(target,'failure.json'),JSON.stringify({ok:false,error,sourceRoot,sources:inputs,compiler:binding.hashes,compilerLineage:binding.lineage,networkCalls},null,2)+'\n',{flag:'wx'});
  console.error(JSON.stringify({ok:false,target,error}));process.exitCode=1;
}
