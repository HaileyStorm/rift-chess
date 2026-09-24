#!/usr/bin/env python3
"""Package a headerless raw RGB bitmap as deterministic RGA1 bytes."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys


MAGIC = b"RGA1"
MAX_DEPTH = 9
MAX_PIXELS = 262_144
MAX_RGB_BYTES = MAX_PIXELS * 3


def encode(depth: int, rgb: bytes) -> bytes:
    if not isinstance(depth, int) or isinstance(depth, bool) or not 0 <= depth <= MAX_DEPTH:
        raise ValueError(f"depth must be an integer in 0..{MAX_DEPTH}")
    side = 1 << depth
    pixels = side * side
    if pixels > MAX_PIXELS:
        raise ValueError("image exceeds the maximum pixel count")
    expected = pixels * 3
    if len(rgb) != expected:
        raise ValueError(f"raw RGB input has {len(rgb)} bytes; expected exactly {expected}")
    return MAGIC + bytes((depth,)) + rgb


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("depth", type=int, help="base-2 image depth (0..9; production uses 8 or 9)")
    parser.add_argument("input_rgb", type=Path, help="headerless row-major RGB bytes")
    parser.add_argument("output_rga", type=Path, help="RGA1 output path")
    args = parser.parse_args(argv)

    try:
        if not 0 <= args.depth <= MAX_DEPTH:
            raise ValueError(f"depth must be in 0..{MAX_DEPTH}")
        expected = 3 * (1 << args.depth) ** 2
        if expected > MAX_RGB_BYTES:
            raise ValueError("image exceeds the maximum pixel count")
        # Read one byte over the permitted payload, so a changing or oversized
        # source never causes an unbounded allocation in the offline tool.
        with args.input_rgb.open("rb") as source:
            raw = source.read(expected + 1)
        if len(raw) != expected:
            actual = f"at least {len(raw)}" if len(raw) > expected else str(len(raw))
            raise ValueError(f"raw RGB input has {actual} bytes; expected exactly {expected}")
        encoded = encode(args.depth, raw)
        args.output_rga.write_bytes(encoded)
    except (OSError, ValueError) as error:
        print(f"encode_rgb: {error}", file=sys.stderr)
        return 2

    print(f"RGA1 depth={args.depth} pixels={(1 << args.depth) ** 2} bytes={len(encoded)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
