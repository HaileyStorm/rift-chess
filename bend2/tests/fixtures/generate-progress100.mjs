// Find a short, source-engine-validated 100-quiet-move witness for the slow
// browser import scenarios. This prints a candidate; it never rewrites a fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game } from '../ts-oracle.mjs';

const file = 'abcdefgh';
const square = name => file.indexOf(name[0]) + 8 * (Number(name[1]) - 1);
let winning = null;
for (let attempt = 1; attempt <= 120 && !winning; attempt++) {
  let seed = 20260929 + attempt * 811;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const game = new Game('B', 'auto100');
  const seen = new Set([game.positionHash()]);
  const actions = [];
  while (actions.length < 100) {
    const choices = [];
    for (const action of game.legalActions()) {
      if (action.type !== 'move' || Math.abs(game.state.board[square(action.from)]) === 1 ||
        game.state.board[square(action.to)] !== 0) continue;
      const probe = new Game('B', 'auto100', game.state);
      probe.step(action.id);
      if (probe.state.halfmove !== game.state.halfmove + 1 ||
        seen.has(probe.positionHash()) || (actions.length < 99 && probe.outcome())) continue;
      choices.push({ id: action.id, hash: probe.positionHash() });
    }
    if (!choices.length) break;
    const choice = choices[Math.floor(random() * choices.length)];
    game.step(choice.id);
    actions.push(choice.id);
    seen.add(choice.hash);
  }
  if (actions.length === 100 && game.outcome()?.reason === 'progress100') {
    const replay = new Game('B', 'auto100');
    for (const [expected, id] of actions.entries()) replay.step(id, expected);
    assert.equal(replay.state.halfmove, 100);
    assert.equal(replay.outcome()?.reason, 'progress100');
    winning = { attempt, actions, outcome: replay.outcome()?.reason,
      finalHalfmove: replay.state.halfmove, positions: seen.size };
  }
}
assert.ok(winning, 'No bounded 100-quiet-move witness found');
const fixture = JSON.parse(fs.readFileSync(new URL('./playtest-records.json', import.meta.url))).progress100Short;
assert.deepEqual(fixture.actions, winning.actions, 'Short fixture diverged from its deterministic generator');
assert.deepEqual({ layout: fixture.layout, policy: fixture.policy, outcome: fixture.outcome },
  { layout: 'B', policy: 1, outcome: 'progress100' });
const prompt = new Game('B', 'prompt');
for (const [expected, id] of winning.actions.entries()) prompt.step(id, expected);
assert.equal(prompt.state.halfmove, 100);
assert.equal(prompt.outcome(), null, 'Prompt policy continues at 100 quiet moves');
console.log(JSON.stringify(winning));
