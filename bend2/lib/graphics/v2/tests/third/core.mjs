/** Independent finite references for cached sprites, atlas isolation and RGBA layers. */
import P from '../../third/Premul.bend';
import Surface from '../../third/Surface.bend';
import Buffer from '../../third/PixelBuffer.bend';
import Blur from '../../third/Blur.bend';
import Cached from '../../third/PreparedSprite.bend';
import Atlas from '../../third/AtlasRegion.bend';
import Draw from '../../DrawList.bend';
import Plan from '../../RenderPlan.bend';
import {assert,image,pix,flat,box,list,coord,rng,equalPixels,reference} from '../expansion/support.mjs';
const random=rng(0x2a771);let arithmetic=0,pixels=0,atlas=0;
/** Independent packed-word channel extraction. */
function channels(p){return [p>>>16&255,p>>>8&255,p&255,p>>>24];}
/** Pack canonical reference bytes with channel<=alpha saturation. */
function pack(r,g,b,a){a=Math.min(255,a);return ((a<<24)|(Math.min(a,r)<<16)|(Math.min(a,g)<<8)|Math.min(a,b))>>>0;}
/** Round a product in the specified byte domain. */
function mul(a,b){return Math.floor((a*b+127)/255);}
/** Independent complete PMA blend equation, with no Bend calls. */
function blend(mode,s,d){const sc=channels(s),dc=channels(d),sa=sc[3],da=dc[3];let a=sa+mul(da,255-sa);if(mode==='Plus')a=Math.min(255,sa+da);if(mode==='SourceIn')a=mul(sa,da);if(mode==='SourceOut')a=mul(sa,255-da);if(mode==='Atop')a=da;if(mode==='Xor')a=Math.floor((sa*(255-da)+da*(255-sa)+127)/255);const c=sc.slice(0,3).map((s,i)=>{const d=dc[i];switch(mode){case 'Over':return s+mul(d,255-sa);case 'Multiply':return Math.floor((s*d+s*(255-da)+d*(255-sa)+127)/255);case 'Screen':return s+d-mul(s,d);case 'Plus':return s+d;case 'SourceIn':return mul(s,da);case 'SourceOut':return mul(s,255-da);case 'Atop':return Math.floor((s*da+d*(255-sa)+127)/255);case 'Xor':return Math.floor((s*(255-da)+d*(255-sa)+127)/255);}});return pack(...c,a);}
for(let a=0;a<256;a++)for(let b=0;b<256;b++){
 const s=pack(random(a+1),random(a+1),random(a+1),a),d=pack(random(b+1),random(b+1),random(b+1),b);
 for(const mode of ['Over','Multiply','Screen','Plus','SourceIn','SourceOut','Atop','Xor']){const got=P.blend({$:mode},s,d);assert.equal(got,blend(mode,s,d),`${mode} a=${a},b=${b}`);assert.ok(P.valid(got));arithmetic++;}
 const rgb=(random(256)<<16)|(random(256)<<8)|random(256);assert.equal(P.straight(rgb,a),pack(mul(rgb>>>16&255,a),mul(rgb>>>8&255,a),mul(rgb&255,a),a));arithmetic++;
}
for(const size of [1,2,4,8,16]){
 const depth=BigInt(Math.log2(size)),src=image(size,(x,y)=>P.straight(((x*31&255)<<16)|((y*47&255)<<8)|83,(x*23+y*61)&255));
 const source={ $:'Surface',depth,size,pixels:src};pixels+=equalPixels(flat(Buffer.image(depth,Buffer.from_image(depth,src)),size),flat(src,size),'Morton round trip');
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){let want=0;for(let b=0;b<12;b++)want|=((x>>b&1)<<(2*b))|((y>>b&1)<<(2*b+1));assert.equal(Buffer.index(x,y),want);arithmetic++;}
 for(const radius of [0,1,2,5,17])for(const border of ['Transparent','Clamp']){
  /** Independent O(N²r) separable reference; fixed denominator includes zeros. */
  function pass(input,horizontal){const out=new Uint32Array(size*size),k=radius*2+1;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const sums=[0,0,0,0];for(let j=-radius;j<=radius;j++){let xx=horizontal?x+j:x,yy=horizontal?y:y+j;if(border==='Clamp'){xx=Math.min(size-1,Math.max(0,xx));yy=Math.min(size-1,Math.max(0,yy));}if(xx>=0&&yy>=0&&xx<size&&yy<size)channels(input[yy*size+xx]).forEach((c,i)=>sums[i]+=c);}out[y*size+x]=pack(...sums.map(s=>Math.floor((s+Math.floor(k/2))/k)));}return out;}
  const expected=radius===0?flat(src,size):pass(pass(flat(src,size),true),false),result=Blur.box(source,radius,{$:border});assert.equal(result.$,'Some');pixels+=equalPixels(flat(result.value.pixels,size),expected,`blur n=${size} r=${radius} ${border}`);
 }
 assert.equal(Blur.box(source,129,{$:'Clamp'}).$,'None');assert.equal(Surface.opacity(source,255),source);
 const zero=Surface.opacity(source,0);assert.equal(zero.pixels.color,0);
}
// Group opacity is applied once after overlap, not once per original child.
const a=P.straight(0xff0000,170),b=P.straight(0x0000ff,190),group=P.scale(P.blend({$:'Over'},b,a),128),distributed=P.blend({$:'Over'},P.scale(b,128),P.scale(a,128));assert.notEqual(group,distributed);
assert.equal(Surface.merge({$:'Over'},{$:'Surface',depth:1n,size:2,pixels:pix(a)},{$:'Surface',depth:2n,size:4,pixels:pix(b)}).$,'None');
for(let trial=0;trial<180;trial++){
 const size=trial%2?32:64,depth=BigInt(Math.log2(size)),side=1<<(random(5)),sd=BigInt(Math.log2(side)),x=random(size+side*2)-side,y=random(size+side*2)-side;
 const colors=image(side,()=>random(0x1000000)),mask=image(side,()=>random(0x1000000)),clip=box(random(size),random(size),random(size+1),random(size+1)),opacity=random(600),background=image(size,(x,y)=>(x*793+y*381)&0xffffff);
 const p=Cached.prepare(depth,size,sd,side,coord(x),coord(y),colors,mask,clip),want=reference(flat(background,size),size,{kind:'sprite',x,y,side,colors:flat(colors,side),mask:flat(mask,side),opacity,clip});
 pixels+=equalPixels(flat(Cached.draw(p,opacity,background),size),want,'cached clip/opacity');
 const frame=Plan.prepare(BigInt(random(4)),depth,size,list([Cached.command(p,opacity)]));pixels+=equalPixels(flat(Plan.render(frame,0n,background),size),want,'cached command');
 assert.equal(Cached.draw(p,0,background),background);
}
// Contrasting atlas neighbors and transparent hidden RGB must never leak.
const side=16,colors=image(side,(x,y)=>x>=3&&x<9&&y>=4&&y<12?((x*29)<<16)|(y*17)<<8:0xff00ff),mask=image(side,(x,y)=>x>=3&&x<9&&y>=4&&y<12?((x*37+y*13)&255)<<16:0xff0000),texture={$:'Texture',depth:4n,size:side,colors,mask},v=Atlas.make(texture,box(3,4,9,12));assert.equal(v.$,'Some');
assert.equal(Atlas.make(texture,box(3,4,17,12)).$,'None');assert.equal(Atlas.make(texture,box(3,4,3,12)).$,'None');
const cc=flat(colors,side),mm=flat(mask,side);
for(let t=0;t<16000;t++){
 const x=random(14),y=random(16),fx=random(256),fy=random(256),weights=[(256-fx)*(256-fy),fx*(256-fy),(256-fx)*fy,fx*fy],points=[[x,y],[x+1,y],[x,y+1],[x+1,y+1]].map(([x,y])=>(Math.min(y,7)+4)*16+Math.min(x,5)+3);
 const ws=points.map((i,j)=>(mm[i]>>>16&255)*weights[j]),sum=ws.reduce((a,b)=>a+b,0),alpha=Math.floor((sum+32768)/65536);let rgb=0;if(alpha)for(const shift of [0,8,16])rgb|=Math.floor((points.reduce((s,i,j)=>s+((cc[i]>>>shift)&255)*ws[j],0)+Math.floor(sum/2))/sum)<<shift;
 const got=Atlas.linear(v.value,x,y,fx,fy);assert.equal(got.alpha,alpha);assert.equal(got.color,rgb>>>0);atlas++;
}
console.log(JSON.stringify({ok:true,arithmetic,pixelComparisons:pixels,atlasSamples:atlas,scope:'Actual emitted Bend under Node; independent finite integer oracles, not a proof or GPU result.'}));
