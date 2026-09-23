# Single browser module: the host imports this facade once. The rules,
# adjudication, picking, image construction and opponent remain in Bend.
import Base
import ./core/Model.bend as M
import ./core/Spec.bend as S
import ./core/Kernel.bend as K
import ./core/MatchSpec.bend as Match
import ./core/AI.bend as AI
import ./graphics/Scene.bend as Scene
import ./graphics/Picking.bend as Picking
import ./graphics/Camera.bend as Camera

type Observation is Data:
  Observation{position: M.Position, revision: Nat, legal: List<&2, U32>,
    outcome: Maybe<&2, Match.Outcome>, offer: Match.DrawOffer, inCheck: Bool, canUndo: Bool}

def draw_policy(code: U32) -> Match.DrawPolicy:
  match code:
    case 1: Match.Auto100{}
    case 2: Match.Off{}
    case _: Match.Prompt{}

def new_match(layout: Bool, policy: U32) -> Match.Match:
  Match.start(layout, draw_policy(policy))

def position(m: Match.Match) -> M.Position:
  match m:
    case Match.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: state

def revision(m: Match.Match) -> Nat:
  match m:
    case Match.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: revision

def copy_outcome(end: Maybe<Match.Outcome>) -> Maybe<&2, Match.Outcome>:
  match end:
    case None{}: None{}
    case Some{value}: Some{value}

def outcome_with(forced: Match.Override, p: M.Position, keys: List<&2, Match.RepetitionKey>,
  policy: Match.DrawPolicy, ids: List<&2, U32>) -> Maybe<&2, Match.Outcome>:
  match forced:
    case Match.NoOverride{}: copy_outcome(Match.board_outcome(p, keys, policy, ids))
    case Match.Agreement{}: Some{Match.Agreed{}}
    case Match.WhiteResigned{}: Some{Match.WhiteResignedOutcome{}}
    case Match.BlackResigned{}: Some{Match.BlackResignedOutcome{}}

def live_ids(end: Maybe<&2, Match.Outcome>, ids: List<&2, U32>) -> List<&2, U32>:
  match end:
    case None{}: ids
    case Some{value}: []

def observe(m: Match.Match) -> Observation:
  match m:
    case Match.Match{initial, +state, actions, states, keys, revision, policy, offer, forced}:
      +ids = K.legal_ids(state)
      +end = outcome_with(forced, state, keys, policy, ids)
      Observation{state, revision, live_ids(end, ids), end, offer, S.in_check(state, M.pos_side(state)), Bool.not(List.is_empty(&2, U32, actions))}

def command(m: Match.Match, c: Match.Command) -> Match.StepResult:
  K.command(m, c)

def bot_observed(obs: Observation) -> U32:
  match obs:
    case Observation{p, revision, ids, end, offer, check, canUndo}: AI.choose(p, ids)

def bot(m: Match.Match) -> U32:
  bot_observed(observe(m))

def render(frame: Scene.Frame) -> Image:
  Scene.view(frame)

def background(theme: U32) -> Image:
  Scene.background()

def ground_base(bg: Image, p: M.Position, theme: U32, view: Camera.View) -> Image:
  Scene.ground_base(bg, p, theme, view)

def feedback_on(base: Image, frame: Scene.Frame) -> Image:
  Scene.feedback_on(base, frame)

def pieces_on(ground: Image, frame: Scene.Frame) -> Image:
  Scene.pieces_on(ground, frame)

def ground_on(bg: Image, frame: Scene.Frame) -> Image:
  Scene.ground_on(bg, frame)

def pick(p: M.Position, x: U32, y: U32, view: Camera.View) -> U32:
  Picking.pick(p, x, y, Camera.basis(view))

def square_at(x: U32, y: U32, view: Camera.View) -> U32:
  Camera.square_at(x, y, Camera.basis(view))

def center_x(square: U32, view: Camera.View) -> U32:
  Camera.center_x(square, Camera.basis(view))

def center_y(square: U32, view: Camera.View) -> U32:
  Camera.center_y(square, Camera.basis(view))
