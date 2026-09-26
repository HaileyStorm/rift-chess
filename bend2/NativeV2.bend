# Browser-independent native host for the separated Bend controller, board
# scene and game-owned MenuAA renderer. Game, input, presentation and audio
# policy stays in Bend; Base App owns the native Window/frame lifecycle.
import Base
import ./ApplicationControl.bend as Control
import ./graphics/Scene.bend as Scene
import ./graphics/v2game/BoardScene.bend as BoardScene
import ./graphics/v2game/Assets.bend as Assets
import ./graphics/v2game/PieceAssets.bend as PieceAssets
import ./graphics/v2game/PieceSprites.bend as PieceSprites
import ./ui/Types.bend as T
import ./ui/v2/ChromeData.bend as ChromeData
import ./ui/v2/ChromePlan.bend as ChromePlan
import ./ui/v2/MenuAA.bend as MenuAA
import ./ui/v2/fonts/FontPack.bend as MenuFontPack

type Cache is Data:
  Cache{valid: Bool, size: U32, board_size: U32, motion: Bool,
    assets_loaded: Bool, asset_theme: U32, plates: Assets.ObservatoryPlates,
    fonts: MenuFontPack.Book, sprites: Maybe<&2, PieceSprites.Pieces>,
    chrome_data: ChromeData.Presentation, plan: ChromePlan.Plan,
    background: Image, motion_background: Image, ground: Image,
    prepared: Image, board: Image, shell: Image, overlay: Image, output: Image}

type NativeFrame is Data:
  NativeFrame{packet: Control.Packet, cache: Cache}

type Composed is Data:
  Composed{cache: Cache, output: Image}

type Rendered is Data:
  Rendered{frame_box: List<&2, NativeFrame>, output: Image}

type NativePaths is Data:
  NativePaths{save: String, preferences: String, recovery: String,
    import_record: String, export_record: String}

type Read is Data:
  Read{text: String, ok: Bool, code: U32}

type Write is Data:
  Write{ok: Bool, code: U32}

type Journal is Data:
  # A malformed present file keeps its exact bytes so the recovery flow can
  # preserve them; a missing alternate slot is a clean first launch.
  Journal{valid: Bool, present: Bool, sequence: U32, text: String, error: U32}

type UnescapeStep is Data:
  UnescapeStep{escaped: Bool, acc: String}

type Slots is Data:
  Slots{primary: Journal, secondary: Journal}

type StoreTarget is Data:
  StoreTarget{path: String, sequence: U32}

type FontBuffer is Type:
  FontBuffer{array: Array<U32>, used: U32, valid: Bool}

type Batch is Data:
  Batch{inputs: List<&2, T.Input>, alt_mask: U32, ctrl_mask: U32,
    shift_mask: U32, closed: Bool}

type AudioSplit is Data:
  AudioSplit{block: List<&2, F32>, tail: List<&2, F32>}

type Pump is Type:
  Pump{audio: Maybe<Audio>, pending: List<&2, F32>}

type Runtime is Type:
  Runtime{audio: Maybe<Audio>, audio_ready: Bool,
    pending: List<&2, F32>, inputs: List<&2, T.Input>, exit: Bool}

type AssetStep is Type:
  AssetStep{valid: Bool, frame_box: List<&2, NativeFrame>, runtime: Runtime}

type AssetFrame is Data:
  AssetFrame{valid: Bool, frame_box: List<&2, NativeFrame>}

type TickNext is Data:
  TickNext{paths: NativePaths, stamp: Nat, alt_mask: U32,
    ctrl_mask: U32, shift_mask: U32, now: Nat}

type State is Type:
  State{frame_box: List<&2, NativeFrame>, paths: NativePaths,
    audio: Maybe<Audio>, audio_ready: Bool, audio_pending: List<&2, F32>,
    alt_mask: U32, ctrl_mask: U32, shift_mask: U32,
    stamp: Nat}

def empty_cache(fonts: MenuFontPack.Book,
  sprites: Maybe<&2, PieceSprites.Pieces>,
  chrome_data: ChromeData.Presentation, plan: ChromePlan.Plan) -> Cache:
  Cache{False{}, 0, 0, False{}, False{}, 0, Assets.load_plates([]), fonts,
    sprites, chrome_data, plan,
    Pix{0}, Pix{0}, Pix{0}, Pix{0}, Pix{0}, Pix{0}, Pix{0}, Pix{0}}

def cache_with_assets(cache: Cache, theme: U32,
  plates: Assets.ObservatoryPlates) -> Cache:
  match cache:
    case Cache{_, size, board_size, motion, _, _, _, +fonts, +sprites,
      +chrome_data, +plan, background,
      motion_background, ground, prepared, board, shell, overlay, output}:
      Cache{False{}, size, board_size, motion, True{}, theme, plates,
        fonts, sprites, chrome_data, plan, background, motion_background, ground, prepared,
        board, shell, overlay, output}

def background_size(board_size: U32, theme: U32,
  plates: Assets.ObservatoryPlates) -> Image:
  match board_size:
    case 512: BoardScene.underlay512_asset(theme, plates)
    case _: BoardScene.underlay1024_asset(theme, plates)

def motion_background_size(theme: U32,
  plates: Assets.ObservatoryPlates) -> Image:
  BoardScene.underlay128_asset(theme, plates)

def choose_background(refresh: Bool, board_size: U32,
  theme: U32, plates: Assets.ObservatoryPlates, old: Image) -> Image:
  match refresh:
    case True{}: background_size(board_size, theme, plates)
    case False{}: old

def choose_motion_background(refresh: Bool, theme: U32,
  plates: Assets.ObservatoryPlates, old: Image) -> Image:
  match refresh:
    case True{}: motion_background_size(theme, plates)
    case False{}: old

def ground_size(board_size: U32, +frame: Scene.Frame,
  background: Image) -> Image:
  match board_size:
    case 512: BoardScene.fast_ground512(frame, background)
    case _: BoardScene.fast_ground1024(frame, background)

def choose_ground(refresh: Bool, board_size: U32, +frame: Scene.Frame,
  background: Image, old: Image) -> Image:
  match refresh:
    case True{}: ground_size(board_size, frame, background)
    case False{}: old

def prepared_size(board_size: U32, +frame: Scene.Frame,
  ground: Image) -> Image:
  match board_size:
    case 512: BoardScene.fast_prepare512(frame, ground)
    case _: BoardScene.fast_prepare1024(frame, ground)

def sprite_prepared512(+frame: Scene.Frame, +pieces: PieceSprites.Pieces,
  theme: U32, plates: Assets.ObservatoryPlates) -> Image:
  +underlay = BoardScene.underlay512_asset(theme, plates)
  +sprite_ground = BoardScene.settled_ground512(frame, underlay)
  +sprite_layer = BoardScene.fast_sprite_pieces512(frame, pieces, sprite_ground)
  BoardScene.fast_sprite_feedback_static512(frame, sprite_layer)

def sprite_prepared_size(board_size: U32, +frame: Scene.Frame,
  +pieces: PieceSprites.Pieces, theme: U32,
  plates: Assets.ObservatoryPlates) -> Image:
  match board_size:
    case 512: sprite_prepared512(frame, pieces, theme, plates)
    case _: BoardScene.nearest2(9n,
      sprite_prepared512(frame, pieces, theme, plates))

def prepared_with_sprites(board_size: U32, +frame: Scene.Frame,
  sprites: Maybe<&2, PieceSprites.Pieces>, theme: U32,
  plates: Assets.ObservatoryPlates, ground: Image) -> Image:
  match sprites:
    case Some{pieces}: sprite_prepared_size(board_size, frame, pieces, theme, plates)
    case None{}: prepared_size(board_size, frame, ground)

def choose_prepared(refresh: Bool, board_size: U32, +frame: Scene.Frame,
  sprites: Maybe<&2, PieceSprites.Pieces>, theme: U32,
  plates: Assets.ObservatoryPlates, ground: Image, old: Image) -> Image:
  match refresh:
    case True{}: prepared_with_sprites(board_size, frame, sprites,
      theme, plates, ground)
    case False{}: old

def pointer_size(board_size: U32, +frame: Scene.Frame,
  prepared: Image) -> Image:
  match board_size:
    case 512: BoardScene.fast_pointer512(frame, prepared)
    case _: BoardScene.fast_pointer1024(frame, prepared)

def camera_size(+frame: Scene.Frame,
  motion_background: Image) -> Image:
  BoardScene.fast_camera512(frame, motion_background)

def board_refresh(motion: Bool, board_size: U32, +frame: Scene.Frame,
  motion_background: Image, prepared: Image) -> Image:
  match motion:
    case True{}: camera_size(frame, motion_background)
    case False{}: pointer_size(board_size, frame, prepared)

def choose_board(refresh: Bool, motion: Bool, board_size: U32,
  +frame: Scene.Frame, motion_background: Image, prepared: Image,
  old: Image) -> Image:
  match refresh:
    case True{}: board_refresh(motion, board_size, frame, motion_background, prepared)
    case False{}: old

def choose_shell(refresh: Bool, depth: Nat, size: U32,
  +data: ChromeData.Presentation, +plan: ChromePlan.Plan,
  +fonts: MenuFontPack.Book, old: Image) -> Image:
  match refresh:
    case True{}: MenuAA.base_chrome(depth, size, data, plan, fonts)
    case False{}: old

def menu_chrome(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan, +fonts: MenuFontPack.Book, base: Image) -> Image:
  +controls = MenuAA.controls_chrome(depth, size, data, plan, fonts, base)
  MenuAA.dynamic_chrome(depth, size, data, plan, fonts, controls)

