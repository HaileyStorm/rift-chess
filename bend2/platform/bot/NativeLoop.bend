# Deferred native bot policy. Bend remains the command and match authority.
import Base
import ./NativeCpu.bend as Cpu
import ./NativeDeferred.bend as Deferred
import ./History.bend as History
import ../../ApplicationControl.bend as Control
import ../../core/Model.bend as Model
import ../../core/MatchSpec.bend as Match
import ../../ui/Types.bend as T
import ../../ui/State.bend as S

type State is Data:
  # ready packs the validated worker status and action_id+1 in disjoint fields.
  BotState{enabled: Bool, failure: String, model: String,
    epoch: U32, request: U32, revision: U32, token: U32,
    context: String, ready: U32}

type Step is Data:
  Step{bot: State, packet: Control.Packet}

type ContextWire is Data:
  ValidContext{text: String}
  InvalidContext{message: String}

def next_id(+value: U32) -> U32:
  match value:
    case 4294967295: 0
    case _: U32.add(value, 1)

def disabled() -> State:
  BotState{False{}, "", "", 1, 0, 0, 0, "", 0}

def init_ready(model: String, valid: Bool) -> IO(State):
  match valid:
    case True{}: IO.pure(State, BotState{True{}, "", model, 1, 0, 0, 0, "", 0})
    case False{}: IO.die(State, 1, "Native CPU bot has an invalid embedded model identity")

def init_status(code: U32, +model: String) -> IO(State):
  match code:
    case 0: IO.pure(State, disabled())
    case 1: init_ready(model, Nat.is_eq(String.length(model), 64n))
    case _: IO.die(State, 1, "Native CPU bot startup failed")

def init_result(result: U32 & String) -> IO(State):
  match result:
    case (code, model): init_status(code, model)

def boot() -> IO(State):
  do IO<State>:
    result : U32 & String <- Cpu.native_prepare()
    init_result(result)

def packet_session(packet: Control.Packet) -> Control.Session:
  match packet:
    case Control.Packet{session, _, _, _, _, _, _, _, _, _, _, _, _}: session

def merge_render(first: Control.RenderPlan, final: Control.RenderPlan) -> Control.RenderPlan:
  match first final:
    case Control.RenderPlan{ab, ag, ap, ac, af, _, _, _, _, _, ash, _}
      Control.RenderPlan{bb, bg, bp, bc, bf, theme, size, board, depth, board_depth, bsh, motion}:
      Control.RenderPlan{Bool.or(ab, bb), Bool.or(ag, bg), Bool.or(ap, bp),
        Bool.or(ac, bc), Bool.or(af, bf), theme, size, board, depth, board_depth,
        Bool.or(ash, bsh), motion}

# The first dispatch has already advanced cache keys. Keep its invalidations
# and effects even when the follow-up bot packet happens to be clean.
def merge_packets(first: Control.Packet, final: Control.Packet) -> Control.Packet:
  match first final:
    case Control.Packet{_, first_effects, _, _, _, first_render, _, _, _, first_dirty, _, _, _}
      Control.Packet{session, effects, snapshot, chrome, plan, render, controls,
        width, height, dirty, after, summary, presentation}:
      Control.Packet{session, List.append(&2, T.Effect, first_effects, effects),
        snapshot, chrome, plan, merge_render(first_render, render), controls,
        width, height, Bool.or(first_dirty, dirty), after, summary, presentation}

def failed_state(state: State, message: String) -> State:
  match state:
    case BotState{enabled, _, model, epoch, request, _, _, _, _}:
      BotState{enabled, message, model, epoch, request, 0, 0, "", 0}

def state_token(state: State) -> U32:
  match state:
    case BotState{_, _, _, _, _, _, token, _, _}: token

def state_context(state: State) -> String:
  match state:
    case BotState{_, _, _, _, _, _, _, context, _}: context

def state_failure(state: State) -> String:
  match state:
    case BotState{_, failure, _, _, _, _, _, _, _}: failure

