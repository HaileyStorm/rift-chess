import Base
import ./Application.bend as Application
import ./ui/Types.bend as T
import ./lib/audio/Synthesis.bend as Synthesis

# Native State owns affine Window/Audio handles. Keep its large pure Session
# behind a shared List cell so host-loop frames do not flatten it into captures.
# StateBox and PacketBox below are private one-element carries across effects;
# all constructors in this file build exactly one Cons. Empty or multi-item
# carries are invariant failures, never substitute game states.
type State is Type:
  State{window: Window, session_box: List<&2, Application.Session>, audio: Maybe<Audio>,
    +audio_pending: List<&2, F32>, alt_mask: U32, ctrl_mask: U32,
    pending: List<&2, T.Input>, width: U32, height: U32, stamp: Nat}

def state_box(state: State) -> List<State>:
  [state]

def packet_box(packet: Application.Packet) -> List<&2, Application.Packet>:
  [packet]

def session_box(session: Application.Session) -> List<&2, Application.Session>:
  [session]

type Batch is Data:
  Batch{inputs: List<&2, T.Input>, alt_mask: U32, ctrl_mask: U32, closed: Bool}

type Read is Data:
  Read{text: String, errors: List<&2, T.Input>}

type Write is Data:
  Write{ok: Bool, code: U32}

type Journal is Data:
  # `text` stores the escaped payload for a complete record.  When a file is
  # present but malformed it stores the original bytes so recovery can retain
  # the rejected text instead of treating the file as a clean first launch.
  Journal{valid: Bool, present: Bool, sequence: U32, text: String, error: U32}

type UnescapeStep is Data:
  UnescapeStep{escaped: Bool, acc: String}

type Slots is Data:
  Slots{primary: Journal, secondary: Journal}

type StoreTarget is Data:
  StoreTarget{path: String, sequence: U32}

type Boot is Data:
  Boot{saved: String, prefs: String, errors: List<&2, T.Input>}

type Effects is Type:
  Effects{audio: Maybe<Audio>, +inputs: List<&2, T.Input>, +exit: Bool,
    +audio_pending: List<&2, F32>, +marker: U32}

type Pump is Type:
  Pump{audio: Maybe<Audio>, +audio_pending: List<&2, F32>}

def error_input(code: U32) -> List<&2, T.Input>:
  [T.PortError{code}]

def write_answer(answer: Result<&1, &1, U32 & String, Unit>) -> Write:
  match answer:
    case Done{_}: Write{True{}, 0}
    case Fail{(code, _)}: Write{False{}, code}

def write_result(r: File & Result<&1, &1, U32 & String, Unit>) -> IO(Write):
  (closed, answer) = r
  do IO<Write>:
    Unit <- File.close(closed)
    IO.pure(Write, write_answer(answer))

def write_open(+text: String,
  r: Result<&1, &1, U32 & String, File>) -> IO(Write):
  match r:
    case Fail{(code, _)}:
      IO.pure(Write, Write{False{}, code})
    case Done{file}:
      do IO<Write>:
        written : File & Result<&1, &1, U32 & String, Unit> <- File.write(file, text)
        write_result(written)

def write_file_mode(path: String, text: String, mode: String) -> IO(Write):
  do IO<Write>:
    opened : Result<&1, &1, U32 & String, File> <- File.open(path, mode)
    write_open(text, opened)

def write_file(path: String, text: String) -> IO(Write):
  write_file_mode(path, text, "w")

def read_answer(answer: Result<&1, &1, U32 & String, String>) -> Read:
  match answer:
    case Done{value}: Read{value, []}
    case Fail{(code, _)}: Read{"", error_input(code)}

def read_result(r: File & Result<&1, &1, U32 & String, String>) -> IO(Read):
  (closed, answer) = r
  do IO<Read>:
    Unit <- File.close(closed)
    IO.pure(Read, read_answer(answer))

def read_size_choice(+max: U32, large: Bool, file: File) -> IO(Read):
  match large:
    case True{}:
      do IO<Read>:
        Unit <- File.close(file)
        IO.pure(Read, Read{"", error_input(27)})
    case False{}:
      do IO<Read>:
        read_value : File & Result<&1, &1, U32 & String, String> <- File.read(file, max)
        read_result(read_value)

def read_sized(+max: U32, r: File & Result<&1, &1, U32 & String, U32>) -> IO(Read):
  (file, answer) = r
  match answer:
    case Fail{(code, _)}:
      do IO<Read>:
        Unit <- File.close(file)
        IO.pure(Read, Read{"", error_input(code)})
    case Done{size}:
      read_size_choice(max, U32.is_gt(size, max), file)

def read_open(+max: U32, r: Result<&1, &1, U32 & String, File>) -> IO(Read):
  match r:
    case Fail{(code, _)}:
      IO.pure(Read, Read{"", error_input(code)})
    case Done{file}:
      do IO<Read>:
        sized : File & Result<&1, &1, U32 & String, U32> <- File.size(file)
        read_sized(max, sized)

def read_file_limit(+max: U32, path: String) -> IO(Read):
  do IO<Read>:
    opened : Result<&1, &1, U32 & String, File> <- File.open(path, "r")
    read_open(max, opened)

def read_file(path: String) -> IO(Read):
  read_file_limit(2097152, path)

def read_journal_file(path: String) -> IO(Read):
  # A 2 MiB payload can escape to roughly 4 MiB.  Keep room for both markers
  # and the sequence text while still bounding every native read.
  read_file_limit(4200000, path)

def text_order(compared: (String & String) & Cmp) -> Bool:
  match compared:
    case ((_, _), order): Cmp.is_eq(order)

def text_eq(a: String, b: String) -> Bool:
  text_order(String.cmp(a, b))

