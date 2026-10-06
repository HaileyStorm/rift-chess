# Exact Bend 2.0.35 evaluation

Candidate is official commit `79df8d9c40722ee9507a1e253f283b51025f9d6c`, tree
`0545e537656df3931dbc32e5d0611305ab9b6f6a`, selected at the October 5 cutoff.
Pristine `.artifacts/toolchains/bend-2.0.35-scout` is separate from accepted
2.0.27 `d37909174ebd664338ae3194799a9e0899dedd51`. Neither working tree was
patched. The initial local scout checkout lacked the fetched commit; a distinct
local fetch recovered that source checkout. This is not a pin amendment.

## Source and ABI decisions

| Candidate source seam | Consequence |
| --- | --- |
| bend.ts `name_key`, `parse_qual`, `parse_reso` | Internal names use `ns:name`; public tags use dots. Review adapters that inspect names. |
| comp.ts `js_marshal`, retained issue 1105 | Root-dependent cross-library tags remain; stable dependency preload is required. |
| comp.ts `js_lib(book, mod=false)` | Old roots/exports arguments are incompatible; selected emission must project `book.order` and request module output. |
| bend.ts `book_load` | Native Windows paths still meet POSIX resolution. A bounded source-loader adaptation is required. |
| bend.ts `book_valid(book, done=0)` | Validate the whole loaded book; declaration count is not a checked prefix. |
| effect IDs and `IO.args` | Rebuild effects against `CID(Name)` and migrate all six native argv consumers; older device receipts do not transfer. |
| safe.ts and bendtt.lean | Exact candidate kernel/Lean provenance, verdict and actual mutations remain necessary. Do not trigger fallback builds casually. |

The old alias correction is obsolete. Arity/layout diagnostic rebases are deferred
until needed by a concrete native gate. They are unnecessary for a serial JS first
frame. Balanced runtime parallelism and original GPU acceptance remain unchanged.

## Bounded Windows execution

The pristine two-library probe failed before emission: `../shared/Frame.bend`
resolved to `/Users/Haile/OneDrive/Documents/ChatGPT/shared/Frame.bend`. The first
attempt also encountered cyclic error serialization; its source was preserved.
A distinct reporting-only correction captured the terminal loader failure.

The [source-loader transform](../toolchain-patches/2035/README.md) copies 97 source
files into an ignored derived directory and changes only `bend.ts`. It checks the
exact pristine preimage, inherited Windows helper hash, deterministic postimage
and every copied source byte. Independent source review found no blocker for the
direct-API two-library diagnostic. Broader CLI root semantics and proof-import
identity checks are outside this slice; do not run the copied CLI.

The unchanged three-file tag fixture and stable preload executed through the local
wrapper with `BEND_NO_TELEMETRY=1` and fetch denied. Result:

- Ordinary separate libraries rejected a constructor tag from the other loading
  root (`../shared/Frame.Frame` versus `../../shared/Frame.Frame`).
- Stable dependency preload produced `shared/Frame.Frame`, retained bare exports
  `make` and `plus_one`, and returned `42n` across the library boundary.
- Exit 0, zero network calls, 2492ms elapsed, RSS 118800384 bytes.

This is a finite JS compatibility witness. It is not a game frame, dynamic package
fence matrix, full source check, browser/reference/offline run, proof verdict or
native/device acceptance. No new duplicate tag suite was added.

| Source byte binding | SHA-256 |
| --- | --- |
| Pristine bend.ts | 7deae3693eb896f33c73867081b99d2c6f3ed3b57e77e55eb5f6260840dd0e63 |
| Derived bend.ts | 250c5e2b02e64aff5656f6bea7368ff0a1bcb25e0c1b0fe7661c87e588a3c82e |
| Unchanged comp.ts | 32fb66e09f608ce9e4b173384bcfeec453db8c5bc96650e26ad861bef815a8d9 |
| Unchanged base.bend | c742fae9c49b14f0cc9128429a2c6109364c8a933a142f2c90b9f2e5fd976661 |

Raw probe sources/results are retained under ignored
`.artifacts/bend2/2035-source-probe-20261005/`: `probe.mjs`,
`probe-reporting-fix.mjs`, `result-reporting-fix.json`, `probe-derived-loader.mjs`
and `result-derived-loader.json`. These are explicit one-off diagnostic inputs;
no latest-run selector or cache approval was created.

## Current-source emission and browser execution

The candidate selected emitter uses exact `Comp.js_lib(book, true)` with projected
public-root order, full declarations/constructors and inherited strict selection
screening. It checks the whole loaded book, binds pristine/derived source closure,
local Bun bytes and output readback, and retains each run in a fresh directory.
Root verified both compiler Git trees clean at their exact commits after emission.
All four emitted sequentially with zero network calls:

| Module/run under `.artifacts/bend2/2035-preview/` | Output bytes | Output SHA-256 | Check / emit ms |
| --- | ---: | --- | ---: |
| scene-kwR2KB | 353259 | 3f41c7f16354b1d4678df80e3ce377b2e537b16e5b6ac9a6d431cf4982c269d8 | 10683 / 5078 |
| controller-jhr9Ml | 689632 | 96cb5f639fbc301be370b736e62508380550f313a88da562f1341a7f1cc6b719 | 11759 / 23648 |
| menu-yN96SS | 212551 | 90bb363a280fffb5e2e592ca68cefd5c520092351cdba0e9792efc8200acad04 | 11925 / 25803 |
| chrome-knTtdv | 439648 | e2fba28538b00f6c75a7768c2241d91736494bbd2f429c53611d0dbfd032b4f1 | 27844 / 120532 |

These are unpaired execution timings, not a speedup claim. Chrome emission ended
at RSS6101471232 bytes and free physical RAM541134848 bytes; peaks unmeasured.
Manifest paths/hashes and exact source bindings are selected by
`build-preview.mjs`, never a latest-run lookup or accepted-cache replacement.

Independent source review found the explicit browser constructor mapping correct.
The Bun plugin adapts exact current source literals/sites for host, Worker and
helper. Base Pix/Qua/Con/Nil/Some stay bare; observatory and piece AssetResponse
constructors remain separate. Historical accepted prepared-frame JSON is disabled,
and no accepted bot Worker library is copied into the candidate.

