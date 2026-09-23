# Bend audio boundary

`Synthesis.bend` is a pure, Base-only mono synthesizer. `Tone` values use
frequency in hertz, duration and delay in milliseconds, wave `0` for sine,
`1` for triangle, `2` for a saw ramp, and `3` for a square wave. `samples`
returns a bounded `List<&2,F32>` at the caller's rate; it owns no device and
has no browser or UI imports.

The native adapter is responsible for device ownership and transport. Base's
native audio effect consumes interleaved stereo float samples and has a finite
ring. `Native.bend` duplicates each mono sample into left/right channels,
writes at most 2,048 stereo frames per frame after querying available ring
capacity, and keeps the remainder in a host-owned queue. This keeps long notes
from blocking presentation or overflowing the ring. A failed device open
remains a silent, playable native session. These source contracts do not claim
audio-device or packaged-runtime acceptance.