def slot_primary(+slot: U32) -> String:
  Bool.pick(String, U32.is_eq(slot, 0), "save.json",
    Bool.pick(String, U32.is_eq(slot, 1), "prefs.json", "recovery.json"))

def slot_secondary(+slot: U32) -> String:
  Bool.pick(String, U32.is_eq(slot, 0), "save.json.b",
    Bool.pick(String, U32.is_eq(slot, 1), "prefs.json.b", "recovery.json.b"))

def marker_parts(prefix: String, parts: List<&2, String>) -> Maybe<&2, U32>:
  match parts:
    case head <> sequence <> _:
      Bool.pick(Maybe<&2, U32>, text_eq(head, prefix), U32.read(sequence), None{})
    case _:
      None{}

def marker_seq(prefix: String, line: String) -> Maybe<&2, U32>:
  marker_parts(prefix, String.split(line, ' '))

def char_text(code: U32) -> String:
  SCon{Chr{code}, SNil{}}

def escape_push(+code: U32, +acc: String) -> String:
  Bool.pick(String, U32.is_eq(code, 92),
    SCon{Chr{92}, SCon{Chr{92}, acc}},
    Bool.pick(String, U32.is_eq(code, 10),
      SCon{Chr{110}, SCon{Chr{92}, acc}},
      Bool.pick(String, U32.is_eq(code, 13),
        SCon{Chr{114}, SCon{Chr{92}, acc}},
        SCon{Chr{code}, acc})))

def escape_store_go(text: String, +acc: String) -> String:
  match text:
    case SNil{}: String.reverse(acc)
    case SCon{Chr{+code}, tail}:
      escape_store_go(tail, escape_push(code, acc))

def escape_store(text: String) -> String:
  escape_store_go(text, SNil{})

def unescape_push(+code: U32, +acc: String) -> String:
  SCon{Chr{code}, acc}

def unescape_code_value(+code: U32) -> U32:
  Bool.pick(U32, U32.is_eq(code, 110), 10,
    Bool.pick(U32, U32.is_eq(code, 114), 13, code))

def UnescapeStep_escaped(step: UnescapeStep) -> Bool:
  match step:
    case UnescapeStep{escaped, _}: escaped

def UnescapeStep_acc(step: UnescapeStep) -> String:
  match step:
    case UnescapeStep{_, acc}: acc

def unescape_plain_step(slash: Bool, +code: U32,
  +acc: String) -> UnescapeStep:
  match slash:
    case True{}: UnescapeStep{True{}, acc}
    case False{}: UnescapeStep{False{}, unescape_push(code, acc)}

def unescape_go(text: String, escaped: Bool, +acc: String) -> String:
  match text:
    case SNil{}: String.reverse(acc)
    case SCon{Chr{+code}, tail}:
      match escaped:
        case True{}:
          unescape_go(tail, False{}, unescape_push(unescape_code_value(code), acc))
        case False{}:
          +step : UnescapeStep = unescape_plain_step(U32.is_eq(code, 92), code, acc)
          unescape_go(tail, UnescapeStep_escaped(step), UnescapeStep_acc(step))

def unescape_store(text: String) -> String:
  unescape_go(text, False{}, SNil{})

def Journal_valid(journal: Journal) -> Bool:
  match journal:
    case Journal{valid, _, _, _, _}: valid

def Journal_present(journal: Journal) -> Bool:
  match journal:
    case Journal{_, present, _, _, _}: present

def Journal_sequence(journal: Journal) -> U32:
  match journal:
    case Journal{_, _, sequence, _, _}: sequence

def Journal_raw(journal: Journal) -> String:
  match journal:
    case Journal{_, _, _, text, _}: text

def Journal_text(journal: Journal) -> String:
  unescape_store(Journal_raw(journal))

def Journal_error(journal: Journal) -> U32:
  match journal:
    case Journal{_, _, _, _, error}: error

def journal_newer(+a: Journal, +b: Journal) -> Journal:
  +a_valid = Journal_valid(a)
  +b_valid = Journal_valid(b)
  +choose_a = Bool.and(a_valid, Bool.or(Bool.not(b_valid),
    U32.is_ge(Journal_sequence(a), Journal_sequence(b))))
  +choose_b = Bool.and(b_valid, Bool.or(Bool.not(a_valid),
    U32.is_gt(Journal_sequence(b), Journal_sequence(a))))
  Bool.pick(Journal, choose_a, a, Bool.pick(Journal, choose_b, b,
    Bool.pick(Journal, Journal_present(a), a, b)))

def journal_finish(rest: List<&2, String>, best: Journal,
  current: Maybe<&2, Journal>, +sequence: U32,
  recur: List<&2, String> -> Journal -> Maybe<&2, Journal> -> Journal) -> Journal:
  match current:
    case None{}:
      recur(rest, best, None{})
    case Some{+open}:
      +valid = U32.is_eq(sequence, Journal_sequence(open))
      candidate : Journal = Journal{valid, True{}, sequence, Journal_raw(open), 0}
      recur(rest, journal_newer(best, candidate), None{})

def journal_payload_line(first: Bool, +line: String) -> String:
  match first:
    case False{}: line
    case True{}:
      Bool.pick(String, String.starts_with(line, "~"), String.drop(line, 1n), line)

def prepend_chars(text: String, +acc: String) -> String:
  match text:
    case SNil{}: acc
    case SCon{h, tail}:
      prepend_chars(tail, SCon{h, acc})

def frame_body(+header: String, +escaped: String, +suffix: String) -> String:
  # Build `header + "~" + escaped + suffix` by walking the escaped text once;
  # appending a multi-megabyte String would otherwise recurse through it.
  +from_suffix = prepend_chars(String.reverse(suffix), SNil{})
  +from_payload = prepend_chars(String.reverse(escaped), from_suffix)
  prepend_chars(String.append("~", String.reverse(header)), from_payload)

