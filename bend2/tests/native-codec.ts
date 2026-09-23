import J from '../ui/Json.bend';
import C from '../ui/Codec.bend';
import assert from 'node:assert/strict';
const un = (x:any) => { assert.equal(x.$,'Some'); return x.value; };
for (const value of [null,true,false,0,1,-2,1.25,1e3,'hello','a\\b\n\t"z',[],{},[1,true,null],{a:1,b:[false,'x']}]) {
 const text=JSON.stringify(value); const parsed=un(J.parse(text)); const out=J.stringify(parsed); assert.deepEqual(JSON.parse(out),value,`${text} => ${out}`);
}
for(const text of ['', '[1,]', '{"x":1,}', 'true trailing', '01', '1.', '1e', '+1', '"bad\n"', '{"a" 2}', '[', 'nul']) assert.equal(J.parse(text).$,'None',text);
const kinds=['Move','Undo','Offer','Accept','Decline','Resign'];
for(const layout of ['B','C']) {
 const commands=kinds.map((k,i)=>({$:k+'Command',expected:i,...(k==='Move'?{action:21759}:k==='Undo'?{}:{side:i%2===0})}));
 const record={schema:'rift-bend-record/1',layout,policy:2,commands};
 assert.deepEqual(JSON.parse(C.encode(un(C.decode(JSON.stringify(record))))),record);
}
const base={schema:'rift-bend-record/1',layout:'B',policy:0,commands:[]};
assert.equal(C.decode(' '.repeat(2097153)).$,'None','oversized text rejects before JSON parsing');
for(const bad of [{...base,extra:1},{...base,policy:3},{...base,policy:0.5},{...base,layout:'D'},...[
 {$:'MoveCommand',expected:0,action:21760},{$:'UndoCommand',expected:20001},{$:'UndoCommand',expected:0,side:true},{$:'OfferCommand',expected:0,side:1},{$:'Wrong',expected:0},{$:'MoveCommand',expected:0,action:0.1}
].map(c=>({...base,commands:[c]}))]) assert.equal(C.decode(JSON.stringify(bad)).$,'None',JSON.stringify(bad));
for(const text of ['{"schema":"rift-bend-record/1","layout":"B","policy":0,"commands":[],"commands":[]}',JSON.stringify(base)+'x',JSON.stringify(base).replace('"policy":0','"policy":0.00000000001')]) assert.equal(C.decode(text).$,'None');
console.log('native-codec: JSON roundtrips, malformed JSON, all six legacy commands and strict record rejection passed');

for(const text of ['"\\u0000\\u001f"','"\\ud83d\\ude00"','"\\u0041"']) assert.equal(JSON.parse(J.stringify(un(J.parse(text)))),JSON.parse(text));
// The original 20,000-command invocation timed out at 300s before the unread
// String reconstruction fix. The next run decoded 20,000 and rejected 20,001,
// then Base.List.append overflowed the encoder call stack. A tail-recursive
// queue append fixed that. Final full run passed: 20,000 decode 3718.5ms;
// complete stress sequence 13264.1ms. These are JS-loader timings, not native.
// CODEC_STRESS explicitly reruns that separate gate.
for (const count of [100,500]) {
 const sample={...base,commands:Array.from({length:count},(_,i)=>({$:'UndoCommand',expected:i}))};
 const input=JSON.stringify(sample), start=performance.now();
 const decoded=un(C.decode(input)); const decodedAt=performance.now();
 assert.deepEqual(JSON.parse(C.encode(decoded)),sample);
 console.log(`codec latency ${count}: decode ${(decodedAt-start).toFixed(1)}ms, encode ${(performance.now()-decodedAt).toFixed(1)}ms`);
}
const size=process.env.CODEC_STRESS === "1" ? 20000 : 100;
const stressStart=performance.now();
const big={...base,commands:Array.from({length:size},(_,i)=>({$:'UndoCommand',expected:i}))};
assert.equal(C.decode(JSON.stringify(big)).$,'Some');
console.log(`codec ${size} decode accepted in ${(performance.now()-stressStart).toFixed(1)}ms`);
if (size === 20000) { assert.equal(C.decode(JSON.stringify({...big,commands:[...big.commands,{$:'UndoCommand',expected:20000}]})).$,'None'); console.log('codec 20001 commands rejected'); }
assert.deepEqual(JSON.parse(C.encode(un(C.decode(JSON.stringify(big))))),big);
console.log(`native-codec: unicode escapes and ${size}-command roundtrip passed in ${(performance.now()-stressStart).toFixed(1)}ms`);

assert.equal(J.parse('"\\ud800"').$,"None");
assert.equal(J.parse('"\\udc00"').$,"None");
