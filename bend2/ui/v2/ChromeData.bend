# Small immutable presentation payload shared by the game adapter and painter.
# Keeping game snapshots out of ChromePaint keeps its render dependency leaf small.
import Base

type Presentation is Data:
  Presentation{theme: U32, menu: U32, status: String, mode: String,
    selection: String, context: String, history: List<&2, String>,
    page: U32, soundOn: Bool}

def theme(+d: Presentation) -> U32:
  match d:
    case Presentation{theme, _, _, _, _, _, _, _, _}: theme

def menu(+d: Presentation) -> U32:
  match d:
    case Presentation{_, menu, _, _, _, _, _, _, _}: menu

def status(+d: Presentation) -> String:
  match d:
    case Presentation{_, _, status, _, _, _, _, _, _}: status

def mode(+d: Presentation) -> String:
  match d:
    case Presentation{_, _, _, mode, _, _, _, _, _}: mode

def selection(+d: Presentation) -> String:
  match d:
    case Presentation{_, _, _, _, selection, _, _, _, _}: selection

def context(+d: Presentation) -> String:
  match d:
    case Presentation{_, _, _, _, _, context, _, _, _}: context

def history(+d: Presentation) -> List<&2, String>:
  match d:
    case Presentation{_, _, _, _, _, _, history, _, _}: history

def page(+d: Presentation) -> U32:
  match d:
    case Presentation{_, _, _, _, _, _, _, page, _}: page

def sound_on(+d: Presentation) -> Bool:
  match d:
    case Presentation{_, _, _, _, _, _, _, _, soundOn}: soundOn
