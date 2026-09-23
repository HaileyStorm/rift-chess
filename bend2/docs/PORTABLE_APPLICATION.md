# One Bend application, two IO adapters

`Application.bend` and `ui/Program.bend` own the game. Menus, responsive layout,
bitmap text, hit testing, selection, camera policy, animation, opponent choices,
command validation, JSON records, incremental replay, preferences and synthesized
audio samples are Bend source. `View.bend` paints the entire screen as an immutable
image tree. No HTML controls provide the visible game interface.

The browser compiles that source to JavaScript. The remaining handwritten
TypeScript under `platform/browser` is an IO adapter: it delivers typed events,
copies image leaves into a Canvas buffer, plays Bend PCM through Web Audio, reads
and writes storage, and opens user-requested files/downloads. Hidden accessibility
buttons mirror labels, bounds and enabled states supplied by Bend. They send the
same control IDs back to Bend; they cannot choose a chess transition.

The pixel port retains its previous immutable image and CPU buffer. Identical
subtrees reuse already copied pixels; changed leaves copy their Bend-supplied
colors. Every transfer receives a fresh buffer, keeping detached browser buffers
away from the cache. Dimensions and image extent changes reset it. This is generic
image transport, with no rules, coordinates, sprites or drawing decisions.

The adapter preserves the presentation used by each pointer event. Bend picks
against that displayed position and camera and checks its revision. Consecutive
pointer moves may be coalesced, while presses, releases and accepted commands stay
ordered. Every completed frame is displayed even when another event is queued.
Ctrl/Cmd-modified keys and Alt-letter combinations do not invoke game shortcuts.
Alt-arrows retain their camera function. Right/Alt drag moves the board
with the pointer; releasing saves the camera preference once.

Static scenery, UI chrome and settled board ground are cached in Bend. Dragging
uses a cheaper ground pass, and aligned image placement reuses large subtrees.
Returning to rest restores full ground detail. The Front/Overhead indication is
invalidated when its state changes. A click on the selected piece or platform
clears the selection. Missing platforms contribute no filled geometry, including
when a possible Shift destination is outlined.

`Native.bend` connects the graphical application to the pinned Base Window,
Audio and File effects, but its complete C emission exceeded the bounded local
compiler run. `NativeCLI.bend` is a smaller browser-independent Bend entry point
over the same v2 kernel and record codec. It uses Base argument and File effects,
renders an ASCII board, and can emit portable C. Its command-line UI is a distinct
presentation from the Bend pixel screen. See `NATIVE.md` and `NATIVE_CLI.md` for
the exact export, execution and audio evidence boundaries.

## Records and interruption

Record parsing has a 2 MiB boundary, followed by schema validation and the existing
20,000-command bound. File adapters check byte size before reading. The Bend codec
also bounds decoded text before parsing. A legal record is validated incrementally:
at most one match command per application update, even if the update contains
several timer events. The current good game stays installed while the candidate
is checked. New Match cancels validation; another Import replaces it. Only the
complete accepted record becomes the game and is persisted. Invalid input is
kept for recovery. These are availability and persistence boundaries, separate
from the chess Laws.

One individual rule evaluation still has its own execution cost. Upfront parsing
is bounded but synchronous. The scheduler does not claim instant import of a
maximum-size history or real-time native audio/display behavior.

The quiet counter is visible in Prompt and Auto modes. Prompt mode gives each
side one nonmodal suggestion per uninterrupted episode at or above 100; play
continues until both sides agree. A reset below 100 starts a new episode. Loading
folds this reminder state through the accepted command history, so reopening the
same record does not repeat historical notifications. No reminder flags are
trusted from JSON.

## Reuse and proof boundaries

`lib/graphics` contains only Base-dependent pixel, rectangle, quad, orthographic,
composition and font modules. Its own Laws, Proofs, tests, examples, license and
verification manifest live there. Chess coordinates, piece art, board topology,
camera limits and game animation stay in `graphics`. Generic synthesis is in
`lib/audio`; platform device ownership stays in the adapters.

The original `graphics/Pixel.bend`, its proofs and the v1 rule files are retained
as immutable historical evidence. Runtime graphics imports use the byte-identical
copies inside the library. Historical DOM browser harnesses are explicitly marked
under `tests/historical`; current rendered interaction is exercised by
`tests/native-browser.mjs`.

Closed source proofs, finite pixel/reference checks, rendered browser interaction,
portable C emission, native execution and human aesthetic acceptance are distinct.
The compiler, generated runtimes and platform IO remain trusted components. The
JavaScript target runs Bend fork/join expressions sequentially; a worker keeps the
UI responsive but is not evidence of native parallel speed.
