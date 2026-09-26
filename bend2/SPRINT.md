# Rift Chess — isolated Bend2 sprint

Owner request: publish the accepted TypeScript game, then try a separate Bend2
adaptation through documentation, cautious laws, proofs, a focused pixel graphics
library, playable game, testing and iteration. Do not replace the released game
until this experiment proves itself. The owner waived prior approval of the initial
laws while asleep; this does not authorize quietly weakening them later.

The existing game is published as 1.2.1. The Bend adaptation was migrated from
`codex/bend2-adaptation` into the main checkout on `codex/visual-overhaul` under
`bend2/`. The existing application and reference remain comparison inputs, not
alternative runtime code for the Bend game.

## Sequence and completion requirements

1. Gather primary docs/examples, pin the toolchain, execute language/proof probes,
   and write a comprehensive local guide. **Complete; probes passed.**
2. Brainstorm and review laws in plain English. Freeze semantic specification,
   formal laws and normative dependencies with hashes and a versioned decision.
3. Implement the small pure rules kernel needed to make those laws meaningful and
   prove them. A playable UI comes later. Reject TODOs, unsafe assumptions and
   foreign dependencies in the proof cone. Test that a deliberate violation fails.
4. Build an MVP pixel engine: pure immutable image/scene construction, deterministic
   picking and clipping, a thin host blitter, and carefully balanced parallel work.
5. Compose the actual game, including ordinary moves, tile shifts, special moves,
   local play/opponent, clear selection, animation, sound and persistence/replay.
6. Build a static browser bundle; compare rules to reference fixtures; play through
   the actual rendered UI; inspect frames and iterate. Preserve failures and honest
   limits. Commit/push the separate branch and provide its own preview/artifacts.

## Parallelism contract

Agent work is bounded by file ownership. Runtime parallelism is a separate design:
independent immutable subtrees/tiles and balanced evaluation branches may fork/join.
Input ordering, state transitions, host buffer writes and presentation remain
serial. Never use unsafe Array aliases or shared mutable pixel buffers. JS executes
sequentially; native parallel performance requires separate evidence.

## Law change discipline

Draft brainstorming is not a law. Once `LAWS_V1.md`, `LAWS.bend` and their normative
dependencies are frozen, build/proof scripts verify their hashes. A change requires
a recorded counterexample or precise defect, a plain-English rationale, an exact
semantic diff, independent review, and a preserved old version. Fix implementation
or proofs first. Never weaken a law merely because a proof is difficult. The
amendment gate is part of the build, not just an instruction in prose.

## Historical checkpoint: initial hybrid preview

Documentation, rules, proofs and pixel library complete. Core and pixel semantic
v1 manifests are frozen; all 13 core/11 pixel laws, six negative mutations,
14-position/223-successor conformance, 33 match checks and pixel tests pass.
The isolated browser game is implemented and published separately at
https://haileystorm.github.io/rift-chess-bend2/.
Rendered pointer moves for both sides, Shift, undo, reload, capture, underpromotion,
draw/resignation recovery, local bot, rapid replay invalidation, renderer recovery,
malformed-save preservation, cold offline play and mobile/menu layout pass.
The public build's seven assets match their local hashes. All ten hosted browser
scenario groups pass with no page/console errors, including cold offline play and
coexistence with the original game's service worker. Source is pushed on
`codex/bend2-adaptation`; the deployment repository contains only static output.
The requested sprint is complete; receipts and limitations are in
`docs/VERIFICATION.md`. The original 1.2.1 deployment is unchanged.
No native Bend CPU/GPU benchmark or owner visual acceptance is claimed.

## Historical request: complete portable Bend application

The completed release above is historical evidence for the initial hybrid host.
The owner's expanded acceptance request was to move all application UI,
font rendering, input policy, audio synthesis and persistence codec into Bend;
retain only generic browser IO transport; attempt the same application through
native Bend Window/Audio/File effects; repair drag responsiveness/direction and
selection toggling. Keep reusable graphics and their laws/proofs in `lib/graphics`.

The final outcome and its exact native GUI limit are recorded under “Whole Bend
application release” below. Original frozen v1 files remain immutable provenance.

## Retained material and boundaries

The original TypeScript application remains the production game and its reference
fixtures remain an independent comparison input. The early law brainstorm is
design history, not a second normative contract. Failed runs, temporary probes
and the rejected nested-site staging copy remain in ignored local artifacts;
canonical positive receipts are checked in. No original runtime code is used by
the Bend browser app. Future multiplayer, native performance work and a Bend
desktop package are separate extensions, not hidden prerequisites for this sprint.

