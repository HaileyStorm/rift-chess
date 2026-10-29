# Audio-ring r4 native playback — 2026-10-29

One Linux CPU GUI journey using the [r4 build](NATIVE_AUDIO_R4_BUILD_20261029.md)
completed normally. Its original routed recording contains the complete
6,384-sample, **133 ms** move cue with no fitted gaps. Independent Windows
calculations reproduce that narrow result. Physical speaker audibility, a causal
fix and general audio continuity remain unverified.

The executable is SHA256
`2f1b50bebad2294f32905892b3d83a9b0291ac24c5476612f51caa2d155f4a5f`,
built from source `83ac95f58d59aa2944beddf216c504584cc7b29f`, tree
`bf367d61af3f74c77691ee533867e4b749c148aa`. One fresh-data launch used `--gpu off`.
The actual GUI selected e2 and moved to e4; the save records one MoveCommand3980
at expected revision0. Initial and post-move images show the expected board and
turn change. One normal window-close request preceded application exit0. Node
and the original outer observer exited0; all24 original child records settled.
No native replay, recapture, signal, menu/restart or GPU journey occurred.

The original package, both87-file project observations, compiler/runtime,
assets and recorded repository inputs match before and after. Current
full-ancestry resource admission observed16 GiB headroom plus8 GiB outside
reserve. This execution inherited a shared Chromium cgroup: it establishes no
new enforced memory cap, no-swap policy or app-only cgroup peak. The queued
CUDA request and its retained scopes were unchanged. Separate final metadata
confirms release of all four fresh CPU claims.

## Original PCM and independent review

The unchanged S16LE stereo recordings contain96,000 idle frames (2 s) and144,000
move frames (3 s), at48 kHz. Capture had produced actual bytes before the move.
RMS values are descriptive; no above-idle RMS acceptance predicate was used.
The shared playback-monitor route prevents exclusive application attribution.

The offline analysis constructs the source's volume28 analytic waveform using
double precision, averages the original stereo channels as `(L+R)/65536`, and
fits uncentered correlation/gain. It applies no filtering, DC removal,
resampling or recording changes. Coarse lag search followed by single-sample
refinement is exploratory, not preregistered statistical evidence or bit-exact
F32 synthesis proof.

| Source offset | Recorded start | Samples | Correlation |
| ---: | ---: | ---: | ---: |
| 0 | 21760 | 2048 | 0.9999999952 |
| 2048 | 23808 | 2048 | 0.9999999951 |
| 4096 | 25856 | 2048 | 0.9999999862 |
| 6144 | 27904 | 240 | 0.9999992521 |

All three fitted gaps are zero samples. Independently computing direct sums for
the complete cue at sample21760 gives correlation0.99999999358,
gain0.99999738036 and residual RMS0.00000888552. The final240 samples are
included. Both move channels agree, and every nonzero move frame lies within
the6384-frame cue span. This is stronger recording-continuity evidence than
independently fitting three incomplete blocks. It supplies no latency/xrun
bounds, universal guarantee or physical-audibility result. The
[historical failed RMS and interrupted-block findings](AUDIO_RING_20261029.md)
remain unchanged.

Windows independently verified all134 indexed sizes/hashes in the135-member
archive, including safe unique regular paths. A collector initially rejected
expected absent-window `xdotool search` exits1; that error remains retained.
Corrected evidence collection completed without replaying the application.
The executed helper's documented removal of a duplicate startup-image equality
gate is bound in the original Root review; it is not an unexplained source change.

| Original evidence | Bytes | SHA256 |
| --- | ---: | --- |
| Returned archive | 1048672 | `ebda99dfe888635cdb2a335bcf10f642029d12ab85d78f05ef59db150d378cb8` |
| Original handoff | 7136 | `c95e26d2f540be99a76c52c297f15835f8ecc5560754435e487ea1ae45e92e51` |
| Episode result | 197463 | `6de07a385ca26cd28bfeaf343e6c739ea7a23fb6b6d0f5145ed80e4cc6664b66` |
| Idle PCM | 384000 | `24bb5677ede2c169375e9ba2490795a4c3876543b4513de300e712f578654e4f` |
| Move PCM | 576000 | `abe6ec69984d3f2cdafb8b96236f55c706af85f3523dc45593f648f2573bca06` |
| Offline waveform review | 3736 | `49c4162755a00fcdc0ab4d67eba0462656013eb2ac5d3bd0206918e55b75824d` |
| Final claim metadata | 1656 | `a6af04a76e487f60ece26ed2c77cf3ec1c1859a340bbf915508221ec5f8b1c50` |

Private raw recordings and original native records remain local. This separate
episode does not amend the earlier build-only receipt, establish a formal proof,
meet the original250 ms GPU criterion or adopt the candidate compiler. Accepted
2.0.27, immutable laws, balanced parallelism and historical uncertainty remain.