def choose_overlay(refresh: Bool, depth: Nat, size: U32,
  +data: ChromeData.Presentation, +plan: ChromePlan.Plan,
  +fonts: MenuFontPack.Book, shell: Image, old: Image) -> Image:
  match refresh:
    case True{}: menu_chrome(depth, size, data, plan, fonts, shell)
    case False{}: old

def menu_output(playing: Bool, depth: Nat, size: U32,
  +data: ChromeData.Presentation, +plan: ChromePlan.Plan,
  +fonts: MenuFontPack.Book, board: Image, prepared: Image) -> Image:
  match playing:
    case True{}: MenuAA.compose(depth, plan, board, prepared)
    case False{}: MenuAA.render(depth, size, data, plan, fonts, board)

def choose_output(refresh: Bool, depth: Nat, size: U32,
  +data: ChromeData.Presentation, +plan: ChromePlan.Plan,
  +fonts: MenuFontPack.Book, board: Image, chrome: Image, old: Image) -> Image:
  match refresh:
    case True{}: menu_output(MenuAA.play(data), depth, size,
      data, plan, fonts, board, chrome)
    case False{}: old

def render_request(+snapshot: T.Snapshot, +chrome_data: ChromeData.Presentation,
  +plan: ChromePlan.Plan, request: Control.RenderPlan,
  cache: Cache) -> Composed:
  match request cache:
    case Control.RenderPlan{+background_dirty, ground_dirty,
      prepared_dirty, +chrome_dirty, +frame_dirty, +theme, +size,
      +board_size, +depth, _, +shell_dirty, +motion}
      Cache{valid, cached_size, cached_board_size, cached_motion,
        assets_loaded, asset_theme, +plates, +fonts, +sprites,
        +cached_data, +cached_plan,
        background, motion_background, ground,
        prepared, board, shell, overlay, output}:
      +same_size = Bool.and(U32.is_eq(cached_size, size),
        U32.is_eq(cached_board_size, board_size))
      +force = Bool.not(Bool.and(valid, same_size))
      +base_changed = Bool.not(MenuAA.same_base(
        cached_data, cached_plan, chrome_data, plan))
      +static_changed = Bool.not(MenuAA.same_static(
        cached_data, cached_plan, chrome_data, plan))
      +settled_after_motion = Bool.and(cached_motion, Bool.not(motion))
      +next_background = choose_background(Bool.or(force, background_dirty),
        board_size, theme, plates, background)
      +next_motion_background = choose_motion_background(
        Bool.or(force, background_dirty), theme, plates, motion_background)
      +ground_refresh = Bool.and(Bool.not(motion), Bool.or(force,
        Bool.or(ground_dirty, settled_after_motion)))
      +prepared_refresh = Bool.and(Bool.not(motion), Bool.or(force,
        Bool.or(prepared_dirty, settled_after_motion)))
      +next_ground = choose_ground(ground_refresh, board_size,
        T.snapshot_frame(snapshot), next_background, ground)
      +next_prepared = choose_prepared(prepared_refresh, board_size,
        T.snapshot_frame(snapshot), sprites, theme, plates, next_ground, prepared)
      +redraw_board = Bool.or(force, Bool.or(frame_dirty, settled_after_motion))
      +next_board = choose_board(redraw_board, motion, board_size,
        T.snapshot_frame(snapshot), next_motion_background, next_prepared, board)
      +next_shell = choose_shell(Bool.or(force, Bool.or(shell_dirty, base_changed)), depth,
        size, chrome_data, plan, fonts, shell)
      +refresh_overlay = Bool.or(force,
        Bool.or(chrome_dirty, Bool.or(shell_dirty,
          Bool.or(base_changed, static_changed))))
      +next_overlay = choose_overlay(refresh_overlay,
        depth, size, chrome_data, plan, fonts, next_shell, overlay)
      +redraw_output = Bool.or(force,
        Bool.or(settled_after_motion,
          Bool.or(frame_dirty,
            Bool.or(chrome_dirty, Bool.or(shell_dirty,
              Bool.or(base_changed, static_changed))))))
      +next_output = choose_output(redraw_output, depth, size, chrome_data, plan, fonts,
        next_board, next_overlay, output)
      Composed{Cache{True{}, size, board_size, motion, assets_loaded, asset_theme,
        plates, fonts, sprites, chrome_data, plan, next_background,
        next_motion_background, next_ground, next_prepared, next_board,
        next_shell, next_overlay, next_output}, next_output}

def render_packet(packet: Control.Packet, cache: Cache) -> Composed:
  match packet:
    case Control.Packet{_, _, +snapshot, +chrome_data, +plan, request,
      _, _, _, _, _, _, _}:
      render_request(snapshot, chrome_data, plan, request, cache)

def box_frame(packet: Control.Packet, cache: Cache) -> List<&2, NativeFrame>:
  [NativeFrame{packet, cache}]

def rendered_composed(composed: Composed, packet: Control.Packet) -> Maybe<Rendered>:
  match composed:
    case Composed{cache, +output}:
      Some{Rendered{box_frame(packet, cache), output}}

def render_frame_box(frame_box: List<&2, NativeFrame>) -> Maybe<Rendered>:
  match frame_box:
    case NativeFrame{+packet, cache} <> Nil{}:
      rendered_composed(render_packet(packet, cache), packet)
    case _: None{}

def view_result(rendered: Maybe<Rendered>, +old_frame_box: List<&2, NativeFrame>,
  paths: NativePaths, audio: Maybe<Audio>, audio_ready: Bool,
  audio_pending: List<&2, F32>, alt_mask: U32, ctrl_mask: U32,
  shift_mask: U32, stamp: Nat) -> State & Image:
  match rendered:
    case Some{Rendered{frame_box, +output}}:
      (State{frame_box, paths, audio, audio_ready, audio_pending,
        alt_mask, ctrl_mask, shift_mask, stamp}, output)
    case None{}:
      (State{old_frame_box, paths, audio, audio_ready, audio_pending,
        alt_mask, ctrl_mask, shift_mask, stamp}, Pix{0})

def view(state: State) -> State & Image:
  match state:
    case State{+frame_box, paths, audio, audio_ready, audio_pending,
      alt_mask, ctrl_mask, shift_mask, stamp}:
      view_result(render_frame_box(frame_box), frame_box, paths, audio,
        audio_ready, audio_pending, alt_mask, ctrl_mask, shift_mask, stamp)

def mouse_button(+button: U32) -> U32:
  Bool.pick(U32, U32.is_eq(button, 0), 0,
    Bool.pick(U32, Bool.or(U32.is_eq(button, 1), U32.is_eq(button, 2)), 2, 1))

# X11/macOS modifier key values used by the pinned Base Window adapter.
def alt_bit(+code: U32) -> U32:
  Bool.pick(U32, U32.is_eq(code, 18), 1,
    Bool.pick(U32, U32.is_eq(code, 65594), 2,
      Bool.pick(U32, U32.is_eq(code, 65597), 4, 0)))

def ctrl_bit(+code: U32) -> U32:
  Bool.pick(U32, U32.is_eq(code, 65595), 1,
    Bool.pick(U32, U32.is_eq(code, 65598), 2,
      Bool.pick(U32, U32.is_eq(code, 65591), 4,
        Bool.pick(U32, U32.is_eq(code, 65590), 8, 0))))

def shift_bit(+code: U32) -> U32:
  Bool.pick(U32, U32.is_eq(code, 65592), 1,
    Bool.pick(U32, U32.is_eq(code, 65596), 2, 0))

def key_code(+code: U32) -> U32:
  +letter = Bool.and(U32.is_ge(code, 97), U32.is_le(code, 122))
  Bool.pick(U32, U32.is_eq(code, 63234), 37,
    Bool.pick(U32, U32.is_eq(code, 63232), 38,
      Bool.pick(U32, U32.is_eq(code, 63235), 39,
        Bool.pick(U32, U32.is_eq(code, 63233), 40,
          Bool.pick(U32, letter, U32.sub(code, 32), code)))))

def modifier_step(down: Bool, +mask: U32, +bit: U32) -> U32:
  Bool.pick(U32, down, U32.or(mask, bit), U32.and(mask, U32.not(bit)))

def mouse_input(x: U32, y: U32, +button: U32, down: Bool, +alt: Bool) -> T.Input:
  match down:
    case True{}: T.PointerDown{x, y, mouse_button(button), alt}
    case False{}: T.PointerUp{x, y, mouse_button(button)}

def events_go(events: List<Event>, +alt_mask: U32, +ctrl_mask: U32,
  +shift_mask: U32, +acc: List<&2, T.Input>, closed: Bool) -> Batch:
  match events:
    case Nil{}:
      Batch{List.reverse(&2, T.Input, acc), alt_mask, ctrl_mask, shift_mask, closed}
    case Close{} <> _:
      Batch{List.reverse(&2, T.Input, acc), alt_mask, ctrl_mask, shift_mask, True{}}
    case Key{+code, +down} <> rest:
      +next_alt = modifier_step(down, alt_mask, alt_bit(code))
      +next_ctrl = modifier_step(down, ctrl_mask, ctrl_bit(code))
      +next_shift = modifier_step(down, shift_mask, shift_bit(code))
      +alt_down = U32.is_ne(next_alt, 0)
      +ctrl_down = U32.is_ne(next_ctrl, 0)
      +shift_down = U32.is_ne(next_shift, 0)
      events_go(rest, next_alt, next_ctrl, next_shift,
        T.KeyInput{key_code(code), down, alt_down, ctrl_down, shift_down} <> acc, closed)
    case Mouse{x, y, +button, down} <> rest:
      events_go(rest, alt_mask, ctrl_mask, shift_mask,
        mouse_input(x, y, button, down, U32.is_ne(alt_mask, 0)) <> acc, closed)
    case Move{x, y} <> rest:
      events_go(rest, alt_mask, ctrl_mask, shift_mask,
        T.PointerMove{x, y} <> acc, closed)

