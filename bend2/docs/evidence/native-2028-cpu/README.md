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
