// Read-only budget gate. Never follows links or deletes unknown artifacts.
import { lstat, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../.artifacts/', import.meta.url));
const limitGiB = Number(process.env.ARTIFACT_BUDGET_GIB ?? 12);
if (!Number.isFinite(limitGiB) || limitGiB <= 0) throw new Error('Invalid ARTIFACT_BUDGET_GIB');
const totals = new Map();
let files = 0, skippedLinks = 0;
async function inspect({ path, group }) {
  const s = await lstat(path);
  if (s.isSymbolicLink()) { skippedLinks++; return []; }
  if (s.isDirectory()) {
    return (await readdir(path)).map(name => ({ path: join(path, name), group: group ?? name }));
  } else if (s.isFile()) {
    totals.set(group, (totals.get(group) ?? 0) + s.size); files++;
  }
  return [];
}
// Bound metadata work without serializing every file or launching one promise
// per artifact. A batch settles completely before children or errors advance.
const pending = [{ path: resolve(root), group: undefined }];
while (pending.length) {
  const batch = pending.splice(Math.max(0, pending.length - 32), 32);
  const results = await Promise.allSettled(batch.map(inspect));
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason;
    for (const child of result.value) pending.push(child);
  }
}
const bytes = [...totals.values()].reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ bytes, GiB: +(bytes / 2 ** 30).toFixed(3), budgetGiB: limitGiB, files, skippedLinks,
  largest: [...totals].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, bytes]) => ({path, bytes})) }, null, 2));
if (bytes > limitGiB * 2 ** 30) {
  console.error('Artifact budget exceeded. Review eligible outputs and archive verified original bytes before generating more.');
  process.exitCode = 1;
}
