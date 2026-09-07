import * as THREE from 'three';
import { sha256 } from '@noble/hashes/sha2.js';

export const REFLECTION_SCHEMA = 'rift-reflections/1';
export const REFLECTION_ENCODING = 'rgba16le-rgb8-triplets/1';

export type ReflectionTheme = 'gallery' | 'nocturne' | 'daylight';
export type ReflectionQuality = 'low' | 'balanced' | 'high';

export type ReflectionTextureReceipt = {
  type: typeof THREE.HalfFloatType;
  format: typeof THREE.RGBAFormat;
  mapping: typeof THREE.CubeUVReflectionMapping;
  minFilter: typeof THREE.LinearFilter;
  magFilter: typeof THREE.LinearFilter;
  colorSpace: typeof THREE.LinearSRGBColorSpace;
  generateMipmaps: false;
  flipY: false;
  premultiplyAlpha: false;
  unpackAlignment: 4;
  wrapS: typeof THREE.ClampToEdgeWrapping;
  wrapT: typeof THREE.ClampToEdgeWrapping;
  anisotropy: 1;
};

export type ReflectionManifestEntry = {
  theme: ReflectionTheme;
  quality: ReflectionQuality;
  width: number;
  height: number;
  file: string;
  texelSha256: string;
  pngSha256: string;
};

export type ReflectionManifest = {
  schema: typeof REFLECTION_SCHEMA;
  encoding: typeof REFLECTION_ENCODING;
  texture: ReflectionTextureReceipt;
  entries: ReflectionManifestEntry[];
};