def events(events: List<Event>, alt_mask: U32, ctrl_mask: U32,
  shift_mask: U32) -> Batch:
  events_go(events, alt_mask, ctrl_mask, shift_mask, [], False{})

def save_path(paths: NativePaths) -> String:
  match paths:
    case NativePaths{save, _, _, _, _}: save

def preferences_path(paths: NativePaths) -> String:
  match paths:
    case NativePaths{_, preferences, _, _, _}: preferences

def recovery_path(paths: NativePaths) -> String:
  match paths:
    case NativePaths{_, _, recovery, _, _}: recovery

def import_path(paths: NativePaths) -> String:
  match paths:
    case NativePaths{_, _, _, import_record, _}: import_record

def export_path(paths: NativePaths) -> String:
  match paths:
    case NativePaths{_, _, _, _, export_record}: export_record

# Base File has no mkdir/rename effect. Keep each logical record directly under
# the existing home and alternate its primary and `.b` snapshots. A truncating
# write can damage only the inactive slot; the complete-marker reader retains
# the prior snapshot after a crash or partial write.
def paths_in_home(+home: String) -> NativePaths:
  NativePaths{String.append(home, "/.rift-chess-bend2-save.json"),
    String.append(home, "/.rift-chess-bend2-preferences.json"),
    String.append(home, "/.rift-chess-bend2-recovery.json"),
    String.append(home, "/.rift-chess-bend2-import.json"),
    String.append(home, "/.rift-chess-bend2-record.json")}

# An explicit existing directory is useful for isolated native runs. Base has
# no mkdir effect; a missing or unwritable override is reported by File writes.
def paths_in_directory(+directory: String) -> NativePaths:
  NativePaths{String.append(directory, "/.rift-chess-bend2-save.json"),
    String.append(directory, "/.rift-chess-bend2-preferences.json"),
    String.append(directory, "/.rift-chess-bend2-recovery.json"),
    String.append(directory, "/.rift-chess-bend2-import.json"),
    String.append(directory, "/.rift-chess-bend2-record.json")}

def relative_paths() -> NativePaths:
  NativePaths{"rift-chess-bend2-save.json", "rift-chess-bend2-preferences.json",
    "rift-chess-bend2-recovery.json", "rift-chess-bend2-import.json",
    "rift-chess-bend2-record.json"}

def paths_from_home_value(empty: Bool, home: String) -> NativePaths:
  match empty:
    case True{}: relative_paths()
    case False{}: paths_in_home(home)

def paths_from_home(result: Result<&1, &1, U32 & String, String>) -> NativePaths:
  match result:
    case Done{+home}: paths_from_home_value(String.is_empty(home), home)
    case Fail{_}: relative_paths()

def paths_from_data_directory(empty: Bool, directory: String,
  home: Result<&1, &1, U32 & String, String>) -> NativePaths:
  match empty:
    case True{}: paths_from_home(home)
    case False{}: paths_in_directory(directory)

def paths_from_environment(directory: Result<&1, &1, U32 & String, String>,
  home: Result<&1, &1, U32 & String, String>) -> NativePaths:
  match directory:
    case Done{+path}:
      paths_from_data_directory(String.is_empty(path), path, home)
    case Fail{_}: paths_from_home(home)

def read_answer(answer: Result<&1, &1, U32 & String, String>) -> Read:
  match answer:
    case Done{text}: Read{text, True{}, 0}
    case Fail{(code, _)}: Read{"", False{}, code}

def read_result(r: File & Result<&1, &1, U32 & String, String>) -> IO(Read):
  (file, answer) = r
  do IO<Read>:
    Unit <- File.close(file)
    IO.pure(Read, read_answer(answer))

def read_size_choice(+max: U32, too_large: Bool, file: File) -> IO(Read):
  match too_large:
    case True{}:
      do IO<Read>:
        Unit <- File.close(file)
        IO.pure(Read, Read{"", False{}, 27})
    case False{}:
      do IO<Read>:
        content : File & Result<&1, &1, U32 & String, String> <- File.read(file, max)
        read_result(content)

def read_size_answer(+max: U32,
  r: File & Result<&1, &1, U32 & String, U32>) -> IO(Read):
  (file, answer) = r
  match answer:
    case Done{size}: read_size_choice(max, U32.is_gt(size, max), file)
    case Fail{(code, _)}:
      do IO<Read>:
        Unit <- File.close(file)
        IO.pure(Read, Read{"", False{}, code})

def read_open_failure(code: U32) -> IO(Read):
  match code:
    case 2: IO.pure(Read, Read{"", True{}, 2})
    case _: IO.pure(Read, Read{"", False{}, code})

def read_open(max: U32, r: Result<&1, &1, U32 & String, File>) -> IO(Read):
  match r:
    case Fail{(code, _)}: read_open_failure(code)
    case Done{file}:
      do IO<Read>:
        sized : File & Result<&1, &1, U32 & String, U32> <- File.size(file)
        read_size_answer(max, sized)

def read_file_limit(+max: U32, path: String) -> IO(Read):
  do IO<Read>:
    opened : Result<&1, &1, U32 & String, File> <- File.open(path, "r")
    read_open(max, opened)

def read_file(path: String) -> IO(Read):
  read_file_limit(Control.max_file_bytes(), path)

def write_answer(answer: Result<&1, &1, U32 & String, Unit>) -> Write:
  match answer:
    case Done{_}: Write{True{}, 0}
    case Fail{(code, _)}: Write{False{}, code}

def write_result(r: File & Result<&1, &1, U32 & String, Unit>) -> IO(Write):
  (file, answer) = r
  do IO<Write>:
    Unit <- File.close(file)
    IO.pure(Write, write_answer(answer))

def write_open(text: String,
  r: Result<&1, &1, U32 & String, File>) -> IO(Write):
  match r:
    case Fail{(code, _)}: IO.pure(Write, Write{False{}, code})
    case Done{file}:
      do IO<Write>:
        written : File & Result<&1, &1, U32 & String, Unit> <- File.write(file, text)
        write_result(written)

def write_file(path: String, text: String) -> IO(Write):
  do IO<Write>:
    opened : Result<&1, &1, U32 & String, File> <- File.open(path, "w")
    write_open(text, opened)

def asset_bytes_result(id: Assets.AssetId,
  result: File & Result<&1, &1, U32 & String, List<&2, U32>>) -> IO(Assets.AssetResponse):
  (file, answer) = result
  match answer:
    case Done{bytes}:
      do IO<Assets.AssetResponse>:
        Unit <- File.close(file)
        IO.pure(Assets.AssetResponse,
          Assets.AssetResponse{id, bytes, True{}})
    case Fail{(code, message)}:
      do IO<Assets.AssetResponse>:
        Unit <- File.close(file)
        Unit <- IO.print_err(String.append("Native asset read failed (OS code ",
          String.append(U32.show(code), String.append("): ", message))))
        IO.pure(Assets.AssetResponse,
          Assets.AssetResponse{id, [], False{}})

def asset_open_result(id: Assets.AssetId, path: String, max_bytes: U32,
  result: Result<&1, &1, U32 & String, File>) -> IO(Assets.AssetResponse):
  match result:
    case Fail{(code, message)}:
      do IO<Assets.AssetResponse>:
        Unit <- IO.print_err(String.append("Native asset open failed (OS code ",
          String.append(U32.show(code), String.append("): ", path))))
        IO.pure(Assets.AssetResponse,
          Assets.AssetResponse{id, [], False{}})
    case Done{file}:
      do IO<Assets.AssetResponse>:
        bytes : File & Result<&1, &1, U32 & String, List<&2, U32>> <-
          File.read_bytes(file, max_bytes)
        asset_bytes_result(id, bytes)

def asset_request_result(request: Assets.AssetRequest) -> IO(Assets.AssetResponse):
  match request:
    case Assets.AssetRequest{id, +path, max_bytes}:
      # `max_bytes` is supplied by the Bend request and includes the codec's
      # one-byte overlength sentinel. Keep the relative path verbatim.
      do IO<Assets.AssetResponse>:
        opened : Result<&1, &1, U32 & String, File> <- File.open(path, "r")
        asset_open_result(id, path, max_bytes, opened)

def asset_requests_result(requests: List<&2, Assets.AssetRequest>) -> IO(Assets.ObservatoryPlates):
  match requests:
    case Nil{}:
      IO.pure(Assets.ObservatoryPlates,
        Assets.load_plates([]))
    case request <> _:
      do IO<Assets.ObservatoryPlates>:
        response : Assets.AssetResponse <- asset_request_result(request)
        IO.pure(Assets.ObservatoryPlates, Assets.load_plates([response]))

def load_theme_assets(theme: U32) -> IO(Assets.ObservatoryPlates):
  asset_requests_result(Assets.asset_ids(theme))

