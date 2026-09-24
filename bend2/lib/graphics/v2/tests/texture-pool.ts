import assert from 'node:assert/strict';
import Texture from '../Texture.bend';

type Image={$: 'Pix';color:number}|{$:'Qua';tl:Image;tr:Image;bl:Image;br:Image};
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
  if(alpha<=0)return dst;
  if(alpha>=255)return src;
  return [16,8,0].reduce((out,shift)=>out|
    (Math.floor((((src>>>shift)&255)*alpha+
      ((dst>>>shift)&255)*(255-alpha)+127)/255)<<shift),0);
}
function hash(x:number,y:number,seed:number):number {
  const a=((Math.imul(x,374761393)+Math.imul(y,668265263))^seed)>>>0;
  const b=Math.imul(a^(a>>>13),1274126177)>>>0;
  return (b^(b>>>16))>>>0;
}
function scalar(material:{$:string;base:number;ink:number;strength:number;
  seed?:number;period?:number},tileX:number,tileY:number):number {
  if(material.$==='Grain') {
    const noise=hash(tileX,tileY,material.seed!)&255;
    return blend(material.ink,material.base,
      Math.floor(noise*Math.min(material.strength,255)/255));
  }
  if(!material.period)return material.base;
  const diagonal=(tileX+tileY)%material.period;
  return blend(material.ink,material.base,
    Math.floor((material.period-diagonal)*
      Math.min(material.strength,255)/material.period));
}
const materials=[
  {$:'Grain',base:0x102235,ink:0x8bc4d1,strength:79,seed:217},
  {$:'Hatch',base:0x362d31,ink:0xada083,period:7,strength:130},
  {$:'Hatch',base:0x1b2634,ink:0xf0e0bd,period:0,strength:255},
];
let structural=0,pixels=0;
for(let levels=0;levels<=4;levels++) {
  const size=2**levels*4,depth=BigInt(levels),x=3,y=5;
  for(const material of materials)for(let forks=0;forks<=levels;forks++) {
    const serial=Texture.serial_tree(depth,size,x,y,material) as Image;
    const pooled=Texture.pool_top(BigInt(forks),depth,size,x,y,material) as Image;
    const prior=Texture.tree(depth,size,x,y,material) as Image;
    assert.deepEqual(pooled,serial,`pool structural ${levels}/${forks}/${material.$}`);
    assert.deepEqual(prior,serial,`prior structural ${levels}/${material.$}`);
    structural+=2;
    const leafSize=size/2**levels;
    for(let py=0;py<size;py++)for(let px=0;px<size;px++) {
      assert.equal(sample(pooled,size,px,py),scalar(material,
        Math.floor(px/leafSize)+Math.floor(x/leafSize),
        Math.floor(py/leafSize)+Math.floor(y/leafSize)),
        `scalar ${levels}/${forks}/${material.$}/${px}/${py}`);
      pixels++;
    }
  }
}
for(const material of materials) {
  const serial=Texture.serial_tree(7n,1024,0,0,material) as Image;
  const pooled=Texture.pool_top(3n,7n,1024,0,0,material) as Image;
  const prior=Texture.tree(7n,1024,0,0,material) as Image;
  assert.deepEqual(pooled,serial,'cpu pool full 4^7 structure');
  assert.deepEqual(prior,serial,'prior full 4^7 structure');structural+=2;
  for(let ty=0;ty<128;ty++)for(let tx=0;tx<128;tx++) {
    assert.equal(sample(pooled,1024,tx*8+3,ty*8+5),
      scalar(material,tx,ty),`full leaf ${material.$}/${tx}/${ty}`);
    pixels++;
  }
}
console.log(JSON.stringify({ok:true,structural,pixels,
  scope:'Independent integer leaf scalar and complete structural finite differential of serial/top-fork/non-bang Image; emitted JS, no native speed/GPU claim'}));
