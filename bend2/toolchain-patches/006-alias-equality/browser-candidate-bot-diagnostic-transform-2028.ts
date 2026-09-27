/**
 * Candidate-only, in-memory instrumentation for proving the browser BotAdapter
 * route. This is deliberately separate from worker-v2.ts and is never used by
 * the pinned/production build.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BunPlugin } from 'bun';
import { transformCandidateBrowserSource } from './browser-abi-transform-2028.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const workerPath = path.join(root, 'bend2/platform/browser/worker-v2.ts');
const diagnosticSourcePath = fileURLToPath(import.meta.url);

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function applyExactAnchor(source: string, name: string, before: string, after: string): string {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0)
    throw new Error(`Candidate bot diagnostic expected exactly one ${name} anchor`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

export const candidateBotDiagnosticAnchors = Object.freeze([
  'diagnostic-emitter', 'session-ready', 'worker-session-choice-capture', 'worker-choice',
  'worker-choice-applied', 'serial-fallback',
]);

export type CandidateBotDiagnosticEvidence = Readonly<{
  schema: 'rift-bend-candidate-bot-route-instrumentation/1';
  nonce: string;
  sourcePath: string;
  sourceSha256: string;
  abiTransformedSha256: string;
  diagnosticTransformedSha256: string;
  abiAnchors: readonly string[];
  diagnosticAnchors: readonly string[];
  diagnosticSourcePath: string;
  diagnosticSourceSha256: string;
}>;

export function transformCandidateBotWorker(source: string, nonce: string): {
  contents: string;
  evidence: CandidateBotDiagnosticEvidence;
} {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce))
    throw new Error('Candidate bot diagnostic nonce must be a UUID');

  const abi = transformCandidateBrowserSource('worker-v2', source);
  let contents = abi.contents;
  const emit = `const candidateBotDiagnosticNonce = ${JSON.stringify(nonce)};\n` +
    `function candidateBotDiagnostic(op: string, fields: Record<string, unknown>): void {\n` +
    `  self.postMessage({ kind: 'candidate-bot-diagnostic', nonce: candidateBotDiagnosticNonce, op, ...fields });\n` +
    `}\n`;

  contents = applyExactAnchor(contents, 'diagnostic-emitter',
    'let botRevision: number | null = null;\n',
    `let botRevision: number | null = null;\n${emit}`);

  contents = applyExactAnchor(contents, 'session-ready',
    '      botSession = candidate;\n      return candidate;',
    `      botSession = candidate;\n` +
    `      candidateBotDiagnostic('session-ready', { generation, warmupCompleted: true });\n` +
    `      return candidate;`);

  contents = applyExactAnchor(contents, 'worker-session-choice-capture',
    '  void ensureBotSession().then((workerSession) =>\n' +
    '    workerSession.call(\'choose\', [BrowserABI.positionForBotAdapter(job.position), job.ids])).then((id: number) => {',
    '  void ensureBotSession().then((workerSession) =>\n' +
    '    workerSession.call(\'choose\', [BrowserABI.positionForBotAdapter(job.position), job.ids])' +
    '.then((id: number) => ({ id, workerSession })))\n' +
    '    .then(({ id, workerSession }) => {');

  contents = applyExactAnchor(contents, 'worker-choice',
    '      if (generation !== botGeneration) return;\n      botWork.set(job.revision, { kind: \'ready\', id });',
    `      if (generation !== botGeneration) return;\n` +
    `      const stats = workerSession.stats();\n` +
    `      candidateBotDiagnostic('choose', { revision: job.revision, id, legalIds: values(job.ids),\n` +
    `        workerStats: { completed: stats.completed, remoteJobs: stats.remoteJobs,\n` +
    `          requiredWitnesses: stats.requiredWitnesses } });\n` +
    `      botWork.set(job.revision, { kind: 'ready', id });`);

  contents = applyExactAnchor(contents, 'worker-choice-applied',
    '    const next = api.bot_apply_at(job.revision, work.id, packet.session);\n' +
    '    if (next.presentation.revision === job.revision)',
    `    const next = api.bot_apply_at(job.revision, work.id, packet.session);\n` +
    `    candidateBotDiagnostic('applied', { revision: job.revision, id: work.id,\n` +
    `      baseRevision: packet.presentation.revision, nextRevision: next.presentation.revision,\n` +
    `      via: 'bot_apply_at' });\n` +
    `    if (next.presentation.revision === job.revision)`);

  contents = applyExactAnchor(contents, 'serial-fallback',
    '    const next = api.bot_fallback_at(job.revision, packet.session);',
    `    candidateBotDiagnostic('fallback', { revision: job.revision,\n` +
    `      reason: botUnavailable ?? (work?.kind === 'unavailable' ? work.message : 'unavailable') });\n` +
    `    const next = api.bot_fallback_at(job.revision, packet.session);`);

  const evidence: CandidateBotDiagnosticEvidence = Object.freeze({
    schema: 'rift-bend-candidate-bot-route-instrumentation/1',
    nonce,
    sourcePath: 'bend2/platform/browser/worker-v2.ts',
    sourceSha256: abi.evidence.sourceSha256,
    abiTransformedSha256: abi.evidence.transformedSha256,
    diagnosticTransformedSha256: sha256(Buffer.from(contents, 'utf8')),
    abiAnchors: Object.freeze([...abi.evidence.anchors]),
    diagnosticAnchors: candidateBotDiagnosticAnchors,
    diagnosticSourcePath: path.relative(root, diagnosticSourcePath).replaceAll('\\', '/'),
    diagnosticSourceSha256: sha256(fs.readFileSync(diagnosticSourcePath)),
  });
  return { contents, evidence };
}

export function candidateBotDiagnosticPlugin(nonce: string): {
  plugin: BunPlugin;
  evidence(): CandidateBotDiagnosticEvidence;
} {
  let transformedEvidence: CandidateBotDiagnosticEvidence | null = null;
  const plugin: BunPlugin = {
    name: 'rift-bend-2-0-28-candidate-bot-route-diagnostic',
    setup(build) {
      build.onLoad({ filter: /worker-v2\.ts$/ }, ({ path: file }) => {
        if (path.resolve(file) !== path.resolve(workerPath)) return null;
        const source = fs.readFileSync(workerPath, 'utf8');
        const transformed = transformCandidateBotWorker(source, nonce);
        transformedEvidence = transformed.evidence;
        return { contents: transformed.contents, loader: 'ts', resolveDir: path.dirname(workerPath) };
      });
    },
  };
  return {
    plugin,
    evidence() {
      if (!transformedEvidence)
        throw new Error('Candidate bot diagnostic source was not transformed during the diagnostic build');
      if (sha256(fs.readFileSync(workerPath)) !== transformedEvidence.sourceSha256)
        throw new Error('Candidate bot diagnostic worker source changed during bundling');
      if (sha256(fs.readFileSync(diagnosticSourcePath)) !== transformedEvidence.diagnosticSourceSha256)
        throw new Error('Candidate bot diagnostic transform changed during bundling');
      return transformedEvidence;
    },
  };
}
