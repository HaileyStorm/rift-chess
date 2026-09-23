import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const run=process.env.BEND_RENDER_PROFILE_RUN||'baseline';
const out=path.resolve('.artifacts/bend2/renderer-profile',run);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
const page=await browser.newPage();
await page.route('**/renderer-profile.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local Bend renderer CPU probe</title>'}));
await page.goto('http://127.0.0.1:4184/renderer-profile.html');
await page.evaluate(async()=>{
 const {default:P}=await import('/renderer-probe.js?'+Date.now());
 const list=xs=>xs.reduceRight((tail,head)=>({$:'Con',head,tail}),{$:'Nil'});
 const boot=P.boot(); const down=P.dispatch(list([{$:'PointerDown',x:250,y:250,button:2,alt:false}]),boot.session);
 const events=list([{$:'PointerMove',x:290,y:290}]); const u=P.update(events,down.session.program), snap=P.snapshot(u.state);
 const ground=P.ground(down.session.background,snap.frame),board=P.scene(down.session.background,snap.frame);
 window.probe={P,list,down,events,snap,ground,board};
});
const stats=await page.evaluate(()=>{
 const{P,down,events,snap,ground,board}=window.probe;
 const steady=P.dispatch(events,down.session).session;
 const cases={programUpdate:()=>P.update(events,down.session.program),ground:()=>P.ground(down.session.background,snap.frame),pieces:()=>P.pieces(ground,snap.frame),scene:()=>P.scene(down.session.background,snap.frame),compose:()=>P.compose(snap,board,down.session.chrome),firstStyleDispatch:()=>P.dispatch(events,down.session),dispatch:()=>P.dispatch(events,steady)};
 const result={};for(const[name,fn]of Object.entries(cases)){const times=[];for(let i=0;i<28;i++){const t=performance.now();fn();if(i>=8)times.push(performance.now()-t);}times.sort((a,b)=>a-b);result[name]={medianMs:times[10],p95Ms:times[19]};}return result;
});
const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100});await cdp.send('Profiler.start');
const drag=await page.evaluate(()=>{
 const{P,list,down}=window.probe;let session=down.session;const times=[],hashes=[],images=[];
 const hash=image=>{const pixels=new Uint32Array(512*512);const paint=(n,x,y,size)=>{if(n.$==='Pix'){for(let row=y;row<y+size;row++)pixels.fill(n.color,row*512+x,row*512+x+size);}else{const h=size/2;paint(n.tl,x,y,h);paint(n.tr,x+h,y,h);paint(n.bl,x,y+h,h);paint(n.br,x+h,y+h,h);}};paint(image,0,0,512);let value=2166136261;for(const c of pixels)value=Math.imul(value^c,16777619)>>>0;return value;};
 for(let i=0;i<30;i++){const t=performance.now();const p=P.dispatch(list([{$:'PointerMove',x:260+i*4,y:260+i}]),session);times.push(performance.now()-t);session=p.session;if(i%5===0){const snap=P.snapshot(session.program);images.push(P.scene(session.background,snap.frame));}}
 for(const image of images)hashes.push(hash(image));
 times.sort((a,b)=>a-b);return {medianMs:times[15],p95Ms:times[28],frames:times.length,hashes};
});
const{profile}=await cdp.send('Profiler.stop');const top=profile.nodes.filter(n=>n.hitCount).sort((a,b)=>b.hitCount-a.hitCount).slice(0,25).map(n=>({name:n.callFrame.functionName,hits:n.hitCount,line:n.callFrame.lineNumber+1}));
const receipt={at:new Date().toISOString(),scope:'Actual installed Chrome CPU probe; compiled Bend, real application drag state, no browser compositor or end-user latency acceptance',stats,drag,top};
await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));await fs.writeFile(path.join(out,'cpu.cpuprofile'),JSON.stringify(profile));console.log(JSON.stringify(receipt,null,2));
}finally{await browser.close();}
