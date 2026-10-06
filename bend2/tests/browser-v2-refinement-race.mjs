// Force an input between the sprite refinement's worker message and the host
// listener. The host must defer the Bend image and present it once input drains.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const changeView = process.env.BEND_RACE_VIEW === '1';
const changeControls = process.env.BEND_RACE_CONTROL === '1';
const atlasRace = process.env.BEND_RACE_ATLAS === '1';
const atlasPressure = process.env.BEND_RACE_ATLAS_PRESSURE === '1';
assert.ok(!atlasPressure || atlasRace, 'retention boundaries require the actual atlas race');
assert.ok(!atlasRace || (!changeView && !changeControls), 'one race mode');
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(({ changeView, changeControls, atlasRace }) => {
  const NativeWorker = window.Worker;
  let receiving = null;
  if (atlasRace) {
    window.__atlasRace = { requests: [], replies: [], retirements: [], order: 0 };
    const metadata = message => ({ ...structuredClone(message.presentation),
      atlasPick: message.atlasPick, atlasMaskId: message.atlasMaskId,
      atlasMaskOffer: message.atlasMaskOffer });
    for (const name of ['drawImage', 'putImageData']) {
      const original = CanvasRenderingContext2D.prototype[name];
      CanvasRenderingContext2D.prototype[name] = function (...args) {
        const result = original.apply(this, args);
        if (receiving && this.canvas === document.querySelector('canvas')) {
          window.__atlasRace.shown = metadata(receiving);
          window.__atlasRace.shownSummary = receiving.summary;
        }
        return result;
      };
    }
    window.__atlasMetadata = metadata;
  }

  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (atlasRace) {
          const s = window.__atlasRace, message = event.data;
          window.__gameWorker = this;
          const order = ++s.order;
          if (message.kind === 'fault') s.fault = message.message;
          if (message.kind === 'frame' || message.kind === 'refinement') {
            s.replies.push({ order, kind: message.kind, id: message.id,
              shown: window.__atlasMetadata(message), summary: message.summary });
            if (s.holdReturnView && !s.releasingReturn && message.kind === 'frame' &&
                message.image && message.atlasPick &&
                JSON.stringify(message.presentation.view) === JSON.stringify(s.holdReturnView)) {
              event.stopImmediatePropagation();
              if (s.heldReturn) s.fault = 'Duplicate held same-mask return';
              s.heldReturn = message;
              return;
            }
            if (!s.releasingOrbitStart && message.kind === 'frame' && message.id === s.orbitStartRequest) {
              event.stopImmediatePropagation();
              if (s.heldOrbitStart) s.fault = 'Duplicate held orbit-start acknowledgment';
              s.heldOrbitStart = message;
              return;
            }
            if (!s.releasing && message.kind === 'frame' && message.id === s.bRequest) {
              event.stopImmediatePropagation();
              if (s.heldB) s.fault = 'Duplicate held B frame';
              s.heldB = message;
              return;
            }
            if (message.kind === 'refinement' && s.heldB && message.atlasPick &&
                JSON.stringify(message.presentation.view) !== JSON.stringify(s.a.view))
              s.bRefinement = { order, shown: window.__atlasMetadata(message) };
            receiving = message;
            // Keep the marker through the host listener; browser microtasks
            // can run between callbacks of a genuine MessageEvent.
            setTimeout(() => { if (receiving === message) receiving = null; }, 0);
          }
          return;
        }

        if (event.data.kind === 'frame') {
          window.__latestView = event.data.presentation.view;
          window.__replyId = event.data.id;
          if (changeControls && event.data.image && event.data.presentation.menu === 5 &&
              event.data.controls.some(control => control.id === 42 && !control.enabled))
            window.__resignPageZero = structuredClone(event.data);
        }
        if (changeControls) { window.__gameWorker = this; return; }
        if (event.data.kind !== 'refinement' || window.__forcedRefinementRace) return;
        window.__forcedRefinementRace = true;
        const canvas = document.querySelector('canvas');
        if (changeView) {
          canvas?.focus();
          canvas?.dispatchEvent(new WheelEvent('wheel', {
            bubbles: true, cancelable: true, clientX: 100, clientY: 100, deltaY: -120,
          }));
        } else {
          canvas?.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true, isPrimary: true, clientX: 100, clientY: 100,
          }));
        }
      });
    }

    postMessage(message, ...args) {
      if (atlasRace) {
        const s = window.__atlasRace, order = ++s.order;
        if (message.kind === 'events') {
          s.requests.push({ order, ...structuredClone(message) });
          if (s.holdOrbitStart && message.events.some(event => event.$.endsWith('PointerDown') && event.button === 2)) {
            s.holdOrbitStart = false;
            s.orbitStartRequest = message.id;
          }
          if (s.armB && message.events.some(event => event.$.endsWith('PointerMove'))) {
            if (!message.events.some(event => event.$.endsWith('PointerUp') && event.button === 2))
              s.fault = 'Held B request must contain the completed orbit';
            s.armB = false;
            s.bRequest = message.id;
          }
        }
        if (message.kind === 'retire-atlas-masks') {
          s.retirements.push({ order, masks: structuredClone(message.masks) });
          if (s.holdRetirements) {
            (s.retirementBag ||= []).push(structuredClone(message));
            return;
          }
        }
      }
      return super.postMessage(message, ...args);
    }
    deliverRetirement(message) { return NativeWorker.prototype.postMessage.call(this, message); }
  };
}, { changeView, changeControls, atlasRace });

