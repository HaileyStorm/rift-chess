// Force an input between the sprite refinement's worker message and the host
// listener. The host must defer the Bend image and present it once input drains.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const changeView = process.env.BEND_RACE_VIEW === '1';
const changeControls = process.env.BEND_RACE_CONTROL === '1';
const atlasRace = process.env.BEND_RACE_ATLAS === '1';
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
        if (message.kind === 'retire-atlas-masks')
          s.retirements.push({ order, masks: structuredClone(message.masks) });
      }
      return super.postMessage(message, ...args);
    }
  };
}, { changeView, changeControls, atlasRace });
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
    console.log(JSON.stringify({ ok: true, atlasMaskRace: true, reference, held,
      requestId: evidence.hit.id, deferred: evidence.deferred, discarded: evidence.discarded,
      presentationA: evidence.a, actualRequest: evidence.hit, actualReply: evidence.reply,
      retirements: evidence.retirements, errors }, (_key, value) => typeof value === 'bigint'
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
