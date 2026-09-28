import assert from 'node:assert/strict';
import Compact from '../ui/v2/ChromePlanCompact.bend';

// A selected queen can expose 27 destination groups. The compact MOVES
// panel must leave room for every row before placing its Close control.
const lastDestinationBottom = Math.max(...Array.from({length: 27}, (_, ordinal) => {
  const rect = Compact.destination(true, 7, ordinal);
  assert.ok(rect.x + rect.width <= 512);
  return rect.y + rect.height;
}));
const close = Compact.contextual(true, 7, 28);
assert.ok(close.y >= lastDestinationBottom + 8,
  `portrait MOVES Close overlaps destinations (${close.y} < ${lastDestinationBottom + 8})`);
assert.ok(close.y + close.height <= 1024, 'portrait MOVES Close exceeds the canvas');
console.log(`compact overflow geometry: 27 destinations end at ${lastDestinationBottom}; Close starts at ${close.y}`);