First real Chrome build `369182c034f0e4ddc020`, manifest SHA-256
`04647ae18934e1618caaf4e4f8cb1f987525e083c0864a43e28c6619901b263a`,
sourceRevision `db2ed49a6c6d49bb6f3172554a8f4c9e6dae5760`, sourceDirtytrue:
13 extended checks passed with no browser errors. They establish actual initial
helper refinement, real canvas selection/moves3980 and e7e5/persistence, Undo,
both asset themes, file import/capture/knight promotion, finite bounded PCM,
service-worker-controlled offline reload/helper/move, Shift and portrait input.
Receipt and sixteen captures are retained at
`.artifacts/bend2/2035-preview/scenarios/first-current-ve84s8/`. The first frame
was visually inspected; subjective owner graphics acceptance remains separate.
This is hotseat browser evidence. General bot Workers, orbit gate, full reference,
proof/BendTT/mutations, native/GPU and compiler adoption remain unfinished.

An accepted-host stale-control refinement bug was independently reproduced and
fixed after this run. Candidate bridge was rebound to the new exact host bytes;
fresh build `5daf2d8f756226c79f47` has manifest SHA-256
`69da7f343151adb9f62f3fa2e36a983683b8a01015c643aafabb671de9e5ead1`.
Its build passed; it does not inherit the earlier runtime result automatically.
Independent review added telemetry.ts to the explicit build source list. Fresh
`browser-5DuQh5` has the same content version, manifest SHA-256
`f25626f439258d866edabeef6885f2bed7e6abab335b6bee6524422babb02664`.
An exact-served reference slice completed206 checks: seven scenarios passed
(selection, castling/en passant, promotion, Shift, draw terminals, camera, perf);
menus timed out during volume controls. This preserves actual corrected-host
runtime evidence while leaving menu/full-reference acceptance open. Its retained
summary is `2035-preview/matrix/current-hotseat-slice-20261005/summary.json`.
The adapter only changed explicit UI namespace observations and reference/fixture/
output paths in the existing matrix; its source/result hashes are retained in
`2035-preview/matrix-qualified-tags-20261005.binding.json`.

The user authorizes removing the blanket free-RAM floor when actual work
fits, while leaving Vivaldi open. The accepted current controller source check
passed starting at about 509MiB free; the active emitter has no such floor.
Use bounded, classified execution for the candidate too; preserve its actual
results and reject stale caches. The four candidate executions now establish their
actual memory behavior at the recorded stages; no peak or general memory bound
is claimed. Exact proof, Worker and native/device gates and reviewed chained amendment
still precede any accepted pin change.

## Next substantive gate

The corrected candidate host passed all three actual Chrome refinement race
modes: queued input deferred once; changed view deferred/discarded once; stale
controls discarded twice and Confirm committed one Black resignation. Each
receipt binds the existing script bytes and exact served manifest before/after
under `2035-preview/refinement-race-current-*-20261005.result.json`. The existing
camera reference scenario had already passed11 checks. Candidate menus now passed
18 checks using the shorter equivalent existing overflow fixture, with30 commands
and13 destinations; receipt `matrix/menu-shortest-current-20261005/summary.json`.
The current-source harness adaptation has an exclusive source/result binding;
its initial wrong local manifest path was classified ENOENT before browser launch.

The remaining14 hotseat scenarios subsequently passed165checks. Together with
the seven passing slice scenarios and fresh menu scenario, this establishes22
hotseat scenarios/388checks on that exact manifest. Receipt:
`2035-preview/hotseat-composed-current-20261005.receipt.json`.

## Current bot and connected orbit build

The faithful general Worker port preserves source `@/@N/~` scheduling,
recursive qualified ADTs and48-bit internal numbers/public BigInts. It restores
policy-aware local schema fallback, resolves deferred local-closure names and
preserves lifted arity. Independent exact-source review found no remaining
blocker. Current actual Windows Bun clone/packed receipt
`workers-2035-candidate/diagnostic-6AtJvy/receipt.json` SHA-256
ca60f151157e27026c3fb6421aa15a4386a5db0a221f190e351f91756c67809e
includes order/resume, bounded helper execution, invalid inputs, real cancellation,
malformed reply rejection, subsequent correctness and disposal. It is not a
Linux native result. The full96-function BotAdapter has source binding
c77b72d41763c6d8ece7215e03059a409b6716e6ad53e3ff21439686efbe8552,
balanced recursive AI scheduling and program106a48b57f632299da6ba1453641bef2238497e1304fb0904cd232e1bbb3ecd0.

BoardScene/PieceArt add projected bases/necks and unlifted board contacts to
orbit move/capture pieces. Source checks passed; actual pure candidate emission
passed172 finite pixel checks across holes/hops, corner/perimeter pitch35zoom75,
all six kinds/both sides/low obliques, original opaque contour core/upper extent,
capture and stationary contact. Receipt
`motion-footing-pixelcheck-20261005/receipt.json` SHA-256
1398945b874a3e1622a91e9573ae26000d3c68faca113ab3a82a7d474668ba2d
retains the first overstrict antialias-edge failures. Mixed coverage changes
over the new underlay; corrected checks preserve opaque shape/height. Board
clipping relies on valid clamped square interpolation plus bounded footprint;
it is not a claim for arbitrary outside-board input. Browser capture inspection
shows connected stems/bases and planted contacts; the coarse orbit glyphs remain
visibly simpler than settled atlas art. Owner visual acceptance remains open.

Fresh scene-GRwwGS emits360436bytes SHA-256
1ecb3e0a2cf2f30a0d2441030e616f93963d8b6a81bf73453ea6ff19214aeb85.
Fresh isolated browser-W3Of1Q version19cc1d9f9778fd0436c9 has manifestSHA-256
49ab0485b0d8cca038ed3e6a7fa2347aecc773a0ab7af465a671f535707d30ce,
sourceRevision5ff2f0c/sourceDirtytrue. Independent builder review verified all
selected sources/manifests, installed Bun and exactly five byte-identical bot
artifacts; source-binding.json is excluded from public output.

