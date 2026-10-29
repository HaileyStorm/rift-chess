/** Generic presentation of immutable Bend Image trees; no application policy. */
export type Image = Readonly<{ $: 'Pix'; color: number }> | Readonly<{
  $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image;
}>;

/** Replace only regions an immutable painter retained from its original base.
 * Newly painted leaves stay intact even when their color equals that base.
 * All three trees describe the same extent; the replacement may be deeper. */
export function replaceRetainedBackground(image: Image, base: Image, replacement: Image): Image {
  if (base === replacement) return image;
  if (image === base) return replacement;
  if ('color' in image) return image;
  const old = 'tl' in base ? base : { tl: base, tr: base, bl: base, br: base };
  const next = 'tl' in replacement ? replacement
    : { tl: replacement, tr: replacement, bl: replacement, br: replacement };
  const tl = replaceRetainedBackground(image.tl, old.tl, next.tl);
  const tr = replaceRetainedBackground(image.tr, old.tr, next.tr);
  const bl = replaceRetainedBackground(image.bl, old.bl, next.bl);
  const br = replaceRetainedBackground(image.br, old.br, next.br);
  return tl === image.tl && tr === image.tr && bl === image.bl && br === image.br
    ? image : { $: image.$, tl, tr, bl, br };
}

/** Bend images are square power-of-two trees even when the presented window is
 * rectangular. The window's larger edge determines the tree extent. */
export function extentForOutput(width: number, height: number): number {
  const edge = Math.max(width, height);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || edge > 4096)
    throw new RangeError('Invalid Bend output dimensions');
  return 2 ** Math.ceil(Math.log2(edge));
}

/** Retains CPU pixels and the previous immutable tree. Each result is a fresh
 * transferable copy, so transferring or changing it cannot detach the cache. */
export class PixelPort {
  readonly lastStats = { visited: 0, identical: 0, quads: 0, changedPixels: 0, samePixels: 0 };
  private previous?: Image;
  private pixels?: Uint32Array;
  private width = 0;
  private height = 0;
  private extent = 0;
  private readonly littleEndian = new Uint8Array(new Uint32Array([255]).buffer)[0] === 255;

  render(image: Image, width: number, height: number, extent = 1024): ArrayBuffer {
    const stats = this.lastStats;
    stats.visited = stats.identical = stats.quads = stats.changedPixels = stats.samePixels = 0;
    if (!this.pixels || width !== this.width || height !== this.height || extent !== this.extent) {
      this.pixels = new Uint32Array(width * height);
      this.previous = undefined;
      this.width = width;
      this.height = height;
      this.extent = extent;
    }
    const pixels = this.pixels;
    const paint = (node: Image, old: Image | undefined, x: number, y: number, size: number): void => {
      stats.visited++;
      if (x >= width || y >= height) return;
      if (node === old) { stats.identical++; return; }
      if (node.$ === 'Pix') {
        if (old?.$ === 'Pix' && old.color === node.color) { stats.samePixels++; return; }
        stats.changedPixels++;
        const color = node.color >>> 0;
        const rgba = this.littleEndian
          ? (0xff000000 | (color & 0xff00) | ((color >>> 16) & 255) | ((color & 255) << 16)) >>> 0
          : ((color << 8) | 255) >>> 0;
        // Detailed trees mostly end in one- or two-pixel cells. Write these
        // directly; the outer bounds check already admits their top-left pixel.
        if (size === 1) {
          pixels[y * width + x] = rgba;
          return;
        }
        if (size === 2) {
          const start = y * width + x;
          pixels[start] = rgba;
          if (x + 1 < width) pixels[start + 1] = rgba;
          if (y + 1 < height) {
            pixels[start + width] = rgba;
            if (x + 1 < width) pixels[start + width + 1] = rgba;
          }
          return;
        }
        const right = Math.min(width, x + size), bottom = Math.min(height, y + size);
        for (let row = y; row < bottom; row++) pixels.fill(rgba, row * width + x, row * width + right);
        return;
      }
      if (node.$ !== 'Qua' || size <= 1) throw new Error('Invalid Bend image tree');
      stats.quads++;
      const half = size / 2;
      // A prior uniform cell is the previous value of each new child too.
      if (old?.$ === 'Qua') {
        paint(node.tl, old.tl, x, y, half);
        paint(node.tr, old.tr, x + half, y, half);
        paint(node.bl, old.bl, x, y + half, half);
        paint(node.br, old.br, x + half, y + half, half);
      } else {
        paint(node.tl, old, x, y, half);
        paint(node.tr, old, x + half, y, half);
        paint(node.bl, old, x, y + half, half);
        paint(node.br, old, x + half, y + half, half);
      }
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

/** Opaque bitmap placement. Bend supplies geometry; this host only composites
 * its immutable chrome and board surfaces without synchronous pixel readback. */
export class OpaqueBoardPort {
  private readonly chromePort = new PixelPort();
  private chrome?: Image;
  private base?: OffscreenCanvas;
  private output?: OffscreenCanvas;
  private width = 0;
  private height = 0;
  private extent = 0;

  render(chrome: Image, width: number, height: number, extent: number,
    source: ImageBitmap, sourceSize: number,
    rectangle: { left: number; top: number; size: number }): ImageBitmap {
    try {
      extentForOutput(width, height);
      const { left, top, size } = rectangle;
      if (![left, top, size, sourceSize, extent].every(Number.isSafeInteger) ||
          Math.abs(left) > 4096 || Math.abs(top) > 4096 || size < 1 || size > 4096 ||
          sourceSize < 1 || sourceSize > 4096 || source.width !== sourceSize || source.height !== sourceSize ||
          extent < Math.max(width, height) || extent > 4096 || (extent & (extent - 1)) !== 0)
        throw new RangeError('Invalid opaque bitmap placement');
      if (typeof OffscreenCanvas !== 'function') throw new Error('OffscreenCanvas unavailable');
      if (!this.base || this.width !== width || this.height !== height) {
        this.base = new OffscreenCanvas(width, height);
        this.output = new OffscreenCanvas(width, height);
        this.width = width; this.height = height; this.chrome = undefined;
      }
      const base = this.base.getContext('2d', { alpha: false });
      const output = this.output!.getContext('2d', { alpha: false });
      if (!base || !output) throw new Error('Canvas 2D unavailable');
      if (this.chrome !== chrome || this.extent !== extent) {
        const bytes = new Uint8ClampedArray(this.chromePort.render(chrome, width, height, extent));
        base.putImageData(new ImageData(bytes, width, height), 0, 0);
        this.chrome = chrome; this.extent = extent;
      }
      output.imageSmoothingEnabled = false;
      output.drawImage(this.base, 0, 0);
      output.drawImage(source, left, top, size, size);
      return this.output!.transferToImageBitmap();
    } finally { source.close(); }
  }
}
