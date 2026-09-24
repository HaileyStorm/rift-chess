import assert from 'node:assert/strict';
import AffineGrain from '../AffineGrain.bend';

type P={x:number;y:number};
type Image={$:'Pix';color:number}|{$:'Qua';tl:Image;tr:Image;bl:Image;br:Image};
const point=(x:number,y:number)=>({$: 'Point',x,y});
const pix=(color:number):Image=>({$: 'Pix',color});
const qua=(tl:Image,tr:Image,bl:Image,br:Image):Image=>
  ({$: 'Qua',tl,tr,bl,br});
const lower=qua(pix(0x15263a),pix(0x263849),
  pix(0x3e3031),pix(0x071726));
const palette={$:'Palette',base:0x8b887d,shade:0x696e6d,spark:0xb7afa0};
function sample(image:Image,size:number,x:number,y:number):number {
  while(image.$==='Qua') {
    size/=2;
    const right=x>=size,down=y>=size;
    image=down?(right?image.br:image.bl):(right?image.tr:image.tl);
    if(right)x-=size;if(down)y-=size;
  }
  return image.color;
}
function blend(source:number,dest:number,alpha:number):number {
  alpha=Math.min(255,alpha);
  if(alpha===0)return dest;
  if(alpha===255)return source;
  return [16,8,0].reduce((out,shift)=>out|
    (Math.floor((((source>>>shift)&255)*alpha+
      ((dest>>>shift)&255)*(255-alpha)+127)/255)<<shift),0);
}
const cross=(a:P,b:P,p:P)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
function mask(corners:P[],x:number,y:number) {
  const center={x:corners.reduce((n,p)=>n+p.x,0)/4,
    y:corners.reduce((n,p)=>n+p.y,0)/4};
  let count=0,ambiguous=false;
  for(const dy of [.25,.75])for(const dx of [.25,.75]) {
    const p={x:x+dx,y:y+dy};let inside=true;
    for(let i=0;i<4;i++) {
      const a=corners[i],b=corners[(i+1)%4];
      const sign=Math.sign(cross(a,b,center));
      const distance=sign*cross(a,b,p)/Math.hypot(b.x-a.x,b.y-a.y);
      if(Math.abs(distance)<=1e-5)ambiguous=true;
      if(distance<0)inside=false;
    }
    if(inside)count++;
  }
  return {count,ambiguous};
}
function pixel(corners:P[],x:number,y:number,seed:number,texels:number,
  opacity:number,background:number) {
  const [p00,p10,,p01]=corners,du={x:p10.x-p00.x,y:p10.y-p00.y},
    dv={x:p01.x-p00.x,y:p01.y-p00.y};
  const det=du.x*dv.y-du.y*dv.x,dx=x+.5-p00.x,dy=y+.5-p00.y;
  const u=(dx*dv.y-dy*dv.x)/det,v=(du.x*dy-du.y*dx)/det;
  const clamp=(t:number)=>t<=0?0:t>=1?texels-1:Math.floor(t*texels);
  const i=clamp(u),j=clamp(v),h=(73*i+151*j+seed+(i*j)%251)%256;
  const color=h<12?palette.spark:h<36?palette.shade:palette.base;
  const {count,ambiguous:edge}=mask(corners,x,y);
  const nearUV=[u*texels,v*texels].some(z=>
    Math.abs(z-Math.round(z))<=1e-5);
  return {color:blend(color,background,Math.floor(opacity*count/4)),
    ambiguous:edge||nearUV};
}
let exact=0,ambiguous=0;
const cases:[number,P,P,P][]=[
  [64,point(9,11),point(52,11),point(9,48)],
  [64,point(52,11),point(9,11),point(52,48)],
  [64,point(-8,20),point(38,-7),point(18,65)],
  [64,point(68,51),point(20,69),point(48,4)],
  [64,point(31.6,5),point(32.4,5.1),point(31.5,57.3)],
  [128,point(18,17),point(106,26),point(9,111)],
];
for(const [size,p00,p10,p01] of cases) {
  const corners=[p00,p10,
    point(p00.x+((p10.x-p00.x)+(p01.x-p00.x)),
      p00.y+((p10.y-p00.y)+(p01.y-p00.y))),p01];
  for(const texels of [8,16,32])for(const opacity of [83,255]) {
    const seed=37;
    const image=AffineGrain.draw(BigInt(Math.log2(size)),size,
      p00,p10,p01,palette,seed,texels,opacity,lower) as Image;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const expected=pixel(corners,x,y,seed,texels,opacity,
        sample(lower,size,x,y));
      if(expected.ambiguous){ambiguous++;continue;}
      assert.equal(sample(image,size,x,y),expected.color,
        `affine ${size}/${texels}/${opacity}/${x}/${y}/${p00.x}`);
      exact++;
    }
  }
}
for(const [size,p00,p10,p01,box] of [
  [512,point(-31,251),point(69,230),point(-6,347),[0,211,111,367]],
  [1024,point(970,940),point(1061,957),point(949,1035),[927,918,1024,1024]],
] as [number,P,P,P,number[]][]) {
  const corners=[p00,p10,
    point(p00.x+((p10.x-p00.x)+(p01.x-p00.x)),
      p00.y+((p10.y-p00.y)+(p01.y-p00.y))),p01];
  const image=AffineGrain.draw(BigInt(Math.log2(size)),size,p00,p10,p01,
    palette,201,16,185,lower) as Image;
  const [left,top,right,bottom]=box;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++) {
    const expected=pixel(corners,x,y,201,16,185,sample(lower,size,x,y));
    if(expected.ambiguous){ambiguous++;continue;}
    assert.equal(sample(image,size,x,y),expected.color,
      `large clipped ${size}/${x}/${y}`);exact++;
  }
}
const a=point(4,5),b=point(55,7),c=point(7,53);
for(const [texels,seed,opacity] of [
  [8,37,0],[0,37,255],[7,37,255],[16,256,255]
]) {
  assert.deepEqual(AffineGrain.draw(6n,64,a,b,c,palette,seed,
    texels,opacity,lower),lower,'exact early input tree');exact++;
}
assert.deepEqual(AffineGrain.draw(6n,64,a,a,c,palette,37,16,255,lower),
  lower,'degenerate exact tree before inverse');exact++;
