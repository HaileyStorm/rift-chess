import Base
import ../../RenderPlan.bend as Plan
import ../../DrawList.bend as Draw
import ../../RgbaAffine.bend as Affine
import ../../RgbaSample.bend as Sample
import ../../Transform2D.bend as Transform
import ../../Texture.bend as Texture
import ../../Rect.bend as Rect

type Case is Data:
  Case{label: String, cuts: Nat, forks: Nat}

type TimedImage is Data:
  TimedImage{render_ms: Nat, checksum_ms: Nat, value: U32, image: Image}

type Timings is Data:
  Timings{render_ms: Nat, checksum_ms: Nat, value: U32}

def commands(count: Nat, +index: U32, +texture: Sample.Texture)
  -> List<&2, Draw.Command>:
  match count:
    case 0n: Nil{}
    case 1n+rest:
      +x = U32.add(U32.mul(U32.mod(index, 8), 64), 10)
      +y = U32.add(U32.mul(U32.div(index, 8), 64), 8)
      +geometry = Affine.prepare(Transform.Matrix{
        48.0, 4.0, F32.neg(3.0), 48.0, U32.to_f32(x), U32.to_f32(y)})
      Con{Draw.mapped(geometry, texture, Sample.Linear{}, 220,
        Rect.screen(512)), commands(rest, U32.add(index, 1), texture)}

def workload_cases() -> List<&2, Case>:
  Con{Case{"legacy-cuts3-forks1", 3n, 1n},
  Con{Case{"sweep-cuts7-forks1", 7n, 1n},
  Con{Case{"sweep-cuts7-forks3", 7n, 3n},
  Con{Case{"sweep-cuts7-forks5", 7n, 5n},
  Con{Case{"sweep-cuts7-forks7", 7n, 7n}, Nil{}}}}}}

def checksum(+depth: Nat, image: Image) -> U32:
  match depth image:
    case _ Pix{color}: U32.mul(color, U32.shln(1, Nat.add(depth, depth)))
    case 0n Qua{tl, tr, bl, br}: 0
    case 1n+rest Qua{tl, tr, bl, br}:
      +a = checksum(rest, tl)
      +b = checksum(rest, tr)
      +c = checksum(rest, bl)
      +d = checksum(rest, br)
      U32.add(U32.add(a, b), U32.add(c, d))

def same_pixels(+depth: Nat, a: Image, b: Image) -> Bool:
  match depth a:
    case 0n Pix{color}:
      match b:
        case Pix{other}: U32.is_eq(color, other)
        case Qua{tl, tr, bl, br}: False{}
    case 0n Qua{tl, tr, bl, br}: False{}
    case 1n+rest Pix{+color}:
      match b:
        case Pix{other}: U32.is_eq(color, other)
        case Qua{tl, tr, bl, br}:
          Bool.and(same_pixels(rest, Pix{color}, tl),
            Bool.and(same_pixels(rest, Pix{color}, tr),
              Bool.and(same_pixels(rest, Pix{color}, bl),
                same_pixels(rest, Pix{color}, br))))
    case 1n+rest Qua{tl, tr, bl, br}:
      match b:
        case Pix{+other}:
          Bool.and(same_pixels(rest, tl, Pix{other}),
            Bool.and(same_pixels(rest, tr, Pix{other}),
              Bool.and(same_pixels(rest, bl, Pix{other}),
                same_pixels(rest, br, Pix{other}))))
        case Qua{btl, btr, bbl, bbr}:
          Bool.and(same_pixels(rest, tl, btl),
            Bool.and(same_pixels(rest, tr, btr),
              Bool.and(same_pixels(rest, bl, bbl),
                same_pixels(rest, br, bbr))))

def render_for(serial: Bool, offload: Bool, +forks: Nat,
  frame: Plan.Frame, target: Image) -> Image:
  match serial:
    case True{}: Plan.render(frame, 0n, target)
    case False{}:
      match offload:
        case True{}: Plan.render_offload(frame, forks, target)
        case False{}: Plan.render(frame, forks, target)

def measure(serial: Bool, offload: Bool, forks: Nat, frame: Plan.Frame,
  seed: U32) -> IO(TimedImage):
  IO.bind(Nat, TimedImage, IO.now(),
    start =>
      +image = render_for(serial, offload, forks, frame, Pix{seed})
      IO.bind(Nat, TimedImage, IO.now(),
        render_end =>
          IO.bind(Nat, TimedImage, IO.now(),
            checksum_start =>
              +value = checksum(9n, image)
              IO.bind(Nat, TimedImage, IO.now(),
                checksum_end => IO.pure(TimedImage, TimedImage{
                  Nat.sub(render_end, start),
                  Nat.sub(checksum_end, checksum_start), value, image})))))

