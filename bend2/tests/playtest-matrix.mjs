// Rendered playtest matrix for the built Bend application.
//
// Every action goes through the real canvas (or the key/button path under test),
// every committed journal is replayed on the TypeScript reference engine, and
// each checkpoint is captured hierarchically:
//   L1 full canvas, L2 regions (board, pane, top bar, footer), L3 detail crops.
// Findings are collected instead of aborting so one run reports every defect.
//
//   node bend2/tools/serve.mjs 4184
//   node bend2/tests/playtest-matrix.mjs            (all scenarios)
//   PLAYTEST_ONLY=selection,shift BEND_PLAYTEST_RUN=after node bend2/tests/playtest-matrix.mjs
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { replayRecord, Game } from './ts-oracle.mjs';

const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4184/';
const run = process.env.BEND_PLAYTEST_RUN || new Date().toISOString().replace(/[:.]/g, '-');
const root = path.resolve('.artifacts/bend2/playtest-stage2', run);
const only = (process.env.PLAYTEST_ONLY || '').split(',').filter(Boolean);
const fixtures = JSON.parse(await fs.readFile(new URL('./fixtures/playtest-records.json', import.meta.url), 'utf8'));
const SAVE = 'rift-bend-lab/save-v1', PREFS = 'rift-bend-lab/preferences-v1', RECOVERY = 'rift-bend-lab/recovery-v1';
const DESKTOP = { width: 1280, height: 1050 }, PHONE = { width: 390, height: 844 };

// ---- action vocabulary (rift-action/1) -------------------------------------------------
const files = 'abcdefgh';
const sq = name => files.indexOf(name[0]) + 8 * (Number(name[1]) - 1);
const sqName = s => files[s % 8] + (Math.floor(s / 8) + 1);
const macro = name => (Number(name[1]) - 1) * 4 + 'ABCD'.indexOf(name[0]);
const macroSquares = m => { const f = (m % 4) * 2, r = Math.floor(m / 4) * 2; return [r * 8 + f, r * 8 + f + 1, (r + 1) * 8 + f, (r + 1) * 8 + f + 1]; };
const PROMO = { Q: 1, R: 2, B: 3, N: 4 };
const mv = (from, to, promo = '') => 5 * (64 * sq(from) + sq(to)) + (PROMO[promo] || 0);
const sh = (from, to, promo = '') => 20480 + 5 * (16 * macro(from) + macro(to)) + (PROMO[promo] || 0);
const decode = id => id >= 20480
  ? { shift: true, from: Math.floor((id - 20480) / 80), to: Math.floor((id - 20480) / 5) % 16, promo: (id - 20480) % 5 }
  : { shift: false, from: Math.floor(id / 320), to: Math.floor(id / 5) % 64, promo: id % 5 };
const label = id => { const a = decode(id); return a.shift ? `S${a.from}->${a.to}${a.promo ? '=' + 'QRBN'[a.promo - 1] : ''}` : `${sqName(a.from)}${sqName(a.to)}${a.promo ? '=' + 'QRBN'[a.promo - 1] : ''}`; };
const record = (layout, policy, actions) => ({ schema: 'rift-bend-record/1', layout, policy,
  commands: actions.map((action, expected) => ({ $: 'MoveCommand', expected, action })) });

// ---- reference expectations ------------------------------------------------------------
function expectedState(game) {
  const o = game.outcome();
  if (!o) return `${game.state.side === 1 ? 'WHITE' : 'BLACK'} TO MOVE${game.observe().in_check ? ' - CHECK' : ''}`;
  return { checkmate: o.winner === 1 ? 'WHITE WINS' : 'BLACK WINS', stalemate: 'STALEMATE', bare_kings: 'DRAW - BARE KINGS',
    threefold: 'DRAW - THREEFOLD', progress100: 'DRAW - 100 QUIET', agreement: 'DRAW AGREED',
    resignation: o.winner === 1 ? 'WHITE WINS - RESIGNED' : 'BLACK WINS - RESIGNED' }[o.reason];
}
const VALUE = { 1: 1, 7: 1, 2: 3, 3: 3, 4: 5, 5: 9, 6: 0 };
let seed = 20260923;
const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
/** A greedy human: mates, then material, then checks, then a seeded random quiet action. */
function humanChoice(game) {
  let best = null;
  for (const action of game.legalActions()) {
    const probe = new Game('B', 'off', game.state);
    probe.step(action.id);
    const o = probe.outcome(), victim = action.type === 'move' ? Math.abs(game.state.board[sq(action.to)]) : 0;
    const score = (o?.reason === 'checkmate' ? 1000 : 0) + (VALUE[victim] || 0) * 10 + (probe.observe().in_check ? 4 : 0)
      + (action.promotion ? 30 : 0) + random() * 3;
    if (!best || score > best.score) best = { score, id: action.id };
  }
  return best?.id;
}

// ---- run bookkeeping -------------------------------------------------------------------
const summary = { run, url, at: new Date().toISOString(), scenarios: [], defects: [], timings: {} };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const instrument = () => {
  window.__frames = []; window.__sounds = []; window.__motionShots = []; window.__audioStarts = 0; window.__opened = [];
  const openWindow = window.open;
  window.open = (...args) => { window.__opened.push(String(args[0])); return null; };
  void openWindow;
  const startSound = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) { window.__audioStarts++; return Reflect.apply(startSound, this, args); };
  const Native = window.Worker;
  window.Worker = class extends Native {
    requests = new Map();
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const m = event.data;
        if (m.kind === 'fault') window.__fault = m.message;
        if (m.kind !== 'frame') return;
        for (const e of m.effects) if (e.$ === 'Sound') {
          const pcm = new Float32Array(e.samples);
          window.__sounds.push({ samples: pcm.length, peak: Math.max(...pcm.map(Math.abs)), finite: pcm.every(Number.isFinite) });
        }
        const request = this.requests.get(m.id);
        window.__frames.push({ ms: m.renderMs, portMs: m.portMs, dirty: !!m.image, kinds: request?.kinds || [],
          latency: request ? performance.now() - request.at : null });
        window.__reply = { id: m.id, after: m.after, renderMs: m.renderMs };
        if (m.image) {
          window.__shown = m.presentation;
          if (window.__captureMotion && m.after > 0) requestAnimationFrame(() => window.__motionShots.push(document.querySelector('canvas').toDataURL()));
        }
      });
    }
    postMessage(message, ...args) {
      this.requests.set(message.id, { at: performance.now(), kinds: (message.events || [{ $: message.kind }]).map(e => e.$) });
      super.postMessage(message, ...args);
    }
  };
};

const DESKTOP_REGIONS = [
  { name: 'board', x: 0, y: 124, w: 516, h: 520, scale: 2 }, { name: 'pane', x: 556, y: 124, w: 448, h: 668, scale: 2 },
  { name: 'top', x: 0, y: 0, w: 1024, h: 72, scale: 2 }, { name: 'footer', x: 0, y: 640, w: 560, h: 40, scale: 3 }];
