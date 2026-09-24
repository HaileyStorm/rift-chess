import Base
import ./core/Model.bend as Model
import ./core/MatchSpec.bend as Match
import ./core/v2/Facade.bend as Rules
import ./ui/Codec.bend as Codec
import ./ui/Json.bend as Json

type Read is Data:
  Read{present: Bool, error: U32, text: String}

type Snapshot is Data:
  Snapshot{slot: U32, present: Bool, valid: Bool, sequence: U32,
    record: Maybe<&2, Codec.Record>, game: Maybe<&2, Match.Match>, error: U32}

type Store is Data:
  Store{game: Match.Match, layout: Bool, policy: U32,
    commands: List<&2, Match.Command>, sequence: U32, active: U32}

type Load is Data:
  Selected{store: Store}
  Fresh{store: Store}
  Failed{error: U32}

type Payload is Data:
  Payload{sequence: U32, text: String}

type Save is Data:
  Save{ok: Bool, error: U32}

def position(game: Match.Match) -> Model.Position:
  match game:
    case Match.Match{initial, state, actions, states, keys, revision, policy,
      offer, forced}:
      state

def revision(game: Match.Match) -> Nat:
  match game:
    case Match.Match{initial, state, actions, states, keys, revision, policy,
      offer, forced}:
      revision

def side(game: Match.Match) -> Bool:
  Model.pos_side(position(game))

def layout_policy(policy: U32) -> Maybe<&2, Match.DrawPolicy>:
  match policy:
    case 0: Some{Match.Prompt{}}
    case 1: Some{Match.Auto100{}}
    case 2: Some{Match.Off{}}
    case _: None{}

def read_after_close(+present: Bool, +error: U32, file: File,
  answer: Result<&1, &1, U32 & String, String>) -> IO(Read):
  match answer:
    case Fail{(code, _)}:
      do IO<Read>:
        Unit <- File.close(file)
        IO.pure(Read, Read{present, code, ""})
    case Done{text}:
      do IO<Read>:
        Unit <- File.close(file)
        IO.pure(Read, Read{present, error, text})

def read_result(max: U32,
  result: File & Result<&1, &1, U32 & String, String>) -> IO(Read):
  (file, answer) = result
  read_after_close(True{}, 0, file, answer)

def read_size_choice(+max: U32, large: Bool, file: File) -> IO(Read):
  match large:
    case True{}:
      do IO<Read>:
        Unit <- File.close(file)
        IO.pure(Read, Read{True{}, 9001, ""})
    case False{}:
      do IO<Read>:
        value : File & Result<&1, &1, U32 & String, String> <- File.read(file, max)
        read_result(max, value)

def read_sized(+max: U32, file: File,
  answer: Result<&1, &1, U32 & String, U32>) -> IO(Read):
  match answer:
    case Fail{(code, _)}:
      do IO<Read>:
        Unit <- File.close(file)
        IO.pure(Read, Read{True{}, code, ""})
    case Done{size}:
      read_size_choice(max, U32.is_gt(size, max), file)

def read_size_result(max: U32,
  result: File & Result<&1, &1, U32 & String, U32>) -> IO(Read):
  (file, answer) = result
  read_sized(max, file, answer)

def read_open_error(+code: U32) -> Read:
  +missing = Bool.or(U32.is_eq(code, 2), U32.is_eq(code, U32.sub(0, 2)))
  Read{Bool.not(missing), Bool.pick(U32, missing, 0, code), ""}

def read_open(+max: U32,
  opened: Result<&1, &1, U32 & String, File>) -> IO(Read):
  match opened:
    case Fail{(code, _)}:
      IO.pure(Read, read_open_error(code))
    case Done{file}:
      do IO<Read>:
        sized : File & Result<&1, &1, U32 & String, U32> <- File.size(file)
        read_size_result(max, sized)

def read_file(+max: U32, path: String) -> IO(Read):
  do IO<Read>:
    opened : Result<&1, &1, U32 & String, File> <- File.open(path, "r")
    read_open(max, opened)

def slot_filename(slot: U32) -> String:
  Bool.pick(String, U32.is_zero(slot), "rift-chess-cli-a.json",
    "rift-chess-cli-b.json")

def slot_path(+directory: String, +slot: U32) -> String:
  Bool.pick(String, String.is_empty(directory), slot_filename(slot),
    String.append(directory, String.append("/", slot_filename(slot))))

def path_from_env(+slot: U32,
  directory: Result<&1, &1, U32 & String, String>) -> String:
  match directory:
    case Done{path}: slot_path(path, slot)
    case Fail{_}: slot_filename(slot)

