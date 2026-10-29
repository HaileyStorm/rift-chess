# Browser/native v2 presentation geometry. The game still owns which controls
# exist and are enabled; one planned rectangle drives painting and hit tests.
import Base
import ./ChromePlan.bend as P

def scaled(+scale: U32, +rect: P.Rect) -> P.Rect:
  P.Rect{U32.mul(scale, P.rect_x(rect)), U32.mul(scale, P.rect_y(rect)),
    U32.mul(scale, P.rect_width(rect)), U32.mul(scale, P.rect_height(rect))}

def board(mobile: Bool) -> P.Rect:
  Bool.pick(P.Rect, mobile, P.Rect{0,112,512,512}, P.Rect{256,64,512,512})

def stage(mobile: Bool) -> P.Rect:
  Bool.pick(P.Rect, mobile, P.Rect{0,106,512,524}, P.Rect{246,54,532,532})

def top(mobile: Bool, id: U32) -> P.Rect:
  match mobile id:
    case True{} 3: P.Rect{226,12,86,38}
    case True{} 56: P.Rect{318,12,86,38}
    case True{} 57: P.Rect{410,12,86,38}
    case False{} 3: P.Rect{738,12,78,36}
    case False{} 56: P.Rect{824,12,78,36}
    case False{} 57: P.Rect{910,12,78,36}
    case _ _: P.Rect{0,0,1,1}

def play.desktop(+id: U32) -> P.Rect:
  match id:
    case 4: P.Rect{28,466,100,38}
    case 5: P.Rect{140,466,100,38}
    case 47: P.Rect{28,208,212,40}
    case _: top(False{},id)

def play.mobile(+id: U32) -> P.Rect:
  match id:
    case 4: P.Rect{16,820,232,40}
    case 5: P.Rect{256,820,240,40}
    case 47: P.Rect{16,728,480,42}
    case _: top(True{},id)

def destination(+mobile: Bool, +menu: U32, +ordinal: U32) -> P.Rect:
  +many = U32.is_eq(menu,7)
  +cols = Bool.pick(U32, many, 4, Bool.pick(U32,mobile,4,2))
  +col = U32.mod(ordinal,cols)
  +row = U32.div(ordinal,cols)
  +x = Bool.pick(U32,mobile,U32.add(16,U32.mul(col,124)),
    Bool.pick(U32,many,U32.add(280,U32.mul(col,176)),U32.add(28,U32.mul(col,112))))
  +y = Bool.pick(U32,mobile,
    Bool.pick(U32,many,U32.add(704,U32.mul(row,34)),U32.add(728,U32.mul(row,42))),
    Bool.pick(U32,many,U32.add(222,U32.mul(row,42)),U32.add(208,U32.mul(row,40))))
  +width = Bool.pick(U32,mobile,116,Bool.pick(U32,many,168,100))
  P.Rect{x,y,width,Bool.pick(U32,Bool.and(mobile,many),28,34)}

def destination_close(mobile: Bool) -> P.Rect:
  Bool.pick(P.Rect,mobile,P.Rect{424,648,72,38},P.Rect{916,154,72,36})

def camera_dialog.desktop(+id: U32,+ordinal: U32) -> P.Rect:
  match id:
    case 28: P.Rect{932,96,68,32}
    case _:
      +col = U32.mod(ordinal,2)
      +row = U32.div(ordinal,2)
      P.Rect{U32.add(788,U32.mul(col,108)),
        U32.add(170,U32.mul(row,55)),104,42}

def dialog(+mobile: Bool,+menu: U32,+id: U32,+ordinal: U32) -> P.Rect:
  match mobile menu:
    case False{} 11: camera_dialog.desktop(id,ordinal)
    case _ _:
      match id:
        case 28: Bool.pick(P.Rect,mobile,P.Rect{424,648,72,38},P.Rect{686,112,70,36})
        case _:
          +col = U32.mod(ordinal,3)
          +row = U32.div(ordinal,3)
          +group_gap = Bool.pick(U32,
            Bool.and(U32.is_eq(menu,12),U32.is_ge(ordinal,6)),20,0)
          Bool.pick(P.Rect,mobile,
            P.Rect{U32.add(24,U32.mul(col,160)),
              U32.add(U32.add(700,U32.mul(row,54)),group_gap),144,44},
            P.Rect{U32.add(288,U32.mul(col,152)),
              U32.add(U32.add(194,U32.mul(row,60)),group_gap),136,46})

def bounds.menu(+mobile: Bool, +menu: U32, +id: U32,
  +destination_ordinal: U32, +dialog_ordinal: U32) -> P.Rect:
  match menu:
    case 0:
      Bool.pick(P.Rect,P.dest_id(id),destination(mobile,menu,destination_ordinal),
        Bool.pick(P.Rect,mobile,play.mobile(id),play.desktop(id)))
    case 7: Bool.pick(P.Rect,P.dest_id(id),destination(mobile,menu,destination_ordinal),
      destination_close(mobile))
    case _: dialog(mobile,menu,id,dialog_ordinal)

def bounds(+mobile: Bool, +menu: U32, +id: U32,
  +destination_ordinal: U32, +dialog_ordinal: U32) -> P.Rect:
  bounds.menu(mobile,menu,id,destination_ordinal,dialog_ordinal)

def place.go(controls: List<&2,P.Control>, +mobile: Bool, +menu: U32,
  +scale: U32, +destination_ordinal: U32,
  +dialog_ordinal: U32) -> List<&2,P.Control>:
  match controls:
    case Nil{}: []
    case +head <> tail:
      +id = P.control_id(head)
      +position = scaled(scale,bounds(mobile,menu,id,destination_ordinal,dialog_ordinal))
      +next_destination = U32.add(destination_ordinal,Bool.to_u32(P.dest_id(id)))
      +is_dialog = Bool.and(Bool.not(P.dest_id(id)),U32.is_ne(id,28))
      +next_dialog = U32.add(dialog_ordinal,Bool.to_u32(is_dialog))
      P.Control{id,P.control_label(head),position,
        P.control_enabled(head),P.control_active(head)} <>
        place.go(tail,mobile,menu,scale,next_destination,next_dialog)

def plan_for(+menu: U32, controls: List<&2,P.Control>,
  +viewport: P.Viewport) -> P.Plan:
  match viewport:
    case P.Viewport{width,height,scale,boardDepth}:
      +mobile = U32.is_le(width,height)
      P.Plan{U32.mul(width,scale),U32.mul(height,scale),scale,boardDepth,mobile,
        scaled(scale,stage(mobile)),scaled(scale,board(mobile)),
        place.go(controls,mobile,menu,scale,0,0)}
