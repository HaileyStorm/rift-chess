#!/usr/bin/env python3
"""Build a source-bound NativeV2 Linux package without installing dependencies."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any


EXPECTED_BEND_VERSION = "2.0.27"
EXPECTED_NATIVE_V2_C_BYTES = 14_331_202
EXPECTED_NATIVE_V2_C_SHA256 = "35ab959363d2464dacb89ffe52f962d2e50daf04853cd0cd861a333b2cb0c796"
MIN_CPU_CLANG = 14
MIN_CUDA_CLANG = 19
EMIT_TIMEOUT_MS = 600_000
EMIT_MEMORY_FLOOR = 40 * 1024**3
EXPECTED_ART_IDS = {"observatory-astral", "observatory-stone"}
EXPECTED_PACKAGE_ASSETS = {
    "assets/LICENSES.md",
    "assets/observatory-astral.rga",
    "assets/observatory-stone.rga",
    "assets/pieces-fast-0.rga",
    "assets/pieces-fast-1.rga",
    "assets/pieces-fast-2.rga",
    "assets/rift-observatory-font.rga",
}


class BuildError(Exception):
    """A fail-closed preflight or package build error."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_sha256(path: Path) -> str:
    return sha256(path.read_bytes())


def json_bytes(value: Any) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise BuildError(f"cannot read JSON manifest {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise BuildError(f"manifest must be a JSON object: {path}")
    return value


def run_capture(command: list[str], *, cwd: Path, env: dict[str, str], timeout: int = 30) -> str:
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise BuildError(f"could not run {command[0]}: {exc}") from exc
    if result.returncode != 0:
        raise BuildError(f"command failed ({result.returncode}): {' '.join(command)}\n{result.stdout.strip()}")
    return result.stdout.strip()


def git(root: Path, *args: str) -> str:
    return run_capture(["git", "-C", str(root), *args], cwd=root, env=os.environ.copy())


def checked_repo_file(root: Path, relative: str | Path) -> Path:
    candidate = (root / relative).resolve(strict=True)
    try:
        candidate.relative_to(root.resolve())
    except ValueError as exc:
        raise BuildError(f"input escapes the checkout: {relative}") from exc
    if not candidate.is_file():
        raise BuildError(f"input is not a regular file: {relative}")
    return candidate


def repo_relative(root: Path, path: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def input_hashes(root: Path, paths: set[Path]) -> dict[str, str]:
    return {
        repo_relative(root, path): file_sha256(path)
        for path in sorted(paths, key=lambda item: repo_relative(root, item))
    }


def source_closure(root: Path, compiler_root: Path) -> list[Path]:
    found: set[Path] = set()
    pinned_root = compiler_root.resolve(strict=True)
    compiler_base = checked_repo_file(root, compiler_root / "bend2" / "base.bend")

    def visit(path: Path, *, compiler_source: bool = False) -> None:
        resolved = path.resolve(strict=True)
        try:
            resolved.relative_to(root.resolve())
        except ValueError as exc:
            raise BuildError(f"Bend import escapes the checkout: {path}") from exc
        if compiler_source:
            try:
                resolved.relative_to(pinned_root)
            except ValueError as exc:
                raise BuildError(f"compiler import escapes the pinned checkout: {path}") from exc
        if resolved in found:
            return
        if not resolved.is_file() or resolved.suffix not in {".bend", ".c", ".js"}:
            raise BuildError(f"import is missing or has an unsupported extension: {path}")
        found.add(resolved)
        if resolved.suffix != ".bend":
            if not compiler_source:
                raise BuildError(f"project import is not a Bend module: {path}")
            return
        text = resolved.read_text(encoding="utf-8")
        for match in re.finditer(r"(?m)^\s*import\s+([^\s#]+)", text):
            spec = match.group(1).strip("'\"")
            if spec == "Base":
                visit(compiler_base, compiler_source=True)
            elif spec.startswith("./") or spec.startswith("../"):
                imported = Path(spec)
                if not imported.suffix:
                    imported = imported.with_suffix(".bend")
                if compiler_source and imported.suffix not in {".bend", ".c", ".js"}:
                    raise BuildError(f"unsupported pinned compiler import: {spec}")
                if not compiler_source and imported.suffix != ".bend":
                    raise BuildError(f"NativeV2 project import must be Bend source: {spec}")
                visit(resolved.parent / imported, compiler_source=compiler_source)
            else:
                raise BuildError(f"unsupported non-relative import in source closure: {spec}")

    visit(checked_repo_file(root, "bend2/NativeV2.bend"), compiler_source=False)
    return sorted(found, key=lambda item: repo_relative(root, item))


def verify_compiler(root: Path) -> dict[str, str]:
    pin_file = checked_repo_file(root, "bend2/TOOLCHAIN.json")
    pin = read_json(pin_file)
    if pin.get("bendVersion") != EXPECTED_BEND_VERSION:
        raise BuildError(f"TOOLCHAIN.json must pin Bend {EXPECTED_BEND_VERSION}.")
    expected_commit = pin.get("bendCommit")
    if not isinstance(expected_commit, str) or not re.fullmatch(r"[0-9a-f]{40}", expected_commit):
        raise BuildError("TOOLCHAIN.json has an invalid Bend commit.")

    compiler_root = (root / ".artifacts" / "toolchains" / "bend").resolve(strict=True)
    head = git(compiler_root, "rev-parse", "HEAD")
    if head != expected_commit:
        raise BuildError(f"pinned Bend HEAD is {head}, expected {expected_commit}.")
    dirty = git(compiler_root, "status", "--porcelain=v1", "--untracked-files=all")
    if dirty:
        raise BuildError("pinned Bend checkout is not clean, including untracked files.")
    tree = git(compiler_root, "rev-parse", "HEAD^{tree}")

    node = shutil.which("node")
    if not node:
        raise BuildError("Node.js is required to invoke the project Bend wrapper.")
    env = os.environ.copy()
    env["BEND_NO_TELEMETRY"] = "1"
    env["BEND_TIMEOUT_MS"] = str(EMIT_TIMEOUT_MS)
    version_output = run_capture(
        [node, str(root / "bend2" / "tools" / "bend.mjs"), "version"],
        cwd=root,
        env=env,
    )
    if not re.search(rf"(?<!\d){re.escape(EXPECTED_BEND_VERSION)}(?!\d)", version_output):
        raise BuildError(f"project wrapper did not report Bend {EXPECTED_BEND_VERSION}: {version_output}")
    return {
        "bendVersion": EXPECTED_BEND_VERSION,
        "bendCommit": head,
        "bendTree": tree,
        "toolchainManifestSha256": file_sha256(pin_file),
        "wrapperVersionOutput": version_output,
    }


def add_asset(
    root: Path,
    rows: list[dict[str, Any]],
    source: Path,
    package_path: str,
    *,
    expected_sha256: str | None = None,
    expected_bytes: int | None = None,
    manifest: str,
    kind: str,
) -> None:
    source = source.resolve(strict=True)
    relative = repo_relative(root, source)
    if not source.is_file():
        raise BuildError(f"asset source is not a regular file: {relative}")
    data = source.read_bytes()
    digest = sha256(data)
    if expected_sha256 is not None and digest != expected_sha256:
        raise BuildError(f"asset hash differs from {manifest}: {relative}")
    if expected_bytes is not None and len(data) != expected_bytes:
        raise BuildError(f"asset byte count differs from {manifest}: {relative}")
    if any(item["packagePath"] == package_path for item in rows):
        raise BuildError(f"duplicate package path: {package_path}")
    rows.append(
        {
            "packagePath": package_path,
            "sourcePath": relative,
            "manifest": manifest,
            "bytes": len(data),
            "sha256": digest,
            "kind": kind,
        }
    )


def validate_assets(root: Path) -> tuple[list[dict[str, Any]], set[Path], dict[str, str]]:
    art_manifest_path = checked_repo_file(root, "bend2/assets/MANIFEST.json")
    art_manifest = read_json(art_manifest_path)
    if art_manifest.get("schema") != "rift-bend-art-assets/1":
        raise BuildError("unknown game artwork manifest schema.")
    assets = art_manifest.get("assets")
    if not isinstance(assets, dict) or set(assets) != EXPECTED_ART_IDS:
        raise BuildError("NativeV2 requires exactly the two manifest-bound observatory plates.")

    rows: list[dict[str, Any]] = []
    used_inputs: set[Path] = {art_manifest_path}
    for asset_id in sorted(EXPECTED_ART_IDS):
        record = assets[asset_id]
        if (
            not isinstance(record, dict)
            or record.get("runtime") != f"runtime/{asset_id}.rga"
            or record.get("depth") != 9
            or record.get("runtimeBytes") != 786437
        ):
            raise BuildError(f"unexpected NativeV2 plate contract: {asset_id}")
        source = checked_repo_file(root, Path("bend2/assets") / record.get("source", ""))
        runtime = checked_repo_file(root, Path("bend2/assets") / record["runtime"])
        used_inputs.update({source, runtime})
        if file_sha256(source) != record.get("sourceSha256"):
            raise BuildError(f"plate source differs from bend2/assets/MANIFEST.json: {asset_id}")
        add_asset(
            root,
            rows,
            runtime,
            f"assets/{asset_id}.rga",
            expected_sha256=record.get("runtimeSha256"),
            expected_bytes=record["runtimeBytes"],
            manifest="bend2/assets/MANIFEST.json",
            kind="runtime",
        )

    artwork_notice = checked_repo_file(root, "bend2/assets/LICENSES.md")
    used_inputs.add(artwork_notice)
    add_asset(
        root,
        rows,
        artwork_notice,
        "assets/LICENSES.md",
        manifest="bend2/assets/LICENSES.md",
        kind="license",
    )

    font_manifest_path = checked_repo_file(root, "bend2/ui/v2/fonts/packed-manifest.json")
    font = read_json(font_manifest_path)
    if (
        font.get("schema") != "rift-observatory-font-pack/1"
        or font.get("output") != "bend2/assets/runtime/rift-observatory-font.rga"
        or font.get("source") != "bend2/assets/source/fonts/dm-sans-pinned.ttf"
        or font.get("bytes") != 151343
        or font.get("coverage_bits") != 8
        or font.get("records") != 242
    ):
        raise BuildError("unexpected NativeV2 font-pack contract.")
    font_source = checked_repo_file(root, font["source"])
    font_runtime = checked_repo_file(root, font["output"])
    font_source_license = checked_repo_file(root, "bend2/assets/source/fonts/OFL.txt")
    font_library_license = checked_repo_file(root, "bend2/lib/graphics/v2/OFL.txt")
    if file_sha256(font_source) != font.get("source_sha256"):
        raise BuildError("font source differs from bend2/ui/v2/fonts/packed-manifest.json.")
    if file_sha256(font_source_license) != file_sha256(font_library_license):
        raise BuildError("font OFL notice differs between source and reusable library.")
    used_inputs.update(
        {font_manifest_path, font_source, font_runtime, font_source_license, font_library_license}
    )
    add_asset(
        root,
        rows,
        font_runtime,
        "assets/rift-observatory-font.rga",
        expected_sha256=font.get("output_sha256"),
        expected_bytes=font["bytes"],
        manifest="bend2/ui/v2/fonts/packed-manifest.json",
        kind="runtime",
    )

    piece_root = checked_repo_file(root, "bend2/assets/source/pieces/manifest.json").parent
    piece_manifest_path = piece_root / "manifest.json"
    piece_manifest = read_json(piece_manifest_path)
    interactive = piece_manifest.get("tiers", {}).get("interactive", {})
    source_record = piece_manifest.get("source", {})
    if (
        piece_manifest.get("format") != "rift-chess-piece-art-source-v1"
        or source_record.get("path") != "../chess-piece-atlas.png"
        or interactive.get("depth") != 7
        or interactive.get("totalBytes") != 196623
        or interactive.get("deploymentIntegrated") is not True
        or len(interactive.get("pages", [])) != 3
    ):
        raise BuildError("unexpected NativeV2 fast-piece manifest contract.")
    piece_source = checked_repo_file(root, piece_root / source_record["path"])
    used_inputs.update({piece_manifest_path, piece_source})
    if file_sha256(piece_source) != source_record.get("sha256"):
        raise BuildError("piece artwork source differs from its source manifest.")
    for index, page in enumerate(interactive["pages"]):
        expected_path = f"../../runtime/pieces/pieces-fast-{index}.rga"
        if page.get("path") != expected_path or page.get("bytes") != 65541:
            raise BuildError(f"unexpected NativeV2 fast-piece page {index}.")
        source = checked_repo_file(root, piece_root / expected_path)
        used_inputs.add(source)
        add_asset(
            root,
            rows,
            source,
            f"assets/pieces-fast-{index}.rga",
            expected_sha256=page.get("sha256"),
            expected_bytes=page["bytes"],
            manifest="bend2/assets/source/pieces/manifest.json",
            kind="runtime",
        )

    extra_licenses = [
        ("bend2/THIRD_PARTY_NOTICES.txt", "licenses/THIRD_PARTY_NOTICES.txt"),
        ("bend2/licenses/Bend-Apache-2.0.txt", "licenses/Bend-Apache-2.0.txt"),
        ("bend2/lib/graphics/v2/OFL.txt", "licenses/Rift-Atlas-Sans-OFL.txt"),
    ]
    for source_name, package_name in extra_licenses:
        source = checked_repo_file(root, source_name)
        used_inputs.add(source)
        add_asset(
            root,
            rows,
            source,
            package_name,
            manifest=source_name,
            kind="license",
        )

    runtime_paths = {
        item["packagePath"] for item in rows if item["packagePath"].startswith("assets/")
    }
    if runtime_paths != EXPECTED_PACKAGE_ASSETS:
        raise BuildError(f"NativeV2 runtime asset set drifted: {sorted(runtime_paths)}")
    manifests = {
        repo_relative(root, path): file_sha256(path)
        for path in (art_manifest_path, font_manifest_path, piece_manifest_path)
    }
    return rows, used_inputs, manifests


def output_directory(root: Path, requested: str | None, *, cuda: bool) -> Path:
    base = (root / ".artifacts" / "bend2" / "native-v2").resolve()
    if requested:
        candidate = Path(requested).expanduser()
        if not candidate.is_absolute():
            candidate = root / candidate
        output = candidate.resolve()
    else:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        profile = "cuda" if cuda else "cpu"
        output = base / f"{profile}-{stamp}-{os.getpid()}"
    try:
        relative = output.relative_to(base)
    except ValueError as exc:
        raise BuildError(f"output must stay under {base}") from exc
    if not relative.parts:
        raise BuildError("output must name a new package directory below the native-v2 artifact root.")
    if output.exists() or output.is_symlink():
        raise BuildError(f"output already exists; choose a fresh directory: {output}")
    ignored = subprocess.run(
        ["git", "-C", str(root), "check-ignore", "-q", "--", ".artifacts/bend2/native-v2/package"],
        cwd=root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if ignored.returncode != 0:
        raise BuildError(".artifacts/bend2/native-v2 must be ignored by Git.")
    return output


def cgroup_v2_headroom(root: Path, relative: str) -> int | None:
    parts = Path(relative.lstrip("/")).parts
    if any(part in {"..", "."} for part in parts):
        raise BuildError("invalid cgroup v2 path in /proc/self/cgroup.")
    leaf = root.joinpath(*parts)
    try:
        leaf.relative_to(root)
    except ValueError as exc:
        raise BuildError("cgroup v2 path escapes its mount.") from exc
    available: int | None = None
    current_path = leaf
    while True:
        try:
            limit_text = (current_path / "memory.max").read_text(encoding="ascii").strip()
            if limit_text != "max":
                limit = int(limit_text)
                current = int((current_path / "memory.current").read_text(encoding="ascii").strip())
                if limit < 0 or current < 0:
                    raise ValueError("negative memory accounting")
                headroom = max(0, limit - current)
                available = headroom if available is None else min(available, headroom)
        except (OSError, ValueError) as exc:
            raise BuildError(f"cannot establish cgroup v2 headroom at {current_path}: {exc}") from exc
        if current_path == root:
            return available
        current_path = current_path.parent


def linux_memory_available() -> int:
    try:
        memory = {}
        for line in Path("/proc/meminfo").read_text(encoding="ascii").splitlines():
            if line.startswith("MemAvailable:"):
                memory["available"] = int(line.split()[1]) * 1024
            elif line.startswith("MemTotal:"):
                memory["total"] = int(line.split()[1]) * 1024
        available = memory["available"]
        total = memory["total"]
    except (OSError, ValueError, IndexError, KeyError) as exc:
        raise BuildError(f"cannot read Linux MemAvailable before NativeV2 emission: {exc}") from exc

    try:
        cg_lines = Path("/proc/self/cgroup").read_text(encoding="ascii").splitlines()
    except OSError as exc:
        raise BuildError(f"cannot read process cgroup before NativeV2 emission: {exc}") from exc
    entries = [line.split(":", 2)[2] for line in cg_lines if line.startswith("0::")]
    if len(entries) != 1:
        raise BuildError("NativeV2 memory preflight requires one readable cgroup v2 process path.")
    headroom = cgroup_v2_headroom(Path("/sys/fs/cgroup"), entries[0])
    if headroom is not None:
        available = min(available, headroom)
    return available


def choose_clang(requested: str | None, *, cuda: bool) -> dict[str, str | int]:
    minimum = MIN_CUDA_CLANG if cuda else MIN_CPU_CLANG
    if requested:
        candidates = [requested]
    else:
        candidates = ["clang", *[f"clang-{version}" for version in range(30, minimum - 1, -1)]]
    reports: list[str] = []
    for candidate in candidates:
        executable = shutil.which(candidate)
        if not executable:
            reports.append(f"{candidate}: unavailable")
            continue
        try:
            result = subprocess.run(
                [executable, "--version"],
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=15,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired):
            reports.append(f"{candidate}: could not query")
            continue
        match = re.search(r"(?m)^.*?\bclang version (\d+)(?:\.\d+)*", result.stdout)
        if result.returncode == 0 and match and int(match.group(1)) >= minimum:
            resolved = Path(executable).resolve()
            return {
                "name": candidate,
                "path": str(resolved),
                "version": int(match.group(1)),
                "sha256": file_sha256(resolved),
                "versionOutput": result.stdout.strip().splitlines()[0],
            }
        reports.append(f"{candidate}: not Clang {minimum}+")
    raise BuildError(f"Clang {minimum}+ is required ({'; '.join(reports)}).")


def cuda_toolkit() -> dict[str, str]:
    cuda_home = Path(os.environ.get("CUDA_HOME", "/usr/local/cuda")).expanduser().resolve()
    include = cuda_home / "include"
    if not (include / "nvrtc.h").is_file():
        raise BuildError(f"CUDA mode requires nvrtc.h under {include}; no install is attempted.")
    libdirs = [cuda_home / "lib64", cuda_home / "lib"]
    nvrtc = [path for directory in libdirs if directory.is_dir() for path in directory.glob("libnvrtc.so*")]
    if not nvrtc:
        raise BuildError("CUDA mode requires an existing libnvrtc.so in CUDA_HOME/lib64 or CUDA_HOME/lib.")
    return {
        "home": str(cuda_home),
        "include": str(include),
        "lib64": str(libdirs[0]),
        "lib": str(libdirs[1]),
    }


def probe_native_dependencies(
    clang: dict[str, str | int],
    *,
    cuda: dict[str, str] | None,
) -> str:
    if cuda is None:
        probe = """#include <X11/Xlib.h>
#include <alsa/asoundlib.h>
int main(int argc, char **argv) {
  if (argc == 2147483647) {
    (void)XOpenDisplay(argv[0]);
    snd_pcm_t *pcm = 0;
    return snd_pcm_open(&pcm, "default", SND_PCM_STREAM_PLAYBACK, 0);
  }
  return 0;
}
"""
    else:
        probe = """#include <X11/Xlib.h>
#include <alsa/asoundlib.h>
#include <cuda.h>
#include <nvrtc.h>
int main(int argc, char **argv) {
  if (argc == 2147483647) {
    (void)XOpenDisplay(argv[0]);
    snd_pcm_t *pcm = 0;
    CUresult driver = cuInit(0);
    nvrtcProgram program = 0;
    nvrtcResult compiler = nvrtcCreateProgram(&program, "", "", 0, 0, 0);
    return (int)driver + (int)compiler + snd_pcm_open(&pcm, "default", SND_PCM_STREAM_PLAYBACK, 0);
  }
  return 0;
}
"""
    command = [
        str(clang["path"]),
        *(
            [
                "-DBEND_CUDA=1",
                f"-I{cuda['include']}",
                f"-L{cuda['lib64']}",
                f"-L{cuda['lib']}",
            ]
            if cuda is not None
            else []
        ),
        "-std=c11",
        "-O0",
        "-x",
        "c",
        "-",
        "-lpthread",
        "-lm",
        "-lX11",
        "-lasound",
        *(["-lcuda", "-lnvrtc"] if cuda is not None else []),
        "-o",
        "/dev/null",
    ]
    try:
        result = subprocess.run(
            command,
            input=probe,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=30,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise BuildError(f"X11/ALSA link preflight could not run: {exc}") from exc
    if result.returncode != 0:
        raise BuildError(f"X11/ALSA headers or link libraries are unavailable:\n{result.stdout.strip()}")
    return "clang header and link probe passed without running a display or audio device"


def preflight(root: Path, args: argparse.Namespace) -> dict[str, Any]:
    if args.cuda and not args.gpu_grant_id:
        raise BuildError("CUDA sidecar build probes and loads a GPU module; pass --gpu-grant-id for an active host GPU lease.")
    if args.cuda and sys.platform != "linux":
        raise BuildError("CUDA packaging requires Linux; Windows is preflight-only.")
    if not args.preflight and sys.platform != "linux":
        raise BuildError("NativeV2 ELF packaging requires Linux; this Windows command made no changes.")
    available = None
    if not args.preflight and sys.platform == "linux":
        if not Path("/proc").is_dir():
            raise BuildError("Linux /proc is required for the bounded emission memory preflight.")
        available = linux_memory_available()
        if available < EMIT_MEMORY_FLOOR:
            gib = available / 1024**3
            raise BuildError(
                f"only {gib:.1f} GiB is MemAvailable; NativeV2 C emission requires at least "
                f"{EMIT_MEMORY_FLOOR / 1024**3:.0f} GiB for the recorded 32.22 GiB peak."
            )
    compiler = verify_compiler(root)
    compiler_root = root / ".artifacts" / "toolchains" / "bend"
    closure = source_closure(root, compiler_root)
    rows, asset_inputs, manifest_hashes = validate_assets(root)
    extra_inputs = {
        checked_repo_file(root, "bend2/tools/bend.mjs"),
        checked_repo_file(root, "bend2/tools/build.ts"),
        checked_repo_file(root, "bend2/TOOLCHAIN.json"),
        checked_repo_file(root, Path(__file__).resolve()),
    }
    all_inputs = set(closure) | asset_inputs | extra_inputs
    hashes = input_hashes(root, all_inputs)
    native_toolchain = None
    dependency_probe = None
    if sys.platform == "linux":
        native_toolchain = choose_clang(args.cc, cuda=args.cuda)
        if args.cuda:
            native_toolchain["cuda"] = cuda_toolkit()
        dependency_probe = probe_native_dependencies(
            native_toolchain,
            cuda=native_toolchain.get("cuda"),
        )
    output = output_directory(root, args.output, cuda=args.cuda)
    try:
        source_revision = git(root, "rev-parse", "HEAD")
    except BuildError:
        source_revision = "unavailable"
    return {
        "schema": "rift-bend-native-v2-preflight/1",
        "mode": "cuda" if args.cuda else "cpu",
        "externalGpuGrantId": args.gpu_grant_id if args.cuda else None,
        "host": {
            "platform": sys.platform,
            "architecture": os.uname().machine if hasattr(os, "uname") else os.name,
        },
        "buildPermitted": sys.platform == "linux" and not args.preflight,
        "sourceRevision": source_revision,
        "entrypoint": "bend2/NativeV2.bend",
        "compiler": compiler,
        "nativeToolchain": native_toolchain,
        "nativeDependencyProbe": dependency_probe,
        "compilerSourceClosure": {
            "files": [repo_relative(root, path) for path in closure],
            "sha256": {repo_relative(root, path): file_sha256(path) for path in closure},
        },
        "sourceManifests": manifest_hashes,
        "runtimeAssets": [
            {"path": item["packagePath"], "bytes": item["bytes"], "sha256": item["sha256"]}
            for item in rows
            if item["packagePath"].startswith("assets/")
        ],
        "verifiedInputSha256": hashes,
        "output": str(output),
        "emissionMemoryFloorBytes": EMIT_MEMORY_FLOOR,
        "emissionMemoryAvailableBytes": available,
    }


def mkdir_new(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=False)


def write_new(path: Path, data: bytes, *, mode: int | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("xb") as handle:
        handle.write(data)
    if mode is not None:
        path.chmod(mode)


def copy_verified(root: Path, output: Path, item: dict[str, Any]) -> dict[str, Any]:
    source = checked_repo_file(root, item["sourcePath"])
    destination = output / item["packagePath"]
    data = source.read_bytes()
    digest = sha256(data)
    if len(data) != item["bytes"] or digest != item["sha256"]:
        raise BuildError(f"package input changed after preflight: {item['sourcePath']}")
    write_new(destination, data, mode=0o644)
    staged = destination.read_bytes()
    if len(staged) != item["bytes"] or sha256(staged) != item["sha256"]:
        raise BuildError(f"staged package bytes differ from verified input: {item['packagePath']}")
    return {
        "bytes": len(staged),
        "sha256": sha256(staged),
        "sourcePath": item["sourcePath"],
        "manifest": item["manifest"],
        "kind": item["kind"],
    }


def write_launcher(path: Path, *, cuda: bool) -> None:
    cuda_capable = "1" if cuda else "0"
    script = """#!/bin/sh
set -eu
package_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
data_dir=$(printenv RIFT_CHESS_DATA_DIR 2>/dev/null || true)
if [ -z "$data_dir" ]; then data_dir="$package_dir/data"; fi
case "$data_dir" in
  /*) ;;
  *) data_dir="$package_dir/$data_dir" ;;
esac
mkdir -p "$data_dir"
if [ ! -d "$data_dir" ]; then
  printf '%s\\n' "NativeV2 data path is not a directory: $data_dir" >&2
  exit 2
fi
export RIFT_CHESS_DATA_DIR="$data_dir"
export BEND_NO_TELEMETRY=1
if [ "@CUDA_CAPABLE@" = 1 ]; then
  cuda_home=${RIFT_CHESS_CUDA_HOME:-${CUDA_HOME:-/usr/local/cuda}}
  if [ ! -e "$cuda_home/lib64/libnvrtc.so" ] && [ ! -e "$cuda_home/lib/libnvrtc.so" ]; then
    printf '%s\\n' "CUDA package requires libnvrtc.so in RIFT_CHESS_CUDA_HOME or CUDA_HOME." >&2
    exit 2
  fi
  export LD_LIBRARY_PATH="$cuda_home/lib64:$cuda_home/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi
gpu=$(printenv RIFT_CHESS_GPU 2>/dev/null || true)
if [ -z "$gpu" ]; then gpu=off; fi
case "$gpu" in
  off) ;;
  on)
    if [ "@CUDA_CAPABLE@" != 1 ]; then
      printf '%s\\n' "This package has no CUDA sidecar; use RIFT_CHESS_GPU=off." >&2
      exit 2
    fi
    ;;
  *)
    printf '%s\\n' "RIFT_CHESS_GPU must be off or on." >&2
    exit 2
    ;;
esac
cd "$package_dir"
exec "$package_dir/bin/rift-chess-native-v2" --gpu "$gpu" "$@"
""".replace("@CUDA_CAPABLE@", cuda_capable)
    write_new(path, script.encode("utf-8"), mode=0o755)


def run_step(
    name: str,
    command: list[str],
    *,
    cwd: Path,
    env: dict[str, str],
    log_path: Path,
    output: Path,
    timeout_seconds: int,
) -> dict[str, Any]:
    print(f"[native-v2] {name}", flush=True)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with log_path.open("xb") as log:
            result = subprocess.run(
                command,
                cwd=cwd,
                env=env,
                stdout=log,
                stderr=subprocess.STDOUT,
                timeout=timeout_seconds,
                check=False,
            )
    except subprocess.TimeoutExpired as exc:
        raise BuildError(f"{name} exceeded {timeout_seconds}s; see {log_path}") from exc
    except OSError as exc:
        raise BuildError(f"{name} could not start: {exc}") from exc
    if result.returncode != 0:
        raise BuildError(f"{name} failed with exit code {result.returncode}; see {log_path}")
    return {"command": command, "exitCode": result.returncode, "log": log_path.relative_to(output).as_posix()}


def verify_bound_inputs(root: Path, expected: dict[str, str], compiler: dict[str, str]) -> None:
    for relative, digest in expected.items():
        path = checked_repo_file(root, relative)
        if file_sha256(path) != digest:
            raise BuildError(f"bound input changed during package build: {relative}")
    compiler_root = root / ".artifacts" / "toolchains" / "bend"
    if git(compiler_root, "rev-parse", "HEAD") != compiler["bendCommit"]:
        raise BuildError("pinned compiler commit changed during package build.")
    if git(compiler_root, "rev-parse", "HEAD^{tree}") != compiler["bendTree"]:
        raise BuildError("pinned compiler tree changed during package build.")
    if git(compiler_root, "status", "--porcelain=v1", "--untracked-files=all"):
        raise BuildError("pinned compiler became dirty during package build.")


def elf_identity(path: Path) -> dict[str, int]:
    header = path.read_bytes()[:20]
    if len(header) < 20 or header[:4] != b"\x7fELF":
        raise BuildError("linked output is not an ELF binary.")
    if header[4] != 2 or header[5] != 1:
        raise BuildError("NativeV2 package requires a 64-bit little-endian ELF.")
    machine = int.from_bytes(header[18:20], "little")
    if machine != 62:
        raise BuildError(f"NativeV2 package currently requires x86-64 ELF (e_machine={machine}).")
    return {"class": header[4], "dataEncoding": header[5], "machine": machine}


def write_failure(output: Path, phase: str, error: str, plan: dict[str, Any]) -> None:
    try:
        write_new(
            output / "failure.json",
            json_bytes(
                {
                    "schema": "rift-bend-native-v2-failure/1",
                    "phase": phase,
                    "error": error,
                    "output": str(output),
                    "sourceRevision": plan.get("sourceRevision"),
                    "compiler": plan.get("compiler"),
                    "verifiedInputSha256": plan.get("verifiedInputSha256"),
                }
            ),
        )
    except OSError:
        pass


def build(root: Path, args: argparse.Namespace, plan: dict[str, Any]) -> dict[str, Any]:
    output = Path(plan["output"])
    rows, _, manifest_hashes = validate_assets(root)
    mkdir_new(output)
    phase = "package"
    try:
        staged_files: dict[str, dict[str, Any]] = {}
        for item in rows:
            staged_files[item["packagePath"]] = copy_verified(root, output, item)
        runtime_manifest = {
            "schema": "rift-bend-native-v2-runtime-assets/1",
            "sourceManifests": manifest_hashes,
            "files": {
                path: {key: value for key, value in row.items() if key != "sourcePath"}
                for path, row in sorted(staged_files.items())
                if path.startswith("assets/")
            },
        }
        write_new(output / "runtime-assets.json", json_bytes(runtime_manifest))
        write_launcher(output / "run-native-v2.sh", cuda=args.cuda)
        verify_bound_inputs(root, plan["verifiedInputSha256"], plan["compiler"])

        node = shutil.which("node")
        if not node:
            raise BuildError("Node.js disappeared after preflight.")
        env = os.environ.copy()
        env["BEND_NO_TELEMETRY"] = "1"
        env["BEND_TIMEOUT_MS"] = str(EMIT_TIMEOUT_MS)
        phase = "source-check"
        source_check = run_step(
            "source check (not C emission)",
            [node, str(root / "bend2" / "tools" / "bend.mjs"), "bend2/NativeV2.bend", "--check-only"],
            cwd=root,
            env=env,
            log_path=output / "logs" / "source-check.log",
            output=output,
            timeout_seconds=EMIT_TIMEOUT_MS // 1000 + 60,
        )
        if "All terms check" not in (output / source_check["log"]).read_text(encoding="utf-8", errors="replace"):
            raise BuildError("pinned NativeV2 source check exited successfully without its expected check receipt.")
        verify_bound_inputs(root, plan["verifiedInputSha256"], plan["compiler"])

        phase = "c-emission"
        c_source = output / "NativeV2.c"
        emission = run_step(
            "pinned NativeV2 C emission",
            [
                node,
                str(root / "bend2" / "tools" / "bend.mjs"),
                "bend2/NativeV2.bend",
                "-o",
                str(c_source),
            ],
            cwd=root,
            env=env,
            log_path=output / "logs" / "emit-c.log",
            output=output,
            timeout_seconds=EMIT_TIMEOUT_MS // 1000 + 60,
        )
        verify_bound_inputs(root, plan["verifiedInputSha256"], plan["compiler"])
        c_bytes = c_source.read_bytes()
        c_digest = sha256(c_bytes)
        if not c_bytes:
            raise BuildError("pinned NativeV2 emission produced an empty C file.")
        if b"#include <X11/" not in c_bytes or b"#include <alsa/" not in c_bytes:
            raise BuildError("emitted NativeV2 C does not include both pinned Linux X11 and ALSA effects.")

        clang = plan["nativeToolchain"]
        if not isinstance(clang, dict):
            raise BuildError("Linux Clang preflight result is missing.")
        cuda = clang.get("cuda")
        binary = output / "bin" / "rift-chess-native-v2"
        binary.parent.mkdir(parents=True, exist_ok=True)
        command = [str(clang["path"])]
        if cuda is not None:
            command.extend(
                [
                    "-DBEND_CUDA=1",
                    f"-I{cuda['include']}",
                    f"-L{cuda['lib64']}",
                    f"-L{cuda['lib']}",
                ]
            )
        command.extend(
            [
                "-std=c11",
                "-O3",
                str(c_source),
                "-lpthread",
                "-lm",
                "-lX11",
                "-lasound",
                "-o",
                str(binary),
            ]
        )
        if cuda is not None:
            command.extend(["-lcuda", "-lnvrtc"])
        phase = "link"
        link = run_step(
            "CPU-first ELF link" if not args.cuda else "explicit CUDA-capable ELF link",
            command,
            cwd=root,
            env=env,
            log_path=output / "logs" / "link.log",
            output=output,
            timeout_seconds=600,
        )
        elf = elf_identity(binary)

        sidecar = None
        sidecar_step = None
        if args.cuda:
            phase = "cuda-sidecar"
            cuda_env = env.copy()
            cuda_env["LD_LIBRARY_PATH"] = ":".join(
                [str(cuda["lib64"]), str(cuda["lib"]),
                 *([env["LD_LIBRARY_PATH"]] if env.get("LD_LIBRARY_PATH") else [])]
            )
            sidecar_step = run_step(
                "CUDA sidecar device build (no game frames)",
                [str(binary), "--gpu-build"],
                cwd=root,
                env=cuda_env,
                log_path=output / "logs" / "gpu-build.log",
                output=output,
                timeout_seconds=300,
            )
            sidecar_path = Path(str(binary) + ".gpu")
            if not sidecar_path.is_file() or sidecar_path.stat().st_size == 0:
                raise BuildError("pinned --gpu-build did not create a nonempty .gpu sidecar.")
            sidecar = {
                "path": sidecar_path.relative_to(output).as_posix(),
                "bytes": sidecar_path.stat().st_size,
                "sha256": file_sha256(sidecar_path),
            }

        artifacts = {
            "NativeV2.c": {"bytes": c_source.stat().st_size, "sha256": file_sha256(c_source)},
            "bin/rift-chess-native-v2": {
                "bytes": binary.stat().st_size,
                "sha256": file_sha256(binary),
                "elf": elf,
            },
            "runtime-assets.json": {
                "bytes": (output / "runtime-assets.json").stat().st_size,
                "sha256": file_sha256(output / "runtime-assets.json"),
            },
            "run-native-v2.sh": {
                "bytes": (output / "run-native-v2.sh").stat().st_size,
                "sha256": file_sha256(output / "run-native-v2.sh"),
            },
        }
        for package_path, row in staged_files.items():
            artifacts[package_path] = {"bytes": row["bytes"], "sha256": row["sha256"]}
        for step in (source_check, emission, link, sidecar_step):
            if step is not None:
                log = output / step["log"]
                artifacts[step["log"]] = {"bytes": log.stat().st_size, "sha256": file_sha256(log)}
        if sidecar is not None:
            artifacts[sidecar["path"]] = {"bytes": sidecar["bytes"], "sha256": sidecar["sha256"]}
        receipt = {
            "schema": "rift-bend-native-v2-package/1",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "mode": "cuda-capable-explicit" if args.cuda else "cpu",
            "externalGpuGrantId": plan["externalGpuGrantId"],
            "sourceRevision": plan["sourceRevision"],
            "entrypoint": {
                "path": "bend2/NativeV2.bend",
                "sha256": plan["verifiedInputSha256"]["bend2/NativeV2.bend"],
            },
            "compiler": plan["compiler"],
            "compilerSourceClosure": plan["compilerSourceClosure"],
            "historicalCleanPinEmission": {
                "bytes": EXPECTED_NATIVE_V2_C_BYTES,
                "sha256": EXPECTED_NATIVE_V2_C_SHA256,
                "matches": len(c_bytes) == EXPECTED_NATIVE_V2_C_BYTES
                and c_digest == EXPECTED_NATIVE_V2_C_SHA256,
            },
            "verifiedInputSha256": plan["verifiedInputSha256"],
            "sourceManifests": manifest_hashes,
            "packageFiles": staged_files,
            "commands": {
                "sourceCheck": source_check,
                "cEmission": emission,
                "link": link,
                "cudaSidecar": sidecar_step,
            },
            "clang": clang,
            "linkCommand": command,
            "cudaToolkit": cuda,
            "cudaSidecar": sidecar,
            "runtimeDefaults": {"gpu": "off", "dataDirectory": "package-local ./data"},
            "artifacts": dict(sorted(artifacts.items())),
            "claimLimits": [
                "No GUI was launched by this build workflow.",
                "A linked ELF and optional CUDA sidecar are build outputs, not rendering, audio, or game-play acceptance.",
                "CUDA sidecar creation probes a real GPU, compiles for its architecture and loads the module; the supplied grant ID is not independently verified by this script.",
                "CUDA sidecar creation does not establish game frame rendering or input on the GPU.",
            ],
        }
        write_new(output / "receipt.json", json_bytes(receipt))
        return receipt
    except Exception as exc:
        write_failure(output, phase, str(exc), plan)
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a fresh, source-bound NativeV2 Linux package. CPU is the default."
    )
    parser.add_argument("--preflight", action="store_true", help="verify the pin, source closure and assets without a build")
    parser.add_argument("--cuda", action="store_true", help="explicitly build a CUDA-capable ELF and .gpu sidecar")
    parser.add_argument("--gpu-grant-id", help="active external GPU lease identifier, required for --cuda; this script cannot verify it")
    parser.add_argument("--cc", help="Clang executable (defaults to a suitable Clang found on PATH)")
    parser.add_argument("--output", help="new directory below .artifacts/bend2/native-v2")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parents[2]
    try:
        plan = preflight(root, args)
        if args.preflight:
            print(json.dumps(plan, indent=2, sort_keys=True))
            return 0
        receipt = build(root, args, plan)
        print(
            json.dumps(
                {
                    "ok": True,
                    "output": plan["output"],
                    "mode": receipt["mode"],
                    "cSha256": receipt["artifacts"]["NativeV2.c"]["sha256"],
                    "elfSha256": receipt["artifacts"]["bin/rift-chess-native-v2"]["sha256"],
                    "runtimeAssetCount": len(
                        [name for name in receipt["packageFiles"] if name.startswith("assets/")]
                    ),
                    "cudaSidecarSha256": receipt["cudaSidecar"]["sha256"] if receipt["cudaSidecar"] else None,
                },
                indent=2,
                sort_keys=True,
            )
        )
        return 0
    except BuildError as exc:
        print(f"native-v2 package: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"native-v2 package: unexpected {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
