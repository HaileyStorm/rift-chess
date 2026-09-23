import assert from 'node:assert/strict';
import P from './program';

const nil = {$: 'Nil'};
const list = (xs: any[]) => xs.reduceRight((tail, head) => ({$: 'Con', head, tail}), nil);
const array = (xs: any): any[] => {
  const out: any[] = [];
  while (xs.$ === 'Con') { out.push(xs.head); xs = xs.tail; }
  return out;
};
const event = (s: any, ...events: any[]) => P.update(list(events), s);
const activate = (s: any, id: number) => event(s, {$: 'Activate', id});
const settle = (s: any) => event(s, {$: 'Tick', ms: 240}).state;

let s = P.start('', '', 1024, 768).state;
const first = array(P.legal(s))[0];
s = settle(P.request_move(s, first).state);
const before = P.record_text(s);
const beforeRevision = P.snapshot(s).meta.revision;
const beforeCommands = JSON.parse(before).commands.length;
assert.equal(P.snapshot(s).meta.canUndo, true);

// Hotseat Undo opens a consent request and commits nothing.
let requested = activate(s, 3).state;
assert.equal(P.snapshot(requested).panels.menu, 8);
assert.match(P.snapshot(requested).panels.notice, /must agree/);
assert.equal(P.snapshot(requested).meta.revision, P.snapshot(s).meta.revision);
assert.equal(P.record_text(requested), before);

// Cancel is inert; a direct move cannot bypass the request menu.
const canceled = activate(requested, 28).state;
assert.equal(P.snapshot(canceled).panels.menu, 0);
assert.equal(P.record_text(canceled), before);
const bypass = P.request_move(requested, array(P.legal(requested))[0]).state;
assert.equal(P.snapshot(bypass).panels.menu, 8);
assert.equal(P.record_text(bypass), before);

// The other player agrees through id 48, which performs the real kernel Undo.
const agreed = activate(requested, 48).state;
assert.equal(P.snapshot(agreed).panels.menu, 0);
assert.equal(P.snapshot(agreed).meta.revision, beforeRevision + 1);
assert.equal(P.snapshot(agreed).meta.canUndo, false);
assert.equal(JSON.parse(P.record_text(agreed)).commands.length, beforeCommands + 1);

// An agreement control is stale after the request is canceled and a new move is accepted.
let stale = activate(s, 3).state;
stale = activate(stale, 28).state;
stale = settle(P.request_move(stale, array(P.legal(stale))[1]).state);
const staleRevision = P.snapshot(stale).meta.revision;
const staleResult = activate(stale, 48).state;
assert.equal(P.snapshot(staleResult).meta.revision, staleRevision);
assert.equal(P.snapshot(staleResult).panels.menu, 0);

// Keyboard U follows the same consent guard in hotseat.
const keyboard = event(s, {$: 'KeyInput', code: 85, down: true, alt: false, ctrl: false, shift: false}).state;
assert.equal(P.snapshot(keyboard).panels.menu, 8);
assert.equal(P.snapshot(keyboard).meta.revision, P.snapshot(s).meta.revision);

// Bot modes retain immediate Undo and pause the opponent after it succeeds.
const prefs = JSON.stringify({mode: 'bot', humanWhite: true, botPaused: true, theme: 0,
  sound: true, volume: 0.8, view: {yaw: 0, pitch: 65, zoom: 100}});
let bot = P.start('', prefs, 1024, 768).state;
bot = settle(P.request_move(bot, array(P.legal(bot))[0]).state);
const botUndo = activate(bot, 3).state;
assert.equal(P.snapshot(botUndo).meta.revision, 2);
assert.equal(P.snapshot(botUndo).panels.menu, 0);
assert.equal(P.snapshot(botUndo).meta.botPaused, true);

// A pending bot replay remains frozen; Undo cannot bypass replay validation.
const botReplayStart = P.start(before, prefs, 1024, 768).state;
assert.equal(P.replaying(botReplayStart), true);
const botReplayUndo = activate(botReplayStart, 3).state;
assert.equal(P.replaying(botReplayUndo), true);
assert.equal(P.record_text(botReplayUndo), P.record_text(botReplayStart));

console.log('undo-consent: hotseat agreement/cancel/stale/keyboard guards and bot immediate undo passed');
