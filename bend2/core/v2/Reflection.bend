import Base
import ../Model.bend as M
import ../MatchSpec.bend as Types

def square(s: U32) -> U32:
  U32.xor(s, 56)
def tile(t: U32) -> U32:
  U32.xor(t, 12)
def action(a: M.Action) -> M.Action:
  match a:
    case M.MoveAction{from, to, promotion}: M.MoveAction{square(from), square(to), promotion}
    case M.ShiftAction{from, to, promotion}: M.ShiftAction{tile(from), tile(to), promotion}

def piece(code: U32) -> U32:
  match code:
    case 0: 0
    case 1: 9
    case 2: 10
    case 3: 11
    case 4: 12
    case 5: 13
    case 6: 14
    case 7: 15
    case 8: 8
    case 9: 1
    case 10: 2
    case 11: 3
    case 12: 4
    case 13: 5
    case 14: 6
    case 15: 7
    case _: code

def board(n: Nat, +p: M.Position, +s: U32) -> List<&2, U32>:
  match n:
    case 0n: []
    case 1n+rest: piece(M.board_get(M.pos_board(p), square(s))) <> board(rest, p, U32.add(s, 1))
def holes(n: Nat, +mask: U32, +t: U32) -> U32:
  match n:
    case 0n: 0
    case 1n+rest:
      U32.or(Bool.pick(U32, U32.is_zero(U32.and(mask, M.macro_mask(t))), 0, M.macro_mask(tile(t))), holes(rest, mask, U32.add(t, 1)))
def rights(+r: U32) -> U32:
  U32.or(U32.mul(U32.and(r, 3), 4), U32.div(U32.and(r, 12), 4))
def ep(+s: U32) -> U32:
  Bool.pick(U32, U32.is_eq(s, 64), 64, square(s))
# Fullmove is intentionally retained, not claimed to commute with side swap.
# Effects must compare counter-free positions and separately prove Black's tick.
def position(+p: M.Position) -> M.Position:
  M.Pos{board(64n, p, 0), holes(16n, M.pos_holes(p), 0), Bool.not(M.pos_side(p)),
    rights(M.pos_rights(p)), ep(M.pos_ep(p)), ep(M.pos_ep_pawn(p)), M.pos_quiet(p), M.pos_full(p)}
def outcome(o: Types.Outcome) -> Types.Outcome:
  match o:
    case Types.WhiteCheckmate{}: Types.BlackCheckmate{}
    case Types.BlackCheckmate{}: Types.WhiteCheckmate{}
    case Types.Stalemate{}: Types.Stalemate{}
    case Types.BareKings{}: Types.BareKings{}
    case Types.Threefold{}: Types.Threefold{}
    case Types.Progress100{}: Types.Progress100{}
    case Types.Agreed{}: Types.Agreed{}
    case Types.WhiteResignedOutcome{}: Types.BlackResignedOutcome{}
    case Types.BlackResignedOutcome{}: Types.WhiteResignedOutcome{}
