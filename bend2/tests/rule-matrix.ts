import fs from 'node:fs';
import type { Action, Position } from '../../src/engine/types.ts';
import {
  applyGeneratedAction,
  legalActions,
  squareIndex,
  validatePosition,
} from '../../src/engine/position.ts';
import { Game, repetitionKey } from '../../src/match/game.ts';
import Kernel from '../core/Kernel.bend';
import Spec from '../core/Spec.bend';
import RuleKernel from '../core/v2/RuleKernel.bend';
import RuleContracts from '../core/v2/RuleContracts.bend';
import {
  assert,
  assertPosition,
  bendBool,
  bendU32,
  describe,
  fail,
  fromBendList,
  functionFrom,
  positionToBend,
  unwrapStep,
} from './interop.ts';

type Fixture = {
  name: string;
  record: { initial: Position; actions: number[] };
  children: Array<{ action: { id: number }; position: Position }>;
};

type FixtureFile = { rules_version: string; fixtures: Fixture[] };

type MatrixCase = {
  name: string;
  position: Position;
  source: 'structural-only' | 'imported-puzzle';
  check?: (position: Position, actions: Action[], expected: number[]) => number;
};

const fixtures = JSON.parse(
  fs.readFileSync(new URL('../../fixtures/conformance.json', import.meta.url), 'utf8'),
) as FixtureFile;
assert(fixtures.rules_version === 'rift-chess/1.0', `rule-matrix: fixture rules_version drifted: ${fixtures.rules_version}`);
assert(fixtures.fixtures.length === 14, `rule-matrix: expected 14 canonical fixtures, got ${fixtures.fixtures.length}`);

const coreValid = functionFrom([['Spec', Spec]], ['valid']);
const coreLegalIds = functionFrom([['Kernel', Kernel]], ['legal_ids']);
const coreStep = functionFrom([['Kernel', Kernel]], ['step']);
const v2Contract = functionFrom([['RuleContracts', RuleContracts]], ['contract']);
const v2Step = functionFrom([['RuleKernel', RuleKernel]], ['step']);

function call<T>(context: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    fail(`${context}: ${String(error)}`);
  }
}

function square(file: number, rank: number): number {
  return rank * 8 + file;
}

function moveId(from: number, to: number, promotion = 0): number {
  return 5 * (64 * from + to) + promotion;
}

function shiftId(from: number, to: number, promotion = 0): number {
  return 20480 + 5 * (16 * from + to) + promotion;
}

function idsFromBend(value: unknown, context: string): number[] {
  return fromBendList(value, context).map((id, index) => bendU32(id, `${context}[${index}]`));
}

function sameIds(expected: readonly number[], actual: readonly number[], context: string): void {
  assert(expected.length === actual.length,
    `${context}: expected ${expected.length} IDs, got ${actual.length}: ${describe(actual)}`);
  for (let index = 0; index < expected.length; index += 1) {
    assert(expected[index] === actual[index],
      `${context}: ID[${index}] expected ${expected[index]}, got ${actual[index]}`);
  }
}

function emptyPosition(entries: ReadonlyArray<readonly [number, number]>, options: Partial<Position> = {}): Position {
  const board = Array<number>(64).fill(0);
  for (const [index, piece] of entries) board[index] = piece;
  return {
    board,
    holes: options.holes ?? ((1 << 5) | (1 << 9)),
    side: options.side ?? 1,
    castling: options.castling ?? 0,
    ep_target: options.ep_target ?? -1,
    ep_pawn: options.ep_pawn ?? -1,
    halfmove: options.halfmove ?? 0,
    fullmove: options.fullmove ?? 1,
  };
}

function actionAt(actions: readonly Action[], from: string, to: string, type: Action['type'] = 'move'): Action | undefined {
  return actions.find((action) => action.type === type && action.from === from && action.to === to);
}

function requireAction(actions: readonly Action[], from: string, to: string, context: string, type: Action['type'] = 'move'): Action {
  const action = actionAt(actions, from, to, type);
  assert(action !== undefined, `${context}: expected ${type} ${from}->${to}; got ${describe(actions)}`);
  return action;
}

