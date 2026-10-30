# Host-neutral deferred bot boundary for a future native effect bridge.
# The caller owns job lifetime, epoch/model identity and final Bend validation.
import Base
import ../../ApplicationControl.bend as Control
import ../../ui/Types.bend as T
import ../../platform/bot/History.bend as History

def dispatch_at(events: List<&2, T.Input>, shown: Control.Presentation,
  session: Control.Session) -> Control.Packet:
  Control.dispatch_at_web(events, shown, session)

def bot_job(session: Control.Session) -> Control.BotJob:
  Control.bot_job(session)

def bot_context(session: Control.Session) -> History.Context:
  Control.bot_context(session)

def bot_apply_at(revision: U32, id: U32, session: Control.Session) -> Control.Packet:
  Control.bot_apply_at(revision, id, session)

def bot_fallback_at(revision: U32, session: Control.Session) -> Control.Packet:
  Control.bot_fallback_at(revision, session)
