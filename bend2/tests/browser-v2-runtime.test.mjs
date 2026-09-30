import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserV2Runtime, packageTreeSnapshot } from './browser-v2-runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const entry = path.join(root, 'node_modules/playwright/index.mjs');
const pkg = path.join(root, 'node_modules/playwright/package.json');
const packageRoot = path.dirname(entry);
const coreRoot = path.join(path.dirname(packageRoot), 'playwright-core');
const fallback = await browserV2Runtime({});
assert.equal(fallback.launch.channel, 'chrome');
assert.equal(typeof fallback.chromium.launch, 'function');
await assert.rejects(browserV2Runtime({ BEND_LIVE_PLAYWRIGHT_ENTRY: entry }),
  /all 9 exact inputs/);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-browser-runtime-'));
const browser = path.join(fixture, 'chromium');
try {
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
  const explicit = await browserV2Runtime(env);
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
  fs.unlinkSync(browser);
  fs.rmdirSync(fixture);
}
console.log(JSON.stringify({ schema: 'rift-bend-browser-v2-runtime-tests/1', passed: true,
  controls: ['unchanged-default', 'all-nine-required', 'explicit-read-only-module',
    'executable-byte-tamper', 'package-byte-tamper', 'core-tree-tamper',
    'browser-version-shape'],
  scope: 'module selection and byte binding only; no browser launched or page rendered' }));
