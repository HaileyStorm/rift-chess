import assert from 'node:assert/strict';
import Rgba from '../../assets/RgbaImage.bend';
import {list,sample} from './helpers.ts';
let pixelChecks=0,rejections=0,endpoints=0;
function reject(bytes:number[],kind:string){const got=Rgba.decode_bytes(list(bytes));assert.deepEqual(got,{$:'Rejected',reason:{$:kind}});rejections++;}
for(let n=0;n<5;n++)reject(Array(n).fill(999),'BadLength');
reject([82,71,65,49,0],'BadMagic');reject([82,71,65,50,10],'BadDepth');
reject([999,71,65,50,10],'NonByte');reject([82,71,65,50,999],'NonByte');
reject([0,71,65,50,10],'BadMagic');
for(let n=0;n<4;n++)reject([82,71,65,50,0,...Array(n).fill(20)],'BadLength');
for(let i=0;i<4;i++){const p=[10,20,30,40];p[i]=256;reject([82,71,65,50,0,...p],'NonByte');}
reject([82,71,65,50,0,10,20,30,0,99],'BadLength');
reject([82,71,65,50,1,0,0,0,300],'NonByte');
// The large valid payload also checks row order, row joins and maximum depth.
for(let depth=0;depth<=9;depth++){
 const side=2**depth,bytes=new Uint8Array(5+4*side*side);bytes.set([82,71,65,50,depth]);
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){const i=5+4*(y*side+x);bytes[i]=(x*13+y*5)&255;bytes[i+1]=(x*7+y*19)&255;bytes[i+2]=(x*31+y*3+11)&255;bytes[i+3]=(x*17+y*29)&255;}
 const got=Rgba.decode_bytes(list(bytes));assert.equal(got.$,'Decoded');assert.equal(got.depth,depth);endpoints+=2;
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
   const i=5+4*(y*side+x),c=(bytes[i]<<16)|(bytes[i+1]<<8)|bytes[i+2];
   assert.equal(sample(got.colors,side,x,y),c);assert.equal(sample(got.mask,side,x,y),bytes[i+3]<<16);pixelChecks+=2;
 }
}
assert.equal(Rgba.max_bytes(),1048581);assert.equal(Rgba.max_depth(),9);endpoints+=2;
console.log(JSON.stringify({ok:true,pixelChecks,rejections,endpoints,scope:'Finite RGA2 boundary and all-pixel row-major tests, including depth 9. Not a general codec proof.'}));