The exact served build passed all24 scenarios/689checks, no defects, including
both-side bot play and TypeScript-reference replay at each checkpoint. Full
receipt is `2035-preview/matrix/current-bot-footing-full-20261005/summary.json`.
The actual Node module-Worker/controller integration passed in3.415s, with
requiredWitnesses and remoteJobs positive, exact serial choice, staging/tick,
intervening-action/stale/illegal guards, capability fallback, draw decline and
disposal. Existing test was adapted only to exact candidate paths and qualified
UI constructors; binding and output are retained under
`2035-preview/bot-integration-current-20261005.*`.

Actual Chrome online then cold offline reload bot turns passed in11.370s:
3980 then20065 both times, four bot module URLs loaded as200 JavaScript,
service-worker responses present and no errors. Exact manifest binding and
unchanged game/offline/module assertions are retained under
`2035-preview/offline-bot-current-20261005.*`. The original hosted release gate
is unchanged; this isolated candidate is draft/nonadopted.

Three alternating sequential accepted/candidate perf pairs on Windows, Vivaldi
open, each passed18 reference checks. Median request/reply p95: selection
360.4→152.8ms; move1461.8→399.8ms; menu703.4→120.9ms. Orbit varied253.1→328ms.
Receipt `paired-compiler-perf-20261005/paired-result.json` retains all six
timing distributions and exact served bindings. These are small headless browser
samples, not physical-display/native benchmarks or an orbit improvement claim.
The separate same-candidate before/footing pairs each passed18checks. Orbit reply
p95 pairs were296.7→149ms,53.3→44.7ms and38.9→218.3ms; medians53.3→149ms.
The changed sample counts and reversed last pair preserve substantial timing
uncertainty, so no stable orbit cost or speedup is claimed. Receipt:
`paired-compiler-perf-20261005/footing-paired-result.json`. Its first browser
run passed; the reporter then tried to interpret capture/reference accounting
as latency metrics. The report repair retained that run and executed only the
remaining five planned runs. Raw failure, preimage and repair record remain.

The declared baseline was extended with two further alternating pairs, keeping
the first six executions immutable. All ten runs passed18checks each. Across
five accepted/candidate runs, median per-run reply p95 values were:

| Class | Accepted2.0.27 ms | Candidate2.0.35 ms |
| --- | ---: | ---: |
| Hover | 39.4 | 241.6 |
| Selection | 304.4 | 197.4 |
| Move | 1446.1 | 399.8 |
| Orbit | 315 | 307.6 |
| Menu | 703.4 | 97.3 |

Receipt `paired-compiler-perf-20261005/paired-five-result.json` binds all ten
per-run distributions; variable load and hover stalls remain visible. This
supports the targeted move/menu/selection improvement observation without
claiming every class improved, input-to-present budgets, or native performance.

Ten actual fresh Chrome process/context starts alternated accepted and the
current bot+footing candidate, five each. Profile: headless1280x1050/default
theme67degrees, fresh browser cache/storage/service worker; localhost server and
OS file cache warm; Vivaldi open. First playable is the actual canvas ready/idle
mutation; detailed arrival is the host's post-draw refinement event. Two-RAF
timestamps are also retained as rendering proxies, not physical-display proof.

| Startup observation | Accepted median (range) ms | Candidate median (range) ms |
| --- | ---: | ---: |
| First playable | 3600.4 (2860.7–5368.8) | 1459.8 (1164.1–1517.3) |
| Detailed draw | 6748.1 (5884.6–9233.9) | 3266.7 (2678–3777.6) |

The between-frame CDP main Bend Worker JS heap median was40.24MiB accepted and
29.02MiB candidate; this is neither process RSS nor peak. Main-page long tasks
were one179ms accepted and one53ms candidate across the ten starts. Raw timings,
page/Worker heaps, long tasks, exact manifests and final default screenshots:
`2035-preview/cold-starts-20261005/receipt.json`. All ten passed, no errors.
The candidate remains above the2s detailed-arrival planning target; this small
headless profile does not establish constrained-device or owner acceptance.
All ten actual canvases were1024x640 with yaw345/pitch67/zoom115. OS power mode
and background CPU load were not controlled/measured.

## Historical source-only proof preparation

New `core/v3/2035/{binding,aggregate,mutations}.mjs` and README passed syntax,
exact source/compiler binding, six unique frozen anchor checks and compiler-free
Bun Worker parent/child binding parity. Independent static review found no
blocker and matched all four final hashes in
`2035-proof-20261005/source-review-handoff.json` SHA-256
836ac66c9c124dfa57020c06095aa3f0364010a2c6482cbc1695a6c8300f5870.
They derive the complete57-file CHECK cone independently, retain228 source/
evidence and97+97 compiler inputs, and bind four exact positive cones for the
six unchanged semantic negatives. Actual execution requires clean source and
unchanged before/after bindings, with observed bounded Worker exit and retained
uncertain leases. The Windows source-only run has no fixed free-RAM floor;
Linux12GiB/cgroup admissions are untouched. At this preparation stage no actual
CHECK/mutation result was claimed. New producer scope is `source/type/promise`; the compiler namespace
guard is explicit. These distinct source-only schemas do not enter the old
2032 Linux/kernel approval contract or repair its rejected historical receipt.

Linux requests5936734129 and5936397367 each have a retained terminal admission
STOP; no request was replayed. Kernel/Lean, native/device and original GPU
prerequisites remain open. The subsequent Windows source/mutation results are
recorded below. Accepted
2.0.27 pin and frozen Laws are unchanged.

## Actual aggregate stack stop and runtime repair

One full CHECK attempt on clean `0a3213a` loaded and independently validated
the complete 57-file cone, then failed in typechecking with
`Maximum call stack size exceeded` after 4.96 seconds. The Worker exited;
exact clean before/after bindings matched. Namespace and promise stages were
not reached. No positive or negative mutation Worker ran, and no automatic
retry occurred. Parent available RAM was 1.85→1.80 GB; observed parent RSS was
140.6→176.5 MB, without a sampled Worker peak. This was a stack resource failure,
not a type mismatch or RAM admission stop.

