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



## Current-source prepared ground: candidate preview enabled

The current2035 scene/controller caches now independently generated the default
Astral ground using the actual controller boot frame, namespaced constructors
and exported host Nat counters0n/1n. The first numeric-counter assertion failure
is retained. The corrected cached-JS probe exited0 with fetch0 and identical
before/after source/cache/runtime bindings. All262144 full-U32 pixels matched
between Bend's computed tree and independently sampled persisted JSON. Ground
has252929 expanded nodes/depth9 and7,347,974 bytes, SHA256
`7acd8b71c26095d7aa359ceed71073b0924d4ec6290603231c3972af3d485eb9`.
Matching historical bytes do not substitute for this current-source computation.
Worker handoff `prepared-ground-2035-20261005/final/handoff.json` SHA256
`ee502541fd90fe4879251ce887be947e2acd8410e817a2637946d07901a823b2`;
root independently verified all23 inventory records.

Private current-packagebrowser-WrdTQt/versiona917bf6ef7250e6a72b9 used the
existing helper's exact decoded-Ready SHA and Bend ground-key predicate. Two
alternating fresh Chrome pairs preserved exact default presented RGBA pixels.
Baseline playable943.5/1258.2ms became912.4/1066.1ms; detail2004.4/2585.8ms
became1866.5/1961.1ms. Ground152.8/137.9ms became81.5/76.7ms, actual prepared
hit1 in both candidate runs. Comparison receipt
`2035-preview/prepared-ground-integration-20261005/ground-compare-receipt.json`
SHA256`7688e905c8556826e86c89dd68d30d040e322348347ad2d59e2c7c56c1650e76`;
terminal`e40fd30669f6a6da49d4a4dc849e375dd1219d311532de846c91e059385454f1`.
These four headless local-loopback starts had warm filesystem cache and
uncontrolled background load/Vivaldi open. They support enabling this candidate
preview optimization, not stable all-device2s arrival or WAN/physical-display
acceptance. The offline package adds about7.3MB plus bounded metadata.

Actual current Chrome404 and tampered-SHA resources both fell back to Bend with
exact baseline pixels and preparedHit0. Changed yaw330/67 and Stone theme had
exact baseline/candidate pixels and preparedHit0. Controlled offline reload used
verified cached ground bytes with preparedHit1 and exact default pixels.
Acceptance receipt `2035-preview/prepared-ground-integration-20261005/acceptance3-receipt.json`
SHA256`d6e85c28df142b8452b900c4c6d4ff9e934b6a3d16517df308091863a114878b`;
terminal`1c26c0a77ec88e634b47f494051cfe40449c3372fb93f27f35ede115a0273bee`.
The prior probe's nonexistent presentation theme field and subsequent open-camera
panel timeout remain failed receipts. The successful404/tamper prefix was reused
without repeating it. The initial Windows import-path launcher failure started
no Bun and remains separate from the corrected successful build.

Candidate preview builds now enable this path by default; API
`buildPreview2035({preparedGround:false})` or environment
`BEND_2035_PREPARED_GROUND=0` retains the existing computed-ground path. The
builder inventories the emitter/source artwork, hashes derived assets/metadata,
and includes both in service-worker precaching; selected cache bindings remain
verified before/after. No helper transport, Bend source/cache, frozen law,
accepted toolchain pin, native/GPU contract or published TypeScript app changed.


## Clean prepared package and retained ridge-ear study

Fresh default buildbrowser-TlIxnB/versiona917bf6ef7250e6a72b9 binds clean
2f151393/sourceDirtyfalse. Build SHA256
`97167518ef1211dc0681ffe5d7dd68ebf42406889b1e6b338f67243c6cea58f8`;
all23 payload files match the actually testedbrowser-WrdTQt trial byte-for-byte.
Only build provenance differs; prior browser receipts retain their manifests.
Prepared-emitter own-claim release was verified; all19 foreign claims unchanged.

The private `.artifacts/bend2/knight-ear-wedge-20261005/` study retained the
old crown renderer/materials/base and changed only knight geometry. Revision1
stopped before compilation at3 parsed-surface intersections. A separately
authorized v2 advanced I/J/Jinner; static manifold/normal/center and six-view
convex-projection checks passed. Four nonplanar quads remain; A-B-C/A-C-D is an
audit surface subdivision, while the actual renderer uses convex four-edge
quarter-sample clipping. Static arithmetic is not a Bend/F32/render proof.

