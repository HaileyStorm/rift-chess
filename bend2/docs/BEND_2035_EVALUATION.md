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

## Next substantive gate

Adapt the existing selected emitter to this exact direct API and common preload,
then emit the four current-source modules sequentially with one compiler/source
binding. Reuse the cache-only Worker/helper and dedicated preview seam. Require
actual first frame, persisted 3980, orbit/refinement, portrait and no Worker errors,
then full current reference/offline acceptance. The user authorizes removing the blanket free-RAM floor when actual work
fits, while leaving Vivaldi open. The accepted current controller source check
passed starting at about 509MiB free; the active emitter has no such floor.
Use bounded, classified execution for the candidate too; preserve its actual
results and reject stale caches. This accepted-pin check does not prove candidate
2.0.35 memory behavior. Exact proof, Worker and native/device gates and reviewed chained amendment
still precede any accepted pin change.