## Follow-up: camera and open gaps

The owner reported the fixed isometric view and solid-looking missing platforms.
The follow-up replaces fixed projection with a shared Bend camera for drawing and
picking, adds visible orbit/tilt/zoom controls and an overhead preset, and omits
all missing-platform geometry. Hover and Shift feedback use hollow outlines.
Frozen laws and their normative dependencies remain byte-for-byte unchanged.

Local projection/picking checks pass (2,304), and 48 rendered-ground cases pass
4,640 checks including interior gap masks. Original capture, promotion, bot,
save/recovery and offline scenarios pass. The focused browser check covers
rotated pointer moves, Shift, persistence, wheel behavior and mobile controls;
review also prompted click/animation timing regressions. The dedicated public
preview passes all seven camera scenario groups. Every live asset matches the
clean build, and an old offline profile survives an explicit refresh, a resumed
move and a cold-offline Undo. Source and deployment are pushed; this follow-up is
complete. Existing open tabs should be refreshed to load the new controls.

## Whole Bend application release

The camera release above is historical. The expanded whole-application sprint
is published separately at https://haileystorm.github.io/rift-chess-bend2/.
The browser UI, bitmap text, input policy, replay, PCM and game are now Bend;
the reusable graphics package and its own Laws/Proofs are separated and frozen.
The final v2 semantic manifest closes 134 named laws, including independent
canonical membership/order/uniqueness, both-color ordinary and Rift rules,
move/Undo history, either-side controls and adjudication. Six mutations reject
after positive controls pass. Its immutable readiness and independent review
receipts are in `docs/evidence/laws-v2/`.

The final local rendered run at `.artifacts/bend2/native-ui/whole-app-copy-final/`
passes 17 groups: both-color moves, off-turn choices, capture/promotion, Shift,
selection toggles, animation, PCM audio, hotseat Undo consent, bot play, offline
use, corrupted/transient storage recovery, incremental import and mobile
destination overflow. The inspected actor chooser and selected piece are legible.
Incremental generic pixel transport removes a measured 32–44 ms full-blit cost.

The graphical Base Window/Audio/File entry point checks as source but exceeded
two bounded 600-second C emitter attempts. A separate text Bend CLI over the
same v2 kernel and record codec emits browser-independent C. Its pure command
tests pass; native binary execution is not claimed. The pinned JS Base File/IO
effects require POSIX libc and cannot run on this Windows host; available WSL
has no C compiler. The clean browser build, source-bound C export, exact live
hashes, all 17 hosted scenario groups and a returning old-profile offline
upgrade pass. The source branch and Pages repository are pushed; receipts are
in `docs/evidence/whole-app-v2/`. The original published game is unchanged.

## Stage-two main-checkout release

The migrated controller is split into Bend `State`, `Records`, `Commands`,
`Actions` and the `Program` facade. The local stage-two matrix uses real Chrome
canvas input, compares committed records and positions with the independent
TypeScript reference, and captures whole frames, regions and detail crops. All
18 scenarios and 787 checks passed on the Bend 2.0.26 browser asset version
`361b9895746876a71757`, with zero recorded defects; the
[`stage2-local` receipt](docs/evidence/stage2-local/receipt.json) preserves the
full ignored-run hash and representative inspected frames.

Amendment 004 records a narrow Base foreign-effect path adapter in the frozen
loader and expands the mutation receipt to bind every frozen v2 input. It was
independently reviewed after v1/v2 proofs, six positive/negative mutation
controls, the graphics-library checks and a draft build passed. The non-draft
freeze and browser build then passed without changing any rule law or proof.

The same asset version is hosted at the separate Bend preview from clean source
`78287a12b6b1098657096864b5193420789c249d` and Pages commit
`de4d45eea7c05e433df27392d4508217340d379f`. All 18 hosted rendered
scenarios and 787 checks passed with zero recorded defects. The live browser
assets, matching CLI C file and unchanged original-game baseline assets have
exact [publication hashes](docs/evidence/stage2-hosted/publication.json); the
[hosted receipt](docs/evidence/stage2-hosted/receipt.json) binds the full run.
An older three-command record also replayed on the hosted build, accepted Undo
through the actual canvas and survived a cold offline reload in an isolated
profile; this is record compatibility rather than an old service-worker upgrade.
Measured p95 post-move tick work was 608 ms locally and 668 ms hosted; local
bot reply medians were about 721 ms for White and 542 ms for Black. Native
binary execution, parallel performance, broader-device coverage and owner
visual acceptance remain unverified.

