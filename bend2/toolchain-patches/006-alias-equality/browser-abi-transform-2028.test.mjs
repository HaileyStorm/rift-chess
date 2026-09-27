// Deterministic, source-bound transform tests. This does not invoke Bun.build,
// write candidate outputs, start a browser, or modify the host/worker sources.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  candidateBridgeEvidence,
  candidateBridgePlugin,
  candidateBridgeSourceHashes,
  transformCandidateBrowserSource,
} from './browser-abi-transform-2028.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const workerPath = path.join(root, 'bend2/platform/browser/worker-v2.ts');
const spritePath = path.join(root, 'bend2/platform/browser/sprite-helper.ts');
const hostPath = path.join(root, 'bend2/platform/browser/host.ts');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const workerBytes = fs.readFileSync(workerPath);
const spriteBytes = fs.readFileSync(spritePath);
const workerSource = workerBytes.toString('utf8');
const spriteSource = spriteBytes.toString('utf8');

assert.equal(hash(workerBytes), candidateBridgeSourceHashes['worker-v2']);
assert.equal(hash(spriteBytes), candidateBridgeSourceHashes['sprite-helper']);

const workerTransform = transformCandidateBrowserSource('worker-v2', workerSource);
const spriteTransform = transformCandidateBrowserSource('sprite-helper', spriteSource);
assert.deepEqual(workerTransform.evidence.anchors, [
  'adapter-import', 'bot-position', 'sprite-current-frame-check',
  'sprite-refined-frame-check', 'sprite-queued-frame-check',
  'sprite-schedule-frame', 'scene-render-frame', 'menu-data-plan',
  'plate-response', 'normalize-effects', 'host-sound-effect',
  'controller-input-batch',
]);
assert.deepEqual(spriteTransform.evidence.anchors, [
  'adapter-import', 'board-frame-envelope', 'plate-response', 'piece-response',
]);

for (const [source, transformed] of [
  [workerSource, workerTransform.contents], [spriteSource, spriteTransform.contents],
]) assert.notEqual(transformed, source);
assert.match(workerTransform.contents,
  /BrowserABI\.toControllerBatch\(\{ events: request\.events, presentation: request\.presentation \}\)/);
assert.match(workerTransform.contents, /BrowserABI\.positionForBotAdapter\(job\.position\)/);
assert.match(workerTransform.contents, /BrowserABI\.frameForBoardScene\(packet\.snapshot\.frame\)/);
assert.match(workerTransform.contents, /BrowserABI\.chromeForMenuAA\(packet\.chromeData, packet\.plan\)/);
assert.match(workerTransform.contents,
  /BrowserABI\.responsesForBoardScene\(responses, 'plates'\)/);
assert.match(workerTransform.contents, /BrowserABI\.toHostEffect\(effect\)/);
assert.match(spriteTransform.contents, /request\.frame\?\.\$ === '\.\.\/Scene\.Frame'/);
assert.match(spriteTransform.contents,
  /BrowserABI\.responsesForBoardScene\(plateResponses, 'plates'\)/);
assert.match(spriteTransform.contents,
  /BrowserABI\.responsesForBoardScene\(spriteResponses, 'pieces'\)/);
assert.doesNotMatch(workerTransform.contents, /request\.events\), request\.presentation, session/);
assert.doesNotMatch(spriteTransform.contents, /request\.frame\?\.\$ === 'Frame'/);

// The source paths remain byte-identical: all integration is returned as
// in-memory Bun onLoad contents only.
assert.deepEqual(fs.readFileSync(workerPath), workerBytes);
assert.deepEqual(fs.readFileSync(spritePath), spriteBytes);

// A single changed source byte invalidates the source anchor before any
// replacement can run. An absent/duplicate expected callsite likewise fails.
assert.throws(() => transformCandidateBrowserSource('worker-v2', `${workerSource}\n`),
  /source hash mismatch/);
assert.throws(() => transformCandidateBrowserSource('sprite-helper',
  spriteSource.replace("request.frame?.$ === 'Frame'", "request.frame?.$ === 'Other.Frame'")),
  /source hash mismatch/);

// Exercise the actual exported Bun plugin hook without starting a build.
const registrations = [];
candidateBridgePlugin.setup({
  onLoad(options, callback) { registrations.push({ options, callback }); },
});
assert.equal(registrations.length, 1);
assert.equal((await registrations[0].callback({ path: hostPath })), null,
  'host.ts remains bare and is not transformed');
const workerLoad = await registrations[0].callback({ path: workerPath });
const spriteLoad = await registrations[0].callback({ path: spritePath });
assert.equal(workerLoad.loader, 'ts');
assert.equal(spriteLoad.loader, 'ts');
assert.equal(hash(Buffer.from(workerLoad.contents)), workerTransform.evidence.transformedSha256);
assert.equal(hash(Buffer.from(spriteLoad.contents)), spriteTransform.evidence.transformedSha256);

const evidence = candidateBridgeEvidence();
assert.equal(evidence.schema, 'rift-bend-candidate-browser-bridge/1');
assert.equal(evidence.sources.length, 2);
assert.deepEqual(evidence.sources.map(item => item.sourcePath), [
  'bend2/platform/browser/sprite-helper.ts', 'bend2/platform/browser/worker-v2.ts',
]);
assert.equal(evidence.sources.find(item => item.sourcePath.endsWith('worker-v2.ts'))
  .transformedSha256, workerTransform.evidence.transformedSha256);
assert.equal(evidence.sources.find(item => item.sourcePath.endsWith('sprite-helper.ts'))
  .transformedSha256, spriteTransform.evidence.transformedSha256);
console.log(JSON.stringify({ passed: true, evidence }, null, 2));