def sequence_value(+value: Maybe<&2, Json.Value>) -> Maybe<&2, U32>:
  match value:
    case Some{Json.Number{value, lexeme}}:
      U32.read(lexeme)
    case _: None{}

def payload_value(+value: Maybe<&2, Json.Value>) -> Maybe<&2, String>:
  match value:
    case Some{Json.Text{text}}:
      Some{text}
    case _: None{}

def payload_schema(ok: Bool, +sequence: Maybe<&2, U32>, text: String)
  -> Maybe<&2, Payload>:
  match ok sequence:
    case True{} Some{seq}:
      Some{Payload{seq, text}}
    case _ _:
      None{}

def payload_components_text(+schema: Maybe<&2, Json.Value>,
  +sequence: Maybe<&2, Json.Value>, +text: Maybe<&2, String>) -> Maybe<&2, Payload>:
  match schema sequence text:
    case Some{Json.Text{schema_text}} Some{seq_value} Some{record_text}:
      payload_schema(Json.equal(schema_text, "rift-bend-cli-store/1"),
        sequence_value(Some{seq_value}), record_text)
    case _ _ _:
      None{}

def payload_components(+schema: Maybe<&2, Json.Value>,
  +sequence: Maybe<&2, Json.Value>, +text: Maybe<&2, Json.Value>)
  -> Maybe<&2, Payload>:
  payload_components_text(schema, sequence, payload_value(text))

def payload_fields(ok: Bool, +object: Json.Value) -> Maybe<&2, Payload>:
  match ok:
    case False{}:
      None{}
    case True{}:
      payload_components(Json.field(object, "schema"),
        Json.field(object, "sequence"), Json.field(object, "record"))

def payload_object(+value: Maybe<&2, Json.Value>) -> Maybe<&2, Payload>:
  match value:
    case Some{Json.Object{fields}}:
      payload_fields(Nat.is_eq(List.length(&2, Json.Value, fields), 3n),
        Json.Object{fields})
    case _:
      None{}

def parse_payload(text: String) -> Maybe<&2, Payload>:
  payload_object(Json.parse(text))

def replay_commands(commands: List<&2, Match.Command>, +game: Match.Match,
  pending: Maybe<&2, Match.StepResult>) -> Maybe<&2, Match.Match>:
  match commands pending:
    case [] None{}:
      Some{game}
    case [] Some{Match.Accepted{+next}}:
      Some{next}
    case [] Some{Match.Rejected{old}}:
      None{}
    case command <> rest None{}:
      replay_commands(rest, game, Some{Rules.command(game, command)})
    case command <> rest Some{Match.Accepted{+next}}:
      replay_commands(rest, next, Some{Rules.command(next, command)})
    case _ Some{Match.Rejected{old}}:
      None{}

def replay_finish(record: Codec.Record, sequence: U32, slot: U32,
  game: Maybe<&2, Match.Match>) -> Snapshot:
  match game:
    case Some{value}:
      Snapshot{slot, True{}, True{}, sequence, Some{record}, Some{value}, 0}
    case None{}:
      Snapshot{slot, True{}, False{}, 0, None{}, None{}, 9002}

def replay_policy(record: Codec.Record, sequence: U32, slot: U32,
  layout: Bool, policy: Maybe<&2, Match.DrawPolicy>,
  commands: List<&2, Match.Command>) -> Snapshot:
  match policy:
    case Some{draw_policy}:
      replay_finish(record, sequence, slot,
        replay_commands(commands, Rules.start(layout, draw_policy), None{}))
    case None{}:
      Snapshot{slot, True{}, False{}, 0, None{}, None{}, 9002}

def replay_record(+record: Codec.Record, sequence: U32, slot: U32) -> Snapshot:
  match record:
    case Codec.Record{layout, policy, +commands}:
      replay_policy(record, sequence, slot, layout,
        layout_policy(policy), commands)

def payload_sequence(payload: Payload) -> U32:
  match payload:
    case Payload{sequence, text}:
      sequence

def payload_text(payload: Payload) -> String:
  match payload:
    case Payload{sequence, text}:
      text

def parsed_record(payload: Payload, slot: U32,
  record: Maybe<&2, Codec.Record>) -> Snapshot:
  match record:
    case Some{value}:
      replay_record(value, payload_sequence(payload), slot)
    case None{}:
      Snapshot{slot, True{}, False{}, 0, None{}, None{}, 9002}

def parsed_payload(slot: U32, payload: Maybe<&2, Payload>) -> Snapshot:
  match payload:
    case Some{+value}:
      parsed_record(value, slot, Codec.decode(payload_text(value)))
    case None{}:
      Snapshot{slot, True{}, False{}, 0, None{}, None{}, 9002}