def sprite_read_bytes_result(id: U32,
  result: File & Result<&1, &1, U32 & String, List<&2, U32>>) ->
  IO(PieceAssets.AssetResponse):
  (file, answer) = result
  match answer:
    case Done{bytes}:
      do IO<PieceAssets.AssetResponse>:
        Unit <- File.close(file)
        IO.pure(PieceAssets.AssetResponse,
          PieceAssets.AssetResponse{id, bytes, True{}})
    case Fail{(code, message)}:
      do IO<PieceAssets.AssetResponse>:
        Unit <- File.close(file)
        Unit <- IO.print_err(String.append("Native sprite read failed (OS code ",
          String.append(U32.show(code), String.append(": ", message))))
        IO.pure(PieceAssets.AssetResponse,
          PieceAssets.AssetResponse{id, [], False{}})

def sprite_file_size_choice(allowed: Bool, id: U32, path: String,
  max_bytes: U32, file: File) -> IO(PieceAssets.AssetResponse):
  match allowed:
    case False{}:
      do IO<PieceAssets.AssetResponse>:
        Unit <- File.close(file)
        Unit <- IO.print_err(String.append("Native sprite exceeds game byte cap: ", path))
        IO.pure(PieceAssets.AssetResponse,
          PieceAssets.AssetResponse{id, [], False{}})
    case True{}:
      do IO<PieceAssets.AssetResponse>:
        bytes : File & Result<&1, &1, U32 & String, List<&2, U32>> <-
          File.read_bytes(file, U32.add(max_bytes, 1))
        sprite_read_bytes_result(id, bytes)

def sprite_file_size_result(id: U32, path: String, +max_bytes: U32,
  result: File & Result<&1, &1, U32 & String, U32>) ->
  IO(PieceAssets.AssetResponse):
  (file, answer) = result
  match answer:
    case Done{size}:
      sprite_file_size_choice(U32.is_le(size, max_bytes), id, path, max_bytes, file)
    case Fail{(code, message)}:
      do IO<PieceAssets.AssetResponse>:
        Unit <- File.close(file)
        Unit <- IO.print_err(String.append("Native sprite size failed (OS code ",
          String.append(U32.show(code), String.append(": ", message))))
        IO.pure(PieceAssets.AssetResponse,
          PieceAssets.AssetResponse{id, [], False{}})

def sprite_open_result(id: U32, path: String, max_bytes: U32,
  result: Result<&1, &1, U32 & String, File>) -> IO(PieceAssets.AssetResponse):
  match result:
    case Done{file}:
      do IO<PieceAssets.AssetResponse>:
        sized : File & Result<&1, &1, U32 & String, U32> <- File.size(file)
        sprite_file_size_result(id, path, max_bytes, sized)
    case Fail{(code, message)}:
      do IO<PieceAssets.AssetResponse>:
        Unit <- IO.print_err(String.append("Native sprite open failed (OS code ",
          String.append(U32.show(code), String.append(": ", path))))
        IO.pure(PieceAssets.AssetResponse,
          PieceAssets.AssetResponse{id, [], False{}})

def sprite_asset_request(request: PieceAssets.AssetRequest) ->
  IO(PieceAssets.AssetResponse):
  match request:
    case PieceAssets.AssetRequest{id, +path, max_bytes}:
      do IO<PieceAssets.AssetResponse>:
        opened : Result<&1, &1, U32 & String, File> <- File.open(path, "r")
        sprite_open_result(id, path, max_bytes, opened)

def sprite_requests_go(requests: List<&2, PieceAssets.AssetRequest>,
  responses: List<&2, PieceAssets.AssetResponse>) ->
  IO(List<&2, PieceAssets.AssetResponse>):
  match requests:
    case Nil{}:
      IO.pure(List<&2, PieceAssets.AssetResponse>,
        List.reverse(&2, PieceAssets.AssetResponse, responses))
    case request <> rest:
      do IO<List<&2, PieceAssets.AssetResponse>>:
        response : PieceAssets.AssetResponse <- sprite_asset_request(request)
        sprite_requests_go(rest, response <> responses)

def load_native_sprites() -> IO(Maybe<&2, PieceSprites.Pieces>):
  do IO<Maybe<&2, PieceSprites.Pieces>>:
    responses : List<&2, PieceAssets.AssetResponse> <-
      sprite_requests_go(BoardScene.sprite_asset_ids(), [])
    IO.pure(Maybe<&2, PieceSprites.Pieces>,
      BoardScene.load_sprite_pages(responses))

# Base File returns bytes as a List; the game-owned FontPack decoder expects a
# power-of-two Array like the browser host supplies. Copy at most its declared
# cap and reject the extra sentinel byte rather than decoding a truncated pack.
def font_copy(fuel: Nat, bytes: List<&2, U32>, +used: U32,
  array: Array<U32>) -> FontBuffer:
  match fuel bytes:
    case 0n Nil{}: FontBuffer{array, used, True{}}
    case 0n _ <> _: FontBuffer{array, used, False{}}
    case 1n+rest Nil{}: FontBuffer{array, used, True{}}
    case 1n+rest byte <> tail:
      font_copy(rest, tail, U32.add(used, 1),
        Array.set(U32, array, used, byte))

def font_decode_result(result: Maybe<MenuFontPack.Book>) -> MenuFontPack.Book:
  match result:
    case Some{book}: book
    case None{}: MenuFontPack.empty()

def font_from_buffer(buffer: FontBuffer) -> MenuFontPack.Book:
  match buffer:
    case FontBuffer{array, used, valid}:
      match valid:
        case True{}: font_decode_result(MenuAA.load_font(array, used))
        case False{}: MenuFontPack.empty()

def font_from_bytes(bytes: List<&2, U32>) -> MenuFontPack.Book:
  font_from_buffer(font_copy(262144n, bytes, 0,
    Array.new(U32, 18n, 0)))

def font_read_result(result: File &
  Result<&1, &1, U32 & String, List<&2, U32>>) -> IO(MenuFontPack.Book):
  (file, answer) = result
  match answer:
    case Done{bytes}:
      do IO<MenuFontPack.Book>:
        Unit <- File.close(file)
        IO.pure(MenuFontPack.Book, font_from_bytes(bytes))
    case Fail{_}:
      do IO<MenuFontPack.Book>:
        Unit <- File.close(file)
        Unit <- IO.print_err("Native MenuAA font read failed; using the renderer fallback.")
        IO.pure(MenuFontPack.Book, MenuFontPack.empty())

def font_open_result(result: Result<&1, &1, U32 & String, File>) ->
  IO(MenuFontPack.Book):
  match result:
    case Done{file}:
      do IO<MenuFontPack.Book>:
        bytes : File & Result<&1, &1, U32 & String, List<&2, U32>> <-
          File.read_bytes(file, U32.add(MenuAA.font_byte_cap(), 1))
        font_read_result(bytes)
    case Fail{_}:
      do IO<MenuFontPack.Book>:
        Unit <- IO.print_err("Native MenuAA font unavailable; using the renderer fallback.")
        IO.pure(MenuFontPack.Book, MenuFontPack.empty())

def load_menu_font() -> IO(MenuFontPack.Book):
  do IO<MenuFontPack.Book>:
    opened : Result<&1, &1, U32 & String, File> <-
      File.open(MenuAA.font_path(), "r")
    font_open_result(opened)

def read_journal_file(path: String) -> IO(Read):
  # Escaping can double a maximum payload; this remains a bounded host read.
  read_file_limit(4200000, path)

def text_order(compared: (String & String) & Cmp) -> Bool:
  match compared:
    case ((_, _), order): Cmp.is_eq(order)

def text_eq(a: String, b: String) -> Bool:
  text_order(String.cmp(a, b))

def marker_parts(prefix: String, parts: List<&2, String>) -> Maybe<&2, U32>:
  match parts:
    case head <> sequence <> _:
      Bool.pick(Maybe<&2, U32>, text_eq(head, prefix), U32.read(sequence), None{})
    case _: None{}

def marker_seq(prefix: String, line: String) -> Maybe<&2, U32>:
  marker_parts(prefix, String.split(line, ' '))

def escape_push(+code: U32, +acc: String) -> String:
  Bool.pick(String, U32.is_eq(code, 92),
    SCon{Chr{code}, SCon{Chr{code}, acc}},
    Bool.pick(String, U32.is_eq(code, 10),
      SCon{Chr{110}, SCon{Chr{92}, acc}},
      Bool.pick(String, U32.is_eq(code, 13),
        SCon{Chr{114}, SCon{Chr{92}, acc}}, SCon{Chr{code}, acc})))

def escape_store_go(text: String, +acc: String) -> String:
  match text:
    case SNil{}: String.reverse(acc)
    case SCon{Chr{+code}, tail}:
      escape_store_go(tail, escape_push(code, acc))

def escape_store(text: String) -> String:
  escape_store_go(text, SNil{})

def unescape_push(+code: U32, +acc: String) -> String:
  SCon{Chr{code}, acc}

def unescape_code_value(+code: U32) -> U32:
  Bool.pick(U32, U32.is_eq(code, 110), 10,
    Bool.pick(U32, U32.is_eq(code, 114), 13, code))

def UnescapeStep_escaped(step: UnescapeStep) -> Bool:
  match step:
    case UnescapeStep{escaped, _}: escaped

def UnescapeStep_acc(step: UnescapeStep) -> String:
  match step:
    case UnescapeStep{_, acc}: acc

def unescape_plain_step(slash: Bool, +code: U32,
  +acc: String) -> UnescapeStep:
  match slash:
    case True{}: UnescapeStep{True{}, acc}
    case False{}: UnescapeStep{False{}, unescape_push(code, acc)}