## Current checkpoint: Bend 2.0.27, native CLI and graphics v2 overhaul

The paragraphs above are historical checkpoints. Amendment 005 updates the
reviewed compiler pin to Bend 2.0.27 without altering frozen chess semantics;
v1/v2 proofs, conformance, six mutation controls, graphics v1 verification and
the non-draft browser build passed. The next presentation is still a draft in
two reusable packages: generic raster/text/material primitives under
`lib/graphics/v2/`, and 8×8 masks, tile materials and projected-grid rendering
under `lib/grid8/`. Their own colocated Laws/Proofs and finite tests must pass
final review before adoption. The draft checker currently closes 15 generic
graphics and eight grid laws; this does not prove general F32 pixel semantics.
The scenes have improved but have not met the requested WOW quality. Settled
construction and real browser responsiveness still need work. The huge Bend
UI/UX overhaul and automatic detail integration are in progress, not an
accepted release.

The [2.0.27 native CLI receipt](docs/evidence/native-cli-linux-2-0-27/receipt.json)
records actual x86-64 Linux ELF compilation in WSL and a file-backed match
through both-color moves, Undo and agreed draw; terminal `moves` lists no IDs.
This satisfies a browser-independent Bend CPU/File/IO binary checkpoint, not
native graphical acceptance. The full `Native.bend` C emission instead failed
with `an arity over 255`. Source-only boxes have cleared the Native and New
Match joins in a disposable compiler diagnostic; the Program event-loop fix is
under focused tests and has not yet emitted graphical C. The
browser transport now defaults to measured raw pixel transfer, and accepted
position-preserving commands reuse legal IDs without changing the frozen
kernel. Both changes passed focused real-browser/differential checks; broader
visual/performance acceptance and publication remain ahead.

## Downstream compiler patch checkpoint and resumed presentation work

Commit `b5bd2f5` carries three separate source patches against the clean
2.0.27 pin under `toolchain-patches/`. Required 001 diagnoses exact C arity
owners/captures; required 002 reports checked layout and structural fork
interfaces in a local-only read-only CLI mode. Their combined disposable stack
passed byte-identical successful C/JS emission and an exact 256-word failure.
Optional 003 boxes only oversized live join captures through Bend's existing
box representation. A single final 001+002+003 revision passed nine finite
fixture checks; eight Linux C binaries matched JS at one and four threads,
while a raw-return overflow still rejected. Independent review found no
confirmed CPU semantic defect, but 003 remains experimental and is not in the
default wrapper. No GPU or general affine-ownership proof is claimed.

The full graphical `Native.bend` C emission on that optional stack timed out
after 480 seconds with no C output. A later diagnostic on the clean pin cleared
the Program event-loop arity cluster after a source-only cursor refactor and
identified `Application.boot_events` at 256 words. The boot join has a narrow
source rewrite; a new C diagnostic and graphical binary remain pending. The
existing WSL native CLI ELF remains a distinct, successful browser-independent
checkpoint. WSLg and Clang 18 are present; X11/ALSA development headers and
linker files are not yet installed.

Graphics v2 and grid8 resumed after those compiler patches. Their 15+8 Laws
and Proofs remain DRAFT and separate by package. Two private raster prototypes
were pixel-equivalent in finite JS checks but failed performance gates: a
fused six-face pass was about 2.4–2.7× slower at 512/1024, and naive aligned
bins were near parity. Neither changed the public API or contracts. The next
descriptor-bucketed trial and retained board/pointer layers are in progress.
New game art and chrome source-check separately. The oblique ground/aperture
finite checks pass, and a retained-scene hover-only JS pass measured about
6 ms p90; a full scene rebuild is still above 100 ms. The modular browser
build, actual rendered play, auto-detail integration, publication and owner
visual acceptance remain open.

The later [native Window smoke](docs/evidence/native-gui-smoke/receipt.json)
closes a narrower infrastructure gate: pinned Bend emitted C, WSL Clang 18
built an X11 ELF, and WSLg displayed its exact 256×256 Bend pixel frame before
a clean WM close. Only `libx11-dev` and its seven dependencies were installed;
no packages were upgraded. This is **not** the full Rift Chess graphical
binary, which remains blocked on its much larger C emission and later
X11/ALSA build.

