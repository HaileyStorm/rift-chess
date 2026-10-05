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

Validate the corrected candidate host and explicit orbit/refinement interaction,
then carry current-source reference acceptance and substantive Worker semantics
forward. Linux requests5936734129 and5936397367 each have a retained terminal
admission STOP; no request was replayed. Exact candidate proof/kernel/Lean and
native/device prerequisites remain open. Accepted 2.0.27 pin is unchanged.
