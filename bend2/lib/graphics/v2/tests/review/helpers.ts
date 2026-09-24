// Independent row-major helpers; no production function calls.
import {createHash} from 'node:crypto';
export type Image={$:'Pix';color:number}|{$:'Qua';tl:Image;tr:Image;bl:Image;br:Image};
export const pix=(color:number):Image=>({$:'Pix',color:color>>>0});
export const coord=(n:number)=>n<0?{$:'Neg',magnitude:-n}:{$:'Pos',value:n};
export const nat=(side:number)=>BigInt(Math.log2(side));
export function quad(tl:Image,tr:Image,bl:Image,br:Image,compact=true):Image {
  if(compact&&[tl,tr,bl,br].every(i=>i.$==='Pix'&&tl.$==='Pix'&&i.color===tl.color))return tl;
  return {$:'Qua',tl,tr,bl,br};
}
export function build(size:number,fn:(x:number,y:number)=>number,compact=true,x=0,y=0):Image {
  if(size===1)return pix(fn(x,y));const h=size/2;
  return quad(build(h,fn,compact,x,y),build(h,fn,compact,x+h,y),build(h,fn,compact,x,y+h),build(h,fn,compact,x+h,y+h),compact);
}
export function sample(image:Image,size:number,x:number,y:number):number {
  while(image.$==='Qua'){size/=2;const r=x>=size,b=y>=size;image=b?(r?image.br:image.bl):(r?image.tr:image.tl);if(r)x-=size;if(b)y-=size;}return image.color;
}
export function raster(image:Image,size:number):Uint32Array {
  const out=new Uint32Array(size*size);for(let y=0;y<size;y++)for(let x=0;x<size;x++)out[y*size+x]=sample(image,size,x,y);return out;
}
export function blend(src:number,dst:number,a:number):number {
  a=Math.min(255,a);if(a===0)return dst;if(a===255)return src;
  return [16,8,0].reduce((v,s)=>v|(Math.floor((((src>>>s)&255)*a+((dst>>>s)&255)*(255-a)+127)/255)<<s),0)>>>0;
}
export function list(xs:ArrayLike<any>):any {let out:any={$:'Nil'};for(let i=xs.length-1;i>=0;i--)out={$:'Con',head:xs[i],tail:out};return out;}
export function rng(seed=0x13579bdf):()=>number {return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};}
export function hash(image:Image,size:number):string {const a=raster(image,size),b=Buffer.alloc(a.length*4);a.forEach((c,i)=>b.writeUInt32LE(c,i*4));return createHash('sha256').update(b).digest('hex');}
export function nodes(image:Image):number {return image.$==='Pix'?1:1+nodes(image.tl)+nodes(image.tr)+nodes(image.bl)+nodes(image.br);}
