import Base
import ../Model.bend as P
import ../ProofKit.bend as L
import ./RuleKernel.bend as K
import ./RuleContracts.bend as R
import ./EnumerationLaws.bend as E
import ./EnumerationProof.bend as EP
import ./FilterLaws.bend as F
import ./FilterProof.bend as FP
import ./CanonicalLaws.bend as Laws
import ./BoundsLaws.bend as B
import ./BoundsProof.bend as BP
import ./WordNatLaws.bend as WN
import ./WordNatProof.bend as WNP
import ./RoundtripLaws.bend as RT
import ./RoundtripProof.bend as RTP
import ./RangeBridgeLaws.bend as RB
import ./RangeBridgeProof.bend as RBP

def allowed_transport(+a: Bool, +b: Bool, e: {a == b : Bool}, w: L.Truth(a)) -> L.Truth(b):
  %e : L.Truth(_)
  w

def Laws.canonical_member_sound(p, id, member):
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      allowed_transport(K.fast_allowed(p, id), R.legal(p, id), F.filter_preserves_every_acceptance(p, id),
        E.tree_member_sound(5n, p, 0, 21760, id, member))

def range_id_transport(-n: Nat, -start: U32, -a: U32, -b: U32,
  eq: {a == b : U32}, member: E.InRange(n, start, a)) -> E.InRange(n, start, b):
  %eq : E.InRange(n, start, _)
  member

def independent_legal_window(+p: P.Position, +id: U32, legal: L.Truth(R.legal(p, id)))
  -> RB.QueryRange(U32.to_nat(21760), 0, id):
  RBP.query_pack(U32.to_nat(21760), 0, id,
    range_id_transport(U32.to_nat(21760), 0, RB.advance(U32.to_nat(id), 0), id, RT.advance_value_roundtrip(id),
      RB.offset_member(U32.to_nat(21760), 0, U32.to_nat(id), WN.canonical_nat_bound(id, B.every_legal_id_is_canonical(p, id, legal)))))
def Laws.canonical_member_complete(p, id, legal):
  E.tree_member_complete(5n, p, 0, 21760, id, RB.canonical_range_to_tree(id, independent_legal_window(p, id, legal)),
    allowed_transport(R.legal(p, id), K.fast_allowed(p, id),
      Equal.sym(Bool, K.fast_allowed(p, id), R.legal(p, id), F.filter_preserves_every_acceptance(p, id)), legal))
