# Orbit-only wall raster. The flat top is already painted; clip each wall
# against that same affine presence mask, so a diagonal wall cannot overwrite
# a nearer present tile. Only the projected wall bounds descend to pixels.
import Base
import ../../lib/graphics/Quad.bend as Quad
import ../../lib/graphics/v2/Facet.bend as Facet
import ../../lib/grid8/Board.bend as Board
import ../../lib/grid8/SpatialBoard.bend as SpatialBoard
import ../../lib/grid8/SpatialFast.bend as SpatialFast

def dummy_palette() -> SpatialBoard.Palette:
  SpatialBoard.Palette{0,0,0,0,0,0,0}

type Cell is Data:
  Excluded{}
  Fill{}
  Skip{full: Bool}
  Split{}

def classified_cell(region: SpatialFast.Region, +x: F32, +y: F32,
  +size: U32, +q: Quad.Shape) -> Cell:
  match region:
    case SpatialFast.Fill{old_color}: Fill{}
    case SpatialFast.Skip{}: Skip{Facet.inside_pixels(q,x,y,size)}
    case SpatialFast.Split{}: Split{}

def child_cell(excluded: Bool, +x: F32, +y: F32, +size: U32,
  +q: Quad.Shape, +inverse: SpatialFast.Inverse,
  +mask: Board.Mask) -> Cell:
  # Bend evaluates arguments eagerly. Reject wall-exterior cells before the
  # affine board classification and the inside-quad test.
  match excluded:
    case True{}: Excluded{}
    case False{}:
      classified_cell(SpatialFast.classify(inverse,F32.to_u32(x),
        F32.to_u32(y),size,mask,dummy_palette()),x,y,size,q)

def tree(+depth: Nat, +size: U32, cell: Cell,
  +x: F32, +y: F32, +q: Quad.Shape,
  +inverse: SpatialFast.Inverse, +mask: Board.Mask, +color: U32,
  image: Image) -> Image:
  match depth cell:
    case 0n Excluded{}: image
    case 0n Fill{}: image
    case 0n Skip{full}:
      Facet.tree(depth,size,False{},full,x,y,q,color,255,image)
    case 0n Split{}: image
    case 1n+rest Excluded{}: image
    case 1n+rest Fill{}: image
    case 1n+rest Skip{full}:
      Facet.tree(depth,size,False{},full,x,y,q,color,255,image)
    case 1n+rest Split{}:
      match image:
            case Pix{+background}:
              +half = U32.div(size,2)
              +delta = U32.to_f32(half)
              +xx = F32.add(x,delta)
              +yy = F32.add(y,delta)
              tl tr bl br = tree(rest,half,child_cell(Facet.outside_pixels(q,x,y,half),
                  x,y,half,q,inverse,mask),
                  x,y,q,inverse,mask,color,Pix{background})
                tree(rest,half,child_cell(Facet.outside_pixels(q,xx,y,half),
                  xx,y,half,q,inverse,mask),
                  xx,y,q,inverse,mask,color,Pix{background})
                tree(rest,half,child_cell(Facet.outside_pixels(q,x,yy,half),
                  x,yy,half,q,inverse,mask),
                  x,yy,q,inverse,mask,color,Pix{background})
                tree(rest,half,child_cell(Facet.outside_pixels(q,xx,yy,half),
                  xx,yy,half,q,inverse,mask),
                  xx,yy,q,inverse,mask,color,Pix{background})
              Qua{tl,tr,bl,br}
            case Qua{old_tl,old_tr,old_bl,old_br}:
              +half = U32.div(size,2)
              +delta = U32.to_f32(half)
              +xx = F32.add(x,delta)
              +yy = F32.add(y,delta)
              tl tr bl br = tree(rest,half,child_cell(Facet.outside_pixels(q,x,y,half),
                  x,y,half,q,inverse,mask),
                  x,y,q,inverse,mask,color,old_tl)
                tree(rest,half,child_cell(Facet.outside_pixels(q,xx,y,half),
                  xx,y,half,q,inverse,mask),
                  xx,y,q,inverse,mask,color,old_tr)
                tree(rest,half,child_cell(Facet.outside_pixels(q,x,yy,half),
                  x,yy,half,q,inverse,mask),
                  x,yy,q,inverse,mask,color,old_bl)
                tree(rest,half,child_cell(Facet.outside_pixels(q,xx,yy,half),
                  xx,yy,half,q,inverse,mask),
                  xx,yy,q,inverse,mask,color,old_br)
              Qua{tl,tr,bl,br}

def draw_valid(valid: Bool, +depth: Nat, +size: U32, +q: Quad.Shape,
  +inverse: SpatialFast.Inverse, +mask: Board.Mask, +color: U32,
  image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      tree(depth,size,child_cell(Facet.outside_pixels(q,0.0,0.0,size),
        0.0,0.0,size,q,inverse,mask),
        0.0,0.0,q,inverse,mask,color,image)

def draw(+depth: Nat, +size: U32, +q: Quad.Shape,
  +inverse: SpatialFast.Inverse, +mask: Board.Mask, +color: U32,
  image: Image) -> Image:
  match q:
    case Quad.Shape{ab,bc,cd,da,+area}:
      draw_valid(F32.is_gt(area,0.1),depth,size,q,inverse,mask,color,image)
