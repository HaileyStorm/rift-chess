from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from encode_rgb import MAGIC, encode, main


class EncodeRgbTests(unittest.TestCase):
    def test_exact_header_and_payload(self) -> None:
        raw = bytes((0x12, 0x34, 0x56))
        self.assertEqual(encode(0, raw), MAGIC + bytes((0,)) + raw)

    def test_output_is_deterministic_and_preserves_all_bytes(self) -> None:
        raw = bytes((index * 73 + 19) & 255 for index in range(3 * 4 * 4))
        first = encode(2, raw)
        second = encode(2, raw)
        self.assertEqual(first, second)
        self.assertEqual(first[5:], raw)

    def test_depth_zero_through_nine_length(self) -> None:
        for depth in range(10):
            raw = bytes((depth,)) * (3 * (1 << depth) ** 2)
            encoded = encode(depth, raw)
            self.assertEqual(len(encoded), 5 + len(raw))
            self.assertEqual(encoded[:5], MAGIC + bytes((depth,)))

    def test_wrong_payload_length_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "expected exactly 3"):
            encode(0, b"\0\0")

    def test_invalid_depth_fails(self) -> None:
        for depth in (-1, 10, True):
            with self.subTest(depth=depth), self.assertRaises(ValueError):
                encode(depth, b"\0\0\0")

    def test_cli_writes_identical_package_bytes(self) -> None:
        raw = bytes((1, 2, 3))
        with TemporaryDirectory() as directory:
            source = Path(directory) / "source.rgb"
            output = Path(directory) / "asset.rga"
            source.write_bytes(raw)
            self.assertEqual(main(["0", str(source), str(output)]), 0)
            self.assertEqual(output.read_bytes(), MAGIC + bytes((0,)) + raw)

    def test_cli_rejects_long_source_without_reading_it_all(self) -> None:
        with TemporaryDirectory() as directory:
            source = Path(directory) / "oversized.rgb"
            output = Path(directory) / "asset.rga"
            source.write_bytes(bytes(1024 * 1024))
            self.assertEqual(main(["0", str(source), str(output)]), 2)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