Exactly one current2035 whole-book check and selected-JS emission passed on
clean2f151393, followed by14 actual guarded local Node renders:6 views×2 knight
colors and2 unchanged pawn controls. The controls matched retained full-U32
pixels exactly; old crown/atlas images were read without rerender/import.
Both owned parent exits0 and known descendant chains settled; source/cache/
compiler/runtime bindings matched before/after and fetch0. No RAM floor,
Vivaldi intervention or retry. Max raster9.106ms, sampled call RSS144,658,432B,
post-GC heap6,348,040B and GC4.810ms remained within existing caps. These
single-piece guard observations are not full-scene/native performance evidence.

Root inspected both lossless six-view sheets and rejected activation:0/65 blunt
mass;45/35 tall crest and weaker former horse profile;165/67 unresolved mass;
270/67 block/thin post and weak notch;90/67 post;270/90 bar/block. Navy contrast
remains weak. This is subjective visual HOLD, despite local guard PASS. No
broader cost run, current-atlas change or adoption followed. Final92 retained
records were independently read back; v1 failure and the harmless post-acquire
collector error remain separate from actual compile/render success.
Final handoff SHA256
`051741355c07799b5ebcf731454e1e7fdceeb1c9dc0331a90199ed70d7a42976`;
compile terminal`3b03001432cd34b1e82f7cc815aa43683e7fb52876472690cacc778cf721e4e1`;
render terminal`97e696760c08b6d1e36d847a522ae872f8d4edefb4b2a5b5f68d625358b07c38`;
root disposition`4774916fb1a80158d7158f6f4d573cf1f0ef5026b70d691bb64f5b7eaa181e85`.

Fresh WSL inventory reports Ubuntu Stopped; no restart/install/game. Earlier
runtime/ALSA/memory samples remain historical. The existing minimal ALSA
installation decision is pending. Passive Coordination read03:15:53Z returned
no new replies; no requests replayed or Linux qualification inferred.

## October6: safe cleanup, retained knight studies and scene lifecycle HOLD

The user requested safe space reclamation while keeping Vivaldi open. Manual
cleanup touched only exact user-local npm _cacache download files:1305 files,
923285427 logical bytes, no errors. All planned paths were independently absent;
own cache sentinel was released through its tool. Installed packages, project,
personal and browser bytes were retained. Result SHA256
`11df837e57fd8a40e1d6ba25407c1bbbebb0a71bc7f48fc6e175483b624002dc`.

Dense paint split executed once with12 full-U32-identical images: retained dense
median23.2822ms versus prepared-paint17.83215ms, all declared guards passed.
This small default-view diagnostic does not close primary144/browser/native cost.
Knight budget-v3 performed one compile and14 guarded renders; root inspected
lossless ivory/navy six-view sheets and held activation for thin opposing views,
weak top identity and navy contrast. Budget-v4 is static only:31Faces/54triangles,
closed planar convex shells,20160 finite double-precision cameras max20/over0.
Independent review passed outside-knight byte preservation; wider flat sides and
ear overlap still need actual pixels. Handoff
`ecb366750e5289bd152bf29712760f52c4999492d2a2bea1a4aa93a396dc5a02`.
No v4 compile/render or atlas promotion; its bare-PID supervisor remains held.

Scene batching emitted once on clean33258f6e:45 loaded sources/1436 definitions,
holes0, Worker0 and100371-byte output
`00438584e47aeecd7696a84ec4e4bbd15b18f182ebc835027b6a7723e0346143`.
The complete attempt remains FAIL/HOLD: parent1 after querying Worker resources
after exit; its sampled PID ancestry falsely attributed older processes.
Root independently reconciled native identities and accepted only the completed
prefix for private diagnostics, not the whole lifecycle. Acceptance
`517e96181f73a795764b67632e528f606928574ec475e0463c04ea8874bdb70c`;
actual emitted61-body audit
`a2ce2c0546812c1e4f72b58cc4a548e3966ee3c19c7378bc3eedb3b32626d28c`.
Quarter sampling, six frounds/both+0, compositing, balanced tree, per-piece culling
and token order were retained. There is no hard20-face renderer clamp; cohort
counts still require checking. No compiler replay occurred.

