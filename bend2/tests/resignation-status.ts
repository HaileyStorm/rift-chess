import assert from 'node:assert/strict';
import Model from '../ui/v2/ChromeModel.bend';

const meta = (outcome: number) => ({ $: 'Meta', revision: 1, turn: true,
  inCheck: false, outcome, offer: 0, canUndo: false, botPaused: false, recovery: false });
assert.equal(Model.result_text(meta(8)), 'White resigned');
assert.equal(Model.result_text(meta(9)), 'Black resigned');
console.log('resignation-status: outcome 8 names White, outcome 9 names Black');
