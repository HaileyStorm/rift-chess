import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { ALLOWED_EXTERNAL_URLS, isAllowedExternalUrl, resolveStaticPath } = require('../electron/main.cjs');

describe('rift:// static boundary', () => {
  const distRoot = path.resolve('test-dist');

  it('maps only app-host static paths below the packaged dist root', () => {
    expect(resolveStaticPath(distRoot, 'rift://app/assets/game.js?cache=1')).toBe(path.join(distRoot, 'assets', 'game.js'));
    expect(resolveStaticPath(distRoot, 'rift://app/')).toBe(path.join(distRoot, 'index.html'));
  });

  it.each([
    'https://app/assets/game.js',
    'rift://other/index.html',
    'rift://app/%2e%2e/package.json',
    'rift://app/assets/%2e%2e/%2e%2e/package.json',
    'rift://app/%5c..%5cpackage.json',
    'rift://app/%00package.json',
    'rift://renderer@app/index.html',
  ])('rejects an untrusted static URL: %s', (candidate) => {
    expect(resolveStaticPath(distRoot, candidate)).toBeNull();
  });
});

describe('external navigation policy', () => {
  it.each([...ALLOWED_EXTERNAL_URLS])('allows the exact user-facing URL: %s', (candidate) => {
    expect(isAllowedExternalUrl(candidate)).toBe(true);
  });

  it.each([
    'http://buymeacoffee.com/threadspan',
    'https://buymeacoffee.com/threadspan?redirect=https://example.com',
    'https://github.com/HaileyStorm/rift-chess/releases',
    'https://example.com/',
    'not a url',
  ])('rejects a non-allowlisted navigation: %s', (candidate) => {
    expect(isAllowedExternalUrl(candidate)).toBe(false);
  });
});
