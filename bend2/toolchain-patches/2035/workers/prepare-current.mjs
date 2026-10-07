import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepare as prepareParent,root,derived as parentDirectory,sha} from './prepare.mjs';
export {root,sha};
export const derived=path.join(root,'.artifacts/bend2/toolchain-patches/workers-2035-parser-r1');
const revision='rift-worker-parser/2035-1';
const read=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');
function once(text,old,value){assert.equal(text.split(old).length,2,'parser correction anchor changed');return text.replace(old,value);}
function rewrite(text){const begin='    case "%": {\n',end='    case "{": {\n';assert.equal(text.split(begin).length,2);const a=text.indexOf(begin),b=text.indexOf(end,a);assert.ok(b>a);return text.slice(a,b);}

// Preserve the parent route for hash-bound historical preview packages. Only
// the two independently reproduced omissions enter this new compiler revision.
export function prepare({materialize=false}={}){
 const parent=prepareParent();
 const accepted=read(path.join(root,'.artifacts/bend2/toolchain-patches/workers-stage2-20260925/bend2/bend.ts'));
 assert.equal(sha(accepted),'ed606c2b98529b99302c52c38f01ade411cefb03f37b1f0de905db472222019b');
 const original=read(path.join(parentDirectory,'bend2/bend.ts'));
 assert.equal(sha(original),'1d5608feb493495fa0a1c3ba0d1b95c4b3666f1a3fdf2e82dc9a924417a33a77');
 const anchor='      const xs = ts.concat(parse_term_args(p, ")"));\n';
 const stop='      const s  = parse_grow(p, out);\n';
 const a=accepted.indexOf(anchor),b=accepted.indexOf(stop,a);assert.ok(a>=0&&b>a);
 const guard=accepted.slice(a+anchor.length,b);assert.ok(guard.includes('xs.length !== hd.n'));
 const corrected=once(once(original,anchor,anchor+guard),rewrite(original),rewrite(accepted).replaceAll('p.sc.','p.'));
 assert.equal(sha(corrected),'0eab46d06cd349ecd2dd0495b116a6f57f1e483040597cf7aded953711bf8d26');
 const inventory=new Map();
 for(const [name,digest]of Object.entries(parent.hashes)){
  const bytes=fs.readFileSync(path.join(parentDirectory,'bend2',name));assert.equal(sha(bytes),digest);inventory.set(name,name==='bend.ts'?Buffer.from(corrected):bytes);
 }
 assert.equal(inventory.size,98);
 if(materialize&&!fs.existsSync(derived)){
  assert.equal(fs.realpathSync(path.dirname(derived)),path.dirname(derived));
  for(const [name,bytes]of inventory){const file=path.join(derived,'bend2',name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});}
 }
 assert.equal(fs.realpathSync(derived),derived,'corrected compiler directory is redirected');
 const actual=new Map();
 function walk(dir,prefix=''){
  assert.equal(fs.realpathSync(dir),dir);
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,entry.name);assert.ok(!entry.isSymbolicLink());assert.equal(fs.realpathSync(file),file);
   if(entry.isDirectory())walk(file,prefix+entry.name+'/');else {assert.ok(entry.isFile());actual.set(prefix+entry.name,fs.readFileSync(file));}
  }
 }
 walk(path.join(derived,'bend2'));assert.deepEqual([...actual.keys()].sort(),[...inventory.keys()].sort());
 for(const [name,bytes]of inventory)assert.deepEqual(actual.get(name),bytes,'corrected compiler drift: '+name);
 const implementation=Object.fromEntries(['prepare.mjs','prepare-current.mjs'].map(name=>['bend2/toolchain-patches/2035/workers/'+name,sha(fs.readFileSync(path.join(root,'bend2/toolchain-patches/2035/workers',name)))]));
 return {derived,hashes:Object.fromEntries([...inventory].map(([name,bytes])=>[name,sha(bytes)])),lineage:{revision,parentDirectory,parentCompiler:parent.hashes,changedFiles:['bend.ts'],acceptedNormalizedSHA256:sha(accepted),guardSHA256:sha(guard),rewriteSHA256:sha(rewrite(accepted).replaceAll('p.sc.','p.')),implementation}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.ok(process.argv.slice(2).every(x=>x==='--materialize'));
 const binding=prepare({materialize:process.argv.includes('--materialize')});console.log(JSON.stringify(binding));
}
