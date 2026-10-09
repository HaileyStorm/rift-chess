// Publication for the isolated current Worker CLI. Failed staging bytes remain
// available to the caller; cleanup is an explicit ownership-reviewed operation.
import * as fs from "node:fs";
import * as path from "node:path";

type WorkerBuild = { files: Record<string, string>; entry: string;
  manifest: { program: string; artifacts: Record<string, string> } };
const stages = new Map<string, string>();

function realDirectories(directory: string): void {
  for (let at = path.resolve(directory); ; at = path.dirname(at)) {
    const stat = fs.lstatSync(at, {throwIfNoEntry: false});
    if (stat !== undefined) {
      if (!stat.isDirectory() || stat.isSymbolicLink()
        || fs.realpathSync(at) !== at) {
        throw new Error("worker output ancestor must be a real directory: " + at);
      }
    }
    if (at === path.dirname(at)) return;
  }
}

function targetDirectory(directory: string): string {
  const target = path.resolve(directory);
  if (target === path.parse(target).root) {
    throw new Error("refusing a filesystem root as the worker output directory");
  }
  realDirectories(target);
  if (fs.existsSync(target) && fs.readdirSync(target).length !== 0) {
    throw new Error("worker output directory must be empty");
  }
  return target;
}

export function workerStage(directory: string): { target: string; stage: string } {
  const target = targetDirectory(directory);
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  realDirectories(parent);
  const stage = fs.mkdtempSync(path.join(parent, ".bend-workers-"));
  realDirectories(stage);
  stages.set(stage, target);
  return { target, stage };
}

export function publishWorkerStage(stage: string, target: string): void {
  if (stages.get(stage) !== target || path.dirname(stage) !== path.dirname(target)) {
    throw new Error("worker publication requires its original private sibling stage");
  }
  realDirectories(stage);
  targetDirectory(target);
  let prior: string | undefined;
  if (fs.existsSync(target)) {
    prior = stage + ".empty-target";
    if (fs.existsSync(prior)) throw new Error("worker rollback path is occupied");
    fs.renameSync(target, prior);
  }
  try {
    if (prior !== undefined) {
      // An arrival between the emptiness check and rename must cause refusal,
      // before the new package becomes visible. Preserve and restore its bytes.
      realDirectories(prior);
      if (fs.readdirSync(prior).length !== 0) {
        throw new Error("worker output acquired files before publication");
      }
    }
    fs.renameSync(stage, target);
    stages.delete(stage);
  } catch (error) {
    // Never overwrite a concurrent arrival while restoring the displaced
    // target. If it cannot be restored, preserve both paths and report them.
    if (prior !== undefined) {
      if (fs.existsSync(target)) {
        throw new Error("worker publication failed; displaced target retained at "
          + prior + "; destination acquired a concurrent arrival", { cause: error });
      }
      fs.renameSync(prior, target);
    }
    throw error;
  }
  if (prior !== undefined) {
    try {
      realDirectories(prior);
      fs.rmdirSync(prior); // The displaced directory was rechecked before publish.
    } catch (error) {
      console.error("workers: prior empty output directory retained at " + prior
        + ": " + String(error));
    }
  }
}

export function writeWorkerFiles(build: WorkerBuild, directory: string): string[] {
  const entries = Object.entries(build.files);
  const names = Object.values(build.manifest.artifacts);
  if (entries.length !== 5 || new Set(names).size !== 5
    || !/^[0-9a-f]{64}$/.test(build.manifest.program)
    || !names.includes(build.entry)
    || entries.some(([name, source]) => !/^[A-Za-z0-9_.-]+$/.test(name)
      || name === "." || name === ".." || name !== path.basename(name)
      || !names.includes(name) || typeof source !== "string")) {
    throw new Error("invalid five-file worker artifact set");
  }
  const { target, stage } = workerStage(directory);
  try {
    for (const [name, source] of entries) {
      fs.writeFileSync(path.join(stage, name), source, { flag: "wx" });
    }
    publishWorkerStage(stage, target);
    return entries.map(([name]) => path.join(target, name));
  } catch (error) {
    throw new Error("worker output failed; private stage retained at " + stage,
      { cause: error });
  }
}