For the browser overhaul, a slim Bend `ApplicationControl` now owns input,
presented picking, cache invalidation, effects and render requests. It
source-checks in ~28 s without importing the heavy board/chrome painters.
Three separately emitted Bend JS modules (controller, game scene, chrome)
have source-bound cache manifests; the generic worker executes the Bend-authored
requests and carries immutable `Data`/`Image` values. A small cross-book ABI
test retains value and Image identity; its result is finite JS evidence, not
an affine or browser proof. Controller boot/hover/selection/camera/inert-tick
render-plan checks pass, including a cached hover that avoids ground/piece/
chrome rebuild. The separately rendered chrome passed a 16-case menu/portrait/
2× hit matrix, but integrated browser play and visual acceptance remain open.

## Draft modular browser and native iteration (unreleased)

The source-bound Bend controller, board scene and chrome raster emitted as three
separate JS books and produced draft local asset version
`51dbb8eaa67c5ad3d169` at `127.0.0.1:4185`. This is **not** the hosted
preview. Six baseline and ten extended real-Chrome scenario groups passed on
that exact version, with no page/console errors: both-side play and Undo
consent, selection toggling, Shift, real import, capture, knight
underpromotion, finite PCM reaching Web Audio, persistence and cold offline
play. The ignored receipts are under `.artifacts/bend2/v2-preview/scenarios/`.
The host sent a real eight-frame timing window into the pure Bend automatic
detail policy; its 10,240 finite state/probe checks pass. The observed worker
p90 was far over the policy's enhanced-tier budget, so the browser correctly
retained standard detail; this is not GPU or high-tier acceptance.

Moving the board embed onto quadtree-aligned layout coordinates reduced
measured cached composition from about 100–170 ms to 1–2 ms in local Chrome.
Actual cached pointer frames are around 5–32 ms; camera frames still rebuild
ground and piece proxies and sometimes chrome at much higher cost. A subsequent
controller source revision defers chrome reraster during orbit, while game-local
256px preview and chrome shell/overlay splits are under separate source/render
checks and have **not** passed a combined browser run. The updated art makes
the observatory visible in both themes, but remains below the owner's WOW
visual target. Board-free backdrop concepts and a separate Bend raw-RGB asset
codec are experimental, not shipped.

Graphics v2 has 18 checker-green **DRAFT** core proofs and eight grid8 proofs.
A Texture pool-top revision passed independent structure/pixel checks and native
Clang18 output equality, but an ext4-local WSL comparison found its 64-branch
CPU path slower than true serial at 1/4/8 threads. The proposed CPU convenience
API was removed from the DRAFT library; the negative benchmark remains
reproducible. Object-anchored AffineGrain material and its two new DRAFT
endpoint proofs await source/finite/performance checks. No GPU timing or Linux
receiver grant exists yet.

The pinned Bend `NativeSmoke.bend` did emit C, build a WSLg X11 ELF, show its
256×256 pixel window, and exit cleanly. The full Rift Chess `NativeV2.bend`
graphical entrypoint remains a source draft: its native effect journal,
shell/motion cache and Audio/File affine path require checks, C emission,
linking and actual rendered interaction. That smoke must not be represented as
the full native game binary. Publication of this overhaul waits for a new
source-bound build, visual review, interaction/performance regression and
hosted asset hash verification.

### Subsequent local visual gate (still unreleased)

The refreshed `d737cff5feedbd8d46ee` local browser draft passed ten extended
real-Chrome scenario groups (13 screenshots, no page errors), including both
sides, cold offline play, PCM, Undo consent, Shift, capture and underpromotion.
It also exposed unmistakable visual defects: desktop actions/history/camera
labels overlap, Settings' narrow cards collide, portrait text and controls
overlap, and the small flat chess tokens do not match the observatory premise.
The owner rejected the five reviewed images as far short of WOW; this draft is
**not** a visual acceptance or publication candidate.

Two preserved 1254px board-free observatory plates now have deterministic
512px RGA1 derivatives, source/runtime hashes and a separate reusable Base
decoder with DRAFT codec Laws and Proofs. The Bend game requests exactly one
theme and chooses its fallback; browser JavaScript only performs bounded byte
transport. An isolated BoardScene checker and pixel reference gate passed:
both themes, exact 256 area reduction and 1024 nearest expansion, invalid
asset fallback, and hole witnesses at yaw 0/25/45/90. The isolated scene
decoder took 1.12–1.24 seconds with whole-process peak RSS around 1.25 GiB;
those are **not** browser startup or GPU measurements. The first composites
make the court visible through the holes but still juxtapose detailed painted
architecture with flat gray squares and indistinct pieces. Board/piece art
and measured chrome reflow are in progress. A generic browser transport test
caught and corrected Bend's snake_case `max_bytes` ABI; actual browser asset
loading, theme-switch/offline captures and native asset loading remain open.