def update(acc: U32, value: U32) -> U32:
  U32.xor(U32.mul(acc, 16777619), value)

def bool_text(value: Bool) -> String:
  match value:
    case True{}: "true"
    case False{}: "false"

def profile_line(route: String, label: String, phase: String,
  iteration: Nat, render_ms: Nat, checksum_ms: Nat, value: U32) -> String:
  String.append("GPU_PROFILE ", String.join(
    Con{String.append("route=", route),
    Con{String.append("case=", label),
    Con{String.append("phase=", phase),
    Con{String.append("iteration=", Nat.show(iteration)),
    Con{String.append("render_return_ms=", Nat.show(render_ms)),
    Con{String.append("checksum_ms=", Nat.show(checksum_ms)),
    Con{String.append("image_checksum=", Nat.show(U32.to_nat(value))),
      Nil{}}}}}}}}, " "))

def reference_line(route: String, label: String, elapsed: Nat,
  equal: Bool, reference_checksum: U32) -> String:
  String.append("GPU_PROFILE ", String.join(
    Con{String.append("route=", route),
    Con{String.append("case=", label),
    Con{"phase=serial_reference",
    Con{String.append("reference_ms=", Nat.show(elapsed)),
    Con{String.append("exact_pixels=", bool_text(equal)),
    Con{String.append("reference_checksum=",
      Nat.show(U32.to_nat(reference_checksum))), Nil{}}}}}}}, " "))

def warm_iterations() -> List<&2, Nat>:
  Con{1n, Con{2n, Con{3n, Con{4n, Con{5n, Con{6n, Con{7n, Con{8n,
  Con{9n, Con{10n, Con{11n, Con{12n, Con{13n, Con{14n,
  Con{15n, Nil{}}}}}}}}}}}}}}}}

def timings(timed: TimedImage) -> Timings:
  match timed:
    case TimedImage{render_ms, checksum_ms, value, image}:
      Timings{render_ms, checksum_ms, value}

def timings_render_ms(metrics: Timings) -> Nat:
  match metrics:
    case Timings{render_ms, checksum_ms, value}: render_ms

def timings_checksum_ms(metrics: Timings) -> Nat:
  match metrics:
    case Timings{render_ms, checksum_ms, value}: checksum_ms

def timings_value(metrics: Timings) -> U32:
  match metrics:
    case Timings{render_ms, checksum_ms, value}: value

def warm(samples: List<&2, Nat>, +route: String, +label: String,
  +serial: Bool, +offload: Bool, +forks: Nat, +frame: Plan.Frame,
  +seed: U32, +acc: U32) -> IO(U32):
  match samples:
    case Nil{}: IO.pure(U32, acc)
    case Con{iteration, rest}:
      IO.bind(TimedImage, U32, measure(serial, offload, forks, frame, seed),
        timed =>
          +metrics = timings(timed)
          IO.bind(Unit, U32,
            IO.print(profile_line(route, label, "warm", iteration,
              timings_render_ms(metrics), timings_checksum_ms(metrics),
              timings_value(metrics))),
            _ => warm(rest, route, label, serial, offload, forks, frame,
              U32.add(seed, 17), update(acc, timings_value(metrics)))))

def reference_result(+route: String, +label: String, forks: Nat,
  serial: Bool, offload: Bool, frame: Plan.Frame, equal: Bool,
  reference_ms: Nat, reference_checksum: U32, +acc: U32) -> IO(U32):
  match equal:
    case False{}:
      IO.die(U32, 1, "GPU profile output differs from serial reference")
    case True{}:
      IO.bind(Unit, U32,
        IO.print(reference_line(route, label, reference_ms, True{},
          reference_checksum)),
        _ => warm(warm_iterations(), route, label, serial, offload, forks,
          frame, U32.add(1445933, 17), acc))

def final_result(route: String, label: String, total: U32) -> IO(Unit):
  match total:
    case 2162379048:
      IO.print(String.append("GPU_PROFILE ", String.join(
        Con{String.append("route=", route),
        Con{String.append("case=", label),
        Con{"phase=complete",
        Con{String.append("rounds=", Nat.show(16n)),
        Con{String.append("workload_checksum=", Nat.show(U32.to_nat(total))),
          Nil{}}}}}}, " ")))
    case _:
      IO.die(Unit, 1,
        "GPU profile checksum differs from the frozen 16-round reference")

