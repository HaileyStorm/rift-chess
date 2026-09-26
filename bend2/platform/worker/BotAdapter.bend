# Browser bot adapter: preserve the checked-in scorer while requiring helper
# execution at its measured, independent move-scoring boundary.
import Base
import ../../core/Model.bend as Model
import ../../core/AI.bend as AI

def choose(p: Model.Position, ids: List<&2, U32>) -> U32:
  AI.choose@(p, ids)
