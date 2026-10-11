// Lossless transport of one source-bound 64px sprite pose. Bend owns the trees
// and their meaning; this port preserves tags, U32 colors and texture metadata.
const FIELDS = ['ivory_pawn', 'ivory_knight', 'ivory_bishop', 'ivory_rook',
  'ivory_queen', 'ivory_king', 'navy_pawn', 'navy_knight', 'navy_bishop',
  'navy_rook', 'navy_queen', 'navy_king'] as const;
const MAX_NODES = 5461;
const MAX_WORDS = FIELDS.length * 2 * MAX_NODES * 2;

type TextureDescriptor = { field: string; depth: number | bigint; offset: number; end: number };
export type PackedPose = {
  protocol: 1; textures: TextureDescriptor[]; tokens: Uint32Array; nodes: number;
};
export type PackedGround = { protocol: 1; tokens: Uint32Array; nodes: number };

function requireValue(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`Bend pose transport: ${message}`);
}
function exactFields(value: any, fields: readonly string[]): void {
  const keys = value && typeof value === 'object' ? Object.keys(value) : null;
  requireValue(keys && keys.length === fields.length &&
    keys.every(key => fields.includes(key)), 'unexpected fields');
}

export function encodePose(pieces: any): PackedPose {
  exactFields(pieces, ['$', ...FIELDS]);
  requireValue(pieces.$ === 'Pieces', 'piece constructor');
  const scratch = new Uint32Array(MAX_WORDS), textures: TextureDescriptor[] = [];
  let cursor = 0, nodes = 0;
  function tree(image: any, depth: number): void {
    requireValue(depth <= 6 && cursor + 2 <= MAX_WORDS, 'tree bound');
    nodes++;
    if (image?.$ === 'Pix') {
      exactFields(image, ['$', 'color']);
      requireValue(Number.isInteger(image.color) && image.color >= 0 &&
        image.color <= 0xffffffff, 'U32 pixel');
      scratch[cursor++] = 0;
      scratch[cursor++] = image.color;
    } else {
      exactFields(image, ['$', 'tl', 'tr', 'bl', 'br']);
      requireValue(image.$ === 'Qua' && depth < 6, 'branch bound');
      scratch[cursor++] = 1;
      for (const field of ['tl', 'tr', 'bl', 'br']) tree(image[field], depth + 1);
    }
  }
  for (const field of FIELDS) {
    const texture = pieces[field];
    exactFields(texture, ['$', 'depth', 'size', 'colors', 'mask']);
    requireValue(texture.$ === 'Texture' && (texture.depth === 6 || texture.depth === 6n) &&
      texture.size === 64, 'texture metadata');
    const offset = cursor, before = nodes;
    tree(texture.colors, 0);
    tree(texture.mask, 0);
    requireValue(nodes - before <= 2 * MAX_NODES, 'texture node bound');
    textures.push({ field, depth: texture.depth, offset, end: cursor });
  }
  return { protocol: 1, textures, tokens: scratch.slice(0, cursor), nodes };
}

// Keep the helper's cached packet intact; only this fresh buffer is detached.
export function transferPose(pose: PackedPose): PackedPose {
  return { ...pose, tokens: pose.tokens.slice() };
}

export function decodePose(packet: PackedPose): any {
  exactFields(packet, ['protocol', 'textures', 'tokens', 'nodes']);
  requireValue(packet.protocol === 1 && packet.tokens instanceof Uint32Array &&
    packet.tokens.length <= MAX_WORDS && Array.isArray(packet.textures) &&
    packet.textures.length === FIELDS.length && Number.isSafeInteger(packet.nodes), 'packet');
  const words = packet.tokens, pieces: any = { $: 'Pieces' };
  let cursor = 0, nodes = 0;
  function tree(depth: number): any {
    requireValue(depth <= 6 && cursor < words.length, 'decode tree bound');
    nodes++;
    const tag = words[cursor++];
    if (tag === 0) {
      requireValue(cursor < words.length, 'missing pixel');
      return { $: 'Pix', color: words[cursor++] };
    }
    requireValue(tag === 1 && depth < 6, 'node tag');
    const tl = tree(depth + 1), tr = tree(depth + 1);
    const bl = tree(depth + 1), br = tree(depth + 1);
    return { $: 'Qua', tl, tr, bl, br };
  }
  packet.textures.forEach((texture, index) => {
    exactFields(texture, ['field', 'depth', 'offset', 'end']);
    requireValue(texture.field === FIELDS[index] && (texture.depth === 6 || texture.depth === 6n) &&
      texture.offset === cursor, 'texture descriptor');
    const before = nodes, colors = tree(0), mask = tree(0);
    requireValue(texture.end === cursor && nodes - before <= 2 * MAX_NODES, 'texture length');
    pieces[texture.field] = { $: 'Texture', depth: texture.depth, size: 64, colors, mask };
  });
  requireValue(cursor === words.length && nodes === packet.nodes, 'trailing tokens');
  return pieces;
}

