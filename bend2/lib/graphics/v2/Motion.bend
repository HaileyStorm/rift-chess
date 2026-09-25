# DRAFT pure animation math. The caller owns clocks, simulation and event order.
# F32 motion is presentation-only. Tick accounting below is exact integer work.
import Base

type Ease is Data:
  Linear{}
  Smooth{}
  Smoother{}
  CubicIn{}
  CubicOut{}

type TickBudget is Data:
  InvalidInterval{}
  Ticks{steps: U32,remainder: U32,dropped: Nat}

def curve(ease: Ease,+t: F32) -> F32:
  match ease:
    case Linear{}: t
    case Smooth{}: F32.mul(F32.mul(t,t),F32.sub(3.0,F32.mul(2.0,t)))
    case Smoother{}:
      F32.mul(F32.mul(F32.mul(t,t),t),F32.add(F32.mul(t,F32.sub(F32.mul(6.0,t),15.0)),10.0))
    case CubicIn{}: F32.mul(F32.mul(t,t),t)
    case CubicOut{}:
      +s = F32.sub(1.0,t)
      F32.sub(1.0,F32.mul(F32.mul(s,s),s))

def ease(kind: Ease,t: F32) -> F32:
  F32.clamp(curve(kind,F32.clamp(t,0.0,1.0)),0.0,1.0)

def lerp_case(first: Bool,last: Bool,+a: F32,+b: F32,t: F32) -> F32:
  match first last:
    case True{} _: a
    case False{} True{}: b
    case False{} False{}: F32.add(a,F32.mul(F32.sub(b,a),t))

def lerp(a: F32,b: F32,+t: F32) -> F32:
  lerp_case(F32.is_le(t,0.0),F32.is_ge(t,1.0),a,b,t)

def phase_valid(valid: Bool,tick: U32,+period: U32) -> F32:
  match valid:
    case False{}: 0.0
    case True{}: F32.div(U32.to_f32(U32.mod(tick,period)),U32.to_f32(period))

def phase(tick: U32,+period: U32) -> F32:
  phase_valid(U32.is_ne(period,0),tick,period)

def triangle_case(valid: Bool,+tick: U32,+half_period: U32) -> F32:
  match valid:
    case False{}: 0.0
    case True{}:
      +t = phase(tick,half_period)
      Bool.pick(F32,U32.is_zero(U32.mod(U32.div(tick,half_period),2)),t,F32.sub(1.0,t))

# Avoid forming 2*half_period in U32, so large valid periods do not wrap.
def triangle(tick: U32,+half_period: U32) -> F32:
  triangle_case(U32.is_ne(half_period,0),tick,half_period)

def ticks_valid(valid: Bool,delta: U32,carry: U32,interval: U32,max_steps: U32) -> TickBudget:
  match valid:
    case False{}: InvalidInterval{}
    case True{}:
      +total = Nat.add(U32.to_nat(delta),U32.to_nat(carry))
      +step = U32.to_nat(interval)
      +available = Nat.div(total,step)
      +taken = Nat.min(available,U32.to_nat(max_steps))
      Ticks{U32.from_nat(taken),U32.from_nat(Nat.mod(total,step)),Nat.mul(Nat.sub(available,taken),step)}

# delta+carry may exceed U32. Nat keeps accounting exact up to 2^33-2;
# dropped is explicit rather than silently simulating an unbounded backlog.
# Conservation: delta+carry = steps*interval + remainder + dropped.
def ticks(delta: U32,carry: U32,+interval: U32,max_steps: U32) -> TickBudget:
  ticks_valid(U32.is_ne(interval,0),delta,carry,interval,max_steps)
