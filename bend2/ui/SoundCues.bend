# Game-specific audio palette. Generic wave synthesis stays in lib/audio.
import Base
import ./Types.bend as T

def move_notes(+level: F32) -> List<&2, T.Note>:
  [T.Note{392.0, 75, 0, F32.div(level, 220.0), 0},
   T.Note{587.33, 105, 0, F32.div(level, 310.0), 28}]

def capture_notes(+level: F32) -> List<&2, T.Note>:
  [T.Note{174.61, 170, 1, F32.div(level, 160.0), 0},
   T.Note{261.63, 82, 0, F32.div(level, 360.0), 0},
   T.Note{523.25, 105, 0, F32.div(level, 420.0), 48}]

def shift_notes(+level: F32) -> List<&2, T.Note>:
  [T.Note{293.66, 145, 1, F32.div(level, 200.0), 0},
   T.Note{440.0, 150, 0, F32.div(level, 280.0), 30},
   T.Note{659.25, 170, 0, F32.div(level, 360.0), 65}]

def check_notes(+level: F32) -> List<&2, T.Note>:
  [T.Note{493.88, 105, 0, F32.div(level, 240.0), 0},
   T.Note{739.99, 130, 1, F32.div(level, 280.0), 55},
   T.Note{987.77, 200, 0, F32.div(level, 400.0), 100}]

def terminal_notes(+level: F32) -> List<&2, T.Note>:
  [T.Note{392.0, 250, 0, F32.div(level, 340.0), 0},
   T.Note{523.25, 265, 0, F32.div(level, 360.0), 85},
   T.Note{659.25, 340, 0, F32.div(level, 400.0), 170}]

# A finished game wins over a check alert, check over a Shift, and a capture
# over an ordinary move. This is presentation only, after the kernel accepts.
def notes.for(+terminal: Bool, +check: Bool, +shift: Bool, +capture: Bool,
  +level: F32) -> List<&2, T.Note>:
  match terminal check shift capture:
    case True{} _ _ _: terminal_notes(level)
    case False{} True{} _ _: check_notes(level)
    case False{} False{} True{} _: shift_notes(level)
    case False{} False{} False{} True{}: capture_notes(level)
    case False{} False{} False{} False{}: move_notes(level)

def notes(+terminal: Bool, +check: Bool, +shift: Bool, +capture: Bool,
  +volume: U32) -> List<&2, T.Note>:
  notes.for(terminal, check, shift, capture,
    U32.to_f32(U32.min(volume, 100)))
