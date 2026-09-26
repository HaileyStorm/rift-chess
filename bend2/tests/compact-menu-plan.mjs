import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertCache,cacheDir} from '../tools/selected-modules.mjs';

assertCache('controller');
const api=(await import(pathToFileURL(path.join(cacheDir,'controller.js')).href)).default;
const list=values=>values.reduceRight((tail,head)=>({$: 'Con',head,tail}),{$:'Nil'});
const values=xs=>{const result=[];while(xs?.$==='Con'){result.push(xs.head);xs=xs.tail}return result};
const ids=packet=>values(packet.plan.controls).map(control=>control.id);
const control=(packet,id)=>values(packet.plan.controls).find(item=>item.id===id);
let p=api.boot_reads('','',true,true,1024,768);
assert.deepEqual(p.plan.board,{$:'Rect',x:256,y:64,width:512,height:512});
assert.deepEqual(ids(p).filter(id=>id<1000),[1,2,27,3,5,55,47,56,57]);
assert.equal(control(p,56).bounds.x,692);
assert.equal(control(p,57).bounds.y,592);
for(const [opener,menu,expected] of [[56,11,[28,11,12,13,14,15,16,17,18,19]],
  [57,12,[28,3,4,6,7,8,9,10]]]){
  p=api.dispatch_at_web(list([{$:'Activate',id:opener}]),p.presentation,p.session);
  assert.equal(p.presentation.menu,menu);
  assert.deepEqual(ids(p),expected);
  assert.ok(control(p,28).bounds.x>650);
  p=api.dispatch_at_web(list([{$:'Activate',id:28}]),p.presentation,p.session);
  assert.equal(p.presentation.menu,0);
}
p=api.dispatch_at_web(list([{$:'PointerDown',x:700,y:602,button:0,alt:false}]),
  p.presentation,p.session);
assert.equal(p.presentation.menu,11,'painted View bounds must be clickable');
p=api.dispatch_at_web(list([{$:'PointerDown',x:700,y:120,button:0,alt:false}]),
  p.presentation,p.session);
assert.equal(p.presentation.menu,0,'planned Close bounds must dismiss modal');
const mobile=api.boot_reads('','',true,true,520,1024);
assert.deepEqual(mobile.plan.board,{$:'Rect',x:0,y:112,width:512,height:512});
assert.equal(control(mobile,56).bounds.y,700);
assert.equal(control(mobile,57).bounds.x,336);
console.log('Compact Bend v2 menu: board-first bounds, visible controls, View/Match drawers, close, portrait mapping passed');