for(const delta of [-.0002,.0002]) {
  const p0=point(32.25+delta,8),p1=point(56,8),p2=point(32.25+delta,56);
  const corners=[p0,p1,point(56,56),p2],x=32,y=20;
  const image=AffineGrain.draw(6n,64,p0,p1,p2,palette,29,8,255,
    lower) as Image;
  const expected=pixel(corners,x,y,29,8,255,sample(lower,64,x,y));
  assert.equal(expected.ambiguous,false,'beyond edge and UV tie bands');
  assert.equal(sample(image,64,x,y),expected.color);exact++;
}
for(const delta of [-.0002,.0002]) {
  const p0=point(8.5+delta,9),p1=point(56.5+delta,9),
    p2=point(8.5+delta,57),x=20,y=20;
  const corners=[p0,p1,point(56.5+delta,57),p2];
  const image=AffineGrain.draw(6n,64,p0,p1,p2,palette,32,8,255,
    lower) as Image;
  const expected=pixel(corners,x,y,32,8,255,sample(lower,64,x,y));
  assert.equal(expected.ambiguous,false,'UV sample deliberately beyond tie band');
  assert.equal(sample(image,64,x,y),expected.color,
    `UV boundary on ${delta>0?'left':'right'} side`);exact++;
}
const anchored=AffineGrain.draw(6n,64,point(8.5,9),point(56.5,9),
  point(8.5,57),palette,32,8,255,pix(0x15263a)) as Image;
const translated=AffineGrain.draw(6n,64,point(10.5,12),point(58.5,12),
  point(10.5,60),palette,32,8,255,pix(0x15263a)) as Image;
for(const [x,y] of [[17,18],[24,27],[31,38],[42,45]]) {
  assert.equal(sample(anchored,64,x,y),sample(translated,64,x+2,y+3),
    'integer camera translation preserves local material');exact++;
}
console.log(JSON.stringify({ok:true,exact,ambiguous,
  scope:'Independent double-precision scalar inverse affine UV, quarter-mask and color reference; both determinant signs, rotated/offscreen/thin, endpoints; F32 edge/UV ties only excluded within stated bands'}));
