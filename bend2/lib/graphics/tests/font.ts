import Canvas from '../Canvas.bend';
import Font from '../Font.bend';

type Image = Record<string, any>;
type BendString = Record<string, any>;

const pix = (color: number): Image => ({ $: 'Pix', color });
const qua = (tl: Image, tr: Image, bl: Image, br: Image): Image => ({ $: 'Qua', tl, tr, bl, br });
const string = (value: string): BendString => value;

function sample(image: Image, depth: number, x: number, y: number): number {
  if (image.$ === 'Pix' || depth === 0) return image.color;
  const half = 2 ** (depth - 1);
  if (y < half) return sample(x < half ? image.tl : image.tr, depth - 1, x % half, y);
  return sample(x < half ? image.bl : image.br, depth - 1, x % half, y % half);
}

function listValues(value: any): any[] {
  const values: any[] = [];
  for (let cursor = value; cursor.$ !== 'Nil'; cursor = cursor.tail) values.push(cursor.head);
  return values;
}

let checks = 0;
function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  checks += 1;
}
function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
  checks += 1;
}

const base = pix(7);
equal(sample(Canvas.rect(1022, 1022, 8, 8, 99, base), 10, 1023, 1023), 99,
  'rect clips at the depth-10 edge');
equal(sample(Canvas.rect(1022, 1022, 8, 8, 99, base), 10, 1021, 1023), 7,
  'rect leaves pixels outside the request unchanged');
equal(sample(Canvas.rect_at(3n, 6, 6, 2, 2, 88, base), 3, 7, 7), 88,
  'rect_at supports a smaller target depth');

const panel = Canvas.frame(100, 100, 4, 4, 11, 22, base);
const repaintedPanel = Canvas.rect(101, 101, 2, 2, 22, Canvas.rect(100, 100, 4, 4, 11, base));
equal(sample(repaintedPanel, 10, 101, 101), 22,
  'rect can repaint an existing panel interior');
equal(sample(panel, 10, 100, 100), 11, 'frame uses the border colour');
equal(sample(panel, 10, 101, 101), 22, 'frame fills the one-pixel inset');
equal(sample(Canvas.frame(100, 100, 1, 1, 11, 22, base), 10, 100, 100), 11,
  'one-pixel frame has no underflowed inset');

const source = qua(pix(11), pix(22), pix(33), pix(44));
const embedded = Canvas.embed(source, 9n, 24, 112, base);
equal(sample(embedded, 10, 34, 122), 11, 'embed preserves translated NW pixels');
equal(sample(embedded, 10, 324, 122), 22, 'embed preserves translated NE pixels');
equal(sample(embedded, 10, 34, 422), 33, 'embed preserves translated SW pixels');
equal(sample(embedded, 10, 324, 422), 44, 'embed preserves translated SE pixels');
equal(sample(embedded, 10, 23, 112), 7, 'embed leaves the translated exterior untouched');
const board = Canvas.embed(source, 9n, 0, 96, base);
equal(sample(board, 10, 10, 106), 11, 'embed supports the board origin');
equal(sample(board, 10, 300, 106), 22, 'embed supports the board width');
const smallEmbedded = Canvas.embed_at(3n, source, 2n, 2, 2, base);
equal(sample(smallEmbedded, 3, 2, 2), 11, 'embed_at keeps the generic target depth');

function tileColor(x: number, y: number): number {
  return 100 + ((x >> 3) * 17 + (y >> 3) * 31);
}
function patterned(depth: number, x = 0, y = 0): Image {
  if (depth === 3) return pix(tileColor(x, y));
  const half = 2 ** (depth - 1);
  return qua(patterned(depth - 1, x, y), patterned(depth - 1, x + half, y),
    patterned(depth - 1, x, y + half), patterned(depth - 1, x + half, y + half));
}
function checkTranslatedSource(offsetX: number, offsetY: number): void {
  const rendered = Canvas.embed(deepSource, 9n, offsetX, offsetY, base);
  for (let y = 0; y < 512; y += 1) for (let x = 0; x < 512; x += 1) {
    const actual = sample(rendered, 10, offsetX + x, offsetY + y);
    const expected = tileColor(x, y);
    if (actual !== expected) throw new Error(
      `deep embed mismatch at offset ${offsetX},${offsetY} source ${x},${y}: expected ${expected}, got ${actual}`);
  }
  checks += 1;
}
const deepSource = patterned(9);
checkTranslatedSource(24, 96);
checkTranslatedSource(0, 80);
checkTranslatedSource(24, 112);

const printable = string(String.fromCodePoint(...Array.from({ length: 95 }, (_, i) => i + 32)));
const allGlyphs = Font.draw(printable, 0, 0, 1, 73, base);
equal(Font.width(printable, 2), 95 * 12, 'width uses the six-cell monospace advance');
equal(Font.line_height(2), 16, 'line height leaves one pixel row of leading');
for (let index = 0; index < 95; index += 1) {
  if (index === 0) continue; // space is intentionally blank.
  let ink = false;
  for (let y = 0; y < 7 && !ink; y += 1) for (let x = 0; x < 5 && !ink; x += 1) {
    ink = sample(allGlyphs, 10, index * 6 + x, y) === 73;
  }
  assert(ink, `printable glyph ${index + 32} has ink`);
}

const representative = Font.draw(string('Ag9?'), 8, 12, 2, 99, base);
equal(sample(representative, 10, 10, 12), 99, 'uppercase glyph has the expected top stroke');
equal(sample(representative, 10, 12, 11), 7, 'glyph painting does not leak above its origin');
equal(sample(Font.draw_at(8n, string('A'), 1, 1, 1, 55, base), 8, 2, 1), 55,
  'draw_at paints through the generic canvas depth');
const clipped = Font.draw(string('RIFT'), 1018, 1018, 3, 123, base);
equal(sample(clipped, 10, 1020, 1018), 123, 'font clipping keeps visible edge pixels');

const wrapped = listValues(Font.wrap(string('RIFT CHESS UI'), 48, 1)) as BendString[];
assert(wrapped.length >= 2, 'wrap creates multiple lines under a narrow width');
for (const line of wrapped) assert(Font.width(line, 1) <= 48, 'wrapped lines fit the requested width');

console.log(JSON.stringify({ ok: true, checks, printableGlyphs: 94, wrappedLines: wrapped.length }));
