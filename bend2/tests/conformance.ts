import fs from 'node:fs';
import { applyGeneratedAction, initialPosition, legalActions, validatePosition } from '../../src/engine/position.ts';
import type { Position } from '../../src/engine/types.ts';
import Model from '../core/Model.bend';
import Spec from '../core/Spec.bend';
import Kernel from '../core/Kernel.bend';
import {
  assert,
  assertIds,
  assertOrderedIds,
  assertPosition,
  bendBool,
  describe,
  fail,
  functionFrom,
  mutate,
  positionFromBend,
  positionToBend,
  unwrapStep,
} from './interop.ts';

type Fixture = {
  name: string;
  record: { initial: Position; actions: number[] };
  legal_action_ids: number[];
  children: Array<{ action: { id: number }; position: Position }>;
};

type FixtureFile = { rules_version: string; fixtures: Fixture[] };

const fixtureFile = JSON.parse(fs.readFileSync(new URL('../../fixtures/conformance.json', import.meta.url), 'utf8')) as FixtureFile;
assert(fixtureFile.rules_version === 'rift-chess/1.0', `fixture rules_version drifted: ${fixtureFile.rules_version}`);
assert(fixtureFile.fixtures.length === 14, `fixture count drifted: expected 14, got ${fixtureFile.fixtures.length}`);

const start = functionFrom([['Model', Model]], ['start']);
const valid = functionFrom([['Spec', Spec]], ['valid']);
const inCheck = functionFrom([['Spec', Spec]], ['in_check']);
const eligible = functionFrom([['Spec', Spec]], ['eligible']);
const legalIds = functionFrom([['Kernel', Kernel]], ['legal_ids']);
const step = functionFrom([['Kernel', Kernel]], ['step']);

function expectedPosition(input: Position): Position {
  validatePosition(input);
  return input;
}

function bendStep(position: Position, id: number, context: string): { accepted: boolean; position: unknown } {
  let value: unknown;
  try {
    value = step(positionToBend(position), id);
  } catch (error) {
    fail(`${context}: Bend step threw for action ${id}: ${String(error)}`);
  }
  return unwrapStep(value, positionToBend(position));
}

function checkStartLayouts(): number {
  let checks = 0;
  for (const [layout, bendLayout] of [['B', true], ['C', false]] as const) {
    let value: unknown;
    try {
      value = start(bendLayout);
    } catch (error) {
      fail(`start(${layout}) threw: ${String(error)}`);
    }
    assertPosition(initialPosition(layout), value, `start(${layout})`);
    let ids: unknown;
    try {
      ids = legalIds(value);
    } catch (error) {
      fail(`start(${layout}).legal_ids threw: ${String(error)}`);
    }
    assertOrderedIds(ids, `start(${layout}).legal_ids`);
    checks += 1;
  }
  return checks;
}

function checkInvalidState(validFn: (...args: any[]) => unknown, position: Position, name: string): number {
  let value: unknown;
  try {
    value = validFn(positionToBend(position));
  } catch (error) {
    fail(`valid(${name}) threw instead of returning False: ${String(error)}`);
  }
  assert(!bendBool(value, `valid(${name})`), `valid(${name}) unexpectedly returned True`);
  return 1;
}

function checkInvalidStates(): number {
  const opening = initialPosition('B');
  const invalids: Array<[string, Position]> = [
    ['zero_holes', mutate(opening, (p) => { p.holes = 0; })],
    ['occupant_on_absent_square', mutate(opening, (p) => { p.board[18] = 1; })],
    ['duplicate_white_king', mutate(opening, (p) => { p.board[0] = 6; })],
    ['missing_castling_rook', mutate(opening, (p) => { p.board[7] = 0; })],
    ['incoherent_en_passant', mutate(opening, (p) => { p.ep_target = 0; p.ep_pawn = 1; })],
    ['virgin_pawn_off_start_rank', mutate(opening, (p) => { p.board[16] = 7; })],
    ['pawn_on_promotion_rank', mutate(opening, (p) => { p.castling = 0; p.board[56] = 1; })],
    ['previous_mover_in_check', mutate(opening, (p) => { p.castling = 0; p.board[52] = 4; })],
    ['zero_fullmove', mutate(opening, (p) => { p.fullmove = 0; })],
    ['rights_out_of_range', mutate(opening, (p) => { p.castling = 16; })],
    ['illegal_piece_code', mutate(opening, (p) => { p.board[16] = 8; })],
    ['holes_out_of_range', mutate(opening, (p) => { p.holes = 65_536; })],
  ];
  const ep = fixtureFile.fixtures.find((fixture) => fixture.name === 'en_passant');
  assert(ep !== undefined, 'en_passant fixture is missing');
  invalids.push(['en_passant_with_progress', mutate(ep.record.initial, (p) => { p.halfmove = 1; })]);
  return invalids.reduce((count, [name, position]) => count + checkInvalidState(valid, position, name), 0);
}

