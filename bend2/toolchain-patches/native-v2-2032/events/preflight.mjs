import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.platform, 'win32',
  'this raw-byte source preflight is Windows-only; Linux needs its own EOL-bound gate');

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const toolchain = resolve(root, '.artifacts/toolchains/bend-2.0.32-scout');
assert.equal(execFileSync('git', ['-C', toolchain, 'rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim(), '573002f01ec6c52416d44489543f69a9625facf8',
'the event semantics are pinned to pristine Bend 2.0.32');
assert.equal(execFileSync('git', ['-C', toolchain, 'status', '--porcelain', '--untracked-files=all'], {
  cwd: root, encoding: 'utf8',
}).trim(), '', 'the 2.0.32 scout must be clean');
const readBound = (relative, expected) => {
  const bytes = readFileSync(resolve(root, relative));
  assert.equal(hash(bytes), expected, `${relative} source binding`);
  return bytes.toString('utf8');
};

const native = readBound('bend2/NativeV2.bend',
  '29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d');
const program = readBound('bend2/ui/Program.bend',
  'f8f61a9f8eea865e9d8a76d3eabaf2852d41dfb08f267bb3ca33a020d32d2f0b');
const types = readBound('bend2/ui/Types.bend',
  'd8f40447f58f9f825b9808128619c57a6cde14b3a67879e799c4fa9b3794c5ce');
const browserHost = readBound('bend2/platform/browser/host.ts',
  '5354d12fcd278393b546c51260b06db553ddf8ac7531b60293a39bd374321374');
const base2032 = readBound('.artifacts/toolchains/bend-2.0.32-scout/bend2/base.bend',
  'a548d71e16e3e1b19f08ab187c1b04afabb7a3cf5fefa067004b77b6eaca9ba0');
const window2032 = readBound('.artifacts/toolchains/bend-2.0.32-scout/bend2/effs/window.c',
  '94b62c07d3a9d66a60729c2c517bcb8810a4137b859ab3f2581d2fac347f7aa4');

assert.ok(base2032.includes('Look{dx: F32, dy: F32}'));
assert.ok(base2032.includes('Scroll{x: U32, y: U32, dx: F32, dy: F32}'));
assert.match(window2032, /f32 s\s*=\s*b % 2 \? -1 : 1;/);
assert.match(window2032, /f32_rewrap\(b > 5 \? 0 : s\)/);
assert.match(program, /F32\.sub\(U32\.to_f32\(zoom\), F32\.mul\(delta, 0\.025\)\)/);
assert.match(types, /Wheel\{x: U32, y: U32, delta: F32\}/);
assert.match(browserHost, /delta: event\.deltaY/);

const patchPath = resolve(directory, '0001-native-v2-events.patch');
const patchBytes = readFileSync(patchPath);
assert.equal(hash(patchBytes),
  '28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa',
  'versioned event patch binding');
const patch = patchBytes.toString('utf8');
const added = patch.split(/\r?\n/)
  .filter(line => line.startsWith('+') && !line.startsWith('+++'))
  .map(line => line.slice(1));
const removed = patch.split(/\r?\n/)
  .filter(line => line.startsWith('-') && !line.startsWith('---'));
assert.deepEqual(removed, [], 'the patch must not replace existing event arms');
assert.deepEqual(added, [
  '    case Look{_, _} <> rest:',
  '      events_go(rest, alt_mask, ctrl_mask, shift_mask, acc, closed)',
  '    case Scroll{x, y, _, dy} <> rest:',
  '      events_go(rest, alt_mask, ctrl_mask, shift_mask,',
  '        T.Wheel{x, y, F32.sub(0.0, F32.mul(dy, 100.0))} <> acc, closed)',
], 'only the two new Base event arms may be added');

execFileSync('git', ['apply', '--check', patchPath], {
  cwd: root,
  stdio: 'inherit',
});

const f32 = Math.fround;
const scrollInput = ({ x, y, dy }) => ({
  $: 'Wheel', x, y, delta: f32(f32(0) - f32(f32(dy) * f32(100))),
});
const lookInputs = () => [];
const boundedZoomBeforeU32 = (zoom, delta) => Math.min(130, Math.max(75,
  f32(f32(zoom) - f32(f32(delta) * f32(0.025)))));

const up = scrollInput({ x: 23, y: 41, dx: 99, dy: 1 });
const down = scrollInput({ x: 23, y: 41, dx: -99, dy: -1 });
assert.deepEqual(up, { $: 'Wheel', x: 23, y: 41, delta: -100 });
assert.deepEqual(down, { $: 'Wheel', x: 23, y: 41, delta: 100 });
assert.deepEqual(scrollInput({ x: 23, y: 41, dx: -500, dy: 1 }), up,
  'horizontal scroll has no UI input mapping');
assert.deepEqual(lookInputs({ dx: 5, dy: -7 }), [],
  'Look is deliberately ignored while NativeV2 does not grab the cursor');
assert.equal(boundedZoomBeforeU32(100, up.delta), 102.5, 'X11 wheel-up zooms in');
assert.equal(boundedZoomBeforeU32(100, down.delta), 97.5, 'X11 wheel-down zooms out');
assert.equal(boundedZoomBeforeU32(100, -100), 102.5, 'the sign matches browser deltaY');
assert.equal(boundedZoomBeforeU32(100, 100), 97.5, 'browser-compatible wheel-down zooms out');
assert.equal(boundedZoomBeforeU32(100, -10000), 130, 'the existing UI zoom cap bounds upward input');
assert.equal(boundedZoomBeforeU32(100, 10000), 75, 'the existing UI zoom floor bounds downward input');

console.log('native-v2-2032 events: exact source bindings, read-only patch check, and pure mapping controls passed');