def unescape_go(text: String, escaped: Bool, +acc: String) -> String:
  match text:
    case SNil{}: String.reverse(acc)
    case SCon{Chr{+code}, tail}:
      match escaped:
        case True{}:
          unescape_go(tail, False{}, unescape_push(unescape_code_value(code), acc))
        case False{}:
          +step : UnescapeStep = unescape_plain_step(U32.is_eq(code, 92), code, acc)
          unescape_go(tail, UnescapeStep_escaped(step), UnescapeStep_acc(step))

def unescape_store(text: String) -> String:
  unescape_go(text, False{}, SNil{})

def Journal_valid(journal: Journal) -> Bool:
  match journal:
    case Journal{valid, _, _, _, _}: valid

def Journal_present(journal: Journal) -> Bool:
  match journal:
    case Journal{_, present, _, _, _}: present

def Journal_sequence(journal: Journal) -> U32:
  match journal:
    case Journal{_, _, sequence, _, _}: sequence

def Journal_raw(journal: Journal) -> String:
  match journal:
    case Journal{_, _, _, text, _}: text

def Journal_text(journal: Journal) -> String:
  unescape_store(Journal_raw(journal))

def Journal_error(journal: Journal) -> U32:
  match journal:
    case Journal{_, _, _, _, error}: error

def journal_newer(+a: Journal, +b: Journal) -> Journal:
  +a_valid = Journal_valid(a)
  +b_valid = Journal_valid(b)
  +choose_a = Bool.and(a_valid, Bool.or(Bool.not(b_valid),
    U32.is_ge(Journal_sequence(a), Journal_sequence(b))))
  +choose_b = Bool.and(b_valid, Bool.or(Bool.not(a_valid),
    U32.is_gt(Journal_sequence(b), Journal_sequence(a))))
  Bool.pick(Journal, choose_a, a, Bool.pick(Journal, choose_b, b,
    Bool.pick(Journal, Journal_present(a), a, b)))

def journal_finish(rest: List<&2, String>, best: Journal,
  current: Maybe<&2, Journal>, +sequence: U32,
  recur: List<&2, String> -> Journal -> Maybe<&2, Journal> -> Journal) -> Journal:
  match current:
    case None{}: recur(rest, best, None{})
    case Some{+open}:
      +valid = U32.is_eq(sequence, Journal_sequence(open))
      candidate : Journal = Journal{valid, True{}, sequence, Journal_raw(open), 0}
      recur(rest, journal_newer(best, candidate), None{})

def journal_payload_line(first: Bool, +line: String) -> String:
  match first:
    case False{}: line
    case True{}:
      Bool.pick(String, String.starts_with(line, "~"), String.drop(line, 1n), line)

def prepend_chars(text: String, +acc: String) -> String:
  match text:
    case SNil{}: acc
    case SCon{h, tail}: prepend_chars(tail, SCon{h, acc})

def frame_body(+header: String, +escaped: String, +suffix: String) -> String:
  # Walk large payloads once; repeated String.append would recurse through them.
  +from_suffix = prepend_chars(String.reverse(suffix), SNil{})
  +from_payload = prepend_chars(String.reverse(escaped), from_suffix)
  prepend_chars(String.append("~", String.reverse(header)), from_payload)

def journal_payload(rest: List<&2, String>, best: Journal,
  current: Maybe<&2, Journal>, line: String,
  recur: List<&2, String> -> Journal -> Maybe<&2, Journal> -> Journal) -> Journal:
  match current:
    case None{}: recur(rest, best, None{})
    case Some{+open}:
      +first = String.is_empty(Journal_raw(open))
      +payload = journal_payload_line(first, line)
      continued : Journal = Journal{False{}, True{}, Journal_sequence(open),
        String.append(Journal_raw(open), payload), Journal_error(open)}
      recur(rest, best, Some{continued})

def journal_step_current(line: String, rest: List<&2, String>, best: Journal,
  +open: Journal, ending: Maybe<&2, U32>,
  recur: List<&2, String> -> Journal -> Maybe<&2, Journal> -> Journal) -> Journal:
  match ending:
    case Some{sequence}: journal_finish(rest, best, Some{open}, sequence, recur)
    case None{}: journal_payload(rest, best, Some{open}, line, recur)

def journal_step(line: String, rest: List<&2, String>, best: Journal,
  current: Maybe<&2, Journal>, begin: Maybe<&2, U32>, ending: Maybe<&2, U32>,
  recur: List<&2, String> -> Journal -> Maybe<&2, Journal> -> Journal) -> Journal:
  match current:
    case Some{+open}:
      journal_step_current(line, rest, best, open, ending, recur)
    case None{}:
      match begin:
        case Some{sequence}:
          recur(rest, best, Some{Journal{False{}, True{}, sequence, "", 0}})
        case None{}: recur(rest, best, None{})

@unsafe
def journal_scan(lines: List<&2, String>, best: Journal,
  current: Maybe<&2, Journal>) -> Journal:
  match lines:
    case Nil{}: best
    case +line <> rest:
      journal_step(line, rest, best, current,
        marker_seq("RIFT-NATIVE-BEGIN", line), marker_seq("RIFT-NATIVE-END", line),
        xs => b => c => journal_scan(xs, b, c))

def journal_parse(text: String) -> Journal:
  journal_scan(String.lines(text), Journal{False{}, True{}, 0, "", 0}, None{})

def parsed_journal_choice(valid: Bool, +raw: String, +parsed: Journal) -> Journal:
  match valid:
    case True{}: parsed
    case False{}: Journal{False{}, True{}, 0, raw, 9002}

def parsed_journal(+raw: String, +parsed: Journal) -> Journal:
  parsed_journal_choice(Journal_valid(parsed), raw, parsed)

def read_journal_value(read_value: Read) -> Journal:
  match read_value:
    case Read{+text, ok, code}:
      match ok:
        case True{}:
          match code:
            case 2: Journal{False{}, False{}, 0, "", 0}
            case _: parsed_journal(text, journal_parse(text))
        case False{}: Journal{False{}, True{}, 0, text, code}

def read_journal(path: String) -> IO(Journal):
  do IO<Journal>:
    read_value : Read <- read_journal_file(path)
    IO.pure(Journal, read_journal_value(read_value))

def slot_path(+slot: U32, paths: NativePaths) -> String:
  match slot:
    case 0: save_path(paths)
    case 1: preferences_path(paths)
    case _: recovery_path(paths)

def slot_backup_path(slot: U32, paths: NativePaths) -> String:
  String.append(slot_path(slot, paths), ".b")

def slots_ready(primary: Journal, secondary: Journal) -> Slots:
  Slots{primary, secondary}

def read_slots(+slot: U32, +paths: NativePaths) -> IO(Slots):
  do IO<Slots>:
    primary : Journal <- read_journal(slot_path(slot, paths))
    secondary : Journal <- read_journal(slot_backup_path(slot, paths))
    IO.pure(Slots, slots_ready(primary, secondary))

def Slots_primary(slots: Slots) -> Journal:
  match slots:
    case Slots{primary, _}: primary

def Slots_secondary(slots: Slots) -> Journal:
  match slots:
    case Slots{_, secondary}: secondary

def store_target_path(use_primary: Bool, slot: U32,
  paths: NativePaths) -> String:
  match use_primary:
    case True{}: slot_backup_path(slot, paths)
    case False{}: slot_path(slot, paths)

def store_target(+slot: U32, slots: Slots, paths: NativePaths) -> StoreTarget:
  Slots{+primary, +secondary} = slots
  +newer = journal_newer(primary, secondary)
  +use_primary = Bool.and(Journal_valid(primary), Bool.or(
    Bool.not(Journal_valid(secondary)), U32.is_ge(Journal_sequence(primary), Journal_sequence(secondary))))
  StoreTarget{store_target_path(use_primary, slot, paths),
    U32.add(Journal_sequence(newer), 1)}

def slot_io_error(journal: Journal) -> U32:
  +error = Journal_error(journal)
  Bool.pick(U32, U32.is_eq(error, 9002), 0, error)

def slots_error(+slots: Slots) -> U32:
  U32.max(slot_io_error(Slots_primary(slots)), slot_io_error(Slots_secondary(slots)))

def latest_present(present: Bool, +newest: Journal) -> Read:
  match present:
    case False{}: Read{"", True{}, 2}
    case True{}:
      +stored_error = Journal_error(newest)
      +error = Bool.pick(U32, U32.is_eq(stored_error, 0), 9002, stored_error)
      Read{Journal_raw(newest), False{}, error}

def latest_value(valid: Bool, +newest: Journal) -> Read:
  match valid:
    case True{}: Read{Journal_text(newest), True{}, 0}
    case False{}: latest_present(Journal_present(newest), newest)

def latest_error_choice(no_error: Bool, +text: String, ok: Bool,
  code: U32, error: U32) -> Read:
  match no_error:
    case True{}: Read{text, ok, code}
    case False{}: Read{text, False{}, error}

def latest_error(+value: Read, +error: U32) -> Read:
  match value:
    case Read{+text, ok, code}:
      latest_error_choice(U32.is_eq(error, 0), text, ok, code, error)

def latest_read(+slots: Slots) -> Read:
  +newest = journal_newer(Slots_primary(slots), Slots_secondary(slots))
  +value = latest_value(Journal_valid(newest), newest)
  latest_error(value, slots_error(slots))

def boot_read(slot: U32, paths: NativePaths) -> IO(Read):
  do IO<Read>:
    slots : Slots <- read_slots(slot, paths)
    IO.pure(Read, latest_read(slots))

def boot_files(+paths: NativePaths) -> IO(Read & Read):
  do IO<Read & Read>:
    saved : Read <- boot_read(0, paths)
    preferences : Read <- boot_read(1, paths)
    IO.pure(Read & Read, (saved, preferences))

