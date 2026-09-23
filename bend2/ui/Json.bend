import Base

# Portable, effect-free JSON boundary. The explicit machine uses 4,000,000
# reduction steps; numbers are finite F32 approximations with exponent <= 100.
# Number.lexeme retains exact source spelling for record validation. Object
# members use the Field variant of Value because this compiler disallows mutual
# recursive datatype declarations. Unpaired UTF-16 escapes reject; valid pairs
# become Unicode scalar values, which Bend String requires.

type Value is Data:
  Null{}
  Boolean{value: Bool}
  Number{value: F32, lexeme: String}
  Text{value: String}
  Array{items: List<&2, Value>}
  Object{fields: List<&2, Value>}
  Field{key: String, value: Value}
type Frame is Data:
  Arr{items: List<&2, Value>}
  Obj{fields: List<&2, Value>, key: String}
type State is Data:
  State{input: String, mode: U32, stack: List<&2, Frame>, value: Value, token: String, unicode: U32, digits: U32}
  Bad{}

type Job is Data:
  Val{value: Value}
  Raw{text: String}
def equal(+a: String, +b: String) -> Bool:
  Cmp.is_eq(String.order(a, b))
def field_pick(+ok: Bool, +v: Value, +rest: Maybe<&2, Value>) -> Maybe<&2, Value>:
  match ok:
    case True{}: Some{v}
    case False{}: rest
def field_list(+xs: List<&2, Value>, +key: String) -> Maybe<&2, Value>:
  match xs:
    case []: None{}
    case Field{k, v} <> tail: field_pick(equal(k, key), v, field_list(tail, key))
    case _ <> tail: field_list(tail, key)
def field(+obj: Value, +key: String) -> Maybe<&2, Value>:
  match obj:
    case Object{xs}: field_list(xs, key)
    case _: None{}
def space(+c: U32) -> Bool:
  Bool.or(U32.is_eq(c, 32), Bool.or(U32.is_eq(c, 9), Bool.or(U32.is_eq(c, 10), U32.is_eq(c, 13))))
def digit(+c: U32) -> Bool:
  Bool.and(U32.is_ge(c, 48), U32.is_le(c, 57))
def hex(+c: U32) -> U32:
  Bool.pick(U32, digit(c), U32.sub(c, 48), Bool.pick(U32, Bool.and(U32.is_ge(c, 65), U32.is_le(c, 70)), U32.sub(c, 55), Bool.pick(U32, Bool.and(U32.is_ge(c, 97), U32.is_le(c, 102)), U32.sub(c, 87), 999)))
def rev(+s: String) -> String:
  String.from_list(List.reverse(&2, Char, String.to_list(s)))
def ready(+s: String, +stack: List<&2, Frame>, +v: Value) -> State:
  State{s, 6, stack, v, "", 0, 0}
def lex(+s: String, +mode: U32, +stack: List<&2, Frame>, +token: String) -> State:
  State{s, mode, stack, Null{}, token, 0, 0}
def begin(+c: U32, +tail: String, +stack: List<&2, Frame>) -> State:
  match c:
    case 34: lex(tail, 1, stack, "")
    case 91: lex(tail, 9, Arr{[]} <> stack, "")
    case 123: lex(tail, 10, Obj{[], ""} <> stack, "")
    case _: lex(tail, 4, stack, SCon{Chr{c}, SNil{}})
def escape(+c: U32) -> U32:
  match c:
    case 34: 34
    case 92: 92
    case 47: 47
    case 98: 8
    case 102: 12
    case 110: 10
    case 114: 13
    case 116: 9
    case _: 999
# JSON number DFA. A bounded exponent prevents runaway exponent expansion.
def pow10(+n: Nat, +x: F32) -> F32:
  match n:
    case Zero{}: x
    case Succ{p}: pow10(p, F32.mul(x, 10.0))
def finite_pick(+ok: Bool, +n: F32) -> Maybe<&2, F32>:
  match ok:
    case True{}: Some{n}
    case False{}: None{}
def finite_number(+n: F32) -> Maybe<&2, F32>:
  finite_pick(Bool.and(F32.is_ge(n, F32.sub(0.0, 3.402823466e38)), F32.is_le(n, 3.402823466e38)), n)
