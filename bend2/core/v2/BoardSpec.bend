# v2 facade consumed by the additive match controller.
import Base
import ../Model.bend as M
import ../Geometry.bend as G
import ./RuleKernel.bend as K

def valid(p: M.Position) -> Bool:
  G.valid(p)
def in_check(p: M.Position, side: Bool) -> Bool:
  G.in_check(p, side)
def authorized(p: M.Position, id: U32) -> Bool:
  K.allowed(p, id)
def step(p: M.Position, id: U32) -> M.Position:
  K.position(K.step(p, id))
def legal_ids(p: M.Position) -> List<&2, U32>:
  K.legal_ids(p)
