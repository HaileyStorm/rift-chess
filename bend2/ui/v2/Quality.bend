# Pure automatic raster-detail policy for the Bend browser controller.
# The host reports bounded measurements; it does not choose quality tiers.
import Base

type State is Data:
  State{scale: U32, fastWindows: U32, slowWindows: U32}

type Probe is Data:
  Probe{portrait: Bool, physicalEdge: U32, timingValid: Bool,
    sampleCount: U32, measuredScale: U32,
    mainP90Us: U32, workerP90Us: U32}

type Decision is Data:
  Decision{next: State, scale: U32, width: U32, height: U32,
    boardSize: U32, depth: Nat, boardDepth: Nat,
    quality: String, responsiveness: String}

def initial_state() -> State:
  State{1, 0, 0}

def valid_scale.for(is_enhanced: Bool) -> U32:
  match is_enhanced:
    case True{}: 2
    case False{}: 1

def valid_scale(scale: U32) -> U32:
  valid_scale.for(U32.is_eq(scale, 2))

def increment_fast.for(full: Bool, count: U32) -> U32:
  match full:
    case True{}: 3
    case False{}: U32.add(count, 1)

def increment_fast(+count: U32) -> U32:
  increment_fast.for(U32.is_ge(count, 3), count)

def increment_slow.for(full: Bool, count: U32) -> U32:
  match full:
    case True{}: 2
    case False{}: U32.add(count, 1)

def increment_slow(+count: U32) -> U32:
  increment_slow.for(U32.is_ge(count, 2), count)

def measured_fast.scale1.on(worker_safe: Bool, main_ok: Bool,
  worker: U32, main: U32) -> Bool:
  match worker_safe main_ok:
    case False{} _: False{}
    case True{} False{}: False{}
    case True{} True{}:
      U32.is_le(U32.add(main, U32.mul(worker, 4)), 12000)

def measured_fast.scale1(+main: U32, +worker: U32) -> Bool:
  measured_fast.scale1.on(U32.is_le(worker, 2500), U32.is_le(main, 4000),
    worker, main)

def measured_fast.scale2.on(worker_safe: Bool, main_ok: Bool,
  worker: U32, main: U32) -> Bool:
  match worker_safe main_ok:
    case False{} _: False{}
    case True{} False{}: False{}
    case True{} True{}:
      U32.is_le(U32.add(main, worker), 12000)

def measured_fast.scale2(+main: U32, +worker: U32) -> Bool:
  measured_fast.scale2.on(U32.is_le(worker, 10000), U32.is_le(main, 4000),
    worker, main)

def measured_fast.for(scale: U32, main: U32, worker: U32) -> Bool:
  match scale:
    case 1: measured_fast.scale1(main, worker)
    case 2: measured_fast.scale2(main, worker)
    case _: False{}

def known_measured_scale(scale: U32) -> Bool:
  match scale:
    case 1: True{}
    case 2: True{}
    case _: False{}

def raster_width(scale: U32, portrait: Bool) -> U32:
  match scale portrait:
    case 1 False{}: 1024
    case 1 True{}: 512
    case 2 False{}: 2048
    case 2 True{}: 1024
    case _ _: 1024

def raster_height(scale: U32, portrait: Bool) -> U32:
  match scale portrait:
    case 1 False{}: 640
    case 1 True{}: 1024
    case 2 False{}: 1280
    case 2 True{}: 2048
    case _ _: 640

def raster_board(scale: U32) -> U32:
  match scale:
    case 2: 1024
    case _: 512

def raster_depth(scale: U32) -> Nat:
  match scale:
    case 2: 11n
    case _: 10n

def board_depth(scale: U32) -> Nat:
  match scale:
    case 2: 10n
    case _: 9n

def detail_name(scale: U32) -> String:
  match scale:
    case 2: "Enhanced detail"
    case _: "Standard detail"

def decision.for(+scale: U32, +portrait: Bool, next: State,
  responsiveness: String) -> Decision:
  Decision{next, scale, raster_width(scale, portrait),
    raster_height(scale, portrait), raster_board(scale),
    raster_depth(scale), board_depth(scale), detail_name(scale), responsiveness}

def edge_limited.for(not_measured: Bool) -> String:
  match not_measured:
    case True{}: "Waiting for viewport measurement"
    case False{}: "Viewport limits extra detail"

def edge_limited(physical_edge: U32) -> String:
  edge_limited.for(U32.is_zero(physical_edge))

