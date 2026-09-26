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
    def memory_fixture(self, root: Path, available_gib: int, relative: str) -> Path:
        proc = root / "proc"
        (proc / "self").mkdir(parents=True)
        (proc / "meminfo").write_text(
            f"MemAvailable: {available_gib * 1024 * 1024} kB\n", encoding="ascii"
        )
        (proc / "self" / "cgroup").write_text(f"0::{relative}\n", encoding="ascii")
        return proc

    def test_unlimited_v2_root_uses_host_mem_available(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            cgroup = root / "cgroup"
            cgroup.mkdir()
            (cgroup / "cgroup.controllers").write_text("cpu io memory pids\n", encoding="ascii")
            self.assertIsNone(package.cgroup_v2_headroom(cgroup, "/"))
            proc = self.memory_fixture(root, 39, "/")
            available = package.linux_memory_available(proc, cgroup)
            self.assertEqual(available, 39 * 1024**3)
            with self.assertRaisesRegex(package.BuildError, "at least 40 GiB"):
                package.require_emission_memory(available)

    def test_parent_limit_overrides_unlimited_leaf(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            leaf = root / "parent" / "child"
            leaf.mkdir(parents=True)
            (root / "cgroup.controllers").write_text("memory cpu\n", encoding="ascii")
            for directory, limit, used in [
                (root / "parent", str(16 * 1024**3), 3 * 1024**3),
                (leaf, "max", None),
            ]:
                (directory / "memory.max").write_text(limit, encoding="ascii")
                if used is not None:
                    (directory / "memory.current").write_text(str(used), encoding="ascii")
            self.assertEqual(package.cgroup_v2_headroom(root, "/parent/child"), 13 * 1024**3)
            proc = self.memory_fixture(root, 100, "/parent/child")
            available = package.linux_memory_available(proc, root)
            self.assertEqual(available, 13 * 1024**3)
            with self.assertRaisesRegex(package.BuildError, "at least 40 GiB"):
                package.require_emission_memory(available)

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
