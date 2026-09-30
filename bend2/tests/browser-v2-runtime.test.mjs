import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { browserV2Runtime, packageTreeSnapshot } from './browser-v2-runtime.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let defaultImports = 0;
const fallback = await browserV2Runtime({}, async () => {
  defaultImports++;
  return { chromium: { launch() {} } };
});
assert.equal(fallback.launch.channel, 'chrome');
assert.equal(typeof fallback.chromium.launch, 'function');
assert.equal(defaultImports, 1);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-browser-runtime-'));
const packageRoot = path.join(fixture, 'playwright');
const coreRoot = path.join(fixture, 'playwright-core');
const entry = path.join(packageRoot, 'index.mjs');
const pkg = path.join(packageRoot, 'package.json');
const corePkg = path.join(coreRoot, 'package.json');
const browser = path.join(fixture, 'chromium');
try {
  await assert.rejects(browserV2Runtime({ BEND_LIVE_PLAYWRIGHT_ENTRY: entry }),
    /all 9 exact inputs/);
  fs.mkdirSync(packageRoot);
  fs.mkdirSync(coreRoot);
  fs.writeFileSync(entry, 'export const chromium = { launch() {} };\n', { flag: 'wx' });
  fs.writeFileSync(pkg, '{"name":"playwright","version":"1.63.0","type":"module"}\n', { flag: 'wx' });
  fs.writeFileSync(corePkg, '{"name":"playwright-core","version":"1.63.0"}\n', { flag: 'wx' });
  fs.writeFileSync(browser, 'owned synthetic executable bytes', { flag: 'wx' });
  if (process.platform === 'linux') fs.chmodSync(browser, 0o755);
  const env = {
    BEND_LIVE_PLAYWRIGHT_ENTRY: entry,
    BEND_LIVE_PLAYWRIGHT_SHA256: sha(fs.readFileSync(entry)),
    BEND_LIVE_PLAYWRIGHT_PACKAGE_SHA256: sha(fs.readFileSync(pkg)),
    BEND_LIVE_PLAYWRIGHT_TREE_SHA256: packageTreeSnapshot(packageRoot, 'Playwright').sha256,
    BEND_LIVE_PLAYWRIGHT_CORE_DIR: coreRoot,
    BEND_LIVE_PLAYWRIGHT_CORE_TREE_SHA256: packageTreeSnapshot(coreRoot, 'Playwright core').sha256,
    BEND_LIVE_BROWSER_EXECUTABLE: browser,
    BEND_LIVE_BROWSER_SHA256: sha(fs.readFileSync(browser)),
    BEND_LIVE_BROWSER_VERSION: '140.0.7339.16',
  };
  const explicit = await browserV2Runtime(env, () => {
    throw new Error('explicit mode must not load project-local Playwright');
  });
  assert.equal(explicit.launch.executablePath, browser);
  assert.equal(explicit.expectedVersion, env.BEND_LIVE_BROWSER_VERSION);
  assert.equal(explicit.provenance.playwrightVersion, '1.63.0');
  assert.equal(typeof explicit.chromium.launch, 'function');
  await assert.rejects(browserV2Runtime({ ...env, BEND_LIVE_BROWSER_SHA256: '0'.repeat(64) }),
    /browser executable bytes changed/);
  await assert.rejects(browserV2Runtime({ ...env, BEND_LIVE_PLAYWRIGHT_PACKAGE_SHA256: '0'.repeat(64) }),
    /Playwright package bytes changed/);
  await assert.rejects(browserV2Runtime({ ...env, BEND_LIVE_PLAYWRIGHT_CORE_TREE_SHA256: '0'.repeat(64) }),
    /Playwright core tree bytes changed/);
  await assert.rejects(browserV2Runtime({ ...env, BEND_LIVE_BROWSER_VERSION: 'unknown' }),
    /exact dotted version/);
} finally {
  for (const file of [browser, entry, pkg, corePkg]) if (fs.existsSync(file)) fs.unlinkSync(file);
  for (const directory of [packageRoot, coreRoot]) if (fs.existsSync(directory)) fs.rmdirSync(directory);
  fs.rmdirSync(fixture);
}
console.log(JSON.stringify({ schema: 'rift-bend-browser-v2-runtime-tests/1', passed: true,
  controls: ['default-loader-shape', 'all-nine-required', 'synthetic-read-only-module',
    'executable-byte-tamper', 'package-byte-tamper', 'core-tree-tamper',
    'browser-version-shape'],
  scope: 'module selection and byte binding only; no browser launched or page rendered' }));