### Graphics Pro handoff and independent audio continuation

The reusable graphics v2/grid8 DRAFT checkpoint is committed and pushed as
`436313f9c2bb68c29ce097a5e28e4dd2d9cabb0e`. Its portable 127-entry
source/docs/reference package is under ignored
`.artifacts/handoff/graphics-v2-pro-checkpoint.zip`, SHA-256
`679ca6811098347d989c4c329aaf3e42a10da45218533c513c80de9639e898ac`.
The owner has given the zip to GPT-6 Pro. Local graphics-library edits and
integration wait for that independent improvement pass. This is not a visual,
GPU or native-game acceptance.

Independent of graphics, audio commit `3b08bb55b259f30eb3ba715c97b722c17266c70d`
adds short note fades and avoids evaluating inactive waveforms. The Base-only
synthesizer checks and its 5,040-sample finite test pass. Two alternating
warm-JS timing runs disagree, so no speedup is claimed. The browser controller
cache is now stale because it imports `Synthesis.bend`; it must be reemitted
and the actual game/audio behavior playtested after the Pro handoff. No new
graphics-library bytes were changed by this audio continuation.

### September 25 worker and Pro-library checkpoint (draft, unreleased)

The Bend WebWorker backend is now a separate downstream patch stacked after
001 arity and 002 layout. The clean upstream 2.0.27 checkout remains untouched.
[Variant bytes and local gate classes](toolchain-patches/004-web-workers/LOCAL_RECEIPT.md)
bind a fresh replay, 107/107 compiler/HTML tests, 639 unchanged differential
fixture outcomes, four static-module browser engines, a relocated resource
package, and the game's source-bound five-file bot library. Automatic worker
scheduling is conservative and can add substantial snapshot cost to cheap
large-input calls. The game therefore uses a measured, explicit required
helper boundary for its pure Bend bot choice, with Bend revision/legal-choice
guards, stale-work cancellation and a serial fallback only when helper setup
is unavailable.

The draft modular browser build `bc2e4efb741f6cc791af` passed 11 extended
Chrome scenario groups under a nested local URL. Its two bot helpers executed
real jobs/results and completed a turn after a cold offline service-worker
reload; source-binding, 16 resource hashes, and no page/console/network faults
were checked. This is local browser evidence, **not** publication or owner
visual acceptance. The current captured board/menu still have flat pieces,
an overlarge permanent sidebar, and rough scaled bitmap text. A board-first
menu, native-size 8-bit font coverage, and piece-art pipeline are underway.

The Pro expansion and third pass were added to the reusable graphics v2
library without overwriting prior local fixes. The 12+8 new Laws and Proofs
remain DRAFT and byte-identical to the proposal; two F32 candidates remain
unfilled. Local expansion and third verification plus Chrome static module
worker checks pass (see [the library integration record](lib/graphics/v2/INTEGRATION.md)).
Its demo is far from an interactive frame budget: a cold 1024² frame was
33.17 seconds and a 28-tile partial frame 762 ms. Game adoption must use
retained small dirty regions, prepared native-size glyphs and measured detail;
neither demo timing nor a formal source scheduling equality establishes GPU
or game performance. Full native Rift binary and GPU-device gates remain open.

### Board-first UI and parallel sprite draft (unreleased)

The permanent sidebar was replaced by a compact header/footer and focused
View, Match, Preferences, History and decision surfaces. DM Sans is packed
into a source-bound native-resolution 8-bit Bend glyph asset; the 151,343-byte
pack is verified, shipped and service-worker cached. Browser Chrome scenario
checks passed piece deselection, both sides, themes, Undo consent, import,
capture, underpromotion, PCM, topology Shift, portrait controls, and a cold
offline move. Preferences now label its optional overlay switches “Move hints”
and “Shift hints.” This addresses the old misleading Move/Shift UI without
changing the frozen rules §10 default or legal command path.

