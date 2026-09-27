/**
 * Candidate-only in-memory source bridge for a disposable Bend 2.0.28 browser
 * build. This plugin never writes or edits the browser host/worker sources.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BunPlugin } from 'bun';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const adapterPath = path.join(root,
  'bend2/toolchain-patches/006-alias-equality/browser-abi-2028.ts');
const workerPath = path.join(root, 'bend2/platform/browser/worker-v2.ts');
const spritePath = path.join(root, 'bend2/platform/browser/sprite-helper.ts');

const expectedSourceHashes = Object.freeze({
  'worker-v2': 'c5b8b4144973215c297b0105bf9e97f0d532b140686ea91bfcff289c0b7d5e7e',
  'sprite-helper': '6f9d9d64fc51ac763e0aff10dfcf64c2c6d9d95537bd7fb4a862ccdd8c1fb231',
});

type SourceKind = keyof typeof expectedSourceHashes;
type SourceEvidence = Readonly<{
  sourcePath: string;
  sourceSha256: string;
  transformedSha256: string;
  anchors: readonly string[];
}>;

const evidenceByPath = new Map<string, SourceEvidence>();
const adapterSha256AtLoad = hash(fs.readFileSync(adapterPath));

function hash(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function relative(file: string): string {
  return path.relative(root, file).replaceAll('\\', '/');
}

type ExactAnchor = Readonly<{ name: string; before: string; after: string }>;

function applyExactAnchors(source: string, kind: SourceKind,
  anchors: readonly ExactAnchor[]): { contents: string; names: string[] } {
  let contents = source;
  const names: string[] = [];
  for (const anchor of anchors) {
    const first = contents.indexOf(anchor.before);
    if (first < 0 || contents.indexOf(anchor.before, first + anchor.before.length) >= 0)
      throw new Error(`${kind}: expected exactly one source anchor ${anchor.name}`);
    contents = contents.slice(0, first) + anchor.after +
      contents.slice(first + anchor.before.length);
    names.push(anchor.name);
  }
  return { contents, names };
}

const workerAnchors: readonly ExactAnchor[] = [
  {
    name: 'adapter-import',
    before: "import MenuAA from '../../ui/v2/MenuAA.bend';\n",
    after: "import MenuAA from '../../ui/v2/MenuAA.bend';\n" +
      "import * as BrowserABI from '../../toolchain-patches/006-alias-equality/browser-abi-2028.ts';\n",
  },
  {
    name: 'bot-position',
    before: "workerSession.call('choose', [job.position, job.ids])",
    after: "workerSession.call('choose', [BrowserABI.positionForBotAdapter(job.position), job.ids])",
  },
  {
    name: 'sprite-current-frame-check',
    before: '!scene.sprite_same_placement(pending.frame, current.snapshot.frame)',
    after: '!scene.sprite_same_placement(pending.frame, BrowserABI.frameForBoardScene(current.snapshot.frame))',
  },
  {
    name: 'sprite-refined-frame-check',
    before: '!scene.sprite_same_placement(pending.frame, refined.snapshot.frame)',
    after: '!scene.sprite_same_placement(pending.frame, BrowserABI.frameForBoardScene(refined.snapshot.frame))',
  },
  {
    name: 'sprite-queued-frame-check',
    before: '!scene.sprite_same_placement(queued.frame, current.snapshot.frame)',
    after: '!scene.sprite_same_placement(queued.frame, BrowserABI.frameForBoardScene(current.snapshot.frame))',
  },
  {
    name: 'sprite-schedule-frame',
    before: 'const frame = packet.snapshot.frame, theme = packet.render.theme;',
    after: 'const frame = BrowserABI.frameForBoardScene(packet.snapshot.frame), theme = packet.render.theme;',
  },
  {
    name: 'scene-render-frame',
    before: 'const frame = packet.snapshot.frame;',
    after: 'const frame = BrowserABI.frameForBoardScene(packet.snapshot.frame);',
  },
  {
    name: 'menu-data-plan',
    before: 'const data = packet.chromeData, plan = packet.plan;',
    after: 'const { data, plan } = BrowserABI.chromeForMenuAA(packet.chromeData, packet.plan);',
  },
  {
    name: 'plate-response',
    before: 'plates = scene.load_plates(list(responses));',
    after: "plates = scene.load_plates(list(BrowserABI.responsesForBoardScene(responses, 'plates')));",
  },
  {
    name: 'normalize-effects',
    before: "if (effect.$ !== 'Sound') return effect;",
    after: "const hostEffect = BrowserABI.toHostEffect(effect);\n" +
      "    if (hostEffect.$ !== 'Sound') return hostEffect;",
  },
  {
    name: 'host-sound-effect',
    before: "return { $: 'Sound', samples: samples.buffer, rate };",
    after: "return { $: hostEffect.$, samples: samples.buffer, rate };",
  },
  {
    name: 'controller-input-batch',
    before: 'packet = api.dispatch_at_web(list(request.events), request.presentation, session);',
    after: 'const adapted = BrowserABI.toControllerBatch({ events: request.events, presentation: request.presentation });\n' +
      '      packet = api.dispatch_at_web(list(adapted.events), adapted.presentation, session);',
  },
];

const spriteAnchors: readonly ExactAnchor[] = [
  {
    name: 'adapter-import',
    before: "import { loadAssetRequests } from './asset-port';\n",
    after: "import { loadAssetRequests } from './asset-port';\n" +
      "import * as BrowserABI from '../../toolchain-patches/006-alias-equality/browser-abi-2028.ts';\n",
  },
  {
    name: 'board-frame-envelope',
    before: "request.frame?.$ === 'Frame' && request.frame.theme === request.theme;",
    after: "request.frame?.$ === '../Scene.Frame' && request.frame.theme === request.theme;",
  },
  {
    name: 'plate-response',
    before: 'nextPlates = board.load_plates(list(plateResponses));',
    after: "nextPlates = board.load_plates(list(BrowserABI.responsesForBoardScene(plateResponses, 'plates')));",
  },
  {
    name: 'piece-response',
    before: 'const decoded = board.load_sprite_pages(list(spriteResponses));',
    after: "const decoded = board.load_sprite_pages(list(BrowserABI.responsesForBoardScene(spriteResponses, 'pieces')));",
  },
];

export function transformCandidateBrowserSource(kind: SourceKind, source: string): {
  contents: string;
  evidence: SourceEvidence;
} {
  const sourceSha256 = hash(Buffer.from(source, 'utf8'));
  if (sourceSha256 !== expectedSourceHashes[kind])
    throw new Error(`${kind}: source hash mismatch; candidate bridge is stale`);
  const transformed = applyExactAnchors(source, kind,
    kind === 'worker-v2' ? workerAnchors : spriteAnchors);
  if (transformed.contents === source)
    throw new Error(`${kind}: candidate transform unexpectedly made no changes`);
  const evidence: SourceEvidence = Object.freeze({
    sourcePath: relative(kind === 'worker-v2' ? workerPath : spritePath),
    sourceSha256,
    transformedSha256: hash(Buffer.from(transformed.contents, 'utf8')),
    anchors: Object.freeze(transformed.names),
  });
  evidenceByPath.set(evidence.sourcePath, evidence);
  return { contents: transformed.contents, evidence };
}

/** Return the source and transformed byte bindings after both entrypoints load. */
export function candidateBridgeEvidence(): Readonly<{
  schema: 'rift-bend-candidate-browser-bridge/1';
  adapterPath: string;
  adapterSha256: string;
  sources: readonly SourceEvidence[];
}> {
  const sources = [...evidenceByPath.values()].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath, 'en'));
  const expectedPaths = [relative(workerPath), relative(spritePath)].sort((a, b) => a.localeCompare(b, 'en'));
  if (JSON.stringify(sources.map(item => item.sourcePath)) !== JSON.stringify(expectedPaths))
    throw new Error('Candidate bridge evidence is incomplete; both browser worker sources must be transformed');
  if (hash(fs.readFileSync(adapterPath)) !== adapterSha256AtLoad)
    throw new Error('Candidate ABI adapter changed during browser build');
  for (const item of sources) {
    const fullPath = path.join(root, ...item.sourcePath.split('/'));
    if (hash(fs.readFileSync(fullPath)) !== item.sourceSha256)
      throw new Error(`Candidate bridge source changed during browser build: ${item.sourcePath}`);
  }
  return Object.freeze({
    schema: 'rift-bend-candidate-browser-bridge/1',
    adapterPath: relative(adapterPath),
    adapterSha256: adapterSha256AtLoad,
    sources: Object.freeze(sources),
  });
}

export const candidateBridgePlugin: BunPlugin = {
  name: 'rift-bend-2-0-28-candidate-browser-abi',
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, ({ path: file }) => {
      const absolute = path.resolve(file);
      const kind: SourceKind | undefined = absolute === path.resolve(workerPath) ? 'worker-v2'
        : absolute === path.resolve(spritePath) ? 'sprite-helper' : undefined;
      if (!kind) return null;
      const source = fs.readFileSync(absolute, 'utf8');
      const transformed = transformCandidateBrowserSource(kind, source);
      return { contents: transformed.contents, loader: 'ts', resolveDir: path.dirname(absolute) };
    });
  },
};

export const candidateBridgeSourceHashes = expectedSourceHashes;
