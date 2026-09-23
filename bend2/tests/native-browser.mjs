import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const out = path.resolve('.artifacts/bend2/native-ui', process.env.BEND_PLAYTEST_RUN || new Date().toISOString().replace(/[:.]/g, '-'));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1050 } });
const page = await context.newPage();
const receipt = { at: new Date().toISOString(), url: process.env.BEND_TEST_URL || 'http://127.0.0.1:4184/', checks: [], errors: [], captures: [], metrics: {} };
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', event => { if (event.type() === 'error') receipt.errors.push(event.text()); });
await page.addInitScript(() => {
  const readStorage = Storage.prototype.getItem;
  Storage.prototype.getItem = function(key) {
    if(this === localStorage && sessionStorage.getItem('bend-test-read-fault') === key) {
      sessionStorage.removeItem('bend-test-read-fault');
      throw new DOMException('Injected one-shot read failure','SecurityError');
    }
    return Reflect.apply(readStorage,this,[key]);
  };
  const Native = window.Worker;
  window.__frames = [];
  window.__sounds = [];
  window.__motionShots = [];
  window.__audioStarts = 0;
  const startSound = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function(...args) { window.__audioStarts++; return Reflect.apply(startSound,this,args); };
  window.Worker = class extends Native {
    requests = new Map();
    dragging = false;
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const m = event.data;
        if (m.kind === 'fault') window.__fault = m.message;
        if (m.kind === 'frame') {
          for(const e of m.effects) if(e.$==='Sound') {
            const pcm=new Float32Array(e.samples);
            window.__sounds.push({samples:pcm.length,peak:Math.max(...pcm.map(Math.abs)),finite:pcm.every(Number.isFinite)});
          }
          window.__reply = { id: m.id, after: m.after, renderMs: m.renderMs };
          if (m.image) {
            window.__shown = m.presentation;
            const request=this.requests.get(m.id);
            window.__frames.push({ at: performance.now(), ms: m.renderMs, portMs: m.portMs, view: m.presentation.view,
              cameraMotion:request?.cameraMotion||false, replyLatencyMs:request?performance.now()-request.at:null });
            if(window.__captureMotion && m.after>0) requestAnimationFrame(()=>window.__motionShots.push(document.querySelector('canvas').toDataURL()));
          }
        }
      });
    }
    postMessage(message,...args) {
      let cameraMotion=false;
      for(const e of message.events||[]) {
        if(e.$==='PointerDown'&&(e.button===2||e.alt))this.dragging=true;
        if(e.$==='PointerMove'&&this.dragging)cameraMotion=true;
        if(e.$==='PointerUp')cameraMotion=false,this.dragging=false;
      }
      this.requests.set(message.id,{at:performance.now(),cameraMotion});
      super.postMessage(message,...args);
    }
  };
});
async function ready() {
  await page.waitForFunction(() => window.__fault || document.querySelector('canvas')?.dataset.ready === 'true' && document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' && window.__shown && window.__reply.after === 0, null, { timeout: 60000 });
  const fault = await page.evaluate(() => window.__fault); if(fault) throw new Error(fault);
}
async function change(action) {
  const id = await page.evaluate(() => window.__reply?.id || 0);
  await action();
  await page.waitForFunction(id => window.__reply?.id > id, id, { timeout: 60000 });
  await ready();
}
async function capture(name) {
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
  receipt.captures.push(name);
}
async function canvasPoint(x,y) {
  const b = await page.locator('canvas').boundingBox();
  const size = await page.locator('canvas').evaluate(c => ({w:c.width,h:c.height}));
  return { x:b.x+x*b.width/size.w, y:b.y+y*b.height/size.h };
}
async function control(id,settle=true,agreeUndo=true) {
  const button = page.locator(`[data-control="${id}"]`);
  assert.equal(await button.isDisabled(),false,`control ${id} enabled`);
  const r = JSON.parse(await button.getAttribute('data-rect'));
  const p = await canvasPoint(r.x+r.width/2,r.y+r.height/2);
  if(settle) await change(() => page.mouse.click(p.x,p.y));
  else await page.mouse.click(p.x,p.y);
  if(settle && id===3 && agreeUndo && await page.evaluate(()=>window.__shown.menu)===8) await control(48);
}
async function square(file,rank,piece=false) {
  const shown = await page.evaluate(() => window.__shown), v=shown.view, a=v.yaw*Math.PI/180;
  const scale=45/(Math.abs(Math.cos(a))+Math.abs(Math.sin(a)))*v.zoom/100;
  const u=file-3.5, r=3.5-rank;
  const x=256+scale*(Math.cos(a)*u-Math.sin(a)*r);
  const y=(shown.mobile?64:128)+274+scale*Math.sin(v.pitch*Math.PI/180)*(Math.sin(a)*u+Math.cos(a)*r)-(piece?8:0);
  const p=await canvasPoint(x,y);
  await change(() => page.mouse.click(p.x,p.y));
}
async function record() { return page.evaluate(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1'))); }
async function count(n) {
  await page.waitForFunction(n => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1')||'{}').commands?.length===n,n,{timeout:60000}); await ready();
}
const fixtureIds=[2680,15845,7845,18440,10765,17835,13365,15235];
const fixtureRecord=n=>({schema:'rift-bend-record/1',layout:'B',policy:0,commands:fixtureIds.slice(0,n).map((action,expected)=>({$:'MoveCommand',expected,action}))});
async function upload(value) {
  if(await page.evaluate(()=>window.__shown.menu)!==2) await control(1);
  const chooser = page.waitForEvent('filechooser');
  await control(21,false);
  const fileChooser=await chooser;
  const before=await page.evaluate(()=>window.__reply.id);
  await fileChooser.setFiles({name:'scenario.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
  await page.waitForFunction(before=>window.__reply.id>before,before,{timeout:60000});
}
try {
  await page.goto(receipt.url,{waitUntil:'networkidle'}); await ready(); await capture('01-desktop');
  if (process.env.BEND_CAPTURE_ONLY !== '1') {
    await square(6,0,true); await capture('02-selected-knight');
    assert.ok(await page.locator('[data-control="4"]').isEnabled());
    await square(6,0,true); assert.ok(await page.locator('[data-control="4"]').isDisabled());
    receipt.checks.push('Real canvas second click deselects the same piece');
    await square(0,2); assert.ok(await page.locator('[data-control="4"]').isEnabled());
    await square(1,2); assert.ok(await page.locator('[data-control="4"]').isDisabled());
    receipt.checks.push('Real canvas click on another square of selected platform deselects it');
    await square(6,0,true); await square(5,2); await count(1);
    await square(6,7,true); await square(5,5); await count(2);
    await capture('03-both-sides-moved');
    await control(3,true,false);assert.equal(await page.evaluate(()=>window.__shown.menu),8);
    assert.equal((await record()).commands.length,2);await capture('20-undo-request');
    await control(28);assert.equal((await record()).commands.length,2);
    await control(3); await count(3);
    receipt.checks.push('Hotseat Undo requests the other player agreement; Cancel is inert and Agree commits Undo');
    receipt.checks.push('Rendered white/black knight moves and Undo persist accepted commands');
    const before = await page.evaluate(() => ({view:window.__shown.view,index:window.__frames.length}));
    const p=await canvasPoint(265,345); await page.mouse.move(p.x,p.y); await page.mouse.down({button:'right'});
    for(let i=1;i<=30;i++){await page.mouse.move(p.x+i*3,p.y+i*2);await page.waitForTimeout(16);}
    await page.mouse.up({button:'right'}); await ready();
    const drag = await page.evaluate(index => ({view:window.__shown.view,frames:window.__frames.slice(index)}),before.index);
    assert.ok(drag.view.yaw>180 && drag.view.yaw<360,'right drag decreases yaw');
    assert.ok(drag.view.pitch>before.view.pitch,'downward drag increases pitch');
    assert.ok(drag.frames.length>=3,'continuous drag presents intermediate images');
    const motionFrames=drag.frames.filter(f=>f.cameraMotion);
    const ms=motionFrames.map(f=>f.ms).sort((a,b)=>a-b);
    const latency=motionFrames.map(f=>f.replyLatencyMs).sort((a,b)=>a-b);
    assert.ok(ms.length>=3,'multiple camera-motion frames arrive before release');
    receipt.metrics.drag={frames:ms.length,medianMs:ms[Math.floor(ms.length/2)],p95Ms:ms[Math.floor(ms.length*.95)],view:drag.view,
      medianReplyMs:latency[Math.floor(latency.length/2)],p95ReplyMs:latency[Math.floor(latency.length*.95)],
      samples:motionFrames.map(f=>({renderMs:f.ms,portMs:f.portMs,replyLatencyMs:f.replyLatencyMs})),scope:'Whole browser app camera-motion replies, excluding initial hover and settled release; renderMs is Bend computation, replyLatencyMs includes pixel transport'};
    await capture('04-dragged');
    await control(19);
    await page.keyboard.down('Alt');await page.mouse.move(p.x,p.y);await page.mouse.down();
    await page.mouse.move(p.x+40,p.y+30,{steps:8});await page.mouse.up();await page.keyboard.up('Alt');await ready();
    const altView=await page.evaluate(()=>window.__shown.view);
    assert.ok(altView.yaw>180&&altView.yaw<360&&altView.pitch>65,'Alt-left drag uses the same intuitive axes');
    await control(19); await control(1); await capture('05-settings');
    await control(23); await capture('06-warm-settings'); await control(28);
    await control(27); await capture('07-help'); await control(28);
    await control(2); await capture('08-new-match'); await control(28);
    const saved=await record(); await page.reload({waitUntil:'networkidle'});await ready();assert.deepEqual(await record(),saved);
    receipt.checks.push('Bend menus render and real canvas controls work; save survives reload');
    if(process.env.BEND_EXTENDED==='1') {
      const stableRecord=await record();
      await upload(' '.repeat(2097153));await ready();
      assert.deepEqual(await record(),stableRecord);assert.match(await page.locator('canvas').getAttribute('aria-label'),/2 MiB/);
      await capture('16-oversize-preserved');
      const amplified={...fixtureRecord(0),commands:Array.from({length:20},(_,expected)=>expected%2===0?{$:'MoveCommand',expected,action:2680}:{$:'UndoCommand',expected})};
      await upload(amplified);
      await page.waitForFunction(()=>document.querySelector('canvas').getAttribute('aria-label').includes('Validating record'));
      await capture('17-validating');
      await control(2,false);await page.waitForFunction(()=>window.__shown.menu===1&&window.__reply.after===0);await ready();
      assert.deepEqual(await record(),stableRecord);await control(28);
      await upload(amplified);await upload(fixtureRecord(0));await count(0);
      receipt.checks.push('Oversized input preserves game; long valid Move/Undo replay shows progress and New Match cancels immediately');
      receipt.checks.push('A second Import replaces pending validation through the actual file chooser');
      await upload(fixtureRecord(2)); await count(2);
      await square(0,3,true); await page.evaluate(()=>{window.__captureMotion=true;window.__motionShots=[];});
      await square(1,4); await count(3);
      const motion=await page.evaluate(()=>{window.__captureMotion=false;return window.__motionShots;});
      assert.ok(new Set(motion).size>=2,'capture presents distinct animation frames');
      for(const [index,frame] of motion.entries()) await fs.writeFile(path.join(out,`capture-motion-${index}.png`),Buffer.from(frame.split(',')[1],'base64'));
      assert.equal((await record()).commands.at(-1).action,7845); await capture('11-capture');
      await upload(fixtureRecord(8)); await count(8);
      await square(1,6,true); await square(1,7);
      assert.equal(await page.evaluate(()=>window.__shown.menu),4); await capture('12-promotion');
      await control(41); await count(9); assert.equal((await record()).commands.at(-1).action,15969);
      receipt.checks.push('Imported legal play reaches rendered capture and explicit knight underpromotion');
      await upload(fixtureRecord(2)); await count(2); await control(6); await capture('21-actor-chooser');
      await control(50); await count(3);
      assert.deepEqual((await record()).commands.at(-1),{$:'OfferCommand',expected:2,side:false});
      await control(8); await count(4);
      assert.deepEqual((await record()).commands.at(-1),{$:'AcceptCommand',expected:3,side:true});
      await upload(fixtureRecord(2)); await count(2); await control(7); await control(52); await control(42); await count(3);
      assert.deepEqual((await record()).commands.at(-1),{$:'ResignCommand',expected:2,side:false});
      receipt.checks.push('Rendered actor choices allow off-turn Black offer and resignation with White acceptance');
      await upload(fixtureRecord(2)); await count(2); await control(6); await control(49); await count(3); await control(8); await count(4);
      assert.match(await page.locator('canvas').getAttribute('aria-label'),/DRAW AGREED/);
      await control(3); await count(5); await control(7); await control(51); await control(42); await count(6);
      assert.match(await page.locator('canvas').getAttribute('aria-label'),/RESIGNED/);
      await control(3); await count(7); receipt.checks.push('Draw, resignation and Undo restore correct terminal/nonterminal state');
      await control(2); await control(32); await control(29); await count(1);
      await control(3); await count(2); await page.reload({waitUntil:'networkidle'}); await count(2);
      assert.ok(await page.locator('[data-control="10"]').isEnabled());
      await control(10); await count(3); receipt.checks.push('Human Black starts with a Bend bot move; Undo pause persists and Resume works');
      await upload(fixtureRecord(0)); await count(0);
      await square(0,2); const dest=await page.locator('[data-control]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.control)).find(id=>id>=21480));
      assert.ok(dest,'empty platform offers a Shift destination'); await control(dest); await count(1);
      assert.ok((await record()).commands[0].action>=20480); await capture('13-shift');
      receipt.checks.push('Rendered empty-platform Shift changes topology and persists');
      const audio=await page.evaluate(()=>({sounds:window.__sounds,starts:window.__audioStarts}));
      assert.ok(audio.starts>0);assert.ok(audio.sounds.every(s=>s.finite&&s.samples>0&&s.peak>0&&s.peak<=1));
      receipt.metrics.audio=audio;receipt.checks.push('Bend-generated finite bounded PCM reaches actual Web Audio playback');
      await upload('{broken'); await page.waitForFunction(()=>window.__shown.menu===6); await ready();
      assert.equal(await page.evaluate(()=>localStorage.getItem('rift-bend-lab/recovery-v1')),'{broken');await capture('14-recovery');
      await control(2);await control(29);await count(0);
      await page.evaluate(()=>localStorage.setItem('rift-bend-lab/save-v1','{bad-save'));
      await page.reload({waitUntil:'networkidle'});await ready();
      assert.equal(await page.evaluate(()=>window.__shown.menu),6);
      assert.equal(await page.evaluate(()=>localStorage.getItem('rift-bend-lab/save-v1')),'{bad-save');
      await control(2);await control(29);await count(0);
      receipt.checks.push('Malformed import and saved record preserved until explicit new match');
      await upload(fixtureRecord(2));await count(2);const protectedRecord=await record();
      await page.evaluate(()=>sessionStorage.setItem('bend-test-read-fault','rift-bend-lab/save-v1'));
      await page.reload({waitUntil:'networkidle'});await ready();
      assert.equal(await page.evaluate(()=>window.__shown.menu),6);
      assert.deepEqual(await record(),protectedRecord,'transient read failure must not overwrite an unseen save');
      assert.match(await page.locator('canvas').getAttribute('aria-label'),/Cannot read saved data/);
      await page.reload({waitUntil:'networkidle'});await count(2);
      await page.evaluate(()=>sessionStorage.setItem('bend-test-read-fault','rift-bend-lab/preferences-v1'));
      await page.reload({waitUntil:'networkidle'});await count(2);
      assert.deepEqual(await record(),protectedRecord);
      assert.match(await page.locator('canvas').getAttribute('aria-label'),/Preferences could not be read/);
      receipt.checks.push('Transient storage read failure preserves unseen save; preference read failure keeps match and visible fallback warning');
      await control(2);await control(29);await count(0);
      await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
      await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
      await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await count(0);
      await square(6,0,true);await square(5,2);await count(1);await capture('15-offline');
      await context.setOffline(false);receipt.checks.push('Cold offline reload and real canvas move succeed');
    }
  }
  await page.setViewportSize({width:390,height:844}); await ready();
  await page.waitForFunction(()=>window.__shown.mobile); await capture('09-mobile');
  await control(1); await capture('10-mobile-settings');
  if(process.env.BEND_EXTENDED==='1') {
    const queenRecord={...fixtureRecord(0),commands:[3980,15560,1155,15885].map((action,expected)=>({$:'MoveCommand',expected,action}))};
    await upload(queenRecord);await count(4);
    // Destination overlays and their pane list are off by default (rules §10).
    if(await page.evaluate(()=>window.__shown.menu)!==2) await control(1);
    await control(53);await control(28);await square(7,4,true);
    assert.ok(await page.locator('[data-control="47"]').isEnabled());await capture('18-mobile-queen');
    await control(47);assert.equal(await page.evaluate(()=>window.__shown.menu),7);
    const moveControls=await page.locator('[data-control]').evaluateAll(nodes=>nodes.filter(n=>Number(n.dataset.control)>=1000).map(n=>({id:Number(n.dataset.control),rect:JSON.parse(n.dataset.rect)})));
    assert.ok(moveControls.length>6);
    assert.ok(moveControls.every(c=>c.rect.x>=0&&c.rect.y>=0&&c.rect.x+c.rect.width<=512&&c.rect.y+c.rect.height<=1024));
    await capture('19-mobile-all-moves');await control(moveControls[0].id);await count(5);
    receipt.checks.push('Reachable mobile queen position exposes every destination through bounded MOVES panel and accepts a chosen move');
  }
  assert.deepEqual(receipt.errors,[]);
  receipt.ok=true;
} catch(error) {receipt.ok=false;receipt.failure=String(error.stack||error);await capture('FAIL');throw error;}
finally { await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({out,...receipt}));await browser.close();}