Retained classified terminal:
`2035-proof-20261005/aggregate-authorized-0a3213.classified-terminal.json`,
SHA-256 cd6964101dd98281d911b07ae12a797601a82533663d1834ebce37b40301e866.
The accepted dedicated proof wrapper already uses pinned Node 24.12 with a
64 MiB Worker stack because Canonical/RangeBridge exceeded Bun's stack. The
candidate Bun runner had default stack options. Its local help and Worker
implementation inspection established no usable Bun stack-size control.

A distinct compiler-free probe imported the exact derived 2.0.35 Bend/Comp
sources under the existing Node binary, without loading or checking a proof.
Actual parent/Worker runtime identity, empty flags/NODE_OPTIONS, 64 MiB resource
limit readback, unchanged source/compiler bindings and observed exit passed;
network calls were zero. Receipt:
`2035-proof-20261005/node-compatibility-OSc8GR/receipt.json`, SHA-256
f4219de755f4e8618ceba65389438daa10a73ff96c62727a41ab61bbae894dbf.
The backend-owned four-file repair adopts that dedicated proof-wrapper path.
It does not change the generic Bun generation wrapper, accepted runtime
metadata, compiler sources, frozen Laws, Linux admissions or kernel contract.
Full CHECK and mutations require a distinct reviewed, committed source attempt.

The fixed four-file repair passed syntax, both source-only preflights and
compiler-free parent/Worker binding parity. Independent review verified the
four source hashes and all listed receipt hashes and found no blocker. Handoff
`2035-proof-20261005/node-repair-review-aIysqt/review-handoff.json`, SHA-256
7cfe55c4a42186b83350ecb338b85dcef57037177636e289af756ce9fc4bba94.
A prior compiler-free parity attempt caught changing root documentation and
stopped; its raw failure remains. The distinct stable-source run passed.
Those preparation results alone did not establish a full CHECK verdict.

## Actual Node CHECK and six mutation results

The distinct reviewed Node execution passed on clean source
`86594efcf29c50b171eab5ef93b6ad31b01678c1`, tree
`b3c9b27dbe2ff5a5ce35c1f3d709c43070e65ad1`. Full CHECK covered57 modules,
1573 definitions and955 owned declarations, with zero holes. Compiler-owned
namespace and promise guards passed. Six unchanged semantic mutations produced
six actual type-mismatch rejections, with four actual positive checks and two
exact positive reuses. Independent review recomputed each anchor, postimage,
complete cone and positive key and matched the raw records.

Aggregate receipt `2035-proof-20261005/aggregate-E2EnCN/receipt.json`, SHA-256
b62243c115e5eab8a97f62d6e3f8abdb79542cbae89cfc1285e3c8fed1ecca91;
mutation receipt `2035-proof-20261005/mutations-C7DCKL/receipt.json`, SHA-256
661d60f5a8b817bef6e28c5ee558d6aabdf9dfab582a5b83e23c88481a60381f.
Exact before/after binding
254b897805ea12a4affde1ffba24bf4e379852fa86a89eee4b38daf4f2b2fa82
matched228 source/evidence inputs,97+97 compiler files and the pinned Node24.12
binary. Both64MiB stack readbacks matched, all11 Worker exits were observed and
fetches were zero. Aggregate outer time238.800s; mutations322.922s; combined
567.362s. Final handoff `2035-proof-20261005/node-final-source-handoff.json`,
SHA-256 d723f586723e0d1c00ab6b42fd3ee8a646d15562603a81f5db17df248df1085e,
inventories109 retained files; independent review matched every size/hash.

Vivaldi stayed open. Aggregate parent free RAM endpoints were1.539→0.711GB and
completion RSS1.023GB; a separate midrun RSS sample1.436GB is not a peak.
Actual execution needed no fixed free-RAM floor. This proves Windows
source/type/promise acceptance only. The old2032 BendTT consumer still rejects
the2035 schema; kernel, native/device, original GPU and pin adoption remain open.

## Closed pawn/knight prototype, retained without integration

The private closed-mesh prototype emitted after one retained parser failure and
a distinct negative-F32 syntax repair. All 32 representative actual images had
connected support and at most 19 visible faces. A static integer-angle scan
bounded pawn at 15 and knight at 19 visible faces; this is finite evidence.
The actual contact sheet shows changing volume with yaw/pitch, but the knight
loses its horse identity edge-on and in low diagonal views.

The 144-frame dense 32-piece ABBA comparison retained the original 256-pixel,
20-face and relative-cost limits. Default/low/top raster p95 ratios were
3.49/3.34/1.66 against the current contour baseline; the first two failed the
2.5 limit. Hard allocation/RSS bounds passed. A separate four-frame audit
observed four major-GC events; it does not establish GC event counts for the
144 measured frames. These are private emitted-JS measurements, not browser,
native, physical-display or owner visual acceptance.

Receipt `solid-piece-prototype-20261005/receipt.json`, SHA-256
bcef0029f9028ee0bb4cea3f3cad5f594eb1a4a43b412f275d4d67990118ac16,
binds all raw reports, source/compiler/output hashes and the actual sheet.
Production remains unchanged; the writer released only its own private claim.

## Current-bundle extended browser acceptance

The exact draft candidate build19cc1d9f9778fd0436c9 passed13 extended browser
checks in41.592s. The served manifest and all21 local bundle files matched
before/after; no browser errors occurred and browser/context closed normally.
Checks covered themes, import/capture/underpromotion, offline sprite-helper
refinement and a move, portrait, Shift and immediate Shift Undo refinement.
Two actual AudioBufferSourceNode starts accompanied finite24kHz PCM buffers of
4080 and3192 samples, with peaks0.304 and0.211. This qualifies current browser
audio transport, not physical audibility or native PCM.

Receipt `2035-preview/current-extended-c61o8tqx/scenarios/receipt.json`, SHA-256
e440289e636d71a7ccf6c3b43aedc34604861aceb7ea8a55da610c76c12805ff;
terminal SHA-256 f340d5755b53b3324ce8cfc53cd31a23b3dd7b6dd7b279cf9804cf26b97dbb5e.
The artifact remains draft/adoptedfalse, sourceRevision5ff2f0c/sourceDirtytrue.

## Reviewed unarmed2035 kernel consumer

