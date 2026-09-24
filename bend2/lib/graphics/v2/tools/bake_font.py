"""Bake a pinned OFL font into deterministic two-bit alpha rows for Bend.

The ignored input is downloaded separately and hash checked. This is a bulk
mechanical source generator, never used at runtime or during the browser build.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[5]
SOURCE = ROOT / ".artifacts/bend2/graphics-v2/dmsans-source.ttf"
TARGET = Path(__file__).resolve().parents[1] / "FontData.bend"
SHA256 = "8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d"
if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != SHA256:
    raise RuntimeError("DM Sans source font hash changed")

font = ImageFont.truetype(str(SOURCE), 20)
font.set_variation_by_axes([20, 650])  # 20px optical size, readable semibold UI weight.


def glyph(char: str) -> tuple[int, int, list[tuple[int, int]]]:
    canvas = Image.new("L", (24, 24), 0)
    ImageDraw.Draw(canvas).text((0, 18), char, font=font, fill=255, anchor="ls")
    rows = []
    for y in range(24):
        low = high = 0
        for x in range(24):
            level = min(3, (canvas.getpixel((x, y)) + 42) // 85)
            low |= (level & 1) << x
            high |= (level >> 1) << x
        rows.append((low, high))
    start = next((i for i, pair in enumerate(rows) if pair != (0, 0)), 24)
    end = 1 + next((i for i in range(23, -1, -1) if rows[i] != (0, 0)), -1)
    advance = max(4, min(23, round(font.getlength(char)) + 1))
    return advance, start, rows[start:end]


def emit(char: str) -> list[str]:
    advance, top, rows = glyph(char)
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

    def encode24(bits: int) -> str:
        return "".join(alphabet[(bits >> (6 * i)) & 63] for i in range(4))

    encoded = "".join(encode24(low) + encode24(high) for low, high in rows)
    return [f"      Glyph{{{advance}, {top}, {len(rows)}n, {json.dumps(encoded)}}}"]


lines = [
    "# Generated two-bit glyph alpha from DM Sans, Google Fonts pinned commit",
    "# b5efa9c32e8f9b63005f5cdb1ad5527a77d2cd04, source SHA256",
    f"# {SHA256}.",
    "# Derivative font software is under SIL Open Font License 1.1; see OFL.txt.",
    "# Pixel-grid adaptation: Rift Atlas Sans (not marketed under the original name).",
    "import Base",
    "",
    "type Glyph is Data:",
    "  Glyph{advance: U32, top: U32, count: Nat, rows: String}",
    "",
    "def glyph(code: U32) -> Glyph:",
    "  match code:",
]
for code in range(32, 127):
    lines.append(f"    case {code}:")
    lines.extend(emit(chr(code)))
lines.append("    case _:")
lines.extend(emit("?"))
TARGET.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
print(f"{TARGET}: {len(lines)} lines, {TARGET.stat().st_size} bytes")
