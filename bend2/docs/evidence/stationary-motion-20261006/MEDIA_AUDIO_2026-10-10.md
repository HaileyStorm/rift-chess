# Media primer audio transport, 2026-10-10

Disposition: adopted in the local browser host source. The accepted compiler,
formal obligations and published TypeScript application are unchanged.

The first genuine input previously constructed an AudioContext synchronously,
with observed constructor stalls of 355–554 ms. The host now starts a short
silent media primer and returns to input dispatch. After native playback begins,
it creates the existing WebAudio context and retires the primer. Each generated
Sound still gets its own mono Float32 buffer source, preserving overlapping cues.
This is a transport change; Bend retains cue selection and PCM synthesis.

Native media playback and WebAudio permission remain distinct. The transport
checks the actual context state and preserves resume on a later genuine gesture.
The [Chrome autoplay guidance](https://developer.chrome.com/blog/autoplay/)
motivates handling native playback promises; it does not guarantee device priming
or transferable permission across browsers.

One real e2-e4 journey per source revision ran in separate Chrome processes:

| Source revision | Input to dispatch | Input to canvas | Constructor duration |
| --- | ---: | ---: | ---: |
| Initial primer | 18.5 ms | 43.7 ms | 53.5 ms |
| Adopted lifecycle revision | 27.6 ms | 54.4 ms | 66.9 ms |

Both rendered the first selection before the constructor started and scheduled
the exact generated 3,192 mono Float32 samples at 24,000 Hz on the default sink.
These are finite headless Chrome observations with uncontrolled host load/cache;
they do not establish stable latency percentiles, physical audibility, cold OS
startup, constrained-device, cross-browser or native-platform acceptance.

The adopted revision assigns readiness before playback, uses a guarded finalizer,
and has a one-second fallback under normal foreground scheduling. Rejection and
synchronous playback failure defer to that fallback. Page exit cancels preparation;
constructor failure permits a later retry. Cleanup cannot mask readiness settlement.
Resume is not awaited indefinitely. Those failure paths were reviewed in source,
not separately executed. A first cue may wait for initialization; the fallback
does not bound constructor duration or background timer throttling.

The executed revision's ports bytes exactly match production SHA256
`9c13b291476f33a1c2f832fbe73538ea1018fe0d69a1db66ae7918f49dae7244`.
The canonical tag transformer changes only that source digest; its rules match
the executed private transformer after helper-import rebasing. The host-only
build reused retained compiled workers/assets without a compiler or proof replay.
No unit/integration tests or scenario matrix were added.

Original private receipts remain in the owned stationary-motion artifact tree:

| Receipt | SHA256 |
| --- | --- |
| current99-audio-primer-journey-r1/result.json | 671af72b3f68fb6bb0f9035c657cbd4412e717cec18171ecbdecd463cf3f0e3f |
| current99-audio-primer-journey-r2/result.json | 57e18178aff4929f9feed0e4ddc4a597ef34bcb269aed0d4a0af76173f4f558d |
| current99-audio-primer-supervisor-r1/terminal.json | 2642cec98a4447ff1fb1d7f3f84a5f177f8a1fd92021bf566dcb2002da993753 |
| current99-audio-primer-supervisor-r2/terminal.json | ea46f20a590daa66aead76a34ab799db1e1c9ef725ff243d4dc1e4fa5550185a |

Both original Bun/Node processes exited zero; retained handles closed, streams
reached EOF, Chrome closed normally, and Jobs settled to their owner and closed.
No forced cleanup or unknown closure remains. The full Rift Goal stays active;
proof/kernel, Linux/native, device and compiler adoption obligations remain open.