Separate `core/v3/2035/bendtt-gate/` consumes the independently accepted raw
Windows source/mutation receipts without treating them as kernel evidence.
It binds exact relative inventories and clean source ancestry, a separately
approved Linux Node runtime,64MiB Safe Worker with explicit transform flag,
exclusive serialized output and empty out-of-scope list. An approved prebuilt
kernel is invoked directly after observed Worker exit and a second12GiB
full-ancestry cgroup admission; exact stdout/empty stderr/quiescence and retained
uncertain leases reuse existing controls. The old2032 consumer is unchanged.

During preparation all three source/kernel/Linux runtime approvals were null. Eight syntax checks,
actual raw-receipt/57-cone binding and useful pure/synthetic contract checks passed;
independent source review found no blocker and matched all9 files. Handoff
`2035-kernel-20261005/preparation-rn5hpA/handoff.json`, SHA-256
a7c5f47eac06b24aa4c7e66a39870e3023c511a3ecc2d812098c6352e9e223c1.
The single Windows import-only probe passed on clean6711894/tree d88a31c0,
with identical binding93041604... before/after. Actual Bend/Comp/Safe imports and
API typeof checks used pinned Node24.12.0; parent flags were empty, Worker flags
were exactly --experimental-transform-types, both stack readbacks64MiB, fetch0.
Worker exit was observed after9.816s; parent exit0 after20.626s, without timeout
or truncation. The experimental warning remains in the raw receipt. Vivaldi
stayed open; sampled parent free memory885.9→885.1MB had no fixed admission floor.
Receipt `2035-kernel-20261005/import-probe-RspCLx/receipt.json`, SHA256
4b4f299dbad102715ecb936a641fe4da6930dc591d5c9b1cb70d035ba0f532b6;
terminal SHA256271c2bb87836795c56f4612f987f3a9d55c72932ad89d269425ff7c40028d938.
Independent review passed; transcription record
`2035-preview/independent-2035-safe-import-review-20261005.md`, SHA256
184c8af412362a841ef1706fb4228f918a343ca36bec16cddf3d43030d5f2656.
The owning backend released its own consumer claim through the supported tool;
root acquired a fresh three-file claim and records only the already reviewed
Windows source approval, reusing its exact existing descriptor. Kernel and Linux
runtime approvals remain null; default execution still stops before any capture,
admission, Worker or process. No Safe elaboration, kernel verdict, Linux runtime
qualification or adoption is claimed.
The existing contract check passed once with observed exit0/empty stderr,
including default rejection before capture despite the source-only approval.
Independent review accepted the three-file amendment. Contract record SHA256
98280e20a9d420fe9aaf0ca59c3494a597470ac2b4cac1cfdb6dd15913634eb5;
no compiler import, Worker, Safe elaboration or kernel execution occurred.

## Private batch rasterizer results

Reviewed executor2 passed32 predecessor,266 batch and6 public-plan comparisons,
all65,536 decoded pixels each, zero mismatches and immutable plans. Output and
before/after bindings matched; actual exit0, no fetches. Pixel receipt SHA256
7f694164a5d8d650bbafe17f93d484631ff0713d718ae9da4e9ad37ad7031730.
Independent review matched the complete planned schedule and raw observations.

The primary144-frame comparison completed but failed unchanged2.5 raster p95
limits: default2.65258, low2.56143, top1.31327. Whole-render/GC and node ratios
passed. Independent recomputation confirmed the two failures and observed exit1;
receipt SHA256da17287f929cf7d966b3cb268a1a27adbf61a7940793356dd61be8af7a696404.
The distinct predeclared144-frame comparison against the original solid renderer
showed raster p95 ratios0.75044/0.82306/0.77764. Paint-only144 on unchanged
generated plans gave ratios0.83217/0.81589/0.88662. Receipts SHA256
2bcf35f6e205be91a35b8380844c27cfb808d28bc845c9c96398850ba163a620 and
2a42409daf13a69738fcbf717ec37d2b2364c3c9be1e9270a0ea8526a4cb6f74.
All modes retained actual raw GC observer events after delivery; aggregate counts
include requested and natural collections, without per-request attribution.
Hard guards passed; no primary retry, relaxed limit or production integration.
These are private emitted-JS results. The edge-on knight identity problem and
browser/native/physical-display/owner visual acceptance remain separate.

The distinct leaf specialization5 compiled once, preserving the original
binary32 operation order and both positive-zero additions. Its audit5 held
execution on a missing terminal LF in expected F32.max text; metadata-only5a
fixed that expectation without changing source or output. Actual pixel5a passed
570 exact65,536-pixel comparisons and32 raw arithmetic boundary cases; receipt
SHA2566ea7f834d1a389df64c596fcd3f5765d021b66ce0bd6ac20a3ae5366cc8641e9.
Independent review verified raw cases and fixtures. Plan and post-GC assertions
passed; that pixel runner did not persist individual digests/post-GC samples.
Signed-zero/NaN observations apply to the pinned runtime, not native portability.

Actual primary5a completed144 samples/36 warmups but failed unchanged2.5 raster
p95 limits at default3.14766868 and low2.58466338; top1.24416342 passed.
Whole-render/GC, node and hard resource limits passed. Independent raw-sample
recomputation confirmed the failure; receipt SHA256
ee933b58993e062ee3fe9df54f0b7a333aa301557157213fce536af5f82a3c8e.
No retry, limit relaxation or integration. This does not measure5-versus4 speed.

The smaller private tapered knight passed static geometry/source/launcher review,
but its one launch failed before compiler execution because Node rejected two
Windows drive-path ESM imports. Terminal SHA256
d2631ebcc072aff5ef95c1dad7bebb6e916c2d8773c4e214a89c9d7333b7d8d5.
All inputs remained unchanged and owned descendants were quiescent. Distinct
file-URL repair subsequently passed one actual compile on clean7e59354, with
observed exit0, unchanged bindings and fetch0. Generated prototype.js SHA256
be5f26c38dc666e3a6deb5b85a05e47a794d46cd1f95aeb17f29d8ccd8e39975.
The one guarded visual2 run passed72 renders/24 visibility calls and twelve
exact pawn controls. Receipt SHA256
f558b3d30aa14aafd162c53663c997d82364919a3521bfd2cb7c33175ecef872.
Actual knights had11–13 visible faces; renderer hard guards passed. Whole-chain
RSS samples include preflight overhead and are separate from renderer guards.
Root and independent review of lossless crops both HOLD horse identity at
supported opposite/diagonal views and navy contrast. The taper improves volume,
but no cost benchmark, promotion or production integration followed. Final
156-file retained handoff SHA256
af8774dee65bbfbe8d969ab39e430127183ad0a005a7e79bca8536e2150210ac.

