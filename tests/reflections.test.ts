import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  REFLECTION_ENCODING,
  REFLECTION_SCHEMA,
  ReflectionMapLoader,
  decodeReflectionTriplets,
  validateReflectionManifest,
  type ReflectionManifest,
} from '../src/render/reflections';

const digest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function manifest(): ReflectionManifest {
  const entries = (['gallery', 'nocturne', 'daylight'] as const).flatMap(theme =>
    (['low', 'balanced', 'high'] as const).map(quality => ({
      theme,
      quality,
      width: quality === 'high' ? 768 : 384,
      height: quality === 'high' ? 1024 : 512,
      file: `${theme}-${quality}.png`,
      texelSha256: digest,
      pngSha256: digest,
    })),
  );
  return {
    schema: REFLECTION_SCHEMA,
    encoding: REFLECTION_ENCODING,
    texture: {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      mapping: THREE.CubeUVReflectionMapping,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      colorSpace: THREE.LinearSRGBColorSpace,
      generateMipmaps: false,
      flipY: false,
      premultiplyAlpha: false,
      unpackAlignment: 4,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      anisotropy: 1,
    },
    entries,
  };
}

describe('reflection receipt parser', () => {
  it('accepts all nine fixed shipped reflection pairs', () => {
    expect(validateReflectionManifest(manifest()).entries.map(entry => `${entry.theme}:${entry.quality}`)).toHaveLength(9);
  });

  it('rejects duplicate, malformed, and dimension-drifting entries', () => {
    const duplicate = manifest();
    duplicate.entries[8] = { ...duplicate.entries[0]! };
    expect(() => validateReflectionManifest(duplicate)).toThrow('duplicate');

    const wrongDimensions = manifest();
    wrongDimensions.entries[0] = { ...wrongDimensions.entries[0]!, width: 1 };
    expect(() => validateReflectionManifest(wrongDimensions)).toThrow('invalid dimensions');

    const wrongFilename = manifest();
    wrongFilename.entries[0] = { ...wrongFilename.entries[0]!, file: 'gallery-low.webp' };
    expect(() => validateReflectionManifest(wrongFilename)).toThrow('invalid asset filename');

    const wrongReceipt = manifest();
    (wrongReceipt.texture as { minFilter: number }).minFilter = THREE.NearestFilter;
    expect(() => validateReflectionManifest(wrongReceipt)).toThrow('canonical HalfFloat CubeUV contract');
  });

  it('reports a corrupt manifest through ready without a synchronous constructor throw', async () => {
    let loader: ReflectionMapLoader | undefined;
    expect(() => { loader = new ReflectionMapLoader({}); }).not.toThrow();
    await expect(loader!.ready).rejects.toThrow('invalid schema or encoding');
  });
});

describe('reflection RGB triplet decoder', () => {
  it('preserves raw little-endian bytes without conversion', () => {
    const packed = new Uint8ClampedArray([0, 1, 2, 255, 3, 4, 5, 255, 6, 7, 0, 255]);
    expect(decodeReflectionTriplets(packed, 1, 1)).toEqual(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
  });

  it('rejects corrupt alpha, padding, and lengths', () => {
    const packed = new Uint8ClampedArray([0, 1, 2, 255, 3, 4, 5, 255, 6, 7, 0, 255]);
    const transparent = packed.slice(); transparent[3] = 254;
    expect(() => decodeReflectionTriplets(transparent, 1, 1)).toThrow('non-opaque');
    const nonZeroPadding = packed.slice(); nonZeroPadding[10] = 1;
    expect(() => decodeReflectionTriplets(nonZeroPadding, 1, 1)).toThrow('non-zero packing pad');
    expect(() => decodeReflectionTriplets(packed.slice(0, 11), 1, 1)).toThrow('RGBA length');
  });
});

describe('reflection loading cancellation', () => {
  for (const operation of ['dispose', 'failure'] as const) it(`settles every pending image on ${operation} and cannot resurrect on a late event`, async () => {
    const images: Array<{ onload: (() => void) | null; onerror: (() => void) | null; src: string }> = [];
    class PendingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      constructor() { images.push(this); }
    }
    vi.stubGlobal('window', { location: { href: 'http://localhost/', origin: 'http://localhost' } });
    vi.stubGlobal('Image', PendingImage);
    try {
      const loader = new ReflectionMapLoader(manifest());
      const result = loader.ready.catch(error => error as Error);
      await Promise.resolve(); await Promise.resolve();
      expect(images).toHaveLength(9);
      const lateCallbacks = images.map(image => image.onload!);
      if (operation === 'dispose') loader.dispose(); else images[0]!.onerror!();
      expect(await result).toBeInstanceOf(Error);
      expect(images.every(image => image.onload === null && image.onerror === null)).toBe(true);
      expect(images.every(image => image.src.startsWith('http://localhost/assets/reflections/'))).toBe(true);
      for (const callback of lateCallbacks) callback();
      loader.dispose();
      for (const entry of manifest().entries) expect(loader.get(entry.theme, entry.quality)).toBeUndefined();
    } finally { vi.unstubAllGlobals(); }
  });
});
