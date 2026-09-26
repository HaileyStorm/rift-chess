#!/usr/bin/env python3
"""Resource and launcher guards for the source-bound NativeV2 Linux packager."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "build-native-v2.py"
SPEC = importlib.util.spec_from_file_location("native_v2_package", SCRIPT)
assert SPEC and SPEC.loader
package = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(package)


class NativePackagePreflight(unittest.TestCase):
    def test_parent_limit_overrides_unlimited_leaf(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            leaf = root / "parent" / "child"
            leaf.mkdir(parents=True)
            for directory, limit, used in [
                (root, "max", None),
                (root / "parent", str(16 * 1024**3), 3 * 1024**3),
                (leaf, "max", None),
            ]:
                (directory / "memory.max").write_text(limit, encoding="ascii")
                if used is not None:
                    (directory / "memory.current").write_text(str(used), encoding="ascii")
            self.assertEqual(package.cgroup_v2_headroom(root, "/parent/child"), 13 * 1024**3)

    def test_missing_ancestor_accounting_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            leaf = root / "parent" / "child"
            leaf.mkdir(parents=True)
            (leaf / "memory.max").write_text("max", encoding="ascii")
            with self.assertRaises(package.BuildError):
                package.cgroup_v2_headroom(root, "/parent/child")

    def test_cpu_launcher_never_enables_cuda(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            launcher = Path(temporary) / "run-native-v2.sh"
            package.write_launcher(launcher, cuda=False)
            text = launcher.read_text(encoding="utf-8")
            self.assertIn('if [ "0" != 1 ]; then', text)
            self.assertIn('if [ "0" = 1 ]; then', text)
            self.assertIn('gpu=off', text)


if __name__ == "__main__":
    unittest.main()
