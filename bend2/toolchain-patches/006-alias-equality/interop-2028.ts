// Candidate-only tag bridge for the unchanged TypeScript reference oracle.
// Bend 2.0.28 namespaces imported Model.Pos as ../Model.Pos in this entry
// book. All other checks remain in the frozen project's 2.0.27 interop.
import type { Position } from '../../../src/engine/types.ts';
import { asObject, fail, positionToBend as oldPositionToBend,
  assertPosition as oldAssertPosition } from '../../tests/interop.ts';
export { unwrapStep, functionFrom, bendBool, assertIds } from '../../tests/interop.ts';

const POSITION_TAG = '../Model.Pos';

export function positionToBend(position: Position): Record<string, unknown> {
  const value = oldPositionToBend(position);
  if (value.$ !== 'Pos') fail('Original interop position tag changed');
  return { ...value, $: POSITION_TAG };
}

export function assertPosition(expected: Position, actual: unknown, context: string): void {
  const value = asObject(actual, context);
  if (value.$ !== POSITION_TAG) fail(`${context}: expected 2.0.28 ${POSITION_TAG}, got ${String(value.$)}`);
  oldAssertPosition(expected, { ...value, $: 'Pos' }, context);
}
