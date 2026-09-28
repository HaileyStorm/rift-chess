# Exact-source Linux 2.0.28+006 CPU candidate

The [Linux host report](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5866641780)
answers the one-attempt [request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865910914)
and [append-only replay-SHA correction](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865920136).
It binds clean public Rift Chess source
`c30d312727a56f6b66b501dddf8038d317dfd946` (tree
`6b660ac8be75b05d04b1aa352057217486c25eab`) to upstream Bend 2.0.28
`bc178404f4778704fa5584a73fcdf72bcdf9f32c` plus the seven reviewed
patches. The pinned 2.0.27 compiler, `TOOLCHAIN.json`, frozen Laws and tracked
source were not changed. The corrected Windows final replay receipt SHA is
`a71ce32941c74abef1762bebb30d8526f115fc905bbb084722b3d6a4b2d7af01`;
the Linux report says its tracked reference was bound, but the ignored
Windows receipt bytes were not present on Linux or recomputed there.

The host reported an independently bound 151-file source/compiler closure,
seven runtime assets and a passing X11/ALSA link preflight. Fresh admission
samples were 109,024,604,160 bytes (101.537 GiB) initially and
108,180,221,952 bytes (100.751 GiB) immediately before emission, both
above the unchanged 94,489,280,512-byte (88 GiB) floor. Host MemAvailable
was limiting; the visible nonroot cgroup-v2 ancestors on the observed
process path were unlimited. Exactly one source check, one C emission and one
CPU ELF link passed. Host-local package receipt SHA-256:
`ed03b68168c2cce0e1c222a799c9df1d335cea71046ddddcbca41ce0f085b899`;
C SHA-256 `8e5ceff370d88b7c8aa6f31bc2abef2e7776a660ea2cb2f0c61f0573a17ff1ca`;
ELF SHA-256 `7eaca97abc0563fec478a18b1da7780be1897bd2223e6ec6a1ea3877fc8b9ab1`.

The report says the exact staged ELF/assets passed the original 250 ms real
X.Org `:1` selection, second-click deselection, g1-h3, Escape-keeps-window,
and WM close/exit-0 probes, plus held/settled orbit. Relaunch with the same
data directory showed Black to move and the knight on h3 with nonempty
primary and `.b` save/preferences journal slots. The PipeWire HDMI sink
monitor captured 48 kHz stereo s16: idle had zero nonzero samples; the move
had 12,762 nonzero samples, peak 6,926 and zero clips. This proves routed
PCM capture on that host, not physical audibility. Runtime-result SHA-256 is
`be523bf88cdab22dc19669c0f9a5153abd29de1aeb1f7060d099aec94e244eca`;
visual-review SHA-256 is
`3f2194105664b0662d632d929b453710cd92391049e9f5b31d6943a2bf163125`.

Full host-local evidence lives at
`/home/hailey/AI/rift-chess/.artifacts/native-v2-2028-cpu-5865910914/evidence.json`
(SHA-256 `bbfad5238d0a588386423a2c933aadd5b7bf25f1b3447d230d7ed56233512216`).
The narrow claim was released, ownership-release SHA-256
`f560c090ca2e3b82624db8512501494350b68aef139ceeddc85a617bc22d06b6`.
No binary, capture or private evidence was transferred to Windows, so this
record accepts the Linux task's reported host-local CPU/package/runtime
checkpoint with its provenance limits; it is not independent local replay.

No GPU/CUDA build, device lease, native Windows run, human audio or visual
acceptance, full release, throughput improvement or compiler-pin amendment
follows. Prior 2.0.27 GPU-on original-cadence deselection failure remains a
different source/binary result. A new-source GPU candidate requires its own
fresh coordinator lease and receipt-bound device, pixel and latency gates;
moving the 2.0.28 pin additionally requires independent final review and the
Local Bend Guide's frozen-dependency amendment.

## Published piece-proportion source retest

The [later one-attempt Linux CPU reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5868456549)
binds the currently published Bend visual source
`cafc934d41b4e2511043634267904c002a824197` (tree
`fbb83789a7f25f77b9e363882979f58531f03d66`). The host reports that
`BoardScene.bend` SHA-256
`7299de41eeadaee36967676935fbd8bfc2d7575a8681acf064f4b0d6525e3bc0`
was the sole changed bound input among 173 versus c30; `NativeV2.bend`
SHA-256 `29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d`
and seven runtime assets were unchanged. It reused the reviewed isolated
2.0.28+006 candidate overlay; the canonical 2.0.27 pin stayed clean.

Process-path MemAvailable was 106,796,548,096 bytes initially and
105,593,118,720 bytes just before emission, both exceeding the
94,489,280,512-byte floor. Visible cgroup ancestors were unlimited, though
unknown hidden limits cannot be excluded. One source check passed with 29
unsafe/foreign warnings, then one C emission and one CPU ELF link passed
with telemetry disabled. Host-local package receipt SHA-256 is
`8295c9f662f739319ec51fd222686bfa26e81a4e1b45c889673e6e1cb71f60db`;
C is `6e1387a760a427178a4eb1973d21052597d12a7b2c8fce9237f1576e8f3e099a`;
ELF is `c1343857d569cd02afb3746cecd9e421abb5ea8b06c15d74bb254d3fd41b31d0`.
No CUDA/device lease or GPU use occurred.

The exact package passed the unchanged original 250 ms real X.Org select,
second-click deselect, g1-h3, Escape and close/exit-0 probes, held/settled
orbit, and same-data-directory save/restart. Captures showed Black to move
with the knight on h3 after move and restart, with byte-identical turn-status
crop. Routed HDMI sink-monitor PCM captured idle silence and 12,762 nonzero
move samples, peak 6,926, zero clips. Runtime-result SHA-256 is
`1732efaeb2ca224e8bc0a24b52da57adf77d15e4c2c066eb932e794411bc4cd6`,
host-local evidence JSON
`0d2b89e2d1f94f380d8e787af13b4299b0ecc06e9ec8bd8d84586360e161a2dd`.
The exact output claim was released (receipt
`305f084c34a3014b703e0f2018ef652ca1b45c62971e025af743e296ba555bb4`).
No binary or capture was transferred for Windows cross-hashing.

This closes the **reported Linux CPU/package/GUI/routed-PCM/restart gate for
the published piece-proportion source**, not physical speaker audibility,
Windows-native execution, human visual acceptance, measured throughput,
current-source GPU parity or a compiler pin amendment. The earlier c30
GPU-on 250 ms failure and the later pre-device Xauthority stop retain their
separate verdicts. A CPU-only harness-auth preflight is queued after this
result; no fresh GPU diagnostic follows automatically.
