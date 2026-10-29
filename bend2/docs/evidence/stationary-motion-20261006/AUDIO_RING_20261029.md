# Native audio ring review — 2026-10-29

Offline review of the original current87 recording finds a source-consistent
move cue split into three blocks. It establishes neither the cause of the gaps
nor physical audibility. The original aggregate RMS comparison remains failed.
No new recording or application execution was used for this review.

## Original evidence and method

The retained analysis script reads the original archive's 48 kHz stereo S16_LE
PCM, averages the channels and fits an analytic source waveform at volume 28.
It uses double precision independently of the application's F32 implementation.
Each block has an independently fitted start and gain. Exploratory windows use
an 8-sample coarse search followed by 1-sample refinement, without filtering,
DC removal or resampling. This is not an exact F32 comparison or a preregistered
statistical test.

| Source offset | Recorded start sample | Length | Correlation | Fitted gain |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 17408 | 2048 | 0.969915 | 1.011380 |
| 2048 | 20992 | 2048 | 0.997823 | 1.009509 |
| 4096 | 25088 | 2048 | 0.998777 | 1.003550 |

The intervening gaps are 1536 samples (32 ms) and 2048 samples (42.667 ms).
The remaining 240 source samples, a 5 ms tail, were not searched. The idle control
searched only the first 2048 source samples on a 1 ms grid: its best correlation
was 0.620909 with gain 0.003689. The original whole-recording RMS values were
idle 0.02669294 and move 0.02272246; move-above-idle is still false. Waveform fits
supply different evidence and do not rewrite that failed comparison. The shared
playback-monitor route prevents exclusive attribution to this application.

## Source interpretation and unvalidated change

The recorded NativeV2 source duplicates each mono sample into stereo and pumps
at most 2048 frames per application turn: 42.667 ms at 48 kHz. Pure rendering and
Window.frame run before the next turn can pump again. The existing 4096-frame
runtime ring pads shortages with silence. These contracts make producer
underfeeding plausible; the observed block spacing does not prove that cause.

Audio.write returns queued frames after the write, not an accepted-sample count.
The application queries occupancy before selecting a block. With its single
serialized producer and a consumer that only drains, the selected block fits;
discarding the later occupancy value does not establish a lost-write bug.
The ALSA consumer also recovers negative writes silently and does not retry
positive short writes. Empty original app/capture stderr does not exclude an
xrun; no consumer xrun counters were recorded.

Root prepared an application-only change from
`min(2048,4096-min(4096,queued))` to `4096-min(4096,queued)`. It fills the existing
queried ring room at the existing post-assets pump, up to 85.333 ms, preserving
handle/effect/device ordering. It adds no ring storage, asynchronous I/O, runtime
patch or scheduling change. At this checkpoint it is **unvalidated**: longer
render stalls may still exhaust the ring, and greater occupancy can add latency.
No fix, causal diagnosis, speaker-audibility or native performance acceptance is
claimed. The historical compiler/runtime and failed RMS result remain preserved.

## Immutable identities

| Evidence | SHA256 |
| --- | --- |
| Original PCM archive | `b3181f7c6b47b487e5057ac227c0a5a729651a378733865d95d5f580fe08f8e3` |
| Original idle PCM, 384000 bytes | `4b095f5a6ca924c26f808a92827563f50178b7c127bcc6be49fd526836d6a818` |
| Original move PCM, 576000 bytes | `1d2b33f51875c9e2476263e4264ccb3608e7abdfed697841cf6646539c6c5ae4` |
| Retained analyze.py | `133201ea4ac6594e94f806d39145729a95d989a447a42b4428936a85b9ccd78a` |
| Offline result.json | `6f2a0f95bfec25732e52a9bccf9e02849641d07f681930a6e29dbe193a08bc2b` |
| Prepared, unvalidated ring-room proposal | `8447be64f7f196bd7ecb14a9bb07a795f0bab004ad7078f4703b11e7a31882db` |
| Recorded NativeV2 source | `29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d` |
| SoundCues source | `bd3db54c2366389e61fdd1bd766f32d550c2651f012b46d33a54bacc8eaba0cf` |
| Synthesis source | `ca13045aad933bf2de2f5026cf8ad70de8e394cb50b270491d27d2aa9906c8af` |

The script's original-source hash checks must remain intact. Reproduction needs
those exact historical bytes; the proposed current NativeV2 source is different.
Private raw evidence remains retained outside this public document.
