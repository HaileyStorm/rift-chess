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

def tree(+depth: Nat, +size: U32, excluded: Bool, full: Bool,
  region: SpatialFast.Region, +x: F32, +y: F32, +q: Quad.Shape,
  +inverse: SpatialFast.Inverse, +mask: Board.Mask, +color: U32,
  image: Image) -> Image:
  match depth excluded region:
    case 0n True{} _: image
    case 0n False{} SpatialFast.Fill{old_color}: image
    case 0n False{} SpatialFast.Skip{}:
      Facet.tree(depth,size,False{},full,x,y,q,color,255,image)
    case 0n False{} SpatialFast.Split{}: image
    case 1n+rest True{} _: image
    case 1n+rest False{} SpatialFast.Fill{old_color}: image
    case 1n+rest False{} SpatialFast.Skip{}:
      Facet.tree(depth,size,False{},full,x,y,q,color,255,image)
    case 1n+rest False{} SpatialFast.Split{}:
      match image:
            case Pix{+background}:
              +half = U32.div(size,2)
              +delta = U32.to_f32(half)
              +xx = F32.add(x,delta)
              +yy = F32.add(y,delta)
              tl tr bl br = tree(rest,half,Facet.outside_pixels(q,x,y,half),
                  Facet.inside_pixels(q,x,y,half),
                  SpatialFast.classify(inverse,F32.to_u32(x),F32.to_u32(y),half,mask,
                    dummy_palette()),x,y,q,inverse,mask,color,Pix{background})
                tree(rest,half,Facet.outside_pixels(q,xx,y,half),
                  Facet.inside_pixels(q,xx,y,half),
                  SpatialFast.classify(inverse,F32.to_u32(xx),F32.to_u32(y),half,mask,
                    dummy_palette()),xx,y,q,inverse,mask,color,Pix{background})
                tree(rest,half,Facet.outside_pixels(q,x,yy,half),
                  Facet.inside_pixels(q,x,yy,half),
                  SpatialFast.classify(inverse,F32.to_u32(x),F32.to_u32(yy),half,mask,
                    dummy_palette()),x,yy,q,inverse,mask,color,Pix{background})
                tree(rest,half,Facet.outside_pixels(q,xx,yy,half),
                  Facet.inside_pixels(q,xx,yy,half),
                  SpatialFast.classify(inverse,F32.to_u32(xx),F32.to_u32(yy),half,mask,
                    dummy_palette()),xx,yy,q,inverse,mask,color,Pix{background})
              Qua{tl,tr,bl,br}
            case Qua{old_tl,old_tr,old_bl,old_br}:
              +half = U32.div(size,2)
              +delta = U32.to_f32(half)
              +xx = F32.add(x,delta)
              +yy = F32.add(y,delta)
              tl tr bl br = tree(rest,half,Facet.outside_pixels(q,x,y,half),
                  Facet.inside_pixels(q,x,y,half),
                  SpatialFast.classify(inverse,F32.to_u32(x),F32.to_u32(y),half,mask,
                    dummy_palette()),x,y,q,inverse,mask,color,old_tl)
                tree(rest,half,Facet.outside_pixels(q,xx,y,half),
                  Facet.inside_pixels(q,xx,y,half),
                  SpatialFast.classify(inverse,F32.to_u32(xx),F32.to_u32(y),half,mask,
                    dummy_palette()),xx,y,q,inverse,mask,color,old_tr)
                tree(rest,half,Facet.outside_pixels(q,x,yy,half),
                  Facet.inside_pixels(q,x,yy,half),
                  SpatialFast.classify(inverse,F32.to_u32(x),F32.to_u32(yy),half,mask,
                    dummy_palette()),x,yy,q,inverse,mask,color,old_bl)
                tree(rest,half,Facet.outside_pixels(q,xx,yy,half),
                  Facet.inside_pixels(q,xx,yy,half),
                  SpatialFast.classify(inverse,F32.to_u32(xx),F32.to_u32(yy),half,mask,
                    dummy_palette()),xx,yy,q,inverse,mask,color,old_br)
              Qua{tl,tr,bl,br}

def draw_valid(valid: Bool, +depth: Nat, +size: U32, +q: Quad.Shape,
  +inverse: SpatialFast.Inverse, +mask: Board.Mask, +color: U32,
  image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      tree(depth,size,Facet.outside_pixels(q,0.0,0.0,size),
        Facet.inside_pixels(q,0.0,0.0,size),
        SpatialFast.classify(inverse,0,0,size,mask,dummy_palette()),
        0.0,0.0,q,inverse,mask,color,image)

def draw(+depth: Nat, +size: U32, +q: Quad.Shape,
  +inverse: SpatialFast.Inverse, +mask: Board.Mask, +color: U32,
  image: Image) -> Image:
  match q:
    case Quad.Shape{ab,bc,cd,da,+area}:
      draw_valid(F32.is_gt(area,0.1),depth,size,q,inverse,mask,color,image)
