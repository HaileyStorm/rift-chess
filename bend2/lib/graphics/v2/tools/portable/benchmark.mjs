// NON-AUTHORITATIVE serial source-subset benchmark, never a Bend/native receipt.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const manifest=JSON.parse(readFileSync(process.argv[2],'utf8'));
const load=async name=>import(pathToFileURL(manifest.modules[name]).href);
const oldSprite=await load('sprite_before'),sprite=await load('sprite_after');
const oldTexture=await load('texture_before'),texture=await load('texture_after');
const maskModule=await load('mask');
const p=color=>({$:'Pix',color}),coord=n=>n<0?{$:'Neg',magnitude:-n}:{$:'Pos',value:n};
function quad(tl,tr,bl,br,compact=true){if(compact&&[tl,tr,bl,br].every(v=>v.$==='Pix'&&v.color===tl.color))return tl;return {$:'Qua',tl,tr,bl,br};}
function build(side,fn,compact=true,x=0,y=0){if(side===1)return p(fn(x,y));let h=side/2;return quad(build(h,fn,compact,x,y),build(h,fn,compact,x+h,y),build(h,fn,compact,x,y+h),build(h,fn,compact,x+h,y+h),compact);}
function raster(image,size){const bytes=Buffer.alloc(size*size*4);function visit(i,x,y,s){if(i.$==='Pix'){for(let yy=y;yy<y+s;yy++)for(let xx=x;xx<x+s;xx++)bytes.writeUInt32LE(i.color>>>0,(yy*size+xx)*4);return;}let h=s/2;visit(i.tl,x,y,h);visit(i.tr,x+h,y,h);visit(i.bl,x,y+h,h);visit(i.br,x+h,y+h,h);}visit(image,0,0,size);return bytes;}
function hash(i,s){return createHash('sha256').update(raster(i,s)).digest('hex');}
function nodes(i){return i.$==='Pix'?1:1+nodes(i.tl)+nodes(i.tr)+nodes(i.bl)+nodes(i.br);}
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
let parityPixels=0;
function measure(name,size,draw,before,after){
  // Warmups are excluded, complete output equality is not inferred from timings.
  for(let n=0;n<2;n++){draw(before.default);draw(after.default);}
  const timings={before:[],after:[]};let a,b;
  for(let n=0;n<5;n++)for(const k of n%2?['after','before']:['before','after']){
    if(global.gc)global.gc();const t=performance.now(),out=draw((k==='before'?before:after).default);
    timings[k].push(performance.now()-t);if(k==='before')a=out;else b=out;
  }
  assert.deepEqual(raster(a,size),raster(b,size),name+' full-raster before/after');parityPixels+=size*size;
  const counts={};for(const [key,mod] of [['before',before],['after',after]]){const c=mod.counters(true);draw(mod.default);counts[key]={...c};mod.counters(false);}
  const blit=[];for(let n=0;n<5;n++){const t=performance.now();raster(b,size);blit.push(performance.now()-t);}
  return {name,size,samples_ms:timings,median_ms:{before:median(timings.before),after:median(timings.after)},
    source_subset_ratio_before_over_after:median(timings.before)/median(timings.after),
    serial_rgba_packing_ms:blit,full_raster_sha256:hash(b,size),output_tree_nodes:{before:nodes(a),after:nodes(b)},calls:counts};
}
const cases=[],preparation=[];
for(const side of [32,64]){
 const size=side*16,sd=BigInt(Math.log2(side)),d=BigInt(Math.log2(size));
 const colors=build(side,(x,y)=>(x*5713+y*8191)&0xffffff,false);
 const raw=build(side,(x,y)=>{let a=Math.min(255,Math.max(0,Math.round((side*.36-Math.hypot(x+.5-side/2,y+.5-side/2))*255)));return (a<<16)|((x*241+y*77)&65535);},false);
 const prep=[];let prepared;for(let i=0;i<5;i++){let t=performance.now();prepared=maskModule.default.prepare(sd,raw);prep.push(performance.now()-t);}
 preparation.push({side,source_nodes:nodes(colors),raw_mask_nodes:nodes(raw),prepared_mask_nodes:nodes(prepared),samples_ms:prep,source_subset_only:true});
 for(const [kind,mask] of [['opaque',p(0xff0000)],['soft-raw',raw],['soft-prepared',prepared]])for(const offset of [0,3]){
   const draw=mod=>{let out=p(0x123456);for(let j=0;j<32;j++)out=mod.draw(d,size,sd,side,coord(j%8*side*2+offset),coord(Math.floor(j/8)*side*2+offset),colors,mask,255,out);return out;};
   cases.push(measure(`32 sprites / ${kind} / offset ${offset}`,size,draw,oldSprite,sprite));
 }
}
// Same two sources and exact F32 operations on every live sample; no tie exclusions.
const source=build(256,(x,y)=>(((x*13+y*5)&255)<<16)|(((x*7+y*11)&255)<<8)|((x*3+y*17)&255),false);
for(const size of [512,1024]){
 const scale=size/1024,d=BigInt(Math.log2(size)),point=(x,y)=>({$:'Point',x:x*scale,y:y*scale});
 const quads=[];
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   let x=220+col*92+row*13,y=320+row*72-col*17;quads.push([point(x,y),point(x+82,y-12),point(x+10,y+59)]);
 }
 const draw=mod=>{let out=p(0x15263a);for(const q of quads)out=mod.draw(d,size,...q,8n,256,source,255,out);return out;};
 cases.push(measure('12 affine textured parallelograms',size,draw,oldTexture,texture));
}
const out={scope:'NON-AUTHORITATIVE source-subset JS A/B, same assertions and full pixels; NOT emitted-by-Bend, native, multicore, GPU, browser, or total input-to-paint timings.',
 node:process.version,platform:process.platform,arch:process.arch,gc_before_each_sample:!!global.gc,warmups:2,samples:5,order:'alternating before/after',
 timing_excludes:'Asset decode, source tree construction, mask preparation, packing/blit, browser, and instrumentation. Packing and preparation measured separately.',
 full_pixel_parity_checks:parityPixels,preparation,cases};
writeFileSync(process.argv[3],JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,cases:cases.length,full_pixel_parity_checks:parityPixels,scope:out.scope}));
