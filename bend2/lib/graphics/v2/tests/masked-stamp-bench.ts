import MaskedStamp from '../MaskedStamp.bend';
import Stamp from '../Stamp.bend';

type Image={$:'Pix';color:number}|{$:'Qua';tl:Image;tr:Image;bl:Image;br:Image};
const targetSize=Number(process.argv[2]??512),repetitions=Number(process.argv[3]??3);
if(![512,1024].includes(targetSize)||repetitions<1||repetitions>5)
  throw new Error('Use target512/1024 and 1–5 repetitions');
const sourceSize=targetSize/16,sourceDepth=BigInt(Math.log2(sourceSize));
const targetDepth=BigInt(Math.log2(targetSize));
const coord=(n:number)=>({$:'Pos',value:n});
function ink(x:number,y:number):number {
  return (((x*7+y*2+161)&255)<<16)|(((x*3+y*5+129)&255)<<8)|
    ((x*2+y*4+96)&255);
}
function alpha(x:number,y:number):number {
  const center=(sourceSize-1)/2;
  const distance=Math.hypot(x-center,y-center);
  const radius=sourceSize*.44;
  const a=Math.max(0,Math.min(253,Math.round((radius-distance)*sourceSize*.42)));
  return (a<<16)|(((x*19)&255)<<8)|((y*23)&255);
}
function build(x:number,y:number,span:number,color:(x:number,y:number)=>number):Image {
  if(span===1)return {$:'Pix',color:color(x,y)};
  const h=span/2;
  const tl=build(x,y,h,color),tr=build(x+h,y,h,color),
    bl=build(x,y+h,h,color),br=build(x+h,y+h,h,color);
  if([tl,tr,bl,br].every(v=>v.$==='Pix'&&v.color===tl.color))return tl;
  return {$:'Qua',tl,tr,bl,br};
}
const colors=build(0,0,sourceSize,ink),mask=build(0,0,sourceSize,alpha);
const keyed=build(0,0,sourceSize,(x,y)=>(alpha(x,y)>>>16)===0?0:ink(x,y));
const positions=Array.from({length:32},(_,index)=>{
  const column=index%8,row=Math.floor(index/8),k=targetSize/512;
  return {x:Math.round((57+column*51+row*3)*k),
    y:Math.round((113+row*64-column*2)*k)};
});
function buildFrame(mode:'masked'|'keyed'):{image:Image;ms:number} {
  let image:Image={$:'Pix',color:0x162637};
  const start=performance.now();
  for(const {x,y} of positions)
    image=(mode==='masked'
      ?MaskedStamp.draw(targetDepth,targetSize,sourceDepth,sourceSize,
        coord(x),coord(y),colors,mask,255,image)
      :Stamp.draw(targetDepth,targetSize,sourceDepth,sourceSize,
        coord(x),coord(y),keyed,0,image)) as Image;
  return {image,ms:performance.now()-start};
}
function blit(image:Image):{ms:number;checksum:number} {
  const pixels=new Uint32Array(targetSize*targetSize);
  const start=performance.now();
  function visit(node:Image,x:number,y:number,size:number):void {
    if(node.$==='Qua') {
      const h=size/2;
      visit(node.tl,x,y,h);visit(node.tr,x+h,y,h);
      visit(node.bl,x,y+h,h);visit(node.br,x+h,y+h,h);
      return;
    }
    for(let row=y;row<y+size;row++)pixels.fill(node.color,
      row*targetSize+x,row*targetSize+x+size);
  }
  visit(image,0,0,targetSize);
  const ms=performance.now()-start;
  let checksum=0;
  for(let i=0;i<pixels.length;i+=257)checksum=(checksum+pixels[i])>>>0;
  return {ms,checksum};
}
buildFrame('masked');buildFrame('keyed');
const samples:Record<string,{constructMs:number;blitMs:number;checksum:number}[]>={
  masked:[],keyed:[]};
for(let i=0;i<repetitions;i++) {
  const order=i%2?(['keyed','masked'] as const):(['masked','keyed'] as const);
  for(const mode of order) {
    const frame=buildFrame(mode),copy=blit(frame.image);
    samples[mode].push({constructMs:+frame.ms.toFixed(2),
      blitMs:+copy.ms.toFixed(2),checksum:copy.checksum});
  }
}
console.log(JSON.stringify({targetSize,sourceSize,pieces:32,repetitions,samples,
  scope:'Emitted-JS 32 settled alpha sprites versus hard-key opaque comparator, prebuilt Images, serial full blit; no decode/browser/native/GPU or drag claim'}));