def journal_payload(rest: List<&2, String>, best: Journal,
  current: Maybe<&2, Journal>, line: String,
  recur: List<&2, String> -> Journal -> Maybe<&2, Journal> -> Journal) -> Journal:
  match current:
    case None{}:
      recur(rest, best, None{})
    case Some{+open}:
      +first = String.is_empty(Journal_raw(open))
      +payload = journal_payload_line(first, line)
      continued : Journal = Journal{False{}, True{}, Journal_sequence(open),
        String.append(Journal_raw(open), payload), Journal_error(open)}
      recur(rest, best, Some{continued})

def journal_step_current(line: String, rest: List<&2, String>, best: Journal,
  +open: Journal, ending: Maybe<&2, U32>,
  recur: List<&2, String> -> Journal -> Maybe<&2, Journal> -> Journal) -> Journal:
  match ending:
    case Some{sequence}:
      journal_finish(rest, best, Some{open}, sequence, recur)
    case None{}:
      journal_payload(rest, best, Some{open}, line, recur)

def journal_step(line: String, rest: List<&2, String>, best: Journal,
  current: Maybe<&2, Journal>, begin: Maybe<&2, U32>, ending: Maybe<&2, U32>,
  recur: List<&2, String> -> Journal -> Maybe<&2, Journal> -> Journal) -> Journal:
  match current:
    case Some{+open}:
      journal_step_current(line, rest, best, open, ending, recur)
    case None{}:
      match begin:
        case Some{sequence}:
          recur(rest, best, Some{Journal{False{}, True{}, sequence, "", 0}})
        case None{}:
          recur(rest, best, None{})

@unsafe
def journal_scan(lines: List<&2, String>, best: Journal,
  current: Maybe<&2, Journal>) -> Journal:
  match lines:
    case Nil{}:
      best
    case +line <> rest:
      journal_step(line, rest, best, current,
        marker_seq("RIFT-NATIVE-BEGIN", line), marker_seq("RIFT-NATIVE-END", line),
        xs => b => c => journal_scan(xs, b, c))

def journal_parse(text: String) -> Journal:
  journal_scan(String.lines(text), Journal{False{}, True{}, 0, "", 0}, None{})

def parsed_journal_choice(valid: Bool, +raw: String, +parsed: Journal) -> Journal:
  match valid:
    case True{}: parsed
    case False{}: Journal{False{}, True{}, 0, raw, 9002}

def parsed_journal(+raw: String, +parsed: Journal) -> Journal:
  parsed_journal_choice(Journal_valid(parsed), raw, parsed)

def read_journal_value(read_value: Read) -> Journal:
  Read{+text, errors} = read_value
  match errors:
    case Nil{}: parsed_journal(text, journal_parse(text))
    case T.PortError{+kind} <> _:
      Bool.pick(Journal, U32.is_eq(kind, 2), Journal{False{}, False{}, 0, "", 0},
        Journal{False{}, True{}, 0, "", kind})
    case _: Journal{False{}, True{}, 0, "", 1}

def read_journal(path: String) -> IO(Journal):
  do IO<Journal>:
    read_value : Read <- read_journal_file(path)
    IO.pure(Journal, read_journal_value(read_value))

def slots_ready(primary: Journal, secondary: Journal) -> Slots:
  Slots{primary, secondary}

def read_slots(+slot: U32) -> IO(Slots):
  do IO<Slots>:
    primary : Journal <- read_journal(slot_primary(slot))
    secondary : Journal <- read_journal(slot_secondary(slot))
    IO.pure(Slots, slots_ready(primary, secondary))

def store_target(+slot: U32, slots: Slots) -> StoreTarget:
  Slots{+primary, +secondary} = slots
  +newer = journal_newer(primary, secondary)
  +use_primary = Bool.and(Journal_valid(primary), Bool.or(
    Bool.not(Journal_valid(secondary)), U32.is_ge(Journal_sequence(primary), Journal_sequence(secondary))))
  StoreTarget{Bool.pick(String, use_primary, slot_secondary(slot), slot_primary(slot)),
    U32.add(Journal_sequence(newer), 1)}

def Slots_primary(slots: Slots) -> Journal:
  match slots:
    case Slots{primary, _}: primary

def Slots_secondary(slots: Slots) -> Journal:
  match slots:
    case Slots{_, secondary}: secondary

def slot_io_error(journal: Journal) -> U32:
  +error = Journal_error(journal)
  Bool.pick(U32, U32.is_eq(error, 9002), 0, error)

def slots_error(+slots: Slots) -> U32:
  U32.max(slot_io_error(Slots_primary(slots)), slot_io_error(Slots_secondary(slots)))

def latest_present(present: Bool, +newest: Journal) -> Read:
  match present:
    case False{}: Read{"", []}
    case True{}:
      +stored_error = Journal_error(newest)
      +error = Bool.pick(U32, U32.is_eq(stored_error, 0), 9002, stored_error)
      Read{Journal_raw(newest), error_input(error)}

def latest_value(valid: Bool, +newest: Journal) -> Read:
  match valid:
    case True{}: Read{Journal_text(newest), []}
    case False{}: latest_present(Journal_present(newest), newest)

def latest_error(+value: Read, +error: U32) -> Read:
  Read{+text, errors} = value
  Bool.pick(Read, U32.is_eq(error, 0), Read{text, errors},
    Read{text, error_input(error)})

def latest_read(+slots: Slots) -> Read:
  +newest = journal_newer(Slots_primary(slots), Slots_secondary(slots))
  +value = latest_value(Journal_valid(newest), newest)
  latest_error(value, slots_error(slots))