function checkFreshPawnAttack(): number {
  const board = Array<number>(64).fill(0);
  board[43] = 6; // White king d6.
  board[53] = -7; // Fresh black pawn f7.
  board[63] = -6; // Black king h8.
  const position: Position = {
    board, holes: (1 << 0) | (1 << 3), side: 1, castling: 0,
    ep_target: -1, ep_pawn: -1, halfmove: 0, fullmove: 1,
  };
  let isValid: unknown;
  try {
    isValid = valid(positionToBend(position));
  } catch (error) {
    fail(`fresh-pawn position valid() threw: ${String(error)}`);
  }
  assert(bendBool(isValid, 'fresh-pawn valid'), 'fresh-pawn regression position must be valid');

  const attacked = mutate(position, (p) => { p.board[43] = 0; p.board[44] = 6; });
  let checked: unknown;
  try {
    checked = inCheck(positionToBend(attacked), true);
  } catch (error) {
    fail(`in_check(fresh-pawn destination) threw: ${String(error)}`);
  }
  assert(bendBool(checked, 'fresh-pawn in_check'), 'fresh black pawn f7 must attack e6');
  const kingStep = 5 * (64 * 43 + 44);
  let eligibleValue: unknown;
  try {
    eligibleValue = eligible(positionToBend(position), kingStep);
  } catch (error) {
    fail(`eligible(fresh-pawn king step) threw: ${String(error)}`);
  }
  assert(!bendBool(eligibleValue, 'fresh-pawn king step'), 'king step into fresh-pawn attack must be rejected');
  return 3;
}

function checkFixture(fixture: Fixture): number {
  const seed = expectedPosition(fixture.record.initial);
  let initial = seed;
  for (const [index, actionId] of fixture.record.actions.entries()) {
    const action = legalActions(initial).find((candidate) => candidate.id === actionId);
    assert(action !== undefined, `${fixture.name}: record.actions[${index}] ${actionId} is not legal in TS oracle`);
    initial = applyGeneratedAction(initial, action);
    validatePosition(initial);
  }
  let seedValidity: unknown;
  try {
    seedValidity = valid(positionToBend(seed));
  } catch (error) {
    fail(`${fixture.name}.record.initial: valid() threw: ${String(error)}`);
  }
  assert(bendBool(seedValidity, `${fixture.name}.record.initial.valid`),
    `${fixture.name}.record.initial: valid() returned False`);
  let validity: unknown;
  try {
    validity = valid(positionToBend(initial));
  } catch (error) {
    fail(`${fixture.name}: valid(initial) threw: ${String(error)}`);
  }
  assert(bendBool(validity, `${fixture.name}.valid`), `${fixture.name}: valid(initial) returned False`);

  let ids: unknown;
  try {
    ids = legalIds(positionToBend(initial));
  } catch (error) {
    fail(`${fixture.name}: legal_ids threw: ${String(error)}`);
  }
  assertIds(fixture.legal_action_ids, ids, `${fixture.name}.legal_ids`);

  const oracleActions = legalActions(initial);
  assert(oracleActions.length === fixture.legal_action_ids.length,
    `${fixture.name}: TS oracle legal count ${oracleActions.length} differs from fixture ${fixture.legal_action_ids.length}`);
  for (let index = 0; index < fixture.legal_action_ids.length; index += 1) {
    assert(oracleActions[index].id === fixture.legal_action_ids[index],
      `${fixture.name}: TS oracle ID[${index}] expected ${fixture.legal_action_ids[index]}, got ${oracleActions[index].id}`);
  }

  let checks = 1;
  for (const child of fixture.children) {
    const oracleAction = oracleActions.find((action) => action.id === child.action.id);
    assert(oracleAction !== undefined, `${fixture.name}: fixture child action ${child.action.id} absent from TS oracle`);
    const oracleNext = applyGeneratedAction(initial, oracleAction);
    assertPosition(child.position, positionToBend(oracleNext), `${fixture.name}.${child.action.id}.fixture-oracle`);

    const result = bendStep(initial, child.action.id, `${fixture.name}.${child.action.id}`);
    assert(result.accepted, `${fixture.name}.${child.action.id}: legal fixture action was rejected`);
    assertPosition(child.position, result.position, `${fixture.name}.${child.action.id}.bend`);
    checks += 1;
  }

  const rejectedId = [21759, 21758, 20480, 0].find((candidate) => !fixture.legal_action_ids.includes(candidate));
  assert(rejectedId !== undefined, `${fixture.name}: fixture unexpectedly accepts every invalid probe ID`);
  const rejected = bendStep(initial, rejectedId, `${fixture.name}.reject-${rejectedId}`);
  assert(!rejected.accepted || describe(rejected.position) === describe(positionToBend(initial)),
    `${fixture.name}: invalid action ${rejectedId} was accepted or changed state`);
  assertPosition(initial, rejected.position, `${fixture.name}.reject-${rejectedId}.inert`);
  return checks + 1;
}

export function runConformance(): { fixtures: number; children: number; checks: number } {
  let checks = checkStartLayouts() + checkInvalidStates() + checkFreshPawnAttack();
  let children = 0;
  for (const fixture of fixtureFile.fixtures) {
    checks += checkFixture(fixture);
    children += fixture.children.length;
  }
  return { fixtures: fixtureFile.fixtures.length, children, checks };
}

if (import.meta.main) {
  const result = runConformance();
  console.log(JSON.stringify({ ok: true, ...result }));
}