def parse_snapshot_text(slot: U32, no_error: Bool, error: U32,
  text: String) -> Snapshot:
  match no_error:
    case True{}: parsed_payload(slot, parse_payload(text))
    case False{}: Snapshot{slot, True{}, False{}, 0, None{}, None{}, error}

def parse_snapshot(slot: U32, read: Read) -> Snapshot:
  match read:
    case Read{present, +error, text}:
      match present error:
        case False{} _: Snapshot{slot, False{}, False{}, 0, None{}, None{}, 0}
        case True{} +code:
          parse_snapshot_text(slot, U32.is_zero(code), code, text)

def read_slot(+slot: U32) -> IO(Snapshot):
  do IO<Snapshot>:
    directory : Result<&1, &1, U32 & String, String> <- IO.get_env("RIFT_CHESS_SAVE_DIR")
    path : String = path_from_env(slot, directory)
    read : Read <- read_file(4200000, path)
    IO.pure(Snapshot, parse_snapshot(slot, read))

def snapshot_error(snapshot: Snapshot) -> U32:
  match snapshot:
    case Snapshot{slot, present, valid, sequence, record, game, error}:
      error

def snapshot_valid(snapshot: Snapshot) -> Bool:
  match snapshot:
    case Snapshot{slot, present, valid, sequence, record, game, error}:
      valid

def snapshot_present(snapshot: Snapshot) -> Bool:
  match snapshot:
    case Snapshot{slot, present, valid, sequence, record, game, error}:
      present

def snapshot_sequence(snapshot: Snapshot) -> U32:
  match snapshot:
    case Snapshot{slot, present, valid, sequence, record, game, error}:
      sequence

def snapshot_store_record(slot: U32, sequence: U32, record: Codec.Record,
  game: Match.Match) -> Store:
  match record:
    case Codec.Record{layout, policy, commands}:
      Store{game, layout, policy, commands, sequence, slot}

def snapshot_store(snapshot: Snapshot) -> Maybe<&2, Store>:
  match snapshot:
    case Snapshot{slot, True{}, True{}, sequence, Some{record}, Some{game}, _}:
      Some{snapshot_store_record(slot, sequence, record, game)}
    case _:
      None{}

def selected_from(value: Maybe<&2, Store>) -> Load:
  match value:
    case Some{store}:
      Selected{store}
    case None{}:
      Failed{9002}

def selected(snapshot: Snapshot) -> Load:
  selected_from(snapshot_store(snapshot))

def choose_one_flags(valid: Snapshot, error: U32, no_error: Bool,
  recoverable: Bool) -> Load:
  match no_error recoverable:
    case True{} _: selected(valid)
    case _ True{}: selected(valid)
    case _ _: Failed{error}

def choose_one(valid: Snapshot, other: Snapshot) -> Load:
  +error = snapshot_error(other)
  choose_one_flags(valid, error, U32.is_zero(error), U32.is_eq(error, 9002))

def choose_latest(+a: Snapshot, +b: Snapshot) -> Load:
  Bool.pick(Load, U32.is_ge(snapshot_sequence(a), snapshot_sequence(b)),
    selected(a), selected(b))

def no_valid_flags(+a: Snapshot, +b: Snapshot, present_a: Bool,
  present_b: Bool) -> Load:
  match present_a present_b:
    case False{} False{}:
      Fresh{Store{Rules.start(True{}, Match.Prompt{}), True{}, 0, [], 0, 1}}
    case _ _:
      +error_a = snapshot_error(a)
      +error_b = snapshot_error(b)
      +unknown_a = Bool.and(U32.is_ne(error_a, 0), U32.is_ne(error_a, 9002))
      +unknown_b = Bool.and(U32.is_ne(error_b, 0), U32.is_ne(error_b, 9002))
      Bool.pick(Load, unknown_a, Failed{error_a},
        Bool.pick(Load, unknown_b, Failed{error_b}, Failed{9002}))

def no_valid(+a: Snapshot, +b: Snapshot) -> Load:
  no_valid_flags(a, b, snapshot_present(a), snapshot_present(b))

def choose_snapshot_flags(+a: Snapshot, +b: Snapshot, valid_a: Bool,
  valid_b: Bool) -> Load:
  match valid_a valid_b:
    case True{} True{}:
      choose_latest(a, b)
    case True{} False{}:
      choose_one(a, b)
    case False{} True{}:
      choose_one(b, a)
    case False{} False{}:
      no_valid(a, b)

