import * as THREE from 'three';
import { ReflectionBakeProducer, type ReflectionTheme, type ReflectionQuality } from './producer';

const producer = new ReflectionBakeProducer();
const gl = producer.renderer.getContext();
const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
const renderer = rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

function encode(bytes: Uint8Array) {
  let result = '';
  for (let start = 0; start < bytes.length; start += 24_576) {
    let binary = '';
    for (let index = start; index < Math.min(start + 24_576, bytes.length); index++) binary += String.fromCharCode(bytes[index]!);
    result += btoa(binary);
  }
  return result;
}

async function capture(theme: ReflectionTheme, quality: ReflectionQuality) {
  if (!['gallery', 'nocturne', 'daylight'].includes(theme) || !['low', 'balanced', 'high'].includes(quality)) throw new Error('Unsupported reflection key.');
  await producer.ready;
  if (gl.getError() !== gl.NO_ERROR) throw new Error('GL error before reflection generation.');
  const target = producer.produce(theme, quality), texture = target.texture;
  const width = quality === 'high' ? 768 : 384, height = quality === 'high' ? 1024 : 512;
  if (target.width !== width || target.height !== height) throw new Error('Unexpected CubeUV dimensions.');
  const pixels = new Uint16Array(width * height * 4);
  producer.renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  if (gl.getError() !== gl.NO_ERROR) throw new Error('HalfFloat reflection generation/readback failed.');
  let alpha = false, radiance = false;
  for (let index = 0; index < pixels.length; index++) {
    const value = pixels[index]!;
    if ((value & 0x7c00) === 0x7c00) throw new Error('Non-finite reflection channel.');
    if (!(value & 0x8000) && (value & 0x7fff)) { if (index % 4 === 3) alpha = true; else radiance = true; }
  }
  if (!alpha || !radiance) throw new Error('Reflection readback is empty.');
  const bytes = new Uint8Array(pixels.buffer), endian = new Uint16Array([1]);
  return {
    producer: 'ReflectionBakeProducer', theme, quality, renderer, threeRevision: THREE.REVISION, platform: navigator.platform,
    target: { width, height, depth: target.depth },
    texture: {
      type: texture.type, format: texture.format, mapping: texture.mapping, minFilter: texture.minFilter, magFilter: texture.magFilter,
      wrapS: texture.wrapS, wrapT: texture.wrapT, anisotropy: texture.anisotropy, colorSpace: texture.colorSpace,
      generateMipmaps: texture.generateMipmaps, flipY: texture.flipY, premultiplyAlpha: texture.premultiplyAlpha, unpackAlignment: texture.unpackAlignment,
    },
    pixels: { encoding: 'base64 raw Uint16Array RGBA HalfFloat bytes', byteOrder: new Uint8Array(endian.buffer)[0] === 1 ? 'little-endian' : 'big-endian', byteLength: bytes.byteLength, base64: encode(bytes) },
  };
}

declare global { interface Window { reflectionCapture: { capture: typeof capture } } }
window.reflectionCapture = { capture };
window.addEventListener('pagehide', () => producer.dispose());
