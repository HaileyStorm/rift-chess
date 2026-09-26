#!/usr/bin/env python3
"""Bake a small, deterministically ordered 8-bit RFNT font pack for Bend.

The compiler sees only a bounded decoder. The host transports opaque bytes;
Bend validates format and reconstructs alpha Image trees at initialization.
"""
from __future__ import annotations

import hashlib
import json
import math
from io import BytesIO
from pathlib import Path

import numpy as np
import PIL
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "bend2/assets/source/fonts/dm-sans-pinned.ttf"
OUTPUT = ROOT / "bend2/assets/runtime/rift-observatory-font.rga"
MANIFEST = Path(__file__).with_name("packed-manifest.json")
SHA256 = "8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d"
BODY = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;/-+!?&()[]#'="
HEADING = "ABCDEFGHIJKLMNOPQRSTUVWXYZ .:-0123456789"
SIZES = ((20, BODY), (30, HEADING), (40, BODY), (60, HEADING))


def encode_tree(alpha: np.ndarray, target: bytearray) -> None:
    first = int(alpha[0, 0])
    if np.all(alpha == first):
        target.extend((0, first))
        return
    target.append(1)
    half = alpha.shape[0] // 2
    for part in (alpha[:half, :half], alpha[:half, half:],
                 alpha[half:, :half], alpha[half:, half:]):
        encode_tree(part, target)


def main() -> None:
    source = SOURCE.read_bytes()
    actual = hashlib.sha256(source).hexdigest()
    if actual != SHA256:
        raise RuntimeError("pinned DM Sans source mismatch")
    records = []
    counts = {}
    for tier, (pixels, characters) in enumerate(SIZES):
        font = ImageFont.truetype(BytesIO(source), pixels)
        font.set_variation_by_axes([20, 650])
        codes = sorted({ord(c) for c in characters} | {63})
        counts[str(pixels)] = len(codes)
        for code in codes:
            char = chr(code)
            left, top, right, bottom = font.getbbox(char, anchor="ls")
            width, height = max(1, right - left), max(1, bottom - top)
            side = 1 << (max(width, height) - 1).bit_length()
            advance = max(0, math.ceil(font.getlength(char)))
            if side > 128 or advance > 128 or not (-128 <= left <= 127) or not (-128 <= top <= 127):
                raise ValueError(f"glyph {pixels}:{char} exceeds format bounds")
            canvas = Image.new("L", (side, side))
            ImageDraw.Draw(canvas).text((-left, -top), char, font=font, fill=255, anchor="ls")
            mask = np.asarray(canvas, dtype=np.uint8)
            node_bytes = bytearray()
            encode_tree(mask, node_bytes)
            # FontPack.tree_loop has a 16,384-step bound: one step per tag,
            # alpha, and assembled child. This is a conservative static check.
            if len(node_bytes) * 3 > 16384:
                raise ValueError(f"glyph {pixels}:{char} exceeds decoder fuel")
            records.append(bytes((tier, code, advance, left + 128, top + 128,
                                  side.bit_length() - 1)) + node_bytes)
    if len(records) > 255:
        raise ValueError("font exceeds format count")
    packed = bytes((82, 70, 78, 84, 1, len(records))) + b"".join(records)
    if not 12 <= len(packed) <= 262144:
        raise ValueError("font exceeds Bend byte cap")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(packed)
    metadata = {
        "schema": "rift-observatory-font-pack/1",
        "source": "bend2/assets/source/fonts/dm-sans-pinned.ttf",
        "source_sha256": actual,
        "output": "bend2/assets/runtime/rift-observatory-font.rga",
        "output_sha256": hashlib.sha256(packed).hexdigest(),
        "bytes": len(packed), "records": len(records), "sizes": counts,
        "axes": [20, 650], "coverage_bits": 8,
        "pillow": PIL.__version__, "numpy": np.__version__,
        "license": "SIL OFL 1.1; see bend2/assets/source/fonts/OFL.txt",
        "naming": "Rift Observatory Sans derivative; not marketed as original DM Sans",
    }
    MANIFEST.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n", encoding="utf8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
