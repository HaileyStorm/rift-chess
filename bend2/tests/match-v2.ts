import fs from 'node:fs';
import { Game } from '../../src/match/game.ts';
import Facade from '../core/v2/Facade.bend';
import MatchKernel from '../core/v2/MatchKernel.bend';
import {
  assert,
  assertPosition,
  bendNat,
  bendU32,
  describe,
  fromBendList,
  positionFromBend,
  positionToBend,
} from './interop.ts';

type Obj = Record<string, unknown>;
type Fixture = { name: string; record: { initial: any; actions: number[] } };

const fixtureFile = JSON.parse(fs.readFileSync(new URL('../../fixtures/conformance.json', import.meta.url), 'utf8')) as {
  fixtures: Fixture[];
};
const facade = Facade as unknown as Record<string, (...args: any[]) => unknown>;
const kernel = MatchKernel as unknown as Record<string, (...args: any[]) => unknown>;

function object(value: unknown, context: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${context}: expected tagged object, got ${describe(value)}`);
  }
  return value as Obj;
}

function call(name: string, ...args: any[]): unknown {
  const fn = facade[name];
  assert(typeof fn === 'function', `Facade missing ${name}`);
  try {
    return fn(...args);
  } catch (error) {
    throw new Error(`${name} threw: ${String(error)}`);
  }
}

function callKernel(name: string, ...args: any[]): unknown {
  const fn = kernel[name];
  assert(typeof fn === 'function', `MatchKernel missing ${name}`);
  try {
    return fn(...args);
  } catch (error) {
    throw new Error(`MatchKernel.${name} threw: ${String(error)}`);
  }
}

function command(tag: string, fields: Obj): Obj {
  return { $: tag, ...fields };
}

function result(value: unknown, context: string): { accepted: boolean; match: Obj } {
  const item = object(value, context);
  if (item.$ === 'Accepted') return { accepted: true, match: object(item.next, `${context}.next`) };
  if (item.$ === 'Rejected') return { accepted: false, match: object(item.old, `${context}.old`) };
  throw new Error(`${context}: expected Accepted/Rejected, got ${describe(value)}`);
}

function actions(match: Obj, context: string): number[] {
  return fromBendList(match.actions, `${context}.actions`).map((value, index) => bendU32(value, `${context}.actions[${index}]`));
}

function revision(match: Obj, context: string): bigint {
  return bendNat(match.revision, `${context}.revision`);
}

function snapshot(match: Obj, context: string): { state: any; actions: number[]; revision: bigint; offer: unknown; forced: unknown } {
  return {
    state: match.state,
    actions: actions(match, context),
    revision: revision(match, context),
    offer: match.offer,
    forced: match.forced,
  };
}

function assertInert(expected: Obj, actual: Obj, context: string): void {
  assertPosition(positionFromBend(expected.state, `${context}.expected.state`), actual.state, `${context}.state`);
  const expectedActions = actions(expected, `${context}.expected`);
  const actualActions = actions(actual, `${context}.actual`);
  assert(expectedActions.length === actualActions.length
    && expectedActions.every((id, index) => id === actualActions[index]),
  `${context}.actions: expected ${describe(expectedActions)}, got ${describe(actualActions)}`);
  assert(revision(expected, `${context}.expected`) === revision(actual, `${context}.actual`),
    `${context}.revision changed on rejection`);
  assert(describe(expected.offer) === describe(actual.offer), `${context}.offer changed on rejection`);
  assert(describe(expected.forced) === describe(actual.forced), `${context}.forced changed on rejection`);
}

function outcomeTag(match: Obj, context: string): string | null {
  const value = object(call('outcome', match), `${context}.outcome`);
  if (value.$ === 'None') return null;
  assert(value.$ === 'Some', `${context}: expected None/Some, got ${describe(value)}`);
  return object(value.value, `${context}.outcome.value`).$ as string;
}

function fixture(name: string): Fixture {
  const found = fixtureFile.fixtures.find((item) => item.name === name);
  assert(found !== undefined, `missing fixture ${name}`);
  return found;
}

function policy(tag: 'Prompt' | 'Auto100' | 'Off'): Obj {
  return { $: tag };
}

function fromPosition(position: any, drawPolicy: Obj, context: string): Obj {
  const value = object(call('from_position', positionToBend(position), drawPolicy), context);
  assert(value.$ === 'Some', `${context}: expected imported match, got ${describe(value)}`);
  return object(value.value, `${context}.value`);
}

function move(match: Obj, expected: number, id: number, context: string): Obj {
  const stepped = result(call('command', match,
    command('MoveCommand', { expected: BigInt(expected), action: id })), context);
  assert(stepped.accepted, `${context}: move ${id} rejected`);
  return stepped.match;
}

function assertTSOutcome(game: Game, reason: string | null, context: string): void {
  assert((game.outcome()?.reason ?? null) === reason,
    `${context}: TS oracle expected ${reason}, got ${describe(game.outcome())}`);
}

function runBoardAndHistory(): number {
  const prompt = policy('Prompt');
  const start = object(call('start', true, prompt), 'start');
  const kernelStart = object(callKernel('start', true, prompt), 'MatchKernel.start');
  assertPosition(positionFromBend(start.state, 'Facade start state'), kernelStart.state, 'Facade/MatchKernel start parity');
  const game = new Game('B', 'prompt');
  const first = move(start, 0, 2025, 'first move');
  const kernelFirst = result(callKernel('step', kernelStart,
    command('MoveCommand', { expected: 0n, action: 2025 })), 'MatchKernel first move');
  assert(kernelFirst.accepted, 'MatchKernel first move must accept');
  assertPosition(positionFromBend(first.state, 'Facade first state'), kernelFirst.match.state,
    'Facade/MatchKernel first move parity');
  const oracleFirst = game.step(2025);
  assertPosition(oracleFirst.position, first.state, 'first move TS oracle');
  assert(revision(first, 'first move') === 1n, 'first move revision');

  const stale = result(call('command', first,
    command('MoveCommand', { expected: 0n, action: 2035 })), 'stale move');
  assert(!stale.accepted, 'stale move must reject');
  assertInert(first, stale.match, 'stale move');

  const second = move(first, 1, 20825, 'second move');
  game.step(20825);
  const undone = result(call('command', second,
    command('UndoCommand', { expected: 2n })), 'undo');
  assert(undone.accepted, 'undo must accept after two moves');
  game.undo(2);
  assertPosition(game.state, undone.match.state, 'undo TS oracle');
  assert(actions(undone.match, 'undo').length === 1 && actions(undone.match)[0] === 2025,
    'undo must restore the preceding action history');
  assert(revision(undone.match, 'undo') === 3n, 'undo increments revision exactly once');
  return 8;
}

function runDrawPolicies(): number {
  const autoFixture = fixture('auto_at_99');
  const promptFixture = fixture('prompt_at_99');
  const offFixture = fixture('auto_at_99');
  const cases: Array<[string, Fixture, Obj, 'auto100' | 'prompt' | 'off', string | null]> = [
    ['auto100', autoFixture, policy('Auto100'), 'auto100', 'Progress100'],
    ['prompt', promptFixture, policy('Prompt'), 'prompt', null],
    ['off', offFixture, policy('Off'), 'off', null],
  ];
  let checks = 0;
  for (const [name, item, drawPolicy, tsPolicy, expected] of cases) {
    const match = fromPosition(item.record.initial, drawPolicy, `${name} import`);
    assert(outcomeTag(match, `${name} before`) === null, `${name}: progress99 must not be terminal`);
    const after = move(match, 0, 5, `${name} move`);
    assert(outcomeTag(after, `${name} after`) === expected, `${name}: unexpected outcome`);
    const game = new Game('B', tsPolicy, item.record.initial);
    game.step(5);
    assertTSOutcome(game, expected === null ? null : 'progress100', `${name} TS oracle`);
    checks += 3;
  }
  return checks;
}

function runMatePrecedence(): number {
  const item = fixture('mate_over_auto100');
  const match = fromPosition(item.record.initial, policy('Auto100'), 'mate import');
  const after = move(match, 0, 14990, 'mate move');
  assert(outcomeTag(after, 'mate after') === 'WhiteCheckmate', 'checkmate must precede auto100');
  const game = new Game('B', 'auto100', item.record.initial);
  game.step(14990);
  assertTSOutcome(game, 'checkmate', 'mate TS oracle');
  return 2;
}

function runDrawControls(): number {
  const prompt = policy('Prompt');
  let match = object(call('start', true, prompt), 'offer start');
  let offered = result(call('command', match,
    command('OfferCommand', { expected: 0n, side: true })), 'white offer');
  assert(offered.accepted, 'white offer must accept');
  const declined = result(call('command', offered.match,
    command('DeclineCommand', { expected: 1n, side: false })), 'black decline');
  assert(declined.accepted && object(declined.match.offer, 'decline offer').$ === 'NoOffer',
    'black decline must clear the offer');

  offered = result(call('command', declined.match,
    command('OfferCommand', { expected: 2n, side: true })), 'white reoffer');
  const agreed = result(call('command', offered.match,
    command('AcceptCommand', { expected: 3n, side: false })), 'black accept');
  assert(agreed.accepted && outcomeTag(agreed.match, 'black accepted draw') === 'Agreed',
    'black must accept white offer');
  match = object(call('start', true, prompt), 'black offer start');
  offered = result(call('command', match,
    command('OfferCommand', { expected: 0n, side: false })), 'black offer');
  const whiteAccepted = result(call('command', offered.match,
    command('AcceptCommand', { expected: 1n, side: true })), 'white accept');
  assert(whiteAccepted.accepted && outcomeTag(whiteAccepted.match, 'white accepted draw') === 'Agreed',
    'white must accept black offer');
  return 6;
}

function runResignAndTerminal(): number {
  const prompt = policy('Prompt');
  for (const [side, expectedOutcome] of [[true, 'WhiteResignedOutcome'], [false, 'BlackResignedOutcome']] as const) {
    const start = object(call('start', true, prompt), `resign ${side} start`);
    const resigned = result(call('command', start,
      command('ResignCommand', { expected: 0n, side })), `resign ${side}`);
    assert(resigned.accepted && outcomeTag(resigned.match, `resign ${side} outcome`) === expectedOutcome,
      `resignation by ${side ? 'white' : 'black'} must terminate with ${expectedOutcome}`);
    for (const [tag, fields] of [
      ['MoveCommand', { expected: 1n, action: 2025 }],
      ['OfferCommand', { expected: 1n, side: true }],
      ['AcceptCommand', { expected: 1n, side: !side }],
      ['DeclineCommand', { expected: 1n, side: !side }],
      ['ResignCommand', { expected: 1n, side: !side }],
    ] as const) {
      const rejected = result(call('command', resigned.match, command(tag, fields)), `terminal ${tag}`);
      assert(!rejected.accepted, `terminal ${tag} must reject`);
      assertInert(resigned.match, rejected.match, `terminal ${tag}`);
    }
  }
  return 12;
}

function runRepetitionAndEffectiveEp(): number {
  const prompt = policy('Prompt');
  let match = object(call('start', true, prompt), 'repetition start');
  const ids = [20825, 20900, 20825, 20900];
  const game = new Game('B', 'prompt');
  ids.forEach((id, index) => {
    match = move(match, index, id, `repetition ${index}`);
    game.step(id);
  });
  assert(outcomeTag(match, 'third repetition') === 'Threefold', 'third repetition must terminate');
  assertTSOutcome(game, 'threefold', 'third repetition TS oracle');

  const legalEp = fromPosition(fixture('en_passant').record.initial, prompt, 'legal EP');
  const pinnedEp = fromPosition(fixture('pinned_en_passant').record.initial, prompt, 'pinned EP');
  const legalKeys = fromBendList(legalEp.keys, 'legal EP keys');
  const pinnedKeys = fromBendList(pinnedEp.keys, 'pinned EP keys');
  assert(legalKeys.length === 1 && pinnedKeys.length === 1, 'EP imports must begin with one history key');
  const legalKey = object(legalKeys[0], 'legal EP key');
  const pinnedKey = object(pinnedKeys[0], 'pinned EP key');
  assert(bendU32(legalKey.ep, 'legal EP target') === 43 && bendU32(legalKey.epPawn, 'legal EP pawn') === 35,
    'legal EP must remain in the repetition key');
  assert(bendU32(pinnedKey.ep, 'pinned EP target') === 64 && bendU32(pinnedKey.epPawn, 'pinned EP pawn') === 64,
    'pinned EP must be omitted from the repetition key');
  return ids.length + 4;
}

export function runMatchV2(): { checks: number } {
  return {
    checks: runBoardAndHistory() + runDrawPolicies() + runMatePrecedence()
      + runDrawControls() + runResignAndTerminal() + runRepetitionAndEffectiveEp(),
  };
}

if (import.meta.main) {
  console.log(JSON.stringify({ ok: true, ...runMatchV2() }));
}
