#!/usr/bin/env python3
"""Build transparent, size-tiered RGA2 piece pages from the preserved atlas."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ASSET_ROOT = HERE.parents[1]
SOURCE = ASSET_ROOT / "source" / "chess-piece-atlas.png"
DEFAULT_OUTPUT = ASSET_ROOT / "runtime" / "pieces"

SOURCE_SHA256 = "e7e4dd458e02d098c5daa3db2d6a4dc903f10d2f55da33684932ecc2b9dad923"
SOURCE_SIZE = (1536, 1024)
CELL_SIZE = (256, 512)
SIDES = ("white", "navy")
KINDS = ("pawn", "knight", "bishop", "rook", "queen", "king")
ALPHA_THRESHOLD = 4
CROP_GUARD = 2
PAGE_SLOTS = 4
TIERS = {
    "interactive": {"sprite": 64, "depth": 7},
    "standard": {"sprite": 128, "depth": 8},
    "high-detail": {"sprite": 256, "depth": 9},
}
TIER_PREFIX = {"interactive": "pieces-fast", "standard": "pieces-std", "high-detail": "pieces-hi"}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_image(path: Path = SOURCE) -> Image.Image:
    raw = path.read_bytes()
    digest = sha256(raw)
    if digest != SOURCE_SHA256:
        raise ValueError(f"piece atlas SHA-256 changed: {digest}")
    image = Image.open(path).convert("RGBA")
    if image.size != SOURCE_SIZE:
        raise ValueError(f"piece atlas has unexpected dimensions: {image.size}")
    return image


def alpha_bounds(cell: Image.Image) -> tuple[int, int, int, int]:
    alpha = cell.getchannel("A")
    visible = alpha.point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
    bounds = visible.getbbox()
    if bounds is None:
        raise ValueError("piece cell has no visible pixels")
    return bounds


def piece_cells(image: Image.Image) -> list[dict[str, object]]:
    cells: list[dict[str, object]] = []
    cell_width, cell_height = CELL_SIZE
    for side_index, side in enumerate(SIDES):
        for kind_index, kind in enumerate(KINDS):
            cell_box = (
                kind_index * cell_width,
                side_index * cell_height,
                (kind_index + 1) * cell_width,
                (side_index + 1) * cell_height,
            )
            cell = image.crop(cell_box)
            bounds = alpha_bounds(cell)
            left, top, right, bottom = bounds
            crop_box = (
                max(0, left - CROP_GUARD),
                max(0, top - CROP_GUARD),
                min(cell_width, right + CROP_GUARD),
                min(cell_height, bottom + CROP_GUARD),
            )
            sprite_index = side_index * len(KINDS) + kind_index
            cells.append(
                {
                    "name": f"{side}-{kind}",
                    "side": side,
                    "kind": kind,
                    "index": sprite_index,
                    "cell_box": cell_box,
                    "alpha_bounds": bounds,
                    "touches_cell_edge": (
                        bounds[0] == 0
                        or bounds[1] == 0
                        or bounds[2] == cell_width
                        or bounds[3] == cell_height
                    ),
                    "crop_box": crop_box,
                    "crop": cell.crop(crop_box),
                }
            )
    return cells


def make_page_set(image: Image.Image, sprite_size: int) -> list[Image.Image]:
    if sprite_size not in (64, 128, 256):
        raise ValueError("sprite tier must be 64, 128 or 256 pixels")
    cells = piece_cells(image)
    reference_height = max(
        int(item["alpha_bounds"][3]) - int(item["alpha_bounds"][1])
        for item in cells
    )
    page_size = sprite_size * 2
    inset = 4
    usable_height = sprite_size - inset * 2
    scale = usable_height / reference_height
    pages = [Image.new("RGBA", (page_size, page_size), (0, 0, 0, 0)) for _ in range(3)]

    for item in cells:
        index = int(item["index"])
        slot = index % PAGE_SLOTS
        page = pages[index // PAGE_SLOTS]
        crop = item["crop"]
        assert isinstance(crop, Image.Image)
        width = max(1, round(crop.width * scale))
        height = max(1, round(crop.height * scale))
        resized = crop.resize((width, height), Image.Resampling.LANCZOS)
        slot_x = (slot % 2) * sprite_size
        slot_y = (slot // 2) * sprite_size
        destination = (
            slot_x + (sprite_size - width) // 2,
            slot_y + sprite_size - inset - height,
        )
        page.alpha_composite(resized, destination)

    return pages


def encode_rga2(page: Image.Image, depth: int) -> bytes:
    expected_size = 1 << depth
    if page.size != (expected_size, expected_size):
        raise ValueError(f"RGA2 depth {depth} does not match page size {page.size}")
    return b"RGA2" + bytes((depth,)) + page.tobytes("raw", "RGBA")


def build_tier(image: Image.Image, output: Path, tier: str) -> dict[str, object]:
    try:
        config = TIERS[tier]
    except KeyError as error:
        raise ValueError(f"unknown sprite tier: {tier}") from error
    sprite_size = int(config["sprite"])
    depth = int(config["depth"])
    output.mkdir(parents=True, exist_ok=True)
    pages = make_page_set(image, sprite_size)
    entries = []
    for index, page in enumerate(pages):
        packed = encode_rga2(page, depth)
        path = output / f"{TIER_PREFIX[tier]}-{index}.rga"
        path.write_bytes(packed)
        entries.append(
            {
                "path": str(path),
                "sha256": sha256(packed),
                "bytes": len(packed),
                "depth": depth,
                "size": page.size,
            }
        )
    return {
        "tier": tier,
        "spritePixels": sprite_size,
        "sourceSha256": SOURCE_SHA256,
        "pages": entries,
        "totalBytes": sum(int(entry["bytes"]) for entry in entries),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tier", choices=("interactive", "standard", "high-detail", "both"), default="standard")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    image = source_image()
    selected = TIERS.keys() if args.tier == "both" else (args.tier,)
    result = [build_tier(image, args.output, tier) for tier in selected]
    print(json.dumps({"source": str(SOURCE), "results": result}, indent=2))


if __name__ == "__main__":
    main()
