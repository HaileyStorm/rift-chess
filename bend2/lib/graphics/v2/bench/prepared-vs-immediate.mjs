/** Actual emitted-JS API comparison, preparation separated from steady rendering.
 * The retained MaskedStamp source is byte-identical to the previous delivery.
 * This compares a NEW prepared API against an immediate calling pattern, not
 * a replacement implementation or a promise that all workloads get faster.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import Stamp from '../MaskedStamp.bend';
import Draw from '../DrawList.bend';
import Plan from '../RenderPlan.bend';
import {ImageBuffer} from '../host/ImageBuffer.mjs';
import {image,pix,list,box,coord,flat,equalPixels} from '../tests/expansion/support.mjs';
const repeats=7,warmups=3,size=512,depth=9n,side=64,sourceDepth=6n;
/** Median, with all raw measurements retained in the receipt. */
function median(xs){return [...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];}
/** Rotate order across trials, timing allocation but excluding validation/readback. */
function measure(functions){const keys=Object.keys(functions),times=Object.fromEntries(keys.map(k=>[k,[]])),last={};for(let i=0;i<warmups;i++)for(const k of keys)functions[k]();for(let r=0;r<repeats;r++){let order=[...keys.slice(r%keys.length),...keys.slice(0,r%keys.length)];if(r%2)order.reverse();for(const k of order){const start=performance.now();last[k]=functions[k]();times[k].push(performance.now()-start);}}return {last,times,medians:Object.fromEntries(keys.map(k=>[k,median(times[k])]))};}
const rows=[];
for(const kind of ['opaque-aligned','opaque-unaligned','soft-unaligned']){
 const colors=image(side,(x,y)=>(((x*11)&255)<<16)|(((y*9)&255)<<8)|((x^y)*3&255)),mask=kind==='soft-unaligned'?image(side,(x,y)=>Math.max(0,Math.min(255,Math.round((29-Math.hypot(x-31.5,y-31.5))*40)))<<16):pix(0xff0000),background=pix(0x16202d),clip=box(0,0,size,size);
 const poses=Array.from({length:32},(_,i)=>kind==='opaque-aligned'?[(i%8)*64,Math.floor(i/8)*64]:[(i*61+7)%(size+40)-20,(i*37+11)%(size+40)-20]);
 const moved=poses.map((p,i)=>i===7?[p[0]+13,p[1]+4]:p);
 /** Convert geometry to prepared immutable commands, preserving order. */
 function commands(ps){return list(ps.map(([x,y])=>Draw.sprite(size,sourceDepth,side,coord(x),coord(y),colors,mask,255,clip)));}
 /** Reference immediate call sequence, equivalent to the previous public API. */
 function immediate(ps){let out=background;for(const [x,y]of ps)out=Stamp.draw(depth,size,sourceDepth,side,coord(x),coord(y),colors,mask,255,out);return out;}
 const current=commands(moved),frame=Plan.prepare(3n,depth,size,current),previous=Plan.render(Plan.prepare(3n,depth,size,commands(poses)),0n,background),rect=([x,y])=>box(Math.max(0,x),Math.max(0,y),Math.min(size,x+side),Math.min(size,y+side)),damage=list([rect(poses[7]),rect(moved[7])]);
 const prepared=measure({prepare:()=>Plan.prepare(3n,depth,size,current)});
 const render=measure({immediate:()=>immediate(moved),preparedFull:()=>Plan.render(frame,0n,background),preparedDamage:()=>Plan.repaint(frame,damage,background,previous),prepareAndDamage:()=>Plan.repaint(Plan.prepare(3n,depth,size,current),damage,background,previous)});
 const expected=flat(render.last.immediate,size);let comparisons=0;
 for(const [k,value]of Object.entries(render.last))comparisons+=equalPixels(flat(value,size),expected,k);
 const buffer=new ImageBuffer(size);buffer.write(previous);const readback=measure({full:()=>buffer.write(render.last.preparedFull),damage:()=>{let count=0;for(const p of [rect(poses[7]),rect(moved[7])])count+=buffer.write(render.last.preparedDamage,p).pixels;return count;}});
 rows.push({kind,side,size,sprites:32,cuts:3,pose_example:poses.slice(0,8),pixelsCompared:comparisons,prepare_ms:prepared.times.prepare,prepare_median_ms:prepared.medians.prepare,render_ms:render.times,render_median_ms:render.medians,readback_ms:readback.times,readback_median_ms:readback.medians,damage:[rect(poses[7]),rect(moved[7])]});
}
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(new URL(file,import.meta.url))).digest('hex');
console.log(JSON.stringify({schema:'graphics-prepared-api-benchmark/1',host:process.version,backend:'actual pinned compiler emitted JS under Node',repeats,warmups,method:'rotating/reversing order; setup/compiler excluded; allocation included; raw times retained; source/commands prebuilt; prepare timing includes tile selection only; prepareAndDamage includes that selection; real one-sprite pose change, not unchanged-scene repaint; readback is typed-array CPU work, no Canvas upload',sources:{MaskedStamp:sha('../MaskedStamp.bend'),DrawList:sha('../DrawList.bend'),RenderPlan:sha('../RenderPlan.bend'),ClippedStamp:sha('../ClippedStamp.bend'),TileRaster:sha('../TileRaster.bend'),ImageBuffer:sha('../host/ImageBuffer.mjs')},rows}));
