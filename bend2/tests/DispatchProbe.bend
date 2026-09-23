# Profiling facade only; the reusable graphics runtime has no application imports.
import Base
import ../Application.bend as A
import ../graphics/Scene.bend as S
import ../ui/Program.bend as P
import ../ui/Types.bend as T
import ../ui/View.bend as V
import ../lib/graphics/Canvas.bend as C

def boot() -> A.Packet: A.boot("", "", 1024, 768)
def dispatch(events: List<&2, T.Input>, session: A.Session) -> A.Packet: A.dispatch(events, session)
def update(events: List<&2, T.Input>, state: P.State) -> P.Update: P.update(events, state)
def snapshot(state: P.State) -> T.Snapshot: P.snapshot(state)
def ground(background: Image, frame: S.Frame) -> Image: S.motion_ground(background, frame)
def pieces(ground: Image, frame: S.Frame) -> Image: S.pieces_on(ground, frame)
def scene(background: Image, frame: S.Frame) -> Image: S.render_on(True{}, background, frame)
def embed(board: Image, x: U32, y: U32, chrome: Image) -> Image: C.embed(board, 9n, x, y, chrome)
def compose(snapshot: T.Snapshot, board: Image, chrome: Image) -> Image: V.compose(snapshot, board, chrome)