def num_finish(+ok: Bool, +negative: Bool, +acc: F32, +scale: F32, +exponent: U32, +eneg: Bool) -> Maybe<&2, F32>:
  match ok:
    case False{}: None{}
    case True{}:
      +e = pow10(U32.to_nat(exponent), 1.0)
      +v = F32.mul(F32.div(acc, scale), Bool.pick(F32, eneg, F32.div(1.0, e), e))
      finite_number(Bool.pick(F32, negative, F32.sub(0.0, v), v))
def num_end(+phase: U32, +negative: Bool, +acc: F32, +scale: F32, +exponent: U32, +eneg: Bool) -> Maybe<&2, F32>:
  num_finish(Bool.and(U32.is_le(exponent, 100), Bool.or(U32.is_eq(phase, 2), Bool.or(U32.is_eq(phase, 3), Bool.or(U32.is_eq(phase, 5), U32.is_eq(phase, 8))))), negative, acc, scale, exponent, eneg)
def num(+xs: String, +phase: U32, +negative: Bool, +acc: F32, +scale: F32, +exponent: U32, +eneg: Bool) -> Maybe<&2, F32>:
  match xs phase:
    case SNil{} _: num_end(phase, negative, acc, scale, exponent, eneg)
    case SCon{Chr{45}, tail} 0: num(tail, 1, True{}, acc, scale, exponent, eneg)
    case SCon{Chr{48}, tail} 0: num(tail, 2, negative, F32.add(F32.mul(acc, 10.0), 0.0), scale, exponent, eneg)
    case SCon{Chr{49}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 1.0), scale, exponent, eneg)
    case SCon{Chr{50}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 2.0), scale, exponent, eneg)
    case SCon{Chr{51}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 3.0), scale, exponent, eneg)
    case SCon{Chr{52}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 4.0), scale, exponent, eneg)
    case SCon{Chr{53}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 5.0), scale, exponent, eneg)
    case SCon{Chr{54}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 6.0), scale, exponent, eneg)
    case SCon{Chr{55}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 7.0), scale, exponent, eneg)
    case SCon{Chr{56}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 8.0), scale, exponent, eneg)
    case SCon{Chr{57}, tail} 0: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 9.0), scale, exponent, eneg)
    case SCon{Chr{48}, tail} 1: num(tail, 2, negative, F32.add(F32.mul(acc, 10.0), 0.0), scale, exponent, eneg)
    case SCon{Chr{49}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 1.0), scale, exponent, eneg)
    case SCon{Chr{50}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 2.0), scale, exponent, eneg)
    case SCon{Chr{51}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 3.0), scale, exponent, eneg)
    case SCon{Chr{52}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 4.0), scale, exponent, eneg)
    case SCon{Chr{53}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 5.0), scale, exponent, eneg)
    case SCon{Chr{54}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 6.0), scale, exponent, eneg)
    case SCon{Chr{55}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 7.0), scale, exponent, eneg)
    case SCon{Chr{56}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 8.0), scale, exponent, eneg)
    case SCon{Chr{57}, tail} 1: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 9.0), scale, exponent, eneg)
    case SCon{Chr{46}, tail} 2: num(tail, 4, negative, acc, scale, exponent, eneg)
    case SCon{Chr{69}, tail} 2: num(tail, 6, negative, acc, scale, exponent, eneg)
    case SCon{Chr{101}, tail} 2: num(tail, 6, negative, acc, scale, exponent, eneg)
    case SCon{Chr{48}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 0.0), scale, exponent, eneg)
    case SCon{Chr{49}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 1.0), scale, exponent, eneg)
    case SCon{Chr{50}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 2.0), scale, exponent, eneg)
    case SCon{Chr{51}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 3.0), scale, exponent, eneg)
    case SCon{Chr{52}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 4.0), scale, exponent, eneg)
    case SCon{Chr{53}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 5.0), scale, exponent, eneg)
    case SCon{Chr{54}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 6.0), scale, exponent, eneg)
    case SCon{Chr{55}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 7.0), scale, exponent, eneg)
    case SCon{Chr{56}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 8.0), scale, exponent, eneg)
    case SCon{Chr{57}, tail} 3: num(tail, 3, negative, F32.add(F32.mul(acc, 10.0), 9.0), scale, exponent, eneg)
    case SCon{Chr{46}, tail} 3: num(tail, 4, negative, acc, scale, exponent, eneg)
    case SCon{Chr{69}, tail} 3: num(tail, 6, negative, acc, scale, exponent, eneg)
    case SCon{Chr{101}, tail} 3: num(tail, 6, negative, acc, scale, exponent, eneg)
    case SCon{Chr{48}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 0.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{49}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 1.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{50}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 2.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{51}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 3.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{52}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 4.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{53}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 5.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{54}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 6.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{55}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 7.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{56}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 8.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{57}, tail} 4: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 9.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{48}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 0.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{49}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 1.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{50}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 2.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{51}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 3.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{52}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 4.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{53}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 5.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{54}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 6.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{55}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 7.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{56}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 8.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{57}, tail} 5: num(tail, 5, negative, F32.add(F32.mul(acc, 10.0), 9.0), F32.mul(scale, 10.0), exponent, eneg)
    case SCon{Chr{69}, tail} 5: num(tail, 6, negative, acc, scale, exponent, eneg)
    case SCon{Chr{101}, tail} 5: num(tail, 6, negative, acc, scale, exponent, eneg)
    case SCon{Chr{48}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 0)), eneg)
    case SCon{Chr{49}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 1)), eneg)
    case SCon{Chr{50}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 2)), eneg)
    case SCon{Chr{51}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 3)), eneg)
    case SCon{Chr{52}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 4)), eneg)
    case SCon{Chr{53}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 5)), eneg)
    case SCon{Chr{54}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 6)), eneg)
    case SCon{Chr{55}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 7)), eneg)
    case SCon{Chr{56}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 8)), eneg)
    case SCon{Chr{57}, tail} 6: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 9)), eneg)
    case SCon{Chr{43}, tail} 6: num(tail, 7, negative, acc, scale, exponent, False{})
    case SCon{Chr{45}, tail} 6: num(tail, 7, negative, acc, scale, exponent, True{})
    case SCon{Chr{48}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 0)), eneg)
    case SCon{Chr{49}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 1)), eneg)
    case SCon{Chr{50}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 2)), eneg)
    case SCon{Chr{51}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 3)), eneg)
    case SCon{Chr{52}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 4)), eneg)
    case SCon{Chr{53}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 5)), eneg)
    case SCon{Chr{54}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 6)), eneg)
    case SCon{Chr{55}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 7)), eneg)
    case SCon{Chr{56}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 8)), eneg)
    case SCon{Chr{57}, tail} 7: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 9)), eneg)
    case SCon{Chr{48}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 0)), eneg)
    case SCon{Chr{49}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 1)), eneg)
    case SCon{Chr{50}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 2)), eneg)
    case SCon{Chr{51}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 3)), eneg)
    case SCon{Chr{52}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 4)), eneg)
    case SCon{Chr{53}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 5)), eneg)
    case SCon{Chr{54}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 6)), eneg)
    case SCon{Chr{55}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 7)), eneg)
    case SCon{Chr{56}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 8)), eneg)
    case SCon{Chr{57}, tail} 8: num(tail, 8, negative, acc, scale, U32.min(1000000, U32.add(U32.mul(exponent, 10), 9)), eneg)
    case _ _: None{}