## Actual current NativeV2 source pass and C arity rejection

The private full84-project-file plus Base copy applies only the existing reviewed
Look/Scroll event compatibility patch; tracked NativeV2 and upstream stay intact.
The first300s C attempt timed out after reaching compile_book; observed exits,
unchanged inputs and lease absence were retained without an OOM diagnostic.

The separately reviewed600s attempt passed all85-file source/type/IO/namespace
guards,3076 definitions/holes0 and45 exact Base foreign definitions. Its durable
pre-C checkpoint is SHA256
e84e64d3525dbb9ffae87a51e03b1fb619a7f376554bcfb368b9e90cd16da3ab.
Actual checking took10.536361s through the following main-stage entry, including
journal and post-check assertions; C emission began at60.8117826s on the Worker
clock. The compiler then rejected `an arity over 247` at comp.ts2825. This
combines segment parameter width>247 and encoded CID arity>255 without naming
the offender. Continuation width is a source-supported hypothesis, not a finding.

Worker exit0 followed its error payload; parent exit1 after406.864s, with no
timeout or reported OOM. Returned fetch0/actual64MiB stack and exact
before/checkpoint/after bindings matched. No C file or acceptance receipt exists.
Pure C duration was not recorded separately. Independent review verified all29
new files and209 retained first-attempt records; terminal handoff SHA256
8dbf65a98f9cb9660f67a997c6ca37dcb1e5ad92edc6b827cf326a1280acac57.
The next step is existing layout/arity diagnostics, not an unchanged third run.
Vivaldi stayed open and no Windows RAM floor was used. This actual source pass
does not establish C/native/ELF/X11/PCM/restart or toolchain adoption. Linux/kernel
admission and original GPU gates remain unchanged.

## Identified native continuation and source correction

The subsequent native diagnostic identified FID_T[586]=254 in
ui/Actions:offer_answer.by: side1+State125+return128 exceeds247 by7. Same-clock
C-entry→failure294.2094979s includes journal/catch overhead. Full85-file guards,
actual64MiB stack/fetch0, unchanged bindings and observed exits passed;
independent actual review PASS. No C/native readiness follows. Retained handoff
SHA25694499fa5b4333acf78e3206e66493b9f33261f02dd1d552e4a47d2362a33041d.

The source now reads original revision/notice before the decline command;
refinement reads the mobile flag directly without a discarded snapshot.
Fresh controller source checking/emission,48 exact full-packet comparisons and
the existing render-plan check passed. The updated draft browser also passed
actual Chrome refinement race with exact unchanged bundle bytes, errors[] and
awaited browser/server closures. Finite JS receipt SHA256
f243a8b099e7879d585796b0e820e5428b2807207ebd0f50ccaef39c9f927a82;
browser receipt3233f751187f5bd45e0d44e5e0efb9e5c53cd5409f2d21b8ad252dab39705675.
Corrected C layout and any further offenders remain unmeasured; no speed claim.

Both matching bot draw-decline paths now also read the original revision before
the command. Independent source review, fresh controller checking/emission and
68 exact prior/new packet comparisons passed, including both bot modes and
native/browser-style ticks across desktop/portrait. Existing render-plan gate
passed. Receipt SHA256
ed08b316feafd9b7908a291841dacd601bccbcd9d275780efca1e9d7146afa9c.
The earlier source-fix-1 preparation is retained and held without execution;
fresh source-fix-2 must bind the complete fix before another C attempt.

## Complete remaining native width diagnostic

Source-fix-2 ran once on clean058157b6/tree3021365b, using the reviewed
metadata-only formatter with unchanged247/255 limits. Full85-file source,
IO/foreign/namespace guards passed,3076 definitions/holes0/45 foreign entries;
actual Worker64MiB/fetch0 and before/pre-C/after bindings match. The corrected
draw-decline continuations no longer appear in the complete overwidth list.
Exactly two FID segments remain,700/701 in ui/Commands:command_result.finish,
width253/254; zero CID offenders and zero truncation. The first holds
capture1+id1+next125+audible1 alongside a125-word result. The second retains
that result during a1-word continuation. Parent1/Worker0 were observed at
412.4407764s; C-entry→failure343.9586781s includes journal/catch overhead.
No timeout, reported OOM, live lease, C output or acceptance receipt remains.
Final handoff SHA256
5b2e6835ef08bb37b757ef7c632c2d6b2858f82b0ef36c0f31e9ecd0614dd501
binds231 new and586 retained predecessor records; independent actual review PASS.
The terminal collector's Python/Node Windows device-number discrepancy is
retained explicitly; matching bytes/hashes/inodes and actual Node fences stand.

The minimal source correction binds the exact existing storage/audio effect-list
expression before quiet_reminder(next), then passes that effects handle to
S.result. Effects still derive from the pre-reminder State in the same order;
redraw2 and reminder behavior remain. Independent source review PASS; fresh
59-file controller checking/emission passed with fetch0. Current private output
9d158b626a9d7f59079c6be4e85f995c3b2a8c1e208584cc5e1e71df65a9b00f,
manifestb307db3a4806d08f30061d9206a5e2dbadb7e26f1ee4a13ff3182186810b4136.
164 complete prior/current packets and the existing render-plan gate passed;
13 accepted command/effect cases include ordinary moves, capture12745,
resignation, mute and legal staged Shift20825. Receipt SHA256
370040c4d511dc140abcadc94a969c500aae16cc96eadd2cb3756bb3e3ade31f.
The prior failed d7-d5 fixture and raw inspection are retained: both controllers
agreed, and the move was not legal in this Rift layout. The distinct corrected
comparator uses the existing valid queen opening and a current legal capture.

