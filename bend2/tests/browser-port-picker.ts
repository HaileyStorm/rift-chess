import assert from 'node:assert/strict';
import { Ports } from '../platform/browser/ports.ts';

class Input {
  type = '';
  files: File[] | null = null;
  clicks = 0;
  private changed: (() => void) | null = null;
  addEventListener(type: string, listener: () => void): void {
    assert.equal(type, 'change');
    this.changed = listener;
  }
  click(): void { this.clicks++; }
  choose(file?: File): void { this.files = file ? [file] : []; this.changed?.(); }
}
const inputs: Input[] = [];
globalThis.document = { createElement: (tag: string) => {
  assert.equal(tag, 'input');
  const input = new Input(); inputs.push(input); return input;
} } as unknown as Document;

const delivered: unknown[] = [];
const ports = new Ports([], event => delivered.push(event), 8);
const file = (text: string) => ({ size: text.length, text: async () => text }) as File;
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

const early = ports.preparePickFile()!;
assert.equal(inputs.at(-1)?.clicks, 1);
inputs.at(-1)!.choose(file('early'));
assert.deepEqual(delivered, [], 'selection cannot reach Bend before its effect');
await ports.execute({ $: 'PickFile' }, early);
await flush();
assert.deepEqual(delivered.splice(0), [{ $: 'FileText', text: 'early' }]);

const late = ports.preparePickFile()!;
await ports.execute({ $: 'PickFile' }, late);
assert.deepEqual(delivered, []);
inputs.at(-1)!.choose(file('late'));
await flush();
assert.deepEqual(delivered.splice(0), [{ $: 'FileText', text: 'late' }]);

const rejected = ports.preparePickFile()!;
ports.discardPickFile(rejected);
inputs.at(-1)!.choose(file('discarded'));
await flush();
assert.deepEqual(delivered, [], 'a frame without PickFile cannot import');

const canceled = ports.preparePickFile()!;
await ports.execute({ $: 'PickFile' }, canceled);
inputs.at(-1)!.choose();
await flush();
assert.deepEqual(delivered, [], 'canceling a chooser leaves the game alone');

const oversized = ports.preparePickFile()!;
inputs.at(-1)!.choose({ size: 9, text: async () => { throw Error('read oversized'); } } as File);
await ports.execute({ $: 'PickFile' }, oversized);
await flush();
assert.deepEqual(delivered.splice(0), [{ $: 'PortError', kind: 9001 }]);

let finishOld!: (text: string) => void;
const oldFile = { size: 3, text: () => new Promise<string>(resolve => { finishOld = resolve; }) } as File;
const old = ports.preparePickFile()!;
inputs.at(-1)!.choose(oldFile);
await ports.execute({ $: 'PickFile' }, old);
const latest = ports.preparePickFile()!;
finishOld('old'); await flush();
assert.deepEqual(delivered, [], 'a superseded async read cannot import');
inputs.at(-1)!.choose(file('new'));
await ports.execute({ $: 'PickFile' }, latest);
await flush();
assert.deepEqual(delivered.splice(0), [{ $: 'FileText', text: 'new' }]);

const fault = ports.preparePickFile()!;
inputs.at(-1)!.choose(file('fault'));
ports.cancelPickFiles();
await ports.execute({ $: 'PickFile' }, fault);
await flush();
assert.deepEqual(delivered, [], 'fault/teardown invalidates a selected file');

const clicks = inputs.length;
await ports.execute({ $: 'PickFile' });
assert.equal(inputs.length, clicks, 'an unmatched late effect must not open a duplicate chooser');
assert.deepEqual(delivered.splice(0), [{ $: 'PortError', kind: 2 }]);
console.log(JSON.stringify({ ok: true, checks: [
  'pre-effect and post-effect selections', 'discard and cancellation',
  'pre-read size limit', 'superseded asynchronous read', 'fault invalidation',
  'unmatched effect has no late click',
] }));
