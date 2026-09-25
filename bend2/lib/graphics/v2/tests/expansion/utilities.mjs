/** Exact independent integer oracles for reusable application preparation. */
import Layout from '../../Layout2D.bend';
import Motion from '../../Motion.bend';
import Coverage from '../../Coverage.bend';
import Fx from '../../ColorFx.bend';
import Gather from '../../Gather.bend';
import {assert,image,flat,pix,box,equalPixels,rng,over} from './support.mjs';
const random=rng(818192);let tracks=0,ticks=0,curves=0,coverage=0,pixels=0,gathers=0,fits=0;
for(let trial=0;trial<10000;trial++){
 const total=random(4100),count=random(70),gap=random(20),valid=count>0&&count<=4096&&total<=4096&&gap<=4096&&gap*(count-1)<=total;let cursor=0;
 for(let i=0;i<=count;i++){const got=Layout.track(total,count,gap,i);if(!valid||i===count){assert.deepEqual(got,{$:'None'});continue;}const free=total-gap*(count-1),size=Math.floor(free/count)+(i<free%count?1:0);assert.deepEqual(got,{$:'Some',value:{$:'Span',offset:cursor,size}});cursor+=size+(i+1<count?gap:0);tracks++;}if(valid)assert.equal(cursor,total);
 const delta=trial<50?[0,1,0xffffffff,0xfffffffe,999999][trial%5]:random(0xffffffff),carry=trial<50?0xffffffff:random(0xffffffff),step=trial<20?trial:random(0xffffffff),max=random(10000),got=Motion.ticks(delta,carry,step,max);if(!step)assert.deepEqual(got,{$:'InvalidInterval'});else{const total=BigInt(delta)+BigInt(carry),interval=BigInt(step),available=total/interval,taken=available<BigInt(max)?available:BigInt(max);assert.deepEqual(got,{$:'Ticks',steps:Number(taken),remainder:Number(total%interval),dropped:(available-taken)*interval});assert.equal(BigInt(got.steps)*interval+BigInt(got.remainder)+got.dropped,total);}ticks++;
 const left=random(128),top=random(128),w=1+random(512),h=1+random(512),sw=1+random(4096),sh=1+random(4096),ha=['Start','Center','End'][random(3)],va=['Start','Center','End'][random(3)],byw=w*sh<=h*sw,ww=byw?w:Math.floor(h*sw/sh),hh=byw?Math.floor(w*sh/sw):h,offset=(a,b,align)=>align==='Start'?0:align==='Center'?Math.floor((a-b)/2):a-b,x=left+offset(w,ww,ha),y=top+offset(h,hh,va);assert.deepEqual(Layout.fit(box(left,top,left+w,top+h),sw,sh,{$:ha},{$:va}),{$:'Some',value:box(x,y,x+ww,y+hh)});fits++;
}
const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b);
for(const kind of ['Linear','Smooth','Smoother','CubicIn','CubicOut']){let prev=-1;for(let i=-1000;i<=2000;i++){const t=f(i/1000),u=Math.min(1,Math.max(0,t));let want;switch(kind){case 'Linear':want=u;break;case 'Smooth':want=mul(mul(u,u),sub(3,mul(2,u)));break;case 'Smoother':want=mul(mul(mul(u,u),u),add(mul(u,sub(mul(6,u),15)),10));break;case 'CubicIn':want=mul(mul(u,u),u);break;default:{const s=sub(1,u);want=sub(1,mul(mul(s,s),s));}}want=Math.min(1,Math.max(0,want));const got=Motion.ease({$:kind},t);assert.equal(got,want);assert.ok(got>=0&&got<=1);assert.ok(got>=prev-0.000002);prev=got;curves++;}assert.equal(Motion.ease({$:kind},0),0);assert.equal(Motion.ease({$:kind},1),1);}
for(const op of ['Product','Union','Subtract','Minimum','Maximum'])for(let a=0;a<256;a++)for(let b=0;b<256;b++){const p=Math.floor((a*b+127)/255),want=op==='Product'?p:op==='Union'?a+b-p:op==='Subtract'?Math.floor((a*(255-b)+127)/255):op==='Minimum'?Math.min(a,b):Math.max(a,b);assert.equal(Coverage.alpha({$:op},a,b),want);assert.equal(Coverage.pixel({$:op},(a<<16)|0x8191,(b<<16)|0x1828),want<<16);coverage++;}
for(let depth=0;depth<=7;depth++){
 const side=2**depth,src=image(side,(x,y)=>((x*313+y*7171+random(255))&0xffffff)),raw=flat(src,side);
 for(let i=0;i<3000;i++){const x=i===0?0xffffffff:random(side+3),y=i===1?0xffffffff:random(side+3),a=Math.min(x,side-1),b=Math.min(y,side-1),xx=Math.min(a+1,side-1),yy=Math.min(b+1,side-1);assert.deepEqual(Gather.neighbors(BigInt(depth),side,x,y,src),{$:'Four',a:raw[b*side+a],b:raw[b*side+xx],c:raw[yy*side+a],d:raw[yy*side+xx]});gathers++;}
 for(const effect of [{$:'Tint',rgb:0xc39a7e},{$:'Grayscale'},{$:'Duotone',low:0x201328,high:0xe3cdb4},{$:'Invert'}]){const want=raw.map(c=>{const r=c>>>16&255,g=c>>>8&255,b=c&255,gray=Math.floor((77*r+150*g+29*b+128)/256);switch(effect.$){case 'Tint':return (Math.floor((r*195+127)/255)<<16)|(Math.floor((g*154+127)/255)<<8)|Math.floor((b*126+127)/255);case 'Grayscale':return gray*0x010101;case 'Duotone':return over(effect.high,effect.low,gray);default:return c^0xffffff;}});pixels+=equalPixels(flat(Fx.map(BigInt(depth),effect,src),side),want,'color prepare');}
}
assert.deepEqual(Gather.neighbors(0n,0,0,0,pix(0xabcdef)),{$:'Four',a:0,b:0,c:0,d:0});
console.log(JSON.stringify({ok:true,tracks,ticks,curves,coverage,pixels,gathers,fits,scope:'actual emitted JS; independent exact integer track, fit, U32-boundary timing conservation, complete byte mask arithmetic, shared-prefix gathers and color preparation; F32 easing formula checks'}));