def cancel_token(+token: U32) -> IO(U32):
  match token:
    case 0: IO.pure(U32, 0)
    case _: Cpu.native_cancel(token)

def failure_text(message: String) -> String:
  "CPU bot stopped: " ++ message ++ ". Switch to local play or restart."

def failure_needed(session: Control.Session, +message: String) -> Bool:
  match session:
    case Control.Session{+state, _, _, _, _}:
      Bool.or(Bool.not(String.eq(T.panels_notice(S.panels(state)), failure_text(message))),
        Bool.not(T.meta_botPaused(S.meta(state))))

def failure_packet(session: Control.Session, message: String) -> Control.Packet:
  match session:
    case Control.Session{state, ground, style, quality, shell}:
      Control.apply(S.redrawn(S.notice(S.pause(state, True{}), failure_text(message))),
        ground, style, quality, shell, None{})

def visible_failure(required: Bool, state: State, +packet: Control.Packet,
  +message: String) -> IO(Step):
  match required:
    case False{}: IO.pure(Step, Step{state, packet})
    case True{}: IO.pure(Step, Step{state,
      merge_packets(packet, failure_packet(packet_session(packet), message))})

def finish_state(+state: State, packet: Control.Packet) -> IO(Step):
  +message = state_failure(state)
  visible_failure(Bool.not(String.is_empty(message)), state, packet, message)

def fatal(+state: State, +packet: Control.Packet, +message: String) -> IO(Step):
  do IO<Step>:
    cancelled : U32 <- cancel_token(state_token(state))
    Unit <- IO.print_err("Native CPU bot stopped: " ++ message)
    visible_failure(True{}, failed_state(state, message), packet, message)

def cancelled_state(state: State, next: U32) -> State:
  match state:
    case BotState{enabled, failure, model, _, request, _, _, _, _}:
      BotState{enabled, failure, model, next, request, 0, 0, "", 0}

def invalidated(valid: Bool, state: State, next: U32) -> IO(State):
  match valid:
    case True{}: IO.pure(State, cancelled_state(state, next))
    case False{}:
      do IO<State>:
        Unit <- IO.print_err("Native CPU bot stopped: epoch exhaustion or cancellation failure")
        IO.pure(State, failed_state(cancelled_state(state, next),
          "epoch exhaustion or cancellation failure"))

def invalidate(state: State) -> IO(State):
  match state:
    case BotState{enabled, failure, model, +epoch, request, revision, +token, context, ready}:
      +next = next_id(epoch)
      do IO<State>:
        code : U32 <- cancel_token(token)
        invalidated(Bool.and(U32.is_gt(next, 0), U32.is_zero(code)),
          BotState{enabled, failure, model, epoch, request, revision, token, context, ready}, next)

def cancel_report(code: U32) -> IO(Unit):
  match code:
    case 0: IO.pure(Unit, Unit{})
    case _: IO.print_err("Native CPU bot cancellation requires ownership reconciliation")

def cancel(state: State) -> IO(Unit):
  match state:
    case BotState{_, _, _, _, _, _, token, _, _}:
      do IO<Unit>:
        code : U32 <- cancel_token(token)
        cancel_report(code)

def input_mutates(input: T.Input) -> Bool:
  match input:
    case T.Tick{_}: False{}
    case T.Resize{_, _}: False{}
    case T.QualityProbe{_, _, _, _, _, _, _}: False{}
    case T.PointerMove{_, _}: False{}
    case T.PresentedMove{_, _, _}: False{}
    case T.Wheel{_, _, _}: False{}
    case T.KeyInput{_, down, _, _, _}: down
    case _: True{}

def inputs_mutate(inputs: List<&2, T.Input>) -> Bool:
  match inputs:
    case []: False{}
    case input <> rest: Bool.or(input_mutates(input), inputs_mutate(rest))