def request_theme(request: Control.RenderPlan) -> U32:
  match request:
    case Control.RenderPlan{_, _, _, _, _, theme, _, _, _, _, _, _}: theme

def packet_theme(packet: Control.Packet) -> U32:
  match packet:
    case Control.Packet{_, _, _, _, _, request, _, _, _, _, _, _, _}:
      request_theme(request)

def packet_chrome_data(packet: Control.Packet) -> ChromeData.Presentation:
  match packet:
    case Control.Packet{_, _, _, chrome_data, _, _, _, _, _, _, _, _, _}:
      chrome_data

def packet_chrome_plan(packet: Control.Packet) -> ChromePlan.Plan:
  match packet:
    case Control.Packet{_, _, _, _, plan, _, _, _, _, _, _, _, _}:
      plan

def boot_packet(saved: Read, preferences: Read) -> Control.Packet:
  match saved preferences:
    case Read{saved_text, saved_ok, _} Read{prefs_text, prefs_ok, _}:
      Control.boot_reads(saved_text, prefs_text, saved_ok, prefs_ok, 1024, 640)

def boot_state(paths: NativePaths, +packet: Control.Packet,
  plates: Assets.ObservatoryPlates, fonts: MenuFontPack.Book,
  sprites: Maybe<&2, PieceSprites.Pieces>,
  stamp: Nat) -> State:
  +data = packet_chrome_data(packet)
  +plan = packet_chrome_plan(packet)
  +cache = cache_with_assets(empty_cache(fonts, sprites, data, plan),
    packet_theme(packet), plates)
  State{box_frame(packet, cache), paths, None{}, False{}, [], 0, 0, 0, stamp}

def packet_effects(packet: Control.Packet) -> List<&2, T.Effect>:
  match packet:
    case Control.Packet{_, effects, _, _, _, _, _, _, _, _, _, _, _}: effects

def packet_session(packet: Control.Packet) -> Control.Session:
  match packet:
    case Control.Packet{session, _, _, _, _, _, _, _, _, _, _, _, _}: session

def packet_presentation(packet: Control.Packet) -> Control.Presentation:
  match packet:
    case Control.Packet{_, _, _, _, _, _, _, _, _, _, _, _, presentation}: presentation

def store_failure_kind(+slot: U32) -> U32:
  Bool.pick(U32, U32.is_eq(slot, 0), 9003,
    Bool.pick(U32, U32.is_eq(slot, 1), 9004, 9002))

def store_inputs(ok: Bool, slot: U32,
  +inputs: List<&2, T.Input>) -> List<&2, T.Input>:
  match ok:
    case True{}: inputs
    case False{}:
      List.append(&2, T.Input, inputs, [T.PortError{store_failure_kind(slot)}])

def queue_samples(audio_ready: Bool, +samples: List<&2, F32>,
  +pending: List<&2, F32>) -> List<&2, F32>:
  match audio_ready:
    case False{}: []
    case True{}: List.append(&2, F32, pending, samples)

def runtime_samples(+samples: List<&2, F32>, runtime: Runtime) -> Runtime:
  match runtime:
    case Runtime{audio, +audio_ready, pending, inputs, exit}:
      Runtime{audio, audio_ready,
        queue_samples(audio_ready, samples, pending), inputs, exit}

