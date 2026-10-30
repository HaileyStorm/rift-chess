# Stationary Canvas orbit preview. Bend owns game geometry, ordering and cues;
# browser antialiasing is approximate and does not replace v2 raster coverage.
import Base
import ./BoardScene.bend as BoardScene
import ../Scene.bend as Scene
import ../Camera.bend as Camera
import ../../core/Model.bend as Model
import ./SpritePlacement.bend as SpritePlacement
import ./PieceSprites.bend as PieceSprites
import ../../lib/graphics/Quad.bend as Quad
import ../../lib/graphics/Ortho.bend as Ortho
import ../../lib/graphics/v2/CanvasPreview.bend as Preview
import ../../lib/graphics/v2/RgbaSample.bend as Sample
import ../../lib/graphics/v2/Transform2D.bend as Transform
import ../../lib/graphics/v2/RaisedFacet.bend as RaisedFacet
import ../../lib/graphics/v2/Color.bend as Color

def supported(frame: Scene.Frame) -> Bool:
  BoardScene.sprite_motion_complete(frame)

def textures(pieces: PieceSprites.Pieces) -> List<&2,Sample.Texture>:
  match pieces:
    case PieceSprites.Pieces{ip,ik,ib,ir,iq,ix,np,nk,nb,nr,nq,nx}:
      [ip,ik,ib,ir,iq,ix,np,nk,nb,nr,nq,nx]

# Every stage prepends in painter order; only plan reverses the completed list.
def quad(a: Quad.Point,b: Quad.Point,c: Quad.Point,d: Quad.Point,
  color: U32,opacity: U32,acc: List<&2,Preview.Command>) ->
  List<&2,Preview.Command>:
  Preview.Polygon{[a,b,c,d],color,opacity} <> acc