def before_input(changed: Bool, state: State) -> IO(State):
  match changed:
    case True{}: invalidate(state)
    case False{}: IO.pure(State, state)

def tokens(values: List<&2, U32>) -> String:
  match values:
    case []: ""
    case head <> tail: U32.show(head) ++ " " ++ tokens(tail)

def counted(+values: List<&2, U32>) -> String:
  Nat.show(List.length(&2, U32, values)) ++ " " ++ tokens(values)

def position(value: Model.Position) -> String:
  match value:
    case Model.Pos{board, holes, side, rights, ep, pawn, quiet, full}:
      tokens(board) ++ U32.show(holes) ++ " " ++ U32.show(Bool.to_u32(side)) ++ " " ++
        U32.show(rights) ++ " " ++ U32.show(ep) ++ " " ++ U32.show(pawn) ++ " " ++
        Nat.show(quiet) ++ " " ++ Nat.show(full) ++ " "

def policy(value: Match.DrawPolicy) -> String:
  match value:
    case Match.Prompt{}: "0 "
    case Match.Auto100{}: "1 "
    case Match.Off{}: "2 "

def wire(value: History.Context) -> String:
  match value:
    case History.Context{initial, current, actions, draw_policy, legal}:
      "1 " ++ policy(draw_policy) ++ position(initial) ++ counted(actions) ++
        position(current) ++ counted(legal)

def bounded_history(value: History.Context) -> Bool:
  match value:
    case History.Context{_, _, actions, _, _}:
      Nat.is_le(List.length(&2, U32, actions), 20000n)

def context_wire_size(valid: Bool, text: String) -> ContextWire:
  match valid:
    case False{}: InvalidContext{"complete history exceeds native transport limit"}
    case True{}: ValidContext{text}

def context_wire_history(valid: Bool, context: History.Context) -> ContextWire:
  match valid:
    case False{}: InvalidContext{"complete history exceeds 20000 actions"}
    case True{}:
      +text = wire(context)
      context_wire_size(Nat.is_le(String.length(text), 1048576n), text)

def context_wire(+context: History.Context) -> ContextWire:
  context_wire_history(bounded_history(context), context)

def with_context(state: State, revision: U32, context: String) -> State:
  match state:
    case BotState{enabled, failure, model, epoch, request, _, token, _, ready}:
      BotState{enabled, failure, model, epoch, request, revision, token, context, ready}

def with_job(state: State, request: U32, token: U32) -> State:
  match state:
    case BotState{enabled, failure, model, epoch, _, revision, _, context, _}:
      BotState{enabled, failure, model, epoch, request, revision, token, context, 0}

def with_ready(state: State, ready: U32) -> State:
  match state:
    case BotState{enabled, failure, model, epoch, request, revision, token, context, _}:
      BotState{enabled, failure, model, epoch, request, revision, token, context, ready}

def applied_state(state: State, packet: Control.Packet) -> IO(Step):
  match state:
    case BotState{enabled, failure, +model, +epoch, +request, revision, _, _, +ready}:
      do IO<Step>:
        Unit <- IO.print_err("RIFT_CPU_BOT_APPLIED backend=cpu status=" ++
          U32.show(U32.div(ready, 32768)) ++ " action=" ++
          U32.show(U32.sub(U32.mod(ready, 32768), 1)) ++ " epoch=" ++
          U32.show(epoch) ++ " revision=" ++ U32.show(revision) ++
          " request=" ++ U32.show(request) ++ " model=" ++ model)
        IO.pure(Step, Step{BotState{enabled, failure, model, epoch, request, 0, 0, "", 0}, packet})

def commit_released(ok: Bool, state: State, packet: Control.Packet) -> IO(Step):
  match ok:
    case True{}: applied_state(state, packet)
    case False{}: fatal(state, packet, "completed worker could not be released")