One actual packed Nat48 helper reply11→2^48 now rejects input_shape, with one
interception, closed session, zero active/in-flight work and no local fallback.
Existing clone/packed semantics and plain JS/C byte identity passed in the same
single diagnostic. Handoffa641f438e713119290f39fa5353e5d8c891d5599400ab7a94b1bc73c7172a8ba;
376 bound files unchanged. Fetch denial was active without an instrumented count.
The one necessary bot refresh passed with fetch0 and497 unchanged bindings;
source binding2fb3a8633d629b5703d694dd0bf8a071ce865d1df9957aca1de45fda43613dc2.

Draft bundle4c2d95bba8409ea67364/build18fe4ebc… passed actual Chrome refinement
race and online/cold-offline bot3980/20065. Four exact bot modules returned200
through the service worker; errors[], all served bundle hashes unchanged, both
browsers and the owned ephemeral server closed. Browser receipt SHA256
6a3ea287f17e2685ca4ec9954f7e60ff5c2798288367ecb5e5461c14291f8b1d.
This is current browser behavior, not latency or native acceptance. The subsequent
source-fix-3 result below resolves C-text emission; native build/device, kernel,
GPU and adoption obligations remain separate.

## Complete current-source C-text emission

Exactly one reviewed source-fix-3 attempt on clean
fd607bda4651852b226af72a27ee233ca39e88f7/treea361e9fa passed the complete85-file
NativeV2 source/type/IO/foreign/namespace/order guards and C-text emission.
It checked3076 definitions with zero holes, retained45 Base foreign definitions
and31 C sidecars, used the actual64MiB Worker stack with empty flags/NODE_OPTIONS,
and measured fetch0. Before, pre-C and after bindings match. Vivaldi stayed open;
no Windows RAM floor was imposed. Parent and Worker exits0 were observed, with
no timeout, retry, failure record or remaining lease.

The retained NativeV2.c is14,804,992 bytes, SHA256
b208660ef3a5d7c129cd8b73cb51e09b4e9d77cf857cdce54d7639de7abd62ef.
Receipt SHA2566ca7eacb2c8e4b4b48a6f6cff0c406f0f5299a59bc1e46e303dfcf8754c5fef8;
terminal handoff SHA256
314bad291760706a1d0d71c339f23974d0940a5563309b5d542ab040b88df803.
Independent actual review PASS verifies all232 fresh and821 predecessor records,
current/private project inputs, both97-file original compiler inventories and
the97-file private compiler inventory. Failed and unexecuted predecessors remain.

C-entry-to-post-binding took320.8499252s on the Worker journal clock, including
journal overhead. Worker-result383.1719136s, parent-receipt403.715s and
launcher427.7967624s have different origins; none is pure compiler CPU time or
a peak-memory measurement. The six diagnostic metadata markers are absent from
successful emitted C. Five exact anchor reversals recover the original compiler;
static review confirms unchanged successful lowering, layouts, ordering, balance
and compiler limits. No second unpatched full-C compile or output-byte equality
was measured.

This establishes current-source C text. There is still no C compilation, ELF,
GUI, PCM, Linux/kernel/GPU acceptance or toolchain adoption from this attempt.
Reconcile exact Linux admission and the remaining native/kernel prerequisites
before new execution; do not replay stopped requests or lower their contracts.

## Early-helper disposition

The private repaired scheduling variant passed actual held-asset early hello,
helper-load-failure frame-before-fault and the existing refinement-race checks.
One uninstrumented prior/new startup pair measured playable1042.9→1690.9ms and
detailed2586.9→4885.4ms. It establishes no stable regression, but gives no reason
to retain the change. Exact prior worker/boundary source was restored; all
candidate bundles, observer/injection failures and completed evidence remain.
Actual suffix receipt SHA256
0d9255c3409d2d023fa26c97ccf6dbb2f6fa35793654d148f79d288973304084;
restoration decision SHA256
b37b8681278533430d4745fa8406dc27a20ee259700ffd564b4181e8e18dd254.
No further timing retry or promotion follows. The tapered-knight owner also
released its own private claim after the published handoff; visual HOLD stands.

## Clean package and local WSL preparation

Fresh browser-DcyiMn built from cleana7289f22/tree8451366d, draft/adoptedfalse,
version4c2d95bba8409ea67364/build3ab6c097b1f517ec4d9c4fc4d771d5046f43e07844423ba3d0fd4f2c65ce08cf.
All21 payload files match priorbrowser-ZqUMwh byte-for-byte; onlybuild.json
changed. Terminal4ddfab54214e453cc714fdf7835c91edab8b0306486baa5d1c35ddef16bc95ee;
comparison83e5e20c9c276dad176675b80715a301aa980f4f8d6efb1e147adac52e9671bb.
No new browser execution: previous actual receipts keep their original manifests.

One bounded local WSL read-only probe found Ubuntu/x86_64, Clang18.1.3 and X11
headers/link library, with ALSA development header/library absent. MemAvailable
7,419,156KiB is a sample, not admission/peak evidence. No Linux Node/Lean/leanc,
and no qualifying kernel/cgroup admission. Receipt
 dfad125ceeffd218911b6b026062ce666f7a432d4ef2a71c20d01b2ad10192eb.
Minimal apt simulation selected only libasound2-dev, libasound2-data and
libasound2t64 at1.2.11-1ubuntu0.3, with recommends disabled and no upgrades/removals.
The broader49-package audio-plugin simulation is not selected. Human installation
decision remains pending; no installation or privilege action occurred.

Private prebuilt-C-to-ELF preparation has no RAM floor and performs no Bend
re-emission. Its unknown-owner settlement defect was repaired: a started compiler
without verified ownership cannot be signaled or reported quiescent; both leases
remain. Observed exit and a completed owned-group scan are required for release.
Independent repair review PASS/root105-record readback:
69369a1e3a5a91dd879a889677164672e007c08dbbf9fba9176e8fd13f6eb425;
preparation72d7d7077bc0c77f5cc6c85db2c325afc1cd219ebb3a0831e566712e83cbbdfb.
Six runtime assets+LICENSES and the unchanged existing GUI observer were staged,
with49 exact record readbacks; handoff
98c29bead19dc4986765a8f654ff924a3f8ef10aab005a88d0ead201b8713013.
These remain preparation only. Before one actual link, rebind the then-clean
sourceObserved revision, obtain the package decision and bind post-package Linux
runtime bytes. Named inputs are not exhaustive header/CRT closure. GUI requires
owned-window identification, fresh capture paths, timeout binding and actual
coordinate/alpha picking; same-data restart and routed PCM need separate checks.
WSL was started by the read-only probe; no distro shutdown, compiler/game launch,
GPU/kernel execution or adopted pin follows. Old stopped-request contracts stand.

