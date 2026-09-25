/** Independent BigInt/integer and scalar-F32 references, never library lookups. */
import Sample from '../../RgbaSample.bend';
import Transform from '../../Transform2D.bend';
import Affine from '../../RgbaAffine.bend';
import Skin from '../../NineSlice.bend';
import Draw from '../../DrawList.bend';
import Plan from '../../RenderPlan.bend';
import {assert,pix,image,flat,box,list,over,equalPixels,rng} from './support.mjs';
const random=rng(0x918ab);let mixes=0,axes=0,pixels=0,endpoints=0;
/** BigInt oracle avoids agreeing accidentally through U32 overflow. */
function mix(ts,fx,fy){const x=BigInt(Math.min(fx,255)),y=BigInt(Math.min(fy,255)),weights=[(256n-x)*(256n-y),x*(256n-y),(256n-x)*y,x*y],aw=weights.map((w,i)=>w*BigInt(ts[i].alpha)),total=aw.reduce((a,b)=>a+b,0n),alpha=Number((total+32768n)/65536n);if(!alpha)return {$:'Texel',color:0,alpha:0};let color=0;for(const shift of [0,8,16])color|=Number((aw.reduce((n,w,i)=>n+w*BigInt((ts[i].color>>>shift)&255),0n)+total/2n)/total)<<shift;return {$:'Texel',color:color>>>0,alpha};}
const cases=[[[0xff0000,255],[0x00ff00,0],[0x0000ff,0],[0xffffff,0]],[[0xffffff,255],[0xffffff,255],[0xffffff,255],[0xffffff,255]],[[0x32814c,1],[0x8ffff1,2],[0x401ef1,0],[0x901819,255]],[[0xffffff,0],[0x010203,0],[0x070809,0],[0xabcdef,0]]].map(cs=>cs.map(([color,alpha])=>({$:'Texel',color,alpha})));
for(const ts of cases)for(let fy=0;fy<256;fy++)for(let fx=0;fx<256;fx++){assert.deepEqual(Sample.mix(...ts,fx,fy),mix(ts,fx,fy));mixes++;}
for(let i=0;i<5000;i++){const ts=Array.from({length:4},()=>({$:'Texel',color:random(0x1000000),alpha:random(256)})),x=random(400),y=random(400);assert.deepEqual(Sample.mix(...ts,x,y),mix(ts,x,y));mixes++;}
/** Independent fixed-center stretch mapping; margins never scale. */
function axis(i,d,s,a,b){if(i<a)return i;if(i>=d-b)return s-(d-i);return a+Math.floor((i-a+.5)*(s-a-b)/(d-a-b));}
for(const s of [1,2,4,8,16])for(let a=0;a<s;a++)for(let b=0;b<s-a;b++)for(let d=Math.max(1,a+b);d<=40;d++)for(let i=0;i<d;i++){assert.equal(Skin.axis(i,d,s,a,b),axis(i,d,s,a,b));axes++;}
for(let i=0;i<150;i++){
 const side=8,size=32,colors=image(side,(x,y)=>((x*31+11)<<16)|((y*29+5)<<8)|(x+y)),mask=image(side,(x,y)=>((x*39+y*21)&255)<<16),texture={$:'Texture',depth:3n,size:side,colors,mask},cr=flat(colors,side),ma=flat(mask,side);
 const left=random(20),top=random(20),w=4+random(25),h=5+random(24),rect=box(left,top,left+w,top+h),clip=box(random(8),random(8),24+random(8),24+random(8)),insets={$:'Insets',left:2,top:1,right:2,bottom:3},opacity=random(400),background=image(size,(x,y)=>(x*919+y*3829)&0xffffff),want=flat(background,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(x<Math.max(left,clip.left)||y<Math.max(top,clip.top)||x>=Math.min(left+w,clip.right)||y>=Math.min(top+h,clip.bottom))continue;const sx=axis(x-left,w,side,2,2),sy=axis(y-top,h,side,1,3),j=sy*side+sx,a=Math.floor((((ma[j]>>>16)&255)*Math.min(opacity,255)+127)/255);want[y*size+x]=over(cr[j],want[y*size+x],a);}
 pixels+=equalPixels(flat(Skin.draw(5n,size,rect,texture,insets,opacity,clip,background),size),want,'nine slice');
 assert.deepEqual(Skin.draw(5n,size,box(1,1,4,10),texture,insets,255,clip,background),background);endpoints++;
 assert.deepEqual(Sample.linear(texture,0xffffffff,0xffffffff,200,180),Sample.nearest(texture,side-1,side-1));endpoints++;
}
const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b),div=(a,b)=>f(a/b);
/** Explicit scalar F32 inverse in the documented operation order. */
function inverse(m){const det=sub(mul(m.a,m.d),mul(m.b,m.c)),z=div(1,det),a=mul(m.d,z),b=f(-mul(m.b,z)),c=f(-mul(m.c,z)),d=mul(m.a,z);return {a,b,c,d,tx:f(-add(mul(a,m.tx),mul(c,m.ty))),ty:f(-add(mul(b,m.tx),mul(d,m.ty)))};}
/** Point transform with rounding after each scalar operation. */
function point(m,x,y){return {x:add(add(mul(m.a,x),mul(m.c,y)),m.tx),y:add(add(mul(m.b,x),mul(m.d,y)),m.ty)};}
/** Edge equations from the four prepared corners, independent of the library quad. */
function edges(m){const cs=[[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>point(m,x,y)),cx=div(add(add(add(cs[0].x,cs[1].x),cs[2].x),cs[3].x),4),cy=div(add(add(add(cs[0].y,cs[1].y),cs[2].y),cs[3].y),4);return cs.map((p,i)=>{const q=cs[(i+1)%4],a=sub(p.y,q.y),b=sub(q.x,p.x),c=sub(mul(p.x,q.y),mul(q.x,p.y)),sign=add(add(mul(a,cx),mul(b,cy)),c)<0?-1:1;return [mul(a,sign),mul(b,sign),mul(c,sign)];});}
/** Scalar alpha-weighted normalized-UV sample from independent row-major arrays. */
function sample(cr,ma,side,u,v,linear){const tex=(x,y)=>{x=Math.min(side-1,Math.max(0,x));y=Math.min(side-1,Math.max(0,y));const i=y*side+x;return {$:'Texel',color:cr[i],alpha:ma[i]>>>16&255};};if(!linear)return tex(Math.min(side-1,Math.max(0,Math.trunc(mul(u,side)))),Math.min(side-1,Math.max(0,Math.trunc(mul(v,side)))));const xx=Math.min(side-1,Math.max(0,sub(mul(u,side),.5))),yy=Math.min(side-1,Math.max(0,sub(mul(v,side),.5))),x=Math.trunc(xx),y=Math.trunc(yy),fx=Math.min(255,Math.trunc(mul(sub(xx,x),256))),fy=Math.min(255,Math.trunc(mul(sub(yy,y),256)));return mix([tex(x,y),tex(x+1,y),tex(x,y+1),tex(x+1,y+1)],fx,fy);}
for(const m0 of [[22,0,0,19,3,5],[-22,0,0,19,26,5],[24,6,-7,21,8.13,1.19],[31,-7,4,24,-9.17,12.11]])for(const linear of [false,true])for(const opacity of [0,1,97,255,400]){
 const m={$:'Matrix',a:f(m0[0]),b:f(m0[1]),c:f(m0[2]),d:f(m0[3]),tx:f(m0[4]),ty:f(m0[5])},side=8,size=32,colors=image(side,(x,y)=>((x*31+5)<<16)|((y*29+9)<<8)|(x^y)*17),mask=image(side,(x,y)=>((x*27+y*37)&255)<<16),texture={$:'Texture',depth:3n,size:side,colors,mask},cr=flat(colors,side),ma=flat(mask,side),inv=inverse(m),ee=edges(m),clip=box(1,2,30,29),background=image(size,(x,y)=>(x*19391+y*917+3)&0xffffff),want=flat(background,size),filter={$:linear?'Linear':'Nearest'},g=Affine.prepare(m);
 assert.deepEqual(Transform.inverse(m,.1),{$:'Some',value:{$:'Matrix',...inv}});endpoints++;
 for(let y=clip.top;y<clip.bottom;y++)for(let x=clip.left;x<clip.right;x++){let count=0;for(const dy of [.25,.75])for(const dx of [.25,.75])if(ee.every(([a,b,c])=>add(add(mul(a,x+dx),mul(b,y+dy)),c)>=0))count++;const uv=point(inv,x+.5,y+.5),t=sample(cr,ma,side,uv.x,uv.y,linear),effective=Math.floor((t.alpha*Math.min(opacity,255)+127)/255),a=Math.floor(effective*count/4);want[y*size+x]=over(t.color,want[y*size+x],a);}
 const got=Affine.draw(5n,size,g,texture,filter,opacity,clip,background);pixels+=equalPixels(flat(got,size),want,'affine RGBA');
 const commands=list([Draw.mapped(g,texture,filter,opacity,clip)]);for(const cuts of [0n,2n,4n]){const p=Plan.prepare(cuts,5n,size,commands);pixels+=equalPixels(flat(Plan.render(p,2n,background),size),want,'mapped plan');}
}
assert.deepEqual(Transform.inverse(Transform.scale(0,1),0),{$:'None'});endpoints++;
assert.deepEqual(Affine.prepare(Transform.scale(0,1)),{$:'Empty'});endpoints++;
console.log(JSON.stringify({ok:true,mixes,axes,pixels,endpoints,scope:'actual pinned compiler emitted JS; BigInt premultiplied integer oracle; exact nine-slice; scalar-F32 operation-order reference and full-frame mapped plan parity; no F32 exclusions or cross-backend bit claim'}));