// These optional boundaries use the real worker's issued data. Native debugger
// pauses control transport order; no production hook or alpha fixture is added.
async function retentionBoundaries(reference, client, idle) {
  assert.ok(process.env.BEND_RACE_BUILD_JSON, 'retention run needs its exact package');
  const manifestPath = path.resolve(process.env.BEND_RACE_BUILD_JSON);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const cdp = await browser.newBrowserCDPSession();
  const attached = [];
  const cleanupOwner = async owner => {
    const failures = [];
    for (const action of [() => owner.resume(), () => owner.send('Debugger.disable')]) {
      try { await action(); } catch (error) { failures.push(error); }
    }
    try {
      await cdp.send('Target.detachFromTarget', { sessionId: owner.sessionId });
      attached.splice(attached.indexOf(owner), 1);
      cdp.off('Target.receivedMessageFromTarget', owner.listener);
    } catch (error) { failures.push(error); }
    return failures;
  };
  let primaryError;
  async function attach(prefix) {
    const filename = Object.keys(manifest.files).filter(name => name.startsWith(prefix) && name.endsWith('.js'));
    assert.equal(filename.length, 1);
    const expected = await readFile(path.join(path.dirname(manifestPath), filename[0]), 'utf8');
    const { targetInfos } = await cdp.send('Target.getTargets');
    const targets = targetInfos.filter(t => t.type === 'worker' && t.url === new URL(filename[0], process.env.BEND_TEST_URL).href);
    assert.equal(targets.length, 1, 'one actual owned worker target');
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: targets[0].targetId, flatten: false });
    let sequence = 0, paused = null;
    const pending = new Map(), scripts = [];
    const listener = event => {
      if (event.sessionId !== sessionId) return;
      const message = JSON.parse(event.message);
      if (message.id) {
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id); clearTimeout(request.timer);
        message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
      } else if (message.method === 'Debugger.scriptParsed') scripts.push(message.params);
      else if (message.method === 'Debugger.paused') paused = message.params;
      else if (message.method === 'Debugger.resumed') paused = null;
    };
    cdp.on('Target.receivedMessageFromTarget', listener);
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Worker CDP ${method} timed out`)); }, 15000);
      pending.set(id, { resolve, reject, timer });
      cdp.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }).catch(reject);
    });
    const waitPause = async () => {
      for (let i = 0; i < 400 && !paused; i++) await new Promise(resolve => setTimeout(resolve, 25));
      assert.ok(paused?.callFrames?.length, 'actual worker reached its breakpoint');
      return paused;
    };
    const evaluate = async expression => {
      const state = await waitPause();
      const result = await send('Debugger.evaluateOnCallFrame', { callFrameId: state.callFrames[0].callFrameId,
        expression, returnByValue: true });
      assert.equal(result.exceptionDetails, undefined);
      return result.result.value;
    };
    const resume = async () => { if (paused) { paused = null; await send('Debugger.resume'); } };
    const owner = { send, waitPause, evaluate, resume, sessionId, listener };
    attached.push(owner);
    await send('Debugger.enable');
    const parsed = scripts.filter(s => s.url === targets[0].url);
    assert.equal(parsed.length, 1, 'actual script parsed once');
    const { scriptSource } = await send('Debugger.getScriptSource', { scriptId: parsed[0].scriptId });
    assert.equal(scriptSource, expected, 'debugged source equals the served hash-bound package');
    owner.breakAt = async (token, condition = '') => {
      const column = expected.indexOf(token);
      assert.ok(column >= 0 && expected.indexOf(token, column + 1) < 0, 'one exact breakpoint site');
      assert.equal(expected.slice(0, column).includes('\n'), false, 'reviewed single-line bundle');
      const { locations } = await send('Debugger.getPossibleBreakpoints', {
        start: { scriptId: parsed[0].scriptId, lineNumber: 0, columnNumber: column },
        end: { scriptId: parsed[0].scriptId, lineNumber: 0, columnNumber: column + token.length } });
      assert.ok(locations.length, 'site has an executable breakpoint');
      const result = await send('Debugger.setBreakpoint', { location: locations[0], condition });
      assert.equal(result.actualLocation.scriptId, parsed[0].scriptId);
      assert.ok(result.actualLocation.columnNumber >= column && result.actualLocation.columnNumber < column + token.length);
      console.error(JSON.stringify({ debuggerSite: { filename: filename[0], token, locations, actualLocation: result.actualLocation } }));
      return result.breakpointId;
    };
    return owner;
  }
  const fresh = async () => {
    await page.evaluate(() => localStorage.removeItem('rift-bend-lab/preferences-v1'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__atlasRace?.shown?.atlasPick &&
      document.querySelector('canvas')?.getAttribute('aria-busy') === 'false', null, { timeout: 20000 });
  };
  const drag = async (x0, y0, x1, y1) => {
    const a = await client(x0, y0), b = await client(x1, y1);
    await page.mouse.move(a.x, a.y); await idle();
    await page.evaluate(() => {
      const s = window.__atlasRace;
      s.holdOrbitStart = true; s.releasingOrbitStart = false; s.heldOrbitStart = null;
    });
    await page.mouse.down({ button: 'right' });
    await page.waitForFunction(() => window.__atlasRace.heldOrbitStart, null, { timeout: 20000 });
    await page.mouse.move(b.x, b.y); await page.mouse.up({ button: 'right' });
    await page.evaluate(() => {
      const s = window.__atlasRace; s.releasingOrbitStart = true;
      window.__gameWorker.dispatchEvent(new MessageEvent('message', { data: s.heldOrbitStart }));
    });
  };
  const maskFence = 'if(r.offer===i.lastOffer)i.retired=!0';
  try {
    await fresh();
    await drag(300, 350, 300, 190);
    await page.waitForFunction(() => window.__atlasRace.shown?.atlasPick &&
      window.__atlasRace.shown.view.pitch === 35 &&
      document.querySelector('canvas')?.getAttribute('aria-busy') === 'false', null, { timeout: 20000 });
    const a = await page.evaluate(() => {
      const s = window.__atlasRace; s.holdRetirements = true;
      return structuredClone(s.shown);
    });
    assert.deepEqual(a.view, reference.view, 'same independent nonfallback source witness');
    const main = await attach('worker-v2-'), helper = await attach('sprite-helper-');
    const helperBreakpoint = await helper.breakAt('n.postMessage({kind:"result",protocol:On,id:P.id');
    await drag(300, 190, 763, 430);
    await helper.waitPause();
    const helperResult = await helper.evaluate('({id:P.id,kind:"result"})');
    const acknowledgment = await page.evaluate(id => {
      const s = window.__atlasRace;
      const index = (s.retirementBag || []).findIndex(m => m.masks.some(item => item.id === id));
      if (index < 0 || s.shown.view.yaw !== 90 || s.shown.view.pitch !== 90)
        throw new Error('B did not retire authentic displayed A');
      s.holdReturnView = structuredClone(s.replies.find(r => r.shown.atlasMaskId === id).shown.view);
      return s.retirementBag.splice(index, 1)[0];
    }, a.atlasMaskId);
    assert.equal(acknowledgment.masks.length, 1);
    const old = acknowledgment.masks[0];
    await drag(763, 430, 953, 190);
    await page.waitForFunction(() => window.__atlasRace.heldReturn, null, { timeout: 20000 });
    const newer = await page.evaluate(() => window.__atlasMetadata(window.__atlasRace.heldReturn));
    assert.equal(newer.atlasMaskId, old.id, 'real return reuses retained A alpha');
    assert.ok(newer.atlasMaskOffer > old.offer, 'new offer is issued before old retirement arrives');
    const oldBreakpoint = await main.breakAt(maskFence, `r.id===${old.id}&&r.offer===${old.offer}`);
    await page.evaluate(message => window.__gameWorker.deliverRetirement(message), acknowledgment);
    await main.waitPause();
    const fence = await main.evaluate('({id:r.id,old:r.offer,newer:i.lastOffer,retired:i.retired,size:xe.size})');
    assert.equal(fence.old, old.offer); assert.equal(fence.newer, newer.atlasMaskOffer);
    assert.equal(fence.retired, false); assert.ok(fence.old < fence.newer);
    await main.resume(); await main.send('Debugger.removeBreakpoint', { breakpointId: oldBreakpoint });
    await page.evaluate(() => {
      const s = window.__atlasRace; s.releasingReturn = true;
      window.__gameWorker.dispatchEvent(new MessageEvent('message', { data: s.heldReturn }));
    });
    await idle();
    const point = await client(reference.x, reference.y);
    await page.mouse.click(point.x, point.y);
    await page.waitForFunction(name => document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' &&
      document.querySelector('canvas')?.getAttribute('aria-label')?.includes(`White Knight ${name}`),
    reference.name, { timeout: 20000 });
    const selection = await page.evaluate(() => {
      const s = window.__atlasRace;
      return { selected: s.shown.position, summary: s.shownSummary, fault: s.fault,
        input: s.requests.find(r => r.events.some(e => e.$.endsWith('PointerDown') && e.button === 0))?.presentation };
    });
    assert.equal(selection.fault, undefined); assert.deepEqual(selection.selected, a.position);
    assert.equal(selection.input.atlasMaskId, newer.atlasMaskId);
    assert.equal(selection.input.atlasMaskOffer, newer.atlasMaskOffer);
    await helper.resume(); await helper.send('Debugger.removeBreakpoint', { breakpointId: helperBreakpoint });
    await drag(300, 190, 763, 430);
    await idle();
    const latestAck = await page.evaluate(id => {
      const s = window.__atlasRace;
      const index = s.retirementBag.findLastIndex(m => m.masks.some(item => item.id === id));
      if (index < 0) throw new Error('No genuine latest-received A retirement');
      return s.retirementBag.splice(index, 1)[0];
    }, old.id);
    const latestBreakpoint = await main.breakAt(maskFence, `r.id===${old.id}`);
    await page.evaluate(message => window.__gameWorker.deliverRetirement(message), latestAck);
    await main.waitPause();
    const latestFence = await main.evaluate('({offer:r.offer,last:i.lastOffer,retired:i.retired})');
    assert.equal(latestFence.offer, latestFence.last);
    assert.ok(latestFence.offer >= newer.atlasMaskOffer, 'later real retirement acknowledges the newest received offer');
    await main.resume(); await main.send('Debugger.removeBreakpoint', { breakpointId: latestBreakpoint });
    const phaseCleanup = [];
    for (const owner of [...attached]) phaseCleanup.push(...await cleanupOwner(owner));
    assert.deepEqual(phaseCleanup, [], 'first phase debugger ownership is closed');
    console.error(JSON.stringify({ completedSameMaskBoundary: { old, newer: newer.atlasMaskOffer,
      fence, latestFence, helperResult, selected: reference.name } }));

    await fresh();
    await page.evaluate(() => { window.__atlasRace.holdRetirements = true; });
    const ids = new Set([await page.evaluate(() => window.__atlasRace.shown.atlasMaskId)]);
    for (let i = 0; i < 7; i++) {
      const previous = await page.evaluate(() => window.__atlasRace.shown.atlasMaskId);
      await drag(300, 350, 340, 350);
      await page.waitForFunction(id => window.__atlasRace.shown?.atlasPick &&
        window.__atlasRace.shown.atlasMaskId !== id &&
        document.querySelector('canvas')?.getAttribute('aria-busy') === 'false', previous, { timeout: 20000 });
      const id = await page.evaluate(() => window.__atlasRace.shown.atlasMaskId);
      assert.ok(!ids.has(id)); ids.add(id);
    }
    assert.equal(ids.size, 8, 'eight authentic settled identities');
    const pressureMain = await attach('worker-v2-');
    const pressureBreakpoint = await pressureMain.breakAt('fa=!0;return}');
    await drag(300, 350, 340, 350);
    await pressureMain.waitPause();
    const pressure = await pressureMain.evaluate('({size:xe.size,limit:J7,kind:n.kind,id:n.id,pending:o.id,generation:n.generation,pendingGeneration:o.generation,pickTag:n.pickData?.$,view:r.presentation.view,protected:[Rl,Pl,Ai],masks:[...xe].map(([id,m])=>({id,first:m.firstOffer,last:m.lastOffer}))})');
    assert.equal(pressure.size, 8); assert.equal(pressure.limit, 8);
    assert.equal(pressure.kind, 'result'); assert.equal(pressure.id, pressure.pending);
    assert.equal(pressure.generation, pressure.pendingGeneration);
    assert.equal(pressure.pickTag, 'graphics/v2game/PieceSprites.Pieces');
    assert.deepEqual([...pressure.masks.map(m => m.id)].sort((a,b) => a-b), [...ids].sort((a,b) => a-b));
    await pressureMain.resume();
    await pressureMain.send('Runtime.evaluate', { expression: 'Promise.resolve(true)', awaitPromise: true });
    await pressureMain.send('Debugger.removeBreakpoint', { breakpointId: pressureBreakpoint });
    const release = await page.evaluate(({ masks, protectedIds, view }) => {
      const s = window.__atlasRace;
      if (JSON.stringify(s.shown.view) !== JSON.stringify(view) || s.shown.atlasPick)
        throw new Error('Ninth view must still use its authentic fallback frame');
      const known = new Map(masks.map(m => [m.id,m]));
      const index = s.retirementBag.findIndex(m => m.masks.every(item =>
        known.get(item.id)?.last === item.offer && !protectedIds.includes(item.id)));
      if (index < 0) throw new Error('No genuine unprotected latest-offer retirement');
      return s.retirementBag.splice(index,1)[0];
    }, { masks: pressure.masks, protectedIds: pressure.protected, view: pressure.view });
    const releaseId = release.masks[0].id;
    const releaseBreakpoint = await pressureMain.breakAt(maskFence, `r.id===${releaseId}`);
    await page.evaluate(message => window.__gameWorker.deliverRetirement(message), release);
    await pressureMain.waitPause();
    const capacityBeforeRelease = await pressureMain.evaluate('({size:xe.size,id:r.id,offer:r.offer,last:i.lastOffer,pressure:fa})');
    assert.equal(capacityBeforeRelease.size, 8, 'ninth result admitted no record');
    assert.equal(capacityBeforeRelease.offer, capacityBeforeRelease.last);
    assert.equal(capacityBeforeRelease.pressure, true, 'actual capacity branch deferred detail');
    await pressureMain.resume();
    await pressureMain.send('Debugger.removeBreakpoint', { breakpointId: releaseBreakpoint });
    await page.waitForFunction(view => window.__atlasRace.shown?.atlasPick &&
      JSON.stringify(window.__atlasRace.shown.view) === JSON.stringify(view), pressure.view, { timeout: 20000 });
    const recovered = await page.evaluate(() => window.__atlasMetadata({ presentation: window.__atlasRace.shown,
      atlasPick: window.__atlasRace.shown.atlasPick, atlasMaskId: window.__atlasRace.shown.atlasMaskId,
      atlasMaskOffer: window.__atlasRace.shown.atlasMaskOffer }));
    assert.ok(!ids.has(recovered.atlasMaskId), 'capacity release admits a new identity');
    await page.evaluate(() => {
      const s = window.__atlasRace; s.holdRetirements = false;
      for (const message of s.retirementBag.splice(0)) window.__gameWorker.deliverRetirement(message);
    });
    await idle(); assert.deepEqual(errors, []);
    return { sameMask: { old, newer: newer.atlasMaskOffer, fence, latestFence, helperResult, selected: reference.name },
      pressure: { ...pressure, capacityBeforeRelease, recoveredId: recovered.atlasMaskId },
      scope: 'Actual browser eight-mask admission/recovery and stale retirement of a newer unreceived same-mask offer; debugger-controlled ordering, no latency/device claim' };
  } catch (error) {
    primaryError = error; throw error;
  } finally {
    const failures = [];
    for (const owner of [...attached]) failures.push(...await cleanupOwner(owner));
    try { await cdp.detach(); } catch (error) { failures.push(error); }
    if (failures.length) {
      if (!primaryError) throw new AggregateError(failures, 'Owned debugger cleanup failed');
      console.error(JSON.stringify({ debuggerCleanupFailures: failures.map(String) }));
    }
  }
}
try {
  await page.goto(process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/',
    { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true',
    null, { timeout: 60000 });

  if (atlasRace) {
    const canvas = page.locator('canvas');
    const idle = () => page.waitForFunction(() =>
      document.querySelector('canvas')?.getAttribute('aria-busy') === 'false',
    null, { timeout: 60000 });
    const client = (x, y) => canvas.evaluate((canvas, { x, y }) => {
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + (x + 0.25) * rect.width / canvas.width,
        y: rect.top + (y + 0.25) * rect.height / canvas.height };
    }, { x, y });
    // A single real orbit gesture makes the head hit differ from board fallback.
    const from = await client(300, 350), low = await client(300, 190);
    await page.mouse.move(from.x, from.y); await idle();
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(low.x, low.y);
    await page.mouse.up({ button: 'right' });
    await page.waitForFunction(() => window.__atlasRace.shown?.atlasPick === true &&
      window.__atlasRace.shown.view.pitch === 35 &&
      document.querySelector('canvas')?.getAttribute('aria-busy') === 'false',
    null, { timeout: 20000 });
    const reference = await page.evaluate(() => {
      const s = window.__atlasRace, a = structuredClone(s.shown);
      if (s.shownSummary?.includes('White Knight')) throw new Error('Knight already selected');
      if (!a.atlasPick || a.menu !== 0 || a.view.pitch !== 35 || a.view.yaw !== 345)
        throw new Error('Source reference requires displayed atlas yaw345/pitch35');
      const board = []; let list = a.position.board;
      while (list?.$ === 'Con' && board.length < 65) { board.push(list.head); list = list.tail; }
      if (list?.$ !== 'Nil' || board.length !== 64) throw new Error('Actual board shape');
      const { yaw, pitch, zoom } = a.view;
      const c = Math.cos(yaw * Math.PI / 180), n = Math.sin(yaw * Math.PI / 180);
      const sp = Math.sin(pitch * Math.PI / 180), cp = Math.cos(pitch * Math.PI / 180);
      const scale = 45 * zoom / (100 * (Math.abs(c) + Math.abs(n)));
      const boardSpan = Math.abs(c) + Math.abs(n);
      const artAngle = n * Math.PI / 6;
      const ac = Math.cos(artAngle), an = Math.sin(artAngle);
      const asp = Math.min(sp, Math.sin(40 * Math.PI / 180));
      const acp = Math.max(cp, Math.cos(40 * Math.PI / 180));
      const artSpan = Math.abs(ac) + Math.abs(an);
      const cy = square => 274 + scale * sp * (n * (square % 8 - 3.5) + c * (7 - Math.floor(square / 8) - 3.5));
      const eligible = board.flatMap((code, square) => code === 2 &&
        !(a.position.holes & (1 << (Math.floor(square / 16) * 4 + Math.floor(square % 8 / 2)))) ? [square] : []);
      eligible.sort((x, y) => cy(y) - cy(x) || y - x);
      if (!eligible.length) throw new Error('No actual present white knight');
      const square = eligible[0];
      // Strict interior of KnightMesh's visible F-I muzzle-roof quad, not a rectangle center.
      const local = { file: 0.31, row: 0, height: 0.8285714285714286 };
      if (acp * an * 0.65079137345596849 + asp * 0.75925660236529646 <= 0)
        throw new Error('Reference face is culled');
      const file = square % 8, row = 7 - Math.floor(square / 8);
      const x = Math.floor(256 + scale * (c * (file - 3.5) - n * (row - 3.5)) +
        scale * boardSpan * (ac * local.file - an * local.row) / artSpan);
      const y = Math.floor(cy(square) + scale * boardSpan *
        (asp * (an * local.file + ac * local.row) - acp * local.height) / artSpan);
      const dx = (x - 256) / scale, dy = (y - 274) / (scale * sp);
      const fallbackFile = Math.floor(3.5 + c * dx + n * dy + 0.5);
      const fallbackRow = Math.floor(3.5 - n * dx + c * dy + 0.5);
      const fallback = 8 * (7 - fallbackRow) + fallbackFile;
      if (fallback === square || board[fallback] === 2)
        throw new Error('Hit cannot distinguish board-only fallback from knight selection');
      const bounds = a.plan.board, tier = a.plan.scale;
      const px = bounds.x + x * tier, py = bounds.y + y * tier;
      if (px < bounds.x || px >= bounds.x + bounds.width || py < bounds.y || py >= bounds.y + bounds.height)
        throw new Error('Reference outside actual board plan');
      s.a = a; s.armB = true; s.holdOrbitStart = true;
      return { square, code: board[square], local, fallback,
        sourceX: (x - 256 - scale * (c * (file - 3.5) - n * (row - 3.5))) / (scale * boardSpan),
        x: px, y: py,
        name: String.fromCharCode(97 + file) + (Math.floor(square / 8) + 1),
        mask: a.atlasMaskId, offer: a.atlasMaskOffer, view: a.view };
    });
    // Hold the actual right-down acknowledgment while move/up queue together.
    // The resulting B request is settled, so helper work is not motion-suppressed.
    await page.mouse.down({ button: 'right' });
    await page.waitForFunction(() => window.__atlasRace.heldOrbitStart,
      null, { timeout: 20000 });
    const high = await client(763, 430);
    await page.mouse.move(high.x, high.y);
    await page.mouse.up({ button: 'right' });
    await page.evaluate(() => {
      const s = window.__atlasRace; s.releasingOrbitStart = true;
      try { window.__gameWorker.dispatchEvent(new MessageEvent('message', { data: s.heldOrbitStart })); }
      finally { s.releasingOrbitStart = false; }
    });
    await page.waitForFunction(() => window.__atlasRace.heldB && window.__atlasRace.bRefinement &&
      Number(document.querySelector('canvas')?.dataset.spriteDeferred) > 0,
    null, { timeout: 60000 });
    const before = await canvas.evaluate(canvas => Number(canvas.dataset.spriteDiscarded || 0));
    const point = await client(reference.x, reference.y);
    await page.mouse.move(point.x, point.y);
    await page.mouse.click(point.x, point.y);
    const held = await page.evaluate(() => {
      const s = window.__atlasRace;
      const unchanged = s.shown.atlasMaskId === s.a.atlasMaskId &&
        s.shown.atlasMaskOffer === s.a.atlasMaskOffer &&
        JSON.stringify(s.shown.view) === JSON.stringify(s.a.view);
      const b = window.__atlasMetadata(s.heldB);
      if (!unchanged || !s.heldB.image || b.view.pitch !== 90 || b.view.yaw !== 90 ||
          JSON.stringify(s.bRefinement.shown.view) !== JSON.stringify(b.view))
        throw new Error('A was not shown while a real different-pose B was held');
      s.releasing = true;
      try { window.__gameWorker.dispatchEvent(new MessageEvent('message', { data: s.heldB })); }
      finally { s.releasing = false; }
      return { a: s.a.view, b: b.view, aMask: s.a.atlasMaskId,
        bMask: s.bRefinement.shown.atlasMaskId };
    });
    assert.notEqual(held.aMask, held.bMask, 'actual B helper installed a distinct pose mask');
    // Only muzzle vertices extend beyond file0.16; those have |row|<=0.07.
    // A's nose lies beyond B's entire art-pose alpha, including source padding.
    const artYaw = Math.sin(held.b.yaw * Math.PI / 180) * Math.PI / 6;
    const bc = Math.cos(artYaw), bn = Math.abs(Math.sin(artYaw));
    const rightBound = Math.max(0.16, (0.32 * bc + 0.07 * bn) / (bc + bn));
    assert.ok(reference.sourceX > rightBound + 2 * 0.6826666666666666 / 64,
      'A reference lies outside wrong B art-pose alpha, including two-texel padding');
    await page.waitForFunction(name =>
      document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' &&
      document.querySelector('canvas')?.getAttribute('aria-label')?.includes(`White Knight ${name}`),
    reference.name, { timeout: 60000 });
    const evidence = await page.evaluate(() => {
      const s = window.__atlasRace;
      const hit = s.requests.find(request => request.events.some(event =>
        event.$.endsWith('PointerDown') && event.button === 0));
      const reply = hit && s.replies.find(reply => reply.kind === 'frame' && reply.id === hit.id);
      return { hit, reply, a: s.a, retirements: s.retirements,
        deferred: Number(document.querySelector('canvas').dataset.spriteDeferred),
        discarded: Number(document.querySelector('canvas').dataset.spriteDiscarded || 0), fault: s.fault };
    });
    assert.ok(evidence.hit && evidence.reply, 'real queued click request and reply');
    assert.equal(evidence.hit.presentation.atlasPick, true);
    assert.equal(evidence.hit.presentation.atlasMaskId, reference.mask);
    assert.equal(evidence.hit.presentation.atlasMaskOffer, reference.offer);
    assert.deepEqual(evidence.hit.presentation.view, reference.view);
    assert.ok(evidence.hit.events.some(event => event.$.endsWith('PointerMove')));
    assert.ok(evidence.hit.events.some(event => event.$.endsWith('PointerDown') &&
      event.x === reference.x && event.y === reference.y && event.button === 0));
    assert.deepEqual(evidence.reply.shown.position, evidence.a.position, 'selection did not move a piece');
    assert.match(evidence.reply.summary, new RegExp(`White Knight ${reference.name}`));
    assert.ok(!evidence.retirements.some(record => record.order < evidence.reply.order &&
      record.masks.some(mask => mask.id === reference.mask)), 'A retained through actual queued reply');
    assert.ok(evidence.deferred > 0 && evidence.discarded > before);
    assert.equal(evidence.fault, undefined);
    assert.deepEqual(errors, []);
    const retention = atlasPressure ? await retentionBoundaries(reference, client, idle) : undefined;
    console.log(JSON.stringify({ ok: true, atlasMaskRace: true, reference, held,
      requestId: evidence.hit.id, deferred: evidence.deferred, discarded: evidence.discarded,
      presentationA: evidence.a, actualRequest: evidence.hit, actualReply: evidence.reply,
      retirements: evidence.retirements, retention, errors }, (_key, value) => typeof value === 'bigint'
      ? { $: 'BigInt', value: value.toString() } : value));
  } else if (changeControls) {
    const control = async id => {
      const button = page.locator(`[data-control="${id}"]`);
      assert.equal(await button.isDisabled(), false);
      const rect = JSON.parse(await button.getAttribute('data-rect'));
      const point = await page.locator('canvas').evaluate((canvas, rect) => {
        const box = canvas.getBoundingClientRect();
        return { x: box.x + (rect.x + rect.width / 2) * box.width / canvas.width,
          y: box.y + (rect.y + rect.height / 2) * box.height / canvas.height };
      }, rect);
      const previous = await page.evaluate(() => window.__replyId);
      await page.mouse.click(point.x, point.y);
      await page.waitForFunction(previous => window.__replyId > previous &&
        document.querySelector('canvas')?.getAttribute('aria-busy') === 'false', previous,
      { timeout: 60000 });
    };
    await control(2); await control(30); await control(29);
    await control(57); await control(7); await control(52);
    assert.ok(await page.evaluate(() => window.__resignPageZero));
    assert.equal(await page.locator('[data-control="52"]').getAttribute('aria-pressed'), 'true');
    const before = await page.locator('canvas').evaluate(canvas => Number(canvas.dataset.spriteDiscarded || 0));
    // Deliver actual earlier Bend pixels/controls after a same-revision menu
    // choice. Only the transport ordering is forced; no hit plan is fabricated.
    await page.evaluate(() => window.__gameWorker.dispatchEvent(new MessageEvent('message', {
      data: { ...window.__resignPageZero, kind: 'refinement' },
    })));
    const discarded = await page.locator('canvas').evaluate(canvas => Number(canvas.dataset.spriteDiscarded || 0));
    assert.ok(discarded > before, 'earlier control plan is discarded');
    await control(42);
    const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1')));
    assert.equal(journal.commands.length, 1, 'canvas Confirm commits one resignation');
    assert.match(await page.locator('canvas').getAttribute('aria-label'), /Black resigned/);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, controlRace: true, discarded, errors }));
  } else {
  await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.spriteDeferred) > 0,
    null, { timeout: 60000 });
  if (changeView) await page.waitForFunction(() =>
    Number(document.querySelector('canvas')?.dataset.spriteDiscarded) > 0 &&
    window.__latestView?.zoom > 100, null, { timeout: 60000 });
  await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.spriteRoundTripMs) > 0 &&
    document.querySelector('canvas')?.getAttribute('aria-busy') === 'false',
    null, { timeout: 60000 });
  const observed = await page.locator('canvas').evaluate(canvas => ({
    deferred: Number(canvas.dataset.spriteDeferred),
    discarded: Number(canvas.dataset.spriteDiscarded || 0),
    roundTripMs: Number(canvas.dataset.spriteRoundTripMs),
    atlasPick: canvas.dataset.atlasPick,
    summary: canvas.getAttribute('aria-label'),
  }));
  assert.ok(observed.deferred >= 1 && observed.roundTripMs > 0);
  assert.equal(observed.atlasPick, 'true', 'accepted refinement carries its displayed atlas input mode');
  if (changeView) assert.ok(observed.discarded >= 1);
  assert.match(observed.summary, /White to move/);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, ...observed, errors }));
  }
} catch (error) {
  if (atlasRace) {
    const observed = await page.evaluate(() => {
      const s = window.__atlasRace;
      return { shown: s.shown, summary: s.shownSummary, requests: s.requests,
        replies: s.replies, retirements: s.retirements, fault: s.fault,
        dataset: { ...document.querySelector('canvas')?.dataset } };
    });
    console.error(JSON.stringify({ atlasRaceFailure: String(error), observed },
      (_key, value) => typeof value === 'bigint' ? { $: 'BigInt', value: String(value) } : value));
    if (process.env.BEND_RACE_FAILURE_IMAGE)
      await page.screenshot({ path: process.env.BEND_RACE_FAILURE_IMAGE });
  }
  throw error;
} finally {
  await browser.close();
}
