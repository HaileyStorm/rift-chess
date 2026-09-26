// One-time source-bound cache migration: the selected-module registry stopped
// hashing its entire implementation. Each book already binds its own entry,
// export list, transitive Bend/effect closure, loader and compiler. This
// narrowly verifies that exact one-line dependency removal before updating
// ignored metadata; generated JS remains byte-for-byte unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,cacheDir,currentBinding,sha256} from './selected-modules.mjs';

const specPath='bend2/tools/selected-modules.mjs';
const source=fs.readFileSync(path.join(root,specPath),'utf8');
const after=`  // entry and exports above bind the selected spec; hashing this whole\n  // registry would invalidate an unrelated (expensive) book whenever another\n  // module is added. Its transitive source and emitter/loader remain bound.\n  for (const item of ['bend2/TOOLCHAIN.json', 'bend2/tools/loader-v2.ts',\n    'bend2/tools/emit-selected.ts',`;
const before=`  for (const item of ['bend2/TOOLCHAIN.json', 'bend2/tools/loader-v2.ts',\n    'bend2/tools/selected-modules.mjs', 'bend2/tools/emit-selected.ts',`;
assert.equal(source.split(after).length,2,'Unexpected registry change');
const priorHash=sha256(source.replace(after,before));
assert.equal(path.relative(root,cacheDir).replaceAll('\\','/'),'.artifacts/bend2/v2-preview/selected-js');
const names=['controller','scene','chrome'];
const prepared=[];
for(const name of names){
  const manifestPath=path.join(cacheDir,`${name}.manifest.json`);
  const backup=path.join(cacheDir,`${name}.manifest.pre-registry.json`);
  assert.ok(!fs.existsSync(backup),`Already migrated ${name}`);
  const oldBytes=fs.readFileSync(manifestPath),old=JSON.parse(oldBytes.toString('utf8'));
  const current=currentBinding(name);
  const own=old.binding.sourceFiles.filter(x=>x.path===specPath);
  assert.equal(own.length,1);
  assert.equal(own[0].sha256,priorHash,`Prior registry source differs for ${name}`);
  const without={...old.binding,sourceFiles:old.binding.sourceFiles.filter(x=>x.path!==specPath)};
  assert.deepEqual(without,current,`Unrelated ${name} source/export/compiler changed`);
  const code=fs.readFileSync(path.join(cacheDir,`${name}.js`));
  assert.equal(code.length,old.output.bytes);
  assert.equal(sha256(code),old.output.sha256);
  const next={...old,binding:current,provenance:{...old.provenance,
    registryAttestation:'Only redundant whole-registry dependency removed; exact previous source reconstructed',
    previousManifestSha256:sha256(oldBytes),priorRegistrySha256:priorHash,
    generatedSha256:sha256(code)}};
  prepared.push({name,manifestPath,backup,oldBytes,next});
}
for(const item of prepared){
  const pending=path.join(cacheDir,`${item.name}.manifest.registry-${process.pid}.pending.json`);
  fs.writeFileSync(pending,JSON.stringify(item.next,null,2)+'\n',{flag:'wx'});
  fs.renameSync(item.manifestPath,item.backup);
  try{fs.renameSync(pending,item.manifestPath)}
  catch(error){fs.renameSync(item.backup,item.manifestPath);throw error}
}
for(const name of names){
  const current=currentBinding(name);
  const manifest=JSON.parse(fs.readFileSync(path.join(cacheDir,`${name}.manifest.json`),'utf8'));
  assert.deepEqual(manifest.binding,current);
}
console.log(JSON.stringify({names,priorHash,generatedUnchanged:true,backupsRetained:true}));
