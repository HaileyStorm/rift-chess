# Rift Chess sound cues

`SoundCues.bend` is game presentation policy. It chooses a short set of notes
after an accepted kernel command; it never decides whether a move is legal.
The reusable, host-neutral oscillator and sample bound live separately in
`../lib/audio/Synthesis.bend`. The browser and native adapters only play PCM.

The five cues are an ordinary two-note rising interval, a lower triangle
capture impact with a bright echo, a three-step tile Shift rise, a sharper
check alert, and a longer finishing chord. Terminal takes precedence over
check, then Shift, capture, and ordinary move. The accepted pre-move board
supplies the capture flag; the resulting position supplies check and outcome.
The user volume is capped at 100 before note gains are derived, and disabled
sound preferences suppress the effect. Each cue is under one second.

The pinned Bend checker covers the game controller. Run
`node bend2/tools/bend.mjs --run bend2/tests/sound-cues.ts` to exercise all
five emitted PCM envelopes, finite amplitude, mute/cap and priority, and
`node bend2/tools/bend.mjs --run bend2/tests/native-gui-arity.ts` to verify an
actual accepted capture and quiet move select distinct cues. These checks
establish source and finite JS behavior, not speaker quality or native-device
latency. The controller cache and browser preview must be re-emitted after
the independent graphics Pro handoff, then listened to through the rendered
game before a release claim.
