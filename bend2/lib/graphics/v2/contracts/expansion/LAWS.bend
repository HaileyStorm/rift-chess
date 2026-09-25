# NEW DRAFT contracts: see review-expansion/DRAFT_PROPOSALS.md and API.md.
# Structural source equality is NOT a runtime CPU/GPU implementation proof.
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

law scheduling_refinement:
  for +forks: Nat
  for +tree: Plan.Tree
  for +depth: Nat
  for +size: U32
  for +x: U32
  for +y: U32
  for +target: Image
  {Plan.pool(forks,tree,depth,size,x,y,target) == Plan.serial(tree,depth,size,x,y,target) : Image}

law offload_source_refinement:
  for +frame: Plan.Frame
  for +forks: Nat
  for +target: Image
  {Plan.render_offload(frame,forks,target) == Plan.render(frame,forks,target) : Image}

law no_damage:
  for +frame: Plan.Frame
  for +background: Image
  for +previous: Image
  {Plan.repaint(frame,Nil{},background,previous) == previous : Image}

law removed_tile_restores_background:
  for +depth: Nat
  for +size: U32
  for +x: U32
  for +y: U32
  for +damage: List<&2,Rect.Box>
  for +background: Image
  for +previous: Image
  {Plan.damaged(Plan.Keep{},depth,size,x,y,True{},damage,background,previous) == background : Image}

law empty_commands:
  for +depth: Nat
  for +size: U32
  for +x: U32
  for +y: U32
  for +image: Image
  {Draw.render(Nil{},depth,size,x,y,image) == image : Image}

law empty_texture:
  for +depth: Nat
  for +colors: Image
  for +mask: Image
  for +x: U32
  for +y: U32
  {Sample.nearest(Sample.Texture{depth,0,colors,mask},x,y) == Sample.Texel{0,0} : Sample.Texel}

law clipped_zero:
  for +depth: Nat
  for +size: U32
  for +source_depth: Nat
  for +source_size: U32
  for +x: Shapes.Coord
  for +y: Shapes.Coord
  for +colors: Image
  for +mask: Image
  for +clip: Rect.Box
  for +image: Image
  {Stamp.draw(depth,size,source_depth,source_size,x,y,colors,mask,0,clip,image) == image : Image}

law nine_slice_zero:
  for +depth: Nat
  for +size: U32
  for +rect: Rect.Box
  for +texture: Sample.Texture
  for +insets: Skin.Insets
  for +clip: Rect.Box
  for +image: Image
  {Skin.draw(depth,size,rect,texture,insets,0,clip,image) == image : Image}


law zero_tick_interval:
  for +delta: U32
  for +carry: U32
  for +max_steps: U32
  {Motion.ticks(delta,carry,0,max_steps) == Motion.InvalidInterval{} : Motion.TickBudget}


law hidden_rgb_filter_regression:
  {Sample.mix(Sample.Texel{16711680,255},Sample.Texel{255,0},
    Sample.Texel{65280,0},Sample.Texel{16777215,0},128,128) ==
    Sample.Texel{16711680,64} : Sample.Texel}

law empty_layout_regression:
  {Text.layout(Nil{},Text.Settings{320,28,16,24,True{}}) ==
    Text.Layout{Nil{},Nil{},Text.Metrics{0,0,0,0,False{}}} : Text.Layout}

law tick_conservation_regression:
  {Motion.ticks(100,7,16,3) == Motion.Ticks{3,11,48n} : Motion.TickBudget}
