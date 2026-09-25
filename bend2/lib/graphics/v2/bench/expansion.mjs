/** Actual emitted-JS A/B. Compilation, source creation and flattening are untimed. */
import Current from '../MaskedStamp.bend';
import Plan from '../RenderPlan.bend';
import Commands from '../DrawList.bend';
import Affine from '../RgbaAffine.bend';
import {image,pix,flat,coord,box,list,equalPixels} from '../tests/expansion/support.mjs';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
const base=process.env.GRAPHICS_BASELINE;
if(!base)throw Error('GRAPHICS_BASELINE must name the previous checkpoint v2 directory');
const Previous=(await import(pathToFileURL(base+'/MaskedStamp.bend'))).default;
const repeats=Number(process.env.BENCH_REPEATS??9);
const warmups=4;
/** Median of an unsorted finite sample. */
function median(xs){const a=[...xs].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];}
/** Alternate implementation order to reduce warmup/thermal/order bias. */
function compare(a,b,verify){for(let i=0;i<warmups;i++){a();b();}const at=[],bt=[];let av,bv;for(let i=0;i<repeats;i++){const tasks=i%2?[['b',b],['a',a]]:[['a',a],['b',b]];for(const [k,f]of tasks){const t=performance.now(),value=f(),ms=performance.now()-t;(k==='a'?at:bt).push(ms);if(k==='a')av=value;else bv=value;}}const pixels=verify(av,bv);return {a_ms:at,b_ms:bt,a_median_ms:median(at),b_median_ms:median(bt),b_over_a:median(bt)/median(at),pixels};}
/** Sprite loop shares immutable source images and includes target-tree allocation. */
function stamps(api,size,source,mask,poses){return ()=>{let out=pix(0x16202d);for(const [x,y,opacity]of poses)out=api.draw(BigInt(Math.log2(size)),size,6n,64,coord(x),coord(y),source,mask,opacity,out);return out;};}
const rows=[];
for(const size of [256,512])for(const kind of ['opaque-aligned','opaque-unaligned','constant-half','soft-sparse']){
 const source=image(64,(x,y)=>(((x*11)&255)<<16)|(((y*9)&255)<<8)|((x^y)*3&255));
 const mask=kind==='soft-sparse'?image(64,(x,y)=>Math.max(0,Math.min(255,Math.round((29-Math.hypot(x-31.5,y-31.5))*40)))<<16):pix((kind==='constant-half'?128:255)<<16);
 const count=32,poses=Array.from({length:count},(_,i)=>{const aligned=kind==='opaque-aligned';return [aligned?(i*64)%(size-63):(i*61+7)%(size+40)-20,aligned?(Math.floor(i/4)*64)%(size-63):(i*37+11)%(size+40)-20,255];});
 const r=compare(stamps(Previous,size,source,mask,poses),stamps(Current,size,source,mask,poses),(a,b)=>equalPixels(flat(a,size),flat(b,size),kind));
 rows.push({kind,size,count,...r});
}
const plans=[];
for(const density of ['sparse','overlapping','mapped']){
 const size=512,depth=9n,source=image(32,(x,y)=>((x*8)<<16)|((y*8)<<8)|180),mask=image(32,(x,y)=>Math.max(0,Math.min(255,Math.round((15-Math.hypot(x-15.5,y-15.5))*70)))<<16);
 const commands=[];
 for(let i=0;i<64;i++){const x=density==='overlapping'?128+(i%8)*3:(i%8)*64+8,y=density==='overlapping'?128+Math.floor(i/8)*3:Math.floor(i/8)*64+8;
  commands.push(density==='mapped'?Commands.mapped(Affine.prepare({$:'Matrix',a:42,b:7,c:-6,d:42,tx:x,ty:y}),{$:'Texture',depth:5n,size:32,colors:source,mask},{$:'Linear'},220,box(0,0,size,size)):Commands.sprite(size,5n,32,coord(x),coord(y),source,mask,220,box(0,0,size,size)));}
 const cmds=list(commands),bg=pix(0x16202d),cutResults=[];
 const direct=()=>Commands.render(cmds,depth,size,0,0,bg);
 for(const cuts of [1n,2n,3n]){const ts=performance.now(),p=Plan.prepare(cuts,depth,size,cmds),prepare_ms=performance.now()-ts;
  const render=()=>Plan.render(p,0n,bg),r=compare(direct,render,(a,b)=>equalPixels(flat(a,size),flat(b,size),'plan '+density));
  const previous=render(),damage=list([box(0,0,64,64)]),dirty=()=>Plan.repaint(p,damage,bg,previous);
  const d=compare(render,dirty,(a,b)=>equalPixels(flat(a,size),flat(b,size),'damage '+density));
  cutResults.push({cuts:Number(cuts),prepare_ms,full:r,unchanged_scene_small_damage:d});}
 plans.push({density,size,count:commands.length,cutResults});
}
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
console.log(JSON.stringify({host:process.version,backend:'actual pinned Bend compiler emitted JavaScript; Node host; not native or GPU',repeats,warmups,method:'alternating order, median, all samples retained; compilation/setup/pixel readback excluded; immutable result allocation included; preparation separate; damage case unchanged scene recomposites one tile',baseline_source_sha256:sha(base+'/MaskedStamp.bend'),current_source_sha256:sha(new URL('../MaskedStamp.bend',import.meta.url)),rows,plans}));