const MOBILE_REGIONS = [
  { name: 'board', x: 0, y: 60, w: 512, h: 520, scale: 2 }, { name: 'pane', x: 0, y: 600, w: 512, h: 424, scale: 2 },
  { name: 'top', x: 0, y: 0, w: 512, h: 64, scale: 3 }, { name: 'footer', x: 0, y: 576, w: 512, h: 30, scale: 3 }];

class ScriptError extends Error {}

async function scenario(name, viewport, body) {
  if (only.length && !only.includes(name)) return;
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  const result = { name, checks: [], defects: [], shots: [], errors: [], timings: {} };
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') result.errors.push(event.text()); });
  await page.addInitScript(instrument);
  let sequence = 0;
  const t = {
    page, context, dir, result,
    async ready(timeout = 90000) {
      await page.waitForFunction(() => window.__fault || document.querySelector('canvas')?.dataset.ready === 'true'
        && document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' && window.__shown && window.__reply?.after === 0, null, { timeout });
      const fault = await page.evaluate(() => window.__fault);
      if (fault) throw new ScriptError(`Bend runtime fault: ${fault}`);
    },
    async change(action) {
      const id = await page.evaluate(() => window.__reply?.id || 0);
      await action();
      await page.waitForFunction(id => window.__reply?.id > id, id, { timeout: 90000 });
      await t.ready();
    },
    // Most scenarios drive moves through the destination list, which is shown
    // only with TARGETS on; `defaults` covers the off-by-default presentation.
    async open(storage = {}, { targets = true } = {}) {
      if (targets) storage = { [PREFS]: '{"showMoves":true}', ...storage };
      if (Object.keys(storage).length) await page.addInitScript(values => {
        if (sessionStorage.getItem('playtest-seeded')) return;
        sessionStorage.setItem('playtest-seeded', '1');
        for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
      }, storage);
      await page.goto(url, { waitUntil: 'networkidle' });
      await t.ready();
    },
    shown: () => page.evaluate(() => JSON.parse(JSON.stringify(window.__shown, (k, v) => typeof v === 'bigint' ? Number(v) : v))),
    summary: () => page.locator('canvas').getAttribute('aria-label'),
    controls: () => page.locator('[data-control]').evaluateAll(nodes => nodes.map(n => ({ id: Number(n.dataset.control),
      label: n.textContent, enabled: !n.disabled, active: n.getAttribute('aria-pressed') === 'true', rect: JSON.parse(n.dataset.rect) }))),
    async control(id, { settle = true } = {}) {
      const c = (await t.controls()).find(c => c.id === id);
      if (!c) throw new ScriptError(`control ${id} is not presented`);
      if (!c.enabled) throw new ScriptError(`control ${id} (${c.label}) is disabled`);
      const p = await t.toPage(c.rect.x + c.rect.width / 2, c.rect.y + c.rect.height / 2);
      if (settle) await t.change(() => page.mouse.click(p.x, p.y)); else await page.mouse.click(p.x, p.y);
    },
    async has(id) { return (await t.controls()).some(c => c.id === id && c.enabled); },
    async toPage(x, y) {
      const b = await page.locator('canvas').boundingBox();
      const size = await page.locator('canvas').evaluate(c => ({ w: c.width, h: c.height }));
      return { x: b.x + x * b.width / size.w, y: b.y + y * b.height / size.h };
    },
    canvasSquare(shown, square, lift = 0) {
      const v = shown.view, a = v.yaw * Math.PI / 180;
      const scale = 45 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))) * v.zoom / 100;
      const u = square % 8 - 3.5, r = 3.5 - Math.floor(square / 8);
      return { x: 256 + scale * (Math.cos(a) * u - Math.sin(a) * r),
        y: (shown.mobile ? 64 : 128) + 274 + scale * Math.sin(v.pitch * Math.PI / 180) * (Math.sin(a) * u + Math.cos(a) * r) - lift };
    },
    async clickSquare(square, lift = 0) {
      const c = t.canvasSquare(await t.shown(), square, lift);
      const p = await t.toPage(c.x, c.y);
      await t.change(() => page.mouse.click(p.x, p.y));
    },
    async hover(square, lift = 0) {
      const c = t.canvasSquare(await t.shown(), square, lift);
      const p = await t.toPage(c.x, c.y);
      await t.change(() => page.mouse.move(p.x, p.y));
    },
    async record() { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), SAVE); },
    async count(n, atLeast = false) {
      await page.waitForFunction(({ key, n, atLeast }) => {
        const length = JSON.parse(localStorage.getItem(key) || '{}').commands?.length;
        return atLeast ? length >= n : length === n;
      }, { key: SAVE, n, atLeast }, { timeout: 120000 });
      await t.ready();
    },
    async commands() { return (await t.record())?.commands.length ?? 0; },
    check(ok, title, detail = '', severity = 'major') {
      result.checks.push({ ok: !!ok, title, detail });
      if (!ok) t.defect(severity, title, detail);
      return !!ok;
    },
    defect(severity, title, detail = '') {
      const item = { scenario: name, severity, title, detail };
      result.defects.push(item); summary.defects.push(item);
      console.log(`  [${severity}] ${title}${detail ? ' :: ' + detail : ''}`);
    },
    boardCodes(shown) { const out = []; let c = shown.position.board; while (c.$ === 'Con') { out.push(c.head); c = c.tail; } return out; },
    async verify(context) {
      const rec = await t.record() ?? record('B', 0, []);
      let game;
      try { game = replayRecord(rec); } catch (error) {
        t.defect('critical', `Reference engine rejects the Bend journal (${context})`, error.message);
        return null;
      }
      const shown = await t.shown();
      const board = t.boardCodes(shown), expected = game.state.board.map(p => p < 0 ? -p + 8 : p);
      const same = board.length === 64 && board.every((code, i) => code === expected[i]) && shown.position.holes === game.state.holes
        && (shown.position.side === true || shown.position.side?.$ === 'True') === (game.state.side === 1);
      t.check(same, `Presented position matches reference (${context})`, same ? '' : JSON.stringify({ board, expected, holes: [shown.position.holes, game.state.holes] }));
      const text = await t.summary(), state = expectedState(game);
      t.check(text.startsWith(`Rift Chess. ${state}.`), `Status text matches reference (${context})`, `${text} vs ${state}`);
      return game;
    },
    /** Stored overlay preferences, with the documented defaults for missing or unreadable ones. */
    async overlays() {
      return page.evaluate(key => {
        let p = {}; try { p = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
        return { moves: p.showMoves === true, shifts: p.showShifts !== false };
      }, PREFS);
    },
    async play(id, { via = 'canvas', piece = 16 } = {}) {
      const a = decode(id), before = await t.commands(), group = Math.floor(id / 5);
      const overlays = await t.overlays(), listed = a.shift ? overlays.shifts : overlays.moves;
      if (!listed && via === 'control') throw new ScriptError(`${label(id)} via control needs TARGETS on`);
      const source = a.shift ? `Selected tile ${'ABCD'[a.from % 4]}${Math.floor(a.from / 4) + 1}.` : `Selected ${sqName(a.from)}.`;
      const offered = async () => listed
        ? (await t.controls()).find(c => c.id >= 1000 && Math.floor((c.id - 1000) / 5) === group)
        : ((await t.summary()).includes(source) ? { id: 1000 + id } : undefined);
      const shown = await t.shown(), board = t.boardCodes(shown);
      const side = shown.position.side === true || shown.position.side?.$ === 'True';
      const own = code => code !== 0 && (side ? code < 8 : code >= 8);
      const reset = async () => { if (await t.has(4)) await t.control(4); };
      let attempts = 0;
      if (!a.shift) {
        for (const lift of [piece, 8, 22, 2]) { await reset(); attempts++; await t.clickSquare(a.from, lift); if (await offered()) break; }
      } else {
        const squares = macroSquares(a.from), carried = squares.find(s => own(board[s]));
        if (carried !== undefined && via !== 'tile') { attempts++; await t.clickSquare(carried, piece); await t.control(5); }
        else for (const s of squares.filter(s => board[s] === 0)) { await reset(); attempts++; await t.clickSquare(s, 0); if (await offered()) break; }
      }
      const control = await offered();
      if (!control) { await t.shot(`miss-${label(id)}`); throw new ScriptError(`canvas selection did not expose ${label(id)}`); }
      if (attempts > 1) t.defect('minor', `First canvas click missed the source of ${label(id)}`, `view ${JSON.stringify(shown.view)}, ${attempts} attempts`);
      if ((await t.commands()) !== before) throw new ScriptError(`selecting ${label(id)} committed an unintended command`);
      if (via === 'control') await t.control(control.id);
      else {
        const target = a.shift ? macroSquares(a.to)[0] : a.to;
        await t.clickSquare(target, 0);
        if (!a.promo && await t.commands() === before) {
          t.defect('major', `Destination click did not commit ${label(id)}`);
          if (!listed) throw new ScriptError(`no fallback control for ${label(id)} with overlays off`);
          await t.control(control.id);
        }
      }
      if (a.promo) {
        t.check((await t.shown()).menu === 4, `Promotion chooser opens for ${label(id)}`);
        await t.control(37 + a.promo);
      }
      await t.count(before + 1, true);
      const committed = (await t.record()).commands[before];
      t.check(committed?.action === id, `Committed action is ${label(id)}`, JSON.stringify(committed));
      return t.verify(label(id));
    },
    async upload(value, { wait = true } = {}) {
      if ((await t.shown()).menu !== 2) await t.control(1);
      const chooser = page.waitForEvent('filechooser');
      await t.control(21, { settle: false });
      const fileChooser = await chooser;
      const before = await page.evaluate(() => window.__reply.id);
      await fileChooser.setFiles({ name: 'scenario.json', mimeType: 'application/json',
        buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) });
      await page.waitForFunction(before => window.__reply.id > before, before, { timeout: 60000 });
      // Validation replays every command through the frozen kernel (about a second each).
      await t.ready(60000 + 1500 * (value.commands?.length ?? 0));
      if (wait && typeof value !== 'string') {
        const stored = await t.record();
        if (JSON.stringify(stored?.commands) !== JSON.stringify(value.commands))
          throw new ScriptError(`import did not install (${stored?.commands?.length} stored, ${value.commands.length} sent): ${await t.summary()}`);
      }
    },
    async motion(on) {
      if (on) return page.evaluate(() => { window.__captureMotion = true; window.__motionShots = []; });
      const shots = await page.evaluate(() => { window.__captureMotion = false; return window.__motionShots; });
      return shots;
    },
    async saveMotion(tag, shots, board = true) {
      const names = [];
      for (const [i, data] of shots.entries()) {
        const file = path.join(dir, `${String(++sequence).padStart(2, '0')}-${tag}-A${i}.png`);
        let png = Buffer.from(data.split(',')[1], 'base64');
        if (board) {
          const mobile = (await t.shown()).mobile;
          png = Buffer.from((await page.evaluate(({ data, y }) => new Promise(resolve => {
            const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
              const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, y, 512, 512, 0, 0, 1024, 1024); resolve(c.toDataURL()); };
            img.src = data; }), { data, y: mobile ? 64 : 128 })).split(',')[1], 'base64');
        }
        await fs.writeFile(file, png); names.push(path.basename(file));
      }
      result.shots.push({ name: `${tag}-motion`, files: names });
      return names;
    },
    /** Hierarchical capture: L1 canvas, L2 regions, L3 squares/controls/rects. */
    async shot(tag, { squares = [], controls = [], rects = [], pageShot = false } = {}) {
      const shown = await t.shown();
      const regions = shown.mobile ? MOBILE_REGIONS : DESKTOP_REGIONS;
      const details = [];
      for (const s of squares) { const c = t.canvasSquare(shown, s); details.push({ name: `sq-${sqName(s)}`, x: c.x - 36, y: c.y - 58, w: 72, h: 76, scale: 6 }); }
      const all = await t.controls();
      for (const id of controls) { const c = all.find(c => c.id === id); if (c) details.push({ name: `ctl-${id}`, x: c.rect.x - 2, y: c.rect.y - 2, w: c.rect.width + 4, h: c.rect.height + 4, scale: 5 }); }
      details.push(...rects);
      const data = await page.evaluate(({ regions, details }) => {
        const canvas = document.querySelector('canvas');
        const crop = r => { const o = document.createElement('canvas'); o.width = Math.round(r.w * r.scale); o.height = Math.round(r.h * r.scale);
          const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#f0f'; g.fillRect(0, 0, o.width, o.height);
          g.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, o.width, o.height); return o.toDataURL(); };
        return { full: canvas.toDataURL(), regions: regions.map(crop), details: details.map(crop) };
      }, { regions, details });
      const prefix = `${String(++sequence).padStart(2, '0')}-${tag}`;
      const files = [];
      const write = async (suffix, url) => { const file = `${prefix}-${suffix}.png`; await fs.writeFile(path.join(dir, file), Buffer.from(url.split(',')[1], 'base64')); files.push(file); };
      await write('L1', data.full);
      for (const [i, r] of regions.entries()) await write(`L2-${r.name}`, data.regions[i]);
      for (const [i, d] of details.entries()) await write(`L3-${d.name}`, data.details[i]);
      if (pageShot) { const file = `${prefix}-page.png`; await page.screenshot({ path: path.join(dir, file), fullPage: true }); files.push(file); }
      result.shots.push({ name: tag, files });
      return files;
    },
    async frames(tag, fn) {
      const start = await page.evaluate(() => window.__frames.length);
      await fn();
      const frames = await page.evaluate(start => window.__frames.slice(start), start);
      const describe = values => {
        const ms = values.sort((a, b) => a - b);
        return ms.length ? { n: ms.length, median: +ms[Math.floor(ms.length / 2)].toFixed(1), p95: +ms[Math.floor(ms.length * 0.95)].toFixed(1), max: +ms.at(-1).toFixed(1) } : { n: 0 };
      };
      const stats = describe(frames.filter(f => f.dirty).map(f => f.ms));
      stats.port = describe(frames.filter(f => f.dirty).map(f => f.portMs));
      stats.slowest = frames.slice().sort((a, b) => b.ms - a.ms).slice(0, 4).map(f => `${f.ms.toFixed(0)}:${f.kinds.join('+')}`);
      result.timings[tag] = stats;
      return stats;
    },
  };
  const started = Date.now();
  console.log(`scenario ${name}`);
  try {
    await body(t);
    result.ok = result.defects.every(d => d.severity === 'polish');
  } catch (error) {
    result.ok = false; result.failure = String(error.stack || error);
    t.defect(error instanceof ScriptError ? 'major' : 'script', `Scenario aborted: ${error.message}`);
    try { await t.shot('FAIL'); } catch {}
  } finally {
    for (const e of result.errors) t.defect('major', 'Browser console/page error', e);
    result.seconds = Math.round((Date.now() - started) / 100) / 10;
    summary.scenarios.push(result); summary.timings[name] = result.timings;
    await fs.writeFile(path.join(dir, 'result.json'), JSON.stringify(result, null, 2));
    await context.close();
  }
}

