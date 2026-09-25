# Complete in-Bend coverage sweep avoids timing one host boundary per point.
import Base
import ../../third/PathFill.bend as Path

# Accumulate the exact number of inside samples over a fixed square grid.
def row(fuel: Nat,+x: U32,+y: U32,+edges: Path.Edges,total: U32) -> U32:
  match fuel:
    case 0n: total
    case 1n+rest: row(rest,U32.add(x,1),y,edges,U32.add(total,Bool.pick(U32,Path.hit(edges,Path.NonZero{},F32.add(U32.to_f32(x),0.5),F32.add(U32.to_f32(y),0.5)),1,0)))

# Every query calls the same F32 edge kernel; only the prepared hierarchy differs.
def rows(fuel: Nat,+size: U32,+y: U32,+edges: Path.Edges,total: U32) -> U32:
  match fuel:
    case 0n: total
    case 1n+rest: rows(rest,size,U32.add(y,1),edges,row(U32.to_nat(size),0,y,edges,total))

# Return a count rather than discarding the geometry work under optimization.
def sweep(edges: Path.Edges,+size: U32) -> U32:
  rows(U32.to_nat(size),size,0,edges,0)