def commit_checked(accepted: Bool, +state: State, packet: Control.Packet,
  token: U32) -> IO(Step):
  match accepted:
    case False{}: fatal(state, packet, "Bend rejected a current learned action")
    case True{}:
      do IO<Step>:
        code : U32 <- Cpu.native_release(token)
        commit_released(U32.is_zero(code), state, packet)

def commit_revision(state: State, packet: Control.Packet, revision: U32,
  token: U32, job: Control.BotJob) -> IO(Step):
  match job:
    case Control.BotJob{_, _, next_revision, _, _}:
      commit_checked(U32.is_ne(next_revision, revision), state, packet, token)

def committed(+state: State, +first: Control.Packet, +final: Control.Packet,
  revision: U32, token: U32) -> IO(Step):
  +job = Deferred.bot_job(packet_session(final))
  commit_revision(state, merge_packets(first, final), revision, token, job)

def commit_action(state: State, +packet: Control.Packet) -> IO(Step):
  match state:
    case BotState{enabled, failure, model, epoch, request, +revision, +token, context, +ready}:
      committed(BotState{enabled, failure, model, epoch, request, revision, token, context, ready},
        packet, Deferred.bot_apply_at(revision, U32.sub(U32.mod(ready, 32768), 1),
          packet_session(packet)), revision, token)

# A running token may outlive an unobserved same-revision context change. Only
# this fresh exact-history comparison authorizes either a new or held reply.
def commit_context_matches(same: Bool, state: State, packet: Control.Packet) -> IO(Step):
  match same:
    case True{}: commit_action(state, packet)
    case False{}:
      do IO<Step>:
        next : State <- invalidate(state)
        finish_state(next, packet)

def commit_wire(context: ContextWire, +state: State, packet: Control.Packet) -> IO(Step):
  match context:
    case InvalidContext{message}: fatal(state, packet, message)
    case ValidContext{text}: commit_context_matches(String.eq(state_context(state), text), state, packet)

def commit(state: State, +packet: Control.Packet) -> IO(Step):
  commit_wire(context_wire(Deferred.bot_context(packet_session(packet))), state, packet)

def ready_to_apply(allowed: Bool, state: State, packet: Control.Packet) -> IO(Step):
  match allowed:
    case True{}: commit(state, packet)
    case False{}: IO.pure(Step, Step{state, packet})

def polled_action(valid: Bool, state: State, packet: Control.Packet,
  status: U32, action: U32, can_apply: Bool) -> IO(Step):
  match valid:
    case False{}: fatal(state, packet, "completed worker did not return an action")
    case True{}: ready_to_apply(can_apply,
      with_ready(state, U32.add(U32.mul(status, 32768), action)), packet)

def polled_status(status: U32, state: State, packet: Control.Packet,
  +action: U32, can_apply: Bool) -> IO(Step):
  match status:
    case 0: IO.pure(Step, Step{state, packet})
    case 1: polled_action(Bool.and(U32.is_gt(action, 0), U32.is_le(action, 21760)),
      state, packet, 1, action, can_apply)
    case 3: polled_action(Bool.and(U32.is_gt(action, 0), U32.is_le(action, 21760)),
      state, packet, 3, action, can_apply)
    case _: fatal(state, packet, "model, history or worker failure")

def polled_payload(payload: U32 & U32, state: State, packet: Control.Packet,
  can_apply: Bool) -> IO(Step):
  match payload:
    case (status, action): polled_status(status, state, packet, action, can_apply)

def polled_code(code: U32, payload: U32 & U32, state: State,
  packet: Control.Packet, can_apply: Bool) -> IO(Step):
  match code:
    case 0: polled_payload(payload, state, packet, can_apply)
    case _: fatal(state, packet, "stale token, model or request identity")

def polled(response: U32 & (U32 & U32), state: State, packet: Control.Packet,
  can_apply: Bool) -> IO(Step):
  match response:
    case (code, payload): polled_code(code, payload, state, packet, can_apply)

