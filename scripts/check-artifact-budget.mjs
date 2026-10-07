// Read-only budget gate. Never follows links or deletes unknown artifacts.
import { lstat, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../.artifacts/', import.meta.url));
const limitGiB = Number(process.env.ARTIFACT_BUDGET_GIB ?? 12);
if (!Number.isFinite(limitGiB) || limitGiB <= 0) throw new Error('Invalid ARTIFACT_BUDGET_GIB');
const totals = new Map();
let files = 0, skippedLinks = 0;
async function walk(path, group) {
  const s = await lstat(path);
  if (s.isSymbolicLink()) { skippedLinks++; return; }
  if (s.isDirectory()) {
    for (const name of await readdir(path)) await walk(join(path, name), group ?? name);
  } else if (s.isFile()) {
    totals.set(group, (totals.get(group) ?? 0) + s.size); files++;
  }
}
await walk(resolve(root));
const bytes = [...totals.values()].reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ bytes, GiB: +(bytes / 2 ** 30).toFixed(3), budgetGiB: limitGiB, files, skippedLinks,
  largest: [...totals].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, bytes]) => ({path, bytes})) }, null, 2));
if (bytes > limitGiB * 2 ** 30) {
  console.error('Artifact budget exceeded. Review eligible outputs and archive verified original bytes before generating more.');
  process.exitCode = 1;
}