def first_result(+route: String, +label: String, forks: Nat,
  serial: Bool, offload: Bool, +frame: Plan.Frame,
  first: TimedImage) -> IO(Unit):
  match first:
    case TimedImage{render_ms, checksum_ms, +value, image}:
      +acc = update(2166136261, value)
      IO.bind(Unit, Unit,
        IO.print(profile_line(route, label, "first", 0n,
          render_ms, checksum_ms, value)),
        _ => IO.bind(Nat, Unit, IO.now(),
          reference_start =>
            +reference = Plan.render(frame, 0n, Pix{1445933})
            +equal = same_pixels(9n, image, reference)
            +reference_value = checksum(9n, reference)
            IO.bind(Nat, Unit, IO.now(),
              reference_end =>
                IO.bind(U32, Unit,
                  reference_result(route, label, forks, serial, offload,
                    frame, equal, Nat.sub(reference_end, reference_start),
                    reference_value, acc),
                  total => final_result(route, label, total)))))

def profile_case(+route: String, +serial: Bool, +offload: Bool,
  bench_case: Case, +cmds: List<&2, Draw.Command>) -> IO(Unit):
  match bench_case:
    case Case{+label, +cuts, +forks}:
      IO.bind(Nat, Unit, IO.now(),
        prepare_start =>
          +frame = Plan.prepare(cuts, 9n, 512, cmds)
          IO.bind(Nat, Unit, IO.now(),
            prepare_end =>
              IO.bind(Unit, Unit,
                IO.print(String.append("GPU_PROFILE ", String.join(
                  Con{String.append("route=", route),
                  Con{String.append("case=", label),
                  Con{String.append("cuts=", Nat.show(cuts)),
                  Con{String.append("forks=", Nat.show(forks)),
                  Con{"phase=prepare",
                  Con{String.append("prepare_ms=",
                    Nat.show(Nat.sub(prepare_end, prepare_start))), Nil{}}}}}}}, " "))),
                _ => IO.bind(TimedImage, Unit,
                  measure(serial, offload, forks, frame, 1445933),
                  first => first_result(route, label, forks, serial,
                    offload, frame, first)))))

def profile_cases(cases: List<&2, Case>, +route: String,
  +serial: Bool, +offload: Bool,
  +cmds: List<&2, Draw.Command>) -> IO(Unit):
  match cases:
    case Nil{}: IO.pure(Unit, Unit{})
    case Con{bench_case, rest}:
      IO.bind(Unit, Unit, profile_case(route, serial, offload,
        bench_case, cmds),
        _ => profile_cases(rest, route, serial, offload, cmds))

def setup(+route: String, +serial: Bool, +offload: Bool) -> IO(Unit):
  IO.bind(Nat, Unit, IO.now(),
    setup_start =>
      +source = Texture.serial_tree(5n, 32, 0, 0,
        Texture.Grain{1057074, 10042319, 180, 719})
      +texture: Sample.Texture = Sample.Texture{5n, 32, source, Pix{13107200}}
      +cmds = commands(64n, 0, texture)
      IO.bind(Nat, Unit, IO.now(),
        setup_end =>
          IO.bind(Unit, Unit, IO.print(String.append("GPU_PROFILE ",
            String.join(Con{String.append("route=", route),
              Con{"size=512", Con{"target_depth=9", Con{"commands=64",
              Con{"texture_depth=5", Con{"rounds=16",
              Con{"expected_checksum=2162379048", Nil{}}}}}}}}, " "))),
            _ => IO.bind(Unit, Unit,
              IO.print(String.append("GPU_PROFILE phase=setup setup_ms=",
                Nat.show(Nat.sub(setup_end, setup_start)))),
              _ => profile_cases(workload_cases(), route, serial, offload,
                cmds)))))

def route_result(valid: Bool, route: String, serial: Bool,
  offload: Bool) -> IO(Unit):
  match valid:
    case True{}: setup(route, serial, offload)
    case False{}: IO.die(Unit, 1, "Route must be serial, cpu, or offload")

def with_route(+route: String) -> IO(Unit):
  +serial = String.eq(route, "serial")
  +offload = String.eq(route, "offload")
  +valid = Bool.or(serial, Bool.or(offload, String.eq(route, "cpu")))
  route_result(valid, route, serial, offload)

def with_args(args: List<&1, String>) -> IO(Unit):
  match args:
    case Con{route, Nil{}}: with_route(route)
    case _: IO.die(Unit, 1, "Pass exactly one route after --: serial, cpu, or offload")

def main() -> IO(Unit):
  IO.bind(List<&1, String>, Unit, IO.args(), with_args)
