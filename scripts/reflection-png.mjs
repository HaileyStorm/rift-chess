import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
export function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 255];
  return (value ^ 0xffffffff) >>> 0;
}
function paeth(left, above, corner) {
  const prediction = left + above - corner;
  const a = Math.abs(prediction - left), b = Math.abs(prediction - above), c = Math.abs(prediction - corner);
  return a <= b && a <= c ? left : b <= c ? above : corner;
}

// This accepts only the opaque, metadata-free RGB format emitted by our packer.
export function decodeReflectionPng(bytes, width, height) {
  assert.ok(Number.isInteger(width) && width > 0 && width <= 768);
  assert.ok(Number.isInteger(height) && height > 0 && height <= 1024);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const compressed = [];
  let offset = 8, header = false, ended = false;
  while (offset < bytes.length) {
    assert.ok(offset + 12 <= bytes.length, 'Truncated PNG chunk');
    const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
    assert.ok(end <= bytes.length, 'Truncated PNG payload');
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, end - 4);
    assert.equal(crc32(bytes.subarray(offset + 4, end - 4)), bytes.readUInt32BE(end - 4), 'PNG CRC mismatch');
    assert.ok(header || type === 'IHDR', 'PNG header must be first');
    if (type === 'IHDR') {
      assert.ok(!header && offset === 8 && length === 13, 'Invalid PNG header');
      assert.equal(data.readUInt32BE(0), width * 3);
      assert.equal(data.readUInt32BE(4), height);
      assert.deepEqual([...data.subarray(8)], [8, 2, 0, 0, 0]);
      header = true;
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (type === 'IEND') {
      assert.equal(length, 0); assert.ok(compressed.length > 0);
      assert.equal(end, bytes.length, 'Trailing PNG data');
      ended = true;
    } else assert.fail(`Unsupported PNG chunk ${type}`);
    offset = end;
  }
  assert.ok(ended, 'Missing PNG end');
  const stride = width * 9, expected = (stride + 1) * height;
  const filtered = inflateSync(Buffer.concat(compressed), { maxOutputLength: expected });
  assert.equal(filtered.length, expected, 'Unexpected PNG scanline length');
  const pixels = Buffer.alloc(stride * height);
  for (let row = 0; row < height; row++) {
    const source = row * (stride + 1), target = row * stride, filter = filtered[source];
    assert.ok(filter <= 4, 'Unsupported PNG filter');
    for (let x = 0; x < stride; x++) {
      const left = x >= 3 ? pixels[target + x - 3] : 0;
      const above = row ? pixels[target + x - stride] : 0;
      const corner = row && x >= 3 ? pixels[target + x - stride - 3] : 0;
      const prediction = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : paeth(left, above, corner);
      pixels[target + x] = (filtered[source + x + 1] + prediction) & 255;
    }
  }
  const raw = Buffer.alloc(width * height * 8);
  for (let pixel = 0; pixel < width * height; pixel++) {
    assert.equal(pixels[pixel * 9 + 8], 0, 'Nonzero reflection padding');
    pixels.copy(raw, pixel * 8, pixel * 9, pixel * 9 + 8);
  }
  return raw;
}
