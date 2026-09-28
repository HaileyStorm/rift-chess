// Bounded, same-position Bun diagnostic for the post-move computation.
// Not a browser frame budget or native parallel benchmark.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import P from './program';
import Kernel from '../core/v2/Facade.bend';

const action = 3980; // e2-e4
const initial = P.start('', '', 1024, 640).state;
assert.equal(P.snapshot(initial).meta.revision, 0);
const committed = P.request_move(initial, action);
assert.equal(P.snapshot(committed.state).meta.revision, 1);
const command = { $: 'MoveCommand', expected: 0n, action };
assert.equal(Kernel.command(P.game(initial), command).$, 'Accepted');
const position = P.pos(committed.state);
const count = (list: any) => { let n = 0; while (list?.$ === 'Con') { n++; list = list.tail; } return n; };
assert.ok(count(Kernel.legal_ids(position)) > 0);

function sample(run: () => unknown) {
  for (let i = 0; i < 2; i++) run();
  const values = [];
  for (let i = 0; i < 7; i++) { const at = performance.now(); run(); values.push(performance.now() - at); }
  values.sort((a, b) => a - b);
  return { n: values.length, medianMs: +values[3].toFixed(2), p95Ms: +values[6].toFixed(2),
    samplesMs: values.map(value => +value.toFixed(2)) };
}
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const root = process.cwd();
const sources = ['bend2/core/v2/Facade.bend', 'bend2/core/v2/RuleKernel.bend',
  'bend2/ui/State.bend', 'bend2/ui/Commands.bend', 'bend2/ui/Actions.bend',
  'bend2/tests/commit-phase-v2.ts'];
const receipt = { schema: 'rift-bend-v2-commit-phase/1', at: new Date().toISOString(),
  sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  runtime: `Bun ${Bun.version}`, inputSubsetSha256: Object.fromEntries(sources.map(file => [file, sha(path.join(root, file))])),
  scope: 'Warm compiled Bend JavaScript; one initial position and one e2-e4 successor; no browser pixels or native parallelism',
  action, initialLegalCount: count(P.legal(initial)), successorLegalCount: count(P.legal(committed.state)),
  successorEnumeration: sample(() => count(Kernel.legal_ids(position))),
  matchCommand: sample(() => Kernel.command(P.game(initial), command)),
  acceptedCommandAndRefresh: sample(() => P.request_move(initial, action)),
};
const run = process.env.BEND_PHASE_RUN || new Date().toISOString().replace(/[:.]/g, '-');
assert.match(run, /^[A-Za-z0-9-]+$/);
const out = path.join(root, '.artifacts/bend2/profile', `commit-phase-${run}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ out, ...receipt }));
