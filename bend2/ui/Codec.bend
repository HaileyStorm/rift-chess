import Base

# rift-bend-record/1 portable text only. Decoding never constructs a Match or
# executes a command; the caller must replay these commands through Kernel.
# Exact integer lexemes are mandatory: canonical previous-host JSON.stringify
# records are supported; exponent/decimal spellings (including 1e0/1.0) reject.
# This deliberately avoids accepting fractional numbers rounded to F32 integers.
import ./Json.bend as Json
import ../core/MatchSpec.bend as Match

type Record is Data:
  Record{layout: Bool, policy: U32, commands: List<&2, Match.Command>}
def exact_size(+v: Json.Value, +n: Nat) -> Bool:
  match v:
    case Json.Object{fields}: Nat.is_eq(List.length(&2, Json.Value, fields), n)
    case _: False{}
def integer_end(+ok: Bool, +n: U32) -> Maybe<&2, U32>:
  match ok:
    case True{}: Some{n}
    case False{}: None{}
def digits(+s: String, +acc: U32, +limit: U32, +valid: Bool) -> Maybe<&2, U32>:
  match s:
    case SNil{}: integer_end(valid, acc)
    case SCon{Chr{+c}, tail}: digits(tail, U32.min(1000000, U32.add(U32.mul(acc, 10), U32.sub(c, 48))), limit, Bool.and(valid, Bool.and(Json.digit(c), U32.is_le(U32.add(U32.mul(acc, 10), U32.sub(c, 48)), limit))))
def integer(+v: Maybe<&2, Json.Value>, +limit: U32) -> Maybe<&2, U32>:
  match v:
    case Some{Json.Number{value, lexeme}}: digits(lexeme, 0, limit, Bool.not(String.is_empty(lexeme)))
    case _: None{}
def boolean(+v: Maybe<&2, Json.Value>) -> Maybe<&2, Bool>:
  match v:
    case Some{Json.Boolean{b}}: Some{b}
    case _: None{}
def text_is(+v: Maybe<&2, Json.Value>, +expected: String) -> Bool:
  match v:
    case Some{Json.Text{s}}: Json.equal(s, expected)
    case _: False{}
def layout_pick(+b: Bool, +c: Bool) -> Maybe<&2, Bool>:
  match b c:
    case True{} _: Some{True{}}
    case _ True{}: Some{False{}}
    case _ _: None{}
def layout(+v: Maybe<&2, Json.Value>) -> Maybe<&2, Bool>:
  match v:
    case Some{Json.Text{+s}}: layout_pick(Json.equal(s, "B"), Json.equal(s, "C"))
    case _: None{}
def move_command(+ok: Bool, +action: Maybe<&2, U32>, +e: U32) -> Maybe<&2, Match.Command>:
  match ok action:
    case True{} Some{a}: Some{Match.MoveCommand{U32.to_nat(e), a}}
    case _ _: None{}
def undo_command(+ok: Bool, +e: U32) -> Maybe<&2, Match.Command>:
  match ok:
    case True{}: Some{Match.UndoCommand{U32.to_nat(e)}}
    case False{}: None{}
def side_kind(+a: Bool, +b: Bool, +c: Bool, +d: Bool, +e: U32, +side: Bool) -> Maybe<&2, Match.Command>:
  match a b c d:
    case True{} _ _ _: Some{Match.OfferCommand{U32.to_nat(e), side}}
    case _ True{} _ _: Some{Match.AcceptCommand{U32.to_nat(e), side}}
    case _ _ True{} _: Some{Match.DeclineCommand{U32.to_nat(e), side}}
    case _ _ _ True{}: Some{Match.ResignCommand{U32.to_nat(e), side}}
    case _ _ _ _: None{}
def side_command(+ok: Bool, +side: Maybe<&2, Bool>, +e: U32, +k: String) -> Maybe<&2, Match.Command>:
  match ok side:
    case True{} Some{b}: side_kind(Json.equal(k, "OfferCommand"), Json.equal(k, "AcceptCommand"), Json.equal(k, "DeclineCommand"), Json.equal(k, "ResignCommand"), e, b)
    case _ _: None{}
def command_choose(+move: Bool, +undo: Bool, +v: Json.Value, +e: U32, +k: String) -> Maybe<&2, Match.Command>:
  match move undo:
    case True{} _: move_command(exact_size(v, 3n), integer(Json.field(v, "action"), 21759), e)
    case _ True{}: undo_command(exact_size(v, 2n), e)
    case _ _: side_command(exact_size(v, 3n), boolean(Json.field(v, "side")), e, k)
def command_kind(+v: Json.Value, +e: U32, +k: String) -> Maybe<&2, Match.Command>:
  command_choose(text_is(Some{Json.Text{k}}, "MoveCommand"), text_is(Some{Json.Text{k}}, "UndoCommand"), v, e, k)
def command_fields(+expected: Maybe<&2, U32>, +kind: Maybe<&2, Json.Value>, +v: Json.Value) -> Maybe<&2, Match.Command>:
  match expected kind:
    case Some{e} Some{Json.Text{k}}: command_kind(v, e, k)
    case _ _: None{}
