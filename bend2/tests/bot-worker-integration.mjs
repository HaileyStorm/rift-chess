import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, cacheDir, assertCache } from '../tools/selected-modules.mjs';

assertCache('controller');
const api = (await import(pathToFileURL(path.join(cacheDir, 'controller.js')).href)).default;
const botEntry = pathToFileURL(path.join(root, '.artifacts/bend2/v2-preview/worker-libs/bot/index.mjs'));
const list = (items) => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const array = (node) => {
  const items = [];
  while (node?.$ === 'Con') { items.push(node.head); node = node.tail; }
  assert.equal(node?.$, 'Nil');
  return items;
};
const tick = { $: 'Tick', ms: 240 };

class NodeWorkerAdapter {
  constructor(url) {
    this.listeners = new Map();
    const entry = url instanceof URL ? url.href : String(url);
    this.worker = new Worker(new URL('./bot-worker-bootstrap.mjs', import.meta.url), {
      workerData: { entry }, execArgv: [],
    });
    this.worker.on('error', () => {});
  }
  addEventListener(type, callback) {
    const wrapped = type === 'message' ? (data) => callback({ data })
      : (error) => callback({ error, message: error?.message, preventDefault() {} });
    this.listeners.set(callback, [type, wrapped]);
    this.worker.on(type, wrapped);
  }
  removeEventListener(type, callback) {
    const entry = this.listeners.get(callback);
    if (entry) { this.worker.off(entry[0], entry[1]); this.listeners.delete(callback); }
  }
  postMessage(message, transfer = []) { this.worker.postMessage(message, transfer); }
  terminate() { return this.worker.terminate(); }
}
const nodeWorkerFactory = (url) => new NodeWorkerAdapter(url);
const invoke = (name, event, packet, native = false) =>
  api[native ? 'dispatch_at' : 'dispatch_at_web'](list([event]), packet.presentation, packet.session);

function botReadyPacket() {
  let packet = api.boot_reads('', '', true, true, 1024, 768);
  packet = { ...packet, session: { ...packet.session,
    program: { ...packet.session.program,
      prefs: { ...packet.session.program.prefs, mode: 1 } } } };
  const ids = array(packet.session.program.legal);
  const id = ids.find((candidate) => candidate < 20480 && candidate % 5 === 0);
  assert.notEqual(id, undefined, 'starting board has a normal human move');
  const quotient = Math.floor(id / 5);
  const from = Math.floor(quotient / 64), to = quotient % 64;
  const revision = packet.presentation.revision;
  packet = invoke('move-source', { $: 'SquareInput', square: from, expected: revision }, packet);
  packet = invoke('move-target', { $: 'SquareInput', square: to, expected: revision }, packet);
  assert.equal(packet.session.program.intent, id, 'destination is staged before the tick');
  assert.equal(api.bot_job(packet.session).eligible, false,
    'the staged human move is not exposed as a bot job');
  packet = invoke('commit-staged', tick, packet);
  assert.equal(packet.presentation.revision, revision + 1, 'staged move commits exactly once');
  const animating = api.bot_job(packet.session);
  assert.equal(animating.eligible, true, 'Bend makes the next side eligible during animation');
  assert.equal(animating.canApply, false, 'a result cannot commit during the move animation');
  packet = invoke('settle-animation', tick, packet);
  const job = api.bot_job(packet.session);
  assert.equal(job.eligible, true);
  assert.equal(job.canApply, true);
  assert.equal(job.revision, packet.presentation.revision);
  assert.deepEqual(job.position, packet.snapshot.frame.position);
  assert.deepEqual(array(job.ids), array(packet.session.program.legal));
  return { packet, job };
}

test('Bend browser bot boundary: staging, tick, decline, exact choice, guards, fallback and disposal', async () => {
  const { packet, job } = botReadyPacket();
  const deferred = invoke('deferred-bot-tick', { $: 'Tick', ms: 16 }, packet);
  assert.equal(deferred.presentation.revision, job.revision,
    'browser tick waits for the separate worker choice');

  const native = invoke('native-bot-tick', { $: 'Tick', ms: 16 }, packet, true);
  assert.equal(native.presentation.revision, job.revision + 1,
    'the native controller still chooses synchronously');

  const { createSession } = await import(botEntry.href);
  const worker = createSession({ workers: 2, transport: 'clone', workerFactory: nodeWorkerFactory });
  try {
    await worker.warmup();
    const choicePending = worker.call('choose', [job.position, job.ids]);
    const interrupted = invoke('open-menu-during-bot-compute', { $: 'Activate', id: 1 }, packet);
    assert.equal(api.bot_job(interrupted.session).eligible, false,
      'an intervening Bend UI action invalidates the active bot request');
    const id = await choicePending;
    assert.ok(array(job.ids).includes(id), 'the helper returns one of Bend’s legal IDs');
    const blocked = api.bot_apply_at(job.revision, id, interrupted.session);
    assert.equal(blocked.presentation.revision, job.revision,
      'a result arriving during an intervening UI action cannot be committed');
    const resumed = invoke('close-menu-after-bot-compute', { $: 'Activate', id: 28 }, interrupted);
    assert.equal(api.bot_job(resumed.session).canApply, true);
    const applied = api.bot_apply_at(job.revision, id, resumed.session);
    assert.equal(applied.presentation.revision, job.revision + 1);
    assert.deepEqual(applied.snapshot.frame.position, native.snapshot.frame.position,
      'the helper choice exactly matches the unchanged serial/native scorer');
    assert.ok(worker.stats().requiredWitnesses > 0, 'the worker package requires helper execution');
    assert.ok(worker.stats().remoteJobs > 0);

    const stale = api.bot_apply_at(job.revision - 1, id, packet.session);
    assert.equal(stale.presentation.revision, job.revision, 'stale revision cannot move');
    const invalid = api.bot_apply_at(job.revision, 21760, packet.session);
    assert.equal(invalid.presentation.revision, job.revision, 'non-legal worker ID cannot move');
    const fallback = api.bot_fallback_at(job.revision, packet.session);
    assert.deepEqual(fallback.snapshot.frame.position, native.snapshot.frame.position,
      'capability fallback uses the exact serial scorer');
  } finally {
    worker.close();
  }
  assert.equal(worker.stats().closed, true);
  assert.equal(worker.stats().inFlight, 0);

  const offeredBase = botReadyPacket().packet;
  let offered = invoke('offer-draw', { $: 'Activate', id: 6 }, offeredBase);
  assert.notEqual(offered.session.program.meta.offer, 0, 'human draw offer reaches Bend state');
  assert.equal(api.bot_job(offered.session).eligible, false,
    'a bot offer response takes precedence over starting a move job');
  const beforeDecline = offered.presentation.revision;
  offered = invoke('decline-bot-offer', { $: 'Tick', ms: 16 }, offered);
  assert.equal(offered.session.program.meta.offer, 0, 'web tick declines the offer');
  assert.equal(offered.presentation.revision, beforeDecline + 1);
  assert.equal(offered.snapshot.panels.notice, 'The local bot declines draw offers.');
});