def choose_snapshots(+a: Snapshot, +b: Snapshot) -> Load:
  choose_snapshot_flags(a, b, snapshot_valid(a), snapshot_valid(b))

def write_close(file: File,
  answer: Result<&1, &1, U32 & String, Unit>) -> IO(Save):
  match answer:
    case Fail{(code, _)}:
      do IO<Save>:
        Unit <- File.close(file)
        IO.pure(Save, Save{False{}, code})
    case Done{value}:
      do IO<Save>:
        Unit <- File.close(file)
        IO.pure(Save, Save{True{}, 0})

def write_result(result: File & Result<&1, &1, U32 & String, Unit>) -> IO(Save):
  (file, answer) = result
  write_close(file, answer)

def write_open(+text: String,
  opened: Result<&1, &1, U32 & String, File>) -> IO(Save):
  match opened:
    case Fail{(code, _)}:
      IO.pure(Save, Save{False{}, code})
    case Done{file}:
      do IO<Save>:
        written : File & Result<&1, &1, U32 & String, Unit> <- File.write(file, text)
        write_result(written)

def write_slot(slot: U32, text: String) -> IO(Save):
  do IO<Save>:
    directory : Result<&1, &1, U32 & String, String> <- IO.get_env("RIFT_CHESS_SAVE_DIR")
    path : String = path_from_env(slot, directory)
    opened : Result<&1, &1, U32 & String, File> <- File.open(path, "w")
    write_open(text, opened)

def number(+value: U32) -> Json.Value:
  Json.Number{U32.to_f32(value), U32.show(value)}

def envelope(record: Codec.Record, sequence: U32) -> String:
  Json.stringify(Json.Object{[
    Json.Field{"schema", Json.Text{"rift-bend-cli-store/1"}},
    Json.Field{"sequence", number(sequence)},
    Json.Field{"record", Json.Text{Codec.encode(record)}}]})

def store_record(store: Store) -> Codec.Record:
  match store:
    case Store{game, layout, policy, commands, sequence, active}:
      Codec.Record{layout, policy, commands}

def target_slot(active: U32) -> U32:
  Bool.pick(U32, U32.is_zero(active), 1, 0)

def piece_symbol(piece: U32) -> String:
  match piece:
    case 0: ".."
    case 1: "P "
    case 7: "P "
    case 2: "R "
    case 10: "r "
    case 3: "N "
    case 11: "n "
    case 4: "B "
    case 12: "b "
    case 5: "Q "
    case 13: "q "
    case 6: "K "
    case 14: "k "
    case 9: "p "
    case 15: "p "
    case _: "??"

def board_cell_ready(pos: Model.Position, square: U32,
  present: Bool) -> String:
  match present:
    case False{}: "##"
    case True{}: piece_symbol(Model.board_get(Model.pos_board(pos), square))

def board_cell(+pos: Model.Position, +square: U32) -> String:
  board_cell_ready(pos, square,
    Model.present(Model.pos_holes(pos), square))

def board_square(+index: U32) -> U32:
  +rank = U32.sub(7, U32.div(index, 8))
  Model.sq(U32.mod(index, 8), rank)

def board_prefix(+index: U32) -> String:
  +file = U32.mod(index, 8)
  Bool.pick(String, U32.is_zero(file),
    String.append(U32.show(U32.sub(8, U32.div(index, 8))), " "), "")

def board_separator(index: U32) -> String:
  Bool.pick(String, U32.is_eq(U32.mod(index, 8), 7), "\n", " ")

def board_go(n: Nat, +index: U32, +pos: Model.Position, +acc: String) -> String:
  match n:
    case Zero{}:
      String.append(acc, "  a b c d e f g h\n")
    case Succ{rest}:
      +square = board_square(index)
      +piece = board_cell(pos, square)
      +cell = String.append(board_prefix(index), String.append(piece,
        board_separator(index)))
      board_go(rest, U32.add(index, 1), pos, String.append(acc, cell))

def board_text(pos: Model.Position) -> String:
  board_go(64n, 0, pos, "")

def square_name(+square: U32) -> String:
  String.append(String.from_list([Chr{U32.add(97, Model.file_of(square))}]),
    U32.show(U32.add(Model.rank_of(square), 1)))

def promotion_name(promotion: U32) -> String:
  match promotion:
    case 0: ""
    case 1: "=Q"
    case 2: "=R"
    case 3: "=B"
    case 4: "=N"
    case _: "= ?"

