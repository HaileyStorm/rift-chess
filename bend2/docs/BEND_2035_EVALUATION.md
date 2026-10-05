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

## Source-only proof rebase, before execution

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
Linux12GiB/cgroup admissions are untouched. No actual CHECK/mutation result is
claimed yet. New producer scope is `source/type/promise`; the compiler namespace
guard is explicit. These distinct source-only schemas do not enter the old
2032 Linux/kernel approval contract or repair its rejected historical receipt.

Linux requests5936734129 and5936397367 each have a retained terminal admission
STOP; no request was replayed. Corrected proof/kernel/Lean, six actual mutation
Workers, native/device and original GPU prerequisites remain open. Accepted
2.0.27 pin and frozen Laws are unchanged.
