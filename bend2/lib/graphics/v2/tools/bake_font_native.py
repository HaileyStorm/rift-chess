#!/usr/bin/env python3
"""Bake a supplied, hash-pinned font at native size to red-alpha Image glyphs.

No font is downloaded or bundled by this tool. Retain the source's license.
This opt-in path does not overwrite FontData.bend or change AtlasText's 2-bit
law. Pixel masks have 4 or 8 bits of alpha; choose a separate native tier rather
than magnifying the old 24px grid. Requires Pillow and NumPy offline only.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
from io import BytesIO
from pathlib import Path
import numpy as np
import PIL
from PIL import Image, ImageDraw, ImageFont

LIB = Path(__file__).resolve().parents[1]

def coord(n: int) -> str:
    return f"Shapes.Neg{{{-n}}}" if n < 0 else f"Shapes.Pos{{{n}}}"

def quantize_alpha(a: np.ndarray, bits: int) -> np.ndarray:
    if bits not in (4, 8) or a.dtype != np.uint8:
        raise ValueError("expected uint8 alpha and 4 or 8 bits")
    if bits == 8:
        return a.copy()
    return (((a.astype(np.uint16) * 15 + 127) // 255) * 17).astype(np.uint8)

def tree(a: np.ndarray) -> str:
    if np.all(a == a[0, 0]):
        return f"Pix{{{int(a[0, 0]) << 16}}}"
    h = a.shape[0] // 2
    return "Qua{" + ", ".join(tree(c) for c in (a[:h, :h], a[:h, h:], a[h:, :h], a[h:, h:])) + "}"

def raster(font: ImageFont.FreeTypeFont, char: str, bits: int) -> dict:
    left, top, right, bottom = font.getbbox(char, anchor="ls")
    width, height = max(1, right - left), max(1, bottom - top)
    side = 1 << (max(width, height) - 1).bit_length()
    advance = max(0, math.ceil(font.getlength(char)))
    if side > 512 or max(abs(left), abs(top), advance) > 4096:
        raise ValueError(f"glyph {char!r} exceeds the library's bounds")
    canvas = Image.new("L", (side, side))
    ImageDraw.Draw(canvas).text((-left, -top), char, font=font, fill=255, anchor="ls")
    mask = quantize_alpha(np.asarray(canvas, dtype=np.uint8), bits)
    return {"advance": advance, "left": left, "top": top, "side": side,
            "depth": side.bit_length() - 1, "mask": mask}

def emit_glyph(g: dict) -> str:
    return (f"Glyph.Mask{{{g['advance']}, {coord(g['left'])}, {coord(g['top'])}, "
            f"{g['depth']}n, {g['side']}, {tree(g['mask'])}" + "}")

def bake(source: Path, expected_sha: str, px: int, out: Path, bits: int = 4,
         axes: list[float] | None = None, characters: str | None = None) -> dict:
    source_bytes = source.read_bytes()
    actual = hashlib.sha256(source_bytes).hexdigest()
    if actual != expected_sha.lower():
        raise ValueError("source font SHA-256 mismatch; no output written")
    if not 8 <= px <= 128 or bits not in (4, 8):
        raise ValueError("px must be 8..128, alpha bits must be 4 or 8")
    font = ImageFont.truetype(BytesIO(source_bytes), px)
    if axes is not None:
        font.set_variation_by_axes(axes)
    codes = sorted({ord(c) for c in (characters if characters is not None else ''.join(map(chr, range(32, 127))))} | {63})
    if len(codes) > 1024:
        raise ValueError("at most 1024 glyphs per generated module")
    data = {code: raster(font, chr(code), bits) for code in codes}
    def imp(name: str) -> str:
        relative = os.path.relpath(LIB / f"{name}.bend", out.parent).replace(os.sep, "/")
        return relative if relative.startswith(".") else "./" + relative
    lines = ["# GENERATED native-resolution glyph coverage; review before adoption.",
             f"# Source SHA256 {actual}; native px={px}, alpha_bits={bits}.",
             "# Font licensing is inherited, not inferred by this generator.",
             "# No shaping/kerning: explicit advances; use Glyph.draw_run for shaped positions.",
             "import Base", f"import {imp('Glyph')} as Glyph", f"import {imp('Shapes')} as Shapes", "",
             "def fallback() -> Glyph.Mask:", "  " + emit_glyph(data[63]), "",
             "def glyph(code: U32) -> Glyph.Mask:", "  match code:"]
    for code in codes:
        lines.extend([f"    case {code}:", "      " + emit_glyph(data[code])])
    lines.extend(["    case _: fallback()", "", "def native_px() -> U32:", f"  {px}", "",
                  "def line_height() -> U32:", f"  {sum(font.getmetrics())}", "",
                  "def draw_text(text: String, +depth: Nat, +size: U32,",
                  "  +x: Shapes.Coord, +y: Shapes.Coord, +ink: U32, +opacity: U32, image: Image) -> Image:",
                  "  match text:", "    case SNil{}: image", "    case SCon{Chr{code}, tail}:",
                  "      +g = glyph(code)",
                  "      +painted = Glyph.draw(depth, size, x, y, g, ink, opacity, image)",
                  "      draw_text(tail, depth, size, Glyph.shift(x, Glyph.advance(g)),",
                  "        y, ink, opacity, painted)", "",
                  "def draw_line(depth: Nat, size: U32, text: String,",
                  "  x: Shapes.Coord, y: Shapes.Coord, ink: U32, opacity: U32, image: Image) -> Image:",
                  "  draw_text(text, depth, size, x, y, ink, opacity, image)", "",
                  "# U32 width requires total advance <= 2^32-1; no newline shaping.",
                  "def width(text: String) -> U32:", "  match text:", "    case SNil{}: 0",
                  "    case SCon{Chr{code}, tail}:",
                  "      U32.add(Glyph.advance(glyph(code)), width(tail))", ""])
    output = '\n'.join(lines)
    out.parent.mkdir(parents=True, exist_ok=True)
    # Hash and persist the same LF bytes on Windows and POSIX hosts.
    out.write_bytes(output.encode("utf-8"))
    manifest = {"schema": "graphics-v2-native-glyph-bake/1", "font_sha256": actual,
                "font_source_name": source.name, "native_px": px, "alpha_bits": bits,
                "axes": axes, "pillow": PIL.__version__, "numpy": np.__version__,
                "glyphs": codes, "generated_sha256": hashlib.sha256(output.encode()).hexdigest(),
                "license": "Not inferred. Retain the original font license and derivative naming obligations.",
                "limits": "Single-line codepoint advances; no kerning, shaping, bidi, ligatures, hinting parity or cross-FreeType-version byte guarantee."}
    out.with_suffix(".provenance.json").write_text(json.dumps(manifest, sort_keys=True, indent=2) + '\n')
    return manifest

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("font", type=Path); p.add_argument("output", type=Path)
    p.add_argument("--sha256", required=True); p.add_argument("--px", type=int, required=True)
    p.add_argument("--alpha-bits", type=int, choices=[4, 8], default=4)
    p.add_argument("--axes", nargs="+", type=float); p.add_argument("--characters")
    a = p.parse_args()
    try:
        print(json.dumps(bake(a.font, a.sha256, a.px, a.output, a.alpha_bits, a.axes, a.characters), indent=2))
    except (OSError, ValueError) as e:
        p.error(str(e))

if __name__ == "__main__":
    main()