// ---- scenarios -------------------------------------------------------------------------
const whitePieces = ['a1', 'b1', 'c1', 'd1', 'e1', 'a2'].map(sq), blackPieces = ['a8', 'b8', 'c8', 'd8', 'e8', 'a7'].map(sq);

await scenario('desktop-start', DESKTOP, async t => {
  await t.open();
  await t.verify('start');
  await t.shot('start', { squares: [...whitePieces, ...blackPieces, sq('c3'), sq('d6'), sq('e4')], controls: [1, 3, 11], pageShot: true });
  const ids = (await t.controls()).map(c => c.id);
  t.check([1, 2, 27, 3, 4, 5, 6, 7, 11, 19].every(id => ids.includes(id)), 'Top bar and play controls are presented', ids.join(','));
  await t.control(2); await t.shot('new-match-menu', { controls: [29, 30, 33, 35] });
  await t.control(34); await t.control(29); await t.count(0);
  const game = await t.verify('layout C start');
  t.check(game && game.state.holes === ((1 << 6) | (1 << 10)), 'Layout C start has holes at C2 and C3');
  await t.shot('layout-c', { squares: [sq('e3'), sq('f6'), sq('d4'), sq('g5')] });
});

// Rules §10 defaults: destination overlays off, Shift indicators on, selection always shown.
await scenario('defaults', DESKTOP, async t => {
  await t.open({}, { targets: false });
  const board = () => t.page.evaluate(() => { const c = document.querySelector('canvas'), o = document.createElement('canvas');
    o.width = 512; o.height = 512; o.getContext('2d').drawImage(c, 0, 128, 512, 512, 0, 0, 512, 512); return o.toDataURL(); });
  await t.shot('start', { squares: [sq('c3'), sq('a3'), sq('e3'), sq('c5')] });
  await t.clickSquare(sq('g1'), 16);
  const listed = (await t.controls()).filter(c => c.id >= 1000 || c.id === 47);
  t.check(listed.length === 0, 'TARGETS off: the pane lists no destinations', listed.map(c => c.label).join(','));
  t.check((await t.summary()).includes('Selected g1.'), 'The selection is announced with TARGETS off', await t.summary());
  await t.shot('selected-targets-off', { squares: [sq('g1'), sq('f3'), sq('h3')] });
  await t.play(mv('g1', 'f3')); await t.play(mv('b8', 'a6'));
  await t.clickSquare(sq('e4'));
  t.check((await t.summary()).includes('Selected tile C2.'), 'An empty platform with a legal Shift is selectable');
  await t.shot('tile-targets-off', { squares: [sq('e3'), sq('c3')] });
  await t.control(4);
  await t.control(1); await t.shot('settings-overlays', { controls: [53, 54] });
  const toggles = (await t.controls()).filter(c => c.id === 53 || c.id === 54).map(c => [c.id, c.active]);
  t.check(JSON.stringify(toggles) === '[[53,false],[54,true]]', 'TARGETS starts off and SHIFTS on', JSON.stringify(toggles));
  await t.control(53); await t.control(28);
  await t.clickSquare(sq('f3'), 16);
  t.check(await t.has(1000 + mv('f3', 'e5')), 'TARGETS on lists destinations');
  await t.shot('selected-targets-on', { squares: [sq('f3'), sq('e5'), sq('g5'), sq('d4')] });
  await t.control(4);
  const marked = await board();
  await t.control(1); await t.control(54); await t.control(28);
  t.check(marked !== await board(), 'SHIFTS off removes the Shift indicators from the board');
  await t.shot('shifts-off', { squares: [sq('c3'), sq('a3'), sq('e3'), sq('c5')] });
  const prefs = JSON.parse(await t.page.evaluate(k => localStorage.getItem(k), PREFS));
  t.check(prefs.showMoves === true && prefs.showShifts === false, 'Overlay preferences persist', JSON.stringify(prefs));
  await t.page.reload({ waitUntil: 'networkidle' }); await t.ready();
  await t.control(1);
  const reloaded = (await t.controls()).filter(c => c.id === 53 || c.id === 54).map(c => [c.id, c.active]);
  t.check(JSON.stringify(reloaded) === '[[53,true],[54,false]]', 'Overlay preferences survive reload', JSON.stringify(reloaded));
  await t.control(54); await t.control(53); await t.control(28);
  await t.control(55); await t.shot('history', {});
  t.check((await t.shown()).menu === 10 && !(await t.has(45)) && !(await t.has(46)), 'Short history has one page');
  await t.control(28);
});

