# Minimal native graphics checkpoint based on the pinned app_triangle_2d demo.
# Bend owns the window lifecycle, pixel value, event handling and close path.
import Base

def Smoke.view(state: U32) -> U32 & Image:
  (state, Pix{16744499})

def Smoke.event(event: Event, state: U32) -> Maybe<U32>:
  match event:
    case Key{27, True{}}:
      None{}
    case Close{}:
      None{}
    case _:
      Some{state}

def Smoke.events(events: List<Event>, state: U32) -> Maybe<U32>:
  match events:
    case []:
      Some{state}
    case event <> rest:
      Maybe.bind(&1, U32, U32, Smoke.event(event, state),
        next => Smoke.events(rest, next))

def Smoke.tick(events: List<Event>, state: U32) -> IO(Maybe<U32>):
  IO.pure(Maybe<U32>, Smoke.events(events, state))

def main() -> IO(Unit):
  App.run(~U32, ~App{Smoke.view, Smoke.tick}, "Bend Native Smoke", 256, 256, 0)