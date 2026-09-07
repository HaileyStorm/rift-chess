"""Diagnostic contact sheets of existing captures; these do not exercise camera zoom."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--prefix', default='play-')
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
receipt = json.loads((args.directory / 'receipt.json').read_text(encoding='utf-8'))
rows = [row for row in receipt['captures'] if row['file'].startswith(args.prefix)]
args.output.mkdir(parents=True, exist_ok=False)
font = ImageFont.load_default(size=12)
index = {'sourceReceipt': str((args.directory / 'receipt.json').resolve()), 'build': receipt.get('build'), 'sheets': []}
for offset in range(0, len(rows), 12):
    selected = rows[offset:offset + 12]
    sheet = Image.new('RGB', (1440, 328 * 4), '#142027')
    draw = ImageDraw.Draw(sheet)
    mapping = []
    for cell, row in enumerate(selected):
        source = args.directory / row['file']
        with Image.open(source) as frame:
            frame.thumbnail((480, 300), Image.Resampling.LANCZOS)
            x, y = cell % 3 * 480, cell // 3 * 328
            sheet.paste(frame, (x + (480 - frame.width) // 2, y))
        draw.text((x + 8, y + 305), row['file'].removeprefix('play-').removesuffix('.png'), font=font, fill='white')
        mapping.append({'cell': cell, 'source': str(source.resolve()), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()})
    name = f'sheet-{offset // 12 + 1:02}.png'
    sheet.save(args.output / name)
    index['sheets'].append({'file': name, 'cells': mapping})
(args.output / 'index.json').write_text(json.dumps(index, indent=2), encoding='utf-8')
print(json.dumps({'captures': len(rows), 'sheets': len(index['sheets'])}))
