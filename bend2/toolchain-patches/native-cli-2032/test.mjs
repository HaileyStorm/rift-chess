import assert from 'node:assert/strict';
import Args from './Args2032.bend';

const list = (values) => values.reduceRight(
  (tail, head) => ({ $: 'Con', head, tail }),
  { $: 'Nil' },
);
const toArray = (xs) => {
  const values = [];
  for (let current = xs; current.$ !== 'Nil'; current = current.tail) values.push(current.head);
  return values;
};

const userArgs = ['--help', '', 'move', '3980'];
const present = Args.strip_program(list([
  'C:\\Program Files\\Rift Chess\\rift-chess-native-cli', ...userArgs,
]));
assert.equal(present.$, 'WithProgram');
assert.deepEqual(toArray(present.args), userArgs,
  'remove only the nonempty leading program and preserve every user argument');

const noUserArgs = Args.strip_program(list(['rift-chess-native-cli']));
assert.equal(noUserArgs.$, 'WithProgram', 'program-only invocation is valid');
assert.deepEqual(toArray(noUserArgs.args), [], 'program-only invocation has no user arguments');

const unknown = Args.strip_program(list(['rift-chess-native-cli', 'not-a-command', 'moves']));
assert.equal(unknown.$, 'WithProgram');
assert.deepEqual(toArray(unknown.args), ['not-a-command', 'moves'],
  'an unknown user command must remain first for the existing dispatch error');

assert.equal(Args.strip_program(list([])).$, 'MissingProgram',
  'an empty argv is rejected instead of treated as a command');
assert.equal(Args.strip_program(list([''])).$, 'EmptyProgram',
  'an empty invoked-program item is rejected');

console.log('native-cli-2032 adapter: exact leading-item removal, argument preservation, and malformed argv rejection passed');
