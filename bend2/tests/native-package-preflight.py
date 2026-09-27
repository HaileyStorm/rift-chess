#!/usr/bin/env python3
"""Resource and launcher guards for the source-bound NativeV2 Linux packager."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "build-native-v2.py"
SPEC = importlib.util.spec_from_file_location("native_v2_package", SCRIPT)
assert SPEC and SPEC.loader
package = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(package)


class NativePackagePreflight(unittest.TestCase):
    def memory_fixture(self, root: Path, available_bytes: int, relative: str) -> Path:
        proc = root / "proc"
        (proc / "self").mkdir(parents=True, exist_ok=True)
        (proc / "meminfo").write_text(
            f"MemAvailable: {available_bytes // 1024} kB\n", encoding="ascii"
        )
        (proc / "self" / "cgroup").write_text(f"0::{relative}\n", encoding="ascii")
        return proc

    def test_host_memory_below_and_at_emission_floor(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            cgroup = root / "cgroup"
            cgroup.mkdir()
            (cgroup / "cgroup.controllers").write_text("cpu io memory pids\n", encoding="ascii")
            self.assertIsNone(
                package.cgroup_v2_memory_accounting(cgroup, "/")["visibleAncestorHeadroomBytes"]
            )
            proc = self.memory_fixture(root, 87 * 1024**3, "/")
            below = package.emission_memory_sample("test-below-floor", proc, cgroup)
            self.assertEqual(below["availableBytes"], 87 * 1024**3)
            self.assertFalse(below["admitted"])
            with self.assertRaisesRegex(package.BuildError, "at least 88 GiB"):
                package.require_emission_memory(below["availableBytes"])

            proc = self.memory_fixture(root, package.EMIT_MEMORY_FLOOR, "/")
            at_floor = package.emission_memory_sample("test-at-floor", proc, cgroup)
            self.assertEqual(at_floor["availableBytes"], 88 * 1024**3)
            self.assertTrue(at_floor["admitted"])
            self.assertEqual(at_floor["phase"], "test-at-floor")
            self.assertEqual(at_floor["floorBytes"], package.EMIT_MEMORY_FLOOR)
            self.assertEqual(at_floor["limitingSource"], "host /proc/meminfo MemAvailable")
            package.require_emission_memory(at_floor["availableBytes"])
            self.assertEqual(package.emission_memory_policy()["observedPeak"]["sourceRevision"], "f8a7fbf")

    def test_visible_ancestor_minimum_and_host_minimum_are_recorded(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            leaf = root / "parent" / "child"
            leaf.mkdir(parents=True)
            (root / "cgroup.controllers").write_text("memory cpu\n", encoding="ascii")
            parent = root / "parent"
            (parent / "memory.max").write_text(str(100 * 1024**3), encoding="ascii")
            (parent / "memory.current").write_text(str(12 * 1024**3), encoding="ascii")
            (leaf / "memory.max").write_text("max", encoding="ascii")
            self.assertEqual(
                package.cgroup_v2_memory_accounting(root, "/parent/child")["visibleAncestorHeadroomBytes"],
                88 * 1024**3,
            )

            proc = self.memory_fixture(root, 100 * 1024**3, "/parent/child")
            cgroup_limited = package.emission_memory_sample("test-cgroup-minimum", proc, root)
            self.assertEqual(cgroup_limited["availableBytes"], 88 * 1024**3)
            self.assertTrue(cgroup_limited["admitted"])
            self.assertEqual(cgroup_limited["limitingSource"], "cgroup-v2 ancestor /parent")
            cgroup = cgroup_limited["cgroupV2"]
            self.assertEqual(cgroup["limitingAncestor"]["headroomBytes"], 88 * 1024**3)
            self.assertEqual([item["path"] for item in cgroup["ancestors"]], ["/parent/child", "/parent", "/"])

            proc = self.memory_fixture(root, 87 * 1024**3, "/parent/child")
            host_limited = package.emission_memory_sample("test-host-minimum", proc, root)
            self.assertEqual(host_limited["availableBytes"], 87 * 1024**3)
            self.assertFalse(host_limited["admitted"])
            self.assertEqual(host_limited["limitingSource"], "host /proc/meminfo MemAvailable")
            with self.assertRaisesRegex(package.BuildError, "at least 88 GiB"):
                package.require_emission_memory(host_limited["availableBytes"])

    def test_missing_ancestor_accounting_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            leaf = root / "parent" / "child"
            leaf.mkdir(parents=True)
            (leaf / "memory.max").write_text("max", encoding="ascii")
            with self.assertRaises(package.BuildError):
                package.cgroup_v2_memory_accounting(root, "/parent/child")

    def test_missing_host_or_root_accounting_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            proc = root / "proc"
            (proc / "self").mkdir(parents=True)
            (proc / "self" / "cgroup").write_text("0::/\n", encoding="ascii")
            cgroup = root / "cgroup"
            cgroup.mkdir()
            (cgroup / "cgroup.controllers").write_text("cpu io pids\n", encoding="ascii")
            with self.assertRaisesRegex(package.BuildError, "cannot read Linux MemAvailable"):
                package.linux_memory_snapshot(proc, cgroup)

            (proc / "meminfo").write_text("MemAvailable: 100 kB\n", encoding="ascii")
            with self.assertRaisesRegex(package.BuildError, "no memory controller"):
                package.linux_memory_snapshot(proc, cgroup)

    def initial_admission_plan(self, proc: Path, cgroup: Path) -> dict:
        return {
            "emissionMemoryAdmission": {
                "policy": package.emission_memory_policy(),
                "initialSample": package.emission_memory_sample("build-preflight", proc, cgroup),
            }
        }

    def assert_failure_receipt_contains_second_sample(
        self, root: Path, plan: dict, expected_kind: str
    ) -> dict:
        output = root / "package-output"
        output.mkdir()
        with self.assertRaises(package.BuildError) as raised:
            package.record_immediate_emission_memory_check(
                plan["emissionMemoryAdmission"], root / "proc", root / "cgroup"
            )
        package.write_failure(output, "c-emission", str(raised.exception), plan)
        failure = json.loads((output / "failure.json").read_text(encoding="utf-8"))
        sample = failure["emissionMemoryAdmission"]["immediatelyBeforeCEmissionSample"]
        if expected_kind == "unreadable-memory-accounting":
            self.assertEqual(sample["error"]["kind"], expected_kind)
            self.assertIsNone(sample["availableBytes"])
        else:
            self.assertFalse(sample["admitted"])
            self.assertEqual(sample["availableBytes"], 87 * 1024**3)
        self.assertEqual(sample["phase"], "immediately-before-c-emission")
        self.assertTrue(failure["emissionMemoryAdmission"]["initialSample"]["admitted"])
        return sample

    def test_build_failure_serializes_unreadable_second_memory_attempt(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            cgroup = root / "cgroup"
            cgroup.mkdir()
            (cgroup / "cgroup.controllers").write_text("cpu io memory pids\n", encoding="ascii")
            proc = self.memory_fixture(root, 100 * 1024**3, "/")
            plan = self.initial_admission_plan(proc, cgroup)
            (proc / "meminfo").write_text("MemTotal: 128 kB\n", encoding="ascii")
            sample = self.assert_failure_receipt_contains_second_sample(
                root, plan, "unreadable-memory-accounting"
            )
            self.assertIn("attemptedAtUtc", sample)
            self.assertIn("MemAvailable", sample["error"]["message"])

    def test_build_failure_serializes_low_headroom_second_sample(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            cgroup = root / "cgroup"
            cgroup.mkdir()
            (cgroup / "cgroup.controllers").write_text("cpu io memory pids\n", encoding="ascii")
            proc = self.memory_fixture(root, 100 * 1024**3, "/")
            plan = self.initial_admission_plan(proc, cgroup)
            self.memory_fixture(root, 87 * 1024**3, "/")
            self.assert_failure_receipt_contains_second_sample(
                root, plan, "low-headroom"
            )

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