def action_label_decoded(action: Maybe<&1, Model.Action>) -> String:
  match action:
    case Some{Model.MoveAction{from, to, promotion}}:
      String.append(square_name(from), String.append("-",
        String.append(square_name(to), promotion_name(promotion))))
    case Some{Model.ShiftAction{from, to, promotion}}:
      String.append("SHIFT tile ", String.append(U32.show(U32.add(from, 1)),
        String.append("-", String.append(U32.show(U32.add(to, 1)),
          promotion_name(promotion)))))
    case None{}:
      "invalid action"

def action_label(id: U32) -> String:
  action_label_decoded(Model.decode(id))

def action_line(+id: U32) -> String:
  String.append("[", String.append(U32.show(id),
    String.append("] ", action_label(id))))

def legal_lines(xs: List<&2, U32>, +acc: String) -> String:
  match xs:
    case []:
      acc
    case +id <> rest:
      legal_lines(rest, String.append(acc,
        String.append(action_line(id), "\n")))

def legal_text(ids: List<&2, U32>) -> String:
  legal_lines(ids, "")

def side_name(side: Bool) -> String:
  Bool.pick(String, side, "White", "Black")

def layout_name(layout: Bool) -> String:
  Bool.pick(String, layout, "B", "C")

def policy_name(policy: U32) -> String:
  match policy:
    case 0: "prompt"
    case 1: "automatic 100-ply"
    case 2: "off"
    case _: "invalid"

def outcome_text(result: Maybe<&1, Match.Outcome>) -> String:
  match result:
    case None{}: "Game in progress"
    case Some{Match.WhiteCheckmate{}}: "White wins by checkmate"
    case Some{Match.BlackCheckmate{}}: "Black wins by checkmate"
    case Some{Match.Stalemate{}}: "Draw by stalemate"
    case Some{Match.BareKings{}}: "Draw: bare kings"
    case Some{Match.Threefold{}}: "Draw by threefold repetition"
    case Some{Match.Progress100{}}: "Draw at 100 quiet plies"
    case Some{Match.Agreed{}}: "Draw by agreement"
    case Some{Match.WhiteResignedOutcome{}}: "Black wins: White resigned"
    case Some{Match.BlackResignedOutcome{}}: "White wins: Black resigned"

def offer_text(game: Match.Match) -> String:
  match game:
    case Match.Match{initial, state, actions, states, keys, revision, policy,
      offer, forced}:
      match offer:
        case Match.NoOffer{}: ""
        case Match.Offered{side}:
          String.append("Draw offered by ", String.append(side_name(side), "\n"))

def quiet_notice(policy: U32, quiet: U32) -> String:
  Bool.pick(String,
    Bool.and(U32.is_zero(policy), U32.is_ge(quiet, 100)),
    "100 quiet plies reached: offer, accept, or decline a draw.\n", "")

def render_header(+game: Match.Match, layout: Bool, policy: U32) -> String:
  +pos = position(game)
  +quiet = U32.from_nat(Model.pos_quiet(pos))
  +layout_text = String.append("RIFT CHESS | Layout ", layout_name(layout))
  +policy_text = String.append(" | Draws ", policy_name(policy))
  +turn_text = String.append(" | ", side_name(Model.pos_side(pos)))
  String.append(layout_text, String.append(policy_text,
    String.append(turn_text, String.append(" to move | quiet ",
      String.append(U32.show(quiet), "\n")))))

def render(store: Store) -> String:
  match store:
    case Store{+game, layout, +policy, commands, sequence, active}:
      +pos = position(game)
      +quiet = U32.from_nat(Model.pos_quiet(pos))
      String.append(render_header(game, layout, policy),
        String.append(board_text(pos),
          String.append(offer_text(game),
            String.append(outcome_text(Rules.outcome(game)),
              String.append("\n", quiet_notice(policy, quiet))))))

def help_text() -> String:
  "Commands: moves | show | move ID | shift ID | undo confirm | offer [white|black] | accept | decline | resign [white|black] | new [B|C] [prompt|auto|off] | help\nEach invocation takes one action. IDs are printed with coordinates, promotions, and platform shifts.\n"

# Position-level legal IDs can still exist after the match has ended by
# agreement or resignation. Only the complete match boundary may advertise an
# action as playable.
def available_ids_result(outcome: Maybe<&1, Match.Outcome>, +game: Match.Match) -> List<&2, U32>:
  match outcome:
    case Some{_}: []
    case None{}: Rules.legal_ids(position(game))

def available_ids(+game: Match.Match) -> List<&2, U32>:
  available_ids_result(Rules.outcome(game), game)

def render_moves(+store: Store) -> String:
  match store:
    case Store{+game, layout, policy, commands, sequence, active}:
      +ids = available_ids(game)
      String.append(render(store), String.append("\nLEGAL ACTIONS (use the bracketed ID):\n",
        String.append(legal_text(ids),
          String.append("\n", help_text()))))