function requireNoAction(actions: readonly Action[], from: string, to: string, context: string, type: Action['type'] = 'move'): void {
  assert(actionAt(actions, from, to, type) === undefined,
    `${context}: unexpected ${type} ${from}->${to}`);
}

function requireOutcome(game: Game, result: string, reason: string, context: string): void {
  const outcome = game.outcome();
  assert(outcome !== null, `${context}: expected ${result}/${reason}, got no outcome`);
  assert(outcome.result === result && outcome.reason === reason,
    `${context}: expected ${result}/${reason}, got ${describe(outcome)}`);
}

function expectedFullmove(position: Position): number {
  return position.fullmove + (position.side === -1 ? 1 : 0);
}

function checkFullmoveIncrement(position: Position, next: Position, context: string): void {
  assert(next.fullmove === expectedFullmove(position),
    `${context}: fullmove increment expected ${expectedFullmove(position)}, got ${next.fullmove}`);
}

function runKernelStep(
  label: string,
  step: (...args: any[]) => unknown,
  position: Position,
  id: number,
  expected: Position,
): void {
  const old = positionToBend(position);
  const result = call(`${label}.step(${id})`, () => unwrapStep(step(old, id), old));
  assert(result.accepted, `${label}.step(${id}): legal action was rejected`);
  assertPosition(expected, result.position, `${label}.step(${id})`);
}

function runRejectedStep(label: string, step: (...args: any[]) => unknown, position: Position, id: number): void {
  const old = positionToBend(position);
  const result = call(`${label}.step(${id})`, () => unwrapStep(step(old, id), old));
  assert(!result.accepted, `${label}.step(${id}): invalid action was accepted`);
  assertPosition(position, result.position, `${label}.step(${id}).inert`);
}

function validateStructural(position: Position, context: string): void {
  call(`${context}.TS.validatePosition`, () => validatePosition(position));
  const bend = call(`${context}.Spec.valid`, () => coreValid(positionToBend(position)));
  assert(bendBool(bend, `${context}.Spec.valid`), `${context}: Bend structural validity was False`);
}

function runCase(testCase: MatrixCase): { actions: Action[]; expected: number[]; checks: number } {
  const { name, position } = testCase;
  validateStructural(position, name);
  const actions = legalActions(position);
  const expected = actions.map((action) => action.id);
  const coreIds = idsFromBend(call(`${name}.Kernel.legal_ids`, () => coreLegalIds(positionToBend(position))), `${name}.Kernel.legal_ids`);
  sameIds(expected, coreIds, `${name}.Kernel.legal_ids`);

  let checks = 3;
  for (const action of actions) {
    const next = applyGeneratedAction(position, action);
    validatePosition(next);
    checkFullmoveIncrement(position, next, `${name}.${action.id}`);
    runKernelStep(`${name}.Kernel`, coreStep, position, action.id, next);
    runKernelStep(`${name}.v2`, v2Step, position, action.id, next);
    const contract = call(`${name}.v2.contract(${action.id})`, () => v2Contract(
      positionToBend(position), action.id, positionToBend(next),
    ));
    assert(bendBool(contract, `${name}.v2.contract(${action.id})`),
      `${name}.v2.contract(${action.id}): canonical successor was rejected`);
    checks += 4;
  }

  const rejectedId = 21760;
  assert(!expected.includes(rejectedId), `${name}: out-of-range probe unexpectedly appears in TS IDs`);
  runRejectedStep(`${name}.Kernel`, coreStep, position, rejectedId);
  runRejectedStep(`${name}.v2`, v2Step, position, rejectedId);
  checks += 2;
  if (testCase.check) checks += testCase.check(position, actions, expected);
  return { actions, expected, checks };
}

function reflectSquare(index: number): number {
  return square(index & 7, 7 - (index >> 3));
}

function reflectMacro(index: number): number {
  return (3 - Math.floor(index / 4)) * 4 + (index % 4);
}

function mirrorRights(rights: number): number {
  return ((rights & 1) !== 0 ? 4 : 0)
    | ((rights & 2) !== 0 ? 8 : 0)
    | ((rights & 4) !== 0 ? 1 : 0)
    | ((rights & 8) !== 0 ? 2 : 0);
}

