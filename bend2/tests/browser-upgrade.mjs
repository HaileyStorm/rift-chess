import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Two phases deliberately straddle publication, using an owned test profile.
const phase=process.argv[2];
assert.ok(['before','after'].includes(phase),'Usage: browser-upgrade.mjs before|after');
const profile=path.resolve(process.env.BEND_UPGRADE_PROFILE||'.artifacts/bend2/camera-upgrade-profile-20260922');
const out=path.resolve(process.env.BEND_UPGRADE_OUT||'.artifacts/bend2/whole-app-upgrade');
await fs.mkdir(out,{recursive:true});
const url=process.env.BEND_TEST_URL||'https://haileystorm.github.io/rift-chess-bend2/';
const context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1280,height:1050}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
  const Original=Worker;
  window.Worker=class extends Original{constructor(...args){super(...args);this.addEventListener('message',e=>{
    if(e.data.kind==='frame'&&e.data.image)window.__shown=e.data.presentation;
    if(e.data.kind==='fault')window.__fault=e.data.message;
  });}};
});
const saved=()=>page.evaluate(()=>localStorage.getItem('rift-bend-lab/save-v1'));
async function ready(){await page.waitForFunction(()=>window.__fault||window.__shown&&document.querySelector('canvas')?.getAttribute('aria-busy')==='false',null,{timeout:90000});assert.equal(await page.evaluate(()=>window.__fault),undefined);}
async function control(id){
  const button=page.locator(`[data-control="${id}"]`);assert.equal(await button.isDisabled(),false);
  const r=JSON.parse(await button.getAttribute('data-rect'));
  const box=await page.locator('canvas').boundingBox();const size=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));
  await page.mouse.click(box.x+(r.x+r.width/2)*box.width/size.width,box.y+(r.y+r.height/2)*box.height/size.height);
  await ready();
  if(id===3){await page.waitForFunction(()=>window.__shown.menu===8);await control(48);}
}
try{
  await page.goto(url,{waitUntil:'networkidle'});
  if(phase==='before'){
    const record=await saved();assert.ok(record,'Returning profile must contain an existing save');
    const build=await page.evaluate(async()=>await(await fetch(`./build.json?upgrade=${Date.now()}`)).json());
    await fs.writeFile(path.join(out,'before.json'),JSON.stringify({at:new Date().toISOString(),url,profile,build:build.version,saved:record},null,2),{flag:'wx'});
    await page.screenshot({path:path.join(out,'before.png')});
  }else{
    const before=JSON.parse(await fs.readFile(path.join(out,'before.json'),'utf8'));
    await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r?.update();});
    await page.reload({waitUntil:'networkidle'});await ready();
    assert.equal(await saved(),before.saved,'Update preserves exact saved bytes');
    const build=await page.evaluate(async()=>await(await fetch(`./build.json?upgrade=${Date.now()}`)).json());
    assert.equal(build.schema,'rift-bend-browser/2');assert.notEqual(build.version,before.build);
    const oldCount=JSON.parse(before.saved).commands.length;
    await control(3);await page.waitForFunction(n=>JSON.parse(localStorage.getItem('rift-bend-lab/save-v1')).commands.length===n,oldCount+1);
    const restored=await saved();
    await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await ready();
    assert.equal(await saved(),restored,'Cold offline reload preserves accepted Undo');
    await control(2);await page.waitForFunction(()=>window.__shown.menu===1);await control(29);
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rift-bend-lab/save-v1')).commands.length===0);
    await page.screenshot({path:path.join(out,'after-offline.png')});
    assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(out,'after.json'),JSON.stringify({at:new Date().toISOString(),url,beforeVersion:before.build,afterVersion:build.version,checks:['Exact old saved record survives upgrade','Real canvas Undo accepts the resumed history','Cold offline reload preserves Undo and accepts New Match'],errors},null,2),{flag:'wx'});
  }
  console.log(JSON.stringify({ok:true,phase,out}));
}finally{await context.close();}
