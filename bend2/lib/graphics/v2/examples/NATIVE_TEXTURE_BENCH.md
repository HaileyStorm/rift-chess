# Native Texture controls (DRAFT)

These pure Bend entrypoints force 64 complete `4^7` Texture trees with a
sequential checksum over every leaf. Changing seeds keep every round live;
all variants must print the same U32 result. They are reproducible workload
fixtures, not performance claims or game rendering paths.

- `NativeTextureBenchSerial.bend` uses `Texture.serial_tree` with sequential
  child bindings. On the measured WSL2 cheap Grain workload it was fastest.
- `NativeTextureBenchCpu.bend` calls `Texture.pool_top(3n,7n,...)`: 64
  parallel branches with 256 leaves each. **Rejected as a CPU default**;
  it was slower than serial at threads1,4,8 in the measured environment.
- `NativeTextureBench.bend` uses the original 4^7 bang shape. This remains
  only an unmeasured GPU candidate; native CPU timing was also slower.
- `NativeTextureBenchControl.bend` uses ordinary `Texture.tree`, whose
  four-way let can schedule work. It is not a strict serial baseline.

Use the pinned wrapper with telemetry disabled for source checks/C emission,
then compile C with an actual supported Linux toolchain and time the same
binary at threads1/4/8 with `--gpu off`. Native startup/host load matter.
The exact 2026-09-24 source, C and ELF hashes, 204 identical-output ext4
invocations, all raw samples, CPU/RSS limits, and negative conclusion are
preserved in ignored `.artifacts/bend2/graphics-v2/native-texture-cpu-20260924/`.
No GPU device was built or run. Never infer GPU benefit from a bang or C
source emission alone.
