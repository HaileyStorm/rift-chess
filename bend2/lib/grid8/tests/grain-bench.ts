import RaisedFacet from '../../graphics/v2/RaisedFacet.bend';

const size=Number(process.argv[2]??512),repetitions=Number(process.argv[3]??2);
if(![512,1024].includes(size)||repetitions<1||repetitions>5)
  throw new Error('Use 512/1024 and 1–5 repetitions');
const depth=BigInt(Math.log2(size)),scale=size/1024;
const point=(x:number,y:number)=>({$: 'Point',x:x*scale,y:y*scale});
const style={$:'Surface',top:0x687a80,side:0x314353,
  edge:0xab9c80,shadow:0x081421,glint:0xa3b5bf};
const grain={$:'Palette',base:0x687a80,shade:0x536972,spark:0x9bab9f};
const cells=[] as {p00:ReturnType<typeof point>,p10:ReturnType<typeof point>,
  p11:ReturnType<typeof point>,p01:ReturnType<typeof point>,seed:number}[];
for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++) {
  if((file===3||file===4)&&(rank===3||rank===4))continue;
  const pt=(f:number,r:number)=>point(220+f*64+r*12,330-f*12+r*50);
  cells.push({p00:pt(file,rank),p10:pt(file+1,rank),
    p11:pt(file+1,rank+1),p01:pt(file,rank+1),seed:rank*8+file});
}
function measure(grained:boolean,count:number):number {
  let image:unknown={$:'Pix',color:0x112233};
  const start=performance.now();
  for(let i=0;i<count;i++) {
    const {p00,p10,p11,p01,seed}=cells[i];
    image=grained
      ?RaisedFacet.paint_corners_grained(depth,size,p00,p10,p11,p01,
        0,12*scale,style,grain,seed,8,image)
      :RaisedFacet.paint_corners(depth,size,p00,p10,p11,p01,
        0,12*scale,style,image);
  }
  if(!(image as {$:string}).$)throw new Error('invalid Image');
  return performance.now()-start;
}
measure(false,60);measure(true,60);
const full:number[]=[],fullGrain:number[]=[],focal:number[]=[],focalGrain:number[]=[];
for(let i=0;i<repetitions;i++) {
  if(i%2) {
    fullGrain.push(measure(true,60));full.push(measure(false,60));
    focalGrain.push(measure(true,6));focal.push(measure(false,6));
  } else {
    full.push(measure(false,60));fullGrain.push(measure(true,60));
    focal.push(measure(false,6));focalGrain.push(measure(true,6));
  }
}
const summary=(a:number[])=>a.map(x=>+x.toFixed(2));
console.log(JSON.stringify({size,repetitions,
  full60PlainMs:summary(full),full60GrainMs:summary(fullGrain),
  focal6PlainMs:summary(focal),focal6GrainMs:summary(focalGrain),
  scope:'Pure emitted-JS full construction of six-face projected facets; no blit/browser/native/GPU'}));