def stored_display(record: Codec.Record, game: Match.Match, sequence: U32,
  active: U32) -> IO(Unit):
  match record:
    case Codec.Record{layout, policy, commands}:
      IO.print(render_moves(Store{game, layout, policy, commands, sequence, active}))

def after_save(+record: Codec.Record, game: Match.Match, sequence: U32,
  active: U32, saved: Save) -> IO(Unit):
  match saved:
    case Save{True{}, _}:
      stored_display(record, game, sequence, active)
    case Save{False{}, code}:
      IO.die(Unit, code,
        "Save failed; the previous valid snapshot remains available.")

def write_record(+record: Codec.Record, game: Match.Match, +sequence: U32,
  active: U32) -> IO(Unit):
  +target = target_slot(active)
  do IO<Unit>:
    saved : Save <- write_slot(target, envelope(record, sequence))
    after_save(record, game, sequence, target, saved)

def persist_choice(+record: Codec.Record, game: Match.Match, sequence: U32,
  active: U32, at_limit: Bool) -> IO(Unit):
  match at_limit:
    case True{}:
      IO.die(Unit, 75, "CLI save sequence is exhausted; export the record first.")
    case False{}:
      write_record(record, game, U32.add(sequence, 1), active)

def persist(+store: Store, +record: Codec.Record, game: Match.Match) -> IO(Unit):
  match store:
    case Store{old_game, layout, policy, commands, sequence, active}:
      persist_choice(record, game, sequence, active,
        U32.is_eq(sequence, 4294967295))

def command_record(store: Store, command: Match.Command) -> Codec.Record:
  match store:
    case Store{game, layout, policy, commands, sequence, active}:
      Codec.Record{layout, policy,
        List.append(&2, Match.Command, commands, [command])}

def after_command(+store: Store, command: Match.Command,
  result: Match.StepResult) -> IO(Unit):
  match result:
    case Match.Accepted{+next}:
      persist(store, command_record(store, command), next)
    case Match.Rejected{old}:
      do IO<Unit>:
        Unit <- IO.print_err("That command is not legal in the current match.\n")
        IO.print(render_moves(store))

def submit_command(+store: Store, +command: Match.Command) -> IO(Unit):
  match store:
    case Store{+game, layout, policy, commands, sequence, active}:
      after_command(store, command, Rules.command(game, command))

def id_in_list(xs: List<&2, U32>, +id: U32) -> Bool:
  match xs:
    case []: False{}
    case h <> rest:
      Bool.or(U32.is_eq(h, id), id_in_list(rest, id))

def move_kind_ok(+id: U32, shift: Bool) -> Bool:
  Bool.pick(Bool, shift, U32.is_ge(id, 20480), U32.is_lt(id, 20480))

def move_legal_ready(+store: Store, +id: U32) -> IO(Unit):
  match store:
    case Store{+game, layout, policy, commands, sequence, active}:
      submit_command(store, Match.MoveCommand{revision(game), id})

def move_legal(+store: Store, +id: U32, legal: Bool) -> IO(Unit):
  match legal:
    case False{}:
      do IO<Unit>:
        Unit <- IO.print_err("That ID is not a legal action. Run `moves` to list current IDs.\n")
        IO.print(render_moves(store))
    case True{}:
      move_legal_ready(store, id)

def move_typed_ready(+store: Store, +id: U32, shift: Bool) -> IO(Unit):
  match store:
    case Store{+game, layout, policy, commands, sequence, active}:
      move_legal(store, id, id_in_list(available_ids(game), id))

def move_typed(+store: Store, +id: U32, shift: Bool,
  correct_kind: Bool) -> IO(Unit):
  match correct_kind:
    case False{}:
      do IO<Unit>:
        Unit <- IO.print_err("Use `move ID` for piece moves and `shift ID` for platform shifts.\n")
        IO.print(render_moves(store))
    case True{}:
      move_typed_ready(store, id, shift)

def move_parsed(+store: Store, +id: U32, +shift: Bool,
  parsed: Bool) -> IO(Unit):
  match parsed:
    case False{}:
      do IO<Unit>:
        Unit <- IO.print_err("Expected a numeric action ID.\n")
        IO.print(render_moves(store))
    case True{}:
      move_typed(store, id, shift, move_kind_ok(id, shift))

def move_read_result(+store: Store, shift: Bool,
  parsed: Maybe<&2, U32>) -> IO(Unit):
  match parsed:
    case Some{id}:
      move_parsed(store, id, shift, True{})
    case None{}:
      move_parsed(store, 0, shift, False{})