def open_audio_result(result: Result<&1, &1, U32 & String, Audio>,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(Runtime):
  match result:
    case Done{device}:
      IO.pure(Runtime, Runtime{Some{device}, True{}, pending, inputs, exit})
    case Fail{(_, message)}:
      do IO<Runtime>:
        Unit <- IO.print_err(String.append("Native audio unavailable: ", message))
        IO.pure(Runtime, Runtime{None{}, True{}, pending, inputs, exit})

def ensure_audio_state(ready: Bool, audio: Maybe<Audio>,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(Runtime):
  match ready:
    case True{}: IO.pure(Runtime, Runtime{audio, True{}, pending, inputs, exit})
    case False{}:
      match audio:
        case Some{device}:
          IO.pure(Runtime, Runtime{Some{device}, True{}, pending, inputs, exit})
        case None{}:
          do IO<Runtime>:
            opened : Result<&1, &1, U32 & String, Audio> <- Audio.open(48000)
            open_audio_result(opened, pending, inputs, exit)

def ensure_audio(runtime: Runtime) -> IO(Runtime):
  match runtime:
    case Runtime{audio, ready, pending, inputs, exit}:
      ensure_audio_state(ready, audio, pending, inputs, exit)

def close_audio(audio: Maybe<Audio>) -> IO(Unit):
  match audio:
    case None{}: IO.pure(Unit, Unit{})
    case Some{device}: Audio.close(device)

def reopen_file_state(reopen: Bool, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(Runtime):
  match reopen:
    case False{}: IO.pure(Runtime, Runtime{None{}, ready, pending, inputs, exit})
    case True{}:
      do IO<Runtime>:
        opened : Result<&1, &1, U32 & String, Audio> <- Audio.open(48000)
        open_audio_result(opened, pending, inputs, exit)

def read_import_choice(reopen: Bool, empty: Bool, text: String, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  path: String) -> IO(Runtime):
  match empty:
    case True{}:
      do IO<Runtime>:
        Unit <- IO.print_err(String.append(
          "Native import has no file yet; place a record at ",
          String.append(path, " and activate Import again.")))
        reopen_file_state(reopen, ready, pending, inputs, exit)
    case False{}:
      reopen_file_state(reopen, ready, pending,
        List.append(&2, T.Input, inputs, [T.FileText{text}]), exit)

def read_import_result(reopen: Bool, read: Read, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  +path: String) -> IO(Runtime):
  match read:
    case Read{+text, ok, code}:
      match ok:
        case True{}:
          read_import_choice(reopen, String.is_empty(text), text, ready,
            pending, inputs, exit, path)
        case False{}:
          do IO<Runtime>:
            Unit <- IO.print_err(String.append("Native import read failed (OS code ",
              String.append(U32.show(code), ").")))
            reopen_file_state(reopen, ready, pending, inputs, exit)

def store_written(reopen: Bool, slot: U32, result: Write, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(Runtime):
  match result:
    case Write{ok, _}:
      reopen_file_state(reopen, ready, pending, store_inputs(ok, slot, inputs), exit)

def store_target_ready(reopen: Bool, slot: U32, text: String, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  target: StoreTarget) -> IO(Runtime):
  match target:
    case StoreTarget{path, +sequence}:
      +escaped = escape_store(text)
      +header = String.append(String.append("RIFT-NATIVE-BEGIN ", U32.show(sequence)), "\n")
      +suffix = String.append("\nRIFT-NATIVE-END ", String.append(U32.show(sequence), "\n"))
      +body = frame_body(header, escaped, suffix)
      do IO<Runtime>:
        written : Write <- write_file(path, body)
        store_written(reopen, slot, written, ready, pending, inputs, exit)

def store_payload_choice(reopen: Bool, slot: U32, text: String, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  target: StoreTarget, large: Bool) -> IO(Runtime):
  match large:
    case True{}:
      store_written(reopen, slot, Write{False{}, 27}, ready, pending, inputs, exit)
    case False{}:
      store_target_ready(reopen, slot, text, ready, pending, inputs, exit, target)

def store_slots_choice(reopen: Bool, +slot: U32, +text: String, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  slots: Slots, error: U32, bad: Bool, paths: NativePaths) -> IO(Runtime):
  match bad:
    case True{}:
      store_written(reopen, slot, Write{False{}, error}, ready, pending, inputs, exit)
    case False{}:
      +target = store_target(slot, slots, paths)
      store_payload_choice(reopen, slot, text, ready, pending, inputs, exit,
        target, U32.is_gt(U32.from_nat(String.length(text)), 2097152))

def store_slots_ready(reopen: Bool, slot: U32, text: String, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  +slots: Slots, +paths: NativePaths) -> IO(Runtime):
  +error = slots_error(slots)
  store_slots_choice(reopen, slot, text, ready, pending, inputs, exit, slots,
    error, U32.is_ne(error, 0), paths)

def effect_store_file(reopen: Bool, +slot: U32, text: String, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  +paths: NativePaths) -> IO(Runtime):
  do IO<Runtime>:
    slots : Slots <- read_slots(slot, paths)
    store_slots_ready(reopen, slot, text, ready, pending, inputs, exit, slots, paths)

def effect_store(+slot: U32, text: String, runtime: Runtime,
  +paths: NativePaths) -> IO(Runtime):
  match runtime:
    case Runtime{audio, ready, pending, inputs, exit}:
      match audio:
        case None{}:
          effect_store_file(False{}, slot, text, ready, pending, inputs, exit, paths)
        case Some{device}:
          do IO<Runtime>:
            Unit <- Audio.close(device)
            effect_store_file(True{}, slot, text, ready, pending, inputs, exit, paths)

def download_result(reopen: Bool, path: String, result: Write, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(Runtime):
  match result:
    case Write{ok, code}:
      match ok:
        case True{}:
          do IO<Runtime>:
            Unit <- IO.print_err(String.append("Native export saved to ", path))
            reopen_file_state(reopen, ready, pending, inputs, exit)
        case False{}:
          do IO<Runtime>:
            Unit <- IO.print_err(String.append("Native export failed (OS code ",
              String.append(U32.show(code), ").")))
            reopen_file_state(reopen, ready, pending, inputs, exit)

def effect_download_file(reopen: Bool, text: String, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  paths: NativePaths) -> IO(Runtime):
  +path = export_path(paths)
  do IO<Runtime>:
    written : Write <- write_file(path, text)
    download_result(reopen, path, written, ready, pending, inputs, exit)

def effect_download(text: String, runtime: Runtime,
  paths: NativePaths) -> IO(Runtime):
  match runtime:
    case Runtime{audio, ready, pending, inputs, exit}:
      match audio:
        case None{}:
          effect_download_file(False{}, text, ready, pending, inputs, exit, paths)
        case Some{device}:
          do IO<Runtime>:
            Unit <- Audio.close(device)
            effect_download_file(True{}, text, ready, pending, inputs, exit, paths)

# The native window API has no chooser; import reads an explicit file. Audio is
# closed around all file effects and reopened afterwards when a device existed.
def effect_import_file(reopen: Bool, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool,
  paths: NativePaths) -> IO(Runtime):
  +path = import_path(paths)
  do IO<Runtime>:
    read : Read <- read_file(path)
    read_import_result(reopen, read, ready, pending, inputs, exit, path)

def effect_import(runtime: Runtime, paths: NativePaths) -> IO(Runtime):
  match runtime:
    case Runtime{audio, ready, pending, inputs, exit}:
      match audio:
        case None{}:
          effect_import_file(False{}, ready, pending, inputs, exit, paths)
        case Some{device}:
          do IO<Runtime>:
            Unit <- Audio.close(device)
            effect_import_file(True{}, ready, pending, inputs, exit, paths)

def url_notice(reopen: Bool, url: String, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(Runtime):
  do IO<Runtime>:
    Unit <- IO.print_err(String.append("Native OpenUrl is unavailable; open manually: ", url))
    reopen_file_state(reopen, ready, pending, inputs, exit)

def effect_url(url: String, runtime: Runtime) -> IO(Runtime):
  match runtime:
    case Runtime{audio, ready, pending, inputs, exit}:
      match audio:
        case None{}: url_notice(False{}, url, ready, pending, inputs, exit)
        case Some{device}:
          do IO<Runtime>:
            Unit <- Audio.close(device)
            url_notice(True{}, url, ready, pending, inputs, exit)

def effect_sound(notes: List<&2, T.Note>, runtime: Runtime) -> IO(Runtime):
  +samples = Control.audio_samples(notes, 48000)
  IO.pure(Runtime, runtime_samples(samples, runtime))

def runtime_exit(runtime: Runtime) -> Runtime:
  match runtime:
    case Runtime{audio, audio_ready, pending, inputs, _}:
      Runtime{audio, audio_ready, pending, inputs, True{}}

def effect_one(value: T.Effect, runtime: Runtime,
  +paths: NativePaths) -> IO(Runtime):
  match value:
    case T.Store{slot, text}: effect_store(slot, text, runtime, paths)
    case T.Download{_, text}: effect_download(text, runtime, paths)
    case T.PickFile{}: effect_import(runtime, paths)
    case T.Sound{notes}: effect_sound(notes, runtime)
    case T.OpenUrl{url}: effect_url(url, runtime)
    case T.Exit{}: IO.pure(Runtime, runtime_exit(runtime))

@unsafe
def effects_go(effects: List<&2, T.Effect>, runtime: Runtime,
  +paths: NativePaths) -> IO(Runtime):
  match effects:
    case Nil{}: IO.pure(Runtime, runtime)
    case effect_value <> rest:
      do IO<Runtime>:
        next : Runtime <- effect_one(effect_value, runtime, paths)
        effects_go(rest, next, paths)

def split_mono(remaining: Nat, +samples: List<&2, F32>,
  +acc: List<&2, F32>) -> AudioSplit:
  match remaining samples:
    case 0n _: AudioSplit{List.reverse(&2, F32, acc), samples}
    case 1n+rest Nil{}: AudioSplit{List.reverse(&2, F32, acc), []}
    case 1n+rest +sample <> tail:
      split_mono(rest, tail, sample <> sample <> acc)

def pump_written(written: Audio & U32, +tail: List<&2, F32>) -> Pump:
  (next, _) = written
  Pump{Some{next}, tail}

def pump_split(split: AudioSplit, audio: Audio) -> IO(Pump):
  AudioSplit{block, tail} = split
  do IO<Pump>:
    written : Audio & U32 <- Audio.write(audio, block)
    IO.pure(Pump, pump_written(written, tail))

def audio_capacity(+queued: U32) -> U32:
  U32.min(2048, U32.sub(4096, U32.min(4096, queued)))

def pump_write_choice(empty: Bool, no_room: Bool, capacity: U32,
  audio: Audio, +pending: List<&2, F32>) -> IO(Pump):
  match empty:
    case True{}: IO.pure(Pump, Pump{Some{audio}, pending})
    case False{}:
      match no_room:
        case True{}: IO.pure(Pump, Pump{Some{audio}, pending})
        case False{}: pump_split(split_mono(U32.to_nat(capacity), pending, []), audio)

def pump_after_query(audio: Audio, +pending: List<&2, F32>, queued: U32) -> IO(Pump):
  +empty = List.is_empty(&2, F32, pending)
  +capacity = audio_capacity(queued)
  pump_write_choice(empty, U32.is_eq(capacity, 0), capacity, audio, pending)

def pump_queried(queried: Audio & U32, +pending: List<&2, F32>) -> IO(Pump):
  (next, queued) = queried
  pump_after_query(next, pending, queued)

@unsafe
def pump_audio(audio: Maybe<Audio>, +pending: List<&2, F32>) -> IO(Pump):
  match audio:
    case None{}: IO.pure(Pump, Pump{None{}, []})
    case Some{device}:
      do IO<Pump>:
        queried : Audio & U32 <- Audio.write(device, [])
        pump_queried(queried, pending)

def runtime_pumped(pump: Pump, ready: Bool,
  inputs: List<&2, T.Input>, exit: Bool) -> Runtime:
  match pump:
    case Pump{audio, pending}: Runtime{audio, ready, pending, inputs, exit}

@unsafe
def pump_runtime(runtime: Runtime) -> IO(Runtime):
  match runtime:
    case Runtime{audio, audio_ready, pending, inputs, exit}:
      do IO<Runtime>:
        pumped : Pump <- pump_audio(audio, pending)
        IO.pure(Runtime, runtime_pumped(pumped, audio_ready, inputs, exit))

def cache_needs_assets(theme: U32, cache: Cache) -> Bool:
  match cache:
    case Cache{_, _, _, _, loaded, cached_theme, _, _, _, _, _, _, _, _, _, _, _, _, _}:
      Bool.not(Bool.and(loaded, U32.is_eq(cached_theme, theme)))

def asset_frame_update(frame_box: List<&2, NativeFrame>, theme: U32,
  plates: Assets.ObservatoryPlates) -> AssetFrame:
  match frame_box:
    case NativeFrame{+packet, cache} <> Nil{}:
      AssetFrame{True{}, box_frame(packet, cache_with_assets(cache, theme, plates))}
    case _: AssetFrame{False{}, []}

def asset_step_without_audio(frame: AssetFrame, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(AssetStep):
  match frame:
    case AssetFrame{valid, frame_box}:
      IO.pure(AssetStep, AssetStep{valid, frame_box,
        Runtime{None{}, ready, pending, inputs, exit}})

def asset_step_with_audio(frame: AssetFrame, +pending: List<&2, F32>,
  +inputs: List<&2, T.Input>, exit: Bool) -> IO(AssetStep):
  match frame:
    case AssetFrame{valid, frame_box}:
      do IO<AssetStep>:
        opened : Result<&1, &1, U32 & String, Audio> <- Audio.open(48000)
        runtime : Runtime <- open_audio_result(opened, pending, inputs, exit)
        IO.pure(AssetStep, AssetStep{valid, frame_box, runtime})

def asset_step_reopen(reopen: Bool, frame: AssetFrame, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(AssetStep):
  match reopen:
    case False{}:
      asset_step_without_audio(frame, ready, pending, inputs, exit)
    case True{}:
      asset_step_with_audio(frame, pending, inputs, exit)

def asset_step_loaded(reopen: Bool, theme: U32,
  +frame_box: List<&2, NativeFrame>, plates: Assets.ObservatoryPlates,
  ready: Bool, +pending: List<&2, F32>, +inputs: List<&2, T.Input>,
  exit: Bool) -> IO(AssetStep):
  asset_step_reopen(reopen, asset_frame_update(frame_box, theme, plates),
    ready, pending, inputs, exit)

def asset_load_closed(reopen: Bool, +theme: U32,
  +frame_box: List<&2, NativeFrame>, ready: Bool,
  +pending: List<&2, F32>, +inputs: List<&2, T.Input>, exit: Bool) -> IO(AssetStep):
  do IO<AssetStep>:
    plates : Assets.ObservatoryPlates <- load_theme_assets(theme)
    asset_step_loaded(reopen, theme, frame_box, plates, ready,
      pending, inputs, exit)

def asset_load_runtime(theme: U32, +frame_box: List<&2, NativeFrame>,
  runtime: Runtime) -> IO(AssetStep):
  match runtime:
    case Runtime{audio, ready, pending, inputs, exit}:
      match audio:
        case None{}:
          asset_load_closed(False{}, theme, frame_box, ready, pending, inputs, exit)
        case Some{device}:
          do IO<AssetStep>:
            Unit <- Audio.close(device)
            asset_load_closed(True{}, theme, frame_box, ready, pending, inputs, exit)

def ensure_assets_choice(needs: Bool, theme: U32,
  +frame_box: List<&2, NativeFrame>, runtime: Runtime) -> IO(AssetStep):
  match needs:
    case False{}: IO.pure(AssetStep, AssetStep{True{}, frame_box, runtime})
    case True{}: asset_load_runtime(theme, frame_box, runtime)

def ensure_assets(+frame_box: List<&2, NativeFrame>, runtime: Runtime) -> IO(AssetStep):
  match frame_box:
    case NativeFrame{+packet, cache} <> Nil{}:
      +theme = packet_theme(packet)
      +needs = cache_needs_assets(theme, cache)
      ensure_assets_choice(needs, theme, frame_box, runtime)
    case _: IO.pure(AssetStep, AssetStep{False{}, frame_box, runtime})

def asset_frame_failure(runtime: Runtime) -> IO(Maybe<State>):
  match runtime:
    case Runtime{audio, _, _, _, _}:
      do IO<Maybe<State>>:
        Unit <- IO.print_err("Native asset update invariant failed: expected a singleton frame box.")
        Unit <- close_audio(audio)
        IO.pure(Maybe<State>, None{})

def tick_after_asset_pump(next: TickNext,
  frame_box: List<&2, NativeFrame>, runtime: Runtime) -> IO(Maybe<State>):
  match next runtime:
    case TickNext{paths, stamp, alt_mask, ctrl_mask, shift_mask, now}
      Runtime{audio, ready, pending, _, _}:
      IO.pure(Maybe<State>, Some{State{frame_box, paths, audio, ready,
        pending, alt_mask, ctrl_mask, shift_mask, now}})

def tick_after_assets_ready(next: TickNext,
  frame_box: List<&2, NativeFrame>, runtime: Runtime) -> IO(Maybe<State>):
  do IO<Maybe<State>>:
    pumped : Runtime <- pump_runtime(runtime)
    tick_after_asset_pump(next, frame_box, pumped)

def tick_after_assets_choice(valid: Bool, next: TickNext,
  frame_box: List<&2, NativeFrame>, runtime: Runtime) -> IO(Maybe<State>):
  match valid:
    case True{}: tick_after_assets_ready(next, frame_box, runtime)
    case False{}: asset_frame_failure(runtime)

def tick_after_assets(next: TickNext, step: AssetStep) -> IO(Maybe<State>):
  match step:
    case AssetStep{valid, frame_box, runtime}:
      tick_after_assets_choice(valid, next, frame_box, runtime)

def make_tick_next(paths: NativePaths, stamp: Nat, alt_mask: U32,
  ctrl_mask: U32, shift_mask: U32, now: Nat) -> TickNext:
  TickNext{paths, stamp, alt_mask, ctrl_mask, shift_mask, now}

def tick_continue(native_inputs: List<&2, T.Input>, next_alt: U32,
  next_ctrl: U32, next_shift: U32, +packet: Control.Packet, cache: Cache,
  paths: NativePaths, stamp: Nat, runtime: Runtime, +now: Nat) -> IO(Maybe<State>):
  match runtime:
    case Runtime{audio, ready, pending, +effect_inputs, _}:
      +elapsed = U32.min(240, U32.from_nat(Nat.sub(now, stamp)))
      +with_effects = List.append(&2, T.Input, effect_inputs, native_inputs)
      +tick_inputs = List.append(&2, T.Input, with_effects, [T.Tick{elapsed}])
      +next_packet = Control.dispatch_at(tick_inputs,
        packet_presentation(packet), packet_session(packet))
      +next_frame_box = box_frame(next_packet, cache)
      +next_tick = make_tick_next(paths, stamp, next_alt, next_ctrl,
        next_shift, now)
      do IO<Maybe<State>>:
        assets : AssetStep <- ensure_assets(next_frame_box,
          Runtime{audio, ready, pending, effect_inputs, False{}})
        tick_after_assets(next_tick, assets)

def tick_finish_choice(closed: Bool, exit: Bool, inputs: List<&2, T.Input>,
  next_alt: U32, next_ctrl: U32, next_shift: U32, packet: Control.Packet,
  cache: Cache, paths: NativePaths, stamp: Nat, audio: Maybe<Audio>,
  ready: Bool, pending: List<&2, F32>, effect_inputs: List<&2, T.Input>,
  now: Nat) -> IO(Maybe<State>):
  match closed exit:
    case True{} _:
      do IO<Maybe<State>>:
        Unit <- close_audio(audio)
        IO.pure(Maybe<State>, None{})
    case False{} True{}:
      do IO<Maybe<State>>:
        Unit <- close_audio(audio)
        IO.pure(Maybe<State>, None{})
    case False{} False{}:
      tick_continue(inputs, next_alt, next_ctrl, next_shift, packet, cache,
        paths, stamp, Runtime{audio, ready, pending, effect_inputs, False{}}, now)

def tick_finish(batch: Batch, packet: Control.Packet,
  cache: Cache, paths: NativePaths, stamp: Nat,
  runtime: Runtime, now: Nat) -> IO(Maybe<State>):
  match batch runtime:
    case Batch{inputs, next_alt, next_ctrl, next_shift, closed}
      Runtime{audio, ready, pending, effect_inputs, exit}:
      tick_finish_choice(closed, exit, inputs, next_alt, next_ctrl, next_shift,
        packet, cache, paths, stamp, audio, ready, pending, effect_inputs, now)

def frame_box_valid(frame_box: List<&2, NativeFrame>) -> Bool:
  match frame_box:
    case NativeFrame{_, _} <> Nil{}: True{}
    case _: False{}

def frame_box_effects(frame_box: List<&2, NativeFrame>) -> List<&2, T.Effect>:
  match frame_box:
    case NativeFrame{packet, _} <> Nil{}: packet_effects(packet)
    case _: []

def invalid_frame(runtime: Runtime) -> IO(Maybe<State>):
  match runtime:
    case Runtime{audio, _, _, _, _}:
      do IO<Maybe<State>>:
        Unit <- IO.print_err("Native frame invariant failed: expected a singleton frame box.")
        Unit <- close_audio(audio)
        IO.pure(Maybe<State>, None{})

def tick_after_effects(frame_box: List<&2, NativeFrame>, batch: Batch,
  paths: NativePaths, stamp: Nat, runtime: Runtime, now: Nat) -> IO(Maybe<State>):
  match frame_box:
    case NativeFrame{+packet, cache} <> Nil{}:
      tick_finish(batch, packet, cache, paths, stamp, runtime, now)
    case _: invalid_frame(runtime)

@unsafe
def tick_valid_frame(+frame_box: List<&2, NativeFrame>, batch: Batch,
  +paths: NativePaths, stamp: Nat, runtime: Runtime) -> IO(Maybe<State>):
  +effects = frame_box_effects(frame_box)
  do IO<Maybe<State>>:
    ready : Runtime <- ensure_audio(runtime)
    effected : Runtime <- effects_go(effects, ready, paths)
    now : Nat <- IO.now()
    tick_after_effects(frame_box, batch, paths, stamp, effected, now)

@unsafe
def tick_frame(valid: Bool, +frame_box: List<&2, NativeFrame>, batch: Batch,
  paths: NativePaths, stamp: Nat, runtime: Runtime) -> IO(Maybe<State>):
  match valid:
    case True{}: tick_valid_frame(frame_box, batch, paths, stamp, runtime)
    case False{}: invalid_frame(runtime)

@unsafe
def tick(native_events: List<Event>, state: State) -> IO(Maybe<State>):
  match state:
    case State{+frame_box, +paths, audio, audio_ready, audio_pending,
      alt_mask, ctrl_mask, shift_mask, stamp}:
      +batch = events(native_events, alt_mask, ctrl_mask, shift_mask)
      +runtime = Runtime{audio, audio_ready, audio_pending, [], False{}}
      tick_frame(frame_box_valid(frame_box), frame_box, batch, paths, stamp, runtime)

def start_asset_app(paths: NativePaths, +packet: Control.Packet,
  theme: U32, stamp: Nat) -> IO(Unit):
  do IO<Unit>:
    plates : Assets.ObservatoryPlates <- load_theme_assets(theme)
    fonts : MenuFontPack.Book <- load_menu_font()
    sprites : Maybe<&2, PieceSprites.Pieces> <- load_native_sprites()
    App.run(~State, ~App{view, tick}, "Rift Chess Bend2", 1024, 640,
      boot_state(paths, packet, plates, fonts, sprites, stamp))

def start_app(paths: NativePaths, saved: Read, preferences: Read) -> IO(Unit):
  +packet = boot_packet(saved, preferences)
  +theme = packet_theme(packet)
  do IO<Unit>:
    stamp : Nat <- IO.now()
    start_asset_app(paths, packet, theme, stamp)

def start_app_reads(paths: NativePaths, reads: Read & Read) -> IO(Unit):
  match reads:
    case (saved, preferences): start_app(paths, saved, preferences)

def read_boot(+paths: NativePaths) -> IO(Unit):
  do IO<Unit>:
    reads : Read & Read <- boot_files(paths)
    start_app_reads(paths, reads)

def with_environment(directory: Result<&1, &1, U32 & String, String>,
  home: Result<&1, &1, U32 & String, String>) -> IO(Unit):
  read_boot(paths_from_environment(directory, home))

def main() -> IO(Unit):
  do IO<Unit>:
    directory : Result<&1, &1, U32 & String, String> <- IO.get_env("RIFT_CHESS_DATA_DIR")
    home : Result<&1, &1, U32 & String, String> <- IO.get_env("HOME")
    with_environment(directory, home)
