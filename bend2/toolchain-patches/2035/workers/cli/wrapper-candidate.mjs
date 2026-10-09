import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const producer=fileURLToPath(import.meta.url);
const expectedRoot=path.resolve(path.dirname(producer),'../../../../..');
const directoryRelative='.artifacts/bend2/2035-preview/stationary-motion-20261006';
const sourceRelative='bend2/tools/bend.mjs';
const sourceSha256='74971c35a350a1e107fd96723c44c25e1ecb7f3da747e447e66de8085788ca30';
const byteLimit=64*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalRoot="const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');";
const relocatedRoot="const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');";
const originalArgs=String.raw`const args = process.argv.slice(2).map((arg, index, all) => /\.(bend|html)$/.test(arg) || all[index - 1] === '-o' ? path.resolve(arg).replaceAll('\\', '/') : arg);`;
const replacementArgs=String.raw`const args = process.argv.slice(2).map((arg, index, all) => {
  if (all[index - 1] === '-o') return path.resolve(arg).replaceAll('\\', '/');
  if (arg.startsWith('-') || all[index - 1] === '--web-library') return arg;
  return /\.(bend|html)$/.test(arg) ? path.resolve(arg).replaceAll('\\', '/') : arg;
});`;

function once(text,before,after){
 assert.equal(text.split(before).length,2,'wrapper replacement anchor changed');
 return text.replace(before,after);
}
function directory(root,relative=''){
 let current=root;
 for(const part of ['',...relative.split('/').filter(Boolean)]){
  if(part)current=path.join(current,part);
  const stat=fs.lstatSync(current);assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),'wrapper directory is redirected');
  assert.equal(fs.realpathSync(current),current,'wrapper directory realpath changed');
 }
 return current;
}
function authenticateRoot(root){
 assert.equal(typeof root,'string');assert.ok(path.isAbsolute(root),'explicit absolute root required');
 assert.equal(path.resolve(root),expectedRoot,'wrapper producer belongs to another checkout');
 return directory(expectedRoot);
}
function read(file){
 const before=fs.lstatSync(file);assert.ok(before.isFile()&&!before.isSymbolicLink(),'wrapper input is not a regular file');
 assert.equal(fs.realpathSync(file),file,'wrapper input is redirected');
 assert.ok(before.size<=byteLimit,'wrapper file exceeds its byte bound');
 const bytes=fs.readFileSync(file),after=fs.lstatSync(file);
 assert.ok(after.isFile()&&!after.isSymbolicLink());
 assert.equal(fs.realpathSync(file),file);
 for(const key of ['dev','ino','size','mtimeMs','ctimeMs'])assert.equal(after[key],before[key],'wrapper file changed while reading');
 assert.equal(bytes.length,before.size);
 return bytes;
}
function absent(file){
 try{fs.lstatSync(file);}catch(error){if(error.code==='ENOENT')return;throw error;}
 throw new Error('Wrapper candidate output already exists: '+path.basename(file));
}
function target(root,file,name){
 assert.equal(typeof file,'string');assert.ok(path.isAbsolute(file),'explicit absolute output required');
 const parent=directory(root,directoryRelative),expected=path.join(parent,name);
 assert.equal(path.resolve(file),expected,'wrapper output is outside its assigned identity');
 absent(expected);return expected;
}

/** Construct authenticated bytes only; import never materializes or launches. */
export function constructWrapperCandidate({root}={}){
 root=authenticateRoot(root);
 directory(root,'bend2/tools');
 const source=read(path.join(root,sourceRelative));assert.equal(hash(source),sourceSha256,'frozen wrapper changed');
 const text=source.toString('utf8');assert.deepEqual(Buffer.from(text,'utf8'),source);
 const newline=text.includes('\r\n')?'\r\n':'\n';
 const args=replacementArgs.replaceAll('\n',newline);
 const candidate=Buffer.from(once(once(text,originalRoot,relocatedRoot),originalArgs,args),'utf8');
 assert.ok(candidate.length<=byteLimit,'candidate wrapper exceeds its byte bound');
 assert.equal(once(once(candidate.toString('utf8'),args,originalArgs),relocatedRoot,originalRoot),text,'wrapper delta exceeds the two reviewed replacements');
 return {source,candidate,binding:{
  schema:'rift-worker-cli-wrapper-candidate/1',
  source:{path:sourceRelative,sha256:sourceSha256,bytes:source.length},
  candidate:{path:directoryRelative+'/worker-cli-wrapper-candidate-r1.mjs',sha256:hash(candidate),bytes:candidate.length},
  preimage:{path:directoryRelative+'/worker-cli-wrapper-preimage-r1.mjs',sha256:sourceSha256,bytes:source.length},
  producer:{path:'bend2/toolchain-patches/2035/workers/cli/wrapper-candidate.mjs',sha256:hash(read(producer))},
  changes:[
   {kind:'root-relocation',before:"'../..'",after:"'../../../..'",reason:'Private D wrapper is four ancestors below the same canonical root.'},
   {kind:'argument-normalization',order:['Normalize split -o operand to absolute forward-slash path before option guards.','Preserve option tokens and split --web-library operands byte-for-byte.','Normalize other positional .bend/.html paths as before.'],appliesTo:'Both ordinary CLI and --run argv; raw previous-token comparison is retained.'}
  ],
  preserved:'Every other frozen wrapper byte, including pin/runtime guards, isRun, childArgs, preload, script path, timeout, environment and exit dispatch.',
  unsupported:'No -o=, --output=, delimiter or argv redesign is introduced.',
  productionSelected:false,wrapperExecuted:false,
  scope:'Local unadopted source candidate only; no compiler, CLI, browser, native-application or adoption acceptance.'
 }};
}

/** Caller authenticates this producer before dispatch. Partial outputs remain
 * retained on failure; an occupied identity never triggers overwrite or retry. */
export function materializeWrapperCandidate({root,output,preimage,binding}={}){
 root=authenticateRoot(root);
 output=target(root,output,'worker-cli-wrapper-candidate-r1.mjs');
 preimage=target(root,preimage,'worker-cli-wrapper-preimage-r1.mjs');
 binding=target(root,binding,'worker-cli-wrapper-candidate-binding-r1.json');
 const constructed=constructWrapperCandidate({root});
 const receipt=Buffer.from(JSON.stringify({...constructed.binding,materialized:true},null,2)+'\n');
 assert.ok(receipt.length<=byteLimit,'wrapper binding exceeds its byte bound');
 for(const file of [preimage,output,binding]){directory(root,directoryRelative);absent(file);}
 fs.writeFileSync(preimage,constructed.source,{flag:'wx'});
 assert.equal(hash(read(preimage)),sourceSha256);
 directory(root,directoryRelative);absent(output);
 fs.writeFileSync(output,constructed.candidate,{flag:'wx'});
 assert.equal(hash(read(output)),constructed.binding.candidate.sha256);
 assert.equal(hash(read(path.join(root,sourceRelative))),sourceSha256,'frozen wrapper changed during materialization');
 directory(root,directoryRelative);absent(binding);
 fs.writeFileSync(binding,receipt,{flag:'wx'});
 assert.deepEqual(read(binding),receipt);
 return {...constructed.binding,materialized:true,binding:{path:directoryRelative+'/worker-cli-wrapper-candidate-binding-r1.json',sha256:hash(receipt),bytes:receipt.length}};
}
