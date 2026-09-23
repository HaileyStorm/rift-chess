import assert from 'node:assert/strict';
import NativeCLI from '../NativeCLI.bend';
import Rules from '../core/v2/Facade.bend';
import Match from '../core/MatchSpec.bend';

const list = (values) => values.reduceRight(
  (tail, head) => ({ $: 'Con', head, tail }),
  { $: 'Nil' },
);
const toArray = (xs) => {
  const values = [];
  for (let current = xs; current.$ !== 'Nil'; current = current.tail) values.push(current.head);
  return values;
};
const store = (game, layout, policy = 0) => ({
  $: 'Store', game, layout, policy, commands: { $: 'Nil' }, sequence: 0, active: 1,
});
const accepted = (result, description) => {
  assert.equal(result.$, 'Accepted', description);
  return result.next;
};

for (const [layout, name] of [[true, 'B'], [false, 'C']]) {
  for (const [policy, policyName] of [[0, 'prompt'], [1, 'automatic 100-ply'], [2, 'off']]) {
    const game = Rules.start(layout, [{ $: 'Prompt' }, { $: 'Auto100' }, { $: 'Off' }][policy]);
    const screen = NativeCLI.render_moves(store(game, layout, policy));
    assert.ok(screen.includes(`Layout ${name}`), `layout ${name} renders`);
    assert.ok(screen.includes(`Draws ${policyName}`), `${policyName} policy renders`);
    assert.ok(screen.includes('White to move'), 'current side renders');
    assert.ok(screen.includes('LEGAL ACTIONS'), 'legal action list renders');
    assert.ok(screen.includes('##'), 'missing platform cells remain visibly empty');
    const ids = toArray(Rules.legal_ids(NativeCLI.position(game)));
    const shift = ids.find((id) => id >= 20480);
    if (shift !== undefined) {
      assert.ok(screen.includes(`[${shift}] SHIFT tile`), 'legal platform shift has a labeled ID');
    }
  }
}

assert.equal(NativeCLI.action_label(3980), 'e2-e4', 'ordinary move label');
assert.equal(NativeCLI.action_label(16941), 'e7-e8=Q', 'promotion label');
assert.equal(NativeCLI.action_label(20480), 'SHIFT tile 1-1', 'platform shift label');
for (const [word, code] of [
  ['help', 1], ['moves', 3], ['move', 4], ['shift', 5], ['undo', 6],
  ['offer', 7], ['accept', 8], ['decline', 9], ['resign', 10], ['new', 11],
  ['confirm', 12], ['white', 13], ['black', 14],
]) assert.equal(NativeCLI.command_word(word), code, `${word} command parses`);
assert.equal(NativeCLI.new_layout_word('c').value, false, 'layout C parses case-insensitively');
assert.equal(NativeCLI.new_policy_word('AUTO').value, 1, 'automatic policy parses case-insensitively');

let game = Rules.start(true, { $: 'Prompt' });
const first = { $: 'MoveCommand', expected: 0n, action: 3980 };
game = accepted(Rules.command(game, first), 'White e2-e4 is accepted');
assert.equal(NativeCLI.side(game), false, 'turn passes to Black');
const second = { $: 'MoveCommand', expected: 1n, action: 16820 };
game = accepted(Rules.command(game, second), 'Black e7-e5 is accepted');
const undo = { $: 'UndoCommand', expected: 2n };
const commands = list([first, second, undo]);
const replayed = NativeCLI.replay_commands(commands, Rules.start(true, { $: 'Prompt' }), { $: 'None' });
assert.equal(replayed.$, 'Some', 'accepted move and Undo history replays through v2');
assert.equal(NativeCLI.revision(replayed.value), 3n, 'Undo advances the match revision');

const offer = { $: 'OfferCommand', expected: 2n, side: false };
const offered = accepted(Rules.command(game, offer), 'Black can offer while White is to move');
assert.equal(NativeCLI.answer_side(offered), true, 'only the opposite hotseat side answers the offer');
const accept = { $: 'AcceptCommand', expected: 3n, side: true };
const agreed = accepted(Rules.command(offered, accept), 'the opposite side can accept');
assert.equal(Rules.outcome(agreed).value.$, 'Agreed', 'draw agreement is terminal');

const resigned = accepted(Rules.command(Rules.start(true, { $: 'Prompt' }),
  { $: 'ResignCommand', expected: 0n, side: false }), 'Black can resign off-turn');
assert.equal(Rules.outcome(resigned).value.$, 'BlackResignedOutcome', 'off-turn resignation is recorded');

console.log('native-cli: two layouts, three policies, empty holes, legal move/shift/promotion labels, both-side commands, replay/Undo, offer/accept, and resignation passed');
