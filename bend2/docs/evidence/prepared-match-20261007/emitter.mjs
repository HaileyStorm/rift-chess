import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolveBaseForeignImports} from '../../../../bend2/tools/loader-v2.ts';
const compilerRelative='.artifacts/toolchains/bend';
const D=path.dirname(fileURLToPath(import.meta.url)),R=path.resolve(D,'../../../..'),O=path.join(D,'prepared-v3-accepted27-emission-r1');
assert.equal(fs.realpathSync(process.cwd()),R);fs.mkdirSync(O);
const derived=path.join(R,compilerRelative);let networkCalls=0;
globalThis.fetch=async()=>{networkCalls++;throw Error('private prepared match probe denies network');};
const bend=await import(pathToFileURL(path.join(derived,'bend2/bend.ts')).href);
const compiler=await import(pathToFileURL(path.join(derived,'bend2/comp.ts')).href);
const book=bend.book_nil(),seen=new Map(),started=performance.now();
try{
 // Explicit canonical frozen dependency namespaces; the private entry is not
 // passed through or substituted into the production selected-entry registry.
 // Accepted27 derives namespaces from the entry import topology. Load once
 // without newer-loader canonical preload assumptions. Same source bytes.
 await bend.book_load(book,path.join(D,'PreparedV3ProbeR1.bend').replaceAll('\\','/'),'',seen);
 resolveBaseForeignImports(book);bend.book_valid(book,0);compiler.book_owned(book,compiler.SYNTH);assert.equal(book.hols+book.open,0);
 for(const def of Object.values(book.tlds))assert.ok(def.b || (def.u!==true && def.i===undefined),'non-Base unsafe or foreign declaration');
 const checkedMs=performance.now()-started;
 const roots=['command','erase','carried','frozen','start','from_position','legal'];
 for(const root of roots){const def=book.tlds[root];assert.ok(def?.$==='Def' && def.v!==null && !def.b && def.x===0 && !def.i && compiler.io_base(book,def.T)===null);}
 const code=compiler.js_lib(book,roots,roots);
 fs.writeFileSync(path.join(O,'prepared-match.js'),code,{flag:'wx'});
 assert.equal(networkCalls,0);
 const output={ok:true,exports:roots,modules:seen.size,checkedMs,unfilled:book.hols+book.open,networkCalls,
  loadedFiles:[...seen].map(([file,namespace])=>({file,namespace})),
  output:'prepared-v3-accepted27-emission-r1/prepared-match.js',
  outputSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(O,'prepared-match.js'))).digest('hex'),
  compilerVersion:'2.0.27',scope:'Private exact final versioned source and three bridges under pristine accepted2.0.27 whole-book source/type and selected pure JS emission; no active UI/version freeze/browser or newer compiler adoption'};
 fs.writeFileSync(path.join(O,'result.json'),JSON.stringify(output,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(output));
}catch(error){console.error(error?.$==='Err'?bend.err_show(error).slice(0,2400):String(error.stack||error));process.exitCode=1;}