def rail_edges(+a: Quad.Point,+b: Quad.Point,+c: Quad.Point,+d: Quad.Point,
  +e: Quad.Point,+f: Quad.Point,+g: Quad.Point,+h: Quad.Point,
  +color: U32,acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  +north = quad(a,b,f,e,color,255,acc)
  +east = quad(b,c,g,f,color,255,north)
  +south = quad(c,d,h,g,color,255,east)
  quad(d,a,e,h,color,255,south)

def rails(+camera: Camera.Basis,+theme: U32,acc: List<&2,Preview.Command>) ->
  List<&2,Preview.Command>:
  +inner_nw = BoardScene.point(camera,512,F32.neg(0.5),F32.neg(0.5))
  +inner_ne = BoardScene.point(camera,512,7.5,F32.neg(0.5))
  +inner_se = BoardScene.point(camera,512,7.5,7.5)
  +inner_sw = BoardScene.point(camera,512,F32.neg(0.5),7.5)
  +edge_nw = BoardScene.point(camera,512,F32.neg(0.60),F32.neg(0.60))
  +edge_ne = BoardScene.point(camera,512,7.60,F32.neg(0.60))
  +edge_se = BoardScene.point(camera,512,7.60,7.60)
  +edge_sw = BoardScene.point(camera,512,F32.neg(0.60),7.60)
  +outer_nw = BoardScene.point(camera,512,F32.neg(0.66),F32.neg(0.66))
  +outer_ne = BoardScene.point(camera,512,7.66,F32.neg(0.66))
  +outer_se = BoardScene.point(camera,512,7.66,7.66)
  +outer_sw = BoardScene.point(camera,512,F32.neg(0.66),7.66)
  +shadow = rail_edges(edge_nw,edge_ne,edge_se,edge_sw,
    outer_nw,outer_ne,outer_se,outer_sw,
    Bool.pick(U32,U32.is_zero(theme),1712926,2566960),acc)
  rail_edges(inner_nw,inner_ne,inner_se,inner_sw,edge_nw,edge_ne,edge_se,edge_sw,
    Bool.pick(U32,U32.is_zero(theme),14265708,15712384),shadow)

def inner_corners(+camera: Camera.Basis,+square: U32) -> BoardScene.Corners:
  +file = U32.to_f32(Model.file_of(square))
  +row = U32.to_f32(U32.sub(7,Model.rank_of(square)))
  +left = F32.sub(file,0.45)
  +right = F32.add(file,0.45)
  +top = F32.sub(row,0.45)
  +bottom = F32.add(row,0.45)
  BoardScene.Corners{BoardScene.point(camera,512,left,top),
    BoardScene.point(camera,512,right,top),BoardScene.point(camera,512,right,bottom),
    BoardScene.point(camera,512,left,bottom)}

def top_corners(outer: BoardScene.Corners,inner: BoardScene.Corners,
  material: BoardScene.TopMaterial,acc: List<&2,Preview.Command>) ->
  List<&2,Preview.Command>:
  match outer inner material:
    case BoardScene.Corners{+a,+b,+c,+d} BoardScene.Corners{+e,+f,+g,+h}
      BoardScene.TopMaterial{top,up,right,down,left}:
      +face = quad(a,b,c,d,top,255,acc)
      +north = quad(a,b,f,e,up,255,face)
      +east = quad(b,c,g,f,right,255,north)
      +south = quad(c,d,h,g,down,255,east)
      quad(d,a,e,h,left,255,south)

def top_tile(show: Bool,+square: U32,+camera: Camera.Basis,theme: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match show:
    case False{}: acc
    case True{}:
      +corners = BoardScene.square_corners(512,camera,
        Model.file_of(square),Model.rank_of(square))
      top_corners(corners,inner_corners(camera,square),
        BoardScene.top_material.with_corners(corners,BoardScene.surface(square,theme)),acc)

def tops(order: List<&2,U32>,+camera: Camera.Basis,+holes: U32,+theme: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match order:
    case Nil{}: acc
    case +square <> rest:
      tops(rest,camera,holes,theme,
        top_tile(Model.present(holes,square),square,camera,theme,acc))

def wall_edge(show: Bool,+a: Quad.Point,+b: Quad.Point,+drop: F32,
  color: U32,acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match show:
    case False{}: acc
    case True{}:
      quad(a,b,BoardScene.wall_drop(b,drop),BoardScene.wall_drop(a,drop),color,255,acc)

def wall_corners(+file: U32,+rank: U32,+holes: U32,corners: BoardScene.Corners,
  camera: Camera.Basis,+drop: F32,style: RaisedFacet.Surface,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match corners camera style:
    case BoardScene.Corners{+p00,+p10,+p11,+p01}
      Camera.Basis{+cosYaw,+sinYaw,sinPitch,cosPitch,scale,cx,cy}
      RaisedFacet.Surface{top,+side,+edge,shadow,glint}:
      +lit = Color.over(edge,side,52)
      +shade = Color.over(edge,Color.over(side,shadow,160),52)
      +up = wall_edge(Bool.and(F32.is_lt(cosYaw,F32.neg(0.02)),
        BoardScene.missing_rank_up(file,rank,holes)),p00,p10,drop,lit,acc)
      +right = wall_edge(Bool.and(F32.is_gt(sinYaw,0.02),
        BoardScene.missing_file_right(file,rank,holes)),p10,p11,drop,shade,up)
      +down = wall_edge(Bool.and(F32.is_gt(cosYaw,0.02),
        BoardScene.missing_rank_down(file,rank,holes)),p11,p01,drop,lit,right)
      wall_edge(Bool.and(F32.is_lt(sinYaw,F32.neg(0.02)),
        BoardScene.missing_file_left(file,rank,holes)),p01,p00,drop,shade,down)

def wall_tile(show: Bool,+square: U32,+camera: Camera.Basis,holes: U32,
  theme: U32,acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match show:
    case False{}: acc
    case True{}:
      +file = Model.file_of(square)
      +rank = Model.rank_of(square)
      wall_corners(file,rank,holes,BoardScene.square_corners(512,camera,file,rank),
        camera,BoardScene.extrusion(512,camera),BoardScene.surface(square,theme),acc)

def walls(order: List<&2,U32>,+camera: Camera.Basis,+holes: U32,+theme: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match order:
    case Nil{}: acc
    case +square <> rest:
      walls(rest,camera,holes,theme,
        wall_tile(Model.present(holes,square),square,camera,holes,theme,acc))

def texture_index(+code: U32) -> U32:
  # Code seven carries an unmoved pawn's right, not a seventh artwork kind.
  +kind = Bool.pick(U32,Model.is_pawn(code),1,Model.piece_type(code))
  U32.add(Bool.pick(U32,Model.is_white(code),0,6),U32.sub(kind,1))

def sprite_rect(matrix: Transform.Matrix,texture: U32,label: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match matrix:
    case Transform.Matrix{a,b,c,d,tx,ty}:
      Preview.Sprite{texture,F32.floor(tx),F32.floor(ty),
        F32.to_u32(F32.max(1.0,F32.round(a))),
        F32.to_u32(F32.max(1.0,F32.round(d))),255,label} <> acc

def contact(center: Quad.Point,+width: F32,kind: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match center:
    case Quad.Point{x,y}:
      Preview.Ellipse{Quad.Point{x,BoardScene.sprite_contact_base(kind,width,y)},
        F32.mul(width,0.18),F32.mul(width,0.045),727076,48} <> acc

def piece(show: Bool,+square: U32,+code: U32,+camera: Camera.Basis,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match show:
    case False{}: acc
    case True{}:
      +center = SpritePlacement.center(512,camera,square)
      +width = SpritePlacement.width(512,camera)
      +shadow = contact(center,width,Model.piece_type(code),acc)
      sprite_rect(SpritePlacement.piece_matrix(512,camera,center,Model.piece_type(code)),
        texture_index(code),U32.add(square,1),shadow)

def pieces(order: List<&2,U32>,+camera: Camera.Basis,+holes: U32,
  +board: List<&2,U32>,acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match order:
    case Nil{}: acc
    case +square <> rest:
      +code = Model.board_get(board,square)
      pieces(rest,camera,holes,board,
        piece(Bool.and(Model.present(holes,square),Model.occupied(code)),
          square,code,camera,acc))

def outline(corners: BoardScene.Corners,+color: U32,+opacity: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match corners:
    case BoardScene.Corners{+a,+b,+c,+d}:
      +center = BoardScene.center_point(a,c)
      +e = BoardScene.inset_point(a,center)
      +f = BoardScene.inset_point(b,center)
      +g = BoardScene.inset_point(c,center)
      +h = BoardScene.inset_point(d,center)
      +top = quad(a,b,f,e,color,opacity,acc)
      +right = quad(b,c,g,f,color,opacity,top)
      +bottom = quad(c,d,h,g,color,opacity,right)
      quad(d,a,e,h,color,opacity,bottom)

def square_outline(show: Bool,+square: U32,camera: Camera.Basis,color: U32,
  opacity: U32,acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match show:
    case False{}: acc
    case True{}:
      outline(BoardScene.square_corners(512,camera,
        Model.file_of(square),Model.rank_of(square)),color,opacity,acc)

def macro_outline(show: Bool,macro: U32,camera: Camera.Basis,color: U32,
  opacity: U32,acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match show:
    case False{}: acc
    case True{}: outline(BoardScene.macro_corners(512,camera,macro),color,opacity,acc)

def tile_targets(items: List<&2,U32>,+camera: Camera.Basis,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match items:
    case Nil{}: acc
    case +macro <> rest:
      tile_targets(rest,camera,macro_outline(True{},macro,camera,16764762,200,acc))

def circle_points(fuel: Nat,+index: U32,+center: Quad.Point,+radius: F32) ->
  List<&2,Quad.Point>:
  match fuel:
    case 0n: []
    case 1n+rest:
      +angle = Ortho.radians(F32.mul(U32.to_f32(index),11.25))
      Quad.Point{F32.add(BoardScene.point_x(center),F32.mul(radius,F32.cos(angle))),
        F32.add(BoardScene.point_y(center),F32.mul(radius,F32.sin(angle)))} <>
        circle_points(rest,U32.add(index,1),center,radius)

def square_center(+camera: Camera.Basis,+square: U32) -> Quad.Point:
  Quad.Point{U32.to_f32(BoardScene.square_x(512,camera,square)),
    U32.to_f32(BoardScene.square_y(512,camera,square))}

def ring(+camera: Camera.Basis,square: U32,+inner: U32,+outer: U32,
  color: U32,opacity: U32,acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  +radius = F32.div(U32.to_f32(U32.add(inner,outer)),2.0)
  Preview.Line{circle_points(32n,0,square_center(camera,square),radius),
    color,opacity,U32.to_f32(U32.sub(outer,inner)),True{}} <> acc

def dot(camera: Camera.Basis,square: U32,+radius: F32,color: U32,opacity: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  Preview.Ellipse{square_center(camera,square),radius,radius,color,opacity} <> acc

def target(capture: Bool,+camera: Camera.Basis,+square: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match capture:
    case False{}: dot(camera,square,4.0,4638419,238,acc)
    case True{}:
      +outer = ring(camera,square,16,18,16731983,220,acc)
      ring(camera,square,22,24,16768672,200,outer)

def targets(items: List<&2,U32>,+camera: Camera.Basis,+board: List<&2,U32>,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match items:
    case Nil{}: acc
    case +square <> rest:
      targets(rest,camera,board,
        target(Model.occupied(Model.board_get(board,square)),camera,square,acc))

def recent_action(action: Model.Action,+camera: Camera.Basis,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match action:
    case Model.MoveAction{from,to,promotion}:
      +start = ring(camera,from,20,21,7112872,138,acc)
      ring(camera,to,20,21,7112872,138,start)
    case Model.ShiftAction{from,to,promotion}:
      macro_outline(True{},to,camera,7112872,138,acc)

def recent(decoded: Maybe<Model.Action>,camera: Camera.Basis,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match decoded:
    case None{}: acc
    case Some{action}: recent_action(action,camera,acc)

def promotion_ready(show: Bool,+camera: Camera.Basis,+to: U32,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match show:
    case False{}: acc
    case True{}:
      Preview.Ellipse{Quad.Point{U32.to_f32(BoardScene.square_x(512,camera,to)),
        U32.to_f32(U32.sub(BoardScene.square_y(512,camera,to),45))},
        4.0,4.0,16768672,245} <> acc

def promotion_action(action: Model.Action,camera: Camera.Basis,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match action:
    case Model.ShiftAction{from,to,promotion}: acc
    case Model.MoveAction{from,to,promotion}:
      promotion_ready(U32.is_gt(promotion,0),camera,to,acc)

def promotion(decoded: Maybe<Model.Action>,camera: Camera.Basis,
  acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  match decoded:
    case None{}: acc
    case Some{action}: promotion_action(action,camera,acc)

def tile_hover_ready(show: Bool,+square: U32,+frame: Scene.Frame,
  camera: Camera.Basis,holes: U32,acc: List<&2,Preview.Command>) ->
  List<&2,Preview.Command>:
  match show:
    case False{}: acc
    case True{}:
      +macro = Model.macro_of(square)
      +visible = Bool.and(Model.present(holes,square),
        Bool.and(U32.is_ne(macro,Scene.frame_tile(frame)),
          BoardScene.movable_macro(Scene.frame_shifts(frame),macro)))
      macro_outline(visible,macro,camera,16764762,144,acc)

def feedback(+frame: Scene.Frame,+camera: Camera.Basis,holes: U32,
  +board: List<&2,U32>,acc: List<&2,Preview.Command>) -> List<&2,Preview.Command>:
  +action = Scene.frame_lastAction(frame)
  +check = Scene.frame_check(frame)
  +tile = Scene.frame_tile(frame)
  +selected = Scene.frame_selected(frame)
  +hovered = Scene.frame_hovered(frame)
  +a = recent(Model.decode(action),camera,acc)
  +b = square_outline(U32.is_lt(check,64),check,camera,16731983,255,a)
  +destinations = tile_targets(Scene.frame_tileTargets(frame),camera,b)
  +d = macro_outline(U32.is_lt(tile,16),tile,camera,16764762,255,destinations)
  +e = square_outline(U32.is_lt(selected,64),selected,camera,5434367,255,d)
  +f = targets(Scene.frame_targets(frame),camera,board,e)
  +promoted = promotion(Model.decode(action),camera,f)
  tile_hover_ready(U32.is_lt(hovered,64),hovered,frame,camera,holes,promoted)

def plan_ready(ready: Bool,+frame: Scene.Frame) -> List<&2,Preview.Command>:
  match ready:
    case False{}: []
    case True{}:
      +camera = Camera.basis(Scene.frame_view(frame))
      +position = Scene.frame_position(frame)
      +holes = Model.pos_holes(position)
      +board = Model.pos_board(position)
      +theme = Scene.frame_theme(frame)
      +order = Camera.depth_order(camera)
      +framed = rails(camera,theme,[])
      # Opaque present tops mask every wall overlapping their projected union,
      # matching MotionWall's geometric presence exclusion.
      +sides = walls(order,camera,holes,theme,framed)
      +tiled = tops(order,camera,holes,theme,sides)
      +artwork = pieces(order,camera,holes,board,tiled)
      List.reverse(&2,Preview.Command,feedback(frame,camera,holes,board,artwork))

def plan(+frame: Scene.Frame) -> List<&2,Preview.Command>:
  plan_ready(supported(frame),frame)

