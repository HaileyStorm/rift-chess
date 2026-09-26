from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

SCRIPT = Path(__file__).resolve().parents[2] / "assets" / "source" / "pieces" / "prepare.py"
SPEC = importlib.util.spec_from_file_location("piece_prepare", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
PREPARE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE)


class PreparePiecesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = PREPARE.source_image()
        cls.cells = PREPARE.piece_cells(cls.source)

    def test_all_twelve_piece_bounds_are_inside_their_source_cells(self) -> None:
        self.assertEqual([item["name"] for item in self.cells], [
            f"{side}-{kind}"
            for side in PREPARE.SIDES
            for kind in PREPARE.KINDS
        ])
        for item in self.cells:
            left, top, right, bottom = item["alpha_bounds"]
            self.assertGreaterEqual(left, 0)
            self.assertGreaterEqual(top, 0)
            self.assertLess(right, PREPARE.CELL_SIZE[0] + 1)
            self.assertLess(bottom, PREPARE.CELL_SIZE[1] + 1)
            self.assertGreater(right - left, 80)
            self.assertGreater(bottom - top, 250)
        self.assertEqual([item["name"] for item in self.cells if item["touches_cell_edge"]],
                         ["navy-knight"])

    def test_page_sizes_alpha_and_per_piece_coverage(self) -> None:
        expectations = ((64, 7, 65541, 196623),
                        (128, 8, 262149, 786447), (256, 9, 1048581, 3145743))
        for sprite_size, depth, page_bytes, total_bytes in expectations:
            pages = PREPARE.make_page_set(self.source, sprite_size)
            self.assertEqual(len(pages), 3)
            self.assertTrue(all(page.size == (sprite_size * 2,) * 2 for page in pages))
            payloads = [PREPARE.encode_rga2(page, depth) for page in pages]
            self.assertTrue(all(payload[:5] == b"RGA2" + bytes((depth,)) for payload in payloads))
            self.assertTrue(all(len(payload) == page_bytes for payload in payloads))
            self.assertEqual(sum(map(len, payloads)), total_bytes)
            for index in range(12):
                page = pages[index // 4]
                slot = index % 4
                tile = page.crop(((slot % 2) * sprite_size, (slot // 2) * sprite_size,
                                  (slot % 2 + 1) * sprite_size, (slot // 2 + 1) * sprite_size))
                alpha = tile.getchannel("A")
                self.assertGreater(alpha.getbbox()[2] - alpha.getbbox()[0], 15)
                self.assertGreater(alpha.getbbox()[3] - alpha.getbbox()[1], 30)
                self.assertEqual(tile.getpixel((0, 0))[3], 0)

    def test_runtime_output_is_reproducible_and_rga2_pages_are_bounded(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            standard = PREPARE.build_tier(self.source, output, "standard")
            standard_bytes = [Path(page["path"]).read_bytes() for page in standard["pages"]]
            repeated = PREPARE.build_tier(self.source, output, "standard")
            self.assertEqual(standard_bytes,
                             [Path(page["path"]).read_bytes() for page in repeated["pages"]])
            high = PREPARE.build_tier(self.source, output, "high-detail")
            interactive = PREPARE.build_tier(self.source, output, "interactive")
            self.assertEqual(interactive["totalBytes"], 196623)
            self.assertEqual(standard["totalBytes"], 786447)
            self.assertEqual(high["totalBytes"], 3145743)

    def test_source_manifest_binds_the_standard_runtime_pages(self) -> None:
        manifest_path = SCRIPT.parent / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        source = manifest["source"]
        source_path = (manifest_path.parent / source["path"]).resolve()
        self.assertEqual(source_path, PREPARE.SOURCE.resolve())
        self.assertEqual(PREPARE.sha256(source_path.read_bytes()), source["sha256"])

        standard = manifest["tiers"]["standard"]
        self.assertFalse(standard["deploymentIntegrated"])
        self.assertEqual(standard["totalBytes"], 786447)
        self.assertEqual(len(standard["pages"]), 3)
        for page in standard["pages"]:
            path = (manifest_path.parent / page["path"]).resolve()
            payload = path.read_bytes()
            self.assertEqual(len(payload), page["bytes"])
            self.assertEqual(PREPARE.sha256(payload), page["sha256"])
            self.assertEqual(payload[:5], b"RGA2\x08")

        interactive = manifest["tiers"]["interactive"]
        self.assertTrue(interactive["deploymentIntegrated"])
        self.assertEqual(interactive["totalBytes"], 196623)
        for page in interactive["pages"]:
            payload = (manifest_path.parent / page["path"]).resolve().read_bytes()
            self.assertEqual(len(payload), page["bytes"])
            self.assertEqual(PREPARE.sha256(payload), page["sha256"])
            self.assertEqual(payload[:5], b"RGA2\x07")

        high = manifest["tiers"]["highDetail"]
        self.assertFalse(high["shippedRuntimePages"])
        self.assertEqual(high["totalBytes"], 3145743)


if __name__ == "__main__":
    unittest.main()