def move_argument(rest: List<String>, +store: Store,
  shift: Bool) -> IO(Unit):
  match rest:
    case []:
      do IO<Unit>:
        Unit <- IO.print_err("Missing action ID. Run `moves` to list IDs.\n")
        IO.print(render_moves(store))
    case text <> _:
      move_read_result(store, shift, U32.read(text))

def command_word(+word: String) -> U32:
  Bool.pick(U32, String.eq(word, "help"), 1,
    Bool.pick(U32, String.eq(word, "show"), 2,
      Bool.pick(U32, String.eq(word, "moves"), 3,
        Bool.pick(U32, String.eq(word, "move"), 4,
          Bool.pick(U32, String.eq(word, "shift"), 5,
            Bool.pick(U32, String.eq(word, "undo"), 6,
              Bool.pick(U32, String.eq(word, "offer"), 7,
                Bool.pick(U32, String.eq(word, "accept"), 8,
                  Bool.pick(U32, String.eq(word, "decline"), 9,
                    Bool.pick(U32, String.eq(word, "resign"), 10,
                      Bool.pick(U32, String.eq(word, "new"), 11,
                        Bool.pick(U32, String.eq(word, "confirm"), 12,
                          Bool.pick(U32, String.eq(String.to_lower(word), "white"), 13,
                            Bool.pick(U32, String.eq(String.to_lower(word), "black"), 14, 0))))))))))))))

def side_command(offer: Bool, expected: Nat, side: Bool) -> Match.Command:
  match offer:
    case True{}: Match.OfferCommand{expected, side}
    case False{}: Match.ResignCommand{expected, side}

def submit_side_command(+store: Store, side: Bool, offer: Bool,
  expected: Nat) -> IO(Unit):
  submit_command(store, side_command(offer, expected, side))

def side_action(+store: Store, side: Bool, offer: Bool) -> IO(Unit):
  match store:
    case Store{+game, layout, policy, commands, sequence, active}:
      submit_side_command(store, side, offer, revision(game))

def side_value(code: U32) -> Maybe<&2, Bool>:
  match code:
    case 13: Some{True{}}
    case 14: Some{False{}}
    case _: None{}

def side_argument_result(+store: Store, offer: Bool,
  value: Maybe<&2, Bool>) -> IO(Unit):
  match value:
    case Some{side}:
      side_action(store, side, offer)
    case None{}:
      do IO<Unit>:
        Unit <- IO.print_err("Use `white` or `black` for the hotseat player.\n")
        IO.print(render_moves(store))

def side_argument(+store: Store, args: List<String>,
  default: Bool, offer: Bool) -> IO(Unit):
  match args:
    case []:
      side_argument_result(store, offer, Some{default})
    case word <> _:
      side_argument_result(store, offer,
        side_value(command_word(word)))

def answer_side(+game: Match.Match) -> Bool:
  match game:
    case Match.Match{initial, state, actions, states, keys, revision, policy,
      offer, forced}:
      match offer:
        case Match.Offered{side}: Bool.not(side)
        case Match.NoOffer{}: Model.pos_side(state)

def response_command(accept: Bool, expected: Nat, side: Bool) -> Match.Command:
  match accept:
    case True{}: Match.AcceptCommand{expected, side}
    case False{}: Match.DeclineCommand{expected, side}

def submit_response(+store: Store, accept: Bool, side: Bool,
  expected: Nat) -> IO(Unit):
  submit_command(store, response_command(accept, expected, side))

def answer_offer(+store: Store, accept: Bool) -> IO(Unit):
  match store:
    case Store{+game, layout, policy, commands, sequence, active}:
      submit_response(store, accept, answer_side(game), revision(game))

def submit_undo(+store: Store, expected: Nat) -> IO(Unit):
  submit_command(store, Match.UndoCommand{expected})

def undo_command(+store: Store) -> IO(Unit):
  match store:
    case Store{+game, layout, policy, commands, sequence, active}:
      submit_undo(store, revision(game))

def undo_confirmed(+store: Store, confirmed: Bool) -> IO(Unit):
  match confirmed:
    case False{}:
      do IO<Unit>:
        Unit <- IO.print_err("Hotseat undo requires explicit consent: `undo confirm`.\n")
        IO.print(render_moves(store))
    case True{}:
      undo_command(store)

def undo_argument(rest: List<String>, +store: Store) -> IO(Unit):
  match rest:
    case []:
      undo_confirmed(store, False{})
    case word <> _:
      undo_confirmed(store, U32.is_eq(command_word(word), 12))