The distinct repaired diagnostic was authorized once after static review and
root504-file readback. Its supervisor exited1 after4.213s at an unknown candidate
OpenProcess query, before observing Node exit or quiescence. The failed candidate
PID was not recorded. Outer supervisor exit1 was observed after5.238s; this is
not Node exit proof. A208522-byte result exists and was hash-bound without JSON
decoding. One independent native observation later found recorded Node18664 and
conhost16020 absent; absence proves neither observed exit nor descendant settlement.
Both original/new bridge leases are retained. No repeat, signaling, lease release,
parity, performance or native acceptance is inferred. Raw Hold handoff
`2d39b13564dca5f58317464dfe5e9bfa73689be0f22298a8979aa4d30da47f69`;
terminal`8e218254e11e95680413cbe1f995c7b71d1517ed6c3c204e74cd3275e2c94c8d`;
raw undecoded result`52821dd45546d075e8f45475b08a36916d5487173cd5491b0ca4c29522358ca2`.
Bound source/runtime/claims remained exact and checkout clean33258f6e. Future
observers must preserve parent-exit observation despite a census error and retain
the failed candidate identity. Current held sample and predecessor bytes remain
immutable. Full sprint/native/kernel/GPU/adoption requirements remain open.


## Windows job qualification and actual knight v4: October 6

User RAM/space asks are complete: Windows2.5GiB floor removed and full57-file
CHECK/six actual mutations/current C emission passed;923285427logical bytes of
npm download cache reclaimed. Vivaldi remains open. Frozen kernel/Linux12GiB
obligations are separate.

Private process preparationv1 held before execution for circular authorization.
One nativev2 qualifier held on assumed2/3 population counts versus actual3/5.
Distinctv3 instead verified held same-grandchild identity and job membership after
parent exit, actual exits0, checked process handles, protocol/postbinding self-only
observations and checked job closure. One actualv3 passed; terminal
`b0638f369d03fd955b93ba5a13a242239e7dc47cc8c2023215fa104b4417da5d`,
root readback `d4d2442a5ad3031c81dfd57f8d42628240568638b25b058437189adf9bde5467`.
Job assignment precedes target CreateProcess, without kill-on-close, breakaway,
PID census or signaling. Counts are descriptive; service/WMI coverage is unproved.
Old failures remain retained; this does not settle the held scene diagnostic.

One later launch failed before Bun on a packet read from the output directory;
actual parent/outer exit and job settlement were observed. Raw failure handoff
`0044fecaea358ba467fd3a9ee62f1e7c7ad54903754faeb33809282060028da1` retained.
A fresh paths-v1 source/output mapping repair received independent five-runner
review and exact input readback. On clean7bb49ee5/tree7571ec0d, one actual Bun
whole-book validation and selected JS emission passed:43sources/fetch0/131302B JS
`663bbd2acad55c8a8ef29130cfecf91ee40918518d6d2a3251eb9cf041e87687`.
Compiler5.407s/outer16.520s; minimum sampled freeRAM1539620864B/max jobcommit
782995456B (not RSS). Compile handoff
`3991e754add011e0950a6d8d828d02a8b88e5957960d6fd2234e4e7bbbbaec44`;
root403source/20raw-file readback
`dbad709c34b19140f55987b299fc26fafc5fd8673b50babad788deddab207bb8`.

One separately authorized14raster/14paired-count diagnostic passed with2exact
full-U32 pawn controls, six knight counts17/16/18/12/14/12 and fetch0.
Unchanged caps held: max call18.93ms/RSS147873792B/post-GC heap6303768B/GC10.44ms.
Actual parent/outerexit0, owned settlement/checked handles and406before/after
bindings passed. Visual handoff
`8c30024493d25a25457b8be93e0c99f5107c052145d869c9837b5c151b861608`,
root readback `643185c1ddeea415b4e0bd9d74f2fb7198d625e4526b7f79d50400e305c52645`.
Selected views do not prove every generated-F32 camera or primary cost workload.