def atom_number(+n: Maybe<&2, F32>, +token: String, +s: String, +stack: List<&2, Frame>) -> State:
  match n:
    case None{}: Bad{}
    case Some{v}: ready(s, stack, Number{v, token})
def atom_kind(+a: Bool, +b: Bool, +c: Bool, +token: String, +s: String, +stack: List<&2, Frame>) -> State:
  match a b c:
    case True{} _ _: ready(s, stack, Null{})
    case _ True{} _: ready(s, stack, Boolean{True{}})
    case _ _ True{}: ready(s, stack, Boolean{False{}})
    case _ _ _: atom_number(num(token, 0, False{}, 0.0, 1.0, 0, False{}), token, s, stack)
def atom(+token: String, +s: String, +stack: List<&2, Frame>) -> State:
  atom_kind(equal(token, "null"), equal(token, "true"), equal(token, "false"), token, s, stack)
def close_string(+mode: U32, +stack: List<&2, Frame>, +s: String, +token: String) -> State:
  match mode stack:
    case 1 _: ready(s, stack, Text{rev(token)})
    case _ Obj{fields, key} <> rest: lex(s, 8, Obj{fields, rev(token)} <> rest, "")
    case _ _: Bad{}
def add_value(+stack: List<&2, Frame>, +c: U32, +tail: String, +v: Value) -> State:
  match stack:
    case []: Bad{}
    case Arr{items} <> rest:
      match c:
        case 44: lex(tail, 0, Arr{v <> items} <> rest, "")
        case 93: ready(tail, rest, Array{List.reverse(&2, Value, v <> items)})
        case _: Bad{}
    case Obj{fields, key} <> rest:
      match c:
        case 44: lex(tail, 7, Obj{Field{key, v} <> fields, ""} <> rest, "")
        case 125: ready(tail, rest, Object{List.reverse(&2, Value, Field{key, v} <> fields)})
        case _: Bad{}
