import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const D=path.dirname(fileURLToPath(import.meta.url)),R=path.resolve(D,'../../../..'),O=path.join(D,'prepared-v3-diff-r1');
assert.equal(await fs.realpath(process.cwd()),R);await fs.mkdir(O);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const encode=x=>JSON.stringify(x,(_k,v)=>typeof v==='bigint'?{bigint:v.toString()}:v);
const raw=await fs.readFile(path.join(D,'prepared-v3-emission-supervisor-r1/terminal.json'));
assert.equal(hash(raw),'1fb8499ae5d8adde4e178aeec0d2b6180999aab4a8dec7db6e4d6a550eeeed86');
const t=JSON.parse(raw);assert.ok(t.passed&&t.checkedExitedHandleClosed&&t.checkedJobClosed);
const module=path.join(D,t.result.output);assert.equal(hash(await fs.readFile(module)),t.result.outputSHA256);
const api=(await import(pathToFileURL(module))).default;
const rows=[],controls=[];
const xs=n=>{const out=[];for(;n.$==='Con';n=n.tail)out.push(n.head);assert.equal(n.$,'Nil');return out;};
const tag=name=>name,policy=name=>({$:tag(name)});
const sq=s=>s.charCodeAt(0)-97+8*(Number(s[1])-1),mv=(f,t,p=0)=>sq(f)*320+sq(t)*5+p;
const command=(kind,m,fields={})=>({$:tag(kind),expected:m.revision,...fields});
function compare(label,m,c){
 const prior=encode([m,c]);let old,value,times={};
 for(const which of rows.length%2?['candidate','frozen']:['frozen','candidate']){
  const at=performance.now();if(which==='frozen')old=api.frozen(m,c);else value=api.command(m,c);times[which]=performance.now()-at;
 }
 const erased=api.erase(value);assert.deepEqual(erased,old,label);assert.equal(encode([m,c]),prior,'pure match/command inputs retained');
 const ids=api.carried(value),accepted=old.$===tag('Accepted');
 if(accepted&&c.$===tag('MoveCommand')){
  assert.equal(value.$,'MoveAccepted');assert.equal(ids.$,'Some');
  assert.deepEqual(ids.value,api.legal(old.next.state),'canonical ordered carried list of returned position');
  const ordered=xs(ids.value);assert.ok(ordered.every((id,i)=>i===0||id>ordered[i-1]));
 }else{assert.equal(value.$,'Ordinary');assert.deepEqual(ids,{$:'None'});}
 rows.push({label,command:c,accepted,matchSHA256:hash(encode(old)),carriedCount:ids.$==='Some'?xs(ids.value).length:null,callMs:times});
 return {game:accepted?old.next:old.old,value,accepted};
}
function prefix(label,ids,pol='Prompt'){
 let m=api.start(true,policy(pol));
 for(const [i,action]of ids.entries()){const r=compare(label+'/prefix'+i,m,command('MoveCommand',m,{action}));assert.ok(r.accepted);m=r.game;}
 return m;
}
const castle=[mv('e2','e4'),mv('e7','e5'),mv('g1','f3'),mv('g8','f6'),mv('f1','e2'),mv('f8','e7')];
const fixtures=[{label:'move',prefix:[],action:3980},{label:'capture',prefix:[2680,15845],action:7845},{label:'castle',prefix:castle,action:mv('e1','g1')},{label:'enpassant',prefix:[...castle,mv('e1','g1'),mv('e8','g8'),mv('h2','h4'),mv('a7','a6'),mv('h4','h5'),mv('g7','g5')],action:mv('h5','g6')},{label:'promotion',prefix:[2680,15845,7845,18440,10765,17835,13365,15235],action:15969}];
for(const f of fixtures){
 const m=prefix(f.label,f.prefix),r=compare(f.label+'/accepted',m,command('MoveCommand',m,{action:f.action}));assert.ok(r.accepted);
 const oldIds=api.legal(m.state);assert.notDeepEqual(oldIds,api.carried(r.value).value,'wrong-position list must fail pairing');
 controls.push({label:f.label,oldIdsMismatch:true,oldIdsSHA256:hash(encode(oldIds)),newIdsSHA256:hash(encode(api.carried(r.value).value))});
}
let m=prefix('start',[]);
const shift=xs(api.legal(m.state)).find(id=>id>=20480);assert.ok(Number.isInteger(shift));assert.ok(compare('shift',m,command('MoveCommand',m,{action:shift})).accepted);
for(const action of [0,21760,4294967295])assert.equal(compare('invalid-'+action,m,command('MoveCommand',m,{action})).accepted,false);
assert.equal(compare('stale-revision',m,{$:tag('MoveCommand'),expected:256n,action:3980}).accepted,false);
assert.equal(compare('empty-undo',m,command('UndoCommand',m)).accepted,false);
let offered=compare('offer-white',m,command('OfferCommand',m,{side:true})).game;
assert.equal(compare('own-offer-accept',offered,command('AcceptCommand',offered,{side:true})).accepted,false);
assert.ok(compare('opponent-decline',offered,command('DeclineCommand',offered,{side:false})).accepted);
let agreed=compare('opponent-accept',offered,command('AcceptCommand',offered,{side:false})).game;
assert.equal(compare('move-after-agreement',agreed,command('MoveCommand',agreed,{action:3980})).accepted,false);
for(const side of [true,false]){
 const resigned=compare('resign-'+side,m,command('ResignCommand',m,{side})).game;
 assert.equal(compare('move-after-resign-'+side,resigned,command('MoveCommand',resigned,{action:3980})).accepted,false);
}
const afterMove=compare('undo-prefix',m,command('MoveCommand',m,{action:3980})).game;
assert.ok(compare('undo-accepted',afterMove,command('UndoCommand',afterMove)).accepted);
const cycle=[mv('g1','f3'),mv('g8','f6'),mv('f3','g1'),mv('f6','g8')];
const repetition=prefix('threefold',[...cycle,...cycle]);
assert.equal(compare('move-after-threefold',repetition,command('MoveCommand',repetition,{action:3980})).accepted,false);
const quietPosition={...m.state,quiet:99n};const quiet=api.from_position(quietPosition,policy('Auto100'));assert.equal(quiet.$,'Some');
const terminal=compare('quiet100-knight',quiet.value,command('MoveCommand',quiet.value,{action:mv('g1','f3')}));assert.ok(terminal.accepted);
assert.ok(xs(api.carried(terminal.value).value).length>0,'terminal evaluation carries unfiltered canonical IDs');
assert.equal(compare('move-after-quiet100',terminal.game,command('MoveCommand',terminal.game,{action:mv('g8','f6')})).accepted,false);
const result={ok:true,emissionTerminalSHA256:hash(raw),moduleSHA256:hash(await fs.readFile(module)),rows,controls,
 scope:'Final versioned accepted2.0.27 prepared command/frozen complete-result and ordered-post-list differential; actual committed ordinary/capture/castle/EP/promotion/Shift, revision/invalid/Undo/offer/reply/resign/threefold/Auto100 boundaries. Controlled Node call costs, no UI/browser latency/adoption/Safe/kernel claim. Old-position-list controls discriminate input/post-position IDs; compiled proof mutation controls remain separate.'};
await fs.writeFile(path.join(O,'result.json'),JSON.stringify(result,(_k,v)=>typeof v==='bigint'?{bigint:v.toString()}:v,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({ok:true,cases:rows.length,controls:controls.length,resultSHA256:hash(await fs.readFile(path.join(O,'result.json')))}));