const themes: ReflectionTheme[] = ['gallery', 'nocturne', 'daylight'];
const qualities: ReflectionQuality[] = ['low', 'balanced', 'high'];
const sha256Pattern = /^[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTheme(value: unknown): value is ReflectionTheme {
  return typeof value === 'string' && themes.includes(value as ReflectionTheme);
}

function isQuality(value: unknown): value is ReflectionQuality {
  return typeof value === 'string' && qualities.includes(value as ReflectionQuality);
}

function expectedDimensions(quality: ReflectionQuality) {
  return quality === 'high' ? { width: 768, height: 1024 } : { width: 384, height: 512 };
}

function key(theme: ReflectionTheme, quality: ReflectionQuality) {
  return `${theme}:${quality}`;
}

function validateTextureReceipt(value: unknown): ReflectionTextureReceipt {
  if (!isRecord(value)
    || value.type !== THREE.HalfFloatType
    || value.format !== THREE.RGBAFormat
    || value.mapping !== THREE.CubeUVReflectionMapping
    || value.minFilter !== THREE.LinearFilter
    || value.magFilter !== THREE.LinearFilter
    || value.colorSpace !== THREE.LinearSRGBColorSpace
    || value.generateMipmaps !== false
    || value.flipY !== false
    || value.premultiplyAlpha !== false
    || value.unpackAlignment !== 4
    || value.wrapS !== THREE.ClampToEdgeWrapping
    || value.wrapT !== THREE.ClampToEdgeWrapping
    || value.anisotropy !== 1) {
    throw new Error('Reflection texture receipt does not match the canonical HalfFloat CubeUV contract.');
  }
  return value as ReflectionTextureReceipt;
}

function validateEntry(value: unknown): ReflectionManifestEntry {
  if (!isRecord(value) || !isTheme(value.theme) || !isQuality(value.quality)
    || !Number.isInteger(value.width) || !Number.isInteger(value.height)
    || typeof value.file !== 'string' || typeof value.texelSha256 !== 'string' || typeof value.pngSha256 !== 'string'
    || !sha256Pattern.test(value.texelSha256) || !sha256Pattern.test(value.pngSha256)) {
    throw new Error('Reflection manifest entry has an invalid schema.');
  }
  const dimensions = expectedDimensions(value.quality);
  if (value.width !== dimensions.width || value.height !== dimensions.height) throw new Error(`Reflection manifest entry ${key(value.theme, value.quality)} has invalid dimensions.`);
  if (value.file !== `${value.theme}-${value.quality}.png`) throw new Error(`Reflection manifest entry ${key(value.theme, value.quality)} has an invalid asset filename.`);
  return value as ReflectionManifestEntry;
}

export function validateReflectionManifest(value: unknown): ReflectionManifest {
  if (!isRecord(value) || value.schema !== REFLECTION_SCHEMA || value.encoding !== REFLECTION_ENCODING || !Array.isArray(value.entries)) {
    throw new Error('Reflection manifest has an invalid schema or encoding.');
  }
  const entries = value.entries.map(validateEntry);
  if (entries.length !== themes.length * qualities.length) throw new Error('Reflection manifest must contain exactly nine entries.');
  const seen = new Set<string>();
  for (const entry of entries) {
    const entryKey = key(entry.theme, entry.quality);
    if (seen.has(entryKey)) throw new Error(`Reflection manifest contains duplicate entry ${entryKey}.`);
    seen.add(entryKey);
  }
  for (const theme of themes) for (const quality of qualities) {
    if (!seen.has(key(theme, quality))) throw new Error(`Reflection manifest is missing entry ${key(theme, quality)}.`);
  }
  return {
    schema: REFLECTION_SCHEMA,
    encoding: REFLECTION_ENCODING,
    texture: validateTextureReceipt(value.texture),
    entries,
  };
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function decodeReflectionTriplets(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) throw new Error('Reflection PNG dimensions are invalid.');
  const texelCount = width * height;
  if (!Number.isSafeInteger(texelCount)) throw new Error('Reflection PNG texel count is invalid.');
  const expectedLength = texelCount * 3 * 4;
  if (rgba.length !== expectedLength) throw new Error(`Reflection PNG RGBA length ${rgba.length} does not match expected ${expectedLength}.`);
  const raw = new Uint8Array(texelCount * 8);
  for (let texel = 0; texel < texelCount; texel++) {
    const source = texel * 12;
    if (rgba[source + 3] !== 255 || rgba[source + 7] !== 255 || rgba[source + 11] !== 255) throw new Error(`Reflection PNG texel ${texel} has non-opaque packing pixels.`);
    if (rgba[source + 10] !== 0) throw new Error(`Reflection PNG texel ${texel} has a non-zero packing pad byte.`);
    const destination = texel * 8;
    raw[destination] = rgba[source]!;
    raw[destination + 1] = rgba[source + 1]!;
    raw[destination + 2] = rgba[source + 2]!;
    raw[destination + 3] = rgba[source + 4]!;
    raw[destination + 4] = rgba[source + 5]!;
    raw[destination + 5] = rgba[source + 6]!;
    raw[destination + 6] = rgba[source + 8]!;
    raw[destination + 7] = rgba[source + 9]!;
  }
  return raw;
}

function toHalfFloatPixels(raw: Uint8Array): Uint16Array {
  const pixels = new Uint16Array(raw.length / 2);
  for (let offset = 0; offset < pixels.length; offset++) pixels[offset] = raw[offset * 2]! | raw[offset * 2 + 1]! << 8;
  return pixels;
}

function asError(value: unknown) {
  return value instanceof Error ? value : new Error(String(value));
}

function reflectionAssetUrl(file: string) {
  const url = new URL(`${import.meta.env.BASE_URL}assets/reflections/${file}`, window.location.href);
  if (url.origin !== window.location.origin) throw new Error(`Reflection asset ${file} is not same-origin.`);
  return url.toString();
}

export class ReflectionMapLoader {
  readonly ready: Promise<void>;
  private readonly textures = new Map<string, THREE.DataTexture>();
  private readonly pending = new Set<() => void>();
  private terminal: Error | null = null;

  constructor(manifest: unknown) {
    this.ready = Promise.resolve().then(async () => {
      const checked = validateReflectionManifest(manifest);
      await Promise.all(checked.entries.map(entry => this.loadEntry(checked.texture, entry).catch(error => {
        this.terminate(asError(error));
        throw this.terminal!;
      })));
      if (this.terminal) throw this.terminal;
    }).catch(error => {
      this.terminate(asError(error));
      throw this.terminal!;
    });
  }

  get(theme: ReflectionTheme, quality: ReflectionQuality) {
    return this.textures.get(key(theme, quality));
  }

  dispose() {
    this.terminate(new Error('Reflection map loader was disposed.'));
  }

  private terminate(reason: Error) {
    if (this.terminal) return;
    this.terminal = reason;
    for (const cancel of [...this.pending]) cancel();
    this.pending.clear();
    for (const texture of this.textures.values()) texture.dispose();
    this.textures.clear();
  }

  private async loadEntry(receipt: ReflectionTextureReceipt, entry: ReflectionManifestEntry) {
    const rgba = await this.loadImage(reflectionAssetUrl(entry.file), entry.width, entry.height);
    if (this.terminal) throw this.terminal;
    const raw = decodeReflectionTriplets(rgba, entry.width, entry.height);
    if (hex(sha256(raw)) !== entry.texelSha256) throw new Error(`Reflection texel checksum does not match ${entry.file}.`);
    const texture = new THREE.DataTexture(toHalfFloatPixels(raw), entry.width, entry.height, receipt.format, receipt.type);
    texture.mapping = receipt.mapping;
    texture.minFilter = receipt.minFilter;
    texture.magFilter = receipt.magFilter;
    texture.colorSpace = receipt.colorSpace;
    texture.generateMipmaps = receipt.generateMipmaps;
    texture.flipY = receipt.flipY;
    texture.premultiplyAlpha = receipt.premultiplyAlpha;
    texture.unpackAlignment = receipt.unpackAlignment;
    texture.wrapS = receipt.wrapS;
    texture.wrapT = receipt.wrapT;
    texture.anisotropy = receipt.anisotropy;
    texture.needsUpdate = true;
    if (this.terminal) { texture.dispose(); throw this.terminal; }
    this.textures.set(key(entry.theme, entry.quality), texture);
  }

  private loadImage(url: string, width: number, height: number): Promise<Uint8ClampedArray> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      let cancel!: () => void;
      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        image.onload = null;
        image.onerror = null;
        this.pending.delete(cancel);
        callback();
      };
      cancel = () => {
        image.onload = null;
        image.onerror = null;
        settle(() => reject(this.terminal ?? new Error('Reflection map loader was cancelled.')));
      };
      this.pending.add(cancel);
      image.onload = () => settle(() => {
        try {
          if (image.naturalWidth !== width * 3 || image.naturalHeight !== height) throw new Error(`Reflection PNG ${url} has invalid dimensions.`);
          const canvas = document.createElement('canvas');
          canvas.width = width * 3;
          canvas.height = height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('Reflection PNG decoder could not create a 2D canvas context.');
          context.drawImage(image, 0, 0);
          resolve(context.getImageData(0, 0, canvas.width, canvas.height).data);
        } catch (error) { reject(asError(error)); }
      });
      image.onerror = () => settle(() => reject(new Error(`Reflection PNG ${url} failed to load.`)));
      if (this.terminal) cancel();
      else image.src = url;
    });
  }
}