// The helper's occupancy image was painted over its detailed settled ground.
// Preserve that exact depth-9 tree for rectangular clearing in the recipient.
export function encodeGround(image: any): PackedGround {
  const maxNodes = 349525, words = new Uint32Array(2 * maxNodes);
  let cursor = 0, nodes = 0;
  function tree(value: any, depth: number): void {
    requireValue(depth <= 9 && cursor + 2 <= words.length && ++nodes <= maxNodes, 'ground bound');
    if (value?.$ === 'Pix') {
      exactFields(value, ['$', 'color']);
      requireValue(Number.isInteger(value.color) && value.color >= 0 && value.color <= 0xffffffff,
        'ground U32 pixel');
      words[cursor++] = 0; words[cursor++] = value.color;
    } else {
      exactFields(value, ['$', 'tl', 'tr', 'bl', 'br']);
      requireValue(value.$ === 'Qua' && depth < 9, 'ground branch');
      words[cursor++] = 1;
      for (const field of ['tl', 'tr', 'bl', 'br']) tree(value[field], depth + 1);
    }
  }
  tree(image, 0);
  return { protocol: 1, tokens: words.slice(0, cursor), nodes };
}

export function decodeGround(packet: PackedGround): any {
  exactFields(packet, ['protocol', 'tokens', 'nodes']);
  requireValue(packet.protocol === 1 && packet.tokens instanceof Uint32Array &&
    packet.tokens.length <= 699050 && Number.isSafeInteger(packet.nodes), 'ground packet');
  const words = packet.tokens;
  let cursor = 0, nodes = 0;
  function tree(depth: number): any {
    requireValue(depth <= 9 && cursor < words.length && ++nodes <= 349525, 'ground decode bound');
    const tag = words[cursor++];
    if (tag === 0) {
      requireValue(cursor < words.length, 'missing ground pixel');
      return { $: 'Pix', color: words[cursor++] };
    }
    requireValue(tag === 1 && depth < 9, 'ground node tag');
    const tl = tree(depth + 1), tr = tree(depth + 1);
    const bl = tree(depth + 1), br = tree(depth + 1);
    return { $: 'Qua', tl, tr, bl, br };
  }
  const image = tree(0);
  requireValue(cursor === words.length && nodes === packet.nodes, 'trailing ground tokens');
  return image;
}

// BPG1 is the packed depth-9 image in a bounded little-endian file.
// It stores no frame or plate policy; the asset consumer verifies those keys.
export function encodeGroundFile(image: any): Uint8Array {
  const packet = encodeGround(image);
  const bytes = new Uint8Array(16 + packet.tokens.length * 4);
  const data = new DataView(bytes.buffer);
  data.setUint32(0, 0x31475042, true); // BPG1
  data.setUint32(4, 9, true);
  data.setUint32(8, packet.nodes, true);
  data.setUint32(12, packet.tokens.length, true);
  packet.tokens.forEach((word, index) => data.setUint32(16 + index * 4, word, true));
  return bytes;
}

export function decodeGroundFile(bytes: Uint8Array): any {
  requireValue(bytes instanceof Uint8Array && bytes.byteLength >= 24 &&
    bytes.byteLength <= 16 + 699050 * 4, 'ground file bound');
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nodes = data.getUint32(8, true), length = data.getUint32(12, true);
  requireValue(data.getUint32(0, true) === 0x31475042 && data.getUint32(4, true) === 9 &&
    nodes >= 1 && nodes <= 349525 && length >= 2 && length <= 699050 &&
    bytes.byteLength === 16 + length * 4, 'ground file header');
  const nativeLittleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  const tokens = nativeLittleEndian && (bytes.byteOffset + 16) % 4 === 0
    ? new Uint32Array(bytes.buffer, bytes.byteOffset + 16, length)
    : Uint32Array.from({ length }, (_, index) => data.getUint32(16 + index * 4, true));
  return decodeGround({ protocol: 1, tokens, nodes });
}
