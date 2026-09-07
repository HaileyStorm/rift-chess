from pathlib import Path
from PIL import Image
import argparse
import hashlib
import json


parser = argparse.ArgumentParser()
parser.add_argument('raw', type=Path)
parser.add_argument('width', type=int)
parser.add_argument('height', type=int)
parser.add_argument('output', type=Path)
args = parser.parse_args()

if args.width <= 0 or args.height <= 0:
    raise ValueError('Reflection dimensions must be positive.')
if args.output.exists():
    raise FileExistsError(f'Refusing to overwrite {args.output}.')

raw = args.raw.read_bytes()
expected = args.width * args.height * 8
if len(raw) != expected:
    raise ValueError(f'Expected {expected} raw RGBA16 bytes, got {len(raw)}.')

packed = bytearray(args.width * args.height * 9)
for pixel in range(args.width * args.height):
    packed[pixel * 9:pixel * 9 + 8] = raw[pixel * 8:pixel * 8 + 8]

Image.frombytes('RGB', (args.width * 3, args.height), bytes(packed)).save(args.output, format='PNG', compress_level=9)
with Image.open(args.output) as image:
    if image.mode != 'RGB' or image.size != (args.width * 3, args.height):
        raise ValueError('Packed reflection PNG metadata is invalid.')
    decoded = image.tobytes()

restored = bytearray(expected)
for pixel in range(args.width * args.height):
    restored[pixel * 8:pixel * 8 + 8] = decoded[pixel * 9:pixel * 9 + 8]
if restored != raw:
    raise ValueError('PNG packing did not round-trip exact RGBA16 texels.')

print(json.dumps({
    'encoding': 'rgba16le-rgb8-triplets/1',
    'rawBytes': len(raw),
    'pngBytes': args.output.stat().st_size,
    'rawSha256': hashlib.sha256(raw).hexdigest(),
    'pngSha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
}))
