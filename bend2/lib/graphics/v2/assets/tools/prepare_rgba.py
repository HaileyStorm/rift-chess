#!/usr/bin/env python3
"""Prepare straight-alpha PNG/crop assets as bounded RGA2 + explicit mip levels.

RGB stays in encoded channel space (no hidden gamma/profile transform). All
resizing uses exact integer area weights and alpha-weighted color. No matte,
key-color substitution, silhouette crop, rotation, or game policy is applied.
Requires NumPy and Pillow for offline work only; neither is a runtime dependency.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path
import numpy as np
import PIL
from PIL import Image

MAX_SIDE = 512
MAX_INPUT_PIXELS = 16_777_216
MAX_INPUT_BYTES = 128 * 1024 * 1024
MAGIC = b"RGA2"

def encode_rgba(depth: int, raw: bytes) -> bytes:
    if type(depth) is not int or not 0 <= depth <= 9:
        raise ValueError("depth must be an integer in 0..9")
    if not isinstance(raw, bytes) or len(raw) != 4 * (1 << (2 * depth)):
        raise ValueError("payload must be exactly 4 * 4**depth raw RGBA bytes")
    return MAGIC + bytes([depth]) + raw

def decode_rgba(data: bytes) -> tuple[int, np.ndarray]:
    if len(data) < 5:
        raise ValueError("BadLength")
    if data[:4] != MAGIC:
        raise ValueError("BadMagic")
    depth = data[4]
    if depth > 9:
        raise ValueError("BadDepth")
    side = 1 << depth
    if len(data) != 5 + 4 * side * side:
        raise ValueError("BadLength")
    return depth, np.frombuffer(data, np.uint8, offset=5).reshape(side, side, 4).copy()

def _validate_rgba(a: np.ndarray) -> None:
    if a.dtype != np.uint8 or a.ndim != 3 or a.shape[2] != 4:
        raise ValueError("expected a uint8 HxWx4 RGBA array")
    if min(a.shape[:2]) < 1 or a.shape[0] * a.shape[1] > MAX_INPUT_PIXELS:
        raise ValueError("invalid or excessive input dimensions")

def area_resize(a: np.ndarray, width: int, height: int) -> np.ndarray:
    """Exact separable box areas; not bilinear/Lanczos, not linear-light.

    Alpha is round(sum(a*w)/sum(w)); RGB is round(sum(c*a*w)/sum(a*w)).
    A zero rounded output alpha has canonical RGB=0. Integer intermediates
    fit uint64 for the documented input bound. Hidden RGB never contributes.
    """
    _validate_rgba(a)
    if type(width) is not int or type(height) is not int or not (1 <= width <= MAX_SIDE and 1 <= height <= MAX_SIDE):
        raise ValueError("output width/height must be integers in 1..512")
    h, w = a.shape[:2]
    if (h, w) == (height, width):
        return a.copy()  # Byte-preserving identity, including hidden RGB.
    premul = a.astype(np.uint64)
    premul[:, :, :3] *= premul[:, :, 3:4]
    horizontal = np.zeros((h, width, 4), np.uint64)
    for x in range(width):
        lo, hi = x * w, (x + 1) * w
        first, last = lo // width, (hi - 1) // width
        indices = np.arange(first, last + 1, dtype=np.int64)
        weights = (np.minimum((indices + 1) * width, hi) - np.maximum(indices * width, lo)).astype(np.uint64)
        horizontal[:, x] = (premul[:, first:last + 1] * weights[None, :, None]).sum(axis=1)
    totals = np.zeros((height, width, 4), np.uint64)
    for y in range(height):
        lo, hi = y * h, (y + 1) * h
        first, last = lo // height, (hi - 1) // height
        indices = np.arange(first, last + 1, dtype=np.int64)
        weights = (np.minimum((indices + 1) * height, hi) - np.maximum(indices * height, lo)).astype(np.uint64)
        totals[y] = (horizontal[first:last + 1] * weights[:, None, None]).sum(axis=0)
    denom = w * h
    weight = totals[:, :, 3]
    alpha = (weight + denom // 2) // denom
    rgb = (totals[:, :, :3] + weight[:, :, None] // 2) // np.maximum(weight[:, :, None], 1)
    rgb[alpha == 0] = 0
    out = np.empty((height, width, 4), np.uint8)
    out[:, :, :3] = rgb
    out[:, :, 3] = alpha
    return out

def half(a: np.ndarray) -> np.ndarray:
    _validate_rgba(a)
    h, w = a.shape[:2]
    if h != w or h & (h - 1) or h > MAX_SIDE:
        raise ValueError("mip input must be a power-of-two square, side 1..512")
    return a.copy() if h == 1 else area_resize(a, w // 2, h // 2)

def prepare(source: Path, out_dir: Path, side: int, crop: tuple[int, int, int, int] | None = None,
            allow_upscale: bool = False, mips: bool = True, preview: bool = True) -> dict:
    if type(side) is not int or not 1 <= side <= MAX_SIDE or side & (side - 1):
        raise ValueError("side must be a power of two in 1..512")
    # Hash exactly the immutable bytes decoded; bound reads before allocating.
    with source.open("rb") as handle:
        source_bytes = handle.read(MAX_INPUT_BYTES + 1)
    if len(source_bytes) > MAX_INPUT_BYTES:
        raise ValueError("source exceeds the 128 MiB encoded-file cap")
    with Image.open(BytesIO(source_bytes)) as im:
        if im.format != "PNG" or getattr(im, "n_frames", 1) != 1:
            raise ValueError("expected a single-frame PNG; extract animation frames explicitly")
        if im.width * im.height > MAX_INPUT_PIXELS:
            raise ValueError("source exceeds the pixel cap")
        if crop is not None:
            x, y, w, h = crop
            if min(x, y) < 0 or min(w, h) < 1 or x + w > im.width or y + h > im.height:
                raise ValueError("crop must be a nonempty in-bounds x,y,width,height rectangle")
            im = im.crop((x, y, x + w, y + h))
        a = np.asarray(im.convert("RGBA"), dtype=np.uint8)
    h, w = a.shape[:2]
    longest = max(w, h)
    fit = side if allow_upscale else min(side, longest)
    dw = max(1, (w * fit + longest // 2) // longest)
    dh = max(1, (h * fit + longest // 2) // longest)
    scaled = area_resize(a, dw, dh)
    x, y = (side - dw) // 2, (side - dh) // 2
    canvas = np.zeros((side, side, 4), np.uint8)
    canvas[y:y + dh, x:x + dw] = scaled
    out_dir.mkdir(parents=True, exist_ok=True)
    levels = []
    current = canvas
    while True:
        size = current.shape[0]
        depth = size.bit_length() - 1
        wire = encode_rgba(depth, current.tobytes())
        name = f"level-{len(levels)}-{size}.rga2"
        (out_dir / name).write_bytes(wire)
        if preview:
            Image.fromarray(current).save(out_dir / f"{Path(name).stem}.png")
        levels.append({"file": name, "depth": depth, "side": size, "bytes": len(wire), "sha256": hashlib.sha256(wire).hexdigest()})
        if not mips or size == 1:
            break
        current = half(current)
    manifest = {
        "schema": "graphics-v2-rga2-preparation/1",
        "pillow": PIL.__version__, "numpy": np.__version__,
        "source": source.name, "source_sha256": hashlib.sha256(source_bytes).hexdigest(),
        "source_license": "Not inferred; the caller must retain and review source licensing.",
        "crop_xywh": crop, "cropped_size_wh": [w, h], "content_xywh": [x, y, dw, dh],
        "alpha": "straight RGBA; mask red channel = alpha after Bend decode",
        "filter": "exact integer area box, alpha-weighted encoded RGB; half-up rounding; zero-alpha output RGB=0",
        "identity": "same-size resize preserves bytes, including hidden RGB",
        "levels": levels,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return manifest

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("source", type=Path); ap.add_argument("out_dir", type=Path)
    ap.add_argument("--side", type=int, required=True)
    ap.add_argument("--crop", type=int, nargs=4, metavar=("X", "Y", "W", "H"))
    ap.add_argument("--allow-upscale", action="store_true")
    ap.add_argument("--no-mips", action="store_true"); ap.add_argument("--no-preview", action="store_true")
    a = ap.parse_args()
    try:
        print(json.dumps(prepare(a.source, a.out_dir, a.side, tuple(a.crop) if a.crop else None,
            a.allow_upscale, not a.no_mips, not a.no_preview), indent=2))
    except (OSError, ValueError) as e:
        ap.error(str(e))

if __name__ == "__main__":
    main()
