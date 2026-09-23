import Base
import ../Model.bend as M
import ../MatchSpec.bend as Types
import ./Reflection.bend as R
import ./ReflectionLaws.bend as Laws

def Laws.word_xor_involution(n, a, mask):
  match n:
    case 0n:
      match a mask:
        case WNil{} WNil{}: {==}
    case 1n+p:
      match a mask:
        case WCon{False{}, +at} WCon{False{}, +mt}:
          Equal.cong(Word(p), Word(1n+p), w => WCon{False{}, w},
            Word.xor(p, Word.xor(p, at, mt), mt), at, Laws.word_xor_involution(p, at, mt))
        case WCon{False{}, +at} WCon{True{}, +mt}:
          Equal.cong(Word(p), Word(1n+p), w => WCon{False{}, w},
            Word.xor(p, Word.xor(p, at, mt), mt), at, Laws.word_xor_involution(p, at, mt))
        case WCon{True{}, +at} WCon{False{}, +mt}:
          Equal.cong(Word(p), Word(1n+p), w => WCon{True{}, w},
            Word.xor(p, Word.xor(p, at, mt), mt), at, Laws.word_xor_involution(p, at, mt))
        case WCon{True{}, +at} WCon{True{}, +mt}:
          Equal.cong(Word(p), Word(1n+p), w => WCon{True{}, w},
            Word.xor(p, Word.xor(p, at, mt), mt), at, Laws.word_xor_involution(p, at, mt))

def Laws.u32_xor_involution(a, mask):
  match a mask:
    case U32{+x} U32{+y}:
      Equal.cong(Word(32n), U32, w => U32{w}, Word.xor(32n, Word.xor(32n, x, y), y), x, Laws.word_xor_involution(32n, x, y))
def Laws.square_involution(s):
  Laws.u32_xor_involution(s, 56)
def Laws.tile_involution(t):
  Laws.u32_xor_involution(t, 12)
def Laws.action_involution(a):
  match a:
    case M.MoveAction{+from, +to, +tag}:
      Equal.trans(M.Action,
        M.MoveAction{R.square(R.square(from)), R.square(R.square(to)), tag},
        M.MoveAction{from, R.square(R.square(to)), tag}, M.MoveAction{from, to, tag},
        Equal.cong(U32, M.Action, s => M.MoveAction{s, R.square(R.square(to)), tag}, R.square(R.square(from)), from, Laws.square_involution(from)),
        Equal.cong(U32, M.Action, s => M.MoveAction{from, s, tag}, R.square(R.square(to)), to, Laws.square_involution(to)))
    case M.ShiftAction{+from, +to, +tag}:
      Equal.trans(M.Action,
        M.ShiftAction{R.tile(R.tile(from)), R.tile(R.tile(to)), tag},
        M.ShiftAction{from, R.tile(R.tile(to)), tag}, M.ShiftAction{from, to, tag},
        Equal.cong(U32, M.Action, s => M.ShiftAction{s, R.tile(R.tile(to)), tag}, R.tile(R.tile(from)), from, Laws.tile_involution(from)),
        Equal.cong(U32, M.Action, s => M.ShiftAction{from, s, tag}, R.tile(R.tile(to)), to, Laws.tile_involution(to)))

def Laws.outcome_involution(o):
  match o:
    case Types.WhiteCheckmate{}: {==}
    case Types.BlackCheckmate{}: {==}
    case Types.Stalemate{}: {==}
    case Types.BareKings{}: {==}
    case Types.Threefold{}: {==}
    case Types.Progress100{}: {==}
    case Types.Agreed{}: {==}
    case Types.WhiteResignedOutcome{}: {==}
    case Types.BlackResignedOutcome{}: {==}
