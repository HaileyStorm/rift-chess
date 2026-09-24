import Base

# Host-neutral mono note synthesis.  The native adapter supplies the output
# rate and owns the platform Audio handle; this module only returns samples.

type Tone is Data:
  Tone{frequency: F32, duration: U32, wave: U32, gain: F32, delay: U32}

def tone_frequency(tone: Tone) -> F32:
  match tone:
    case Tone{frequency, _, _, _, _}: frequency

def tone_duration(tone: Tone) -> U32:
  match tone:
    case Tone{_, duration, _, _, _}: duration

def tone_wave(tone: Tone) -> U32:
  match tone:
    case Tone{_, _, wave, _, _}: wave

def tone_gain(tone: Tone) -> F32:
  match tone:
    case Tone{_, _, _, gain, _}: gain

def tone_delay(tone: Tone) -> U32:
  match tone:
    case Tone{_, _, _, _, delay}: delay

def rate_or_default(+rate: U32) -> U32:
  Bool.pick(U32, Bool.and(U32.is_ge(rate, 8000), U32.is_le(rate, 96000)), rate, 48000)

# Sound effects are short. Bound all arithmetic before multiplying U32
# milliseconds by sample rate and before constructing a potentially huge list.
def max_millis() -> U32:
  1000

def bounded_millis(millis: U32) -> U32:
  U32.min(millis, max_millis())

def two_pi() -> F32:
  F32.mul(2.0, F32.pi())

def phase(tone: Tone, sample: U32, rate: U32) -> F32:
  F32.mul(two_pi(), F32.div(
    F32.mul(tone_frequency(tone), U32.to_f32(sample)), U32.to_f32(rate)))

def triangle(+phase_value: F32) -> F32:
  +cycle = F32.div(F32.mod(phase_value, two_pi()), two_pi())
  F32.sub(1.0, F32.mul(4.0, F32.abs(F32.sub(cycle, 0.5))))

def saw(+phase_value: F32) -> F32:
  +cycle = F32.div(F32.mod(phase_value, two_pi()), two_pi())
  F32.sub(F32.mul(2.0, cycle), 1.0)

def wave(+kind: U32, +phase_value: F32) -> F32:
  match kind:
    case 0: F32.sin(phase_value)
    case 1: triangle(phase_value)
    case 2: saw(phase_value)
    case 3:
      Bool.pick(F32, F32.is_ge(F32.sin(phase_value), 0.0),
        1.0, (0.0 - 1.0 : F32))
    case _: F32.sin(phase_value)

def tone_start(tone: Tone, rate: U32) -> U32:
  U32.div(U32.mul(bounded_millis(tone_delay(tone)), rate), 1000)

def tone_length(tone: Tone, rate: U32) -> U32:
  U32.div(U32.mul(bounded_millis(tone_duration(tone)), rate), 1000)

def tone_end(+tone: Tone) -> U32:
  U32.min(max_millis(), U32.add(bounded_millis(tone_delay(tone)),
    bounded_millis(tone_duration(tone))))

def max_end(tones: List<&2, Tone>, +current: U32) -> U32:
  match tones:
    case Nil{}:
      current
    case tone <> rest:
      max_end(rest, U32.max(current, tone_end(tone)))

def edge_gain(+local: U32, +length: U32) -> F32:
  +attack = U32.max(1, U32.div(length, 16))
  +release = U32.max(1, U32.div(length, 4))
  +fade_in = F32.min(1.0, F32.div(U32.to_f32(local), U32.to_f32(attack)))
  +fade_out = F32.min(1.0, F32.div(U32.to_f32(U32.sub(U32.sub(length, 1), local)), U32.to_f32(release)))
  F32.min(fade_in, fade_out)

def tone_sample(active: Bool, +tone: Tone, sample: U32, start: U32,
  length: U32, rate: U32) -> F32:
  match active:
    case False{}: 0.0
    case True{}:
      +local = U32.sub(sample, start)
      F32.mul(F32.mul(tone_gain(tone), edge_gain(local, length)),
        wave(tone_wave(tone), phase(tone, local, rate)))

def sample_tone(+tone: Tone, +sample: U32, +rate: U32) -> F32:
  +start = tone_start(tone, rate)
  +length = tone_length(tone, rate)
  +inside = Bool.and(U32.is_ge(sample, start), U32.is_lt(sample, U32.add(start, length)))
  tone_sample(inside, tone, sample, start, length, rate)

def mix_tones(+tones: List<&2, Tone>, +sample: U32, +rate: U32, +sum: F32) -> F32:
  match tones:
    case Nil{}:
      F32.clamp(sum, (0.0 - 1.0 : F32), 1.0)
    case tone <> rest:
      mix_tones(rest, sample, rate, F32.add(sum, sample_tone(tone, sample, rate)))

def samples_go(remaining: Nat, +sample: U32, +rate: U32,
  +tones: List<&2, Tone>, +acc: List<&2, F32>) -> List<&2, F32>:
  match remaining:
    case 0n:
      List.reverse(&2, F32, acc)
    case 1n+rest:
      samples_go(rest, U32.add(sample, 1), rate, tones,
        mix_tones(tones, sample, rate, 0.0) <> acc)

def samples(+tones: List<&2, Tone>, rate: U32) -> List<&2, F32>:
  +safe_rate = rate_or_default(rate)
  +duration = max_end(tones, 0)
  +count = U32.div(U32.mul(duration, safe_rate), 1000)
  samples_go(U32.to_nat(count), 0, safe_rate, tones, [])
