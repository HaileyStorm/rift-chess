import assert from 'node:assert/strict';
import MaskedStamp from '../../MaskedStamp.bend';
import MaskedLayer from '../../MaskedLayer.bend';
import Mask from '../../Mask.bend';
import Mip from '../../Mip.bend';
import Glyph from '../../Glyph.bend';
import {pix,quad,coord,nat,build,sample,raster,blend,rng,list,nodes} from './helpers.ts';
let opacityPairs=0,pixelChecks=0,maskChecks=0,mipChecks=0,glyphChecks=0,endpoints=0;
for(let a=0;a<256;a++)for(let o=0;o<256;o++){
  assert.equal(MaskedLayer.effective(a,o),Math.floor((a*o+127)/255));opacityPairs++;
}
const rand=rng();
function randomTree(side:number,mask=false,level=0):any{
  if(side===1||rand()%4===0){const v=rand();return pix(mask?(((v>>>24)<<16)|(v&65535)):(v&0xffffff));}
  return quad(...[0,1,2,3].map(()=>randomTree(side/2,mask,level+1)) as [any,any,any,any]);
}
for(let k=0;k<160;k++){
  const side=2**(rand()%6),canvas=2**(rand()%7),sd=nat(side),td=nat(canvas);
  const colors=randomTree(side),alpha=randomTree(side,true),target=randomTree(canvas);
  const prepared=Mask.prepare(sd,alpha);
  assert.deepEqual(Mask.prepare(sd,prepared),prepared,'mask preparation is idempotent');endpoints++;
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
    assert.equal(sample(prepared,side,x,y),(sample(alpha,side,x,y)&0xff0000)>>>0);maskChecks++;
  }
  const left=(rand()%(canvas+side*2))-side,top=(rand()%(canvas+side*2))-side;
  const opacity=[0,1,127,254,255,256,0xffffffff][k%7];
  const out=MaskedStamp.draw(td,canvas,sd,side,coord(left),coord(top),colors,alpha,opacity,target);
  const canonical=MaskedStamp.draw(td,canvas,sd,side,coord(left),coord(top),colors,prepared,opacity,target);
  for(let y=0;y<canvas;y++)for(let x=0;x<canvas;x++){
    const sx=x-left,sy=y-top;let expected=sample(target,canvas,x,y);
    if(sx>=0&&sy>=0&&sx<side&&sy<side){const a=(sample(alpha,side,sx,sy)>>>16)&255;
      expected=blend(sample(colors,side,sx,sy),expected,Math.floor((a*Math.min(opacity,255)+127)/255));}
    assert.equal(sample(out,canvas,x,y),expected,`random raw ${k}/${x}/${y}`);
    assert.equal(sample(canonical,canvas,x,y),expected,`random prepared ${k}/${x}/${y}`);pixelChecks+=2;
  }
  assert.deepEqual(MaskedLayer.over(sd,colors,alpha,0,target),target);endpoints++;
  assert.deepEqual(MaskedLayer.over(sd,colors,pix(0xffcafe),255,target),colors);endpoints++;
  if(opacity===0){assert.deepEqual(out,target);endpoints++;}
}
// Deep tree whose alpha is zero but whose ignored channels are all different.
const noisyZero=build(64,(x,y)=>(x*251+y*77)&65535,false);
assert.equal(nodes(noisyZero),5461);assert.deepEqual(Mask.prepare(6n,noisyZero),pix(0));endpoints+=2;
const base=quad(pix(0x123456),pix(0xabcdef),pix(0x223344),pix(0x667788));
for(const [x,y] of [[-4096,0],[4096,0],[0,-4096],[0,4096],[-4097,0],[4097,0],[0,4097]]){
  assert.deepEqual(MaskedStamp.draw(2n,4,0n,1,coord(x),coord(y),pix(0xffaaff),pix(0xff0000),255,base),base);endpoints++;
}
// Single bottom-right pixel in the maximum coordinate canvas, without allocating a dense canvas.
const edge=MaskedStamp.draw(12n,4096,0n,1,coord(4095),coord(4095),pix(0xdeadbe),pix(0xff0000),255,pix(7));
assert.equal(sample(edge,4096,4095,4095),0xdeadbe);assert.equal(sample(edge,4096,4094,4095),7);endpoints+=2;
// Independent integer mip oracle, including intentionally invisible blue/magenta.
function halfReference(colors:any,alpha:any,side:number):[number[],number[]]{
  const rgb:number[]=[],mask:number[]=[];
  for(let y=0;y<side;y+=2)for(let x=0;x<side;x+=2){
    const cs=[sample(colors,side,x,y),sample(colors,side,x+1,y),sample(colors,side,x,y+1),sample(colors,side,x+1,y+1)];
    const aa=[sample(alpha,side,x,y),sample(alpha,side,x+1,y),sample(alpha,side,x,y+1),sample(alpha,side,x+1,y+1)].map(c=>(c>>>16)&255);
    const w=aa.reduce((a,b)=>a+b,0),a=Math.floor((w+2)/4);let c=0;
    if(a)for(const shift of [16,8,0])c|=Math.floor((cs.reduce((s,v,i)=>s+((v>>>shift)&255)*aa[i],0)+Math.floor(w/2))/w)<<shift;
    rgb.push(c>>>0);mask.push(a<<16);
  }return[rgb,mask];
}
for(let k=0;k<100;k++){
  const side=2**(1+rand()%5),colors=randomTree(side),mask=randomTree(side,true),d=nat(side);
  assert.deepEqual(Mip.level(0n,d,side,colors,mask),{$:'Level',depth:d,size:side,colors,mask});endpoints++;
  const got=Mip.half(d,colors,mask),[expectedC,expectedA]=halfReference(colors,mask,side);
  assert.deepEqual([...raster(got.colors,side/2)],expectedC);assert.deepEqual([...raster(got.mask,side/2)],expectedA);mipChecks+=expectedC.length*2;
  let c=colors,m=mask,s=side;
  while(s>1){const h=Mip.half(nat(s),c,m);c=h.colors;m=h.mask;s/=2;}
  const last=Mip.level(100n,d,side,colors,mask);
  assert.deepEqual(last,{$:'Level',depth:0n,size:1,colors:c,mask:m});endpoints++;
}
const halo=Mip.half(1n,quad(pix(0xff0000),pix(0x0000ff),pix(0xff00ff),pix(0x0000ff)),quad(pix(0xff0000),pix(0),pix(0),pix(0)));
assert.deepEqual(halo,{$:'Raster',colors:pix(0xff0000),mask:pix(64<<16)});endpoints++;
assert.deepEqual(Mip.half(1n,pix(0xffffff),quad(pix(1<<16),pix(0),pix(0),pix(0))),{$:'Raster',colors:pix(0),mask:pix(0)});endpoints++;
assert.deepEqual(Mip.half(0n,pix(0xff00ff),pix(0)),{$:'Raster',colors:pix(0xff00ff),mask:pix(0)});endpoints++;
// Glyph bearings are signed offsets, not a layout policy.
const coverage=build(8,(x,y)=>(((x+y)*23)%256)<<16),g={$:'Mask',advance:9,left:coord(-2),top:coord(-6),depth:3n,size:8,coverage};
for(const [x,y] of [[2,9],[-4,5],[63,63]])for(const opacity of [0,93,255]){
 const got=Glyph.draw(6n,64,coord(x),coord(y),g,0x7788ff,opacity,pix(0xeeeecc));
 const expected=MaskedStamp.draw(6n,64,3n,8,coord(x-2),coord(y-6),pix(0x7788ff),coverage,opacity,pix(0xeeeecc));
 assert.deepEqual(raster(got,64),raster(expected,64));glyphChecks+=4096;
}
function signed(c:any):number{return c.$==='Neg'?-c.magnitude:c.value;}
for(const origin of [-4096,-4095,-1,0,1,4095,4096,4097])for(const offset of [-4096,-4,0,4,4096,4097]){
 const got=Glyph.translate(coord(origin),coord(offset)),sum=origin+offset;
 assert.equal(signed(got),Math.abs(origin)>4096||Math.abs(offset)>4096||Math.abs(sum)>4096?4097:sum);glyphChecks++;
}
assert.deepEqual(Glyph.draw_run(list([]),6n,64,0,255,base),base);endpoints++;
const placements=[{$:'Placed',x:coord(5),y:coord(15),glyph:g},{$:'Placed',x:coord(9),y:coord(15),glyph:g}];
const run=Glyph.draw_run(list(placements),6n,64,0xabcdef,111,base);
let expected=base;for(const p of placements)expected=Glyph.draw(6n,64,p.x,p.y,p.glyph,0xabcdef,111,expected);
assert.deepEqual(raster(run,64),raster(expected,64));glyphChecks+=4096;
// Independent wrong-rule controls: floor opacity and blue-channel mask must disagree.
assert.notEqual(MaskedLayer.effective(127,128),Math.floor(127*128/255));endpoints++;
assert.notDeepEqual(raster(MaskedStamp.draw(0n,1,0n,1,coord(0),coord(0),pix(0xffffff),pix(0x800001),255,pix(0)),1),new Uint32Array([0x010101]));endpoints++;
console.log(JSON.stringify({ok:true,opacityPairs,pixelChecks,maskChecks,mipChecks,glyphChecks,endpoints,scope:'Finite independent integer reference tests; execution backend is reported by the runner separately.'}));