def command(+v: Json.Value) -> Maybe<&2, Match.Command>:
  command_fields(integer(Json.field(v, "expected"), 20000), Json.field(v, "$"), v)
def prepend(+a: Maybe<&2, Match.Command>, +b: Maybe<&2, List<&2, Match.Command>>) -> Maybe<&2, List<&2, Match.Command>>:
  match a b:
    case Some{x} Some{xs}: Some{x <> xs}
    case _ _: None{}
def reverse_commands(cs: Maybe<&2, List<&2, Match.Command>>) -> Maybe<&2, List<&2, Match.Command>>:
  match cs:
    case None{}: None{}
    case Some{xs}: Some{List.reverse(&2, Match.Command, xs)}
def commands_go(xs: List<&2, Json.Value>, fuel: Nat, acc: Maybe<&2, List<&2, Match.Command>>) -> Maybe<&2, List<&2, Match.Command>>:
  match xs fuel:
    case [] _: reverse_commands(acc)
    case _ Zero{}: None{}
    case h <> t Succ{p}: commands_go(t, p, prepend(command(h), acc))
def commands(xs: List<&2, Json.Value>, fuel: Nat) -> Maybe<&2, List<&2, Match.Command>>:
  commands_go(xs, fuel, Some{[]})
def command_array(+v: Maybe<&2, Json.Value>) -> Maybe<&2, List<&2, Match.Command>>:
  match v:
    case Some{Json.Array{xs}}: commands(xs, 20000n)
    case _: None{}
def record(+ok: Bool, +l: Maybe<&2, Bool>, +p: Maybe<&2, U32>, +cs: Maybe<&2, List<&2, Match.Command>>) -> Maybe<&2, Record>:
  match ok l p cs:
    case True{} Some{lv} Some{pv} Some{cv}: Some{Record{lv, pv, cv}}
    case _ _ _ _: None{}
def decode_value(+v: Maybe<&2, Json.Value>) -> Maybe<&2, Record>:
  match v:
    case None{}: None{}
    case Some{j}: record(Bool.and(exact_size(j, 4n), text_is(Json.field(j, "schema"), "rift-bend-record/1")), layout(Json.field(j, "layout")), integer(Json.field(j, "policy"), 2), command_array(Json.field(j, "commands")))
def max_file_bytes() -> U32:
  2097152

def decode_bounded(ok: Bool, text: String) -> Maybe<&2, Record>:
  match ok:
    case False{}: None{}
    case True{}: decode_value(Json.parse(text))

def decode(+text: String) -> Maybe<&2, Record>:
  decode_bounded(Nat.is_le(String.length(text), 2097152n), text)
def number(+n: U32) -> Json.Value:
  Json.Number{U32.to_f32(n), U32.show(n)}
def command_value(+c: Match.Command) -> Json.Value:
  match c:
    case Match.MoveCommand{expected, action}: Json.Object{[Json.Field{"$", Json.Text{"MoveCommand"}}, Json.Field{"expected", number(U32.from_nat(expected))}, Json.Field{"action", number(action)}]}
    case Match.UndoCommand{expected}: Json.Object{[Json.Field{"$", Json.Text{"UndoCommand"}}, Json.Field{"expected", number(U32.from_nat(expected))}]}
    case Match.OfferCommand{expected, side}: Json.Object{[Json.Field{"$", Json.Text{"OfferCommand"}}, Json.Field{"expected", number(U32.from_nat(expected))}, Json.Field{"side", Json.Boolean{side}}]}
    case Match.AcceptCommand{expected, side}: Json.Object{[Json.Field{"$", Json.Text{"AcceptCommand"}}, Json.Field{"expected", number(U32.from_nat(expected))}, Json.Field{"side", Json.Boolean{side}}]}
    case Match.DeclineCommand{expected, side}: Json.Object{[Json.Field{"$", Json.Text{"DeclineCommand"}}, Json.Field{"expected", number(U32.from_nat(expected))}, Json.Field{"side", Json.Boolean{side}}]}
    case Match.ResignCommand{expected, side}: Json.Object{[Json.Field{"$", Json.Text{"ResignCommand"}}, Json.Field{"expected", number(U32.from_nat(expected))}, Json.Field{"side", Json.Boolean{side}}]}
def command_values_go(cs: List<&2, Match.Command>, acc: List<&2, Json.Value>) -> List<&2, Json.Value>:
  match cs:
    case []: List.reverse(&2, Json.Value, acc)
    case h <> t: command_values_go(t, command_value(h) <> acc)
def command_values(cs: List<&2, Match.Command>) -> List<&2, Json.Value>:
  command_values_go(cs, [])
def encode(+r: Record) -> String:
  match r:
    case Record{l, p, cs}: Json.stringify(Json.Object{[Json.Field{"schema", Json.Text{"rift-bend-record/1"}}, Json.Field{"layout", Json.Text{Bool.pick(String, l, "B", "C")}}, Json.Field{"policy", number(p)}, Json.Field{"commands", Json.Array{command_values(cs)}}]})