The independent Pro library passes its source/finite/browser-worker gates and
remains DRAFT, with two intentionally unfilled F32 candidates. The game now
uses its alpha texture/affine primitives to map the twelve authored sprites.
The browser ships only the 64px interactive RGA2 pages (196,623 bytes); 128px
standard and 256px high-detail source candidates remain reproducible and
unshipped. A separately bundled, source-bound module worker computes detailed
512px court and pieces while the game worker keeps the fast proxy presentation
and Bend controller responsive. A late Bend `refine` packet repaints only when
revision, theme and placement still match. The helper JS transports/delegates;
pixels, game policy, text and final composition remain Bend-owned. Real Chrome
did show the detailed court and pieces after boot and camera motion, without
page/console errors. Offline helper and stale-result tests are being finalized.

The visual direction is improved but below the owner's WOW target. The
painted observatory remains visible through topology gaps, while the board
still reads as a relatively flat court and fixed-facing sprites do not solve
large-angle 3D views. A detailed camera refinement took roughly 2–3.5 seconds
in loaded local Chrome runs; cold starts varied more. The newer transient
128px ground/256px silhouette preview lowered local drag pixel-preparation p90
from about 180 ms to 57 ms in one Chrome run, with end-to-end reply p90 126 ms.
Its enlarged 4x board blocks are plainly visible during orbit. Do not promote
this draft as a complete responsiveness,
GPU, owner visual, native binary, or hosted acceptance. The Linux GPU request
is [Coordination comment 5840057909](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5840057909)
and has no result as of this checkpoint.

One Chrome test injected three valid fast timing windows through the actual
controller policy, promoted to a 2048×1280 presentation, and confirmed the
existing detailed sprite scene remained visible. It measured 40 ms for the
prepared high-tier Bend layer in that one run. This synthetic promotion is a
rendering regression gate, not evidence that the live automatic policy should
prefer high detail on this Windows machine or that GPU work ran.

The browser host holds at most one late sprite refinement while an input is in
flight. A real-Chrome race gate forced a pointer event at that boundary and
confirmed the image was presented after input drained; a second gate changed
camera zoom and confirmed the obsolete image was discarded before a fresh
Bend scene arrived. A refinement never acknowledges an input event or changes
rules. This is transport ordering evidence, not a broad performance claim.

### September 26 local release gate and native parity gap

The v2 packaging path now permits a non-draft build. Local version
`f261f9d623e679d401f7` passed the frozen semantic, parent pixel,
graphics-library, asset, selected-module and source-bound worker checks.
An extended Chrome playtest passed 11 rendered groups without page errors,
including both themes, selection toggle, both sides, capture, promotion,
Shift, PCM sound, portrait layout and an offline module-worker refinement.
This candidate is marked `sourceDirty: true` while native work continues; it
is not yet a source-clean publication or hosted acceptance.

The `maySuspend:false` worker auto fast-path probe is a no-go under the current
strict input contract. Even validation without copying took 20–27 ms median
for cheap 1.62 MB Image-shaped arguments, whereas serial leaves were under
0.02 ms. The game retains its measured required bot helper and independent
settled-sprite helper, leaving input and cheap render paths serial. See the
[guide](docs/LOCAL_BEND_GUIDE.md#experimental-js-helper-workers-downstream-variant)
for the raw ignored fixture location and limitations.

A smaller graphical `NativeMini.bend` has linked and played through WSLg with
the real Bend position kernel, but its 256px flat board is visibly far below
the browser presentation. It is a native binary feasibility checkpoint only.
The full source-level `NativeV2.bend` has not emitted a binary; its larger
checker/emitter exceeded a safe working set on the 16 GiB laptop. The Mini
visual parity follow-up is ongoing. Linux acknowledged the exact graphics
commit for isolated CPU/GPU testing, but no device measurement has returned.

Linux subsequently returned [measured GPU evidence](lib/graphics/v2/INTEGRATION.md#linux-cpu-and-gpu-device-follow-up)
for the older exact graphics commit `fb73a82`. The RTX 5090 executed the
explicit offload correctly, but its coarse 16-frame whole-process run took
about 28.8 seconds median versus 0.41 seconds with four CPU workers. This
rejects automatic GPU promotion for that fixture; it neither benchmarks the
current browser scene nor changes the visual parity/native source gates.

The non-draft v2 browser preview is now [published](docs/evidence/v2-workers-hosted/README.md)
from clean source `bfc069d` as build `f261f9d623e679d401f7`. All 21 hosted
asset hashes and module MIME types matched; the extended hosted Chrome suite
passed 11 groups, and a separate online/offline local-opponent probe completed
the same two canonical actions with all bot modules served by the service
worker. The graphics library still has draft laws, the desktop UI is not owner
accepted, and the graphical native adapter is only unchecked shared-source
code. Hosted browser publication does not close those gates.
