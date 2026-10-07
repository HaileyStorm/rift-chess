import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Called only by the existing matrix's compiler-only mode. No Worker startup.
export async function runCompilerCorpus({bend,comp,output,sha}){
 const results=[],sources={},artifacts={};let sequence=0;
 const describe=e=>e?.$==='Err'?bend.err_show(e):String(e?.message??e);
 async function source(text,{validate=true}={}){
  const name=`source-${++sequence}.bend`,file=path.join(output,name);
  fs.writeFileSync(file,text,{flag:'wx'});sources[name]=sha(text);
  const book=bend.book_nil();await bend.book_load(book,file,'',new Map());if(validate)bend.book_valid(book,0);
  return {book,name,sha256:sources[name]};
 }
 function record(name,s,extra={}){results.push({case:name,source:s.name,sourceSha256:s.sha256,...extra});}
 function write(name,bytes){fs.writeFileSync(path.join(output,name),bytes,{flag:'wx'});artifacts[name]=sha(bytes);}
 const SIMPLE='import Base\n\ndef f(x: U32) -> U32:\n  x\n\ndef main() -> U32:\n  ';
 // Both controls type-check as ordinary calls. Policy rejection must occur
 // during loading, so a coincidental result-type error cannot satisfy this gate.
 for(const [body,call]of [
  ['def f(x:U32,y:U32)->U32:\n  U32.add(x,y)\ndef main()->U32->U32:\n  ','(7)'],
  ['def f(x:U32)->U32->U32:\n  y => U32.add(x,y)\ndef main()->U32:\n  ','(7,8)']]){
  const control=await source('import Base\n'+body+'f'+call+'\n');
  let diagnostic=null;const name=`source-${sequence+1}.bend`;
  try{await source('import Base\n'+body+'f@'+call+'\n',{validate:false});}catch(e){diagnostic=describe(e);}
  assert.ok(diagnostic,'policy-bearing declared arity mismatch survived book_load');assert.match(diagnostic,/named saturated call/);
  results.push({case:'declared-policy-arity',controlSource:control.name,source:name,sourceSha256:sources[name],diagnostic:diagnostic.slice(0,2048)});
 }
 const partialBang=await source('import Base\ndef f(x:U32,y:U32)->U32:\n  U32.add(x,y)\ndef main()->U32->U32:\n  f!(7)\n');
 record('legacy-partial-bang',partialBang);
 for(const suffix of ['@(7)','@1(7)','!@4(7)','~(7)','!~(7)']){
  const s=await source(SIMPLE+'f'+suffix+'\n');
  const build=comp.js_worker_lib(s.book,['main'],{mode:'off',policy:'permissive'});
  assert.equal(build.manifest.exports.main,0);
  const shown=bend.term_show(bend.term_lower(s.book.tlds.main.v));assert.equal(shown,'f'+suffix);
  const round=await source(SIMPLE+shown+'\n');assert.equal(bend.term_show(bend.term_lower(round.book.tlds.main.v)),shown);
  record('canonical-call-roundtrip',s,{suffix,shown,reparsedSource:round.name});
 }
 for(const suffix of ['@0(7)','@-1(7)','@1.5(7)','@9007199254740992(7)','@@(7)','@~(7)','~@(7)','~2(7)','@!(7)','!!(7)','@ (7)','@4\n(7)','@(7,8)','@()']){
  const text=SIMPLE+'f'+suffix+'\n',name=`source-${sequence+1}.bend`;let diagnostic=null;
  try{await source(text);}catch(e){diagnostic=describe(e);}
  assert.ok(diagnostic,'malformed policy was accepted');
  assert.match(diagnostic,/canonical|saturated|positive|modifier|contiguous|argument/);
  results.push({case:'malformed-policy',suffix,source:name,sourceSha256:sources[name],diagnostic:diagnostic.slice(0,2048)});
 }
 for(const [text,pattern]of [[SIMPLE+'(f)(7)@(8)\n',/named|saturated|modifier/]]){
  const name=`source-${sequence+1}.bend`;let diagnostic=null;try{await source(text);}catch(e){diagnostic=describe(e);}
  assert.ok(diagnostic);assert.match(diagnostic,pattern);
  results.push({case:'computed-call-rejection',source:name,sourceSha256:sources[name],diagnostic:diagnostic.slice(0,2048)});
 }
 for(const expression of ['f!(7)','f !(7)','f\n    !(7)']){
  const s=await source(SIMPLE+expression+'\n');const shown=bend.term_show(bend.term_lower(s.book.tlds.main.v));
  assert.equal(shown,'f!(7)');assert.doesNotThrow(()=>comp.js_lib(s.book,['main'],{policy:'strict'}));
  record('legacy-bang-whitespace',s,{expression,shown});
 }
 const ref=bend.Ref('f',undefined,true,'require',4),round=bend.term_lower(bend.term_higher(ref));
 assert.equal(bend.term_show(round),'f!@4');assert.equal(bend.term_show(bend.term_lower(bend.term_higher(bend.Ref('f',undefined,true,'never')))),'f!~');
 const plain=await source(SIMPLE+'f(7)\n');
 assert.equal(bend.term_compare('EQ',plain.book,bend.term_higher(ref),bend.term_higher(bend.Ref('f'))),true);
 record('reference-conversion-and-equality',plain,{shown:bend.term_show(round)});
 const required=await source(SIMPLE+'f@(7)\n'),messages=[];
 assert.equal(comp.js_worker_lib(required.book,['main']).manifest.mode,'auto');
 assert.equal(comp.js_worker_lib(required.book,['main'],{mode:'required-only'}).manifest.policy,'strict');
 assert.throws(()=>comp.js_worker_lib(required.book,['main'],{mode:'off',policy:'strict'}),/disabled/);
 comp.js_lib(required.book,['main'],{onDiagnostic:m=>messages.push(m)});assert.ok(messages.some(m=>m.includes('disabled in synchronous JS')));
 assert.throws(()=>comp.js_lib(required.book,['main'],{policy:'strict'}),/disabled in synchronous JS/);
 record('synchronous-require-enforcement',required,{messages});
 const erased=await source('import Base\ndef f(x:U32)->U32:\n  x\ndef drop(-x:U32)->U32:\n  7\ndef main()->U32:\n  drop(f@(3))\n');
 const erasedBuild=comp.js_worker_lib(erased.book,['main'],{mode:'off',policy:'strict'});
 assert.ok(!erasedBuild.diagnostics.some(d=>d.severity==='warning'));assert.doesNotThrow(()=>comp.js_lib(erased.book,['main'],{policy:'strict'}));
 record('erased-require',erased,{diagnostics:erasedBuild.diagnostics});
 const equality=await source('import Base\ndef identity(x:U32)->U32:\n  x\ndef policy_equality(+x:U32)->{identity@(x) == identity~(x) : U32}:\n  {==}\ndef main()->U32:\n  7\n');
 assert.equal(equality.book.hols,0);assert.deepEqual(comp.js_worker_lib(equality.book,['main'],{mode:'off',policy:'strict'}).diagnostics,[]);
 record('checked-policy-equality',equality,{holes:0});
 const parser=await source('import Base\ndef identity(x:U32)->U32:\n  x\ndef transform(~f:U32->U32,x:U32)->U32:\n  f(x)\ndef template_call(x:U32)->U32:\n  transform@(~identity,x)\ndef refl(+x:U32)->{x == x : U32}:\n  {==}\ndef rewrite(+x:U32)->{x == x : U32}:\n  %name@(refl(x)) : {_ == x : U32}; {==}\n');
 const parsedBuild=comp.js_worker_lib(parser.book,['template_call'],{mode:'required-only',policy:'strict'});
 assert.ok(parsedBuild.manifest.functions.some(f=>f.reachesRequire));record('template-and-rewrite-binder',parser,{program:parsedBuild.manifest.program});
 function checkRewrite(s,binder,policy){
  let term=bend.term_lower(s.book.tlds.rewrite.v);while(term.$==='Lam')term=term.f;
  assert.equal(term.$,'Rwt');assert.equal(term.p.$,'Lam');assert.equal(term.p.f.$,'Lam');assert.equal(term.p.f.k,binder);
  assert.equal(term.e.$,'App');assert.equal(term.e.f.$,'Ref');assert.equal(term.e.f.k,'refl');assert.equal(term.e.f.web,policy);
 }
 checkRewrite(parser,'name',undefined);
 for(const [expression,binder,policy]of [['%name@refl(x)','name',undefined],['%refl(x)','',undefined],['%(refl@(x))','', 'require']]){
  const s=await source('import Base\ndef refl(+x:U32)->{x == x : U32}:\n  {==}\ndef rewrite(+x:U32)->{x == x : U32}:\n  '+expression+' : {_ == x : U32}; {==}\n');
  checkRewrite(s,binder,policy);record('rewrite-evidence-precedence',s,{expression,binder,policy:policy??null});
 }
 const fixture=fileURLToPath(new URL('./compiler-fixture.bend',import.meta.url)),fixtureBytes=fs.readFileSync(fixture);
 const security=bend.book_nil();await bend.book_load(security,fixture,'',new Map());bend.book_valid(security,0);
 const sec={name:'compiler-fixture.bend',sha256:sha(fixtureBytes)};write('compiler-fixture.bend',fixtureBytes);sources[sec.name]=sec.sha256;
 for(const [name,reason]of [['boom','unsafe_reachable'],['indirect','unsafe_reachable'],['effect','foreign_reachable']]){
  assert.throws(()=>comp.js_worker_lib(security,[name],{mode:'required-only',policy:'strict'}),new RegExp(reason));record('reachable-rejection',sec,{export:name,reason});
 }
 assert.throws(()=>comp.js_worker_lib(security,['U32.add']),/non-base/);record('base-root-rejection',sec,{export:'U32.add'});
 for(const name of ['safe','finite']){
  const build=comp.js_worker_lib(security,[name],{mode:'required-only',policy:'strict'});
  assert.ok(build.manifest.functions.every(f=>!['boom','indirect','effect','representation','from_bits','bit_intermediate'].includes(f.name)));
  assert.ok(build.manifest.functions.find(f=>f.name===name)?.eligible);
  fs.mkdirSync(path.join(output,name));
  for(const [file,bytes]of Object.entries(build.files))write(`${name}/${file}`,bytes);
  record('safe-pruning',sec,{export:name,program:build.manifest.program,functions:build.manifest.functions.map(f=>f.name)});
 }
 for(const name of ['forbidden_bits','forbidden_intermediate']){
  assert.throws(()=>comp.js_worker_lib(security,[name],{policy:'strict'}),/unsupported.*f32_internal/);
  const build=comp.js_worker_lib(security,[name]);assert.ok(build.diagnostics.some(d=>d.reason.includes('f32_internal')));
  record('bit-sensitive-f32-rejection',sec,{export:name,diagnostics:build.diagnostics});
 }
 for(const suffix of ['@(7)','@4(7)','~(7)','!@(7)','!@4(7)','!~(7)']){
  const marked=await source(SIMPLE+'f'+suffix+'\n'),control=await source(SIMPLE+'f'+(suffix.startsWith('!')?'!(7)':'(7)')+'\n');
  const native=comp.compile_book(marked.book),baseline=comp.compile_book(control.book);assert.equal(native,baseline);
  const name=`native-${sequence}.c`;write(name,native);record('native-policy-erasure',marked,{suffix,controlSource:control.name,native:name,nativeSHA256:sha(native)});
 }
 return {results,sources,artifacts};
}
