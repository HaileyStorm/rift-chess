/** Generic browser capability and timing receipt. This module reports evidence;
 * it does not choose a graphics detail tier. Unknown measurements stay null.
 */
export const PROFILE_EVENT = 'rift-bend-browser-profile';

export type BrowserCapabilities = Readonly<{
  schema: 'rift-bend-browser-profile/2';
  devicePixelRatio: number;
  /** Largest physical edge of the fitted, displayed game canvas; null if not measured. */
  physicalEdge: number | null;
  /** Largest physical edge of the whole viewport, separate from canvas demand. */
  viewportPhysicalEdge: number;
  maxTextureEdge: number | null;
  memoryMib: null;
  cpu2048P90Ms: null;
  cpu4096P90Ms: null;
  gpuMeasured: false;
  gpuP90Ms: null;
  imageBitmapTransfer: boolean;
}>;

export type BrowserProfile = BrowserCapabilities & Readonly<{
  imageBitmapActive: boolean;
  samples: Readonly<{ bendCompute: number; workerPreparation: number; workerReply: number; hostPresentation: number }>;
  bendComputeP90Ms: number | null;
  workerPreparationP90Ms: number | null;
  workerReplyP90Ms: number | null;
  hostPresentationP90Ms: number | null;
}>;

/** Nearest-rank p90 over the retained finite, non-negative samples. */
export class RollingP90 {
  private readonly samples: number[] = [];
  private next = 0;
  private readonly capacity: number;

  constructor(capacity = 120) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) throw new RangeError('P90 capacity must be a positive integer');
    this.capacity = capacity;
  }

  add(value: number): void {
    if (!Number.isFinite(value) || value < 0) return;
    if (this.samples.length < this.capacity) this.samples.push(value);
    else {
      this.samples[this.next] = value;
      this.next = (this.next + 1) % this.capacity;
    }
  }

  get count(): number { return this.samples.length; }

  get value(): number | null {
    if (!this.samples.length) return null;
    const ordered = [...this.samples].sort((a, b) => a - b);
    return ordered[Math.ceil(ordered.length * 0.9) - 1];
  }
}

export function queryMaxTextureEdge(): number | null {
  try {
    // Use a disposable canvas so the game's 2D presentation context stays intact.
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    const attributes: WebGLContextAttributes = {
      alpha: false, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true,
    };
    const gl = probe.getContext('webgl2', attributes) ?? probe.getContext('webgl', attributes);
    if (!gl) return null;
    const edge = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return Number.isSafeInteger(edge) && edge > 0 ? edge : null;
  } catch {
    return null;
  }
}

export function measureBrowserCapabilities(
  view: Window = window,
  canvas: HTMLCanvasElement | null = null,
  maxTextureEdge: number | null = null,
): BrowserCapabilities {
  const devicePixelRatio = Number.isFinite(view.devicePixelRatio) && view.devicePixelRatio > 0
    ? view.devicePixelRatio : 1;
  const viewportPhysicalEdge = Math.ceil(Math.max(view.innerWidth, view.innerHeight) * devicePixelRatio);
  const bounds = canvas?.getBoundingClientRect();
  const physicalEdge = bounds && bounds.width > 0 && bounds.height > 0
    ? Math.ceil(Math.max(bounds.width, bounds.height) * devicePixelRatio) : null;
  const imageBitmapTransfer = typeof OffscreenCanvas !== 'undefined' &&
    typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function';
  return {
    schema: 'rift-bend-browser-profile/2',
    devicePixelRatio,
    physicalEdge,
    viewportPhysicalEdge,
    maxTextureEdge,
    // The browser does not expose reliable free memory or these library-specific
    // CPU/GPU calibration cases yet. Do not substitute deviceMemory or guesses.
    memoryMib: null,
    cpu2048P90Ms: null,
    cpu4096P90Ms: null,
    gpuMeasured: false,
    gpuP90Ms: null,
    imageBitmapTransfer,
  };
}

export function makeBrowserProfile(
  capabilities: BrowserCapabilities,
  bendComputeP90Ms: number | null,
  workerPreparationP90Ms: number | null,
  workerReplyP90Ms: number | null,
  hostPresentationP90Ms: number | null,
  samples: Readonly<{ bendCompute: number; workerPreparation: number; workerReply: number; hostPresentation: number }>,
  imageBitmapActive = false,
): BrowserProfile {
  return { ...capabilities, imageBitmapActive, samples, bendComputeP90Ms, workerPreparationP90Ms,
    workerReplyP90Ms, hostPresentationP90Ms };
}
