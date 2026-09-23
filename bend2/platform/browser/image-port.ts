/** Generic presentation of immutable Bend Image trees; no application policy. */
export type Image = Readonly<{ $: 'Pix'; color: number }> | Readonly<{
  $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image;
}>;

/** Retains CPU pixels and the previous immutable tree. Each result is a fresh
 * transferable copy, so transferring or changing it cannot detach the cache. */
export class PixelPort {
  private previous?: Image;
  private pixels?: Uint32Array;
  private width = 0;
  private height = 0;
  private extent = 0;
  private readonly littleEndian = new Uint8Array(new Uint32Array([255]).buffer)[0] === 255;

  render(image: Image, width: number, height: number, extent = 1024): ArrayBuffer {
    if (!this.pixels || width !== this.width || height !== this.height || extent !== this.extent) {
      this.pixels = new Uint32Array(width * height);
      this.previous = undefined;
      this.width = width;
      this.height = height;
      this.extent = extent;
    }
    const pixels = this.pixels;
    const paint = (node: Image, old: Image | undefined, x: number, y: number, size: number): void => {
      if (x >= width || y >= height || node === old) return;
      if (node.$ === 'Pix') {
        if (old?.$ === 'Pix' && old.color === node.color) return;
        const color = node.color >>> 0;
        const rgba = this.littleEndian
          ? (0xff000000 | (color & 0xff00) | ((color >>> 16) & 255) | ((color & 255) << 16)) >>> 0
          : ((color << 8) | 255) >>> 0;
        const right = Math.min(width, x + size), bottom = Math.min(height, y + size);
        // Small leaves dominate detailed trees; scalar stores avoid thousands
        // of two-element TypedArray.fill calls while preserving the same bytes.
        if (size <= 2) {
          for (let row = y; row < bottom; row++) {
            for (let column = x; column < right; column++) pixels[row * width + column] = rgba;
          }
        } else {
          for (let row = y; row < bottom; row++) pixels.fill(rgba, row * width + x, row * width + right);
        }
        return;
      }
      if (node.$ !== 'Qua' || size <= 1) throw new Error('Invalid Bend image tree');
      const half = size / 2;
      // A prior uniform cell is the previous value of each new child too.
      paint(node.tl, old?.$ === 'Qua' ? old.tl : old, x, y, half);
      paint(node.tr, old?.$ === 'Qua' ? old.tr : old, x + half, y, half);
      paint(node.bl, old?.$ === 'Qua' ? old.bl : old, x, y + half, half);
      paint(node.br, old?.$ === 'Qua' ? old.br : old, x + half, y + half, half);
    };
    // A failed traversal may have painted some pixels. Invalidate identity
    // reuse before it starts so the next valid frame repaints the whole extent.
    const previous = this.previous;
    this.previous = undefined;
    paint(image, previous, 0, 0, extent);
    this.previous = image;
    return pixels.slice().buffer;
  }
}
