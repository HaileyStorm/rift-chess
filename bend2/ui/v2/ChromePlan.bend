# Rift Observatory chrome prototype. Geometry is returned with the controls so
# the exact same bounds can drive both painting and pointer/keyboard hit tests.
import Base

# Width and height are logical layout units; scale maps them to output pixels.
# `scale` must equal output size / 1024, and boardDepth must match the supplied
# board-only quadtree's 2^depth side length.


type Rect is Data:
  Rect{x: U32, y: U32, width: U32, height: U32}

type Control is Data:
  Control{id: U32, label: String, bounds: Rect, enabled: Bool, active: Bool}

def rect_x(r: Rect) -> U32:
  match r:
    case Rect{x, _, _, _}: x

def rect_y(r: Rect) -> U32:
  match r:
    case Rect{_, y, _, _}: y

def rect_width(r: Rect) -> U32:
  match r:
    case Rect{_, _, width, _}: width

def rect_height(r: Rect) -> U32:
  match r:
    case Rect{_, _, _, height}: height

def control_id(c: Control) -> U32:
  match c:
    case Control{id, _, _, _, _}: id

def control_label(c: Control) -> String:
  match c:
    case Control{_, label, _, _, _}: label

def control_bounds(c: Control) -> Rect:
  match c:
    case Control{_, _, bounds, _, _}: bounds

def control_enabled(c: Control) -> Bool:
  match c:
    case Control{_, _, _, enabled, _}: enabled

def control_active(c: Control) -> Bool:
  match c:
    case Control{_, _, _, _, active}: active

type Viewport is Data:
  Viewport{width: U32, height: U32, scale: U32, boardDepth: Nat}

type Plan is Data:
  Plan{width: U32, height: U32, scale: U32, boardDepth: Nat,
    mobile: Bool, stage: Rect, board: Rect,
    controls: List<&2, Control>}

def plan_width(p: Plan) -> U32:
  match p:
    case Plan{width, _, _, _, _, _, _, _}: width

def plan_height(p: Plan) -> U32:
  match p:
    case Plan{_, height, _, _, _, _, _, _}: height

def plan_scale(p: Plan) -> U32:
  match p:
    case Plan{_, _, scale, _, _, _, _, _}: scale

def plan_board_depth(p: Plan) -> Nat:
  match p:
    case Plan{_, _, _, boardDepth, _, _, _, _}: boardDepth

def plan_mobile(p: Plan) -> Bool:
  match p:
    case Plan{_, _, _, _, mobile, _, _, _}: mobile

def plan_stage(p: Plan) -> Rect:
  match p:
    case Plan{_, _, _, _, _, stage, _, _}: stage

def plan_board(p: Plan) -> Rect:
  match p:
    case Plan{_, _, _, _, _, _, board, _}: board

def plan_controls(p: Plan) -> List<&2, Control>:
  match p:
    case Plan{_, _, _, _, _, _, _, controls}: controls

def desktop_width() -> U32:
  1024

def desktop_height() -> U32:
  640

def portrait_width() -> U32:
  512

def portrait_height() -> U32:
  1024

def board_rect(mobile: Bool) -> Rect:
  Bool.pick(Rect, mobile, Rect{0, 64, 512, 512},
    Rect{64, 96, 512, 512})

def stage_rect(mobile: Bool) -> Rect:
  Bool.pick(Rect, mobile, Rect{0, 44, 512, 536},
    Rect{52, 68, 580, 562})

def dest_id(+id: U32) -> Bool:
  Bool.and(U32.is_ge(id, 1000), U32.is_lt(id, 22760))

def shift_dest(id: U32) -> Bool:
  U32.is_ge(id, 21480)

def top_rect(+mobile: Bool, +id: U32) -> Rect:
  match mobile id:
    case True{} 1: Rect{246, 9, 76, 34}
    case True{} 2: Rect{328, 9, 88, 34}
    case True{} 27: Rect{422, 9, 74, 34}
    case False{} 1: Rect{640, 14, 72, 34}
    case False{} 2: Rect{722, 14, 84, 34}
    case False{} 27: Rect{816, 14, 62, 34}
    case _ _: Rect{0, 0, 1, 1}

