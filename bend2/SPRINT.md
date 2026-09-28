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
At that earlier checkpoint, the full source-level `NativeV2.bend` had not
emitted a binary; its larger checker/emitter exceeded a safe working set on
the 16 GiB laptop. The Mini visual parity follow-up was then ongoing. Linux
had acknowledged the exact graphics commit for isolated CPU/GPU testing;
later device and native C results are recorded below.

Linux subsequently returned [measured GPU evidence](lib/graphics/v2/INTEGRATION.md#linux-cpu-and-gpu-device-follow-up)
for the older exact graphics commit `fb73a82`. The RTX 5090 executed the
explicit offload correctly, but its coarse 16-frame whole-process run took
about 28.8 seconds median versus 0.41 seconds with four CPU workers. Linux's
[exact fixture clarification](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842302700)
shows the offload was requested at one fork level (at most four device
branches), and the timer covered the entire process and host checksums. It
does not establish the speed of a properly forked warm renderer. Keep GPU
detail unpromoted until a phase-separated device sweep passes; this result
neither benchmarks the current browser scene nor changes the native gates.

The new [phase-separated profile fixture](lib/graphics/v2/bench/gpu/README.md)
passed its pinned Bend source check and a bounded JS integrity run of the
historical case. Linux's first native CPU pilot passed all 25 route/case pixel
and checksum checks; its [receipt](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842725462)
has the first/warm/preparation times. Its GPU attempt was correctly stopped
before device execution because the runner omitted `BEND_CUDA`; no lease was
granted. Commit `dc8af02` mirrors Bend's native CUDA build flags and requires
the `.gpu` sidecar. The [exact device retry](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842986555)
subsequently passed 25/25 CPU and 35/35 GPU case executions with first-frame
pixel equality and matching 16-frame checksum. On the RTX 5090, 15 warm
render-return calls at cuts/forks `7/7` totaled 347 ms, versus 26,533 ms at
`3/1`; correct fork depth made the render phase about 76 times faster. The
host checksum of the returned image simultaneously rose from 132 to 1,552 ms
for those 15 frames. Four CPU workers at `7/7` took 426/18 ms for the same
two phases. The device execution was monitored under a fresh released lease,
but transfer/readback is not independently timed, the 15 subsequent frames
have aggregate rather than per-pixel validation, and no game or browser GPU
claim follows. The source-bound readback result appears below; keep automatic
GPU selection unpromoted.
The pinned native Linux `Window.frame` has a separate CUDA presentation path
that rasterizes the image tree on-device and copies a flat pixel buffer to
X11; this benchmark's recursive host checksum does not measure that path.
Native game frame and input timing under CPU/GPU remain separate gates.
The [paired-read CUDA result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843393565)
then found first CPU traversal of the same GPU image at 84–99 ms (median 97)
and immediate second traversal at 2–4 ms (median 2.5), with all 16 images
matching their paired checksum and the frozen aggregate. This sharply
isolates first-touch cost in the host checksum phase, without directly tracing
page migration or measuring the native window's on-device raster path.

The native arity blocker is now cleared at the source level. At exact public
commit `b3ffb3b`, Linux emitted the full `NativeV2` C source with both a
diagnostic-only compiler and the clean pinned 2.0.27 compiler. The two
14,331,202-byte outputs matched exactly, SHA-256
`35ab959363d2464dacb89ffe52f962d2e50daf04853cd0cd861a333b2cb0c796`.
The [receipt](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843061869)
reports a 32.22 GiB sampled peak RSS for the clean emit. A bounded CPU link,
asset-loaded X11 launch and actual interaction/capture gate are next; no
graphical native binary has yet been proven.

Linux subsequently linked that exact C into a CPU ELF, SHA-256
`3193015cdacb6559c788d43bf8ebf50a6497d7cbb21338c57613351270844f4a`.
On a real X.Org display, the shared-source NativeV2 window loaded all seven
matching assets, rendered 1024×640, selected and exactly deselected g1, and
accepted g1–h3 with Black to move. The [four-capture receipt](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843232546)
is partial: the old probe expected Escape to quit, though Bend's UI defines it
as cancel/clear. The corrected probe checks Escape preserves the window and
uses `WM_DELETE_WINDOW` for close. At that checkpoint the corrected rerun,
visual parity, audio and idle/input performance remained open.

The [corrected X11 rerun](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843428528)
passed on the same CPU ELF and asset subset, with the same four frame hashes,
exact selection/deselection/move pixel counts, Escape live, and a clean
window-close exit. Captured stderr was empty and isolated save/preferences
files were created. This establishes a real graphical Linux native checkpoint,
not Windows/WSLg, native audio playback, broad visual acceptance, or measured
responsiveness. At that checkpoint the native CUDA `Window.frame` path still
needed a separate device test; the host-checksum fixture did not measure it.

The [real native CUDA window pilot](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843730674)
then reused that source-bound C, built a CUDA ELF and sidecar under a fresh
released lease, and passed the same Linux X11 input/close probe. All four
GPU-on frame files were byte-identical to both the CUDA binary's CPU-off run
and the original CPU ELF. A disposable phase timer measured 120 idle frames:
CPU image fill median/p95 9.371/11.033 ms; GPU fill including its flat
device-to-host copy 1.002/1.284 ms (copy itself 0.993/1.279 ms). The 60 Hz
wait grew from 6.389 to 12.477 ms median, absorbing the saved fill time.
This demonstrates headroom in the native GPU presentation path for this scene,
without proving higher delivered FPS, lower input latency, or a suitable
automatic device policy. Native audio, wider playtesting, Windows/WSLg and
human visual acceptance remain open.

The [native CPU sound/restart checkpoint](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843868320)
then reused the earlier native CPU ELF/assets and a single isolated journal directory across
two real X11 launches. After g1–h3 and a clean close, the relaunch showed
Black to move and the knight at h3; relevant status/piece crops were exact.
The PipeWire sink monitor was silent during idle and captured 12,762 nonzero
48 kHz stereo s16 samples around the move, without clipping. This confirms
one saved-game restart and routed PCM, while crash recovery, all game states,
physical audibility, Windows/WSLg and owner visual acceptance remain open.

The subsequent game-owned visual iteration changes the default camera to an
oblique, closer view so the raised sides and actual open voids read in the
first frame. A cyan ring surrounds the selected piece in both proxy and
settled sprite paths; the selected square remains outlined and a second click
deselects it. The astral and warm observatory themes were inspected in actual
Chrome frames. The full local browser scenario gate covers both themes,
selection, moves, save/reload, capture, promotion, audio, offline helpers,
Shift and portrait input. These checks are interaction and visual-inspection
evidence, not owner WOW acceptance. The next native output requires a fresh
source-bound emission and Linux package/probe; the old ELF predates this view.
The reproducible CPU-first packaging procedure and its limits are in
[NATIVE_PACKAGE.md](docs/NATIVE_PACKAGE.md).

The prior non-draft v2 browser preview was [published](docs/evidence/v2-workers-hosted/README.md)
from clean source `bfc069d` as build `f261f9d623e679d401f7`. All 21 hosted
asset hashes and module MIME types matched; the extended hosted Chrome suite
passed 11 groups, and a separate online/offline local-opponent probe completed
the same two canonical actions with all bot modules served by the service
worker. The graphics library still has draft laws and the desktop UI is not
owner accepted. Subsequent shared-source native X11, CUDA, audio-route and
restart pilots are recorded above; the published browser build predates the
latest camera/selection iteration. Hosted publication does not close the
remaining visual, package, broad native playtest or toolchain-update gates.

The [next published checkpoint](docs/evidence/v2-camera-aura-hosted/README.md)
is clean build `316b07717192e7d6d5bb` at source `66af057`: 21 public asset
hashes match, and the extended hosted Chrome gate passed 12 groups, including
the applied sprite helper, new default view, selected piece, warm observatory,
offline play and portrait input. A new Linux package/GUI pilot was requested
through the bounded host mailbox; it is pending and must report its own source
and runtime hashes. The library, owner visual acceptance, and Bend 2.0.28
rebase remain open.

The next responsiveness gate is an actual orbit on representative browser
hardware. Two local Chrome drags after this build delivered roughly 53–69 ms
p90 worker replies across 10–14 pointer events; the Bend controller portion
was about 1–2 ms, while constructing and walking the motion image dominated.
Those short samples are diagnostics, not a stable latency benchmark. A direct
raw-buffer/ImageBitmap transport comparison produced identical final pixels,
but ImageBitmap did not establish a preparation-time win on this machine, so
the automatic path remains on raw buffers. The motion renderer should be
profiled and reduced or parallelized without changing its Bend-owned view and
picking semantics. Fixed-facing piece sprites at wide yaw remain the largest
visual gap; a transparent rear-knight art study exists only in ignored local
artifacts and is not a consistent twelve-piece turntable.

The [local camera rail checkpoint](docs/evidence/v2-camera-rail/README.md)
keeps the desktop board visible while View is open and makes Zoom+ work from
the default view through 130%. Clean build `f61152159a6331b9db2d` at source
`6721cf0` was published and its 21 asset hashes and four worker MIME types
matched the public URL; the hosted extended 12-group Chrome game scenario
passed. Focused input/menu checks and actual rendered inspection also passed.
A paired 128-pixel drag preview measured faster than 256-pixel
pieces but visibly damaged silhouette and void clarity, so it was reverted;
the accepted source retains the higher-detail motion path. The still-slow
sprite refinement after rapid view changes and the broader WOW target remain
open. The clean 2.0.27 native package retest is waiting for the Linux host's
requested cgroup topology diagnostic before a fresh source-bound CPU build.

## Successor local motion checkpoint (unpublished)

The successor holds a fresh scoped claim after verified predecessor release.
The CPU-only Linux package retry is bound to published source `6721cf0` and
remains pending; it must not be treated as native parity for later source.
The browser-only compact motion tree keeps accepted 256px piece/hole detail
while avoiding an explicit 256-to-512 quadtree expansion. Native
`fast_camera512` stays explicit. Twelve full-frame finite comparisons across
desktop, enhanced and portrait output passed 60,817,408 exact bytes. An
interleaved local JS A/B reduced full median/p90 from 57.53/95.08 to
42.68/63.27 ms; one real Chrome orbit saw 366,145 to 154,769 visited nodes,
with byte-identical motion and settled captures. All 12 extended local
rendered scenario groups passed. See the
[local receipt](docs/evidence/v2-motion-compact/README.md) for limits.
The non-draft browser build was repeated from clean commit `70837ad` with
`sourceDirty: false`, and the content version stayed `ca7fea3cb1fd6afd95df`.
This source is not published; the full native checker timed out locally,
and owner WOW/turntable art, new-source CPU/GUI/PCM/restart and 2.0.28 gates
remain open.

## Successor candidate pin and sprite responsiveness

The clean 2.0.27 pin remains authoritative. A disposable, ordered 2.0.28
candidate revealed an upstream identity-alias false rejection of frozen
`ArithmeticLaws.bend`. Unadopted patch 006 limits its new conflict guard to
distinct keys. Eight positive/negative fixtures passed. A finalized,
unchanged-input aggregate validated all 1,584 frozen v2 terms with no holes
or tainted roots; a candidate-only exact constructor-tag bridge then passed
the unchanged 14-position/223-successor reference differential. Six copied-core
mutation controls also passed positive and deliberately incorrect proof checks.
The 2.0.28 candidate subsequently passed all eight graphics/grid8 proof
entry points, 5,874 independent core-library checks and 1,088 annulus
samples with a source-bound, candidate-only constructor-tag bridge. Direct
`Shapes` and books importing `Shapes` require different TS-side tags in
2.0.28; production host/cross-book ABI parity remains unverified.
A source-bound one-event controller probe confirms that the unchanged browser
host's bare `Activate` is ignored by the candidate, whereas
`ui/Types.Activate` opens View. This is an observed host ABI migration gate,
not merely a hypothetical graphics-test difference.
Any adapter must preserve the host input queue's bare `PointerMove`
coalescing while covering all input variants and cross-book values.
A disposable 2.0.28 adapter now passes bounded selected-book constructor
probes for all eleven host input names, effect envelopes, Controller Frame and
MenuAA chrome values, and both resource response types. Its corrected gate
preserves a 1,200-entry history and large byte list by identity and rejects
prototype-sensitive tags. The actual production browser/worker code is unchanged.
A nonce-private 2.0.28 draft then emitted Controller, BoardScene and MenuAA,
and a source-bound four-group real Chrome hotseat smoke passed boot, sprite
refinement, Preferences open/close and e2–e4 with post-move refinement.
The first candidate bundle deliberately lacked a bot worker, but it later
passed all 13 extended local hotseat Chrome groups. A separate nonce-private
candidate then emitted a source-bound BotAdapter worker. Its Node worker
smoke matched the serial scorer, and a strict instrumented Chrome diagnostic
confirmed `choose` and `bot_apply_at` (no fallback) online and after a cold
offline reload. This is not the uninstrumented production bundle, and the
full migration, native, performance and reviewed-amendment gates remain
required before any pin move. See the
[candidate browser receipt](docs/evidence/browser-2028-candidate/README.md).
The [candidate assessment](docs/TOOLCHAIN_2_0_28_ASSESSMENT.md) binds these
receipts and lists the broader graphics matrix, full-browser, Linux/native,
performance and reviewed-amendment gates still outstanding. No toolchain
pin or frozen dependency moved.

Two six-click local Chrome camera bursts exposed 1.8–2.0 seconds from sprite
dispatch to helper start, including cloning/scheduling and stale helper work;
it is not a pure transfer measurement. A 450 ms quiet window for settled
camera-only view changes reduced the observed last-input-to-refinement from
about 4.94–5.44 to 4.46–4.70 seconds in those runs, while one isolated click
became slower (hosted old-source 2.97 versus draft 3.66 seconds in one
comparison). The timing samples use different source/host load and are not
a controlled benchmark. Ground topology changes, including a settled Shift
Undo, take the immediate path. This browser-only scheduler is a modest
responsiveness trade-off, not a sprite-render throughput or visual WOW fix.
On the corrected draft, a fresh six-click Chrome run refined after 4.06
seconds from the last click with `quietWindowMs: 450`; the settled PNG exactly
matched the earlier immediate run. The extended local rendered suite passed
all 13 checks, including a settled Shift Undo with `quietWindowMs: 0`, with
zero browser errors. See the [local evidence](docs/evidence/v2-sprite-quiet/README.md).
The committed non-draft browser build repeated the identical content version
`ad9b34c4ac0da2d7cd32` with `sourceDirty: false` after the frozen semantic,
graphics and attestation checks. The separate free Pages preview now serves
that clean build: 22 public files match the manifest/local/Pages bytes and
the hosted Chrome extended scenario passed all 13 groups with zero browser
errors, including offline move, PCM, portrait and immediate Shift Undo
refinement. The original TypeScript site baseline remained unchanged. See
the [hosted receipt](docs/evidence/v2-sprite-quiet-hosted/README.md).
This is a working browser preview, not owner WOW or release acceptance.
At that checkpoint the Linux package request was bound to older published
source and was not new-source native acceptance.
A read-only Windows package preflight checks the current pin, source closure
and asset hashes but reports `buildPermitted: false`; it emits no C or ELF and
does not advance the Linux CPU/GUI/PCM/restart gate.

The [multi-angle art study](docs/evidence/v2-turntable-study/README.md)
inspected a transparent, image-generated rear-quarter white knight and an
offline-rendered CC BY 4.0 3D set: twelve meshes at four yaw angles in real
Chrome, including a gold-base accent variant and board-scale contact sheets.
The mesh set has coherent turntable silhouettes but is plainer and lower
contrast on pale squares than the authored gold/navy atlas; the generated
knight did not rotate consistently enough to extrapolate to twelve pieces.
Neither candidate is integrated, published or owner accepted. The original
source and three RGA pages remain authoritative.

An opt-in diagonal RgbaAffine trial matched 84 full Image trees, but its
seven-pair 256px timing did not repeat: 1.37× in one run, 0.97× in an
independent repeat under different host load. The duplicated traversal and
finite-domain precondition were not justified by that evidence. Its source
and test were restored/removed without changing the game; the ignored
`.artifacts/bend2/axis-trial/README.md` preserves the rejected measurements.

## Exposed tile edges: hosted browser preview

The owner noticed the missing outer and rift-facing tile depth. The settled
Bend scene now draws conditional vertical faces and a stronger lip only where
a present tile meets the board boundary or a missing neighbor; shared edges,
the open rift center, picking and the compact motion pass remain unchanged.
The pinned checker and a focused four-yaw pixel/topology gate pass. Default,
orbit and portrait Chrome captures were inspected, and the extended local
scenario passed all 13 groups with zero page errors. Two paired old/new
six-click bursts had overlapping helper and last-input latency ranges; they
are small variable-load diagnostics, not a performance acceptance benchmark.
The clean non-draft build repeated the exact draft content version
`85397955504c1bb54d3a` at source `f8a7fbf`, and the separate Pages preview
now serves it at deployment commit `27cee62`. All 22 live files matched the
manifest and the hosted extended Chrome scenario passed all 13 groups with
zero browser errors; the original TypeScript site baseline remained unchanged.
See the [edge evidence](docs/evidence/v2-board-edges/README.md). Owner WOW
acceptance and native/GPU parity remain open, and 2.0.28 stays unadopted.

The Linux host [reported](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5857698304)
a CPU-only NativeV2 package at earlier clean source `6721cf0`: exact C/ELF
and package hashes, real X11 selection/move/close, saved-game relaunch and
routed PipeWire PCM samples. This is host-reported evidence for that older
source, not a local re-verification or parity for the edge checkpoint.
With that pilot closed, one [new-source CPU-only retest](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5857865924)
was requested against `f8a7fbf` with exact pin, script and BoardScene hashes.
The [Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5858004336)
reported a successful CPU package at that exact clean source/tree and pinned
2.0.27 compiler: X11 select/deselect, g1-h3, close/relaunch with the Black-to-move
journal, and nonzero routed 48 kHz PipeWire PCM. Its package receipt SHA-256 is
`feba58957d303f4c0bc61c25314dd8cf20e05c978d0c5930b0f314c8324c29aa`;
the ELF SHA-256 is
`65ca689d61d56c18f74560ec0c5059bb241455613b9da892e48ae6eb2f321cd2`.
This is host-reported, source-bound CPU evidence, not local root execution,
human audio acceptance, or GPU parity. The build's 72,346,644 KiB peak RSS
(about 69 GiB) also invalidated the prior 40 GiB emission floor. The interim
guard is now 88 GiB, with initial and just-before-C-emission host/visible-cgroup
samples in the receipt and fail-closed records; seven deterministic tests pass.
It is protective, not a future-run guarantee. No CUDA/GPU lease was granted.

## Camera, piece grounding and single-owner exposed faces: hosted preview

The owner still saw missing edge faces, high/tall pieces and back-rank overlap.
The settled board now has one topology-aware wall owner instead of overpainting
those walls with generic fixed tile sides. Fine seams mark all four tile tops;
outer/rift lips and real vertical walls remain conditional on absent neighbors.
The default camera is yaw 345°, pitch 67° (was 52°), pieces are 1.35 projected
pitch high (was 1.48), their visual base shifts 0.10 sprite widths down, and a
small low-opacity contact shadow sits behind each settled authored sprite.
The exact old persisted factory view migrates to the new default on load;
custom angles remain unchanged.
Camera extrusion is scaled to keep side depth legible at the steeper pitch.
The compact active-orbit path still uses flat ground and has not gained walls.

The pinned checker, five-yaw oblique plus four-cardinal settled wall/topology
test, picking checks, sprite/grounding and saved-view migration tests pass.
A source-dirty draft build `f2369ed40dae326d895e` was visually inspected at
default, 330° diagonal and Front views in Chrome; a real persisted-old-view
reload produced the new default. Its extended local Chrome scenario passed all 13 groups
with zero page errors (including interaction, offline, PCM, Shift/Undo and
portrait). The clean non-draft build at `4f6e52f` repeated the same content
version. The separate Pages preview published it at `233d892`; all 22 live
files and the two original TypeScript-site baseline files matched, and the
hosted real Chrome scenario passed all 13 groups with zero page errors.
The first immediate public verification observed the previous deployment and
is preserved as a failed receipt. This is a playable browser preview, not
owner acceptance or source-parity native/GPU evidence. See the
[composition evidence](docs/evidence/v2-composition/README.md). The previous
`f8a7fbf` CPU result does not validate these changed camera/scene bytes.
Windows preflight still reports `buildPermitted: false` and emits no native ELF.
The native X11 click probe and the timing fixture were also updated to project
the new default angle before a new-source Linux pilot; they have not yet been
executed on that host. One [CPU-only new-source request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5858608451)
is bound to clean commit `4f6e52f`, tree `e3b0354`, the 88 GiB guard and
exact camera/scene/probe hashes; no CUDA/GPU grant follows from it.

The separately isolated 2.0.28+006 candidate was repeated against this
published visual source without touching the pinned toolchain. Its draft
hotseat bundle passed all 13 real Chrome groups, and its diagnostic bot route
passed strict worker-only online and cold-offline checks with zero fallback.
Four sampled camera/migrated-preference captures matched pinned 2.0.27 PNG
bytes. See the [candidate evidence](docs/evidence/browser-2028-candidate/README.md#current-published-visual-source-trial).
This is local candidate compatibility evidence, not a reviewed pin move,
native CPU/GPU parity or owner visual acceptance.

## Source-bound Linux composition result and active-orbit wall draft

The [Linux response](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5858793813)
to the new-source request passed at exact clean `4f6e52f`, tree `e3b0354`,
all six requested source/pin SHA-256 checks and Bend 2.0.27. One CPU package
build took 462.89 seconds with 38,316,064 KiB peak RSS after the 88 GiB
host/cgroup guard admitted it. The receipt-bound ELF passed real X.Org :1
g1 select/deselect, g1-h3, close and relaunch with Black to move; a PipeWire
HDMI sink monitor captured 12,762 nonzero move samples against idle silence.
This closes the requested CPU/window/routed-PCM host probe for that published
source, not physical audibility, saved-old-view migration, GPU/Windows-native
parity, or owner acceptance. Exact hashes and limits are in the
[composition evidence](docs/evidence/v2-composition/README.md).

A local draft added camera-facing exposed walls to the compact
active-orbit ground without a second full top pass. An independent review
found no confirmed mask/geometry bug and prompted stronger absolute palette
checks. The nine-yaw and 288-view sweep, 160 near-cardinal/hole/theme
variants, 27,260 present top centers, 13-group real Chrome scenario, real
held-pointer capture, compact pixel equivalence, source checker, TypeScript
check and 62/62 root tests pass. The active-orbit image has visible rift and
outer side bands during drag, but retains coarse temporary sprites. The
clean non-draft build at `68411c4` repeated draft version `4ac79468f49425b6fec3`;
the separate Pages preview published it at `2252b0a`. All 22 live files and
two original TypeScript-site baseline files matched, and the hosted real
Chrome scenario passed all 13 groups with zero errors. The first immediate
public check saw the previous deployment and is retained as failed evidence.
See the [motion-wall evidence](docs/evidence/v2-motion-walls/README.md).
One [CPU-only native retest request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5860391255)
bound `68411c4`, the new `MotionWall` hash and the 88 GiB guard. Its
[Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5860542619)
passed one 455.73-second CPU package build (68.321 GiB peak RSS), real
X.Org selection/move/close/relaunch, a held-right-button orbit with distinct
motion/settled frames, and routed PipeWire PCM. The observed orbit delays
include polling and capture overhead and do not establish internal render
latency. This is exact-source Linux CPU evidence, not physical audibility,
Windows-native, GPU, public desktop release or owner acceptance. The now
completed hourly follow-up was paused. A separate
[CUDA pilot request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5860739585)
requires a fresh GPU coordinator lease; no device grant is inferred from
the CPU result.

The [source-bound leased CUDA pilot](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5860926260)
subsequently reused only that C, built a new CUDA ELF/sidecar, observed an
RTX 5090 running the exact `--gpu on` process, and matched CPU/off initial,
selected, completed-move and held/settled orbit frame bytes. Its fresh lease
was withdrawn and verified denied afterward. The original 250 ms synthetic
second-click deselection capture repeatedly stayed selected on GPU-on,
whereas CPU/off restored the initial frame; a 1,000 ms diagnostic cadence
passed. This is an open input/presentation-latency finding, not source-matched
GPU parity or a throughput speedup. No default device promotion follows;
see the [orbit evidence](docs/evidence/v2-motion-walls/README.md#exact-source-leased-cuda-presentation-pilot).
A separate [observer-only timing request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5861118746)
was completed under a new, withdrawn lease without altering the receipt-bound
ELF/sidecar. The [Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5861399699)
reproduced the original GPU-on 250 ms failure. Untraced ROI sampling first
cleared at 275 ms on GPU-on versus 225 ms on CPU/off; traced GPU-on release
was consumed within 10–15 ms but changed-frame submission followed at
281–304 ms. The trace affects timing and does not isolate a kernel, transfer,
app or compositor cause. Preserve the failed gate and default-off policy;
see the [detailed limits](docs/evidence/v2-motion-walls/README.md#exact-source-leased-cuda-presentation-pilot).

## Bend 2.0.32 release triage

The [official 2.0.32 changelog](https://github.com/bendlang/bend/blob/main/CHANGELOG.md)
introduces a new proof verdict/kernel path, a faster JS `Nat` and call lane
since 2.0.29, an `IO.args()` positional break, native input changes and F32
alignment. The tag was observed at `573002f01ec6c52416d44489543f69a9625facf8`.
The isolated 2.0.28 patch stack now has a reproducible
[107/107 worker gate](docs/evidence/toolchain-2028-stack/README.md), but that
does not transfer to 2.0.32 or accept either pin. The running application
remains on 2.0.27. Exact-tag source inspection found the identity-alias
guard corrected upstream, but `book_owned` remains private and the frozen
v2 checker still calls its removed export. A separate 2.0.32 checkout/rebase,
reviewed versioned proof-authority path and full browser/native gates would
precede any pin amendment; see the
[release triage](docs/evidence/toolchain-2032-scout/README.md).

The final replayed 2.0.28+006 clone also matched its exact 005 baseline
across all 647 local parser/checker/normalized JS+C emission rows when the
unchanged matrix ran as two individually supervised lanes. The first
combined command timed out at a 120-second child bound. A subsequent
[source-bound wrapper receipt](docs/evidence/toolchain-2028-stack/README.md#final-stack-proof-attempt-and-647-case-differential)
binds both successful 647/647 lanes, compiler/fixture/runtime inputs and
unchanged pre/post bytes; it is still only a finite differential. A new exact-replay
frozen v2 proof attempt loaded 1,584 terms but timed out at 900 seconds
before validation returned, with inputs unchanged. Preserve that failure;
neither matrix equality nor the earlier separate candidate proof substituted
for it. A later short-path copy of the exact final replay's 95-file Bend source
tree passed a hardened, source-bound aggregate check: 1,584 terms, zero holes,
zero taint and zero denied fetches, with frozen closure, full-tree digest and
pre/post bytes verified. The successful [candidate receipt](docs/evidence/toolchain-2028-stack/README.md#final-stack-proof-attempt-and-647-case-differential)
does not erase the timed-out sample, supply canonical pinned proof evidence or
approve the pin. The pin remains 2.0.27, with 2.0.28 native/host ABI/amendment
gates still open.

A new [current orbit-wall source candidate](docs/evidence/browser-2028-candidate/README.md#current-orbit-wall-visual-source-trial)
passed 13 local Chrome hotseat groups, a held-orbit capture whose motion and
settled PNGs exactly matched the pinned 2.0.27 source, and a separate strict
online/cold-offline bot-worker diagnostic with no fallback. This candidate
remains nonce-private, draft, and instrumented; it uses a source-equivalent
compiler copy rather than the final replay checkout and does not turn the
earlier timed-out proof sample or native/GPU/pin gates green. The later
short-path final-stack aggregate proof is separate candidate evidence.

The September 26 `05b-warm-court.png` is a historical pre-wall capture, not
the current rendering. A later same-sequence local Chrome capture shows the
outer drop and some rift-wall shading; the owner finds it much closer, while
the rifts still read too flat at that angle. Keep face legibility, piece
footing/height, row separation and owner visual acceptance open.

A subsequent [local piece-footing and wall-tint trial](docs/evidence/v2-piece-wall-trial/README.md)
shortens the settled sprites from 1.35 to 1.22 projected pitches, moves their
visual base down by 0.16 rather than 0.10 sprite widths, aligns the contact
shadow and tints exposed faces toward the existing brass edge. The full 288-view plus
160-variant sampled wall/top sweep and 13-group Chrome hotseat matrix passed;
same-sequence warm and four cardinal frames were inspected. The clean
2.0.27 build reproduced the draft bytes, and the separate
[hosted preview](docs/evidence/v2-piece-wall-trial/README.md#clean-build-and-hosted-preview)
passed a 22-file byte check and all 13 real-Chrome scenario groups. Owner
visual acceptance and new-source native CPU/GPU parity remain open; the
older native evidence does not transfer.

One [source-only Linux 2.0.28 feasibility request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5862769649)
binds current commit `041932b` and the reviewed seven-patch order. It
explicitly excludes heavy C emission, a GPU lease, pin move, host migration
and claims of cross-host parity. Its later result is recorded below rather
than inferred from the request.

The now-published scene also passed a [nonce-private 2.0.28+006 browser candidate](docs/evidence/browser-2028-candidate/README.md#current-published-piecewall-visual-source-trial):
13 local Chrome groups, an instrumented online/cold-offline bot-worker route
with no fallback, and five sampled frame PNGs byte-identical to the public
2.0.27 build. This does not replace the still-open native candidate, GPU,
host ABI, amendment or owner visual gates.

The [Linux 2.0.28 source-only feasibility result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863035581)
replayed seven reviewed patches on exact upstream source with LF files and
passed a bounded check-only NativeV2 load on public visual source `041932b`.
The apparent 27-vs-28 path count is a category distinction in the Windows
replay: 27 changed paths, plus unchanged `base.bend` among 28 final input
files. Linux was [asked to verify](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863194840)
that distinction locally; no cross-host parity is inferred.
A separate [CPU-only candidate package request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863172636)
preserves the 88 GiB pre-emission guard, one bounded C/ELF attempt and fresh
X.Org/PCM/restart probes only after the source/asset/compiler receipt binds.
No native candidate result is inferred before that reply.

The [Linux CPU-candidate reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863271416)
stopped at the first resource gate: host MemAvailable was 72.538 GiB,
15.462 GiB below the 88 GiB floor. No second sample, source/asset preflight,
C emission, ELF, X.Org, PCM, or restart followed. The host released its claim;
there is no native candidate acceptance or permission to lower the guard or
blindly retry. The [Linux path-count clarification](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863349323)
confirms 27 changed patches and 28 final input entries including unchanged
Base, with line-ending normalization; this still is not end-to-end parity.

A subsequent [compact MOVES overflow repair](docs/evidence/v2-compact-overflow/README.md)
is a source-dirty local draft. A bound rendered mobile test reproduced and
then verified that the overflow opener exposes legal moves, while selection,
Shift, camera, and the existing Chrome hotseat suite passed their bounded
checks. This source is newer than the Linux requests and published preview;
the native, full playtest, hosted and owner visual gates remain open.

The initial compact source was subsequently built clean and published in the
separate [Bend preview](https://haileystorm.github.io/rift-chess-bend2/): all
22 manifest files and two original-site baseline files matched live bytes,
and the hosted extended Chrome suite passed 13 groups. The
[evidence record](docs/evidence/v2-compact-overflow/README.md#clean-build-and-hosted-preview)
preserves the pre-deployment failed probe. An inspected mobile screenshot
then exposed Close and heading overlap in the 27-destination MOVES grid.
A small [portrait spacing follow-up](docs/evidence/v2-compact-overflow/README.md#portrait-menu-spacing-follow-up)
passes its focused geometry check and source-bound local rendered mobile and
hotseat tests, but is still draft. Neither public browser result nor this
newer draft closes native/GPU, 2.0.28 pin, full playtest, or owner visual gates.

The portrait follow-up was subsequently built clean and published at Pages
commit `e129a4b`, with exact live bytes for 22 Bend files and two preserved
original-site baselines. Its hosted mobile MOVES/Close interaction passed,
as did all 13 extended Chrome groups. The [receipt trail](docs/evidence/v2-compact-overflow/README.md#portrait-menu-spacing-follow-up)
preserves the draft and clean distinction. Owner board/aesthetic acceptance,
the historical full playtest and new-source Linux native CPU/GPU evidence are
still outstanding; 2.0.28 remains unadopted.

The [stage-two playtest recovery](docs/evidence/v2-playtest-recovery/README.md)
found two real compact-UI defects after updating obsolete test navigation:
resignation status named the winner as the resigning side, and RESUME kept the
Match rail open, preventing bot scheduling. Focused Bend checks and rendered
reference play now pass both repairs. All 20 scenario names passed across six
source-bound draft runs on the same 2.0.27 content version, including two
complete bot games and both 304-action draw policies. The bound extended
Chrome suite also passed. This is not yet a clean or hosted publication of
the new source, and its slow bot/post-move frames keep responsiveness open.
No browser result closes the new-source native CPU/GPU, 2.0.28 amendment, or
owner visual gates.

The match-status/resume source was then built clean and published at separate
Pages commit `42ba051a`. The [publication trail](docs/evidence/v2-playtest-recovery/README.md#clean-build-and-hosted-preview)
confirms 22 live Bend assets and two unchanged original-site files by bytes;
hosted draw-actions/undo and all 13 extended Chrome groups passed. The 20
scenario reference/interaction union remains local draft evidence, not a
single uninterrupted hosted run. Browser responsiveness, native CPU/GUI/PCM/
restart, GPU parity, owner visual acceptance and a reviewed 2.0.28 pin remain
open.

A separate [new-source 2.0.28+006 browser candidate](docs/evidence/browser-2028-candidate/README.md#published-match-statusresume-source-trial)
passed the 13-group local Chrome matrix, a focused resignation/RESUME play,
and an instrumented online/cold-offline bot worker route with no fallback.
Five sampled frames matched the pinned hosted 2.0.27 preview byte-for-byte.
This is a disposable source-equivalent compiler copy and local browser gate,
not final-replay native parity or pin acceptance. Linux was asked for a
single [read-only 88 GiB headroom observation](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865659311)
after its previous pre-emission stop; no heavy attempt was requested.

The [read-only Linux observation](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865876967)
later measured 103.204 GiB MemAvailable, 15.204 GiB above the 88 GiB floor,
without acquiring a claim or starting a build. One separate
[exact-source CPU candidate request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865910914)
now binds public source `c30d312`, a new narrow claim, two fresh admission
samples, compiler/asset closure, at most one C/ELF attempt, and only then
bounded X.Org/PCM/restart probes. The [append-only SHA correction](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865920136)
must be read with it before heavy work. No CPU-candidate result follows from
this request; the earlier 72.538 GiB stop remains evidence for its own attempt.

A [current-source latency phase diagnostic](docs/evidence/v2-latency-phase/README.md)
separates hosted post-move Tick computation from pixel preparation and menu
composition. One 42-frame move sample had 1204.7 ms p95 pre-port work and
245 ms p95 port work; an eight-frame menu sample reached 718.8 ms p95 port
time, with a slow composition around 589 ms. Same-position Bun calls found
~1.11 s median frozen match command and ~0.62 s successor legal enumeration,
consistent with repeated legal work in the command/refresh path. These are
bounded diagnostics, not browser performance acceptance or permission to
weaken frozen dependencies or native parallel shape.

A [read-only Windows NativeV2 candidate closure preflight](docs/evidence/v2-native-candidate-preflight/README.md)
validated 151 source and 18 asset/manifest input paths against the isolated
2.0.28+006 compiler copy and current public game source. The local 15.675 GiB
host had only about 5.085 GiB free; no potentially multi-gigabyte NativeV2
check or emission was started. This preflight does not substitute for the
separate Linux two-sample 88 GiB admission or CPU/GUI/PCM/restart result.

The [Linux source-bound 2.0.28+006 CPU candidate result](docs/evidence/native-2028-cpu/README.md)
has now reported a passing single source check, C emission, CPU ELF link,
original 250 ms X.Org selection/deselection and g1-h3, held/settled orbit,
routed PipeWire PCM capture and saved-position relaunch at exact public source
`c30d312`. Both fresh host-memory admissions exceeded 88 GiB; the local
claim was released. These are host-reported native CPU/package/GUI/PCM/restart
evidence with immutable receipt hashes, not transferred binaries or
independent Windows replay. GPU-on current-source parity, 250 ms device
latency, owner visual/audio acceptance, responsive frame times, final review
and a formal 2.0.28 pin amendment remain open.

The isolated candidate then passed [deeper browser replay](docs/evidence/browser-2028-candidate/README.md#deep-candidate-browser-replay):
two 304-action draw-policy cases and a fresh-seed Black bot game ended in
natural checkmate, all with zero reference defects. An earlier combined
bot run had reached the 180-ply cap because the test carried random-choice
state from White into Black and then counted its cleanup resignation as a
terminal game. That raw receipt is retained; the driver now resets the seed
and requires a natural outcome before cap. This extends finite candidate
browser coverage, not native/GPU or pin acceptance.

The [canonical pin assessment](docs/TOOLCHAIN_2_0_28_ASSESSMENT.md#canonical-pin-gate-blocked-under-the-current-frozen-contract)
now records two independent 2.0.28 blockers: pristine upstream rejects a
frozen alias reference, and its removed `Comp.book_owned`/`Comp.SYNTH` API
breaks the frozen v2 checker. The current amendment cannot substitute that
checker, and project policy forbids replacing the pristine pinned checkout
with the patched candidate. Retain 2.0.27 and the candidate receipts pending
an owner choice of a reviewed new proof-authority version or a fresh pristine
upstream successor assessment. This does not affect the separately requested
current-source GPU pilot.

The hosted first-frame [sprite-refinement gate](docs/evidence/v2-playtest-recovery/README.md#initial-fallback-versus-detailed-sprite-refinement)
now distinguishes coarse proxy pieces from the authored detailed artwork.
An exact-build-bound Chrome start passed and both rendered states were
inspected; the detailed frame arrived 4,677.9 ms after the first frame in
that cold sample. The artwork route is functional, but rapid visual readiness
and owner acceptance are still open. This test-only change does not alter the
published/native source bound to the pending GPU request.
The additional real Front-preset capture is now part of that narrow gate:
the authored back rank still projects into part of the pawn rank, so the
piece-height/placement concern has not been declared resolved. A visual
source change would need a fresh clean browser/native/GPU source binding;
this capture and test change do not silently transfer the `c30d312` device
request to a later build.

The [exact-c30 leased CUDA pilot](docs/evidence/native-2028-gpu/README.md)
reported actual RTX 5090 execution and matched held/settled orbit, but
**failed** the original 250 ms GPU-on second-click deselection where CPU/off
passed. Its lease was withdrawn and denied, and its claim released. A fresh
[observer-only timing request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5867368799)
is open on the retained ELF/sidecar; it is not a second acceptance attempt.
Default GPU-off and the failed gate remain in force. A final visual-source
change would also need a fresh exact-source device gate after a reviewed fix.

A [shorter/lower Bend piece projection](docs/evidence/v2-piece-proportions/README.md)
addresses the Front-rank overlap without touching chess rules or the piece
atlas. Its rendered default/Front and four-cardinal captures were visually
inspected; the local draft desktop-start, selection, camera and 13 extended
Chrome groups passed with zero defects, as did the focused sprite checks and
the original TypeScript application. The clean non-draft build was published
at Pages commit `8005a07`, verified byte-for-byte against 22 Bend files and
two original-site baselines, and passed the hosted Front/start and all 13
extended Chrome groups. It is not owner visual acceptance or a new-source
native/GPU result. The pending observer-only c30 timing diagnostic remains
bound to its exact older ELF.
A separate [one-attempt current-source CPU retest](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5867789285)
is queued after that diagnostic closes, with a fresh two-sample 88 GiB
admission and original-cadence GUI/PCM/restart gates. Neither request is
execution evidence or a pin change.

A [fresh isolated 2.0.28+006 browser candidate](docs/evidence/browser-2028-candidate/README.md#published-shorter-piece-source-trial)
for the published proportions passed 13 local Chrome groups and a focused
Front/default rendered check. Seven sampled PNGs matched the live 2.0.27
preview byte-for-byte. This neither resolves the pristine-upstream/frozen
checker pin blockers nor transfers the older CPU/GPU host receipts.

The [c30 observer-only GPU timing reply](docs/evidence/native-2028-gpu/README.md#observer-only-diagnostic-stopped-before-gpu-use)
stopped before any device episode because its in-process XRes check used a
different X authority from its private X.Org child tools. Its fresh lease and
claim were closed; it produced no current-source timing result. The original
250 ms GPU-on deselection failure remains authoritative. A later CPU-only
harness-auth preflight was requested **after** the queued cafc934 native CPU
gate closes, with no GPU retry authority; await its exact receipt before any
new leased device diagnostic.

The [published piece-proportion CPU retest](docs/evidence/native-2028-cpu/README.md#published-piece-proportion-source-retest)
then reported both fresh 88 GiB admissions passing, one source check/C
emission/CPU ELF link, the original 250 ms X.Org selection/deselection and
move, held/settled orbit, routed PCM and same-data-directory restart at
exact `cafc934`. Its source-bound host-local receipts and claim release are
retained; there was no CUDA work. This closes the **reported current visual
source Linux CPU gate**, not GPU-on, physical audio, Windows-native, owner
visual acceptance or the blocked compiler pin.

The [CPU-only Xauthority preflight](docs/evidence/native-2028-gpu/README.md#cpu-only-auth-preflight-stopped-at-display-readiness)
stopped before both XRes controls because the disposable Xephyr readiness
predicate expected dimensions in `xwininfo -root -tree`, and its own output
was not retained. No GPU use occurred and the fixture/claim were closed. A
new one-shot [readiness/XRes request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5868830136)
uses `xwininfo -root` and preserves exact sanitized output/status before any
control; it does not authorize a GPU diagnostic. The 250 ms CUDA-on failure
remains open.

A [new exact-build-bound hosted latency sample](docs/evidence/v2-latency-phase/README.md#published-piece-proportion-performance-sample)
on that visual source passed its interaction checks but still measured a
1,248 ms p95 move reply and 508 ms p95 menu reply. The visual improvement
is not a responsiveness pass; the frozen legal-refresh and separate chrome
composition paths remain work rather than being hidden behind green UI tests.

The [current-source hosted bot/terminal playtest](docs/evidence/v2-playtest-recovery/README.md#full-bot-games-and-terminal-artwork-on-published-proportions)
then ended White-bot in natural threefold after 52 replies and Black-bot in
natural checkmate after 45, with zero journal/reference defects. A focused
Fool's Mate capture showed the initial terminal proxy frame upgrading to
ornate pieces on a refinement packet for terminal revision 4. This closes
that narrow visual-lifecycle question, not the multi-second delay, full
current-source scenario union, owner acceptance or GPU-on latency gate.

The [corrected-readiness CPU-only fixture](docs/evidence/native-2028-gpu/README.md#corrected-readiness-inverted-xres-status-control)
then reached XRes on an owned display, and wrong-cookie denial passed, but
its copied helper inverted `XResQueryClientIds` status 0 and stopped before
PID comparison. The mistaken reviewer approval is preserved and superseded.
The fixture/claim closed without GPU use. A new bounded
[status/ownership control](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5869916117)
requires the original `status != 0` check and an exact private-cookie PID
match; it is CPU-only and cannot relabel the failed CUDA-on gate.

The [hosted current-source 20-name matrix union](docs/evidence/v2-playtest-recovery/README.md#current-published-source-matrix-union-and-mobile-chooser-anomaly)
now has passing samples for every scenario across separate bounded runs,
including two natural bot games and both long 304-action draw paths. It is
**not** a zero-defect aggregate: one raw mobile run timed out waiting for its
second file chooser after a successful import/underpromotion. Five bounded
mobile repeats passed; a positive trace saw Bend `PickFile`, a browser file
input click, and active transient user activation, but did not explain the
failure. The driver now preserves bounded effect/click state on a future
timeout. Reliable portrait import and responsiveness remain open.

A controlled [gesture-bound Import investigation](docs/evidence/v2-playtest-recovery/README.md#gesture-bound-import-draft-and-controlled-delay)
reproduced a missing chooser after delaying a worker input 6 seconds: Bend
emitted `PickFile`, but the browser input click no longer had transient user
activation. This is one mechanism, not a diagnosis of the earlier raw mobile
timeout. A draft host-side handshake opens the provisional chooser on the
enabled IMPORT gesture and only delivers a chosen file after the corresponding
Bend `PickFile` effect. Separate delayed mouse, touch and keyboard mobile
routes, undelayed defaults/menus/persistence/mobile, deterministic port guards,
and a real cancel/retry/stale-bounds path passed locally. The exact-bound
13-group extended Chrome suite also passed. The draft does not change frozen
Laws and has not yet been published. A subsequent reviewed touch hold/reflow
guard passed three ordered Chrome runs plus a delayed touch import; the full
extended suite predates that last guard. Preserve the original failure and
remeasure reliability after a clean build; GPU-on and reviewed toolchain pin
remain independent gates.

The [Linux CPU-only XRes positive control](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5870229954)
subsequently passed private-cookie status 0 and exact owned-window PID match,
with wrong-cookie denial and owned fixture teardown; its claim was released.
It had no GPU lease/process or app build and does not cure the c30 250 ms
CUDA-on deselection failure. A fresh source-bound device request needs a
separate coherent lease and review after the current browser change is fixed
to an exact revision.

The [clean gesture-bound browser release](docs/evidence/v2-playtest-recovery/README.md#clean-and-hosted-import-handshake)
then built from pushed source `a3a57b9` on the unchanged pristine 2.0.27 pin.
The exact-bound 13 extended groups and focused delayed Import/cancel/reflow
passed locally and again on the [shareable Pages preview](https://haileystorm.github.io/rift-chess-bend2/)
after Pages commit `5ae5636` reported `built`. Live bytes matched all 22 Bend
assets and both original-site baselines. This is a scoped browser transport
and publication gate, not proof that the earlier intermittent timeout had
this cause, owner acceptance, a response-time pass, a GPU-on fix or a 2.0.28
pin amendment. Those objective parts remain open.

The [GPU observer request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5872596195)
followed the CPU-only XRes preflight. It required a fresh coherent
lease and reviewed, source-bound harness, used the retained c30 candidate ELF
only for timing diagnosis, and explicitly forbids relabeling the original
250 ms failure or claiming GPU parity for the new browser source.

Fresh exact-build-bound [cold visual phase samples](docs/evidence/v2-latency-phase/README.md#current-hosted-cold-visual-phase-baseline)
on that hosted version measure the first proxy boot request-to-reply at
3.2–5.7 s in four small variable-load runs, with detailed art another
3.7–8.5 s after the first frame. The driver now records finite initial
worker/port/tree/traversal phases. The sprite helper spends substantial time
in decoding, ground and per-piece composition. Raw first-frame raster
traversal is much smaller than port work. This is diagnostic evidence and leaves
rapid readiness/response-time acceptance open. Do not infer that asset
prewarm or a less-defined sprite filter solves the measured scene work.

The [one-shot c30 GPU observer result](docs/evidence/native-2028-gpu/README.md#c30-observer-timing-result-after-pickup-before-submission)
then saw release pickup near 8 ms and first changed X submission near 250 ms
on a separately traced CUDA-on episode, versus about 173–181 ms submission
for traced CPU/off. An untraced nested ROI remained selected at 250.163 ms
and first changed at 275.156 ms. Its lease and claim closed. This narrows the
delay to after event pickup and before submission, but does not identify
dispatch, CUDA fill/copy or pacing; the original full-window GPU-on gate is
still failed. A further phase probe needs its own reviewed scope and fresh
lease, never an automatic acceptance retry or a claim of current-source
native parity.

A separately reviewed [phase-timing request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5873174640)
now awaits Linux's exact-C/ELF ABI and symbol preflight before any new leased
device episode. It would time identified CUDA calls, DtoH copy, pacing and X
submission around the release, without app/compiler mutation or an automatic
250 ms acceptance retry. The Windows pinned 2.0.27 Base source cannot be
used to assert 2.0.28+006 generated C call order; missing or ambiguous hooks
must stop the diagnostic rather than inventing attribution.

An isolated [Bend-decoded plate-sharing draft](docs/evidence/v2-shared-plate/README.md)
removes the helper's redundant RGA decode, while retaining the original
fallback and exact pixel output. Repaired local real-Chrome/Node gates pass,
including malformed source, rapid supersession, both themes and orbit;
eight paired startup samples suggest an earlier detailed frame without a
measured first-click penalty. The one-time structured clone still costs
hundreds of milliseconds and its transient memory peak is unknown. This is
not yet a clean/public build or a universal responsiveness pass.

The [clean plate-sharing browser release](docs/evidence/v2-shared-plate/README.md#clean-build-and-hosted-preview)
is now published at separate Pages commit `53c96bc` from source `b956606`.
The live byte verifier matched 22 Bend files and both original baselines;
local and hosted exact-bound 13-group Chrome suites and focused malformed
plate/startup cases passed. One hosted detailed-art sample arrived 3.33 s
after the first proxy, but this does not establish a rapid cold-start bound
or solve the source-bound CUDA-on 250 ms failure. The native/Bend input
closure did not change from the last Linux CPU gate; no new native result or
toolchain pin acceptance is inferred.

The exact [pristine 2.0.32 source checkout](docs/evidence/toolchain-2032-scout/README.md#pristine-exact-tag-checkout-and-migration-call-sites-2026-09-28)
confirms the identity-alias fix without moving the 2.0.27 pin. It also
confirms that the frozen v2 checker calls a private/removed compiler API;
the new `--check-only` promise verdict is not the same claim as its BendTT
`--verdict` mathematical check. `NativeCLI.bend` would also interpret the
new `IO.args()` program-path entry as an unknown command unless adapted.
These are source-bound migration duties, not executed 2.0.32 proof/browser/
native gates or authorization to change the compiler target.

The [C30 GPU phase attempt](docs/evidence/native-2028-gpu/README.md#c30-phase-probe-stopped-at-disposable-output-allowlist)
stopped after one CPU-traced episode, before CUDA-off/on, because its strict
output allowlist omitted an empty `data-*` directory created by the retained
observer's own `mkdtemp`. Its exact C/ELF ABI review and XRes auth preflights
passed; the CPU episode exited 0 with 371 bounded rows. The fresh lease was
withdrawn and denied and the exact claim released. This is a harness fixture
defect, not a new GPU timing or parity result. The prior full-window 250 ms
CUDA-on failure remains authoritative; any correction needs exact source
review and fresh one-shot authority, not a blind retry.

A [reviewed allowlist-fixture request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5874204027)
bound the retained CPU trace and exact observer's
owned `mkdtemp` directory before any fresh lease, then permitted one
separately source-bound CPU/off/on phase diagnostic. No CUDA timing or
acceptance was inferred from the request. Its completed result follows.

The [Linux diagnostic result](docs/evidence/native-2028-gpu/README.md#corrected-allowlist-phase-diagnostic-completed-delay-still-unattributed)
ran one CPU-traced/off/on episode under a new narrow lease, then withdrew
the lease, denied further outbox use and released its claim. CUDA-on was
still selected at the nested 250 ms ROI; the changed traced `window_dev`
launch began at 245.067 ms, about 231 ms after four `bend_dev` launches
ended. DtoH took 9.080 ms and changed X submission began 254.378 ms.
The intervening interval is not yet attributed to paced frames, host work
or device synchronization; the exact retained-trace readout is requested
without another run. The original full-window 250 ms GPU-on gate remains
terminal FAIL, with no parity, speedup or default-on acceptance.

The [full hosted rendered matrix](docs/evidence/v2-playtest-recovery/README.md#uninterrupted-24-scenario-hosted-matrix-on-shared-plate-release)
then passed all 24 current scenarios and 685 checks in one exact-build-bound
process with zero defects, including both 304-action draw paths, two natural
bot terminals, import/underpromotion and the prior mobile double-chooser
path. The raw failure from the older build remains preserved; one full pass
does not establish a reliability bound. Move and menu reply p95 were still
about 1.12 s and 0.44 s in small samples, so responsiveness, owner visual
acceptance, native GPU-on parity and the compiler pin remain open.

A [current hosted camera comparison](docs/evidence/v2-piece-proportions/README.md#default-camera-elevation-comparison-on-the-current-preview)
captured refined 67° default and 72°/77° Up variants without changing
source. Steeper pitch modestly alters rank spacing but also hides some wall
depth; the existing default is retained pending owner visual preference.
No screenshot substitutes for that acceptance or for a new-source native
gate after any future camera change.

A [paired Front comparison from both sides](docs/evidence/v2-piece-proportions/README.md#paired-front-views-from-both-sides-current-hosted-build)
now binds six detailed 65°/70°/75° captures to the unchanged hosted build.
At straight Front orientations, 75° separates near pawns from the back rank
more clearly for White and Black, while making wall depth less apparent.
This narrows the visual trade-off but does not change the default or replace
owner acceptance and source-bound native/browser retesting after an edit.
The owner explicitly rejected 75° for Front as too top-down for the depth
lost. Keep the current 65° Front preset; 70° is not an approved replacement.

An optional [current-source menu-layer diagnostic](docs/evidence/v2-latency-phase/README.md#current-source-menu-layer-diagnostic-after-account-resumption)
now separates a retained Preferences scrim, panel and rounded controls in a
pixel-equal Bend specimen. The ten ordinary controls dominate this variable
local Node sample; flat destination controls are cheaper. It is not a
real-Chrome speed improvement, published renderer change or responsiveness
acceptance. Optimize only after paired browser timing and exact visual/input
parity protect the authored button edges.

A [one-pass rounded-button draft](docs/evidence/v2-latency-phase/README.md#rejected-one-pass-rounded-button-trial)
was exact-pixel equal but slower than the existing path both on a simple
background and on the retained Bend Preferences panel (actual-panel p50
188 versus 123 ms for ten backgrounds). All tracked draft code was removed;
the published/browser/native source remains unchanged. This rejects that
optimization, not the outstanding real-browser responsiveness requirement.

The [2.0.28 proof-authority guard](docs/evidence/toolchain-2028-stack/README.md#proof-authority-migration-guard-2026-09-28)
now source-binds the isolated final candidate's empty selected-emit adapter
and positively checks its private ownership guard with reserved-name and
foreign-constructor negative controls. Independent invariant review confirms
that frozen v2 `node-check.mjs` cannot be substituted by the ordinary tool
amendment; a new reviewed proof-authority version must preserve all v2 bytes,
retain whole-book TODO/unsafe/foreign rejection, and, at that checkpoint,
migrate three other active removed-API callers. This diagnostic is not a pin
or proof amendment.

The [candidate proof rejection follow-up](docs/evidence/toolchain-2028-stack/README.md#candidate-proof-rejection-controls-on-a-real-bend-book)
now passes distinct TODO, reachable unsafe and reachable foreign mutations
against a real 497-term Bend book on the reviewed isolated 2.0.28+006 tree.
The aggregate worker uses that same verdict code, but its older 1,584-term
receipt binds the previous runner and does not transfer. A full repeat is
pending fresh Windows memory headroom; no frozen source or canonical pin moved.

The checked verdict has since moved to a [draft versioned proof-authority module](docs/evidence/toolchain-2028-stack/README.md#candidate-proof-rejection-controls-on-a-real-bend-book),
shared by the isolated candidate worker and small-book negative test. Its
source hash is bound before worker import and after completion. This prepares
the actual migration without claiming a frozen v3 manifest or canonical
2.0.28 proof; the revised full aggregate and five-receipt amendment remain.
The bound [fixture-only worker smoke](docs/evidence/toolchain-2028-stack/README.md#candidate-proof-rejection-controls-on-a-real-bend-book)
passed actual worker import/validation/negative controls without changing
source. It is not a substitute for the full aggregate or canonical proof.

A new [draft canonical-pin v3 checker](docs/evidence/toolchain-2028-stack/README.md#draft-canonical-pin-checker-entry-and-seven-case-smoke)
now passes seven real Bend source cases under the still-clean 2.0.27 pin:
positive fixture, frozen graphics proof and indented local import; specific
TODO, reachable unsafe and reachable foreign rejections; and an external
import denied before worker launch. Its success is emitted only after
worker exit and post-run import-closure/pin checks. The aggregate's 56 frozen
local imports passed exact semantic-v2 manifest preflight without running a
proof. This is not the full v2 aggregate,
reviewed v3 freeze, 2.0.28 pin, native GPU or visual acceptance.

The [non-frozen native C emitter migration](docs/evidence/toolchain-2028-stack/README.md#candidate-compatible-native-c-ownership-guard)
now uses the candidate-compatible empty selected-emit guard. Pinned 2.0.27
Bun/Node C parity stayed byte-identical across the change; an isolated
2.0.28+006 fixture also emitted exact source-bound C. This closes one of
those three removed-API call sites, not the large graphical package or pin.
The frozen `tools/loader.ts` and graphics `actual_compiler.mjs` remain.

A [draft graphics v3 compiler adapter](toolchain-patches/graphics-v3/README.md)
now preserves the reviewed v2 tool bytes while using the candidate-compatible
guard in a separate staging path outside the frozen v1/v2 library. Under the clean 2.0.27 pin, old/new
checked closures and promise lists matched, and small selected C and JS
fixtures were byte-identical. The v1 `verify-library --check` also passed all four checks
after the staging path was corrected. The v2 graphics checker remains the active historical caller;
no new library manifest, full library gates or 2.0.28 pin are claimed.

A separate [draft versioned Bun loader](toolchain-patches/loader-v3/README.md)
preserves the frozen semantic-v2 loader while replacing its removed ownership
API call at a new staging path. A pinned-2.0.27 small-fixture comparison gave
byte-identical selected JS and both versions rejected a `PROOF.bend` missing
its sibling Law. The production `--run` wrapper and browser build still select
their existing loaders; the draft is not a 2.0.28 pin or full proof/build gate.

The [browser Import gesture repair](docs/evidence/v2-import-gesture/README.md)
invalidates a held touch immediately on resize, before a pending worker
replan replies, without opening a stale chooser or sending an unpaired release.
The focused fake-host event sequence, existing picker/queue controls, and two
exact-draft-build-bound real-Chrome touch scenarios pass; the original
TypeScript game remains 62/62 with a clean type check. At that draft
checkpoint, a clean hosted release and physical-touchscreen gate remained.

The [clean Import repair publication](docs/evidence/v2-import-gesture/README.md#clean-build-and-hosted-preview)
is now live at separate Pages commit `99fec1f` from source `a92c7e9`.
The live byte verifier matched 22 Bend files and both original baselines;
three exact-build-bound local and hosted touch/mobile scenarios passed with
zero defects. The previous 24-scenario hosted matrix binds older host bytes,
so broad reliability and native GPU-on parity are not inferred from this
focused browser release.

A [one-entry settled-ground cache draft](docs/evidence/v2-ground-cache/README.md)
keeps the cache decision in Bend and preserves the authored sprite filter,
camera and immutable image path. Three paired local real-Chrome samples
matched every canvas pixel at start, after e2–e4 and after Front; the
same-view helper job skipped a roughly 0.6–1.4-second ground phase while a
camera change missed the cache. This does not accelerate the first detailed
frame. A six-scenario Vite-preview matrix had five passes and one offline
failure reproduced on the clean baseline; the candidate persistence path
passed under the project's normal server. NativeV2 source checking passed
with known foreign effects, but current-source Linux C/ELF/GPU gates and
clean hosted publication remain open.

The [read-only Linux C30 trace readout](docs/evidence/native-2028-gpu/README.md#retained-c30-phase-trace-readout-no-paced-intervening-frames)
found no paced unchanged frame or observed blocking host call in the
231.063 ms between four `bend_dev` launches ending and the changed
`window_dev` launch. That interval remains unattributed because CPU
reduction/frame boundaries and device completion were not traced. It is not
a GPU-kernel duration or a visible-present timestamp. No new episode ran;
the original full-window CUDA-on 250 ms failure remains terminal.

The [clean ground-cache local build](docs/evidence/v2-ground-cache/README.md#clean-build-and-full-local-rendered-matrix)
at source `a7895fb` retained the same browser asset version as its paired
draft and passed the uninterrupted 24-scenario, 685-check real-Chrome matrix
with zero defects on the project's normal byte-serving route. Move-class
worker dispatch p95 still measured 910.7 ms in that sample, and first
detailed art was not accelerated. No current-source Linux native package,
GPU-on 250 ms repair, reviewed 2.0.28 pin or hosted cache release is inferred.
