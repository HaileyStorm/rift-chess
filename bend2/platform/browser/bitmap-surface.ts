/** Worker-side optional ImageBitmap staging for the generic browser port.
 * Pixels remain authored by Bend and arrive as a full RGBA buffer. A browser
 * that cannot provide a transferable bitmap falls back to that exact buffer.
 */
export class BitmapSurface {
  private surface: OffscreenCanvas | null = null;
  private context: OffscreenCanvasRenderingContext2D | null = null;
  private unavailable = false;

  constructor(private readonly enabled = true) {}

  convert(pixels: ArrayBuffer, width: number, height: number): ImageBitmap | null {
    if (!this.enabled || this.unavailable || typeof OffscreenCanvas === 'undefined' ||
        typeof OffscreenCanvas.prototype.transferToImageBitmap !== 'function') return null;
    try {
      if (!this.surface || this.surface.width !== width || this.surface.height !== height) {
        this.surface = new OffscreenCanvas(width, height);
        this.context = this.surface.getContext('2d', { alpha: false, desynchronized: true });
      }
      const context = this.context;
      if (!context) throw new Error('Offscreen 2D context unavailable');
      context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
      return this.surface.transferToImageBitmap();
    } catch {
      // Some browsers expose the API while their worker canvas backend is off.
      // Disable only this optimization and let the caller transfer raw pixels.
      this.unavailable = true;
      this.surface = null;
      this.context = null;
      return null;
    }
  }
}
