import type { BendImage } from './types';
import { isRecord, tag, u32 } from './types';

export const IMAGE_SIZE = 512;
export const RGBA_SIZE = IMAGE_SIZE * IMAGE_SIZE * 4;

function paintLeaf(buffer: Uint8ClampedArray, x: number, y: number, size: number, color: number): void {
  const red = (color >>> 16) & 0xff;
  const green = (color >>> 8) & 0xff;
  const blue = color & 0xff;
  const right = Math.min(IMAGE_SIZE, x + size);
  const bottom = Math.min(IMAGE_SIZE, y + size);
  const left = Math.max(0, x);
  const top = Math.max(0, y);
  for (let row = top; row < bottom; row += 1) {
    let offset = (row * IMAGE_SIZE + left) * 4;
    for (let column = left; column < right; column += 1) {
      buffer[offset] = red;
      buffer[offset + 1] = green;
      buffer[offset + 2] = blue;
      buffer[offset + 3] = 255;
      offset += 4;
    }
  }
}

function paint(image: unknown, buffer: Uint8ClampedArray, x: number, y: number, size: number): void {
  const name = tag(image);
  if (name === 'Pix') {
    paintLeaf(buffer, x, y, size, u32(isRecord(image) ? image.color : 0));
    return;
  }
  if (name !== 'Qua' || !isRecord(image)) {
    paintLeaf(buffer, x, y, size, 0);
    return;
  }
  const half = Math.max(1, size >> 1);
  paint(image.tl, buffer, x, y, half);
  paint(image.tr, buffer, x + half, y, half);
  paint(image.bl, buffer, x, y + half, half);
  paint(image.br, buffer, x + half, y + half, half);
}

export function createRgbaBuffer(): Uint8ClampedArray {
  return new Uint8ClampedArray(RGBA_SIZE);
}

export function blitImage(image: BendImage, buffer = createRgbaBuffer()): Uint8ClampedArray {
  paint(image, buffer, 0, 0, IMAGE_SIZE);
  return buffer;
}

export function imageData(image: BendImage, buffer?: Uint8ClampedArray): ImageData {
  return new ImageData(blitImage(image, buffer) as unknown as Uint8ClampedArray<ArrayBuffer>, IMAGE_SIZE, IMAGE_SIZE);
}