def new_layout_choice(is_b: Bool, is_c: Bool) -> Maybe<&2, Bool>:
  match is_b is_c:
    case True{} _: Some{True{}}
    case _ True{}: Some{False{}}
    case _ _: None{}

def new_layout_word(+word: String) -> Maybe<&2, Bool>:
  new_layout_choice(String.eq(String.to_upper(word), "B"),
    String.eq(String.to_upper(word), "C"))

def new_policy_choice(prompt: Bool, automatic: Bool, off: Bool)
  -> Maybe<&2, U32>:
  match prompt automatic off:
    case True{} _ _: Some{0}
    case _ True{} _: Some{1}
    case _ _ True{}: Some{2}
    case _ _ _: None{}

def new_policy_word(+word: String) -> Maybe<&2, U32>:
  new_policy_choice(String.eq(String.to_lower(word), "prompt"),
    String.eq(String.to_lower(word), "auto"),
    String.eq(String.to_lower(word), "off"))

def new_persist(+store: Store, +layout: Bool, policy: U32,
  draw: Match.DrawPolicy) -> IO(Unit):
  persist(store, Codec.Record{layout, policy, []}, Rules.start(layout, draw))

def new_policy_draw(+store: Store, layout: Bool, policy: U32,
  draw: Maybe<&2, Match.DrawPolicy>) -> IO(Unit):
  match draw:
    case Some{value}:
      new_persist(store, layout, policy, value)
    case None{}:
      do IO<Unit>:
        Unit <- IO.print_err("Draw policy must be prompt, auto, or off.\n")
        IO.print(render_moves(store))

def new_policy_value(+store: Store, layout: Bool,
  policy: Maybe<&2, U32>) -> IO(Unit):
  match policy:
    case Some{+value}:
      new_policy_draw(store, layout, value, layout_policy(value))
    case None{}:
      do IO<Unit>:
        Unit <- IO.print_err("Draw policy must be prompt, auto, or off.\n")
        IO.print(render_moves(store))

def new_policy_args(+store: Store, layout: Bool,
  rest: List<String>) -> IO(Unit):
  match rest:
    case []:
      new_policy_value(store, layout, Some{0})
    case word <> _:
      new_policy_value(store, layout, new_policy_word(word))

def new_layout_args(+store: Store, layout: Maybe<&2, Bool>,
  rest: List<String>) -> IO(Unit):
  match layout:
    case None{}:
      do IO<Unit>:
        Unit <- IO.print_err("Layout must be B or C.\n")
        IO.print(render_moves(store))
    case Some{value}:
      new_policy_args(store, value, rest)

def new_arguments(rest: List<String>, +store: Store) -> IO(Unit):
  match rest:
    case []:
      new_policy_value(store, True{}, Some{0})
    case word <> tail:
      new_layout_args(store, new_layout_word(word), tail)

def game_in(store: Store) -> Match.Match:
  match store:
    case Store{game, layout, policy, commands, sequence, active}:
      game

def unknown_command(+store: Store) -> IO(Unit):
  do IO<Unit>:
    Unit <- IO.print_err("Unknown command.\n")
    IO.print(String.append(help_text(), render_moves(store)))

def dispatch_word(code: U32, rest: List<String>, +store: Store)
  -> IO(Unit):
  match code:
    case 1:
      do IO<Unit>:
        Unit <- IO.print(help_text())
        IO.print(render_moves(store))
    case 2: IO.print(render(store))
    case 3: IO.print(render_moves(store))
    case 4: move_argument(rest, store, False{})
    case 5: move_argument(rest, store, True{})
    case 6: undo_argument(rest, store)
    case 7: side_argument(store, rest, side(game_in(store)), True{})
    case 8: answer_offer(store, True{})
    case 9: answer_offer(store, False{})
    case 10: side_argument(store, rest, side(game_in(store)), False{})
    case 11: new_arguments(rest, store)
    case _: unknown_command(store)

def dispatch(args: List<String>, +store: Store) -> IO(Unit):
  match args:
    case []: IO.print(render_moves(store))
    case word <> rest:
      dispatch_word(command_word(word), rest, store)

def start_loaded(args: List<String>, loaded: Load) -> IO(Unit):
  match loaded:
    case Selected{store}: dispatch(args, store)
    case Fresh{store}: dispatch(args, store)
    case Failed{error}:
      IO.die(Unit, error,
        "Both CLI snapshots are invalid or unreadable. Preserve or repair them before continuing.")

def main() -> IO(Unit):
  do IO<Unit>:
    a : Snapshot <- read_slot(0)
    b : Snapshot <- read_slot(1)
    args : List<String> <- IO.args()
    start_loaded(args, choose_snapshots(a, b))