One lossless five-column assembly passed:94inputs/60exact crop+nearest6x checks,
570x1074 images/outerexit0/4.807s/no new render or retouch. Handoff
`70c61be586779d549c980ac990252feb96af158ab6417b86d074589a07a27716`.
Root actually viewed ivory345592c1c8f01e6535a758b105dca0ad23fcecda1f8dbf52387a7f1ab97bb361
and navy2d503a0a6620f3f8459bd4f325c60b7916a112a3c5f82ad72017c961fa41d1de.
Root and independent orbit reviewer subjectiveHOLD:45/35 is fuller than v3,
but cardinal/top views remain rectangular posts,165/67 a rear bulb and navy
anatomy low contrast. Current atlas unchanged; no cost trial/promotion.
Root disposition `4b4f54f02090730b190128bed6930949bb77d069ac6a24b198dd1df2fe3a4757`.
Next artwork work needs anatomical separation/topology and contrast, rather than
width-only variants. Actual results, failed attempts and owning claims retained.

Full sprint remains active: native ALSA decision/kernel/proof/original GPU,
stable performance/device/owner graphics, ignored-byte recovery and reviewed
amendment/adoption remain open. No WSL restart/install/ELF/GUI/PCM or cross-host
permission is inferred; scene rawHOLD remains unread/both leases retained.


## Historical hover attribution: October 6

One observer-only run reused the retained browser-5DuQh5 package, version
5daf2d8f756226c79f47, on clean21b90950; the historical package source was not
rebuilt or retagged. Preparation preserved two prior collector revisions and a
pre-execution timing HOLD. Revised supervision used absolute entry deadlines
75/80/89 seconds within90 seconds, with unchanged native job adapter/protocol.
Independent narrow review passed; one boot/context/twelve pointer moves ran.

Actual Chrome154.0.8037.98 completed all12hovers with no page/console errors or
external requests. Slowest reply37ms included24.2ms dispatch and10.6ms transfer;
unpartitioned time2.2ms. Initial sprite refinement finished before every hover,
so neither helper-send-to-acceptance nor acceptance-to-receipt overlapped the
slowest row. The earlier queue stall was not reproduced. This small historical
sample does not prove its cause, a fix, current-source performance or physical
presentation. No repeated cohort is planned on unchanged inputs.

Actual same-Popen parent/outer exits0, postbinding job self-only, checked process
and job closes, no observer errors and exact before/after bindings passed.
Supervisor7.924s/outer8.546s. Result
`5a4800afee9ab3fca5df27b1e2aa78906313c89392f83ca3e835e5aac0be74c7`;
terminal `5b1b33599576cad2e59f63fadccc0172e8159cae4d01028aca45565d64c2594f`;
root readback `3adf26da469656106dd91bd3ef86fb158a39a2cebe8c316f7b0c78f741b041e9`.
Exact package17files and13observer/runtime inputs remained bound. No signal or
retry occurred. Full sprint remains active; knight structural/material work,
held scene, native/kernel/original GPU and amendment/adoption remain open.


## Headless native CPU parity and knight anatomy: October 6

On clean source4311c6f5/treebf914c79, one current2.0.35 headless
NativePixelsCpu emission passed whole-book validation (done0,858definitions,
no holes) and produced C503848B/fa795656 and JS103608B/ee7ea36d. This
31-Bend-file fixture renders1024pixels without Window or Audio effects.
An initial Windows observer stopped before Node on an instantaneous job-count
assumption; its failure remains retained. A distinct bounded self-only polling
repair ran once and passed with actual exits0, checked handles and unchanged
source/runtime inputs. Root emission readback71857eb6 is separate from native
execution. No Windows free-RAM floor or upstream compiler patch was introduced.

Actual read-only WSL inventory started Ubuntu and observed clang18. A narrow
Linux supervisor ownership/retained-exit defect was repaired before native
execution. One actual clang build then emitted an x86-64 ELF180256B/5c6ef650,
followed by one-thread and four-thread runs with GPU off. Each owned process
exited0 and its session settled; Windows bridge/outer exits0 and checked handles
passed. Build sampled RSS peaked201490432B; native runs were too brief for a
peak sample. RLIMIT_AS20GiB allows the compiler runtime's virtual reservations;
512MiB sampled session RSS was an observer guard, not a kernel physical cap.
No package installation, GUI, PCM, full-game or kernel/GPU acceptance follows.

