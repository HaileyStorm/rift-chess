import assert from 'node:assert/strict';
import AffineTexture from '../AffineTexture.bend';

type P={x:number;y:number};
type Image={$:'Pix';color:number}|{$:'Qua';tl:Image;tr:Image;bl:Image;br:Image};
const point=(x:number,y:number)=>({$: 'Point',x,y});
const pix=(color:number):Image=>({$: 'Pix',color});
const qua=(tl:Image,tr:Image,bl:Image,br:Image):Image=>
  ({$: 'Qua',tl,tr,bl,br});
const lower=qua(pix(0x15263a),pix(0x263849),
  pix(0x3e3031),pix(0x071726));
const sourceSide=16;
const raw=Array.from({length:sourceSide*sourceSide},(_,k)=>{
  const x=k%sourceSide,y=Math.floor(k/sourceSide);
  return ((x*13+17)<<16)|((y*11+23)<<8)|((x*7+y*9+31)&255);
});
function sourceNode(x:number,y:number,span:number):Image {
  if(span===1)return pix(raw[y*sourceSide+x]);
  const h=span/2;
  return qua(sourceNode(x,y,h),sourceNode(x+h,y,h),
    sourceNode(x,y+h,h),sourceNode(x+h,y+h,h));
}
const source=sourceNode(0,0,sourceSide);
function sample(image:Image,size:number,x:number,y:number):number {
  while(image.$==='Qua') {
    size/=2;
    const right=x>=size,down=y>=size;
    image=down?(right?image.br:image.bl):(right?image.tr:image.tl);
    if(right)x-=size;if(down)y-=size;
  }
  return image.color;
}
function blend(src:number,dst:number,alpha:number):number {
  alpha=Math.min(alpha,255);
  if(alpha<=0)return dst;if(alpha>=255)return src;
  return [16,8,0].reduce((out,shift)=>out|
    (Math.floor((((src>>>shift)&255)*alpha+
      ((dst>>>shift)&255)*(255-alpha)+127)/255)<<shift),0);
}
const cross=(a:P,b:P,p:P)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function coverage(corners:P[],x:number,y:number) {
  const center={x:corners.reduce((n,p)=>n+p.x,0)/4,
    y:corners.reduce((n,p)=>n+p.y,0)/4};
  let count=0,ambiguous=false;
  for(const dy of [.25,.75])for(const dx of [.25,.75]) {
    const p={x:x+dx,y:y+dy};let inside=true;
    for(let i=0;i<4;i++) {
      const a=corners[i],b=corners[(i+1)%4];
      const signed=Math.sign(cross(a,b,center))*cross(a,b,p)/
        Math.hypot(b.x-a.x,b.y-a.y);
      if(Math.abs(signed)<=1e-5)ambiguous=true;
      if(signed<0)inside=false;
    }
    if(inside)count++;
  }
  return {count,ambiguous};
}
function expected(corners:P[],x:number,y:number,opacity:number,base:number) {
  const [p00,p10,,p01]=corners,du={x:p10.x-p00.x,y:p10.y-p00.y},
    dv={x:p01.x-p00.x,y:p01.y-p00.y};
  const det=du.x*dv.y-du.y*dv.x,dx=x+.5-p00.x,dy=y+.5-p00.y;
  const u=(dx*dv.y-dy*dv.x)/det,v=(du.x*dy-du.y*dx)/det;
  const index=(t:number)=>t<=0?0:t>=1?sourceSide-1:
    Math.floor(t*sourceSide);
  const i=index(u),j=index(v),rgb=raw[j*sourceSide+i];
  const {count,ambiguous:edge}=coverage(corners,x,y);
  const nearUV=[u*sourceSide,v*sourceSide].some(z=>
    Math.abs(z-Math.round(z))<=1e-5);
  return {color:blend(rgb,base,Math.floor(Math.min(opacity,255)*count/4)),
    ambiguous:edge||nearUV};
}
let exact=0,ambiguous=0;
for(const [size,p00,p10,p01,box] of [
  [64,point(9,11),point(52,11),point(9,48),[0,0,64,64]],
  [64,point(52,11),point(9,11),point(52,48),[0,0,64,64]],
  [64,point(-8,20),point(38,-7),point(18,65),[0,0,64,64]],
  [128,point(18,17),point(106,26),point(9,111),[0,0,128,128]],
  [512,point(-31,251),point(69,230),point(-6,347),[0,211,111,367]],
  [1024,point(970,940),point(1061,957),point(949,1035),
    [927,918,1024,1024]],
] as [number,P,P,P,number[]][]) {
  const corners=[p00,p10,
    point(p00.x+((p10.x-p00.x)+(p01.x-p00.x)),
      p00.y+((p10.y-p00.y)+(p01.y-p00.y))),p01];
  for(const opacity of [83,255]) {
    const image=AffineTexture.draw(BigInt(Math.log2(size)),size,
      p00,p10,p01,4n,sourceSide,source,opacity,lower) as Image;
    const [left,top,right,bottom]=box;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++) {
      const scalar=expected(corners,x,y,opacity,sample(lower,size,x,y));
      if(scalar.ambiguous){ambiguous++;continue;}
      assert.equal(sample(image,size,x,y),scalar.color,
        `affine texture ${size}/${opacity}/${x}/${y}/${p00.x}`);
      exact++;
    }
  }
}
const a=point(4,5),b=point(55,7),c=point(7,53);
for(const [sourceSize,opacity] of [[sourceSide,0],[0,83],[0,255]]) {
  assert.deepEqual(AffineTexture.draw(6n,64,a,b,c,4n,sourceSize,
    source,opacity,lower),lower,'exact texture endpoint tree');exact++;
}
assert.deepEqual(AffineTexture.draw(6n,64,a,a,c,4n,sourceSide,
  source,255,lower),lower,'degenerate exact tree');exact++;
for(const delta of [-.0002,.0002]) {
  const p0=point(8.5+delta,9),p1=point(56.5+delta,9),
    p2=point(8.5+delta,57),x=20,y=20;
  const corners=[p0,p1,point(56.5+delta,57),p2];
  const image=AffineTexture.draw(6n,64,p0,p1,p2,4n,sourceSide,
    source,255,lower) as Image;
  const scalar=expected(corners,x,y,255,sample(lower,64,x,y));
  assert.equal(scalar.ambiguous,false,'source texel boundary outside tie band');
  assert.equal(sample(image,64,x,y),scalar.color);exact++;
}
console.log(JSON.stringify({ok:true,exact,ambiguous,
  scope:'Independent row-major source RGB scalar, nearest center UV, quarter mask, mirrored/offscreen/clipped512/1024 and endpoint differential; F32 ties only excluded within contract bands'}));
