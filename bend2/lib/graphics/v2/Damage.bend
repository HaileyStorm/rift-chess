# DRAFT conservative damage. Rectangles name pixels to rebuild from background.
# Include both old and new bounds when an object moves or disappears.
import Base
import ./Rect.bend as Rect

def touches(boxes: List<&2,Rect.Box>, +cell: Rect.Box) -> Bool:
  match boxes:
    case Nil{}: False{}
    case Con{box,rest}: Bool.or(Rect.overlaps(box,cell),touches(rest,cell))

def bounds(boxes: List<&2,Rect.Box>, accumulated: Rect.Box) -> Rect.Box:
  match boxes:
    case Nil{}: accumulated
    case Con{box,rest}: bounds(rest,Rect.union(accumulated,box))

def moved(old: Rect.Box, current: Rect.Box) -> Rect.Box:
  Rect.union(old,current)

# Bounded lists are a caller precondition; this merge never loses dirty pixels.
# It intentionally does not claim an optimal minimal rectangle cover.
def add_case(empty: Bool, box: Rect.Box, boxes: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  match empty:
    case True{}: boxes
    case False{}: Con{box,boxes}

def add(+box: Rect.Box, boxes: List<&2,Rect.Box>) -> List<&2,Rect.Box>:
  add_case(Rect.is_empty(box),box,boxes)