## Crown-knight actual visual disposition

One private43-face crown draft passed full-book JS checking/emission on clean
a7289f22,43 actual loaded files, fetch0 and observed exits; output01ab5fdfd2550f8320d7eb245458dbdc56d64c628e121b64e200295491e29405.
Exactly one guarded render passed96 calls/72 PPMs/24 tokens/12 unchanged pawn
controls, fetch0 and equal before/after source/output/runtime/root bindings.
Max call15.2327ms, renderer RSS148,430,848B, forced GC13.7181ms and post-GC heap
7,132,272B satisfy unchanged500ms/512MiB/250ms/64MiB guards; these are finite
observations, not a paired performance result. The43-vs23 face cost remains open.

The outer supervisor exited1 constructing its receipt (KeyError
observedParentExit; launcher field observedExit). Original failure is retained.
The actual renderer receipt and launcher exit0 persisted. Exact failure-site
short-circuit evidence substantiates same-Popen launcher exit0 and three empty
known-chain quiescence samples; lost outer elapsed/resource samples stay unknown.
No compiler or renderer retry. Actual handoff
0eb5ea4a44176114892d21c5849bebf58392261a479c5c1a1e43d9dd47e4eeb5
binds155 retained records. Lossless nearest-neighbor sheets keep native pixels:
ivory785b224e86a3a2e3d459c1abe12dfc4ebd7d3947268edf06eb4c1d4dbf9eddc7;
navyb68c2953a1414982223ddf2474a46860478dd5c6a62084500b4e50d99214a171.

Root and independent subjective six-view reviews HOLD:45/35 is strongest,
0/65 is blocky,165/67 remains an unresolved mass,270/67 regresses to a rectangle,
90/67 resembles a horned post and270/90 a short bar. Navy contrast stays weak.
Static closed/wound geometry does not settle appearance. Root verified155 records;
dispositione19328cb48da2fe57060c6304ef673185b359777398c5920d1a20722da3ae246.
No benchmark, integration or promotion; current atlas and all predecessors remain.

## Native ownership preparation and startup transport disposition

The private WSL ownership observer passed bounded independent static review;
root verified 17 retained records. Receipt
`2035-preview/native-ownership-static-review-20261005.json` SHA256
`e142adc384fe6c7694fd603f120fe0893ceafb0f214c236a5f38f410245cb128`
binds the exact owned-window C variant and observer. Removing its unique333-byte
_NET_WM_PID insertion recovers the original successful C emission byte-for-byte.
The variant has a distinct C/ELF identity; it is not a pristine native result.
Window operations require one visible PID-bound client in the owned session,
actual process/ELF identity and retained XID validation. Unknown process state
retains leases. No installation, Clang, GUI, PCM or restart ran. The existing
human ALSA decision remains pending; original preparation packets are retained.
The read-only XRes file probe found no tested header/link-library path; this
is not a display capability query or exhaustive filesystem absence.

A single actual cleanbrowser-DcyiMn Chrome profile measured first-playable1629.6ms,
detail4064ms and refinement chrome6ms. Receipt
`2035-preview/refinement-profile-20261005/receipt.json` SHA256
`497e74a34247a9d2257c047fb0b29c06909beee99c84629c905eb9ddf63ffb1b`
retains existing main/helper timers. Dispatch and acceptance spans include
cloning, scheduling and receiver serialization, not pure cloning costs.
Chrome rebuilding is too small to justify the held controller optimization.
The candidate package has no prepared-ground asset; the retained historical
asset is not current2035 graphics evidence.

A private generic Image DAG forest experiment preserved U32 colors, child order,
object aliases and buffer detachment through actual Node Workers, including a
historical Bend-authored depth9 image plus twelve mask roots. Two successive
four-start alternating Chrome comparisons preserved exact default presented RGBA
pixels. The first implementation regressed detail2740/2794ms to3616/3516ms;
encoding cost867/987ms. One allocation-reduction attempt lowered encoding to304/419ms,
but overall detail improved2761→2290ms in one pair and regressed3358→3603ms in the
other. Neither reached the2s detail target. These warm-file-cache headless samples
with uncontrolled background load do not establish stable speed or current-scene
full-U32 parity, peak memory, physical presentation or native acceptance.

Root rejected activation, restored the existing transport and exact main-worker
bytes, and removed the two unused experimental source/test files through their
owner after byte-verified ignored retention. All bundles, failed collector output,
source variants and proofs remain. The initial collector's BigInt recording error
is separate from the later successful comparisons; it was not retagged as a pass.
Final comparison receipt
`2035-preview/image-transfer-integration-20261005/optimization1-compare-receipt.json`
SHA256`9cbea40209d908dba2cca2f778bd3a4d72b33bd43217b05c6a698878070877d0`;
owned removal receipt
`image-transfer-20261005/rejected-source-removal.json` SHA256
`d886d637567d2218ffeea00e18afe5cc08cdcc379a46cd71a0387c50b0f1aab7`.

The retained product fix rejects a late older helper generation before it can
replace the newer retained plate. A real Worker regression sends old plate77
after newer plate9 and verifies the next current job still uses9. All three
existing helper tests passed. Fresh restored-transport packagebrowser-0od5Mi
(version2e9743410354347015fd, buildc4bc304065576952…) passed one actual Chrome
view/refinement race: deferred1, discarded1, atlasPicktrue, errors0, package
bytes unchanged. Receipt
`2035-preview/image-transfer-integration-20261005/restored-browser-race-receipt.json`
SHA256`6bf73089767b666daf65c535b16dee2cb45e3c9c73ea616a8255b20cb5978df1`.
This package records its actual sourceDirtytrue provenance; prior broad browser
receipts retain their original manifests. Bend caches and frozen laws are unchanged.

