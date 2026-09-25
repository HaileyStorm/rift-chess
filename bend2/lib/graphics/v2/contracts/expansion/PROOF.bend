# NEW DRAFT proof entrypoint. Existing law/proof files are not modified.
import ./LAWS.bend as Laws
import Base
import ../../RenderPlan.bend as Plan
import ../../DrawList.bend as Draw
import ../../ClippedStamp.bend as Stamp
import ../../ImageOps.bend as Ops
import ../../Rect.bend as Rect
import ../../RgbaSample.bend as Sample
import ../../RgbaAffine.bend as Affine
import ../../NineSlice.bend as Skin
import ../../Stroke.bend as Stroke
import ../../Transform2D.bend as Transform
import ../../TextLayout.bend as Text
import ../../Motion.bend as Motion
import ../../ColorFx.bend as Fx
import ../../Shapes.bend as Shapes
import ../../../Quad.bend as Quad

def quad_equal(+a: Image,+b: Image,+c: Image,+d: Image,
  +aa: Image,+bb: Image,+cc: Image,+dd: Image,
  ea: {a == aa : Image},eb: {b == bb : Image},ec: {c == cc : Image},ed: {d == dd : Image})
  -> {Qua{a,b,c,d} == Qua{aa,bb,cc,dd} : Image}:
  %ea : {Qua{a,b,c,d} == Qua{_,bb,cc,dd} : Image}
  %eb : {Qua{a,b,c,d} == Qua{a,_,cc,dd} : Image}
  %ec : {Qua{a,b,c,d} == Qua{a,b,_,dd} : Image}
  %ed : {Qua{a,b,c,d} == Qua{a,b,c,_} : Image}
  {==}

def agrees(+forks: Nat,+tree: Plan.Tree,+depth: Nat,+size: U32,+x: U32,+y: U32,+target: Image)
  -> {Plan.pool(forks,tree,depth,size,x,y,target) == Plan.serial(tree,depth,size,x,y,target) : Image}:
  match forks tree depth:
    case 0n _ _: {==}
    case 1n+rest Plan.Keep{} _: {==}
    case 1n+rest Plan.Tile{commands} _: {==}
    case 1n+rest Plan.Branch{tl,tr,bl,br} 0n: {==}
    case 1n+rest Plan.Branch{+tl,+tr,+bl,+br} 1n+lower:
      +h = U32.div(size,2)
      +xx = U32.add(x,h)
      +yy = U32.add(y,h)
      +a = Ops.tl(target)
      +b = Ops.tr(target)
      +c = Ops.bl(target)
      +d = Ops.br(target)
      quad_equal(Plan.pool(rest,tl,lower,h,x,y,a),Plan.pool(rest,tr,lower,h,xx,y,b),
        Plan.pool(rest,bl,lower,h,x,yy,c),Plan.pool(rest,br,lower,h,xx,yy,d),
        Plan.serial(tl,lower,h,x,y,a),Plan.serial(tr,lower,h,xx,y,b),
        Plan.serial(bl,lower,h,x,yy,c),Plan.serial(br,lower,h,xx,yy,d),
        agrees(rest,tl,lower,h,x,y,a),agrees(rest,tr,lower,h,xx,y,b),
        agrees(rest,bl,lower,h,x,yy,c),agrees(rest,br,lower,h,xx,yy,d))

def Laws.scheduling_refinement(forks,tree,depth,size,x,y,target):
  agrees(forks,tree,depth,size,x,y,target)

def Laws.offload_source_refinement(frame,forks,target):
  match frame:
    case Plan.Frame{depth,size,tree}: {==}

def idle(+tree: Plan.Tree,+depth: Nat,+size: U32,+background: Image,+previous: Image)
  -> {Plan.damaged(tree,depth,size,0,0,False{},Nil{},background,previous) == previous : Image}:
  match tree depth:
    case Plan.Keep{} 0n: {==}
    case Plan.Keep{} 1n+rest: {==}
    case Plan.Tile{commands} 0n: {==}
    case Plan.Tile{commands} 1n+rest: {==}
    case Plan.Branch{a,b,c,d} 0n: {==}
    case Plan.Branch{a,b,c,d} 1n+rest: {==}

def Laws.no_damage(frame,background,previous):
  match frame:
    case Plan.Frame{depth,size,tree}: idle(tree,depth,size,background,previous)

def Laws.removed_tile_restores_background(depth,size,x,y,damage,background,previous):
  match depth:
    case 0n: {==}
    case 1n+rest: {==}

def Laws.empty_commands(depth,size,x,y,image):
  {==}

def Laws.empty_texture(depth,colors,mask,x,y):
  {==}

def Laws.clipped_zero(depth,size,source_depth,source_size,x,y,colors,mask,clip,image):
  {==}

def Laws.nine_slice_zero(depth,size,rect,texture,insets,clip,image):
  {==}


def Laws.zero_tick_interval(delta,carry,max_steps):
  {==}


def Laws.hidden_rgb_filter_regression():
  {==}

def Laws.empty_layout_regression():
  {==}

def Laws.tick_conservation_regression():
  {==}
