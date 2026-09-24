#!/usr/bin/env python3
"""Package preserved square source artwork into deterministic 512px RGA1 data."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sys

from PIL import Image

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent
CODEC_TOOLS = HERE.parents[1] / "lib" / "graphics" / "v2" / "assets" / "tools"
sys.path.insert(0, str(CODEC_TOOLS))
from encode_rgb import encode  # noqa: E402

SOURCES = {
    "observatory-astral": "source/observatory-astral.png",
    "observatory-stone": "source/observatory-stone.png",
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def prepare() -> dict:
    runtime = ASSETS / "runtime"
    runtime.mkdir(exist_ok=True)
    entries = {}
    for name, relative in SOURCES.items():
        source = ASSETS / relative
        original = source.read_bytes()
        with Image.open(source) as art:
            art.load()
            if art.width != art.height or art.width < 512:
                raise ValueError(f"{relative}: expected square source at least 512px")
            source_size = [art.width, art.height]
            pixels = art.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS).tobytes()
        packed = encode(9, pixels)
        output = runtime / f"{name}.rga"
        output.write_bytes(packed)
        entries[name] = {
            "source": relative,
            "sourceSha256": sha(original),
            "sourceSize": source_size,
            "runtime": f"runtime/{name}.rga",
            "runtimeSha256": sha(packed),
            "runtimeBytes": len(packed),
            "depth": 9,
            "derivedBy": "Pillow RGB conversion and 512x512 Lanczos resampling; RGA1 exact RGB packaging",
        }
    manifest = {"schema": "rift-bend-art-assets/1", "assets": entries}
    (ASSETS / "MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    print(json.dumps(prepare(), sort_keys=True))
