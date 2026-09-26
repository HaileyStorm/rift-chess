import Base
import PlanProfile.bend as Profile
import ../../RenderPlan.bend as Plan
import ../../RgbaSample.bend as Sample
import ../../Texture.bend as Texture

# Diagnostic fixture: two traversals of the *same* returned image, separated
# by IO.now, with no intervening render. It does not change library semantics.
type Timed is Data:
  Timed{render_ms: Nat, first_ms: Nat, second_ms: Nat,
    first: U32, second: U32, image: Image}

def measure(serial: Bool, offload: Bool, frame: Plan.Frame, seed: U32)
  -> IO(Timed):
  IO.bind(Nat, Timed, IO.now(), start =>
    +image = Profile.render_for(serial, offload, 7n, frame, Pix{seed})
    IO.bind(Nat, Timed, IO.now(), +rendered =>
      +first = Profile.checksum(9n, image)
      IO.bind(Nat, Timed, IO.now(), +first_done =>
        +second = Profile.checksum(9n, image)
        IO.bind(Nat, Timed, IO.now(), second_done =>
          IO.pure(Timed, Timed{
            Nat.sub(rendered, start), Nat.sub(first_done, rendered),
            Nat.sub(second_done, first_done), first, second, image})))))

def line(route: String, iteration: Nat, render_ms: Nat,
  first_ms: Nat, second_ms: Nat, value: U32) -> String:
  String.append("GPU_READBACK ", String.join(
    Con{String.append("route=", route),
    Con{String.append("iteration=", Nat.show(iteration)),
    Con{String.append("render_return_ms=", Nat.show(render_ms)),
    Con{String.append("first_checksum_ms=", Nat.show(first_ms)),
    Con{String.append("second_checksum_ms=", Nat.show(second_ms)),
    Con{String.append("image_checksum=", Nat.show(U32.to_nat(value))),
      Nil{}}}}}}}, " "))

def checked_equal_result(equal: Bool) -> IO(Unit):
  match equal:
    case True{}: IO.pure(Unit, Unit{})
    case False{}: IO.die(Unit, 1, "Repeated image checksum differs")

def checked_equal(first: U32, second: U32) -> IO(Unit):
  checked_equal_result(U32.is_eq(first, second))

def checked_pixels_result(equal: Bool) -> IO(Unit):
  match equal:
    case True{}: IO.pure(Unit, Unit{})
    case False{}: IO.die(Unit, 1, "First image differs from serial pixels")

def checked_pixels(image: Image, frame: Plan.Frame, seed: U32)
  -> IO(Unit):
  +reference = Plan.render(frame, 0n, Pix{seed})
  checked_pixels_result(Profile.same_pixels(9n, image, reference))

def checked_first(iteration: Nat, image: Image, frame: Plan.Frame,
  seed: U32) -> IO(Unit):
  match iteration:
    case 0n: checked_pixels(image, frame, seed)
    case _: IO.pure(Unit, Unit{})

def checked_total(total: U32) -> IO(Unit):
  match total:
    case 2162379048:
      IO.print("GPU_READBACK phase=complete rounds=16 workload_checksum=2162379048")
    case _:
      IO.die(Unit, 1, "16-round checksum differs from frozen reference")

def after_measure(timed: Timed, +route: String, +frame: Plan.Frame,
  +iteration: Nat, +seed: U32) -> IO(U32):
  match timed:
    case Timed{render_ms, first_ms, second_ms, +first, second, image}:
      IO.bind(Unit, U32, checked_equal(first, second),
        _ => IO.bind(Unit, U32,
          IO.print(line(route, iteration, render_ms,
            first_ms, second_ms, first)),
          _ => IO.bind(Unit, U32,
            checked_first(iteration, image, frame, seed),
            _ => IO.pure(U32, first))))

def rounds(+remaining: Nat, +route: String, +serial: Bool, +offload: Bool,
  +frame: Plan.Frame, +seed: U32, acc: U32)
  -> IO(Unit):
  match remaining:
    case 0n: checked_total(acc)
    case 1n+rest:
      +iteration = Nat.sub(16n, remaining)
      IO.bind(Timed, Unit, measure(serial, offload, frame, seed),
        timed => IO.bind(U32, Unit,
          after_measure(timed, route, frame, iteration, seed),
          first => rounds(rest, route, serial, offload, frame,
            U32.add(seed, 17),
            Profile.update(acc, first))))

def run(+route: String, serial: Bool, offload: Bool) -> IO(Unit):
  +source = Texture.serial_tree(5n, 32, 0, 0,
    Texture.Grain{1057074, 10042319, 180, 719})
  +texture: Sample.Texture = Sample.Texture{5n, 32, source, Pix{13107200}}
  +cmds = Profile.commands(64n, 0, texture)
  +frame = Plan.prepare(7n, 9n, 512, cmds)
  IO.bind(Unit, Unit,
    IO.print(String.append("GPU_READBACK route=", route)),
    _ => rounds(16n, route, serial, offload, frame, 1445933, 2166136261))

def checked_route(valid: Bool, route: String, serial: Bool,
  offload: Bool) -> IO(Unit):
  match valid:
    case True{}: run(route, serial, offload)
    case False{}:
      IO.die(Unit, 1, "Route must be serial, cpu, or offload")

def with_route(+route: String) -> IO(Unit):
  +serial = String.eq(route, "serial")
  +offload = String.eq(route, "offload")
  checked_route(Bool.or(serial, Bool.or(offload, String.eq(route, "cpu"))),
    route, serial, offload)

def with_args(args: List<&1, String>) -> IO(Unit):
  match args:
    case Con{route, Nil{}}: with_route(route)
    case _: IO.die(Unit, 1, "Pass one route after --")

def main() -> IO(Unit):
  IO.bind(List<&1, String>, Unit, IO.args(), with_args)
