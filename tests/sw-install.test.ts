import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

it('installs every asset with HTTP cache revalidation, including unhashed HTML', async () => {
  const events = new Map<string, (event: { waitUntil: (work: Promise<void>) => void }) => void>();
  const requests: Request[] = [];
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  runInNewContext(source, {
    URL, Request,
    self: { location: { origin: 'https://example.test' }, registration: { scope: 'https://example.test/game/' }, addEventListener: (name: string, handler: (event: unknown) => void) => events.set(name, handler) },
    fetch: async () => ({ ok: true, json: async () => ({ version: '__RIFT_CACHE_VERSION__', assets: ['./index.html', './assets/game.js', './assets/reflections/manifest.json'] }) }),
    caches: { open: async () => ({ addAll: async (values: Request[]) => { requests.push(...values); } }) },
  });
  let work: Promise<void> | undefined;
  events.get('install')!({ waitUntil: value => { work = value; } });
  await work;
  expect(requests.map(request => request.url)).toEqual(['https://example.test/game/index.html', 'https://example.test/game/assets/game.js', 'https://example.test/game/assets/reflections/manifest.json']);
  expect(requests.map(request => request.cache)).toEqual(['reload', 'reload', 'reload']);
});
