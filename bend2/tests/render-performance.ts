import assert from 'node:assert/strict';
import Scene from '../graphics/Scene.bend';
const nil = {$:'Nil'};
const board = Array.from({length:64}, (_, i) => i < 16 ? (i < 8 ? [4,2,3,5,6,3,2,4][i] : 7) : i >= 48 ? (i < 56 ? 15 : [12,10,11,13,14,11,10,12][i-56]) : 0).reduceRight((tail,head)=>({$:'Con',head,tail}),nil);
const position = {$:'Pos',board,holes:(1<<6)|(1<<10),side:true,rights:15,ep:64,epPawn:64,quiet:0n,full:1n};
const background = Scene.background();
const frames = Array.from({length:36},(_,i)=>({$:'Frame',position,previous:position,selected:64,hovered:64,targets:nil,tile:16,tileTargets:nil,lastAction:21760,progress:16,theme:i%2,shifts:nil,check:64,view:{$:'View',yaw:i*10,pitch:[35,65,90][i%3],zoom:[75,100,115][Math.floor(i/3)%3]}}));
function sample(image:any,x:number,y:number):number { for(let half=256;image.$==='Qua';half/=2){const right=x>=half,bottom=y>=half;image=image[bottom?(right?'br':'bl'):(right?'tr':'tl')];if(right)x-=half;if(bottom)y-=half;}return image.color; }
function center(square:number,v:any){const yaw=v.yaw*Math.PI/180,pitch=v.pitch*Math.PI/180,c=Math.cos(yaw),s=Math.sin(yaw),scale=45/(Math.abs(c)+Math.abs(s))*v.zoom/100,f=square%8-3.5,r=7-Math.floor(square/8)-3.5;return [Math.round(256+scale*(c*f-s*r)),Math.round(274+scale*Math.sin(pitch)*(s*f+c*r))];}
let checks=0;
for(const frame of frames){const ground=Scene.motion_ground(background,frame);for(let square=0;square<64;square++){const [x,y]=center(square,frame.view);const macro=Math.floor(square%8/2)+4*Math.floor(square/16),missing=!!(position.holes&(1<<macro));if(missing)assert.equal(sample(ground,x,y),sample(background,x,y));else assert.notEqual(sample(ground,x,y),sample(background,x,y));checks++;}}
// Retain the original run compositor as an independent pixel oracle for the
// grouped-row compositor, including transparent pixels and odd/even alignment.
const {default: Sprites} = await import('../graphics/Sprites.bend');
for (const code of [1,2,3,4,5,6,7,9,10,11,12,13,14,15]) for (const offset of [0,1]) {
  const x=240+offset,y=260+offset,base={$:'Pix',color:0x123456};
  const kind=(code&7)===7?1:(code&7);
  const original=Sprites['draw.rows'](Sprites.rows(kind),0,code,x-12,y-32,0,base);
  const current=Sprites.draw(code,x,y,base);
  for(let yy=y-33;yy<y+5;yy++)for(let xx=x-13;xx<x+13;xx++){
    assert.equal(sample(current,xx,yy),sample(original,xx,yy),`Sprite compositor ${code}/${offset}/${xx}/${yy}`); checks++;
  }
}
if(process.env.RENDER_QUICK){
  const methods:any={groupedRows:()=>Sprites.draw(6,241,261,background),rows:()=>Sprites['draw.rows'](Sprites.rows(6),0,6,229,229,0,background),pieces:()=>Scene.pieces_on(background,frames[1]),feedback:()=>Scene.feedback_on(background,frames[1]),motion:()=>Scene.render_on(true,background,frames[1])};
  for(const [name,fn] of Object.entries(methods)){const times=[];for(let i=0;i<50;i++){const t=performance.now();(fn as any)();if(i>9)times.push(performance.now()-t);}times.sort((a,b)=>a-b);console.log(name,times[20],times[38]);}
  console.log({checks});process.exit(0);
}
const methods={baselineGround:(f:any)=>Scene.ground_on(background,f),motionGround:(f:any)=>Scene.motion_ground(background,f),settledFrame:(f:any)=>Scene.render_on(false,background,f),motionFrame:(f:any)=>Scene.render_on(true,background,f)};
const result:any={checks,frames:frames.length,scope:'Warm compiled Bend JavaScript under pinned Bun; CPU only, not browser presentation or native parallel benchmark'};
for(const [name,fn] of Object.entries(methods)){for(const f of frames.slice(0,12))fn(f);const times=[];for(let round=0;round<2;round++)for(const f of frames){const t=performance.now();const image=fn(f);times.push(performance.now()-t);assert.ok(image.$==='Qua');}times.sort((a,b)=>a-b);result[name]={medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.floor(times.length*.95)],samples:times.length};}
result.motionBudgetMet = result.motionFrame.medianMs <= 20 && result.motionFrame.p95Ms <= 40;
console.log(JSON.stringify(result,null,2));
// An opt-in performance gate permits reproducing the requested host budget;
// the default always reports misses without making pixel checks load-sensitive.
if (process.env.RENDER_BUDGET_STRICT) assert.ok(result.motionBudgetMet,'Motion target median<=20ms and p95<=40ms');
