import assert from 'node:assert/strict';
// @ts-ignore Each Bend source is compiled as a separate JS book by the pinned loader.
import Producer from './Producer.bend';
// @ts-ignore Cross-module use is a deliberately tested browser FFI boundary.
import Consumer from './Consumer.bend';

const a = Producer as Record<string, (...args: any[]) => any>;
const b = Consumer as Record<string, (...args: any[]) => any>;
const value = a.make();
assert.equal(value.$, 'Packet');
assert.equal(value.score, 7);
assert.equal(value.label, 'f3 selected');
assert.equal(value.image.$, 'Qua');
assert.equal(b.sample(value), 1122867);
assert.strictEqual(b.image(value), value.image, 'cross-book Image identity is retained');
assert.strictEqual(b.roundtrip(value), value, 'cross-book Data identity is retained');
assert.deepEqual(value, a.make(), 'the source value is unchanged after cross-book calls');
console.log('two independently compiled Bend books accepted shared Data/Image objects and preserved identity');