def destination_rect(+mobile: Bool, +menu: U32, +ordinal: U32) -> Rect:
  match mobile:
    case True{}:
      +many = U32.is_eq(menu, 7)
      +columns = Bool.pick(U32, many, 6, 3)
      +column = U32.mod(ordinal, columns)
      +row = U32.div(ordinal, columns)
      +start_y = Bool.pick(U32, U32.is_eq(menu, 7), 676, 712)
      +step_y = Bool.pick(U32, many, 30, 26)
      +height = Bool.pick(U32, many, 26, 24)
      +step_x = Bool.pick(U32, many, 80, 160)
      +width = Bool.pick(U32, many, 72, 152)
      Rect{U32.add(16, U32.mul(column, step_x)),
        U32.add(start_y, U32.mul(row, step_y)), width, height}
    case False{}:
      +many = U32.is_eq(menu, 7)
      +columns = Bool.pick(U32, many, 4, 3)
      +column = U32.mod(ordinal, columns)
      +row = U32.div(ordinal, columns)
      +start_y = Bool.pick(U32, U32.is_eq(menu, 7), 170, 238)
      +step_y = Bool.pick(U32, U32.is_eq(menu, 7), 30, 24)
      +height = Bool.pick(U32, U32.is_eq(menu, 7), 26, 20)
      +step_x = Bool.pick(U32, many, 66, 87)
      +width = Bool.pick(U32, many, 62, 82)
      Rect{U32.add(610, U32.mul(column, step_x)),
        U32.add(start_y, U32.mul(row, step_y)), width, height}

def play_rect.desktop(+id: U32) -> Rect:
  match id:
    case 3: Rect{610, 380, 128, 24}
    case 4: Rect{610, 406, 128, 24}
    case 5: Rect{746, 406, 128, 24}
    case 6: Rect{746, 380, 128, 24}
    case 7: Rect{610, 432, 128, 24}
    case 8: Rect{746, 432, 128, 24}
    case 9: Rect{610, 458, 128, 24}
    case 10: Rect{746, 458, 128, 24}
    case 11: Rect{610, 564, 82, 20}
    case 12: Rect{697, 564, 82, 20}
    case 13: Rect{784, 564, 82, 20}
    case 14: Rect{610, 586, 82, 20}
    case 15: Rect{697, 586, 82, 20}
    case 16: Rect{784, 586, 82, 20}
    case 17: Rect{610, 608, 82, 20}
    case 18: Rect{697, 608, 82, 20}
    case 19: Rect{784, 608, 82, 20}
    case 47: Rect{794, 212, 80, 22}
    case 55: Rect{792, 490, 86, 24}
    case _: Rect{610, 380, 128, 24}

def play_rect.mobile(+id: U32) -> Rect:
  match id:
    case 3: Rect{16, 790, 152, 38}
    case 4: Rect{176, 790, 152, 38}
    case 5: Rect{336, 790, 160, 38}
    case 6: Rect{16, 834, 152, 38}
    case 7: Rect{176, 834, 152, 38}
    case 8: Rect{336, 834, 160, 38}
    case 9: Rect{16, 878, 176, 38}
    case 10: Rect{200, 878, 120, 38}
    case 47: Rect{336, 712, 160, 24}
    case 55: Rect{328, 878, 168, 38}
    case 11: Rect{16, 946, 88, 28}
    case 12: Rect{112, 946, 88, 28}
    case 13: Rect{208, 946, 88, 28}
    case 14: Rect{304, 946, 88, 28}
    case 15: Rect{400, 946, 96, 28}
    case 16: Rect{16, 980, 110, 28}
    case 17: Rect{134, 980, 110, 28}
    case 18: Rect{252, 980, 110, 28}
    case 19: Rect{370, 980, 126, 28}
    case _: Rect{16, 790, 152, 26}

def settings_rect(+mobile: Bool, +id: U32) -> Rect:
  match mobile id:
    case True{} 28: Rect{432, 594, 64, 30}
    case True{} 22: Rect{16, 672, 232, 32}
    case True{} 23: Rect{264, 672, 232, 32}
    case True{} 24: Rect{16, 720, 152, 32}
    case True{} 25: Rect{176, 720, 152, 32}
    case True{} 26: Rect{336, 720, 160, 32}
    case True{} 53: Rect{16, 804, 232, 32}
    case True{} 54: Rect{264, 804, 232, 32}
    case True{} 20: Rect{16, 888, 232, 32}
    case True{} 21: Rect{264, 888, 232, 32}
    case False{} 28: Rect{824, 82, 62, 30}
    case False{} 22: Rect{610, 160, 128, 30}
    case False{} 23: Rect{746, 160, 128, 30}
    case False{} 24: Rect{610, 220, 82, 30}
    case False{} 25: Rect{697, 220, 82, 30}
    case False{} 26: Rect{784, 220, 82, 30}
    case False{} 53: Rect{610, 280, 128, 30}
    case False{} 54: Rect{746, 280, 128, 30}
    case False{} 20: Rect{610, 340, 128, 30}
    case False{} 21: Rect{746, 340, 128, 30}
    case _ _: Rect{16, 830, 232, 36}

