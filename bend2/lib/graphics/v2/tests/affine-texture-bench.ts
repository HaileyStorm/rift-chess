import AffineGrain from '../AffineGrain.bend';
import AffineTexture from '../AffineTexture.bend';
import Facet from '../Facet.bend';
import Grain from '../Grain.bend';
import Quad from '../../Quad.bend';

const size=Number(process.argv[2]??1024),repetitions=Number(process.argv[3]??3);
if(![512,1024].includes(size)||repetitions<1||repetitions>5)
  throw new Error('Use size 512/1024 and 1–5 repetitions');
const depth=BigInt(Math.log2(size)),scale=size/1024;
const point=(x:number,y:number)=>({$: 'Point',x:x*scale,y:y*scale});
const palette={$:'Palette',base:0x8b887d,shade:0x696e6d,spark:0xb7afa0};
const sourceSide=256;
function sourceNode(x:number,y:number,span:number):unknown {
  if(span===1)return {$:'Pix',color:(((x*13+y*5)&255)<<16)|
    (((x*7+y*11)&255)<<8)|((x*3+y*17)&255)};
  const h=span/2;
  return {$:'Qua',tl:sourceNode(x,y,h),tr:sourceNode(x+h,y,h),
    bl:sourceNode(x,y+h,h),br:sourceNode(x+h,y+h,h)};
}
const source=sourceNode(0,0,sourceSide);
const cells=[] as {p00:ReturnType<typeof point>,p10:ReturnType<typeof point>,
  p11:ReturnType<typeof point>,p01:ReturnType<typeof point>,seed:number}[];
for(let rank=0;rank<3;rank++)for(let file=0;file<4;file++) {
  const x=220+file*92+rank*13,y=320+rank*72-file*17;
  cells.push({p00:point(x,y),p10:point(x+82,y-12),
    p11:point(x+92,y+47),p01:point(x+10,y+59),
    seed:rank*4+file+47});
}
function measure(mode:'flat'|'screen'|'affine'|'image',count:number):number {
  let image:unknown={$:'Pix',color:0x15263a};
  const start=performance.now();
  for(let i=0;i<count;i++) {
    const {p00,p10,p11,p01,seed}=cells[i];
    image=mode==='flat'
      ?Facet.draw(depth,size,Quad.make(p00,p10,p11,p01),palette.base,255,image)
      :mode==='screen'
        ?Grain.draw(depth,size,Quad.make(p00,p10,p11,p01),
          palette,seed,4,255,image)
        :mode==='affine'
          ?AffineGrain.draw(depth,size,p00,p10,p01,
            palette,seed,16,255,image)
          :AffineTexture.draw(depth,size,p00,p10,p01,
            8n,sourceSide,source,255,image);
  }
  if(!(image as {$:string}).$)throw new Error('bad Image');
  return performance.now()-start;
}
for(const mode of ['flat','screen','affine','image'] as const)measure(mode,12);
const output:Record<string,number[]>={};
for(const count of [8,12])for(const mode of ['flat','screen','affine','image'] as const)
  output[`${count}/${mode}`]=[];
for(let repeat=0;repeat<repetitions;repeat++) {
  const order=repeat%2?(['image','affine','screen','flat'] as const):
    (['flat','screen','affine','image'] as const);
  for(const count of [8,12])for(const mode of order)
    output[`${count}/${mode}`].push(measure(mode,count));
}
console.log(JSON.stringify({size,repetitions,
  cases:Object.fromEntries(Object.entries(output).map(([k,v])=>
    [k,v.map(x=>+x.toFixed(2))])),
  scope:'Pure emitted-JS 8/12 affine top-face construction, immutable synthetic 256 Image built before timing; no decode/side faces/blit/browser/native/GPU'}));