def scale_after_fast.for(is_enhanced: Bool, ready: Bool) -> U32:
  match is_enhanced ready:
    case True{} _: 2
    case False{} True{}: 2
    case False{} False{}: 1

def scale_after_fast(current: U32, fast_windows: U32) -> U32:
  scale_after_fast.for(U32.is_eq(current, 2), U32.is_ge(fast_windows, 3))

def scale_after_slow.for(is_enhanced: Bool, ready: Bool) -> U32:
  match is_enhanced ready:
    case True{} True{}: 1
    case True{} False{}: 2
    case False{} _: 1

def scale_after_slow(current: U32, slow_windows: U32) -> U32:
  scale_after_slow.for(U32.is_eq(current, 2), U32.is_ge(slow_windows, 2))

def slow_message.for(was_enhanced: Bool, was_reduced: Bool,
  second_slow: Bool) -> String:
  match was_enhanced was_reduced second_slow:
    case True{} True{} True{}: "Detail reduced to protect responsiveness"
    case True{} _ _: "Elevated render time"
    case False{} _ _: "Render budget exceeded"

def slow_message(current: U32, selected: U32, slow_windows: U32) -> String:
  slow_message.for(U32.is_eq(current, 2), U32.is_eq(selected, 1),
    U32.is_ge(slow_windows, 2))

def choose.measured(fast: Bool, portrait: Bool, +current: U32,
  fast_windows: U32, slow_windows: U32) -> Decision:
  match fast:
    case True{}:
      +next_fast = increment_fast(fast_windows)
      +selected = scale_after_fast(current, next_fast)
      decision.for(selected, portrait, State{selected, next_fast, 0}, "Responsive")
    case False{}:
      +next_slow = increment_slow(slow_windows)
      +selected = scale_after_slow(current, next_slow)
      +message = slow_message(current, selected, next_slow)
      decision.for(selected, portrait, State{selected, 0, next_slow}, message)

def choose.timing(on: Bool, portrait: Bool, measured_scale: U32,
  main: U32, worker: U32, current: U32,
  fast_windows: U32, slow_windows: U32) -> Decision:
  match on:
    case False{}:
      decision.for(1, portrait, State{1, 0, 0}, "Measuring responsiveness")
    case True{}:
      choose.measured(measured_fast.for(measured_scale, main, worker),
        portrait, current, fast_windows, slow_windows)

def choose.edge(on: Bool, +probe: Probe, old: State) -> Decision:
  match on probe old:
    case False{} Probe{portrait, physicalEdge, _, _, _, _, _} _:
      decision.for(1, portrait, State{1, 0, 0}, edge_limited(physicalEdge))
    case True{} Probe{portrait, _, timingValid, sampleCount,
      +measuredScale, mainP90Us, workerP90Us} State{+scale, fastWindows, slowWindows}:
      choose.timing(Bool.and(timingValid,
        Bool.and(U32.is_ge(sampleCount, 8),
          Bool.and(known_measured_scale(measuredScale),
            U32.is_eq(measuredScale, valid_scale(scale))))),
        portrait, measuredScale, mainP90Us, workerP90Us,
        valid_scale(scale), fastWindows, slowWindows)

def current_message.for(enhanced: Bool, has_slow: Bool,
  has_fast: Bool) -> String:
  match enhanced has_slow has_fast:
    case True{} True{} _: "Elevated render time"
    case True{} False{} _: "Responsive"
    case False{} True{} _: "Render budget exceeded"
    case False{} False{} True{}: "Responsive"
    case False{} False{} False{}: "Measuring responsiveness"

def current_message(scale: U32, fast_windows: U32,
  slow_windows: U32) -> String:
  current_message.for(U32.is_eq(scale, 2),
    Bool.not(U32.is_zero(slow_windows)), Bool.not(U32.is_zero(fast_windows)))

def current(+old: State, portrait: Bool) -> Decision:
  match old:
    case State{+scale, fastWindows, slowWindows}:
      decision.for(scale, portrait, old,
        current_message(scale, fastWindows, slowWindows))

def state_scale(state: State) -> U32:
  match state:
    case State{scale, _, _}: scale

def decision_changed(old: State, next: State) -> Bool:
  U32.is_ne(state_scale(old), state_scale(next))

def choose(+old: State, +probe: Probe) -> Decision:
  match probe:
    case Probe{portrait, physicalEdge, _, _, _, _, _}:
      choose.edge(U32.is_ge(physicalEdge, 1280), probe, old)
