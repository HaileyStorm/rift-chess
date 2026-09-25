/** Controlled actual-emitter cache/filter benchmarks, including setup costs and losses. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import Stamp from '../MaskedStamp.bend';
import Cached from '../third/PreparedSprite.bend';
import Blur from '../third/Blur.bend';
import P from '../third/Premul.bend';
import {image,pix,flat,box,coord,equalPixels} from '../tests/expansion/support.mjs';
/** Median of a nonempty list; samples remain in output for inspection. */
function median(a){return [...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];}
/** Rotating/reversing measurement order, exact returned results kept for checks. */
function measure(tasks,repeats=7,warmups=2){const keys=Object.keys(tasks),times=Object.fromEntries(keys.map(k=>[k,[]])),last={};for(let i=0;i<warmups;i++)for(const k of keys)tasks[k]();for(let r=0;r<repeats;r++){let order=[...keys.slice(r%keys.length),...keys.slice(0,r%keys.length)];if(r%2)order.reverse();for(const k of order){const t=performance.now();last[k]=tasks[k]();times[k].push(performance.now()-t);}}return {last,times,medians:Object.fromEntries(keys.map(k=>[k,median(times[k])]))};}
/** Count JS object identity nodes in all images; not a native byte/RSS estimator. */
function nodes(roots){const seen=new Set();function walk(n){if(!n||seen.has(n))return;seen.add(n);if(n.$==='Qua'){walk(n.tl);walk(n.tr);walk(n.bl);walk(n.br);}}roots.forEach(walk);return seen.size;}
const sprites=[];let compared=0;
for(const [size,side]of [[256,32],[512,64]])for(const kind of ['opaque-aligned','opaque-unaligned','soft-unaligned']){
 const depth=BigInt(Math.log2(size)),sd=BigInt(Math.log2(side)),source=image(side,(x,y)=>((x*11&255)<<16)|((y*9&255)<<8)|((x^y)*3&255)),mask=kind==='soft-unaligned'?image(side,(x,y)=>Math.max(0,Math.min(255,Math.round((side*.46-Math.hypot(x-side/2+.5,y-side/2+.5))*40)))<<16):pix(0xff0000),background=pix(0x16202d),clip=box(0,0,size,size),poses=Array.from({length:32},(_,i)=>kind==='opaque-aligned'?[(i%8)*side,Math.floor(i/8)*side]:[(i*61+7)%(size+40)-20,(i*37+11)%(size+40)-20]);
 /** Prepare all poses, sources and scissors; opacity/background remain dynamic. */
 function prepare(){return poses.map(([x,y])=>Cached.prepare(depth,size,sd,side,coord(x),coord(y),source,mask,clip));}
 /** Execute the original API in unchanged painter order. */
 function immediate(){let out=background;for(const [x,y]of poses)out=Stamp.draw(depth,size,sd,side,coord(x),coord(y),source,mask,255,out);return out;}
 /** Reuse coordinate/clip preparation but still composite every sprite each frame. */
 function cached(patches){let out=background;for(const p of patches)out=Cached.draw(p,255,out);return out;}
 const patches=prepare(),prepared=measure({prepare}),render=measure({immediate,cached:()=>cached(patches),prepareAndDraw:()=>cached(prepare())}),expected=flat(render.last.immediate,size);
 compared+=equalPixels(flat(render.last.cached,size),expected,kind);compared+=equalPixels(flat(render.last.prepareAndDraw,size),expected,kind+' miss');
 const saving=render.medians.immediate-render.medians.cached;
 sprites.push({size,side,kind,count:32,preparation:prepared.times.prepare,prepareMedianMs:prepared.medians.prepare,render:render.times,renderMedianMs:render.medians,steadySpeedup:render.medians.immediate/render.medians.cached,breakEvenFrames:saving>0?Math.ceil(prepared.medians.prepare/saving):null,inputUniqueImageNodes:nodes([source,mask]),preparedUniqueImageNodes:nodes(patches.flatMap(p=>[p.colors,p.mask])),method:'Unchanged stable poses; all sprites recomposited. prepareAndDraw rebuilds every patch to expose cache misses. JS object-node counts exclude runtime headers, host buffers and native allocation.'});
}
const blurs=[];
for(const size of [64,128,256]){
 const depth=BigInt(Math.log2(size)),src={$:'Surface',depth,size,pixels:image(size,(x,y)=>P.straight(((x*17&255)<<16)|((y*31&255)<<8)|127,(x*43+y*19)&255))};
 const tasks=Object.fromEntries([1,8,32,128].map(radius=>[radius,()=>Blur.box(src,radius,{$:'Transparent'})]));const result=measure(tasks,5,1);
 blurs.push({size,times:result.times,medianMs:result.medians,method:'Complete surface->owned buffers->horizontal and vertical scans->immutable surface; includes allocation and conversion; no render-only claim.'});
}
const report={schema:'graphics-third-performance/1',host:process.version,backend:'pinned compiler emitted JavaScript',pixelComparisons:compared,sprites,blurs,sources:Object.fromEntries(['MaskedStamp.bend','third/PreparedSprite.bend','third/Blur.bend','third/PixelBuffer.bend'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+n,import.meta.url))).digest('hex')]))};
const text=JSON.stringify(report,null,2);if(process.env.THIRD_PERF_OUTPUT)fs.writeFileSync(process.env.THIRD_PERF_OUTPUT,text+'\n');console.log(text);
