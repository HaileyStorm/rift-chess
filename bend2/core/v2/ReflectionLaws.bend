import Base
import ../Model.bend as M
import ../MatchSpec.bend as Types
import ./Reflection.bend as R
law word_xor_involution:
  for +n: Nat
  for +a: Word(n)
  for +mask: Word(n)
  {Word.xor(n, Word.xor(n, a, mask), mask) == a : Word(n)}
law u32_xor_involution:
  for +a: U32
  for +mask: U32
  {U32.xor(U32.xor(a, mask), mask) == a : U32}
law square_involution:
  for +s: U32
  {R.square(R.square(s)) == s : U32}
law tile_involution:
  for +t: U32
  {R.tile(R.tile(t)) == t : U32}
law action_involution:
  for +a: M.Action
  {R.action(R.action(a)) == a : M.Action}

law outcome_involution:
  for +o: Types.Outcome
  {R.outcome(R.outcome(o)) == o : Types.Outcome}
