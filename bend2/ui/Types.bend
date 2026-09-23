# Shared presentation boundary. Game legality remains in the frozen kernel.
import Base
import ../core/Model.bend as Model
import ../graphics/Camera.bend as Camera
import ../graphics/Scene.bend as Scene

type Preferences is Data:
  Preferences{mode: U32, layout: Bool, policy: U32, theme: U32, sound: Bool, volume: U32, view: Camera.View}

type Meta is Data:
  Meta{revision: U32, turn: Bool, inCheck: Bool, outcome: U32, offer: U32, canUndo: Bool, botPaused: Bool, recovery: Bool}

type Panels is Data:
  Panels{menu: U32, page: U32, notice: String, draftMode: U32, draftLayout: Bool, draftPolicy: U32}

type Snapshot is Data:
  Snapshot{frame: Scene.Frame, preferences: Preferences, meta: Meta, panels: Panels, legal: List<&2, U32>, history: List<&2, String>, mobile: Bool, focus: U32, moving: Bool, checking: Bool}

type Rect is Data:
  Rect{x: U32, y: U32, width: U32, height: U32}

type Control is Data:
  Control{id: U32, label: String, bounds: Rect, enabled: Bool, active: Bool}

type Note is Data:
  Note{frequency: F32, duration: U32, wave: U32, gain: F32, delay: U32}

type Input is Data:
  PointerDown{x: U32, y: U32, button: U32, alt: Bool}
  PointerMove{x: U32, y: U32}
  PointerUp{x: U32, y: U32, button: U32}
  Wheel{x: U32, y: U32, delta: F32}
  KeyInput{code: U32, down: Bool, alt: Bool, ctrl: Bool, shift: Bool}
  Activate{id: U32}
  SquareInput{square: U32, expected: U32}
  Tick{ms: U32}
  Resize{width: U32, height: U32}
  FileText{text: String}
  PortError{kind: U32}

type Effect is Data:
  Store{slot: U32, text: String}
  Download{name: String, text: String}
  PickFile{}
  Sound{notes: List<&2, Note>}
  OpenUrl{url: String}
  Exit{}

def preferences_mode(v: Preferences) -> U32:
  match v:
    case Preferences{mode, _, _, _, _, _, _}: mode

def preferences_layout(v: Preferences) -> Bool:
  match v:
    case Preferences{_, layout, _, _, _, _, _}: layout

def preferences_policy(v: Preferences) -> U32:
  match v:
    case Preferences{_, _, policy, _, _, _, _}: policy

def preferences_theme(v: Preferences) -> U32:
  match v:
    case Preferences{_, _, _, theme, _, _, _}: theme

def preferences_sound(v: Preferences) -> Bool:
  match v:
    case Preferences{_, _, _, _, sound, _, _}: sound

def preferences_volume(v: Preferences) -> U32:
  match v:
    case Preferences{_, _, _, _, _, volume, _}: volume

def preferences_view(v: Preferences) -> Camera.View:
  match v:
    case Preferences{_, _, _, _, _, _, view}: view

def meta_revision(v: Meta) -> U32:
  match v:
    case Meta{revision, _, _, _, _, _, _, _}: revision

def meta_turn(v: Meta) -> Bool:
  match v:
    case Meta{_, turn, _, _, _, _, _, _}: turn

def meta_inCheck(v: Meta) -> Bool:
  match v:
    case Meta{_, _, inCheck, _, _, _, _, _}: inCheck

def meta_outcome(v: Meta) -> U32:
  match v:
    case Meta{_, _, _, outcome, _, _, _, _}: outcome

def meta_offer(v: Meta) -> U32:
  match v:
    case Meta{_, _, _, _, offer, _, _, _}: offer

def meta_canUndo(v: Meta) -> Bool:
  match v:
    case Meta{_, _, _, _, _, canUndo, _, _}: canUndo

def meta_botPaused(v: Meta) -> Bool:
  match v:
    case Meta{_, _, _, _, _, _, botPaused, _}: botPaused

def meta_recovery(v: Meta) -> Bool:
  match v:
    case Meta{_, _, _, _, _, _, _, recovery}: recovery

def panels_menu(v: Panels) -> U32:
  match v:
    case Panels{menu, _, _, _, _, _}: menu

def panels_page(v: Panels) -> U32:
  match v:
    case Panels{_, page, _, _, _, _}: page

def panels_notice(v: Panels) -> String:
  match v:
    case Panels{_, _, notice, _, _, _}: notice

def panels_draftMode(v: Panels) -> U32:
  match v:
    case Panels{_, _, _, draftMode, _, _}: draftMode

def panels_draftLayout(v: Panels) -> Bool:
  match v:
    case Panels{_, _, _, _, draftLayout, _}: draftLayout

def panels_draftPolicy(v: Panels) -> U32:
  match v:
    case Panels{_, _, _, _, _, draftPolicy}: draftPolicy