await scenario('selection', DESKTOP, async t => {
  await t.open();
  await t.hover(sq('e2'), 16); await t.shot('hover-e2', { squares: [sq('e2')] });
  await t.clickSquare(sq('g1'), 16);
  t.check(await t.has(1000 + mv('g1', 'f3')) && await t.has(1000 + mv('g1', 'h3')), 'Selecting g1 offers f3 and h3');
  await t.shot('selected-g1', { squares: [sq('g1'), sq('f3'), sq('h3')], controls: [1000 + mv('g1', 'f3')] });
  await t.clickSquare(sq('g1'), 16);
  t.check(!(await t.has(4)), 'Second click on the selected piece deselects it');
  await t.clickSquare(sq('g1'), 16); await t.clickSquare(sq('b1'), 16);
  t.check(await t.has(1000 + mv('b1', 'a3')) && !(await t.has(1000 + mv('g1', 'f3'))), 'Clicking another own piece moves the selection');
  await t.clickSquare(sq('e4'));
  t.check(await t.has(1000 + sh('C2', 'B2')), 'Clicking an empty platform selects it and offers its Shift');
  await t.shot('tile-selected', { squares: [sq('e3'), sq('f4'), sq('c3'), sq('d4')] });
  await t.control(4); t.check(!(await t.has(4)), 'CLEAR removes the selection');
  await t.clickSquare(sq('c4'));
  const hole = await t.shown();
  t.check(!(await t.has(4)), 'Clicking an empty hole with nothing selected does not select the hole', `menu ${hole.menu}`, 'minor');
  await t.shot('hole-click', { squares: [sq('c4')] });
  await t.clickSquare(sq('g4'));
  t.check(!(await t.has(4)), 'Clicking an empty platform with no legal Shift selects nothing');
  await t.clickSquare(sq('e7'), 16);
  t.check(!(await t.has(4)), 'Clicking an opponent piece selects nothing');
  await t.control(4).catch(() => {});
  await t.clickSquare(sq('e2'), 16);
  t.check(!(await t.has(5)), 'SHIFT is disabled when the selected piece\'s platform has no legal Shift');
  await t.shot('shift-on-king-tile', { controls: [5, 4] });
  await t.page.keyboard.press('Escape'); await t.ready();
  t.check(!(await t.has(4)), 'Escape clears the selection');
  // Keyboard-only move: walk the focus to the a1 corner, then to e2, select, walk to e4, commit.
  await t.page.locator('canvas').focus();
  for (const key of [...Array(7).fill('ArrowLeft'), ...Array(7).fill('ArrowDown'), 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp']) { await t.page.keyboard.press(key); await t.ready(); }
  await t.shot('keyboard-focus-e2', { squares: [sq('e2')] });
  await t.page.keyboard.press('Enter'); await t.ready();
  t.check(await t.has(1000 + mv('e2', 'e4')), 'Enter on a focused own piece selects it');
  for (const key of ['ArrowUp', 'ArrowUp']) { await t.page.keyboard.press(key); await t.ready(); }
  await t.page.keyboard.press('Enter'); await t.count(1);
  await t.verify('keyboard e2e4');
  // Drag and drop: press on e7, drag to e5, release.
  const shown = await t.shown();
  const from = await t.toPage(...Object.values(t.canvasSquare(shown, sq('e7'), 16)));
  const to = await t.toPage(...Object.values(t.canvasSquare(shown, sq('e5'))));
  await t.page.mouse.move(from.x, from.y); await t.page.mouse.down();
  await t.page.mouse.move(to.x, to.y, { steps: 10 }); await t.shot('drag-in-flight', { squares: [sq('e7'), sq('e5')] });
  await t.page.mouse.up(); await t.ready(); await t.page.waitForTimeout(300); await t.ready();
  const dragged = await t.commands();
  t.check(dragged === 2, 'Dragging a piece onto a legal destination moves it', `commands ${dragged}`, 'minor');
  if (dragged === 1) { await t.clickSquare(sq('e5')); await t.count(2); }
  await t.verify('after drag');
  // Clicking the next piece while the previous move animates.
  await t.clickSquare(sq('g1'), 16);
  const c = await t.canvasSquare(await t.shown(), sq('f3'));
  const p = await t.toPage(c.x, c.y), q = await t.toPage(...Object.values(t.canvasSquare(await t.shown(), sq('b8'), 16)));
  await t.page.mouse.click(p.x, p.y); await t.page.waitForTimeout(40); await t.page.mouse.click(q.x, q.y);
  await t.count(3); await t.page.waitForTimeout(150); await t.ready();
  t.check(await t.has(1000 + mv('b8', 'a6')), 'A click made during the move animation is not lost', 'b8 not selected after mid-animation click', 'minor');
  await t.shot('after-animation-click', { squares: [sq('b8'), sq('f3')] });
});

await scenario('hotseat-black-mates', DESKTOP, async t => {
  await t.open();
  await t.play(mv('f2', 'f3')); await t.play(mv('e7', 'e5')); await t.play(mv('g2', 'g4'));
  await t.clickSquare(sq('d8'), 16); await t.shot('queen-selected', { squares: [sq('d8'), sq('h4')] });
  await t.motion(true);
  await t.clickSquare(sq('h4')); await t.count(4);
  await t.saveMotion('queen-mate', await t.motion(false));
  const game = await t.verify('fool mate');
  t.check(game?.outcome()?.reason === 'checkmate', 'Fool mate is checkmate');
  await t.shot('checkmate', { squares: [sq('e1'), sq('h4'), sq('f2')], controls: [3, 6, 7] });
  await t.clickSquare(sq('e2'), 16);
  t.check(!(await t.has(4)), 'A finished game ignores board selection');
  t.check(!(await t.has(6)) && !(await t.has(7)), 'Draw and resign are disabled after checkmate');
  await t.control(3); t.check((await t.shown()).menu === 8, 'Undo after mate asks for agreement');
  await t.shot('undo-request', { controls: [48, 28] });
  await t.control(48); await t.count(5);
  const undone = await t.verify('undo mate');
  t.check(undone && !undone.outcome(), 'Agreed undo reopens the game');
});

await scenario('hotseat-white-mates', DESKTOP, async t => {
  await t.open();
  for (const id of [mv('e2', 'e4'), mv('f7', 'f6'), mv('a2', 'a3'), mv('g7', 'g5')]) await t.play(id);
  await t.motion(true); await t.play(mv('d1', 'h5')); await t.saveMotion('queen-h5', await t.motion(false));
  await t.shot('white-mates', { squares: [sq('e8'), sq('h5'), sq('g6')] });
});

await scenario('castle-en-passant', DESKTOP, async t => {
  await t.open();
  for (const id of [mv('e2', 'e4'), mv('e7', 'e5'), mv('g1', 'f3'), mv('g8', 'f6'), mv('f1', 'e2'), mv('f8', 'e7')]) await t.play(id);
  await t.clickSquare(sq('e1'), 16); await t.shot('king-castle-targets', { squares: [sq('e1'), sq('g1')] });
  await t.control(4);
  await t.motion(true); await t.play(mv('e1', 'g1')); await t.saveMotion('white-castles', await t.motion(false));
  await t.play(mv('e8', 'g8'));
  await t.shot('both-castled', { squares: [sq('g1'), sq('f1'), sq('g8'), sq('f8')] });
  for (const id of [mv('h2', 'h4'), mv('a7', 'a6'), mv('h4', 'h5'), mv('g7', 'g5')]) await t.play(id);
  await t.clickSquare(sq('h5'), 16); await t.shot('en-passant-target', { squares: [sq('h5'), sq('g6'), sq('g5')] }); await t.control(4);
  await t.motion(true); await t.play(mv('h5', 'g6')); await t.saveMotion('en-passant', await t.motion(false));
  await t.shot('en-passant-done', { squares: [sq('g6'), sq('g5')] });
  // Queenside castling on layout C.
  await t.control(2); await t.control(34); await t.control(29); await t.count(0);
  for (const id of [mv('d2', 'd4'), mv('a7', 'a6'), mv('b1', 'c3'), mv('b7', 'b6'), mv('d1', 'd3'), mv('a6', 'a5'), mv('c1', 'd2'), mv('b6', 'b5')]) await t.play(id);
  await t.play(mv('e1', 'c1'));
  await t.shot('queenside-castled', { squares: [sq('c1'), sq('d1'), sq('a1')] });
});

await scenario('promotion', DESKTOP, async t => {
  await t.open();
  const base = [2680, 15845, 7845, 18440, 10765, 17835, 13365, 15235];
  await t.upload(record('B', 0, base));
  await t.verify('promotion fixture');
  await t.clickSquare(sq('b7'), 16); await t.shot('pawn-b7', { squares: [sq('b7'), sq('b8'), sq('a8'), sq('c8')] });
  await t.clickSquare(sq('b8'));
  t.check((await t.shown()).menu === 4, 'Promotion chooser opens');
  await t.shot('promotion-menu', { controls: [38, 39, 40, 41, 28] });
  await t.control(28);
  t.check((await t.commands()) === 8, 'Closing the chooser commits nothing');
  for (const [i, p] of ['Q', 'R', 'B', 'N'].entries()) {
    await t.play(mv('b7', 'b8', p));
    await t.shot(`promoted-${p}`, { squares: [sq('b8')] });
    if (i < 3) { await t.control(3); await t.control(48); await t.count(10 + i * 2); await t.verify(`undo ${p}`); }
  }
  const shiftBase = fixtures.shiftPromotion.actions;
  await t.upload(record('B', 0, shiftBase.slice(0, -1)));
  await t.shot('before-shift-promotion', { squares: [] });
  await t.play(shiftBase.at(-1));
  await t.shot('shift-promoted', {});
});

await scenario('shift', DESKTOP, async t => {
  await t.open();
  await t.clickSquare(sq('f4'));
  await t.shot('tile-c2-selected', { squares: [sq('e3'), sq('f4'), sq('c3')] });
  await t.control(4);
  await t.motion(true); await t.play(sh('C2', 'B2')); await t.saveMotion('empty-shift', await t.motion(false));
  await t.shot('after-empty-shift', { squares: [sq('c3'), sq('e3'), sq('e4')] });
  await t.play(sh('C3', 'B3'), { via: 'control' });
  await t.play(mv('g1', 'h3')); await t.play(mv('h7', 'h6'));
  const game = await t.verify('knight beside the hole');
  const carried = game.legalActions().find(a => a.id === sh('D2', 'C2'));
  if (t.check(carried, 'The knight platform D2 can Shift into C2')) {
    await t.clickSquare(sq('h3'), 16); await t.shot('knight-selected-before-shift', { controls: [5] });
    await t.control(5); await t.shot('knight-platform-selected', { squares: [sq('g3'), sq('e3')] });
    await t.control(4);
    await t.motion(true); await t.play(carried.id); await t.saveMotion('carry-shift', await t.motion(false));
    await t.shot('after-carry', { squares: [sq('f3'), sq('h3')] });
  }
  await t.upload(record('B', 0, fixtures.shiftMate.actions.slice(0, -1)));
  await t.play(fixtures.shiftMate.actions.at(-1));
  await t.shot('shift-checkmate', {});
});

await scenario('draws', DESKTOP, async t => {
  await t.open();
  for (const [name, fixture] of Object.entries({ threefold: fixtures.threefold, stalemate: fixtures.stalemate,
    bareKings: fixtures.bareKings, progress100: fixtures.progress100, checkmate: fixtures.checkmate })) {
    await t.upload(record(fixture.layout, fixture.policy, fixture.actions.slice(0, -1)));
    await t.play(fixture.actions.at(-1));
    const game = await t.verify(name);
    t.check(game?.outcome()?.reason === fixture.outcome, `${name} reaches ${fixture.outcome}`);
    await t.shot(name, { controls: [3, 6, 7] });
  }
  const quiet = fixtures.progress100.actions;
  await t.upload(record('B', 0, quiet.slice(0, -1)));
  await t.play(quiet.at(-1));
  await t.shot('prompt-policy-past-100', {});
  t.check(!(await t.verify('prompt at 100'))?.outcome(), 'Prompt policy keeps playing past 100 quiet actions');
  await t.control(55);
  t.check((await t.has(45)) && !(await t.has(46)), 'A long history opens at its last page');
  await t.shot('history-last-page', {});
  await t.control(45); t.check(await t.has(46), 'PREV pages back and enables NEXT');
  await t.shot('history-previous-page', {});
  await t.control(28);
  // Hotseat agreement, decline, resignation.
  await t.control(2); await t.control(30); await t.control(33); await t.control(35); await t.control(29); await t.count(0);
  await t.play(mv('e2', 'e4'));
  await t.control(6); await t.shot('offer-menu', { controls: [49, 50, 28] });
  await t.control(50); await t.count(2); await t.shot('black-offered', { controls: [8, 9] });
  await t.control(9); await t.count(3); await t.verify('declined');
  await t.control(6); await t.control(49); await t.count(4); await t.control(8); await t.count(5);
  await t.verify('agreed'); await t.shot('agreed', { controls: [3, 6] });
  await t.control(3); await t.control(48); await t.count(6); await t.verify('undo agreement');
  await t.control(7); await t.shot('resign-menu', { controls: [51, 52, 42] });
  await t.control(52); await t.control(42); await t.count(7); await t.verify('black resigned');
  await t.shot('resigned', {});
  // Bot mode: offer is answered by the bot; resignation confirms directly.
  await t.control(2); await t.control(31); await t.control(29); await t.count(0);
  await t.control(6); await t.page.waitForTimeout(200); await t.ready();
  await t.verify('bot answered offer');
  await t.shot('bot-offer-answer', {});
  await t.control(7); await t.control(42); await t.count((await t.commands())); await t.verify('bot-mode resignation');
});

async function botGame(t, mode) {
  await t.open();
  await t.control(2); await t.control(mode === 1 ? 31 : 32); await t.control(29);
  await t.ready();
  const thinks = [];
  let plies = await t.commands(), game = await t.verify('bot start');
  t.check(mode === 1 ? plies === 0 : plies === 1, 'Bot opens only when it plays White', `commands ${plies}`);
  while (game && !game.outcome() && plies < 180) {
    const id = humanChoice(game);
    const before = await t.commands();
    const frames = await t.page.evaluate(() => window.__frames.length);
    game = await t.play(id);
    plies = await t.commands();
    if (plies === before + 2) {
      const ticks = await t.page.evaluate(start => window.__frames.slice(start).filter(f => f.kinds.includes('Tick')).map(f => f.ms), frames);
      thinks.push(Math.max(...ticks));
    } else t.check(game?.outcome(), 'Bot replies to every non-terminal human action', `commands ${before} -> ${plies}`);
    if (plies % 30 < 2) await t.shot(`ply-${plies}`, {});
  }
  if (game && !game.outcome()) { await t.control(7); await t.control(42); game = await t.verify('resign at cap'); }
  thinks.sort((a, b) => a - b);
  t.result.timings.botReplyFrameMs = { n: thinks.length, median: thinks[thinks.length >> 1], p95: thinks[Math.floor(thinks.length * 0.95)], max: thinks.at(-1) };
  t.result.outcome = game?.outcome();
  t.check(game?.outcome(), 'Bot game reaches a terminal state', JSON.stringify(game?.outcome()));
  await t.shot('final', { controls: [3, 6, 7] });
}
await scenario('bot-white', DESKTOP, t => botGame(t, 1));
await scenario('bot-black', DESKTOP, t => botGame(t, 2));

await scenario('undo', DESKTOP, async t => {
  await t.open();
  await t.play(mv('e2', 'e4')); await t.play(mv('e7', 'e5'));
  await t.control(3); t.check((await t.shown()).menu === 8, 'Hotseat undo opens agreement');
  await t.control(28); t.check((await t.commands()) === 2, 'Cancel keeps the journal');
  await t.control(3); await t.control(48); await t.count(3); await t.verify('hotseat undo');
  await t.control(2); await t.control(31); await t.control(29); await t.count(0);
  await t.play(mv('e2', 'e4')); await t.count(2);
  await t.control(3); await t.count(3); await t.verify('bot undo');
  t.check(await t.has(10), 'Bot undo pauses the bot and offers RESUME');
  await t.shot('bot-paused', { controls: [10, 3] });
  await t.page.reload({ waitUntil: 'networkidle' }); await t.ready();
  t.check(await t.has(10), 'Bot pause survives reload');
  await t.control(10); await t.count(4); await t.verify('bot resumed');
});

await scenario('camera', DESKTOP, async t => {
  await t.open();
  const drag = async (dx, dy, alt = false, shots = false) => {
    const c = await t.toPage(265, 345);
    const images = [];
    if (alt) await t.page.keyboard.down('Alt');
    await t.page.mouse.move(c.x, c.y); await t.page.mouse.down({ button: alt ? 'left' : 'right' });
    for (let i = 1; i <= 20; i++) {
      await t.page.mouse.move(c.x + dx * i / 20, c.y + dy * i / 20); await t.page.waitForTimeout(20);
      if (shots && i % 5 === 0) images.push(await t.page.evaluate(() => document.querySelector('canvas').toDataURL()));
    }
    await t.page.mouse.up({ button: alt ? 'left' : 'right' }); if (alt) await t.page.keyboard.up('Alt');
    await t.ready();
    return images;
  };
  const stats = await t.frames('orbit-drag', async () => { await t.saveMotion('orbit', await drag(120, 60, false, true)); });
  await t.shot('orbited', { squares: [sq('e1'), sq('d8')] });
  const pick = async tag => {
    await t.clickSquare(sq('g1'), 16);
    const ok = await t.has(1000 + mv('g1', 'f3'));
    t.check(ok, `Canvas picking selects g1 at ${tag}`, JSON.stringify((await t.shown()).view));
    await t.shot(`pick-${tag}`, { squares: [sq('g1'), sq('f3')] });
    if (ok) await t.control(4);
  };
  await pick('orbit');
  await drag(-80, -30, true); await pick('alt-orbit');
  for (let i = 0; i < 12; i++) await t.control(16);
  t.check((await t.shown()).view.pitch === 35, 'DOWN clamps pitch at 35', JSON.stringify((await t.shown()).view));
  for (let i = 0; i < 8; i++) await t.control(17);
  t.check((await t.shown()).view.zoom === 115, 'ZOOM+ clamps at 115');
  await pick('low-pitch-max-zoom');
  for (let i = 0; i < 12; i++) await t.control(15);
  t.check((await t.shown()).view.pitch === 90, 'UP clamps pitch at 90');
  await pick('top-max-zoom');
  for (let i = 0; i < 10; i++) await t.control(18);
  t.check((await t.shown()).view.zoom === 75, 'ZOOM- clamps at 75');
  await t.control(11); await t.control(12); await pick('overhead');
  for (let i = 0; i < 6; i++) await t.control(14);
  await pick('right-90');
  await t.control(19);
  await t.page.locator('canvas').focus();
  const c = await t.toPage(256, 400); await t.page.mouse.move(c.x, c.y);
  await t.change(() => t.page.mouse.wheel(0, -400));
  t.check((await t.shown()).view.zoom > 100, 'Wheel up zooms in', JSON.stringify((await t.shown()).view));
  await t.shot('wheel-zoom', {});
  for (const key of ['ArrowLeft', 'ArrowUp']) { await t.page.keyboard.down('Alt'); await t.page.keyboard.press(key); await t.page.keyboard.up('Alt'); await t.ready(); }
  await t.shot('alt-arrows', {});
  t.result.timings.orbit = stats;
});

await scenario('menus', DESKTOP, async t => {
  await t.open();
  await t.control(1); await t.shot('settings', { controls: [22, 23, 24, 25, 26, 20, 21] });
  await t.control(23); await t.shot('warm-settings', {});
  await t.control(28); await t.shot('warm-play', { squares: [sq('e1'), sq('e4')] });
  await t.control(1); await t.control(22);
  for (let i = 0; i < 16; i++) await t.control(25);
  t.check((await t.summary()) !== null, 'Volume up');
  await t.shot('volume-max', {});
  for (let i = 0; i < 24; i++) await t.control(26);
  await t.shot('volume-min', {});
  const prefs = JSON.parse(await t.page.evaluate(k => localStorage.getItem(k), PREFS));
  t.check(prefs.volume === 0 || prefs.volume <= 0.05, 'Volume floor persists', JSON.stringify(prefs));
  for (let i = 0; i < 6; i++) await t.control(25);
  await t.control(28);
  const sounds = await t.page.evaluate(() => window.__sounds.length);
  await t.play(mv('e2', 'e4'));
  t.check((await t.page.evaluate(() => window.__sounds.length)) > sounds, 'Moves emit Bend PCM with sound on');
  await t.control(1); await t.control(24); await t.shot('sound-off', { controls: [24] }); await t.control(28);
  const muted = await t.page.evaluate(() => window.__sounds.length);
  await t.play(mv('e7', 'e5'));
  t.check((await t.page.evaluate(() => window.__sounds.length)) === muted, 'SOUND off stops PCM effects');
  await t.control(1);
  const download = t.page.waitForEvent('download');
  await t.control(20, { settle: false });
  const exported = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
  await t.page.waitForTimeout(100); await t.ready();
  t.check(JSON.stringify(exported) === JSON.stringify(await t.record()), 'EXPORT downloads the stored record');
  await t.control(28);
  await t.control(27); await t.shot('help', { rects: [{ name: 'help-copy', x: 560, y: 240, w: 440, h: 90, scale: 3 }] });
  await t.control(44); t.check((await t.page.evaluate(() => window.__opened)).length === 1, 'ORIGINAL opens the published game');
  await t.control(28);
  await t.control(2); await t.control(33); await t.control(36); await t.control(29); await t.count(0);
  t.check((await t.summary()).includes('Rift Chess. WHITE TO MOVE.'), 'New match starts');
  await t.shot('auto-policy', { rects: [{ name: 'policy-line', x: 560, y: 180, w: 440, h: 30, scale: 3 }] });
  // Desktop overflow: find a reachable piece with more than 12 destinations.
  let found = null;
  for (const fixture of [fixtures.progress100, fixtures.stalemate, fixtures.bareKings]) {
    for (let n = 1; n < fixture.actions.length && !found; n++) {
      const game = replayRecord(record(fixture.layout, 0, fixture.actions.slice(0, n)));
      if (game.outcome()) break;
      const groups = new Map();
      for (const a of game.legalActions()) if (a.type === 'move') { const s = sq(a.from); groups.set(s, (groups.get(s) || new Set()).add(Math.floor(a.id / 5))); }
      for (const [s, set] of groups) if (set.size > 12) { found = { fixture, n, square: s }; break; }
    }
    if (found) break;
  }
  if (t.check(found, 'Reference search finds a piece with more than 12 destinations')) {
    await t.upload(record(found.fixture.layout, 0, found.fixture.actions.slice(0, found.n)));
    await t.clickSquare(found.square, 16);
    t.check(await t.has(47), 'More than 12 destinations collapse to MOVES');
    await t.shot('moves-overflow', { controls: [47] });
    await t.control(47); await t.shot('legal-moves-panel', {});
    const choice = (await t.controls()).find(c => c.id >= 1000);
    await t.control(choice.id);
    if ((await t.shown()).menu === 4) await t.control(38);
    await t.count(found.n + 1); await t.verify('overflow move');
  }
});

await scenario('persistence', DESKTOP, async t => {
  await t.open();
  await t.play(mv('e2', 'e4')); await t.play(mv('e7', 'e5'));
  await t.control(14); await t.control(1); await t.control(23); await t.control(28);
  await t.clickSquare(sq('g1'), 16);
  const saved = await t.record(), view = (await t.shown()).view;
  await t.page.reload({ waitUntil: 'networkidle' }); await t.ready();
  t.check(JSON.stringify(await t.record()) === JSON.stringify(saved), 'Reload keeps the record');
  t.check(JSON.stringify((await t.shown()).view) === JSON.stringify(view), 'Reload keeps the camera');
  await t.verify('reloaded'); await t.shot('reloaded', {});
  await t.page.evaluate(k => localStorage.setItem(k, '{"schema":"rift-bend-record/1","layout":"B","policy":0,"commands":[{"$":"MoveCommand","expected":0,"action":1}]}'), SAVE);
  await t.page.reload({ waitUntil: 'networkidle' }); await t.ready();
  t.check((await t.shown()).menu === 6, 'Illegal saved command opens recovery');
  await t.shot('recovery', { controls: [43, 44, 28] });
  const download = t.page.waitForEvent('download');
  await t.control(43, { settle: false });
  t.check((await fs.readFile(await (await download).path(), 'utf8')).includes('"action":1'), 'RECOV downloads the original text');
  await t.page.waitForTimeout(100); await t.ready();
  await t.control(2); await t.control(29); await t.count(0);
  await t.page.evaluate(k => localStorage.setItem(k, 'not json at all'), PREFS);
  await t.page.reload({ waitUntil: 'networkidle' }); await t.ready();
  await t.shot('bad-preferences', {});
  t.check((await t.summary()).includes('WHITE TO MOVE'), 'Garbage preferences fall back to defaults');
  await t.page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await t.page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await t.context.setOffline(true); await t.page.reload({ waitUntil: 'domcontentloaded' }); await t.ready();
  await t.play(mv('e2', 'e4')); await t.shot('offline-move', {});
  await t.context.setOffline(false);
});

await scenario('mobile', PHONE, async t => {
  await t.open();
  await t.shot('start', { squares: [sq('e1'), sq('d8')], controls: [1, 2, 27], pageShot: true });
  await t.clickSquare(sq('g1'), 16); await t.shot('selected', { controls: [1000 + mv('g1', 'f3')], squares: [sq('g1')] });
  await t.play(mv('g1', 'f3')); await t.play(mv('b8', 'a6'));
  for (const id of [1, 27, 2]) { await t.control(id); await t.shot(`menu-${id}`, { pageShot: id === 1 }); await t.control(28); }
  await t.upload(record('B', 0, [2680, 15845, 7845, 18440, 10765, 17835, 13365, 15235]));
  await t.play(mv('b7', 'b8', 'N')); await t.shot('underpromoted', { squares: [sq('b8')] });
  await t.upload(record('B', 0, [3980, 15560, 1155, 15885]));
  await t.clickSquare(sq('h5'), 16);
  t.check(await t.has(47), 'Mobile queen overflow shows MOVES');
  await t.control(47); await t.shot('moves-panel', {});
  await t.control(28);
  await t.shot('after-close', {});
});

await scenario('resize', DESKTOP, async t => {
  await t.open();
  await t.play(mv('e2', 'e4'));
  await t.clickSquare(sq('e7'), 16);
  for (const size of [PHONE, { width: 899, height: 700 }, { width: 1920, height: 1080 }, { width: 800, height: 600 }, { width: 1024, height: 768 }, DESKTOP]) {
    await t.page.setViewportSize(size); await t.page.waitForTimeout(150); await t.ready();
    const box = await t.page.locator('canvas').boundingBox();
    const tag = `${size.width}x${size.height}`;
    t.result.checks.push({ ok: true, title: `canvas box at ${tag}`, detail: JSON.stringify(box) });
    if (box.height > size.height + 1) t.defect('minor', `Canvas taller than the viewport at ${tag}`, `canvas ${Math.round(box.width)}x${Math.round(box.height)}`);
    t.check(await t.has(1000 + mv('e7', 'e5')), `Selection survives resize to ${tag}`);
    await t.shot(`size-${tag}`, { pageShot: true });
  }
  await t.clickSquare(sq('e5')); await t.count(2); await t.verify('move after resizes');
});

// Worker compute (ms) and port encode/audio (port.ms) per interaction class, for
// before/after comparisons of the same build steps. Not a native benchmark.
await scenario('perf', DESKTOP, async t => {
  await t.open();
  await t.frames('hover', async () => {
    for (const s of ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', 'h1', 'g1', 'f1', 'e1']) await t.hover(sq(s), 16);
  });
  await t.frames('select', async () => {
    for (let i = 0; i < 6; i++) { await t.clickSquare(sq('g1'), 16); await t.clickSquare(sq('g1'), 16); }
  });
  await t.frames('move', async () => {
    for (const id of [mv('e2', 'e4'), mv('e7', 'e5'), mv('g1', 'f3'), mv('b8', 'a6'), mv('f1', 'e2'), mv('g8', 'f6')]) await t.play(id, { via: 'control' });
  });
  await t.frames('orbit', async () => {
    const c = await t.toPage(265, 345);
    await t.page.mouse.move(c.x, c.y); await t.page.mouse.down({ button: 'right' });
    for (let i = 1; i <= 30; i++) { await t.page.mouse.move(c.x + i * 4, c.y + i); await t.page.waitForTimeout(16); }
    await t.page.mouse.up({ button: 'right' }); await t.ready();
  });
  await t.frames('menu', async () => {
    for (let i = 0; i < 4; i++) { await t.control(1); await t.control(28); }
  });
  console.log(`  perf ${JSON.stringify(t.result.timings)}`);
});

// ---- report ----------------------------------------------------------------------------
await browser.close();
const bySeverity = summary.defects.reduce((m, d) => (m[d.severity] = (m[d.severity] || 0) + 1, m), {});
summary.counts = bySeverity;
await fs.mkdir(root, { recursive: true });
await fs.writeFile(path.join(root, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ out: root, scenarios: summary.scenarios.map(s => ({ name: s.name, ok: s.ok, seconds: s.seconds, defects: s.defects.length })), counts: bySeverity }, null, 1));
process.exitCode = summary.defects.some(d => d.severity !== 'polish') ? 1 : 0;
