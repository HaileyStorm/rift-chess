import assert from 'node:assert/strict';
import Rect from '../RectRaster.bend';
const {default: Quad} = await import('../Quad.bend');
const {default: Ortho} = await import('../Ortho.bend');
function sample(image:any,x:number,y:number,size:number):number {
  for(let half=size/2;image.$==='Qua';half/=2){const right=x>=half,bottom=y>=half;image=image[bottom?(right?'br':'bl'):(right?'tr':'tl')];if(right)x-=half;if(bottom)y-=half;}
  return image.color;
}
let checks=0;
for(const depth of [0,1,3,5]){
  const size=2**depth;
  for(const [left,top,right,bottom] of [[0,0,size,size],[0,0,0,size],[size,0,size+5,size],[1,1,size-1,size-1],[0,size-1,size+2,size+2],[3,4,2,1]]){
    const image=Rect.fill(BigInt(depth),size,left,top,right,bottom,99,{$:'Pix',color:7});
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const expected=x>=left&&x<right&&y>=top&&y<bottom?99:7;
      assert.equal(sample(image,x,y,size),expected,`rect ${depth}/${left}/${top}/${right}/${bottom}/${x}/${y}`);checks++;
    }
  }
}
const point=(x:number,y:number)=>({$:'Point',x,y});
const shape=Quad.make(point(20,20),point(40,20),point(40,40),point(20,40));
const filled=Quad.draw(shape,true,77,99,{$:'Pix',color:7});
const outline=Quad.draw(shape,false,77,99,{$:'Pix',color:7});
assert.equal(sample(filled,30,30,512),99);assert.equal(sample(outline,30,30,512),7);
assert.equal(sample(outline,20,30,512),77);assert.equal(sample(filled,19,30,512),7);checks+=4;
for(const angle of [0,.4,1.2,2.8])for(const [x,y] of [[0,0],[3.5,-2.1],[-8,9]]){
  const c=Math.fround(Math.cos(angle)),s=Math.fround(Math.sin(angle));
  const px=Ortho.project_x(c,s,4,20,x,y),py=Ortho.project_y(c,s,.5,4,30,x,y);
  assert.ok(Math.abs(Ortho.inverse_x(c,s,(px-20)/4,(py-30)/2)-x)<.00002);
  assert.ok(Math.abs(Ortho.inverse_y(c,s,(px-20)/4,(py-30)/2)-y)<.00002);checks+=2;
}
assert.equal(Ortho.pixel(-2.5),0);assert.equal(Ortho.pixel(3.7),4);checks+=2;
console.log(JSON.stringify({ok:true,checks,scope:'Finite library-only compiled JavaScript raster and scalar projection checks; no complete raster, F32, native or GPU proof'}));
