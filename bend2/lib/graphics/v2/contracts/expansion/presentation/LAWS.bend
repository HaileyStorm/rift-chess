# DRAFT, UNFILLED: these original proposed meanings are retained unchanged.
# The pinned source checker does not reduce F32 primitives for reflexivity.
# Finite runtime tests are NOT substituted for source proofs.
import Base
import ../../../Stroke.bend as Stroke
import ../../../Transform2D.bend as Transform
import ../../../../Quad.bend as Quad

law empty_stroke_radius:
  for +a: Quad.Point
  for +b: Quad.Point
  {Stroke.line(a,b,0.0) == Stroke.Empty{} : Stroke.Path}

law transform_identity_origin:
  {Transform.point(Transform.identity(),Quad.Point{0.0,0.0}) == Quad.Point{0.0,0.0} : Quad.Point}
