# NEW DRAFT: exact proposal meanings and limits are in review-third/DRAFT_CONTRACTS.md.
import Base
import ../../third/Surface.bend as Surface
import ../../third/Blur.bend as Blur
import ../../third/PreparedSprite.bend as Cached
import ../../third/Raster.bend as Raster
import ../../third/Paint.bend as Paint
import ../../third/Shape.bend as Shape
import ../../third/Brush.bend as Brush
import ../../Rect.bend as Rect
import ../../ImageOps.bend as Ops

law group_full_identity:
  for +surface: Surface.Surface
  {Surface.opacity(surface,255) == surface : Surface.Surface}

law group_zero_preserves_extent:
  for +depth: Nat
  for +size: U32
  for +pixels: Image
  {Surface.opacity(Surface.Surface{depth,size,pixels},0) == Surface.Surface{depth,size,Pix{0}} : Surface.Surface}

law blur_zero_identity:
  for +surface: Surface.Surface
  for +border: Blur.Border
  {Blur.box(surface,0,border) == Some{surface} : Maybe<Surface.Surface>}

law cached_zero_identity:
  for +patch: Cached.Patch
  for +target: Image
  {Cached.draw(patch,0,target) == target : Image}

law empty_raster_identity:
  for +depth: Nat
  for +size: U32
  for +x: U32
  for +y: U32
  for +target: Image
  {Raster.serial(Nil{},depth,size,x,y,target) == target : Image}

law zero_coverage_identity:
  for +brush: Brush.Brush
  for +x: U32
  for +y: U32
  for +target: Image
  {Paint.pixel(True{},0,brush,x,y,target) == target : Image}

law paint_scheduling_refinement:
  for +forks: Nat
  for +depth: Nat
  for +span: U32
  for +x: U32
  for +y: U32
  for +outside: Bool
  for +shape: Shape.Shape
  for +brush: Brush.Brush
  for +quality: Shape.Quality
  for +clip: Rect.Box
  for +target: Image
  {Paint.pool(forks,depth,span,x,y,outside,shape,brush,quality,clip,target) == Paint.region(depth,span,x,y,outside,shape,brush,quality,clip,target) : Image}

law raster_offload_source_refinement:
  for +surface: Surface.Surface
  for +commands: List<&2,Raster.Command>
  for +forks: Nat
  {Raster.offload(surface,commands,forks) == Raster.render(surface,commands,forks) : Surface.Surface}
