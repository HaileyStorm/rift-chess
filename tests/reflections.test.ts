import * as THREE from 'three';
import { sha256 } from '@noble/hashes/sha2.js';
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

function hex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

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

function seed(entry: ReflectionManifest['entries'][number]) {
  return `${entry.theme}:${entry.quality}`.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
}

function rawBytes(entry: ReflectionManifest['entries'][number]) {
  const raw = new Uint8Array(entry.width * entry.height * 8);
  const value = seed(entry);
  for (let index = 0; index < raw.length; index++) raw[index] = (index * 29 + value * 17) & 0xff;
  return raw;
}

function verifiedManifest() {
  const receipt = manifest();
  for (const entry of receipt.entries) entry.texelSha256 = hex(sha256(rawBytes(entry)));
  return receipt;
}

function packedPixels(entry: ReflectionManifest['entries'][number]) {
  const raw = rawBytes(entry);
  const rgba = new Uint8ClampedArray(entry.width * entry.height * 12);
  for (let texel = 0; texel < entry.width * entry.height; texel++) {
    const source = texel * 8, destination = texel * 12;
    rgba[destination] = raw[source]!;
    rgba[destination + 1] = raw[source + 1]!;
    rgba[destination + 2] = raw[source + 2]!;
    rgba[destination + 3] = 255;
    rgba[destination + 4] = raw[source + 3]!;
    rgba[destination + 5] = raw[source + 4]!;
    rgba[destination + 6] = raw[source + 5]!;
    rgba[destination + 7] = 255;
    rgba[destination + 8] = raw[source + 6]!;
    rgba[destination + 9] = raw[source + 7]!;
    rgba[destination + 10] = 0;
    rgba[destination + 11] = 255;
  }
  return rgba;
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

describe('reflection production loading path', () => {
  it('eagerly decodes every receipt entry, verifies raw SHA-256, and disposes textures once', async () => {
    const receipt = verifiedManifest();
    const images: SuccessfulImage[] = [];
    const canvases: FakeCanvas[] = [];
    class SuccessfulImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      src = '';
      readonly index: number;
      constructor() { this.index = images.length; images.push(this); }
      removeAttribute() {}
      load() {
        const entry = receipt.entries[this.index]!;
        this.naturalWidth = entry.width * 3;
        this.naturalHeight = entry.height;
        this.onload?.();
      }
    }
    class FakeCanvas {
      width = 0;
      height = 0;
      private image: SuccessfulImage | null = null;
      getContext(kind: string, options: unknown) {
        expect(kind).toBe('2d');
        expect(options).toEqual({ willReadFrequently: true });
        return {
          drawImage: (image: SuccessfulImage) => { this.image = image; },
          getImageData: (_x: number, _y: number, width: number, height: number) => {
            const entry = receipt.entries[this.image!.index]!;
            expect([width, height]).toEqual([entry.width * 3, entry.height]);
            return { data: packedPixels(entry) };
          },
        };
      }
    }
    let loader: ReflectionMapLoader | undefined;
    vi.stubGlobal('window', { location: { href: 'http://localhost/', origin: 'http://localhost' } });
    vi.stubGlobal('Image', SuccessfulImage);
    vi.stubGlobal('document', { createElement: (tag: string) => {
      expect(tag).toBe('canvas');
      const canvas = new FakeCanvas();
      canvases.push(canvas);
      return canvas;
    } });
    try {
      loader = new ReflectionMapLoader(receipt);
      await Promise.resolve(); await Promise.resolve();
      expect(images).toHaveLength(9);
      for (const image of images) {
        image.load();
        await Promise.resolve(); await Promise.resolve();
      }
      await loader.ready;
      expect(canvases).toHaveLength(9);
      const textures = receipt.entries.map(entry => loader!.get(entry.theme, entry.quality)!);
      for (const [index, entry] of receipt.entries.entries()) {
        const texture = textures[index]!;
        const raw = rawBytes(entry);
        const data = texture.image.data as Uint16Array;
        expect(data).toHaveLength(entry.width * entry.height * 4);
        expect(data[0]).toBe(raw[0]! | raw[1]! << 8);
        expect(data.at(-1)).toBe(raw.at(-2)! | raw.at(-1)! << 8);
        expect(texture.type).toBe(THREE.HalfFloatType);
        expect(texture.format).toBe(THREE.RGBAFormat);
        expect(texture.mapping).toBe(THREE.CubeUVReflectionMapping);
        expect(texture.minFilter).toBe(THREE.LinearFilter);
        expect(texture.magFilter).toBe(THREE.LinearFilter);
        expect(texture.colorSpace).toBe(THREE.LinearSRGBColorSpace);
        expect(texture.generateMipmaps).toBe(false);
        expect(texture.flipY).toBe(false);
        expect(texture.premultiplyAlpha).toBe(false);
        expect(texture.unpackAlignment).toBe(4);
        expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
        expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
        expect(texture.anisotropy).toBe(1);
      }
      const disposeSpies = textures.map(texture => vi.spyOn(texture, 'dispose'));
      loader.dispose();
      loader.dispose();
      for (const dispose of disposeSpies) expect(dispose).toHaveBeenCalledTimes(1);
      for (const entry of receipt.entries) expect(loader.get(entry.theme, entry.quality)).toBeUndefined();
    } finally {
      loader?.dispose();
      vi.unstubAllGlobals();
    }
  }, 120_000);
});

describe('reflection loading cancellation', () => {
  for (const operation of ['dispose', 'failure'] as const) it(`settles every pending image on ${operation} and cannot resurrect on a late event`, async () => {
    const images: Array<{ onload: (() => void) | null; onerror: (() => void) | null; src: string; removedAttributes: string[] }> = [];
    class PendingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      readonly removedAttributes: string[] = [];
      constructor() { images.push(this); }
      removeAttribute(name: string) { this.removedAttributes.push(name); }
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
      expect(images.flatMap(image => image.removedAttributes)).toHaveLength(operation === 'dispose' ? 9 : 8);
      expect(images.flatMap(image => image.removedAttributes).every(name => name === 'src')).toBe(true);
      for (const callback of lateCallbacks) callback();
      loader.dispose();
      for (const entry of manifest().entries) expect(loader.get(entry.theme, entry.quality)).toBeUndefined();
    } finally { vi.unstubAllGlobals(); }
  });
});
