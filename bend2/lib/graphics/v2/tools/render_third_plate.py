#!/usr/bin/env python3
"""Render a compiled-Bend effects/type specimen using a caller-supplied local font.

The local font and temporary glyph-coverage data are NOT distributed. Pillow is
used only for native 8-bit glyph masks and metrics; all final drawing, placement,
gradients, group opacity, blend modes and exact box halos execute compiled Bend.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont, __version__ as pillow_version

LIB = Path(__file__).resolve().parents[1]
ROOT = LIB.parents[3]


def sha(path: Path) -> str:
    """Hash bytes for provenance without publishing font data."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    """Bake bounded native glyphs to ignored storage and run the actual renderer."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--font', type=Path, required=True)
    parser.add_argument('--expected-sha256')
    args = parser.parse_args()
    font_path = args.font.resolve()
    if not font_path.is_file():
        parser.error('Font path does not exist')
    font_hash = sha(font_path)
    if args.expected_sha256 and font_hash != args.expected_sha256:
        parser.error('Local font hash mismatch')
    specs = [
        ('header', 'PRISM / LAYER STUDIES', 40, 48, 70),
        ('subhead', 'Native type, isolated groups, soft effects. Every pixel composed by Bend.', 18, 48, 108),
        ('label0', '01   NATIVE INK', 17, 22, 35),
        ('label1', '02   SOFT SHADOW', 17, 22, 35),
        ('label2', '03   PREPARED BLOOM', 17, 22, 35),
        ('label3', '04   GROUP OPACITY', 17, 22, 35),
        ('label4', '05   ENCODED-SPACE BLENDS', 17, 22, 35),
        ('label5', '06   TEXT AS A MATERIAL MASK', 17, 22, 35),
        ('native', 'Aa 012', 73, 23, 143), ('shadow', 'Depth', 73, 35, 143),
        ('glow', 'Glow', 78, 47, 143), ('group', 'ONE GROUP', 26, 141, 128),
        ('fill', 'FILL', 87, 114, 149),
        ('note0', 'Native coverage. Signed bearings.', 17, 22, 214),
        ('note1', 'Three exact box passes. Offset +4,+9.', 17, 22, 214),
        ('note2', 'Cached alpha halos. No per-frame blur.', 17, 22, 214),
        ('note3', 'Alpha 160, applied after the overlap.', 17, 22, 214),
        ('modes', 'Multiply          Screen            Plus', 17, 34, 212),
        ('note5', 'Source-in keeps the native edge coverage.', 16, 22, 214),
        ('footer', '1024 x 1024  /  Native-resolution font coverage  /  PMA 8-bit channels  /  DRAFT', 16, 48, 987),
    ]
    fonts = {size: ImageFont.truetype(str(font_path), size) for size in {s[2] for s in specs}}
    glyphs = {}
    runs = {}
    for key, text, size, x, y in specs:
        font = fonts[size]
        placements = []
        for i, char in enumerate(text):
            code = f'{size}:{ord(char)}'
            if code not in glyphs:
                left, top, right, bottom = font.getbbox(char, anchor='ls')
                side = 1 << max(0, math.ceil(math.log2(max(1, right-left, bottom-top))))
                coverage = Image.new('L', (side, side))
                ImageDraw.Draw(coverage).text((-left, -top), char, font=font, fill=255, anchor='ls')
                glyphs[code] = {'key': code, 'left': left, 'top': top, 'size': side,
                                'advance': round(font.getlength(char)),
                                'coverage': base64.b64encode(coverage.tobytes()).decode()}
            # Application-owned prefix metrics include the local font's kerning.
            position = x + round(font.getlength(text[:i]))
            placements.append({'key': code, 'x': position, 'y': y})
        runs[key] = placements
    build = ROOT / '.artifacts/third-visual'
    build.mkdir(parents=True, exist_ok=True)
    source = build / 'temporary-coverage.json'
    source.write_text(json.dumps({'glyphs': list(glyphs.values()), 'runs': runs}))
    raw = build / 'effects.rgba'
    command = ['node', '--max-old-space-size=3072', str(LIB / 'review-third/demo/effects-plate.mjs'), str(source), str(raw)]
    result = subprocess.run(command, cwd=ROOT, env=dict(os.environ, BEND_NO_TELEMETRY='1'), capture_output=True, text=True, timeout=300)
    receipts = build
    (receipts / 'effects-plate.stdout.txt').write_text(result.stdout)
    (receipts / 'effects-plate.stderr.txt').write_text(result.stderr)
    if result.returncode:
        raise RuntimeError('Effects plate failed; see raw streams')
    output = build / '06-native-type-and-effects.png'
    Image.frombytes('RGBA', (1024, 1024), raw.read_bytes()).save(output)
    record = {'ok': True, 'method': __doc__, 'font_basename': font_path.name,
              'font_sha256': font_hash, 'font_name': fonts[40].getname(), 'pillow': pillow_version,
              'glyphs': len(glyphs), 'runs': len(runs), 'temporary_coverage_sha256': sha(source),
        'command': command, 'renderer_sha256': sha(LIB / 'review-third/demo/effects-plate.mjs'),
              'png_sha256': sha(output), 'renderer': json.loads(result.stdout.strip().splitlines()[-1]),
              'limits': 'Native 8-bit local-font masks, not a shaping/hinting proof or font comparison. No font or reusable generated font data is shipped.'}
    (receipts / 'effects-plate.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({'ok': True, 'output': str(output), 'glyphs': len(glyphs)}), flush=True)


if __name__ == '__main__':
    main()