function mirrorPosition(position: Position): Position {
  const board = Array<number>(64).fill(0);
  for (let index = 0; index < 64; index += 1) board[reflectSquare(index)] = -position.board[index];
  let holes = 0;
  for (let macro = 0; macro < 16; macro += 1) {
    if ((position.holes & (1 << macro)) !== 0) holes |= 1 << reflectMacro(macro);
  }
  return {
    board,
    holes,
    side: position.side === 1 ? -1 : 1,
    castling: mirrorRights(position.castling),
    ep_target: position.ep_target < 0 ? -1 : reflectSquare(position.ep_target),
    ep_pawn: position.ep_pawn < 0 ? -1 : reflectSquare(position.ep_pawn),
    halfmove: position.halfmove,
    fullmove: position.fullmove,
  };
}

function mirrorActionId(id: number): number {
  const promotion = id % 5;
  if (id < 20480) {
    const offset = Math.floor(id / 5);
    return moveId(reflectSquare(Math.floor(offset / 64)), reflectSquare(offset % 64), promotion);
  }
  const offset = Math.floor((id - 20480) / 5);
  return shiftId(reflectMacro(Math.floor(offset / 16)), reflectMacro(offset % 16), promotion);
}

function samePositionExceptFullmove(expected: Position, actual: Position, context: string): void {
  const left = { ...expected, fullmove: 0 };
  const right = { ...actual, fullmove: 0 };
  assertPosition(left, positionToBend(right), context);
}

function replayFixture(fixture: Fixture): Position {
  let position = fixture.record.initial;
  for (const [index, id] of fixture.record.actions.entries()) {
    const action = legalActions(position).find((candidate) => candidate.id === id);
    assert(action !== undefined, `${fixture.name}.record.actions[${index}]: ${id} is not legal in TS oracle`);
    position = applyGeneratedAction(position, action);
  }
  return position;
}

function runMirroredFixtures(): { fixtures: number; children: number; steps: number; checks: number } {
  let children = 0;
  let steps = 0;
  let checks = 0;
  for (const fixture of fixtures.fixtures) {
    const original = replayFixture(fixture);
    const mirrored = mirrorPosition(original);
    validateStructural(mirrored, `${fixture.name}.mirror`);
    const originalIds = legalActions(original).map((action) => action.id);
    const mirroredIds = legalActions(mirrored).map((action) => action.id);
    sameIds(mirroredIds, originalIds.map(mirrorActionId).sort((a, b) => a - b), `${fixture.name}.mirror.TS.metamorphic`);
    const result = runCase({ name: `${fixture.name}.mirror`, position: mirrored, source: 'imported-puzzle' });
    checks += result.checks + 2;
    steps += result.expected.length;
    for (const child of fixture.children) {
      const mirroredId = mirrorActionId(child.action.id);
      const mirrorAction = legalActions(mirrored).find((action) => action.id === mirroredId);
      assert(mirrorAction !== undefined, `${fixture.name}.mirror.${child.action.id}: transformed action is not legal`);
      const expected = applyGeneratedAction(mirrored, mirrorAction);
      const structural = mirrorPosition(child.position);
      samePositionExceptFullmove(structural, expected, `${fixture.name}.mirror.${child.action.id}.TS`);
      checkFullmoveIncrement(mirrored, expected, `${fixture.name}.mirror.${child.action.id}`);
      runKernelStep(`${fixture.name}.mirror.Kernel`, coreStep, mirrored, mirroredId, expected);
      runKernelStep(`${fixture.name}.mirror.v2`, v2Step, mirrored, mirroredId, expected);
      const contract = call(`${fixture.name}.mirror.v2.contract(${mirroredId})`, () => v2Contract(
        positionToBend(mirrored), mirroredId, positionToBend(expected),
      ));
      assert(bendBool(contract, `${fixture.name}.mirror.v2.contract(${mirroredId})`),
        `${fixture.name}.mirror.v2.contract(${mirroredId}): transformed fixture child rejected`);
      children += 1;
      steps += 1;
      checks += 4;
    }
  }
  return { fixtures: fixtures.fixtures.length, children, steps, checks };
}

