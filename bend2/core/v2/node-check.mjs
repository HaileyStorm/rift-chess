import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';

// Same pinned checker/ownership APIs and unsafe-dependency verdict used by the
// upstream CLI. The only resource change is this proof worker's 64 MiB stack.
// Forward-slash input normalization preserves BEND-WINDOWS-PATH-1; no upstream
// source, prelude, axiom, or browser/native generation setting is changed.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const runtimeFile=path.join(root,'bend2/core/v2/proof-runtime.json');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

if(isMainThread){
  const metadata=JSON.parse(fs.readFileSync(runtimeFile,'utf8'));
  if(process.version!==metadata.runtime.version||process.platform!==metadata.runtime.platform||process.arch!==metadata.runtime.arch||digest(fs.readFileSync(process.execPath))!==metadata.runtime.sha256)throw Error('The v2 proof Node runtime differs from proof-runtime.json.');
  const pin=JSON.parse(fs.readFileSync(path.join(root,'bend2/TOOLCHAIN.json'),'utf8'));
  const compiler=path.join(root,'.artifacts/toolchains/bend');
  const head=spawnSync('git',['-C',compiler,'rev-parse','HEAD'],{encoding:'utf8'});
  const dirty=spawnSync('git',['-C',compiler,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'});
  if(head.status!==0||head.stdout.trim()!==pin.bendCommit||dirty.status!==0||dirty.stdout.trim())throw Error('Pinned Bend compiler commit/cleanliness check failed.');
  const input=process.argv[2];if(!input)throw Error('Usage: node node-check.mjs file.bend');
  const file=path.resolve(input).replaceAll('\\','/');
  const timeout=Number(process.env.BEND_TIMEOUT_MS||300000);if(!Number.isSafeInteger(timeout)||timeout<1000||timeout>900000)throw Error('Invalid bounded proof timeout.');
  const worker=new Worker(new URL(import.meta.url),{workerData:{file},resourceLimits:{stackSizeMb:metadata.worker.stackSizeMb},execArgv:metadata.worker.execArgv});
  let verdict=false;
  const timer=setTimeout(()=>{console.error('Error: bounded v2 proof check timed out.');process.exitCode=1;void worker.terminate();},timeout);
  worker.on('message',message=>{verdict=true;if(message.ok)console.log('All terms check.');else{console.error(message.error);process.exitCode=1;}});
  worker.on('error',error=>{console.error(error.stack||String(error));process.exitCode=1;});
  worker.on('exit',code=>{clearTimeout(timer);if(code!==0||!verdict)process.exitCode=1;});
}else{
  let Bend;
  try{
    Bend=await import(pathToFileURL(path.join(root,'.artifacts/toolchains/bend/bend2/bend.ts')).href);
    const Comp=await import(pathToFileURL(path.join(root,'.artifacts/toolchains/bend/bend2/comp.ts')).href);
    const book=Bend.book_nil();const seen=new Map();
    const n0=await Bend.book_load(book,workerData.file,'',seen);
    const laws=path.join(path.dirname(workerData.file),'LAWS.bend');
    if(path.basename(workerData.file)==='PROOF.bend'&&fs.existsSync(laws)&&!seen.has(fs.realpathSync(laws)))throw Error('PROOF.bend must import ./LAWS.bend');
    Bend.book_valid(book);Comp.book_owned(book,Comp.SYNTH);
    const holes=book.hols+book.open;if(holes>0)throw Error(`Error: ${holes} TODOs found. The code is incomplete, and not a valid proof yet.`);
    // Pinned main.ts cli_report dependency walk, rooted at every non-Base
    // imported declaration (stricter than CLI own-file roots), with rejection
    // instead of an unsafe/foreign warning. Base builtin exceptions are exact.
    const own=[...new Set(book.order.filter(k=>book.tlds[k]?.b!==true))];
    const bad=new Set(Object.keys(book.tlds).filter(k=>{const t=book.tlds[k];return t.u===true||(t.i!==undefined&&t.b!==true);}));
    const uses=Object.create(null);const visited=new Set();
    function refs(term,out){if(typeof term==='object'&&term!==null){if((term.$==='Ref'||term.$==='ADT')&&term.k!==undefined)out.add(term.k);for(const[f,v]of Object.entries(term))if(f!=='s')refs(v,out);}}
    for(const queue=bad.size===0?[]:own.slice();queue.length>0;){const k=queue.pop();const t=book.tlds[k];if(t!==undefined&&!visited.has(k)){visited.add(k);const names=new Set();for(const c of t.$==='ADT'?t.c:[t])refs(Bend.term_lower(c.T),names);refs(t.$==='Def'?t.e:undefined,names);for(const r of names){(uses[r]??=[]).push(k);queue.push(r);}}}
    for(const k of bad)uses[k]?.forEach(j=>bad.add(j));
    const tainted=own.filter(k=>bad.has(k));if(tainted.length)throw Error('Error: proof relies on unsafe or foreign code: '+tainted.join(', '));
    parentPort.postMessage({ok:true});
  }catch(error){parentPort.postMessage({ok:false,error:error?.$==='Err'&&Bend?Bend.err_show(error):error?.stack||String(error)});}
}