def boot_saved_errors(errors: List<&2, T.Input>) -> List<&2, T.Input>:
  match errors:
    case Nil{}: []
    case T.PortError{+kind} <> rest:
      List.append(&2, T.Input,
        [T.PortError{Bool.pick(U32, U32.is_eq(kind, 9002), 9002, 9003)}], rest)
    case first <> rest:
      first <> rest

def boot_prefs_errors(errors: List<&2, T.Input>) -> List<&2, T.Input>:
  match errors:
    case Nil{}: []
    case T.PortError{_} <> rest:
      List.append(&2, T.Input, [T.PortError{9004}], rest)
    case first <> rest:
      first <> rest

def boot_read(slot: U32) -> IO(Read):
  do IO<Read>:
    slots : Slots <- read_slots(slot)
    IO.pure(Read, latest_read(slots))

def boot_loaded(saved: Read, prefs: Read) -> Boot:
  Read{saved_text, saved_errors} = saved
  Read{prefs_text, prefs_errors} = prefs
  Boot{saved_text, prefs_text,
    List.append(&2, T.Input, boot_saved_errors(saved_errors), boot_prefs_errors(prefs_errors))}

def boot_files() -> IO(Boot):
  do IO<Boot>:
    saved : Read <- boot_read(0)
    prefs : Read <- boot_read(1)
    IO.pure(Boot, boot_loaded(saved, prefs))

def opened_audio(
  r: Result<&1, &1, U32 & String, Audio>) -> IO(Maybe<Audio>):
  match r:
    case Done{device}:
      IO.pure(Maybe<Audio>, Some{device})
    case Fail{(code, message)}:
      do IO<Maybe<Audio>>:
        Unit <- IO.print_err(String.append("native audio unavailable: ", message))
        IO.pure(Maybe<Audio>, None{})

def open_audio() -> IO(Maybe<Audio>):
  do IO<Maybe<Audio>>:
    opened : Result<&1, &1, U32 & String, Audio> <- Audio.open(48000)
    opened_audio(opened)

# File effects do not hold an Audio handle across an unrelated IO closure.  A
# live device is closed before the file operation and reopened afterwards;
# the queued PCM list remains in the Effects value for the next frame.
def write_inputs(ok: Bool, code: U32) -> List<&2, T.Input>:
  Bool.pick(List<&2, T.Input>, ok, [], error_input(code))

def make_effects(audio: Maybe<Audio>, inputs: List<&2, T.Input>, exit: Bool,
  +audio_pending: List<&2, F32>) -> Effects:
  Effects{audio, inputs, exit, audio_pending, 0}

def stored(audio: Maybe<Audio>, written: Write,
  +audio_pending: List<&2, F32>) -> Effects:
  Write{ok, code} = written
  +inputs = write_inputs(ok, code)
  make_effects(audio, inputs, False{}, audio_pending)