One separately authorized finite comparison checked all2048 native U32 pixels
(1024 per thread count) against the JS serial reference, plus1024 JS CPU-schedule
comparisons. All matched; fetch0, actual Node exit0/checked close and exact
before/after input/runtime/source bindings passed. Comparison
`21d2145979909362d5f8c624ae0c2e385243a909a47cb6af496a67f9aa23c08f`;
native settlement
`cc0d5c2a2dbad9110d342dbe33de0203b927858090819d4c3c8785649ce22208`;
root comparison readback
`41aef21f44516ebccc574d5dab52f502a565d8ee2cf467142fd3c73e3de19069`.
All prior failures and owned leases remain retained; no native rerun occurred.

Private knight v5 retained its initial exact-coordinate serialization failure.
A formatter-only successor passed closed-shell geometry and20160 finite double
cameras/max20visible faces. The material helper was corrected before compiler
execution to use Bool.pick. One actual43-source compile emitted132042B/112a52f4;
one14paired raster/count run passed (max18visible faces and two exact pawn
controls). Five-column lossless sheets used80inputs/70exact pixel-copy guards.
Root and independent orbit reviewer actually viewed both: navy contrast and
profile improved, but cardinal/top identity and the rear165 silhouette remained
weak. Subjective HOLD; current atlas unchanged, no cost trial or promotion.
Root visual readback6f697830 and dispositiona742d205 retain the actual evidence.

Source projection review found that the .48-square base dominates high-pitch
images: at pitch67/physical scale22.5 its depth contributes about9.94screen pixels,
while its .14height contributes about1.23. No renderer mismatch was found. V6
changes only six constant vertical square-base faces from halfwidth/depth.24
to.16; body25faces, ears, all31normal literals, materials and outside-knight bytes
remain exact. One narrow geometry validation passed (31faces/54triangles, both
closed shells/Euler2/positive volume). No repeated camera sweep was needed for
unchanged normals. Rearfoot clearance.01model units remains a raster-review risk.

One actual v6 compile emitted131990B/8ca8eee7 after43-source validation; one
14paired render/count run passed with counts17/16/18/10/18/16 and two exact pawn
controls. Max raster19.02ms/RSS150863872B/post-GC heap6212280B/GC6.54ms/fetch0.
Actual parent/outer exits0, postbinding job self-only, checked handles and source
before/after equality passed. These are selected-view local emitted-JS diagnostics,
not the primary cost workload or browser/native presentation acceptance.
Root visual readback
`9195161ccace05cb82d8fdc6d2fdc2bfc6cd78020079e4a72179ac2e8145ebd8`.

V6 lossless five-column assembly passed with80exact inputs,70PPMs and60
crop/nearest6x pixel-copy guards. Both570x1062 sheets were actually viewed by
root and the independent orbit reviewer. Narrower footing is a material visual
improvement, with no obvious detached foot or gap in supplied crops. Frontal
narrowness, overhead height loss and rear165 foreshortening are plausible3D
projection. Overall subjective HOLD remains: front/top cheek-muzzle-ear
separation is weak, and navy face/neck planes merge. Retain this footing for
further head cross-section work at256px; no further base shrinking/taller-ear
variant or atlas/cost promotion is authorized here. Assembly handoff
`b98319262ee5c023b847bf1d899374db4f6192c10f1a03d25974344e9e67da52`.

The next meaningful native game test is the existing NativeCLI move/save/restart
scenario. Source review caught a real2.0.35 boundary change: IO.args includes
the invoked program, while production NativeCLI dispatches it unchanged. The
existing Args2032 helper removes exactly one nonempty program item. A private
2035entry preparation reuses that helper and current rules/save/dispatch without
patching productionCLI or the pristine compiler; actual emission and native
scenario remain unrun. Minimal ALSA decision, NativeV2 GUI/PCM/same-save restart,
correct kernel authority, originalGPU, stabledevice/owner graphics, ignored-byte
recovery and reviewed amendment/adoption remain open. Full Goal stays active.


### October 6: actual CLI save/restart and v7 head geometry

