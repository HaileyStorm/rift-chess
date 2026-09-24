# Pure policy for choosing a settled physical-resolution tier from *measured*
# rebuilds. The host supplies full scene+presentation p90, memory headroom,
# actual viewport demand and maximum output texture dimension. GPU support
# alone never selects Ultra; the GPU path needs a measured full-frame sample.
# `interactive` separately caps continuous drag detail using camera+piece+
# transport p90, so a slow one-time settle does not force Economy forever.
import Base

type Tier is Data:
  Preview{}
  Economy{}
  Balanced{}
  Ultra{}

type Capacity is Data:
  Unknown{}
  Known{memory_mib: U32}
  Probed{max_successful_edge: U32}

def size(tier: Tier) -> U32:
  match tier:
    case Preview{}: 512
    case Economy{}: 1024
    case Balanced{}: 2048
    case Ultra{}: 4096

def depth(tier: Tier) -> Nat:
  match tier:
    case Preview{}: 9n
    case Economy{}: 10n
    case Balanced{}: 11n
    case Ultra{}: 12n

def choose_case(high: Bool, middle: Bool) -> Tier:
  match high middle:
    case True{} _: Ultra{}
    case False{} True{}: Balanced{}
    case False{} False{}: Economy{}

def capacity_allows(capacity: Capacity, +edge: U32) -> Bool:
  match capacity:
    case Unknown{}: False{}
    case Known{memory_mib}:
      U32.is_ge(memory_mib, U32.div(edge, 8))
    case Probed{max_successful_edge}:
      U32.is_ge(max_successful_edge, edge)

def choose(+physical_edge: U32, +settle_budget_ms: U32, +capacity: Capacity,
  +max_texture_edge: U32, cpu_2048_measured: Bool, +cpu_2048_p90_ms: U32,
  cpu_4096_measured: Bool, +cpu_4096_p90_ms: U32,
  gpu_4096_measured: Bool, +gpu_4096_p90_ms: U32) -> Tier:
  +gpu_fast = Bool.and(gpu_4096_measured, U32.is_le(gpu_4096_p90_ms, settle_budget_ms))
  +cpu_high = Bool.and(cpu_4096_measured, U32.is_le(cpu_4096_p90_ms, settle_budget_ms))
  +cpu_middle = Bool.and(cpu_2048_measured, U32.is_le(cpu_2048_p90_ms, settle_budget_ms))
  +high = Bool.and(Bool.and(U32.is_gt(physical_edge, 2048),
      Bool.and(U32.is_ge(max_texture_edge, 4096), capacity_allows(capacity, 4096))),
    Bool.or(cpu_high, gpu_fast))
  +middle = Bool.and(Bool.and(U32.is_gt(physical_edge, 1024),
      Bool.and(U32.is_ge(max_texture_edge, 2048), capacity_allows(capacity, 2048))),
    cpu_middle)
  choose_case(high, middle)

# Interaction can temporarily use a lower physical tier while retaining a
# high-resolution settled scene. Only measured 64-cell camera-frame p90s
# authorize an interactive upgrade; an unmeasured tier stays at Economy.
def interactive_case(high: Bool, middle: Bool) -> Tier:
  match high middle:
    case True{} _: Ultra{}
    case False{} True{}: Balanced{}
    case False{} False{}: Economy{}

def interactive(requested: Tier, +budget_ms: U32,
  measured_2048: Bool, +p90_2048_ms: U32,
  measured_4096: Bool, +p90_4096_ms: U32) -> Tier:
  match requested:
    case Preview{}: Preview{}
    case Economy{}: Economy{}
    case Balanced{}:
      interactive_case(False{}, Bool.and(measured_2048,
        U32.is_le(p90_2048_ms, budget_ms)))
    case Ultra{}:
      interactive_case(Bool.and(measured_4096,
          U32.is_le(p90_4096_ms, budget_ms)),
        Bool.and(measured_2048, U32.is_le(p90_2048_ms, budget_ms)))

def preview_case(requested: Tier, fast_4096: Bool, fast_2048: Bool,
  fast_1024: Bool, tested_512: Bool) -> Tier:
  match requested fast_4096 fast_2048 fast_1024 tested_512:
    case Preview{} _ _ _ _: Preview{}
    case Economy{} _ _ True{} _: Economy{}
    case Economy{} _ _ False{} True{}: Preview{}
    case Economy{} _ _ False{} False{}: Economy{}
    case Balanced{} _ True{} _ _: Balanced{}
    case Balanced{} _ False{} True{} _: Economy{}
    case Balanced{} _ False{} False{} True{}: Preview{}
    case Balanced{} _ False{} False{} False{}: Economy{}
    case Ultra{} True{} _ _ _: Ultra{}
    case Ultra{} False{} True{} _ _: Balanced{}
    case Ultra{} False{} False{} True{} _: Economy{}
    case Ultra{} False{} False{} False{} True{}: Preview{}
    case Ultra{} False{} False{} False{} False{}: Economy{}

# Selects a 512 logical Image only when that tier was actually measured.
# The host may present its same quadtree at depth 10/11 for Bend-owned nearest
# upsampling, while keeping game camera/picking coordinates unchanged.
def interactive_with_preview(requested: Tier, +budget_ms: U32,
  measured_512: Bool, +p90_512_ms: U32,
  measured_1024: Bool, +p90_1024_ms: U32,
  measured_2048: Bool, +p90_2048_ms: U32,
  measured_4096: Bool, +p90_4096_ms: U32) -> Tier:
  +preview_measured = Bool.and(measured_512, U32.is_le(p90_512_ms, budget_ms))
  preview_case(requested,
    Bool.and(measured_4096, U32.is_le(p90_4096_ms, budget_ms)),
    Bool.and(measured_2048, U32.is_le(p90_2048_ms, budget_ms)),
    Bool.and(measured_1024, U32.is_le(p90_1024_ms, budget_ms)),
    preview_measured)