def empty_close(+c: U32, +tail: String, +stack: List<&2, Frame>) -> State:
  match stack:
    case Arr{items} <> rest: ready(tail, rest, Array{[]})
    case Obj{fields, key} <> rest: ready(tail, rest, Object{[]})
    case _: Bad{}
def string_plain(+ok: Bool, +c: U32, +tail: String, +mode: U32, +stack: List<&2, Frame>, +token: String) -> State:
  match ok:
    case True{}: lex(tail, mode, stack, SCon{Chr{c}, token})
    case False{}: Bad{}
def string_char(+c: U32, +tail: String, +mode: U32, +stack: List<&2, Frame>, +token: String) -> State:
  match c:
    case 34: close_string(mode, stack, tail, token)
    case 92: State{tail, 2, stack, Null{}, token, mode, 0}
    case _: string_plain(U32.is_ge(c, 32), c, tail, mode, stack, token)
def escape_finish(+c: U32, +tail: String, +stack: List<&2, Frame>, +token: String, +mode: U32) -> State:
  match c:
    case 999: Bad{}
    case _: lex(tail, mode, stack, SCon{Chr{c}, token})
def escaped(+c: U32, +tail: String, +stack: List<&2, Frame>, +token: String, +mode: U32) -> State:
  match c:
    case 117: State{tail, 3, stack, Null{}, token, 0, U32.mul(mode, 10)}
    case _: escape_finish(escape(c), tail, stack, token, mode)
def unicode_complete(+high: Bool, +low: Bool, +tail: String, +stack: List<&2, Frame>, +token: String, +unicode: U32, +mode: U32) -> State:
  match high low:
    case True{} _: State{tail, 12, stack, Null{}, token, unicode, U32.mul(mode, 10)}
    case _ True{}: Bad{}
    case _ _: lex(tail, mode, stack, SCon{Chr{unicode}, token})
def unicode_next(+done: Bool, +tail: String, +stack: List<&2, Frame>, +token: String, +unicode: U32, +digits: U32) -> State:
  match done:
    case True{}: unicode_complete(Bool.and(U32.is_ge(unicode, 55296), U32.is_le(unicode, 56319)), Bool.and(U32.is_ge(unicode, 56320), U32.is_le(unicode, 57343)), tail, stack, token, unicode, U32.div(digits, 10))
    case False{}: State{tail, 3, stack, Null{}, token, unicode, digits}
def unicode_char(+c: U32, +tail: String, +stack: List<&2, Frame>, +token: String, +unicode: U32, +digits: U32) -> State:
  match c:
    case 999: Bad{}
    case _: unicode_next(U32.is_eq(U32.mod(digits, 10), 3), tail, stack, token, U32.add(U32.mul(unicode, 16), c), U32.add(digits, 1))
def atom_delimiter_ready(+ws: Bool, +c: U32, +tail: String, +stack: List<&2, Frame>, +v: Value) -> State:
  match ws:
    case True{}: ready(tail, stack, v)
    case False{}: add_value(stack, c, tail, v)
def atom_delimiter(+state: State, +c: U32, +ws: Bool) -> State:
  match state:
    case Bad{}: Bad{}
    case State{tail, mode, stack, v, token, unicode, digits}: atom_delimiter_ready(ws, c, tail, stack, v)
