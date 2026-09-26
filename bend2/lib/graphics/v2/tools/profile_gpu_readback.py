#!/usr/bin/env python3
"""Isolate the first and second host traversals of one Bend GPU image.

Builds a source-bound native fixture. --gpu requires a real CUDA sidecar;
device execution additionally requires a separately authorized GPU lease.
This is an experiment, not a library feature or automatic policy.
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from profile_gpu_plan import (ACTUAL_COMPILER, ROOT, V2, host_metadata,
                              make_output, parse_profile, run, sha256)

SOURCE = V2 / "bench" / "gpu" / "PlanReadback.bend"


def validate(records: list[dict[str, str]], label: str) -> None:
    samples = [row for row in records if row.get("iteration") is not None]
    if sorted(int(row["iteration"]) for row in samples) != list(range(16)):
        raise RuntimeError(f"Missing/duplicate readback rounds in {label}")
    if any(row.get("route") != label for row in samples):
        raise RuntimeError(f"Unexpected route in {label}")
    if any(row.get("image_checksum") is None or
           any(row.get(field) is None for field in
               ("render_return_ms", "first_checksum_ms", "second_checksum_ms"))
           for row in samples):
        raise RuntimeError(f"Missing timing or checksum in {label}")
    complete = [row for row in records if row.get("phase") == "complete"]
    if len(complete) != 1 or complete[0].get("rounds") != "16" or \
            complete[0].get("workload_checksum") != "2162379048":
        raise RuntimeError(f"Frozen 16-frame checksum failed in {label}")
    # The Bend fixture checks first/second checksum equality on every frame
    # and first-frame exact pixels against the serial renderer before printing
    # complete. A process success is therefore required by run().


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--gpu", action="store_true")
    parser.add_argument("--timeout-s", type=int, default=900)
    parser.add_argument("--cc", default=os.environ.get("CC", "clang"))
    args = parser.parse_args()
    if args.timeout_s < 30:
        parser.error("--timeout-s must be at least 30")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = make_output(args.output or ROOT / ".artifacts" / "gpu-readback" / stamp)
    build = out / "build"
    build.mkdir()
    env = dict(os.environ)
    env["BEND_NO_TELEMETRY"] = "1"
    env.setdefault("BEND_COMPILER", str(ROOT / ".artifacts" / "toolchains" / "bend"))
    c_file = build / "PlanReadback.c"
    binary = build / "PlanReadback"
    emit = ["node", "--experimental-strip-types", str(ACTUAL_COMPILER),
            "c", str(SOURCE), str(c_file)]
    emission = run(emit, ROOT, env, out / "emit", args.timeout_s)
    try:
        receipt = json.loads(emission.stdout.splitlines()[-1])
    except (IndexError, json.JSONDecodeError) as exc:
        raise RuntimeError("Missing source-bound compiler receipt") from exc
    closure = receipt.get("closure") if isinstance(receipt, dict) else None
    if receipt.get("ok") is not True or not isinstance(closure, list) or \
            not any(isinstance(item, dict) and
                    item.get("path", "").replace("\\", "/").endswith(
                        "bench/gpu/PlanReadback.bend") and
                    item.get("sha256") == sha256(SOURCE) for item in closure):
        raise RuntimeError("Compiler closure does not bind readback fixture bytes")

    cpu_flags = ["-std=c11", "-O3", str(c_file), "-lpthread", "-lm",
                 "-o", str(binary)]
    if args.gpu:
        cuda = Path(env.get("CUDA_HOME") or "/usr/local/cuda").resolve()
        if not (cuda / "include" / "nvrtc.h").is_file():
            raise RuntimeError(f"CUDA NVRTC header missing under {cuda}")
        compile_command = [args.cc, "-DBEND_CUDA=1", f"-I{cuda / 'include'}",
                           f"-L{cuda / 'lib64'}", f"-L{cuda / 'lib'}",
                           *cpu_flags, "-lcuda", "-lnvrtc"]
    else:
        compile_command = [args.cc, *cpu_flags]
    run(compile_command, ROOT, env, out / "build", args.timeout_s)
    if args.gpu:
        run([str(binary), "--gpu-build"], ROOT, env,
            out / "gpu-build", args.timeout_s)
        if not (build / "PlanReadback.gpu").is_file():
            raise RuntimeError("Missing device sidecar")

    configurations = [
        {"route": "serial", "threads": 1, "gpu": "off"},
        {"route": "cpu", "threads": 1, "gpu": "off"},
        {"route": "cpu", "threads": 4, "gpu": "off"},
        {"route": "offload", "threads": 4, "gpu": "off"},
    ]
    if args.gpu:
        configurations.append({"route": "offload", "threads": 4,
                               "gpu": "on"})
    profiles = []
    for index, config in enumerate(configurations, 1):
        command = [str(binary), "--threads", str(config["threads"]),
                   "--gpu", str(config["gpu"]), "--", config["route"]]
        result = run(command, ROOT, env, out / f"run-{index}", args.timeout_s)
        records = parse_profile(result.stdout.replace("GPU_READBACK ", "GPU_PROFILE "))
        validate(records, config["route"])
        profiles.append({**config, "command": command, "profile": records,
                         "stdout_file": f"run-{index}.stdout.txt"})
        print(f"Readback {config['route']} threads={config['threads']} "
              f"gpu={config['gpu']}", flush=True)

    summary = {
        "schema": "bend2-renderplan-readback-profile/1",
        "ok": True,
        "hypothesis": "If first access migrates device-preferred managed pages, a second "
                      "traversal of the same image without intervening render should be faster.",
        "gpu_device_requested": args.gpu,
        "source": str(SOURCE.relative_to(ROOT)),
        "source_sha256": sha256(SOURCE),
        "compiler_receipt": receipt,
        "import_closure": closure,
        "c_sha256": sha256(c_file),
        "binary_sha256": sha256(binary),
        "gpu_sidecar_sha256": sha256(build / "PlanReadback.gpu")
            if args.gpu else None,
        "commands": {"emit": emit, "compile": compile_command,
                     "gpu_build": [str(binary), "--gpu-build"] if args.gpu else None},
        "host": host_metadata(env, args.cc),
        "profiles": profiles,
        "limits": "Repeated traversal changes future GPU residency and does not measure "
                  "migration itself. One fixture, not game/browser performance.",
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"ok": True, "summary": str(out / "summary.json"),
                      "profiles": len(profiles)}, separators=(",", ":")),
          flush=True)


if __name__ == "__main__":
    main()