def submitted(ok: Bool, state: State, packet: Control.Packet,
  request: U32, token: U32) -> IO(Step):
  match ok:
    case True{}: IO.pure(Step, Step{with_job(state, request, token), packet})
    case False{}: fatal(state, packet, "bounded worker queue or context limit reached")

def submit_result(result: U32 & U32, state: State, packet: Control.Packet,
  request: U32) -> IO(Step):
  match result:
    case (code, +token): submitted(Bool.and(U32.is_zero(code), U32.is_gt(token, 0)),
      state, packet, request, token)

def submit_request(valid: Bool, +state: State, packet: Control.Packet,
  +request: U32, context: String, model: String, epoch: U32, revision: U32) -> IO(Step):
  match valid:
    case False{}: fatal(state, packet, "request identity exhausted")
    case True{}:
      do IO<Step>:
        result : U32 & U32 <- Cpu.native_submit(context, model, epoch, revision, request)
        submit_result(result, state, packet, request)

def submit(state: State, packet: Control.Packet) -> IO(Step):
  match state:
    case BotState{enabled, failure, +model, +epoch, +request, +revision, token, +context, ready}:
      +next = next_id(request)
      submit_request(U32.is_gt(next, 0),
        BotState{enabled, failure, model, epoch, request, revision, token, context, ready},
        packet, next, context, model, epoch, revision)

def active_ready(ready: U32, +state: State, packet: Control.Packet,
  can_apply: Bool, token: U32, model: String, epoch: U32,
  revision: U32, request: U32) -> IO(Step):
  match ready:
    case 0:
      do IO<Step>:
        result : U32 & (U32 & U32) <- Cpu.native_poll(token, model, epoch, revision, request)
        polled(result, state, packet, can_apply)
    case _: ready_to_apply(can_apply, state, packet)

def active_token(+token: U32, state: State, packet: Control.Packet,
  can_apply: Bool, ready: U32, model: String, epoch: U32,
  revision: U32, request: U32) -> IO(Step):
  match token:
    case 0: submit(state, packet)
    case _: active_ready(ready, state, packet, can_apply, token, model, epoch, revision, request)

def active_healthy(healthy: Bool, state: State, packet: Control.Packet,
  can_apply: Bool, token: U32, ready: U32, model: String,
  epoch: U32, revision: U32, request: U32) -> IO(Step):
  match healthy:
    case False{}: finish_state(state, packet)
    case True{}: active_token(token, state, packet, can_apply, ready, model, epoch, revision, request)

def active(state: State, packet: Control.Packet, can_apply: Bool) -> IO(Step):
  match state:
    case BotState{enabled, +failure, +model, +epoch, +request, +revision, +token, context, +ready}:
      active_healthy(Bool.and(String.is_empty(failure), U32.is_gt(epoch, 0)),
        BotState{enabled, failure, model, epoch, request, revision, token, context, ready},
        packet, can_apply, token, ready, model, epoch, revision, request)

def context_rebound(state: State, packet: Control.Packet, revision: U32,
  context: String, can_apply: Bool) -> IO(Step):
  active(with_context(state, revision, context), packet, can_apply)

def context_matches(same: Bool, state: State, packet: Control.Packet,
  revision: U32, context: String, can_apply: Bool) -> IO(Step):
  match same:
    case True{}: active(state, packet, can_apply)
    case False{}:
      do IO<Step>:
        next : State <- invalidate(state)
        context_rebound(next, packet, revision, context, can_apply)

def checked_context(state: State, packet: Control.Packet, +revision: U32,
  +context: String, can_apply: Bool) -> IO(Step):
  match state:
    case BotState{enabled, failure, model, epoch, request, +old_revision, token, +old_context, ready}:
      context_matches(Bool.and(U32.is_eq(old_revision, revision), String.eq(old_context, context)),
        BotState{enabled, failure, model, epoch, request, old_revision, token, old_context, ready},
        packet, revision, context, can_apply)

