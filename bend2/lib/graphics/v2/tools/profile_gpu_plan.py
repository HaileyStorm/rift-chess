#!/usr/bin/env python3
"""Build and profile the source-only native 512-square RenderPlan fixture.

The Bend program times setup, preparation, first render, warm renders and
post-return checksums inside each process. This runner only builds and records
commands/artifacts/host metadata; it never times process startup as a render.
GPU compilation and device execution require the explicit --gpu option.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

V2 = Path(__file__).resolve().parents[1]
ROOT = V2.parents[3]
SOURCE = V2 / "bench" / "gpu" / "PlanProfile.bend"
ACTUAL_COMPILER = V2 / "tools" / "actual_compiler.mjs"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(command: list[str], cwd: Path, env: dict[str, str],
        out: Path, timeout_s: int) -> subprocess.CompletedProcess[str]:
    start = time.perf_counter()
    try:
        result = subprocess.run(command, cwd=cwd, env=env, text=True,
                                capture_output=True, timeout=timeout_s)
    except subprocess.TimeoutExpired as exc:
        def decode(value: str | bytes | None) -> str:
            if isinstance(value, bytes):
                return value.decode(errors="replace")
            return value or ""

        out.with_suffix(".stdout.txt").write_text(decode(exc.stdout))
        out.with_suffix(".stderr.txt").write_text(decode(exc.stderr))
        out.with_suffix(".command.json").write_text(json.dumps({
            "command": command, "cwd": str(cwd), "timeout_s": timeout_s,
            "seconds": time.perf_counter() - start, "timed_out": True,
        }, indent=2) + "\n")
        raise RuntimeError(f"Timed out running {command}; see {out}") from exc
    out.with_suffix(".stdout.txt").write_text(result.stdout)
    out.with_suffix(".stderr.txt").write_text(result.stderr)
    out.with_suffix(".command.json").write_text(json.dumps({
        "command": command, "cwd": str(cwd), "exit_code": result.returncode,
        "seconds": time.perf_counter() - start,
    }, indent=2) + "\n")
    if result.returncode:
        raise RuntimeError(f"Command failed ({result.returncode}): {command}; see {out}")
    return result


def optional_command(command: list[str], cwd: Path,
                     env: dict[str, str]) -> dict[str, object] | None:
    if not shutil.which(command[0]):
        return None
    result = subprocess.run(command, cwd=cwd, env=env, text=True,
                            capture_output=True, timeout=15)
    return {"command": command, "exit_code": result.returncode,
            "stdout": result.stdout.strip(), "stderr": result.stderr.strip()}


def read_text(path: Path) -> str | None:
    try:
        return path.read_text().strip()
    except OSError:
        return None


def host_metadata(env: dict[str, str], cc: str) -> dict[str, object]:
    cpu_model = None
    cpuinfo = read_text(Path("/proc/cpuinfo"))
    if cpuinfo:
        cpu_model = next((line.split(":", 1)[1].strip()
                          for line in cpuinfo.splitlines()
                          if line.startswith("model name")), None)
    affinity = sorted(os.sched_getaffinity(0)) if hasattr(os, "sched_getaffinity") else None
    return {
        "platform": platform.platform(),
        "uname": list(platform.uname()),
        "cpu_model": cpu_model,
        "cpu_count": os.cpu_count(),
        "cpu_affinity": affinity,
        "cgroup_cpu_max": read_text(Path("/sys/fs/cgroup/cpu.max")),
        "cgroup_memory_max": read_text(Path("/sys/fs/cgroup/memory.max")),
        "clang": optional_command([cc, "--version"], ROOT, env),
        "gpu": optional_command([
            "nvidia-smi", "--query-gpu=name,uuid,driver_version,memory.total",
            "--format=csv,noheader",
        ], ROOT, env),
    }


def parse_profile(stdout: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for line in stdout.splitlines():
        if not line.startswith("GPU_PROFILE "):
            continue
        fields: dict[str, str] = {}
        for item in line[len("GPU_PROFILE "):].split():
            if "=" in item:
                key, value = item.split("=", 1)
                fields[key] = value
        rows.append(fields)
    return rows


def make_output(path: Path) -> Path:
    out = path.resolve()
    if out.exists():
        if not out.is_dir() or any(out.iterdir()):
            raise SystemExit(f"Refusing to overwrite non-empty output path: {out}")
    else:
        out.mkdir(parents=True)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="new or empty per-run output directory")
    parser.add_argument("--gpu", action="store_true",
                        help="build the GPU sidecar and explicitly run device offload")
    parser.add_argument("--gpu-threads", type=int, action="append", dest="gpu_threads",
                        help="host worker count for GPU rows; repeat for multiple counts (default: 4)")
    parser.add_argument("--timeout-s", type=int, default=900,
                        help="per-command timeout, including a possible GPU build (default: 900)")
    parser.add_argument("--cc", default=os.environ.get("CC", "clang"),
                        help="native C compiler (default: CC or clang)")
    args = parser.parse_args()
    if args.timeout_s < 30:
        parser.error("--timeout-s must be at least 30")
    gpu_threads = args.gpu_threads or [4]
    if any(threads not in (1, 4) for threads in gpu_threads):
        parser.error("--gpu-threads accepts only 1 or 4")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    default_out = ROOT / ".artifacts" / "gpu-plan-profile" / timestamp
    out = make_output(args.output or default_out)
    build = out / "build"
    build.mkdir()
    env = dict(os.environ)
    env["BEND_NO_TELEMETRY"] = "1"
    env.setdefault("BEND_COMPILER", str(ROOT / ".artifacts" / "toolchains" / "bend"))
    metadata = host_metadata(env, args.cc)
    c_file = build / "PlanProfile.c"
    binary = build / "PlanProfile"
    # Use Node directly so --experimental-strip-types is passed to the pinned
    # compiler wrapper and every build command remains visible in the receipt.
    compiler_command = ["node", "--experimental-strip-types", str(ACTUAL_COMPILER),
                        "c", str(SOURCE), str(c_file)]
    compiler_result = run(compiler_command, ROOT, env, out / "emit", args.timeout_s)
    try:
        compiler_receipt = json.loads(compiler_result.stdout.splitlines()[-1])
    except (IndexError, json.JSONDecodeError):
        compiler_receipt = {"stdout": compiler_result.stdout}
    source_hash = sha256(SOURCE)
    import_closure = compiler_receipt.get("closure", []) if isinstance(compiler_receipt, dict) else []
    if not isinstance(compiler_receipt, dict) or compiler_receipt.get("ok") is not True \
            or not isinstance(import_closure, list):
        raise RuntimeError("Pinned compiler did not return a valid source/import-closure receipt")
    if not any(item.get("path", "").replace("\\", "/").endswith(
            "bench/gpu/PlanProfile.bend") and item.get("sha256") == source_hash
            for item in import_closure if isinstance(item, dict)):
        raise RuntimeError("Compiler closure receipt does not bind PlanProfile.bend bytes")
    # Mirror the pinned Bend CLI's native CUDA build in bend2/main.ts. A plain
    # C build accepts --gpu on but gpu_probe() is false: that is CPU fallback,
    # not a device benchmark.
    cpu_flags = ["-std=c11", "-O3", str(c_file),
                 "-lpthread", "-lm", "-o", str(binary)]
    if args.gpu:
        cuda = Path(env.get("CUDA_HOME") or "/usr/local/cuda").resolve()
        if not (cuda / "include" / "nvrtc.h").is_file():
            raise RuntimeError(f"CUDA NVRTC header is missing under {cuda}")
        compile_command = [args.cc, "-DBEND_CUDA=1", f"-I{cuda / 'include'}",
                           f"-L{cuda / 'lib64'}", f"-L{cuda / 'lib'}",
                           *cpu_flags, "-lcuda", "-lnvrtc"]
    else:
        compile_command = [args.cc, *cpu_flags]
    run(compile_command, ROOT, env, out / "build", args.timeout_s)

    if args.gpu:
        run([str(binary), "--gpu-build"], ROOT, env,
            out / "gpu-build", args.timeout_s)
        if not (build / "PlanProfile.gpu").is_file():
            raise RuntimeError("GPU build returned without a device sidecar")

    configurations = [
        {"route": "serial", "threads": 1, "gpu": "off"},
        {"route": "cpu", "threads": 1, "gpu": "off"},
        {"route": "cpu", "threads": 4, "gpu": "off"},
        {"route": "offload", "threads": 1, "gpu": "off"},
        {"route": "offload", "threads": 4, "gpu": "off"},
    ]
    if args.gpu:
        configurations.extend({"route": "offload", "threads": threads,
                               "gpu": "on"} for threads in gpu_threads)

    rows = []
    for index, config in enumerate(configurations):
        command = [str(binary), "--threads", str(config["threads"]),
                   "--gpu", str(config["gpu"]), "--", str(config["route"])]
        run_result = run(command, ROOT, env, out / f"run-{index + 1}", args.timeout_s)
        records = parse_profile(run_result.stdout)
        case_records = [row for row in records if "case" in row]
        expected_cases = {
            "legacy-cuts3-forks1", "sweep-cuts7-forks1", "sweep-cuts7-forks3",
            "sweep-cuts7-forks5", "sweep-cuts7-forks7",
        }
        if {row.get("case") for row in case_records} != expected_cases:
            raise RuntimeError(f"Unexpected profile cases in run {index + 1}")
        for case in sorted(expected_cases):
            case_rows = [row for row in case_records if row.get("case") == case]
            counts = {phase: sum(row.get("phase") == phase for row in case_rows)
                      for phase in ("prepare", "first", "warm", "serial_reference", "complete")}
            warm_iterations = sorted(int(row["iteration"]) for row in case_rows
                                     if row.get("phase") == "warm" and "iteration" in row)
            if counts != {"prepare": 1, "first": 1, "warm": 15,
                          "serial_reference": 1, "complete": 1}:
                raise RuntimeError(f"Wrong phase counts for {case}: {counts}")
            if warm_iterations != list(range(1, 16)):
                raise RuntimeError(f"Warm iteration sequence is incomplete for {case}: {warm_iterations}")
        complete = [row for row in case_records if row.get("phase") == "complete"]
        references = [row for row in case_records if row.get("phase") == "serial_reference"]
        if any(row.get("workload_checksum") != "2162379048" for row in complete):
            raise RuntimeError(f"Frozen workload checksum mismatch in run {index + 1}")
        if any(row.get("exact_pixels") != "true" for row in references):
            raise RuntimeError(f"Serial pixel reference mismatch in run {index + 1}")
        rows.append({**config, "command": command,
                     "process_seconds_context_only": json.loads(
                         (out / f"run-{index + 1}.command.json").read_text())["seconds"],
                     "profile": records,
                     "stdout_file": f"run-{index + 1}.stdout.txt",
                     "stderr_file": f"run-{index + 1}.stderr.txt"})
        print(f"Recorded {config['route']} threads={config['threads']} gpu={config['gpu']}",
              flush=True)

    report = {
        "schema": "bend2-renderplan-gpu-profile/1",
        "ok": True,
        "method": "In-process IO.now phase timings; process startup retained separately for context.",
        "gpu_device_requested": args.gpu,
        "gpu_threads": gpu_threads if args.gpu else [],
        "output": str(out),
        "source": str(SOURCE.relative_to(ROOT)),
        "source_sha256": source_hash,
        "compiler_receipt": compiler_receipt,
        "import_closure": import_closure,
        "c_sha256": sha256(c_file),
        "binary_sha256": sha256(binary),
        "gpu_sidecar_sha256": sha256(build / "PlanProfile.gpu")
            if (build / "PlanProfile.gpu").exists() else None,
        "commands": {"emit": compiler_command, "compile": compile_command,
                     "gpu_build": [str(binary), "--gpu-build"] if args.gpu else None},
        "host": metadata,
        "profiles": rows,
        "limits": "One fixed RenderPlan command workload. Device transfer is inside render_return_ms; checksum_ms is host traversal. Not a browser or frame-rate claim.",
    }
    (out / "summary.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"ok": True, "summary": str(out / "summary.json"),
                      "profiles": len(rows)}, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
