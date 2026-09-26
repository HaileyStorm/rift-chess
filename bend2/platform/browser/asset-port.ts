/** Generic bounded read of packaged pixel data. Bend supplies resource IDs,
 * safe relative paths and byte caps, then decodes and chooses the artwork. */
const HOST_CAP = 1_048_576;
const empty = { $: 'Nil' };

function byteList(bytes: Uint8Array): any {
  let tail: any = empty;
  for (let index = bytes.length - 1; index >= 0; index--)
    tail = { $: 'Con', head: bytes[index], tail };
  return tail;
}

async function boundedBytes(response: Response, limit: number): Promise<Uint8Array> {
  const header = response.headers.get('content-length');
  if (header !== null && Number(header) > limit) throw new RangeError('Asset exceeds its Bend byte cap');
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > limit) throw new RangeError('Asset exceeds its Bend byte cap');
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      if (length > limit) throw new RangeError('Asset exceeds its Bend byte cap');
      chunks.push(next.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export async function loadAssetRequests(requests: any[]): Promise<any[]> {
  const responses = [];
  for (const request of requests) {
    const id = request.id;
    const path = request.path;
    const limit = request.max_bytes;
    let bytes = empty as any, ok = false;
    if (typeof path === 'string' && /^assets\/[a-z0-9-]+\.rga$/.test(path) &&
        Number.isSafeInteger(limit) && limit > 0 && limit <= HOST_CAP) {
      try {
        const url = new URL(`./${path}`, self.location.href);
        if (url.origin !== self.location.origin) throw new Error('Nonlocal asset');
        const response = await fetch(url);
        if (!response.ok || response.redirected || new URL(response.url).href !== url.href)
          throw new Error('Asset unavailable');
        bytes = byteList(await boundedBytes(response, limit));
        ok = true;
      } catch { /* Bend receives an explicit missing response and chooses fallback. */ }
    }
    responses.push({ $: 'AssetResponse', id, bytes, ok });
  }
  return responses;
}

/** Bounded byte transport for Bend's RFNT decoder. The host neither parses
 * glyph records nor paints text. A power-of-two backing array matches Base
 * Array<U32>'s checked indexing contract in generated JavaScript. */
export async function loadFontPack(path: string, limit: number): Promise<{
  bytes: Uint8Array; used: number; ok: boolean;
}> {
  const missing = { bytes: new Uint8Array(1), used: 0, ok: false };
  if (path !== 'assets/rift-observatory-font.rga' || !Number.isSafeInteger(limit) ||
      limit < 1 || limit > 262_144) return missing;
  try {
    const url = new URL(`./${path}`, self.location.href);
    if (url.origin !== self.location.origin) return missing;
    const response = await fetch(url);
    if (!response.ok || response.redirected || new URL(response.url).href !== url.href)
      return missing;
    const fetched = await boundedBytes(response, limit);
    if (!fetched.length) return missing;
    const backing = new Uint8Array(2 ** Math.ceil(Math.log2(fetched.length)));
    backing.set(fetched);
    return { bytes: backing, used: fetched.length, ok: true };
  } catch { return missing; }
}