def context_serialized(context: ContextWire, state: State, packet: Control.Packet,
  revision: U32, can_apply: Bool) -> IO(Step):
  match context:
    case InvalidContext{message}: fatal(state, packet, message)
    case ValidContext{text}: checked_context(state, packet, revision, text, can_apply)

def context_needed(state: State, current_revision: U32) -> Bool:
  match state:
    case BotState{_, _, _, _, _, revision, token, _, _}:
      Bool.or(U32.is_zero(token), U32.is_ne(revision, current_revision))

def eligible_context(needed: Bool, state: State, +packet: Control.Packet,
  revision: U32, can_apply: Bool) -> IO(Step):
  match needed:
    case True{}: context_serialized(context_wire(Deferred.bot_context(packet_session(packet))),
      state, packet, revision, can_apply)
    case False{}: active(state, packet, can_apply)

def ineligible(has_context: Bool, state: State, packet: Control.Packet) -> IO(Step):
  match has_context:
    case False{}: IO.pure(Step, Step{state, packet})
    case True{}:
      do IO<Step>:
        next : State <- invalidate(state)
        finish_state(next, packet)

def eligible(allowed: Bool, +state: State, +packet: Control.Packet,
  +revision: U32, can_apply: Bool) -> IO(Step):
  match allowed:
    case False{}: ineligible(Bool.not(String.is_empty(state_context(state))), state, packet)
    case True{}: eligible_context(context_needed(state, revision), state, packet, revision, can_apply)

def observe_job(job: Control.BotJob, state: State, packet: Control.Packet) -> IO(Step):
  match job:
    case Control.BotJob{allowed, can_apply, revision, _, _}:
      eligible(allowed, state, packet, revision, can_apply)

def observe_failure(failed: Bool, +state: State, +packet: Control.Packet,
  +message: String) -> IO(Step):
  match failed:
    case True{}: visible_failure(failure_needed(packet_session(packet), message), state, packet, message)
    case False{}: observe_job(Deferred.bot_job(packet_session(packet)), state, packet)

def observe(state: State, +packet: Control.Packet) -> IO(Step):
  match state:
    case BotState{enabled, +failure, model, epoch, request, revision, token, context, ready}:
      observe_failure(Bool.not(String.is_empty(failure)),
        BotState{enabled, failure, model, epoch, request, revision, token, context, ready}, packet, failure)

def step_enabled(enabled: Bool, +inputs: List<&2, T.Input>, shown: Control.Presentation,
  session: Control.Session, state: State) -> IO(Step):
  match enabled:
    case False{}: IO.pure(Step, Step{state, Control.dispatch_at(inputs, shown, session)})
    case True{}:
      do IO<Step>:
        next : State <- before_input(inputs_mutate(inputs), state)
        observe(next, Deferred.dispatch_at(inputs, shown, session))

def step(inputs: List<&2, T.Input>, shown: Control.Presentation,
  session: Control.Session, state: State) -> IO(Step):
  match state:
    case BotState{+enabled, failure, model, epoch, request, revision, token, context, ready}:
      step_enabled(enabled, inputs, shown, session,
        BotState{enabled, failure, model, epoch, request, revision, token, context, ready})

@unsafe
def shutdown_retry(remaining: U32, retry: Bool) -> IO(Unit):
  match retry:
    case False{}: IO.die(Unit, 1, "Native CPU worker remains unjoined; ownership reconciliation required")
    case True{}:
      do IO<Unit>:
        Unit <- IO.sleep(1)
        code : U32 <- Cpu.native_close()
        shutdown_code(code, U32.sub(remaining, 1))

def shutdown_code(+code: U32, +remaining: U32) -> IO(Unit):
  match code:
    case 0: IO.pure(Unit, Unit{})
    case _: shutdown_retry(remaining, Bool.and(U32.is_eq(code, 2), U32.is_gt(remaining, 0)))

def shutdown() -> IO(Unit):
  do IO<Unit>:
    code : U32 <- Cpu.native_close()
    shutdown_code(code, 10000)
