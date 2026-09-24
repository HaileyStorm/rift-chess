import assert from 'node:assert/strict';
import Quad from '../../Quad.bend';
import Grain from '../Grain.bend';
import RaisedFacet from '../RaisedFacet.bend';

type Image = { $:'Pix'; color:number } | {
  $:'Qua'; tl:Image; tr:Image; bl:Image; br:Image};
const pix=(color:number):Image=>({$: 'Pix',color});
const qua=(tl:Image,tr:Image,bl:Image,br:Image):Image=>
  ({$: 'Qua',tl,tr,bl,br});
const point=(x:number,y:number)=>({$: 'Point',x,y});
const palette={$:'Palette',base:0x687a80,shade:0x536972,spark:0x9bab9f};
const background=qua(pix(0x102235),pix(0x1f3142),
  pix(0x382d36),pix(0x071522));
function sample(image:Image,size:number,x:number,y:number):number {
  while(image.$==='Qua') {
    size/=2;
    const right=x>=size,down=y>=size;
    image=down?(right?image.br:image.bl):(right?image.tr:image.tl);
    if(right)x-=size;if(down)y-=size;
  }
  return image.color;
}
function channel(source:number,dest:number,alpha:number):number {
  return Math.floor((source*alpha+dest*(255-alpha)+127)/255);
}
function over(source:number,dest:number,alpha:number):number {
  if(alpha===0)return dest;
  if(alpha>=255)return source;
  const mask=[16,8,0];
  return mask.reduce((out,shift)=>out|
    (channel((source>>>shift)&255,(dest>>>shift)&255,alpha)<<shift),0);
}
type P={x:number;y:number};
function signedCross(a:P,b:P,p:P):number {
  return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
}
function coverage(corners:P[],x:number,y:number):{count:number;ambiguous:boolean} {
  const center={x:corners.reduce((n,p)=>n+p.x,0)/4,
    y:corners.reduce((n,p)=>n+p.y,0)/4};
  let count=0,ambiguous=false;
  for(const dy of [.25,.75])for(const dx of [.25,.75]) {
    const p={x:x+dx,y:y+dy};
    let inside=true;
    for(let i=0;i<4;i++) {
      const a=corners[i],b=corners[(i+1)%4];
      const sign=Math.sign(signedCross(a,b,center));
      const distance=sign*signedCross(a,b,p)/Math.hypot(b.x-a.x,b.y-a.y);
      if(Math.abs(distance)<=1e-5)ambiguous=true;
      if(distance<0)inside=false;
    }
    if(inside)count++;
  }
  return {count,ambiguous};
}
function color(x:number,y:number,seed:number,grainSize:number):number {
  const bx=Math.floor(x/grainSize),by=Math.floor(y/grainSize);
  const h=(73*bx+151*by+seed+(bx*by)%251)%256;
  return h<12?palette.spark:h<36?palette.shade:palette.base;
}
let checks=0,ambiguous=0;
for(const [size,corners] of [
  [32,[point(3,4),point(25,4),point(25,27),point(3,27)]],
  [64,[point(9,10),point(51,10),point(51,48),point(9,48)]],
  [64,[point(31.6,5),point(32.35,5.1),point(32.9,57.4),point(31.5,57.3)]],
  [64,[point(-9.2,19.4),point(41.7,-8.1),point(74.6,39.2),point(21.4,71.7)]],
  [128,[point(36.2,31.6),point(109.7,24.1),point(103.1,101.4),point(24.6,109.8)]],
] as [number,P[]][]) {
  const quad=Quad.make(...corners);
  for(const grainSize of [4,8,16,32])for(const opacity of [1,73,255]) {
    const seed=37;
    const image=Grain.draw(BigInt(Math.log2(size)),size,quad,palette,
      seed,grainSize,opacity,background) as Image;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const {count,ambiguous:edge}=coverage(corners,x,y);
      if(edge){ambiguous++;continue;}
      const expected=over(color(x,y,seed,grainSize),
        sample(background,size,x,y),Math.floor(opacity*count/4));
      assert.equal(sample(image,size,x,y),expected,
        `grain ${size}/${grainSize}/${opacity}/${x}/${y}`);
      checks++;
    }
  }
}
const far=[point(4084,4082),point(4095,4082),
  point(4095,4094),point(4084,4094)];
const high=Grain.draw(12n,4096,Quad.make(...far),palette,255,4,247,
  pix(0x091522)) as Image;
for(let y=4080;y<4096;y++)for(let x=4080;x<4096;x++) {
  const {count,ambiguous:edge}=coverage(far,x,y);
  if(edge){ambiguous++;continue;}
  assert.equal(sample(high,4096,x,y),
    over(color(x,y,255,4),0x091522,Math.floor(247*count/4)),
    `far-domain ${x}/${y}`);checks++;
}
const full=Quad.make(point(1,1),point(61,1),point(61,60),point(1,60));
for(const [grainSize,seed,opacity] of [[4,8,0],[5,8,255],[8,256,255]]) {
  assert.deepEqual(Grain.draw(6n,64,full,palette,seed,grainSize,opacity,
    background),background,'invalid/zero exact tree identity');checks++;
}
const skinny=Quad.make(point(2,2),point(2.0001,2),
  point(2.0001,55),point(2,55));
assert.deepEqual(Grain.draw(6n,64,skinny,palette,7,8,255,
  background),background,'area<=0.1 exact identity');checks++;
for(const delta of [-.0002,.0002]) {
  const corners=[point(32.25+delta,8),point(55,8),
    point(55,56),point(32.25+delta,56)];
  const result=Grain.draw(6n,64,Quad.make(...corners),palette,17,8,255,
    background) as Image;
  const x=32,y=20,{count,ambiguous:near}=coverage(corners,x,y);
  assert.equal(near,false,'edge sample deliberately beyond F32 tie band');
  assert.equal(sample(result,64,x,y),over(color(x,y,17,8),
    sample(background,64,x,y),Math.floor(255*count/4)));
  checks++;
}
assert.deepEqual(RaisedFacet.draw_cell_grained(false,6n,64,
  point(4,4),point(61,4),point(61,59),point(4,59),0,7,
  {$:'Surface',top:0x687a80,side:0x314353,edge:0xab9c80,
    shadow:0x081421,glint:0xa3b5bf},palette,7,8,background),
  background,'absent grained facet exact tree identity');checks++;
console.log(JSON.stringify({ok:true,checks,ambiguous,
  scope:'Independent scalar quarter samples, hash/palette/color, offscreen and rotated clipped geometry; F32 near-edge pixels excluded only within ±1e-5 signed distance; JS finite evidence'}));