These cohorts bind clean `9867ad198712f262d0c97bd484a3727d2806d4db` /
tree `c9ce93233a33c8907f40abfc0601ec0059620d69`. Accepted 2.0.27, pristine
compiler/Laws and production CLI remain unchanged. The private 17-line 2.0.35
entry reuses Args2032 to strip exactly one invoked-program argument, then calls
current CLI rules/save/dispatch. One checked emission passed: 18 loaded files,
1,208 definitions, zero holes, IO main, one whole-book check, fetches 0 and a
64 MiB Worker stack. C is 2,239,656 B/d8d6d80d; reference JS 260,122 B/44ab008c.
Launcher, Node and Worker exited 0; handles closed, Job settled to self-only and
source/runtime bindings matched. A post-emission collector assertion incorrectly
expected a pure-main macro for IO main; that failure is retained. The emitted
main actually uses io_loop. No compiler replay occurred. Root emission readback
`0bb4ded3ff0867138d1bc5b5a685e8a7469ac198d844c51b0f24c648b4ac558c`.

One Ubuntu clang18 build produced ELF64/x86-64, 1,882,584 B/aea7225c, needing
libc/libm. Six fresh processes ran new B prompt, move3980, show, repeat3980,
undo confirm and show, sharing only a fresh isolated save directory. Build and
all native processes exited 0 with owned sessions quiescent; Windows bridge and
outer exited 0 with checked process/Job closes and self-only settlement. Native
elapsed 83.43s, outer 101.49s. Sampled RSS peaked 396,898,304 B for the build and
3,014,656 B for native processes; these are samples, not hard physical caps. No
free-RAM floor, installation or GPU use. Root verified 75 raw records and exact
source/runtime bindings; show/rejection preserved both save slots byte-for-byte.
Root native readback
`519abbeedf4ddef7a10752d808a1d435fd09129981dddf4472215bb573b62ca7`.

One current-JS/portable-journal comparison passed in 7.69s, actual Node exit 0,
checked handle close, empty raw logs, fetches 0 and exact bindings. All six
outputs matched; sequences were 1,2,2,2,3,3 and revisions 0,1,1,1,2,2. Move
expected0/action3980 survived a fresh reload; repeating it on Black's turn was
rejected without save changes. Undo expected1 remained in the second reload's
journal and restored the complete initial rendered board. A launcher path-string
assertion failed before Popen; that failure is retained, and the prepared argv
was used verbatim for the single actual comparison. Root verified nine records.
Root comparison readback
`2444a9a8c47f61d87d7211dc27fcb310494639f63391ebf3589ec844c77cb634`.
This finite CLI scenario does not establish NativeV2 GUI/PCM/restart, kernel,
GPU or production adoption. All claims, leases and failed samples remain retained.

V7 changes the private head to a short broad muzzle and recessed wider ear
crown, preserving v6's six base faces, material, lower contact, topology and
outside-knight bytes. One source generation and one finite static audit exited
0 with checked handles and eight exact input bindings. Geometry remains 25 body
plus six base faces/54 triangles, two closed Euler-2 shells with positive volume;
no self intersections, nonplanar quads, projection failures or unexpected body/base
intersections. All 20,160 integer cameras stayed within the unchanged cap20,
maximum19; six selected counts 17/16/19/12/14/13. Prototype fda5af7d and actual
handoff 2585f4f2 are retained. Root verified 16 output records; static readback
807b923b2c4f0f6e41b09e5f8cd5d6db6a97c86335a7659644838de6ddefacd6. This is double-precision static geometry, not actual F32/raster or visual
acceptance. Compile/render remain unrun, head/navy identity unproven and current
atlas unchanged. Next prepare the existing bounded compile/render cohort without
requalifying the unchanged supervision protocol.

Full Goal remains active. Pending minimal ALSA decision, NativeV2 GUI/PCM and
same-save restart, correct kernel authority, original GPU acceptance, stable
device/owner graphics, ignored-byte recovery, host onboarding and reviewed chained
amendment/adoption remain open.


## October 6 v7 rendered head review and exact source-lineage reconciliation

V7's one actual checked emission passed on clean390865dc/tree17d9c6bb:
43 loaded files, JS131936B/f076246b, fetch0, observed exits0, checked closes,
self-only Job settlement and exact84before/after input bindings. Observed Job
commit peaked771506176B; no free-RAM floor. Root24-record readback19c27cfc.
The first visual launch failed before Job creation or any render because root's
authorization omitted three compile hashes. Its exit1, checked closes and all
failure bytes remain immutable in2951f660. A separately reviewed routing-only
renewal21da2a3a supplied those hashes and continued the unused workload once;
original supervision/workload/qualification inputs were preserved, with no
compiler or geometry replay.

