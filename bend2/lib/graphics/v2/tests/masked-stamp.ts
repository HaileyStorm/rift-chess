import assert from 'node:assert/strict';
import MaskedStamp from '../MaskedStamp.bend';

type Image={$:'Pix';color:number}|{$:'Qua';tl:Image;tr:Image;bl:Image;br:Image};
const pix=(color:number):Image=>({$: 'Pix',color});
const qua=(tl:Image,tr:Image,bl:Image,br:Image):Image=>
  ({$: 'Qua',tl,tr,bl,br});
const coord=(n:number)=>n<0?{$:'Neg',magnitude:-n}:{$:'Pos',value:n};
function source(x:number,y:number):number {
  return (((x*23+y*5+17)&255)<<16)|(((x*7+y*31+29)&255)<<8)|
    ((x*19+y*13+43)&255);
}
function mask(x:number,y:number):number {
  const a=(x+y)%7===0?255:(x*31+y*17)%256;
  return (a<<16)|(((x*37+y*3)&255)<<8)|((x*11+y*41)&255);
}
function build(x:number,y:number,span:number,color:(x:number,y:number)=>number):Image {
  if(span===1)return pix(color(x,y));
  const h=span/2;
  return qua(build(x,y,h,color),build(x+h,y,h,color),
    build(x,y+h,h,color),build(x+h,y+h,h,color));
}
const colors=build(0,0,8,source),alpha=build(0,0,8,mask);
const base=qua(pix(0x1a2b3c),pix(0x20384d),
  pix(0x3c302b),pix(0x0c1824));
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
  alpha=Math.min(255,alpha);
  if(alpha===0)return dst;if(alpha===255)return src;
  return [16,8,0].reduce((out,shift)=>out|
    (Math.floor((((src>>>shift)&255)*alpha+
      ((dst>>>shift)&255)*(255-alpha)+127)/255)<<shift),0);
}
function scalar(old:number,x:number,y:number,left:number,top:number,
  opacity:number):number {
  const sx=x-left,sy=y-top;
  if(sx<0||sy<0||sx>=8||sy>=8)return old;
  const m=(mask(sx,sy)>>>16)&255;
  const effective=Math.floor((m*Math.min(opacity,255)+127)/255);
  return blend(source(sx,sy),old,effective);
}
let checks=0;
for(const [left,top] of [[9,11],[-3,17],[61,61],[-12,-20],[70,20]]) {
  for(const opacity of [0,73,255]) {
    const image=MaskedStamp.draw(6n,64,3n,8,coord(left),coord(top),
      colors,alpha,opacity,base) as Image;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
      assert.equal(sample(image,64,x,y),
        scalar(sample(base,64,x,y),x,y,left,top,opacity),
        `mask clip ${left}/${top}/${opacity}/${x}/${y}`);
      checks++;
    }
  }
}
for(const opacity of [0,72,255]) {
  assert.deepEqual(MaskedStamp.draw(6n,64,3n,8,coord(-3),coord(17),
    colors,pix(0),opacity,base),base,'uniform transparent exact target');
  checks++;
}
assert.deepEqual(MaskedStamp.draw(6n,64,3n,8,coord(9),coord(11),
  colors,alpha,0,base),base,'opacity zero exact target');checks++;
const first=MaskedStamp.draw(6n,64,3n,8,coord(9),coord(11),
  colors,alpha,255,base) as Image;
const second=MaskedStamp.draw(6n,64,3n,8,coord(12),coord(14),
  colors,alpha,112,first) as Image;
for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
  const old=sample(base,64,x,y),a=scalar(old,x,y,9,11,255);
  assert.equal(sample(second,64,x,y),scalar(a,x,y,12,14,112),
    `painter overlap ${x}/${y}`);checks++;
}
console.log(JSON.stringify({ok:true,checks,
  scope:'Independent scalar red-alpha, rounded opacity, signed clipping and painter overlap; exact endpoints; finite emitted JS only'}));
