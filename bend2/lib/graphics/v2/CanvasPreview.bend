# DRAFT host-native Canvas preview commands. Canvas coverage and blending are
# separate from the normative v2 Image raster; callers own preview eligibility.
import Base
import ../Quad.bend as Quad

type Command is Data:
  Polygon{points: List<&2,Quad.Point>,color: U32,opacity: U32}
  Line{points: List<&2,Quad.Point>,color: U32,opacity: U32,width: F32,closed: Bool}
  Ellipse{center: Quad.Point,rx: F32,ry: F32,color: U32,opacity: U32}
  Sprite{texture: U32,left: F32,top: F32,width: U32,height: U32,opacity: U32,label: U32}