function checkBlackCastling(position: Position, actions: Action[]): number {
  const castles = actions.filter((action) => action.type === 'move' && action.castle !== 0);
  assert(castles.length === 2, `black-castling: expected both black castling wings, got ${describe(castles)}`);
  assert(castles.some((action) => action.from === 'e8' && action.to === 'g8' && action.castle === 1),
    'black-castling: king-side castle missing');
  assert(castles.some((action) => action.from === 'e8' && action.to === 'c8' && action.castle === -1),
    'black-castling: queen-side castle missing');
  assert(position.side === -1, 'black-castling: side unexpectedly changed');
  return 3;
}

function checkBlackEnPassant(position: Position, actions: Action[]): number {
  const action = requireAction(actions, 'd4', 'e3', 'black-ep-legal');
  assert(action.en_passant === true, 'black-ep-legal: expected en-passant metadata');
  const next = applyGeneratedAction(position, action);
  assert(next.board[squareIndex('d4')] === 0 && next.board[squareIndex('e4')] === 0
    && next.board[squareIndex('e3')] === -1, 'black-ep-legal: victim/source/destination mismatch');
  return 2;
}

function checkPinnedEnPassant(_position: Position, actions: Action[]): number {
  requireNoAction(actions, 'd4', 'e3', 'black-ep-pinned');
  return 1;
}

function checkBlackDouble(position: Position, actions: Action[]): number {
  const action = requireAction(actions, 'e7', 'e5', 'black-double');
  const next = applyGeneratedAction(position, action);
  assert(next.board[squareIndex('e5')] === -1, 'black-double: fresh pawn did not become ordinary pawn');
  assert(next.ep_target === squareIndex('e6') && next.ep_pawn === squareIndex('e5'),
    'black-double: en-passant metadata mismatch');
  checkFullmoveIncrement(position, next, 'black-double');
  return 3;
}

function checkPromotions(from: string, to: string, side: 1 | -1, context: string) {
  return (position: Position, actions: Action[]): number => {
    const promotions = actions.filter((action) => action.type === 'move' && action.from === from && action.to === to);
    assert(promotions.length === 4, `${context}: expected four ordinary promotions, got ${describe(promotions)}`);
    assert(new Set(promotions.map((action) => action.promotion)).size === 4,
      `${context}: promotion tags are not distinct`);
    for (const action of promotions) {
      const next = applyGeneratedAction(position, action);
      const expectedType = action.promotion === 'Q' ? 5 : action.promotion === 'R' ? 4 : action.promotion === 'B' ? 3 : 2;
      assert(next.board[squareIndex(to)] === side * expectedType,
        `${context}.${action.promotion}: promoted code mismatch`);
    }
    return 2;
  };
}

function checkSliderBlocked(_position: Position, actions: Action[]): number {
  requireNoAction(actions, 'a1', 'a4', 'slider-blocked', 'move');
  requireNoAction(actions, 'a1', 'a5', 'slider-blocked', 'move');
  return 2;
}

function checkSliderHole(_position: Position, actions: Action[]): number {
  requireNoAction(actions, 'a1', 'a5', 'slider-hole', 'move');
  return 1;
}

function checkFriendlyCaptureAndKing(_position: Position, actions: Action[]): number {
  requireNoAction(actions, 'a1', 'a2', 'friendly-capture-no-king', 'move');
  assert(actions.every((action) => action.to !== 'e8'), 'friendly-capture-no-king: king capture was enumerated');
  return 2;
}

function checkFreshShift(position: Position, actions: Action[]): number {
  const action = requireAction(actions, 'A1', 'B1', 'fresh-pawn-shift', 'shift');
  const next = applyGeneratedAction(position, action);
  assert(next.board[squareIndex('c2')] === 1, 'fresh-pawn-shift: virgin pawn did not lose double-step state');
  assert(next.ep_target === -1 && next.ep_pawn === -1, 'fresh-pawn-shift: shift created en-passant metadata');
  return 2;
}

