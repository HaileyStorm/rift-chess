# Bend audio boundary

`Synthesis.bend` is a pure, Base-only mono synthesizer. `Tone` values use
frequency in hertz, duration and delay in milliseconds, wave `0` for sine,
`1` for triangle, `2` for a saw ramp, and `3` for a square wave. `samples`
returns a bounded `List<&2,F32>` at the caller's rate; it owns no device and
has no browser or UI imports.

`samples` admits rates from 8,000 through 96,000 Hz; other values use 48,000
Hz. It renders at most 1,000 ms, so at most 96,000 mono samples. Tone delays
and durations saturate before U32 multiplication/addition; a note delayed
beyond that horizon produces silence. These limits make the output bound real
even for malformed input. Callers who need long music should stream separate
bounded buffers, rather than accumulating an unbounded Bend list.

Each active tone now fades in over roughly its first sixteenth and fades out
over roughly its last quarter (in sample counts). Both end samples are zero;
inactive/delayed notes skip waveform work, and the selected wave alone is
computed. The public `Tone` shape and four waveform IDs are unchanged. The
focused `bend2/tests/audio-envelope.ts` gate checks all waveforms, silence at
boundaries and before a delay, finite amplitudes and clipping. Local warm-JS
4200-sample comparisons varied: one 11-pair run measured 5.72 ms versus
6.53 ms before the change, while another under shared load measured 14.06 ms
versus 13.69 ms. This does not establish a speedup, subjective sound quality,
or native/audio-device timing.

The native adapter is responsible for device ownership and transport. Base's
native audio effect consumes interleaved stereo float samples and has a finite
ring. `Native.bend` duplicates each mono sample into left/right channels,
writes at most 2,048 stereo frames per frame after querying available ring
capacity, and keeps the remainder in a host-owned queue. This keeps long notes
from blocking presentation or overflowing the ring. A failed device open
remains a silent, playable native session. These source contracts do not claim
audio-device or packaged-runtime acceptance.