Actual14render/count pairs then passed, including two exact pawn controls.
Six knight counts17/16/19/12/14/13 remained under cap20; fetch0, exits0,
checked closes, quiescent/self-only Job and118exact input bindings passed.
Max raster41.31ms/RSS151977984B/post-GC heap6921584B/GC13.81ms; min observed
free RAM1414119424B. These are bounded local observations, not a benchmark.
Root38-record readbackcf9c39b0. One lossless atlas/v6/v7 sheet assembly passed
53inputs/42retained PPMs/36crop-and-nearest6copy checks, exit0 and checked close.
Actual assembly handoffed1118ee/receipt84bc8f07; no rerender or retouch.

Root and orbit independently viewed both actual sheets (ivorya4182ac9,
navy537f4fe3): overall subjective HOLD. V7 improves270/67 cheek/muzzle width,
but90/67's broad flat crown reads as a T-cap, and navy head planes still merge.
The narrower v6 footing remains useful with no obvious detached join. Expected
rear foreshortening and overhead height loss are not defects. Next taper/chamfer
the forehead-cheek-crown transition within the face budget, preserving short
separated ears. No current-atlas change, cost acceptance or promotion.

A separate read-only audit found that the accepted aggregate's critical proof,
source and compiler bytes still match, but the mutable consumer's ancestry
allowlist rejects eleven later UI/browser-preparation/diagnostic paths. The
independently reviewed lineage record0cd458ed binds aggregate86594efc and
reviewed390865dc/tree17d9c6bb, exact statuses and before/after Git blobs.
The consumer accepts only these reviewed blobs at HEAD; later changes to them
fail closed. Unknown paths retain the original restrictions. Critical Git blobs,
source/evidence hashes, compiler equality, frozen verification and full57-file
closure remain mandatory. The new record joins consumer provenance; this is
mutable tooling outside frozen Laws. Kernel/Linux approvals remain null and both
12GiB admissions remain unchanged. Publication requires one actual clean local
source-capture readback, with no CHECK, Safe or kernel rerun.

Full Goal remains active; native GUI/PCM/restart, correct kernel authority,
original GPU, stable performance/device/owner acceptance, recovery/onboarding and
reviewed chained amendment/adoption remain open.

## October 6: inward crown candidate, actual low-RAM execution

Private V8 changes only M to(-.02,0,.895) and the two tips to(-.06,+/-.065,1.10).
Other v7 vertices/profile/widths/topology/materials, v6 footing and all outside
bytes remain exact. One generation and finite geometry audit passed:31faces,
54triangles, two connected Euler-2 positive-volume shells; no intersection,
nonplanarity or projection failures. All20,160 integer cameras stayed within the
unchanged20face cap(max20/over0). Static handoff576c69a7/root47983ac8; this is
parsed-source double precision, separate from actual Bend/F32 raster evidence.

One checked compile passed43loaded files and84current bindings; JS5c81da2f,
result86784f09, supervisorcbceb452, roota572f991. Whole-book check2812ms,
compiler5788ms; peakJobCommit777,723,904B/minFreeRAM883,470,336B. No RAM floor,
fetches0, clean18f70971/treea780bd43 before/after, observed exits0, checked
closes, owned Job self-only settlement and descendant quiescence passed.

Four targeted knights at90/67 and270/90, both colors, passed; eight remaining
knights at0/65,45/35,165/67,270/67 then passed from the same exact JS. Twelve
unique renders/twelve paired actual counts, no repeated completed views/pawns/
compile/native qualification. Counts16/15/18/14/16/13; each cohort stayed within
raster500ms/RSS512MiB/post-GC64MiB/GC250ms/cap20. Targeted max34.45ms and
suffix13.90ms; minimum free RAM697,815,040B. Actual handoffs6bd2da25/5a772439,
rootd6dae21e/1f5e5b48. These finite local samples do not establish benchmarks.

Lossless three-column atlas/v7/v8 sheets passed12+24actual PPM bindings and
12+24crop-copy guards; nearest6 only, no repaint/rerender. Root and orbit viewed
both colors in both cohorts. Narrow subjective PASS: wide T-cap/lateral bar
removed, short separated ivory peaks at90/67, footing remains connected.
Overall HOLD:0/65 and45/35 short ears merge more into the crown, weakening the
previously stronger horse cues;270/67 becomes columnar; navy anatomical planes
remain weak. Keep inward spacing/recess/footing and recover a distinct short
profile ear without restoring the bar. Dispositions3b7c661b/d455de2f; no atlas
promotion or cost acceptance.

