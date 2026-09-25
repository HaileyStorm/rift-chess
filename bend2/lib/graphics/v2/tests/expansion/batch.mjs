/** Actual-emitter exact independent raster tests for clipping, bins, order and damage. */
import Rect from '../../Rect.bend';
import Clip from '../../Clip.bend';
import Clipped from '../../ClippedStamp.bend';
import Draw from '../../DrawList.bend';
import Plan from '../../RenderPlan.bend';
import {assert,pix,image,flat,list,array,coord,box,reference,equalPixels,rng} from './support.mjs';
const random=rng();let pixels=0,endpoints=0,frames=0;
for(let depth=0;depth<=6;depth++){
 const size=2**depth,src=image(size,(x,y)=>(x*73471+y*385+777)&0xffffff),dst=image(size,(x,y)=>(y*12919+x*919+999)&0xffffff),s=flat(src,size),d=flat(dst,size);
 for(let j=0;j<36;j++){
  const b=box(random(size+4),random(size+4),random(size+4),random(size+4)),want=d.slice();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(x>=b.left&&x<b.right&&y>=b.top&&y<b.bottom)want[y*size+x]=s[y*size+x];
  pixels+=equalPixels(flat(Clip.replace(BigInt(depth),size,b,src,dst),size),want,'clip');
 }
 assert.deepEqual(Clip.replace(BigInt(depth),size,box(0,0,0,0),src,dst),dst);endpoints++;
}
for(let trial=0;trial<100;trial++){
 const size=trial%2?32:16,depth=BigInt(Math.log2(size)),side=trial%3?8:16,sd=BigInt(Math.log2(side));
 const colors=image(side,(x,y)=>(x*178233+y*1583+12345)&0xffffff),mask=image(side,(x,y)=>((x*19+y*37+trial*13)&255)<<16|79);
 const cs=flat(colors,side),ms=flat(mask,side),background=image(size,(x,y)=>(x*201+y*799+0x123456)&0xffffff);
 let specs=[],commands=[];
 for(let k=0;k<12;k++){
  const clip=box(random(size),random(size),random(size+5),random(size+5)),opacity=random(310);
  if(k%4===0){const color=random(0xffffff);specs.push({kind:'fill',clip,color,opacity});commands.push(Draw.fill(clip,color,opacity));}
  else{const x=random(size+side)-side,y=random(size+side)-side;specs.push({kind:'sprite',clip,x,y,side,colors:cs,mask:ms,opacity});commands.push(Draw.sprite(size,sd,side,coord(x),coord(y),colors,mask,opacity,clip));
   const expected=reference(flat(background,size),size,specs.at(-1));pixels+=equalPixels(flat(Clipped.draw(depth,size,sd,side,coord(x),coord(y),colors,mask,opacity,clip,background),size),expected,'scissored sprite');}
 }
 let expected=flat(background,size);for(const spec of specs)reference(expected,size,spec);
 pixels+=equalPixels(flat(Draw.render(list(commands),depth,size,0,0,background),size),expected,'draw list');
 for(const cuts of [0n,1n,2n,3n]){const plan=Plan.prepare(cuts,depth,size,list(commands));for(const forks of [0n,1n,3n]){pixels+=equalPixels(flat(Plan.render(plan,forks,background),size),expected,'prepared plan');frames++;}}
 const previous=Plan.render(Plan.prepare(2n,depth,size,list(commands)),0n,background);
 // Remove the last object and invalidate its whole prior clipped bounds.
 const removed=commands.pop();specs.pop();expected=flat(background,size);for(const spec of specs)reference(expected,size,spec);
 const plan=Plan.prepare(2n,depth,size,list(commands));pixels+=equalPixels(flat(Plan.repaint(plan,list([Draw.bounds(removed)]),background,previous),size),expected,'removed object');
 assert.deepEqual(Plan.repaint(plan,list([]),background,previous),previous);endpoints++;
}
const full=box(0,0,32,32),before=Draw.fill(full,0x123456,120),block=Draw.fill(full,0xabcdef,255),after=Draw.fill(full,0x777777,120);
assert.deepEqual(array(Draw.filter(list([before,block,after]),full)),[block,after]);
assert.deepEqual(array(Draw.filter(list([before,after]),full)),[before,after]);endpoints+=2;
const bg=pix(0x3579ab),old=Plan.render(Plan.prepare(2n,5n,32,list([before])),0n,bg);
pixels+=equalPixels(flat(Plan.repaint(Plan.prepare(2n,5n,32,list([])),list([full]),bg,old),32),flat(bg,32),'last object removed');
console.log(JSON.stringify({ok:true,pixels,frames,endpoints,scope:'actual pinned compiler JS under Node; independent integer raster; serial/pool JS partition parity; no native scheduling claim'}));