def snapshot_frame(v: Snapshot) -> Scene.Frame:
  match v:
    case Snapshot{frame, _, _, _, _, _, _, _, _, _}: frame

def snapshot_preferences(v: Snapshot) -> Preferences:
  match v:
    case Snapshot{_, preferences, _, _, _, _, _, _, _, _}: preferences

def snapshot_meta(v: Snapshot) -> Meta:
  match v:
    case Snapshot{_, _, meta, _, _, _, _, _, _, _}: meta

def snapshot_panels(v: Snapshot) -> Panels:
  match v:
    case Snapshot{_, _, _, panels, _, _, _, _, _, _}: panels

def snapshot_legal(v: Snapshot) -> List<&2, U32>:
  match v:
    case Snapshot{_, _, _, _, legal, _, _, _, _, _}: legal

def snapshot_history(v: Snapshot) -> List<&2, String>:
  match v:
    case Snapshot{_, _, _, _, _, history, _, _, _, _}: history

def snapshot_mobile(v: Snapshot) -> Bool:
  match v:
    case Snapshot{_, _, _, _, _, _, mobile, _, _, _}: mobile

def snapshot_focus(v: Snapshot) -> U32:
  match v:
    case Snapshot{_, _, _, _, _, _, _, focus, _, _}: focus

def snapshot_moving(v: Snapshot) -> Bool:
  match v:
    case Snapshot{_, _, _, _, _, _, _, _, moving, _}: moving

def rect_x(v: Rect) -> U32:
  match v:
    case Rect{x, _, _, _}: x

def rect_y(v: Rect) -> U32:
  match v:
    case Rect{_, y, _, _}: y

def rect_width(v: Rect) -> U32:
  match v:
    case Rect{_, _, width, _}: width

def rect_height(v: Rect) -> U32:
  match v:
    case Rect{_, _, _, height}: height

def control_id(v: Control) -> U32:
  match v:
    case Control{id, _, _, _, _}: id

def control_label(v: Control) -> String:
  match v:
    case Control{_, label, _, _, _}: label

def control_bounds(v: Control) -> Rect:
  match v:
    case Control{_, _, bounds, _, _}: bounds

def control_enabled(v: Control) -> Bool:
  match v:
    case Control{_, _, _, enabled, _}: enabled

def control_active(v: Control) -> Bool:
  match v:
    case Control{_, _, _, _, active}: active

def note_frequency(v: Note) -> F32:
  match v:
    case Note{frequency, _, _, _, _}: frequency

def note_duration(v: Note) -> U32:
  match v:
    case Note{_, duration, _, _, _}: duration

def note_wave(v: Note) -> U32:
  match v:
    case Note{_, _, wave, _, _}: wave

def note_gain(v: Note) -> F32:
  match v:
    case Note{_, _, _, gain, _}: gain

def note_delay(v: Note) -> U32:
  match v:
    case Note{_, _, _, _, delay}: delay

def frame_position(v: Scene.Frame) -> Model.Position:
  match v:
    case Scene.Frame{position, _, _, _, _, _, _, _, _, _, _}: position

def frame_previous(v: Scene.Frame) -> Model.Position:
  match v:
    case Scene.Frame{_, previous, _, _, _, _, _, _, _, _, _}: previous

def frame_selected(v: Scene.Frame) -> U32:
  match v:
    case Scene.Frame{_, _, selected, _, _, _, _, _, _, _, _}: selected

def frame_hovered(v: Scene.Frame) -> U32:
  match v:
    case Scene.Frame{_, _, _, hovered, _, _, _, _, _, _, _}: hovered

def frame_targets(v: Scene.Frame) -> List<&2, U32>:
  match v:
    case Scene.Frame{_, _, _, _, targets, _, _, _, _, _, _}: targets

def frame_tile(v: Scene.Frame) -> U32:
  match v:
    case Scene.Frame{_, _, _, _, _, tile, _, _, _, _, _}: tile

def frame_tileTargets(v: Scene.Frame) -> List<&2, U32>:
  match v:
    case Scene.Frame{_, _, _, _, _, _, tileTargets, _, _, _, _}: tileTargets

def frame_lastAction(v: Scene.Frame) -> U32:
  match v:
    case Scene.Frame{_, _, _, _, _, _, _, lastAction, _, _, _}: lastAction

def frame_progress(v: Scene.Frame) -> U32:
  match v:
    case Scene.Frame{_, _, _, _, _, _, _, _, progress, _, _}: progress

def frame_theme(v: Scene.Frame) -> U32:
  match v:
    case Scene.Frame{_, _, _, _, _, _, _, _, _, theme, _}: theme

def frame_view(v: Scene.Frame) -> Camera.View:
  match v:
    case Scene.Frame{_, _, _, _, _, _, _, _, _, _, view}: view


def snapshot_checking(v: Snapshot) -> Bool:
  match v:
    case Snapshot{_, _, _, _, _, _, _, _, _, checking}: checking
