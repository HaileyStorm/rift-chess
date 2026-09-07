import { describe, it, expect } from 'vitest';
import { deflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { crc32, decodeReflectionPng } from '../scripts/reflection-png.mjs';

function chunk(type, data) {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length); result.write(type, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}
function png(filter = 0, padding = 0) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(3); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([filter, 1, 2, 3, 4, 5, 6, 7, 8, padding]))), chunk('IEND', Buffer.alloc(0))]);
}
describe('build-time reflection asset validation', () => {
  it('reconstructs every shipped texture and checks the independently recorded raw digest', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/assets/reflections/manifest.json', import.meta.url), 'utf8'));
    for (const entry of manifest.entries) {
      const raw = decodeReflectionPng(readFileSync(new URL(`../public/assets/reflections/${entry.file}`, import.meta.url)), entry.width, entry.height);
      expect(createHash('sha256').update(raw).digest('hex')).toBe(entry.texelSha256);
    }
  });
  it('rejects corrupt chunks, mismatched dimensions, truncation, filters and padding', () => {
    expect([...decodeReflectionPng(png(), 1, 1)]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const corrupt = png(); corrupt[45] ^= 1;
    expect(() => decodeReflectionPng(corrupt, 1, 1)).toThrow(/CRC/);
    const aliasedHeader = png(); aliasedHeader[12] |= 128;
    aliasedHeader.writeUInt32BE(crc32(aliasedHeader.subarray(12, 29)), 29);
    expect(() => decodeReflectionPng(aliasedHeader, 1, 1)).toThrow(/header/);
    expect(() => decodeReflectionPng(png(), 2, 1)).toThrow();
    expect(() => decodeReflectionPng(png().subarray(0, -1), 1, 1)).toThrow(/Truncated/);
    expect(() => decodeReflectionPng(png(5), 1, 1)).toThrow(/filter/);
    expect(() => decodeReflectionPng(png(0, 1), 1, 1)).toThrow(/padding/);
  });
});