def new_rect(+mobile: Bool, +id: U32) -> Rect:
  match mobile id:
    case True{} 28: Rect{432, 594, 64, 30}
    case True{} 29: Rect{16, 676, 480, 36}
    case True{} 30: Rect{16, 758, 152, 36}
    case True{} 31: Rect{176, 758, 152, 36}
    case True{} 32: Rect{336, 758, 160, 36}
    case True{} 33: Rect{16, 842, 232, 36}
    case True{} 34: Rect{264, 842, 232, 36}
    case True{} 35: Rect{16, 922, 152, 36}
    case True{} 36: Rect{176, 922, 152, 36}
    case True{} 37: Rect{336, 922, 160, 36}
    case False{} 28: Rect{824, 82, 62, 30}
    case False{} 29: Rect{610, 176, 264, 32}
    case False{} 30: Rect{610, 240, 88, 30}
    case False{} 31: Rect{700, 240, 88, 30}
    case False{} 32: Rect{790, 240, 88, 30}
    case False{} 33: Rect{610, 302, 128, 30}
    case False{} 34: Rect{746, 302, 128, 30}
    case False{} 35: Rect{610, 364, 88, 30}
    case False{} 36: Rect{700, 364, 88, 30}
    case False{} 37: Rect{790, 364, 88, 30}
    case _ _: Rect{16, 830, 232, 36}

def history_rect(+mobile: Bool, +id: U32) -> Rect:
  match mobile id:
    case True{} 28: Rect{432, 594, 64, 30}
    case True{} 45: Rect{16, 950, 232, 32}
    case True{} 46: Rect{264, 950, 232, 32}
    case False{} 28: Rect{824, 82, 62, 30}
    case False{} 45: Rect{610, 570, 126, 30}
    case False{} 46: Rect{748, 570, 126, 30}
    case _ _: Rect{16, 830, 232, 36}

def generic_menu_rect(+mobile: Bool, +menu: U32, +id: U32,
  +fallback: Rect) -> Rect:
  match menu id:
    case 3 28: Bool.pick(Rect, mobile, Rect{432, 594, 64, 30}, Rect{824, 82, 62, 30})
    case 3 44: Bool.pick(Rect, mobile, Rect{16, 740, 480, 34}, Rect{746, 196, 128, 30})
    case 4 28: Bool.pick(Rect, mobile, Rect{432, 594, 64, 30}, Rect{824, 82, 62, 30})
    case 4 38: Bool.pick(Rect, mobile, Rect{16, 740, 232, 34}, Rect{610, 196, 128, 30})
    case 4 39: Bool.pick(Rect, mobile, Rect{264, 740, 232, 34}, Rect{746, 196, 128, 30})
    case 4 40: Bool.pick(Rect, mobile, Rect{16, 784, 232, 34}, Rect{610, 240, 128, 30})
    case 4 41: Bool.pick(Rect, mobile, Rect{264, 784, 232, 34}, Rect{746, 240, 128, 30})
    case 5 28: Bool.pick(Rect, mobile, Rect{432, 594, 64, 30}, Rect{824, 82, 62, 30})
    case 5 42: Bool.pick(Rect, mobile, Rect{16, 866, 480, 36}, Rect{610, 258, 264, 32})
    case 5 51: Bool.pick(Rect, mobile, Rect{16, 740, 232, 34}, Rect{610, 196, 128, 30})
    case 5 52: Bool.pick(Rect, mobile, Rect{264, 740, 232, 34}, Rect{746, 196, 128, 30})
    case 6 28: Bool.pick(Rect, mobile, Rect{432, 594, 64, 30}, Rect{824, 82, 62, 30})
    case 6 43: Bool.pick(Rect, mobile, Rect{16, 740, 232, 34}, Rect{610, 196, 128, 30})
    case 6 44: Bool.pick(Rect, mobile, Rect{264, 740, 232, 34}, Rect{746, 196, 128, 30})
    case 8 28: Bool.pick(Rect, mobile, Rect{432, 594, 64, 30}, Rect{824, 82, 62, 30})
    case 8 48: Bool.pick(Rect, mobile, Rect{16, 740, 480, 34}, Rect{610, 196, 264, 30})
    case 9 28: Bool.pick(Rect, mobile, Rect{432, 594, 64, 30}, Rect{824, 82, 62, 30})
    case 9 49: Bool.pick(Rect, mobile, Rect{16, 740, 232, 34}, Rect{610, 196, 128, 30})
    case 9 50: Bool.pick(Rect, mobile, Rect{264, 740, 232, 34}, Rect{746, 196, 128, 30})
    case _ _: fallback