def store_written(reopen: Bool, written: Write,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match reopen:
    case False{}:
      IO.pure(Effects, stored(None{}, written, audio_pending))
    case True{}:
      do IO<Effects>:
        reopened : Maybe<Audio> <- open_audio()
        IO.pure(Effects, stored(reopened, written, audio_pending))

def store_failed(reopen: Bool, code: U32,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match reopen:
    case False{}:
      IO.pure(Effects, stored(None{}, Write{False{}, code}, audio_pending))
    case True{}:
      do IO<Effects>:
        reopened : Maybe<Audio> <- open_audio()
        IO.pure(Effects, stored(reopened, Write{False{}, code}, audio_pending))

def store_target_ready(reopen: Bool, target: StoreTarget, text: String,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  StoreTarget{path, +sequence} = target
  +escaped = escape_store(text)
  +header = String.append(String.append("RIFT-NATIVE-BEGIN ", U32.show(sequence)), "\n")
  +suffix = String.append("\nRIFT-NATIVE-END ", String.append(U32.show(sequence), "\n"))
  +body = frame_body(header, escaped, suffix)
  do IO<Effects>:
    written : Write <- write_file(path, body)
    store_written(reopen, written, audio_pending)

def store_payload_choice(reopen: Bool, target: StoreTarget, +text: String,
  +audio_pending: List<&2, F32>,
  large: Bool) -> IO(Effects):
  match large:
    case True{}: store_failed(reopen, 27, audio_pending)
    case False{}: store_target_ready(reopen, target, text, audio_pending)

def store_slots_choice(bad: Bool, reopen: Bool, slot: U32, +text: String,
  +audio_pending: List<&2, F32>,
  slots: Slots, error: U32) -> IO(Effects):
  match bad:
    case True{}:
      store_failed(reopen, error, audio_pending)
    case False{}:
      +target = store_target(slot, slots)
      store_payload_choice(reopen, target, text, audio_pending,
        U32.is_gt(U32.from_nat(String.length(text)), 2097152))

def store_slots_ready(reopen: Bool, slot: U32, text: String,
  +audio_pending: List<&2, F32>, +slots: Slots) -> IO(Effects):
  +error = slots_error(slots)
  store_slots_choice(U32.is_ne(error, 0), reopen, slot, text, audio_pending, slots, error)

def pick_inputs(+text: String, errors: List<&2, T.Input>) -> List<&2, T.Input>:
  match errors:
    case Nil{}:
      [T.FileText{text}]
    case _:
      errors

@unsafe
def write_for(path: String, text: String) -> IO(Write):
  write_file(path, text)

@unsafe
def file_effect(+audio: Maybe<Audio>, path: String, text: String,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match audio:
    case None{}:
      do IO<Effects>:
        written : Write <- write_for(path, text)
        IO.pure(Effects, stored(None{}, written, audio_pending))
    case Some{device}:
      do IO<Effects>:
        Unit <- Audio.close(device)
        written : Write <- write_for(path, text)
        reopened : Maybe<Audio> <- open_audio()
        IO.pure(Effects, stored(reopened, written, audio_pending))

def picked(audio: Maybe<Audio>, read_value: Read,
  +audio_pending: List<&2, F32>) -> Effects:
  Read{text, errors} = read_value
  +inputs = pick_inputs(text, errors)
  make_effects(audio, inputs, False{}, audio_pending)

@unsafe
def read_effect(+audio: Maybe<Audio>, path: String,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match audio:
    case None{}:
      do IO<Effects>:
        read_value : Read <- read_file(path)
        IO.pure(Effects, picked(None{}, read_value, audio_pending))
    case Some{device}:
      do IO<Effects>:
        Unit <- Audio.close(device)
        read_value : Read <- read_file(path)
        reopened : Maybe<Audio> <- open_audio()
        IO.pure(Effects, picked(reopened, read_value, audio_pending))

def tone(note: T.Note) -> Synthesis.Tone:
  match note:
    case T.Note{frequency, duration, wave, gain, delay}:
      Synthesis.Tone{frequency, duration, wave, gain, delay}

def tones(+notes: List<&2, T.Note>) -> List<&2, Synthesis.Tone>:
  match notes:
    case Nil{}:
      []
    case note <> rest:
      tone(note) <> tones(rest)

type AudioSplit is Data:
  AudioSplit{block: List<&2, F32>, rest: List<&2, F32>}

def split_mono(remaining: Nat, +samples: List<&2, F32>,
  +acc: List<&2, F32>) -> AudioSplit:
  match remaining samples:
    case 0n _:
      AudioSplit{List.reverse(&2, F32, acc), samples}
    case 1n+rest Nil{}:
      AudioSplit{List.reverse(&2, F32, acc), []}
    case 1n+rest +sample <> tail:
      split_mono(rest, tail, sample <> sample <> acc)

def pump_written(written: Audio & U32, +tail: List<&2, F32>) -> Pump:
  (next, _) = written
  Pump{Some{next}, tail}

def pump_split(split: AudioSplit, audio: Audio) -> IO(Pump):
  AudioSplit{block, tail} = split
  do IO<Pump>:
    written : Audio & U32 <- Audio.write(audio, block)
    IO.pure(Pump, pump_written(written, tail))

def pump_write_choice(empty: Bool, no_room: Bool, capacity: U32,
  audio: Audio, +pending: List<&2, F32>) -> IO(Pump):
  match empty:
    case True{}:
      IO.pure(Pump, Pump{Some{audio}, pending})
    case False{}:
      match no_room:
        case True{}:
          IO.pure(Pump, Pump{Some{audio}, pending})
        case False{}:
          pump_split(split_mono(U32.to_nat(capacity), pending, []), audio)

def audio_capacity(+queued: U32) -> U32:
  U32.min(2048, U32.sub(4096, U32.min(4096, queued)))

def pump_after_query(audio: Audio, +pending: List<&2, F32>, queued: U32) -> IO(Pump):
  +empty = List.is_empty(&2, F32, pending)
  +capacity = audio_capacity(queued)
  pump_write_choice(empty, U32.is_eq(capacity, 0), capacity, audio, pending)

def pump_queried(queried: Audio & U32, +pending: List<&2, F32>) -> IO(Pump):
  (next, queued) = queried
  pump_after_query(next, pending, queued)

@unsafe
def pump_audio(+audio: Maybe<Audio>, +pending: List<&2, F32>) -> IO(Pump):
  match audio:
    case None{}:
      IO.pure(Pump, Pump{None{}, []})
    case Some{device}:
      do IO<Pump>:
        queried : Audio & U32 <- Audio.write(device, [])
        pump_queried(queried, pending)

def mouse_button(+button: U32) -> U32:
  Bool.pick(U32, U32.is_eq(button, 0), 0,
    Bool.pick(U32, Bool.or(U32.is_eq(button, 1), U32.is_eq(button, 2)), 2, 1))

# Base's Linux adapter emits private-use arrow code points and lower-case
# printable keys; macOS emits the corresponding modifier key codes.  Normalize
# both to the browser facade's stable keyboard values.
def key_code(+code: U32) -> U32:
  +letter = Bool.and(U32.is_ge(code, 97), U32.is_le(code, 122))
  Bool.pick(U32, U32.is_eq(code, 63234), 37,
    Bool.pick(U32, U32.is_eq(code, 63232), 38,
      Bool.pick(U32, U32.is_eq(code, 63235), 39,
        Bool.pick(U32, U32.is_eq(code, 63233), 40,
          Bool.pick(U32, letter, U32.sub(code, 32), code)))))

def alt_bit(+code: U32) -> U32:
  Bool.pick(U32, U32.is_eq(code, 18), 1,
    Bool.pick(U32, U32.is_eq(code, 65594), 2,
      Bool.pick(U32, U32.is_eq(code, 65597), 4, 0)))

def ctrl_bit(+code: U32) -> U32:
  Bool.pick(U32, U32.is_eq(code, 65595), 1,
    Bool.pick(U32, U32.is_eq(code, 65598), 2,
      Bool.pick(U32, U32.is_eq(code, 65591), 4,
        Bool.pick(U32, U32.is_eq(code, 65590), 8, 0))))

def modifier_step(down: Bool, +mask: U32, +bit: U32) -> U32:
  Bool.pick(U32, down, U32.or(mask, bit), U32.and(mask, U32.not(bit)))

def mouse_input(x: U32, y: U32, +button: U32, down: Bool, +alt: Bool) -> T.Input:
  match down:
    case True{}:
      T.PointerDown{x, y, mouse_button(button), alt}
    case False{}:
      T.PointerUp{x, y, mouse_button(button)}

def events_go(events: List<Event>, +alt_mask: U32, +ctrl_mask: U32,
  +acc: List<&2, T.Input>, closed: Bool) -> Batch:
  match events:
    case Nil{}:
      Batch{List.reverse(&2, T.Input, acc), alt_mask, ctrl_mask, closed}
    case Close{} <> _:
      Batch{List.reverse(&2, T.Input, acc), alt_mask, ctrl_mask, True{}}
    case Key{+code, +down} <> rest:
      +next_alt_mask = modifier_step(down, alt_mask, alt_bit(code))
      +next_ctrl_mask = modifier_step(down, ctrl_mask, ctrl_bit(code))
      +next_alt = U32.is_ne(next_alt_mask, 0)
      +next_ctrl = U32.is_ne(next_ctrl_mask, 0)
      events_go(rest, next_alt_mask, next_ctrl_mask,
        T.KeyInput{key_code(code), down, next_alt, next_ctrl, False{}} <> acc, closed)
    case Mouse{x, y, +button, down} <> rest:
      events_go(rest, alt_mask, ctrl_mask,
        mouse_input(x, y, button, down, U32.is_ne(alt_mask, 0)) <> acc, closed)
    case Move{x, y} <> rest:
      events_go(rest, alt_mask, ctrl_mask, T.PointerMove{x, y} <> acc, closed)

def events(events: List<Event>, alt_mask: U32, ctrl_mask: U32) -> Batch:
  events_go(events, alt_mask, ctrl_mask, [], False{})

@unsafe
def store_effect(+audio: Maybe<Audio>, +slot: U32, text: String,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match audio:
    case None{}:
      do IO<Effects>:
        slots : Slots <- read_slots(slot)
        store_slots_ready(False{}, slot, text, audio_pending, slots)
    case Some{device}:
      do IO<Effects>:
        Unit <- Audio.close(device)
        slots : Slots <- read_slots(slot)
        store_slots_ready(True{}, slot, text, audio_pending, slots)

@unsafe
def download_effect(+audio: Maybe<Audio>, name: String, text: String,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  file_effect(audio, name, text, audio_pending)

@unsafe
def pick_effect(+audio: Maybe<Audio>, +audio_pending: List<&2, F32>) -> IO(Effects):
  read_effect(audio, "rift-chess-record.json", audio_pending)

@unsafe
def sound_effect(+audio: Maybe<Audio>, +notes: List<&2, T.Note>,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match audio:
    case None{}:
      IO.pure(Effects, make_effects(None{}, [], False{}, []))
    case Some{device}:
      +samples = Synthesis.samples(tones(notes), 48000)
      +queued = List.append(&2, F32, audio_pending, samples)
      IO.pure(Effects, make_effects(Some{device}, [], False{}, queued))

@unsafe
def url_effect(+audio: Maybe<Audio>, +url: String,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match audio:
    case None{}:
      do IO<Effects>:
        Unit <- IO.print(String.append("OpenUrl: ", url))
        IO.pure(Effects, make_effects(None{}, [], False{}, []))
    case Some{device}:
      do IO<Effects>:
        Unit <- Audio.close(device)
        Unit <- IO.print(String.append("OpenUrl: ", url))
        reopened : Maybe<Audio> <- open_audio()
        IO.pure(Effects, make_effects(reopened, [], False{}, audio_pending))

@unsafe
def effect(+effect_value: T.Effect, +audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match effect_value:
    case T.Store{slot, text}: store_effect(audio, slot, text, audio_pending)
    case T.Download{name, text}: download_effect(audio, name, text, audio_pending)
    case T.PickFile{}: pick_effect(audio, audio_pending)
    case T.Sound{notes}: sound_effect(audio, notes, audio_pending)
    case T.OpenUrl{url}: url_effect(audio, url, audio_pending)
    case T.Exit{}: IO.pure(Effects, make_effects(audio, [], True{}, audio_pending))

@unsafe
def effects_next(rest: List<&2, T.Effect>, +acc: List<&2, T.Input>,
  +exit: Bool, one: Effects,
  recur: List<&2, T.Effect> -> Maybe<Audio> -> List<&2, T.Input> -> Bool -> List<&2, F32> -> IO(Effects)) -> IO(Effects):
  Effects{next_audio, inputs, next_exit, next_pending, _} = one
  recur(rest, next_audio, List.append(&2, T.Input, inputs, acc),
    Bool.or(exit, next_exit), next_pending)

@unsafe
def effects_go(effects: List<&2, T.Effect>, +audio: Maybe<Audio>,
  +acc: List<&2, T.Input>, +exit: Bool,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  match effects:
    case Nil{}:
      +inputs = List.reverse(&2, T.Input, acc)
      IO.pure(Effects, make_effects(audio, inputs, exit, audio_pending))
    case first <> rest:
      do IO<Effects>:
        one : Effects <- effect(first, audio, audio_pending)
        effects_next(rest, acc, exit, one,
          rest2 => audio2 => acc2 => exit2 => pending2 => effects_go(rest2, audio2, acc2, exit2, pending2))

def has_store(+slot: U32, effects: List<&2, T.Effect>) -> Bool:
  match effects:
    case Nil{}:
      False{}
    case T.Store{other, _} <> rest:
      Bool.or(U32.is_eq(slot, other), has_store(slot, rest))
    case _ <> rest:
      has_store(slot, rest)

def coalesce_effects_go(effects: List<&2, T.Effect>,
  +acc: List<&2, T.Effect>) -> List<&2, T.Effect>:
  match effects:
    case Nil{}:
      List.reverse(&2, T.Effect, acc)
    case T.Store{+slot, text} <> +rest:
      +keep = Bool.not(has_store(slot, rest))
      +next = Bool.pick(List<&2, T.Effect>, keep,
        T.Store{slot, text} <> acc, acc)
      coalesce_effects_go(rest, next)
    case first <> rest:
      coalesce_effects_go(rest, first <> acc)

def coalesce_effects(effects: List<&2, T.Effect>) -> List<&2, T.Effect>:
  coalesce_effects_go(effects, [])

@unsafe
def apply_effects(effects: List<&2, T.Effect>, audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>) -> IO(Effects):
  effects_go(coalesce_effects(effects), audio, [], False{}, audio_pending)

def close_audio(audio: Maybe<Audio>) -> IO(Unit):
  match audio:
    case None{}:
      IO.pure(Unit, Unit{})
    case Some{device}:
      Audio.close(device)

def finish(window: Window, audio: Maybe<Audio>, +image: Image) -> IO(Unit):
  +released = Image.drop(image)
  do IO<Unit>:
    Unit <- IO.pure(Unit, released)
    Unit <- close_audio(audio)
    Window.close(window)

@unsafe
def native_box_failure(window: Window, audio: Maybe<Audio>, +image: Image,
  message: String) -> IO(Unit):
  do IO<Unit>:
    Unit <- IO.print_err(message)
    finish(window, audio, image)

@unsafe
def native_missing_state_box() -> IO(Unit):
  IO.print_err("Native loop invariant failed: StateBox must contain exactly one Cons.")

@unsafe
def native_missing_packet(state: State) -> IO(Unit):
  State{window, _, audio, _, _, _, _, _, _, _} = state
  do IO<Unit>:
    Unit <- IO.print_err("Native loop invariant failed: PacketBox must contain exactly one Cons.")
    finish(window, audio, Pix{0})

def wait_when(idle: Bool, after: U32, next: IO(Unit)) -> IO(Unit):
  match idle:
    case True{}:
      next
    case False{}:
      do IO<Unit>:
        Unit <- IO.sleep(after)
        next

def wait_then(+after: U32, next: IO(Unit)) -> IO(Unit):
  wait_when(U32.is_eq(after, 0), after, next)

# A presented frame is pure apart from releasing its image and dispatching the
# translated events.  Packet effects are intentionally handled by `loop` before
# presentation, so boot and dispatch side effects share one path.
@unsafe
def frame_after_packet(+next: Application.Packet, next_window: Window,
  next_alt_mask: U32, next_ctrl_mask: U32, audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, width: U32, height: U32, now: Nat,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  Application.Packet{+next_session, _, _, _, _, _, _, +after, _, _} = next
  +next_session_cell = session_box(next_session)
  +empty_pending : List<&2, T.Input> = []
  next_state : State = State{next_window, next_session_cell, audio, audio_pending,
    next_alt_mask, next_ctrl_mask, empty_pending, width, height, now}
  wait_then(after, recur(state_box(next_state), packet_box(next)))

@unsafe
def frame_after_drop(next_box: List<&2, Application.Packet>, next_window: Window,
  next_alt_mask: U32, next_ctrl_mask: U32, audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, width: U32, height: U32,
  now: Nat, recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  match next_box:
    case +next <> Nil{}:
      frame_after_packet(next, next_window, next_alt_mask, next_ctrl_mask, audio,
        audio_pending, width, height, now, recur)
    case Nil{}:
      native_box_failure(next_window, audio, Pix{0},
        "Native frame invariant failed: PacketBox was empty.")
    case _:
      native_box_failure(next_window, audio, Pix{0},
        "Native frame invariant failed: PacketBox was not a singleton.")

@unsafe
def frame_next(next: Application.Packet, next_window: Window, displayed: Image,
  next_alt_mask: U32, next_ctrl_mask: U32, audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, width: U32, height: U32,
  now: Nat, recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  +next_box = packet_box(next)
  do IO<Unit>:
    Unit <- IO.pure(Unit, Image.drop(displayed))
    frame_after_drop(next_box, next_window, next_alt_mask, next_ctrl_mask, audio,
      audio_pending, width, height, now, recur)

@unsafe
def frame_choice(closed: Bool, next_window: Window, displayed: Image,
  inputs: List<&2, T.Input>, next_alt_mask: U32, next_ctrl_mask: U32,
  session_cell: List<&2, Application.Session>, audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, pending: List<&2, T.Input>, width: U32, height: U32,
  elapsed: U32, now: Nat,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  match closed:
    case True{}:
      finish(next_window, audio, displayed)
    case False{}:
      +with_pending = List.append(&2, T.Input, pending, inputs)
      +tick_inputs = List.append(&2, T.Input, with_pending, [T.Tick{elapsed}])
      frame_dispatch(session_cell, tick_inputs, next_window, displayed, next_alt_mask,
        next_ctrl_mask, audio, audio_pending, width, height, now, recur)

@unsafe
def frame_dispatch(session_cell: List<&2, Application.Session>,
  inputs: List<&2, T.Input>, next_window: Window, displayed: Image,
  next_alt_mask: U32, next_ctrl_mask: U32, audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, width: U32, height: U32, now: Nat,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  match session_cell:
    case +session <> Nil{}:
      +next = Application.dispatch(inputs, session)
      frame_next(next, next_window, displayed, next_alt_mask, next_ctrl_mask, audio,
        audio_pending, width, height, now, recur)
    case Nil{}:
      native_box_failure(next_window, audio, displayed,
        "Native frame invariant failed: SessionBox was empty.")
    case _:
      native_box_failure(next_window, audio, displayed,
        "Native frame invariant failed: SessionBox was not a singleton.")

@unsafe
def frame_batch(batch: Batch, next_window: Window, displayed: Image,
  session_cell: List<&2, Application.Session>, audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, pending: List<&2, T.Input>,
  width: U32, height: U32, elapsed: U32, now: Nat,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  Batch{inputs, next_alt_mask, next_ctrl_mask, closed} = batch
  frame_choice(closed, next_window, displayed, inputs, next_alt_mask, next_ctrl_mask,
    session_cell, audio, audio_pending, pending, width, height, elapsed, now, recur)

@unsafe
def frame_turn(session_cell: List<&2, Application.Session>, audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, alt_mask: U32, ctrl_mask: U32,
  pending: List<&2, T.Input>, width: U32, height: U32,
  shown: Window & Image & List<Event>, elapsed: U32, now: Nat,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  (next_window, displayed, native_events) = shown
  +batch = events(native_events, alt_mask, ctrl_mask)
  frame_batch(batch, next_window, displayed, session_cell, audio, audio_pending, pending,
    width, height, elapsed, now, recur)

def frame_clock(session_cell: List<&2, Application.Session>, next_audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, alt_mask: U32, ctrl_mask: U32,
  next_pending: List<&2, T.Input>, width: U32, height: U32,
  shown: Window & Image & List<Event>, stamp: Nat, +now: Nat,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  +elapsed = U32.min(240, U32.from_nat(Nat.sub(now, stamp)))
  frame_turn(session_cell, next_audio, audio_pending, alt_mask, ctrl_mask, next_pending, width,
    height, shown, elapsed, now, recur)

def effect_choice(ending: Bool, window: Window,
  session_cell: List<&2, Application.Session>,
  alt_mask: U32, ctrl_mask: U32, pending: List<&2, T.Input>, width: U32, height: U32,
  +image: Image, next_audio: Maybe<Audio>,
  +audio_pending: List<&2, F32>, errors: List<&2, T.Input>,
  stamp: Nat,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  match ending:
    case True{}:
      finish(window, next_audio, image)
    case False{}:
      +next_pending = List.append(&2, T.Input, pending, errors)
      do IO<Unit>:
        shown : Window & Image & List<Event> <- Window.frame(window, image)
        now : Nat <- IO.now()
        frame_clock(session_cell, next_audio, audio_pending, alt_mask, ctrl_mask, next_pending,
          width, height, shown, stamp, now, recur)

def pumped_effects(pumped: Pump, window: Window,
  session_cell: List<&2, Application.Session>,
  alt_mask: U32, ctrl_mask: U32, pending: List<&2, T.Input>, width: U32, height: U32,
  +image: Image, errors: List<&2, T.Input>, ending: Bool, stamp: Nat,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  Pump{next_audio, audio_pending} = pumped
  effect_choice(ending, window, session_cell, alt_mask, ctrl_mask, pending, width, height, image,
    next_audio, audio_pending, errors, stamp, recur)

def loop_after_effects(window: Window, session_cell: List<&2, Application.Session>, alt_mask: U32,
  ctrl_mask: U32, pending: List<&2, T.Input>, width: U32, height: U32, +image: Image,
  stamp: Nat, applied: Effects,
  recur: List<State> -> List<&2, Application.Packet> -> IO(Unit)) -> IO(Unit):
  Effects{next_audio, errors, ending, +audio_pending, _} = applied
  do IO<Unit>:
    pumped : Pump <- pump_audio(next_audio, audio_pending)
    pumped_effects(pumped, window, session_cell, alt_mask, ctrl_mask, pending, width, height,
      image, errors, ending, stamp, recur)

# The recursion is an intentionally unbounded host loop; all application state
# transitions remain pure and checker-visible in Application.bend.
@unsafe
def loop_live(state: State, +packet: Application.Packet) -> IO(Unit):
  State{window, session_cell, audio, +audio_pending, alt_mask, ctrl_mask,
    pending, width, height, stamp} = state
  Application.Packet{_, +effects, +image, _, _, _, _, _, _, _} = packet
  do IO<Unit>:
    applied : Effects <- apply_effects(effects, audio, audio_pending)
    loop_after_effects(window, session_cell, alt_mask, ctrl_mask, pending, width, height, image,
      stamp, applied, loop)

@unsafe
def loop_packet(state: State, packet_box: List<&2, Application.Packet>) -> IO(Unit):
  match packet_box:
    case +packet <> Nil{}:
      loop_live(state, packet)
    case Nil{}:
      native_missing_packet(state)
    case _:
      native_missing_packet(state)

# The only StateBox constructors are `state_box`; Nil and longer lists fail
# loudly here instead of inventing a default state or a fake Packet transition.
@unsafe
def loop(state_box: List<State>, packet_box: List<&2, Application.Packet>) -> IO(Unit):
  match state_box:
    case state <> Nil{}:
      loop_packet(state, packet_box)
    case Nil{}:
      native_missing_state_box()
    case _:
      native_missing_state_box()

def start_ready(errors: List<&2, T.Input>, window: Window,
  +packet: Application.Packet, audio: Maybe<Audio>, stamp: Nat) -> IO(Unit):
  Application.Packet{+session, _, _, _, _, _, _, _, _, _} = packet
  +session_cell = session_box(session)
  state: State = State{window, session_cell, audio, [], 0, 0, errors, 1024, 800, stamp}
  loop(state_box(state), packet_box(packet))

def start(boot: Boot, window: Window) -> IO(Unit):
  Boot{saved, prefs, errors} = boot
  +packet = Application.boot(saved, prefs, 1024, 800)
  do IO<Unit>:
    stamp : Nat <- IO.now()
    audio : Maybe<Audio> <- open_audio()
    start_ready(errors, window, packet, audio, stamp)

def main() -> IO(Unit):
  do IO<Unit>:
    boot : Boot <- boot_files()
    window : Window <- IO.try(Window, Window.open("Rift Chess", 1024, 800))
    start(boot, window)
