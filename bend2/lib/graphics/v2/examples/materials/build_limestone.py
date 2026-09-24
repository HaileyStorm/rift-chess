"""Deterministically export the original material study to a depth-8 RGA1 tile.

This is a technical resolution/format conversion, not a new visual design.
Keep the unmodified source PNG and compare output SHA before any replacement.
"""

from hashlib import sha256
from pathlib import Path
import subprocess
import sys

import PIL
from PIL import Image


def main() -> None:
    if PIL.__version__ != "12.3.0":
        raise SystemExit("Pillow 12.3.0 required for this pinned resample")
    here = Path(__file__).resolve().parent
    source = here / "limestone-v1-source.png"
    output = here / "limestone-v1-256.rga"
    raw = Path(".artifacts/bend2/graphics-v2/materials/limestone-v1-256.rgb")
    raw.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as original:
        if original.size != (1254, 1254) or original.mode != "RGB":
            raise SystemExit("unexpected original source shape")
        rgb = original.resize((256, 256), Image.Resampling.LANCZOS).tobytes()
    if len(rgb) != 256 * 256 * 3:
        raise SystemExit("wrong raw RGB size")
    raw.write_bytes(rgb)
    encoder = here.parent.parent / "assets/tools/encode_rgb.py"
    subprocess.run([sys.executable, str(encoder), "8", str(raw), str(output)],
                   check=True)
    encoded = output.read_bytes()
    if encoded != b"RGA1" + bytes([8]) + rgb:
        raise SystemExit("RGA1 encoder output differs from exact raw bytes")
    print(f"source_png_sha256={sha256(source.read_bytes()).hexdigest()}")
    print(f"raw_rgb_sha256={sha256(rgb).hexdigest()}")
    print(f"rga1_sha256={sha256(encoded).hexdigest()}")
    print(f"rga1_bytes={len(encoded)}")


if __name__ == "__main__":
    main()