def menu_rect(+mobile: Bool, +menu: U32, +id: U32, +fallback: Rect) -> Rect:
  match menu:
    case 1: new_rect(mobile, id)
    case 2: settings_rect(mobile, id)
    case 7:
      match id:
        case 28: Bool.pick(Rect, mobile, Rect{432, 594, 64, 30}, Rect{824, 82, 62, 30})
        case _: fallback
    case 10: history_rect(mobile, id)
    case _:
      generic_menu_rect(mobile, menu, id, fallback)

def planned_rect.menu(+mobile: Bool, +menu: U32, +id: U32,
  +fallback: Rect) -> Rect:
  match mobile menu:
    case True{} 0: play_rect.mobile(id)
    case False{} 0: play_rect.desktop(id)
    case _ _: menu_rect(mobile, menu, id, fallback)

def planned_rect.destination(is_destination: Bool, +mobile: Bool, +menu: U32,
  +id: U32, +fallback: Rect, +ordinal: U32) -> Rect:
  match is_destination:
    case True{}: destination_rect(mobile, menu, ordinal)
    case False{}: planned_rect.menu(mobile, menu, id, fallback)

def planned_rect(+mobile: Bool, +menu: U32, +id: U32, +fallback: Rect,
  +ordinal: U32) -> Rect:
  match id:
    case 1: top_rect(mobile, id)
    case 2: top_rect(mobile, id)
    case 27: top_rect(mobile, id)
    case _:
      planned_rect.destination(dest_id(id), mobile, menu, id, fallback, ordinal)

def plan_controls.go(controls: List<&2, Control>, +mobile: Bool,
  +menu: U32, +ordinal: U32) -> List<&2, Control>:
  match controls:
    case Nil{}: []
    case +head <> tail:
      +id = control_id(head)
      +bounds = control_bounds(head)
      +is_destination = dest_id(id)
      +next_ordinal = U32.add(ordinal, Bool.to_u32(is_destination))
      +position = planned_rect(mobile, menu, id, bounds, ordinal)
      +rest = plan_controls.go(tail, mobile, menu, next_ordinal)
      Control{id, control_label(head), position,
        control_enabled(head), control_active(head)} <> rest

def scale_rect(+scale: U32, +r: Rect) -> Rect:
  Rect{U32.mul(scale, rect_x(r)), U32.mul(scale, rect_y(r)),
    U32.mul(scale, rect_width(r)), U32.mul(scale, rect_height(r))}

def scale_controls.go(controls: List<&2, Control>, +scale: U32) -> List<&2, Control>:
  match controls:
    case Nil{}: []
    case +head <> tail:
      +id = control_id(head)
      +rect = scale_rect(scale, control_bounds(head))
      +rest = scale_controls.go(tail, scale)
      Control{id, control_label(head), rect,
        control_enabled(head), control_active(head)} <> rest

def plan_for(menu: U32, controls: List<&2, Control>,
  +viewport: Viewport) -> Plan:
  match viewport:
    case Viewport{width, height, scale, boardDepth}:
      +mobile = U32.is_le(width, height)
      +logical = plan_controls.go(controls, mobile, menu, 0)
      +planned = scale_controls.go(logical, scale)
      Plan{U32.mul(width, scale), U32.mul(height, scale), scale, boardDepth,
        mobile, scale_rect(scale, stage_rect(mobile)),
        scale_rect(scale, board_rect(mobile)), planned}

def inside(+x: U32, +y: U32, +r: Rect) -> Bool:
  +within_x = Bool.and(U32.is_ge(x, rect_x(r)),
    U32.is_lt(x, U32.add(rect_x(r), rect_width(r))))
  +within_y = Bool.and(U32.is_ge(y, rect_y(r)),
    U32.is_lt(y, U32.add(rect_y(r), rect_height(r))))
  Bool.and(within_x, within_y)

def hit.go(+x: U32, +y: U32, controls: List<&2, Control>) -> U32:
  match controls:
    case Nil{}: 0
    case +head <> tail:
      +in_bounds = inside(x, y, control_bounds(head))
      +eligible = Bool.and(in_bounds, control_enabled(head))
      Bool.pick(U32, eligible, control_id(head), hit.go(x, y, tail))

def hit(p: Plan, +x: U32, +y: U32) -> U32:
  hit.go(x, y, plan_controls(p))