Read-only WSL revalidation observed Ubuntu Stopped, exit0/checkedclose;
no guest inventory/start/install. Handoff3d708eef. Minimal ALSA decision remains
pending. Earlier clean18f proof-source captureabb7a093 passed full57closure/
11reviewed noncritical blobs/fetch0; kernel/Linux approvals remain null and both
12GiB admissions unchanged. Full native GUI/PCM/restart, kernel, original GPU,
stable performance/device/owner, recovery/onboarding and reviewed adoption remain
open. Goal active and unbudgeted; Vivaldi untouched.

## October 6: profile-ear discrimination and actual Ubuntu prerequisites

Private V9 raises only the two V8 tips from z1.10 to1.13; x/y, recessed roof,
other vertices, materials, connectivity and footing remain exact. One generation
and finite audit passed31faces/54triangles,20,160cameras/max20/over0, with no
intersection/nonplanarity/projection failures. Handoff41201ec3/root94920105.
One checked compile passed84current bindings/43loaded files, JSed6bd985,
result5d16eee4/supervisor7cba7942; rootb1db7d70. Check3581ms/compiler6827ms,
peakJobCommit697184256B/minFreeRAM1326092288B. All exits0, checked closes,
Jobself-only/quiescence, exact clean d4007804/tree75c5941d and fetch0 passed.

Four actual knight renders at0/65 and45/35, both colors, passed four paired
visible counts15, unchanged runtime caps and98current bindings. No pawns,
completed-view replay, recompile or new native qualification. Handoffbaeebeeb,
result3025da93/supervisor131694f5/root559810cf. Peaks15.20ms/RSS153382912B/
post-GC6024560B/GC7.74ms; minFreeRAM1369833472B. These finite local samples
are separate from stable performance or native acceptance.

Lossless atlas/v7/v8/v9 profile sheets verified16actual PPM bindings and16copy
guards; nearest6 only, no repaint/rerender. Receipt718fb27b; root disposition
57a6fa17. Root and orbit viewed both colors: intended profile-ear cue HOLD.
V9 looks nearly unchanged fromV8; V7 has the stronger projecting ear. Neck,
muzzle and45/35 footing contact remain intact. Navy planes still merge.
No further V9 angles or promotion; stronger back-tip source projection is next.

Read-only browser continuity passed488unique hashed paths, reconstructed four
selected bindings, compiler/bot/boundary/assets and all23payload hashes. Root
also compared all23payloads byte-for-byte to actual-tested browser-WrdTQt.
Retained build97167518/versiona917bf6ef7250e6a72b9 still binds clean2f151393;
only five proof/documentation paths changed since it. Root78a4fe4e. No rebuild,
test replay or relabeling of the historical actual browser runtime cohort.

One authorized Ubuntu inventory started the stopped existing distro and left it
running. Observed WSL client exits0 and checked closes, no installation/retry.
Clang18.1.3 is installed; the three named ALSA packages/header/library are absent.
Default PATH had no Node/Lean. A distinct exact-path readback found installed
native ELF Node24.6.0 at/home/hailey/.nvm/versions/node/v24.6.0/bin/node,
SHAe943ee9282bef08233665cb71cc57a9f5794bbe70a4822b38e60e394c15979e2.
Exact Lean4.34 and2035kernel cache paths are missing. Inventories2dacc850/
a78196cc, rootf70260bf/1a1c456c. Sampled7,413,988KiB MemAvailable is not an
admission: init-cgroup namespace/ancestry visibility was incomplete. The installed
Node permits a no-install import-only preparation candidate; it is not runtime
approval. Minimal ALSA installation question remains pending.

Full Goal remains active. Safe elaboration/kernel verdict, native GUI/PCM/restart,
original GPU250ms acceptance, stable/device/owner acceptance, recovery/onboarding
and reviewed chained adoption remain open. Kernel/Linux approvals remain null;
12GiB kernel admissions and immutable Laws/pins remain unchanged. Vivaldi open.
