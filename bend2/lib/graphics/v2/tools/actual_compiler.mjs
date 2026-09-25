/** Execute the unmodified pinned Bend checker/emitter under Node, not a source emulator. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const pin=JSON.parse(fs.readFileSync(path.join(root,'bend2/TOOLCHAIN.json'),'utf8'));
const compiler=path.resolve(process.env.BEND_COMPILER ?? path.join(root,'.artifacts/toolchains/bend'));
process.env.BEND_NO_TELEMETRY='1';
/** Run a Git identity query without accepting missing or dirty tracked compiler bytes. */
function git(...args){const r=spawnSync('git',['-C',compiler,...args],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||'Git failed');return r.stdout.trim();}
if(git('rev-parse','HEAD')!==pin.bendCommit)throw Error('Compiler pin mismatch');
if(git('status','--porcelain','--untracked-files=no'))throw Error('Compiler tracked tree is dirty');
const Bend=await import(pathToFileURL(path.join(compiler,'bend2/bend.ts')));
const Comp=await import(pathToFileURL(path.join(compiler,'bend2/comp.ts')));
/** Check the complete import closure, retaining the upstream sibling-law and ownership gates. */
export async function checked(file){
 const book=Bend.book_nil(),seen=new Map();
 await Bend.book_load(book,path.resolve(file).replaceAll('\\','/'),'',seen);
 const sibling=path.join(path.dirname(path.resolve(file)),'LAWS.bend');
 if(path.basename(file)==='PROOF.bend'&&fs.existsSync(sibling)&&!seen.has(fs.realpathSync(sibling)))throw Error('PROOF must import sibling LAWS');
 Bend.book_valid(book);Comp.book_owned(book,Comp.SYNTH);
 if(book.hols+book.open)throw Error(`${book.hols+book.open} unfilled laws/TODOs`);
 // Conservatively report every non-Base unsafe/foreign definition, not just roots.
 const promises=Object.entries(book.tlds).filter(([k,v])=>v.b!==true&&(v.u===true||v.i!==undefined)).map(([k])=>k);
 const closure=[...seen.keys()].filter(p=>fs.existsSync(p)&&fs.statSync(p).isFile()).sort().map(p=>({path:path.relative(root,p),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
 return {book,closure,promises};
}
/** Emit eligible non-Base definitions using the upstream library-export predicate; imported names may be qualified. */
export function exportsOf(book){return [...new Set(book.order)].filter(k=>{const d=book.tlds[k];return !k.includes('/')&&d.$==='Def'&&d.v!==null&&d.b!==true&&d.x===0&&d.i===undefined&&Comp.io_base(book,d.T)===null;});}
const [mode,file,out]=process.argv.slice(2);
if(mode){
 try{
  if(!['check','js','c'].includes(mode)||!file)throw Error('Usage: node --experimental-strip-types actual_compiler.mjs check|js|c input.bend [output]');
  // Base's effect paths are relative to the pinned compiler directory, as in its CLI.
  process.chdir(path.join(compiler,'bend2'));
  const start=performance.now(),result=await checked(file);
  if(mode!=='check'&&!out)throw Error('An output path is required');
  if(mode==='js')fs.writeFileSync(out,Comp.js_lib(result.book,exportsOf(result.book),exportsOf(result.book)));
  if(mode==='c')fs.writeFileSync(out,Comp.compile_book(result.book));
  console.log(JSON.stringify({ok:true,mode,input:path.relative(root,file),ms:performance.now()-start,compiler:pin.bendCommit,host:process.version,pinnedBun:false,promises:result.promises,closure:result.closure}));
 }catch(e){console.error(e?.$==='Err'?Bend.err_show(e):e?.stack??String(e));process.exitCode=1;}
}
