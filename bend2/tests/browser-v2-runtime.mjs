import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function boundFile(file, digest, label) {
  assert.ok(path.isAbsolute(file), `${label} must be an absolute path`);
  assert.match(digest, /^[a-f0-9]{64}$/, `${label} needs an independent SHA-256`);
  const stat = fs.lstatSync(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `${label} must be a regular file`);
  if (label === 'browser executable' && process.platform === 'linux')
    assert.ok((stat.mode & 0o111) !== 0, 'browser executable lacks execute permission');
  assert.equal(fs.realpathSync(file), file, `${label} path is redirected`);
  assert.equal(sha(fs.readFileSync(file)), digest, `${label} bytes changed`);
  return { path: file, bytes: stat.size, sha256: digest };
}

export function packageTreeSnapshot(directory, label) {
  assert.ok(path.isAbsolute(directory), `${label} root must be absolute`);
  const rootStat = fs.lstatSync(directory);
  assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink());
  assert.equal(fs.realpathSync(directory), directory, `${label} root is redirected`);
  const files = [];
  let totalBytes = 0;
  const visit = relativeDir => {
    const current = path.join(directory, relativeDir);
    assert.equal(fs.realpathSync(current), current, `${label} directory is redirected`);
    for (const name of fs.readdirSync(current).sort(order)) {
      const relative = path.join(relativeDir, name);
      const full = path.join(directory, relative);
      const stat = fs.lstatSync(full);
      assert.ok(!stat.isSymbolicLink(), `${label} contains a symlink`);
      if (stat.isDirectory()) visit(relative);
      else {
        assert.ok(stat.isFile(), `${label} contains a non-file`);
        assert.equal(fs.realpathSync(full), full, `${label} file is redirected`);
        totalBytes += stat.size;
        assert.ok(files.length < 2048 && totalBytes <= 128 * 1024 ** 2,
          `${label} exceeds bounded package size`);
        files.push([relative.replaceAll('\\', '/'), stat.size, sha(fs.readFileSync(full))]);
      }
    }
  };
  visit('');
  files.sort(([a], [b]) => order(a, b));
  const digest = sha(JSON.stringify(files));
  return { path: directory, files: files.length, bytes: totalBytes, sha256: digest };
}

export function packageTreeBinding(directory, expectedSha256, label) {
  assert.match(expectedSha256, /^[a-f0-9]{64}$/, `${label} needs an independent tree SHA-256`);
  const snapshot = packageTreeSnapshot(directory, label);
  assert.equal(snapshot.sha256, expectedSha256, `${label} tree bytes changed`);
  return snapshot;
}

// The default remains the established project-local Playwright + Chrome test.
// A host-local cached alternative must be explicitly supplied and byte-bound;
// it does not install or copy dependencies from another project.
export async function browserV2Runtime(env = process.env) {
  const keys = ['BEND_LIVE_PLAYWRIGHT_ENTRY', 'BEND_LIVE_PLAYWRIGHT_SHA256',
    'BEND_LIVE_PLAYWRIGHT_PACKAGE_SHA256', 'BEND_LIVE_PLAYWRIGHT_TREE_SHA256',
    'BEND_LIVE_PLAYWRIGHT_CORE_DIR', 'BEND_LIVE_PLAYWRIGHT_CORE_TREE_SHA256',
    'BEND_LIVE_BROWSER_EXECUTABLE', 'BEND_LIVE_BROWSER_SHA256',
    'BEND_LIVE_BROWSER_VERSION'];
  const supplied = keys.filter(key => env[key] !== undefined && env[key] !== '');
  if (supplied.length === 0) {
    const { chromium } = await import('playwright');
    return { chromium, launch: { channel: 'chrome' },
      provenance: { mode: 'project-local-playwright-system-chrome' } };
  }
  assert.deepEqual(supplied, keys,
    `cached browser runtime requires all ${keys.length} exact inputs`);
  const entry = boundFile(env.BEND_LIVE_PLAYWRIGHT_ENTRY,
    env.BEND_LIVE_PLAYWRIGHT_SHA256, 'Playwright entry');
  const executable = boundFile(env.BEND_LIVE_BROWSER_EXECUTABLE,
    env.BEND_LIVE_BROWSER_SHA256, 'browser executable');
  assert.match(env.BEND_LIVE_BROWSER_VERSION, /^\d+(?:\.\d+){2,3}$/,
    'cached browser requires an exact dotted version');
  const packageFile = path.join(path.dirname(entry.path), 'package.json');
  const packageBinding = boundFile(packageFile,
    env.BEND_LIVE_PLAYWRIGHT_PACKAGE_SHA256, 'Playwright package');
  const packageRoot = path.dirname(entry.path);
  const packageTree = packageTreeBinding(packageRoot,
    env.BEND_LIVE_PLAYWRIGHT_TREE_SHA256, 'Playwright');
  const coreRoot = env.BEND_LIVE_PLAYWRIGHT_CORE_DIR;
  assert.equal(coreRoot, path.join(path.dirname(packageRoot), 'playwright-core'),
    'Playwright core must be its sibling resolved dependency');
  const coreTree = packageTreeBinding(coreRoot,
    env.BEND_LIVE_PLAYWRIGHT_CORE_TREE_SHA256, 'Playwright core');
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  assert.equal(pkg.name, 'playwright');
  assert.equal(pkg.version, '1.63.0');
  const corePkg = JSON.parse(fs.readFileSync(path.join(coreRoot, 'package.json'), 'utf8'));
  assert.equal(corePkg.name, 'playwright-core');
  assert.equal(corePkg.version, pkg.version);
  const imported = await import(pathToFileURL(entry.path).href);
  assert.equal(typeof imported.chromium?.launch, 'function');
  // Recheck after dependency loading, before any browser launch.
  boundFile(entry.path, entry.sha256, 'Playwright entry');
  boundFile(packageFile, packageBinding.sha256, 'Playwright package');
  packageTreeBinding(packageRoot, packageTree.sha256, 'Playwright');
  packageTreeBinding(coreRoot, coreTree.sha256, 'Playwright core');
  boundFile(executable.path, executable.sha256, 'browser executable');
  return { chromium: imported.chromium, launch: { executablePath: executable.path },
    expectedVersion: env.BEND_LIVE_BROWSER_VERSION,
    provenance: { mode: 'explicit-host-local-cache', playwrightVersion: pkg.version,
      entry, package: packageBinding, packageTree, coreTree, executable,
      trust: 'explicit owner-reviewed host-local package trees; no cross-project copy' } };
}