function checkRookShift(position: Position, actions: Action[]): number {
  const action = requireAction(actions, 'A1', 'B1', 'rook-shift-rights', 'shift');
  const next = applyGeneratedAction(position, action);
  assert((next.castling & 2) === 0, 'rook-shift-rights: white queen-side right survived rook shift');
  assert(next.board[squareIndex('c1')] === 4, 'rook-shift-rights: rook did not reach destination macro');
  return 2;
}

function checkRookCapture(position: Position, actions: Action[]): number {
  const action = requireAction(actions, 'a8', 'a1', 'rook-capture-rights');
  const next = applyGeneratedAction(position, action);
  assert((next.castling & (2 | 8)) === 0, 'rook-capture-rights: captured/source rook rights survived');
  return 1;
}

function makeCases(): MatrixCase[] {
  const blackKings = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a8'), -4], [squareIndex('h8'), -4],
  ], { side: -1, castling: 12 });
  const blackEp = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('d4'), -1], [squareIndex('e4'), 1],
  ], { side: -1, holes: (1 << 10) | (1 << 11), ep_target: squareIndex('e3'), ep_pawn: squareIndex('e4') });
  const blackPinnedEp = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('d8'), -6], [squareIndex('d1'), 4],
    [squareIndex('d4'), -1], [squareIndex('e4'), 1],
  ], { side: -1, holes: (1 << 10) | (1 << 11), ep_target: squareIndex('e3'), ep_pawn: squareIndex('e4') });
  const blackDouble = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('e7'), -7],
  ], { side: -1 });
  const whitePromotion = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a7'), 1],
  ]);
  const blackPromotion = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a2'), -1],
  ], { side: -1 });
  const blocked = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a1'), 4], [squareIndex('a4'), 3],
  ]);
  const holeBlocked = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a1'), 4],
  ], { holes: (1 << 4) | (1 << 9) });
  const friendlyCapture = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a1'), 4], [squareIndex('a2'), 3],
  ]);
  const freshShift = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a2'), 7],
  ], { holes: (1 << 1) | (1 << 9) });
  const rookShift = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a1'), 4],
  ], { holes: (1 << 1) | (1 << 9), castling: 2 });
  const rookCapture = emptyPosition([
    [squareIndex('e1'), 6], [squareIndex('e8'), -6], [squareIndex('a1'), 4], [squareIndex('a8'), -4],
  ], { side: -1, castling: 2 | 8 });
  const stalemate = emptyPosition([
    [squareIndex('h8'), -6], [squareIndex('f7'), 6], [squareIndex('g6'), 5],
    // In Rift Chess a stalemate must also close every shift source adjacent
    // to a hole. These opponent pawns occupy each such source macro.
    [squareIndex('a1'), 1], [squareIndex('c2'), 1], [squareIndex('e3'), 1],
    [squareIndex('a5'), 1], [squareIndex('c5'), 1],
  ], { side: -1, holes: (1 << 4) | (1 << 5) });
  const bareKings = emptyPosition([[squareIndex('e1'), 6], [squareIndex('e8'), -6]]);

  return [
    { name: 'black-castling', position: blackKings, source: 'structural-only', check: checkBlackCastling },
    { name: 'black-ep-legal', position: blackEp, source: 'structural-only', check: checkBlackEnPassant },
    { name: 'black-ep-pinned', position: blackPinnedEp, source: 'structural-only', check: checkPinnedEnPassant },
    { name: 'black-double', position: blackDouble, source: 'structural-only', check: checkBlackDouble },
    { name: 'ordinary-promotions-white', position: whitePromotion, source: 'structural-only',
      check: checkPromotions('a7', 'a8', 1, 'ordinary-promotions-white') },
    { name: 'ordinary-promotions-black', position: blackPromotion, source: 'structural-only',
      check: checkPromotions('a2', 'a1', -1, 'ordinary-promotions-black') },
    { name: 'slider-blocked', position: blocked, source: 'structural-only', check: checkSliderBlocked },
    { name: 'slider-hole', position: holeBlocked, source: 'structural-only', check: checkSliderHole },
    { name: 'friendly-capture-no-king', position: friendlyCapture, source: 'structural-only', check: checkFriendlyCaptureAndKing },
    { name: 'fresh-pawn-shift', position: freshShift, source: 'structural-only', check: checkFreshShift },
    { name: 'rook-shift-rights', position: rookShift, source: 'structural-only', check: checkRookShift },
    { name: 'rook-capture-rights', position: rookCapture, source: 'structural-only', check: checkRookCapture },
    { name: 'stalemate', position: stalemate, source: 'structural-only',
      check: (_position, actions) => { assert(actions.length === 0, `stalemate: expected no legal actions, got ${describe(actions)}`); return 1; } },
    { name: 'bare-kings', position: bareKings, source: 'structural-only',
      check: (position) => { requireOutcome(new Game('B', 'prompt', position), 'draw', 'bare_kings', 'bare-kings'); return 1; } },
  ];
}