def atom_char(+c: U32, +tail: String, +stack: List<&2, Frame>, +token: String, +end: Bool) -> State:
  match end:
    case True{}: atom_delimiter(atom(rev(token), tail, stack), c, space(c))
    case False{}: lex(tail, 4, stack, SCon{Chr{c}, token})
def key_char(+ws: Bool, +c: U32, +empty: Bool, +tail: String, +stack: List<&2, Frame>) -> State:
  match ws:
    case True{}: lex(tail, Bool.pick(U32, empty, 10, 7), stack, "")
    case False{}:
      match c:
        case 34: lex(tail, 11, stack, "")
        case 125:
          match empty:
            case True{}: empty_close(c, tail, stack)
            case False{}: Bad{}
        case _: Bad{}
def pair_end(+ok: Bool, +tail: String, +stack: List<&2, Frame>, +token: String, +unicode: U32, +digits: U32) -> State:
  match ok:
    case False{}: Bad{}
    case True{}: lex(tail, U32.div(digits, 10), stack, SCon{Chr{U32.add(65536, U32.add(U32.mul(U32.sub(U32.div(unicode, 65536), 55296), 1024), U32.sub(U32.mod(unicode, 65536), 56320)))}, token})
def pair_next(+done: Bool, +tail: String, +stack: List<&2, Frame>, +token: String, +unicode: U32, +digits: U32) -> State:
  match done:
    case False{}: State{tail, 14, stack, Null{}, token, unicode, digits}
    case True{}: pair_end(Bool.and(U32.is_ge(U32.mod(unicode, 65536), 56320), U32.is_le(U32.mod(unicode, 65536), 57343)), tail, stack, token, unicode, digits)
def pair_char(+c: U32, +tail: String, +stack: List<&2, Frame>, +token: String, +unicode: U32, +digits: U32) -> State:
  match c:
    case 999: Bad{}
    case _: pair_next(U32.is_eq(U32.mod(digits, 10), 3), tail, stack, token, U32.add(U32.mul(unicode, 16), c), U32.add(digits, 1))
def step_char(+mode: U32, +ws: Bool, +c: U32, +tail: String, +stack: List<&2, Frame>, +v: Value, +token: String, +unicode: U32, +digits: U32) -> State:
  match mode:
    case 0:
      match ws:
        case True{}: lex(tail, 0, stack, "")
        case False{}: begin(c, tail, stack)
    case 1: string_char(c, tail, 1, stack, token)
    case 11: string_char(c, tail, 11, stack, token)
    case 2: escaped(c, tail, stack, token, unicode)
    case 3: unicode_char(hex(c), tail, stack, token, unicode, digits)
    case 12:
      match c:
        case 92: State{tail, 13, stack, Null{}, token, unicode, digits}
        case _: Bad{}
    case 13:
      match c:
        case 117: State{tail, 14, stack, Null{}, token, unicode, digits}
        case _: Bad{}
    case 14: pair_char(hex(c), tail, stack, token, unicode, digits)
    case 4: atom_char(c, tail, stack, token, Bool.or(ws, Bool.or(U32.is_eq(c, 44), Bool.or(U32.is_eq(c, 93), U32.is_eq(c, 125)))))
    case 6:
      match ws:
        case True{}: ready(tail, stack, v)
        case False{}: add_value(stack, c, tail, v)
    case 8:
      match ws:
        case True{}: lex(tail, 8, stack, "")
        case False{}:
          match c:
            case 58: lex(tail, 0, stack, "")
            case _: Bad{}
    case 7: key_char(ws, c, False{}, tail, stack)
    case 10: key_char(ws, c, True{}, tail, stack)
    case 9:
      match ws:
        case True{}: lex(tail, 9, stack, "")
        case False{}:
          match c:
            case 93: empty_close(c, tail, stack)
            case _: begin(c, tail, stack)
    case _: Bad{}
def finish_atom(+s: State) -> Maybe<&2, Value>:
  match s:
    case State{input, mode, stack, v, token, unicode, digits}: Some{v}
    case Bad{}: None{}
def finish(+stack: List<&2, Frame>, +mode: U32, +v: Value, +token: String) -> Maybe<&2, Value>:
  match stack:
    case []:
      match mode:
        case 6: Some{v}
        case 4: finish_atom(atom(rev(token), "", []))
        case _: None{}
    case _: None{}
def run(+fuel: Nat, +state: State) -> Maybe<&2, Value>:
  match fuel:
    case Zero{}: None{}
    case Succ{p}:
      match state:
        case Bad{}: None{}
        case State{input, mode, stack, v, token, unicode, digits}:
          match input:
            case SNil{}: finish(stack, mode, v, token)
            case SCon{Chr{+c}, tail}: run(p, step_char(mode, space(c), c, tail, stack, v, token, unicode, digits))
def parse(+text: String) -> Maybe<&2, Value>:
  run(4000000n, lex(text, 0, [], ""))

def hexchar(+n: U32) -> Char:
  Chr{Bool.pick(U32, U32.is_lt(n, 10), U32.add(n, 48), U32.add(n, 87))}
def unicode_escape(+c: U32) -> String:
  String.append("\\u", SCon{hexchar(U32.div(c, 4096)), SCon{hexchar(U32.mod(U32.div(c, 256), 16)), SCon{hexchar(U32.mod(U32.div(c, 16), 16)), SCon{hexchar(U32.mod(c, 16)), SNil{}}}}})
def quotechar(+c: U32) -> String:
  match c:
    case 34: "\\\""
    case 92: "\\\\"
    case _:
      Bool.pick(String, Bool.or(U32.is_lt(c, 32), Bool.and(U32.is_ge(c, 55296), U32.is_le(c, 57343))), unicode_escape(c), SCon{Chr{c}, SNil{}})
def quotes(+s: String) -> String:
  match s:
    case SNil{}: ""
    case SCon{Chr{c}, tail}: String.append(quotechar(c), quotes(tail))
def quoted(+s: String) -> String:
  String.append("\"", String.append(quotes(s), "\""))
def job_prefix(+first: Bool, +rest: List<&2, Job>) -> List<&2, Job>:
  match first:
    case True{}: rest
    case False{}: Raw{","} <> rest
def jobs_go(+xs: List<&2, Value>, +first: Bool, +acc: List<&2, Job>) -> List<&2, Job>:
  match xs:
    case []: List.reverse(&2, Job, acc)
    case h <> t: jobs_go(t, False{}, Val{h} <> job_prefix(first, acc))
def jobs(+xs: List<&2, Value>, +first: Bool) -> List<&2, Job>:
  jobs_go(xs, first, [])
def prepend_jobs(reversed: List<&2, Job>, rest: List<&2, Job>) -> List<&2, Job>:
  match reversed:
    case []: rest
    case h <> t: prepend_jobs(t, h <> rest)
def append_jobs(xs: List<&2, Job>, rest: List<&2, Job>) -> List<&2, Job>:
  prepend_jobs(List.reverse(&2, Job, xs), rest)
def emit(+fuel: Nat, +queue: List<&2, Job>, +acc: String) -> String:
  match fuel:
    case Zero{}: "null"
    case Succ{p}:
      match queue:
        case []: String.reverse(acc)
        case Raw{text} <> rest: emit(p, rest, String.append(String.reverse(text), acc))
        case Val{v} <> rest:
          match v:
            case Null{}: emit(p, rest, String.append(String.reverse("null"), acc))
            case Boolean{b}: emit(p, rest, String.append(String.reverse(Bool.pick(String, b, "true", "false")), acc))
            case Number{n, lexeme}: emit(p, rest, String.append(String.reverse(F32.show(n)), acc))
            case Text{s}: emit(p, rest, String.append(String.reverse(quoted(s)), acc))
            case Array{items}: emit(p, append_jobs(jobs(items, True{}), Raw{"]"} <> rest), String.append(String.reverse("["), acc))
            case Object{fields}: emit(p, append_jobs(jobs(fields, True{}), Raw{"}"} <> rest), String.append(String.reverse("{"), acc))
            case Field{key, value}: emit(p, Val{value} <> rest, String.append(String.reverse(String.append(quoted(key), ":")), acc))
def stringify(+value: Value) -> String:
  emit(4000000n, [Val{value}], "")