function runOutcomePrecedence(): number {
  const autoFixture = fixtures.fixtures.find((fixture) => fixture.name === 'auto_at_99');
  const mateFixture = fixtures.fixtures.find((fixture) => fixture.name === 'mate_over_auto100');
  assert(autoFixture !== undefined && mateFixture !== undefined, 'outcome-precedence: canonical fixtures are missing');

  const progress = new Game('B', 'auto100', autoFixture.record.initial);
  progress.step(5);
  requireOutcome(progress, 'draw', 'progress100', 'outcome-precedence.auto100');
  progress.repetitions.set(repetitionKey(progress.state), 3);
  requireOutcome(progress, 'draw', 'threefold', 'outcome-precedence.repetition-over-auto100');

  const mate = new Game('B', 'auto100', mateFixture.record.initial);
  mate.step(14990);
  requireOutcome(mate, 'white_win', 'checkmate', 'outcome-precedence.mate-over-auto100');
  mate.repetitions.set(repetitionKey(mate.state), 3);
  requireOutcome(mate, 'white_win', 'checkmate', 'outcome-precedence.mate-over-repetition');
  return 4;
}

export function runRuleMatrix(): {
  ok: true;
  fixtures: number;
  mirroredChildren: number;
  structuralCases: number;
  covered: { mirroredFixtures: string[]; structuralCases: string[]; precedence: string[] };
  checks: number;
  coreSteps: number;
  v2Steps: number;
  specialChecks: number;
  unknowns: string[];
  scope: string;
} {
  const mirrored = runMirroredFixtures();
  let checks = mirrored.checks;
  let coreSteps = mirrored.steps;
  let v2Steps = mirrored.steps;
  let specialChecks = 0;
  const cases = makeCases();
  for (const testCase of cases) {
    const result = runCase(testCase);
    checks += result.checks;
    coreSteps += result.expected.length;
    v2Steps += result.expected.length;
    specialChecks += testCase.check ? result.checks - 3 - 2 - result.expected.length * 4 : 0;
  }
  specialChecks += runOutcomePrecedence();
  checks += 4;
  return {
    ok: true,
    fixtures: mirrored.fixtures,
    mirroredChildren: mirrored.children,
    structuralCases: cases.length,
    checks,
    coreSteps,
    v2Steps,
    specialChecks,
    unknowns: [
      'Finite imported-puzzle and structurally valid positions only; no reachability claim for hand-authored cases.',
      'The Python reference is available as an authority input but is not spawned from this Bun test.',
      'v2 legal_ids exhaustive enumeration is intentionally left to the separate v2 proof/conformance lane.',
      'No browser, GPU, packaged offline, hosted release, or owner-acceptance claim is made.',
    ],
    covered: {
      mirroredFixtures: fixtures.fixtures.map((fixture) => fixture.name),
      structuralCases: cases.map((testCase) => testCase.name),
      precedence: ['stalemate', 'bare_kings', 'threefold-over-auto100', 'checkmate-over-threefold/auto100'],
    },
    scope: 'Finite BOTH-COLOR reference and metamorphic matrix; not universal legality or proof.',
  };
}

if (import.meta.main) console.log(JSON.stringify(runRuleMatrix()));
