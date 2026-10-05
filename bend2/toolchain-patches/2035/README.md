# Isolated 2.0.35 Windows source-loader candidate

This diagnostic transform targets pristine Bend 2.0.35 commit
`79df8d9c40722ee9507a1e253f283b51025f9d6c`. Root owns review, diagnostic execution
and any adoption decision. The canonical 2.0.27 pin and clean 2.0.35 scout stay
unchanged. This is a bounded local source-loading experiment, not a toolchain
amendment or a general compiler/CLI adapter.

The observed failure was loading `2032/tag-identity/a/Producer.bend`'s
`../shared/Frame.bend` import as `/Users/Haile/OneDrive/Documents/ChatGPT/shared/Frame.bend`:
`realpathSync` returned native backslashes, while the loader sliced `/` and
resolved with `path.posix`. The candidate reuses the exact path containment,
missing-tail resolution, Windows device/inode identity, native relative path,
and cross-volume rejection helpers from the hash-bound
[005 rebase](../005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch).
Only helpers needed by this loading slice are retained.

The loader derives directories and file resolution with native `node:path`,
then converts relative namespace paths to `/`. Its identity map detects cycles
and shares the first loaded namespace across case/hard-link spellings. An
already loaded file's namespace takes precedence, allowing the unchanged
[stable preload](../2032/tag-identity/preload-root.mjs) to assign project-root
names consistently across separate libraries. The upstream `ns:name` internal
name format is preserved; no checker, emitter, arity, layout or Worker patch is
included.

This candidate accepts only local source: named/hash package imports, absolute
import paths, backslash import spelling, lexical cache paths and resolved cache
aliases are denied. Cache rejection also resolves missing suffixes through
existing ancestors. The source download and named-package resolution functions
are removed, so these source-loading paths cannot fetch or populate packages.
`import Base` still resolves the copied compiler's own prelude. The pristine
CLI is copied unchanged for source provenance; do not run it or its publishing,
package, build-cache or telemetry commands through this diagnostic tree. The
root diagnostic must continue using the local wrapper, `BEND_NO_TELEMETRY=1`
and its fetch-denying harness.

Run from the repository root:

```powershell
node --check bend2/toolchain-patches/2035/windows-source-loader.mjs
node bend2/toolchain-patches/2035/windows-source-loader.mjs
node bend2/toolchain-patches/2035/windows-source-loader.mjs --materialize
```

The default command only verifies inputs and computes the transform; when the
derived directory exists it also compares every copied source byte. The last
command creates the ignored
`.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2` source copy
once. Repeated runs require exact inventory and byte equality and never
overwrite a partial or altered tree. Both compiler checkouts must be clean at
their exact commits before and after. Only `bend2/bend.ts` differs in the copy;
all other 96 source files are preserved byte-for-byte. No Git mutation, install,
fetch, publishing, compiler execution or large cache generation occurs.

| Binding | SHA-256 |
| --- | --- |
| Pristine `bend2/bend.ts` | `7deae3693eb896f33c73867081b99d2c6f3ed3b57e77e55eb5f6260840dd0e63` |
| Transformed `bend2/bend.ts` | `250c5e2b02e64aff5656f6bea7368ff0a1bcb25e0c1b0fe7661c87e588a3c82e` |
| Inherited 005 patch | `99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4` |

The transform itself is the reproducible patch artifact: exact preimage,
single-occurrence anchors, inherited helper hash and exact postimage are checked
before output. The existing 2032 patch remains retained provenance for its own
versioned candidate and this helper reuse; it is not an active 2.0.35 stack.

Independent exact-source review found no blocker for the small direct-API probe.
Root then ran the unchanged two-library fixture and stable preload through the
local wrapper with telemetry disabled and fetch denied: ordinary loading roots
rejected the cross-library tag, while stable preload produced
`shared/Frame.Frame` and `plus_one` returned `42n`. Exit 0, zero network calls,
2492ms elapsed and RSS 118800384 bytes. The
[evaluation record](../../docs/BEND_2035_EVALUATION.md) identifies the retained
probe inputs and result. This is a finite JS compatibility witness.

The loader retains the optional `root` argument and forwards it recursively,
but namespace resolution now uses the importer's namespace and native relative
path; arbitrary caller-supplied root semantics are outside this slice. The
unchanged CLI's proof-import identity check is also outside this adaptation.
Review does not authorize running the copied CLI or adopting the candidate pin.
The fixture's 2.0.32 assertions must not be copied as a new 2.0.35 test: the
candidate changed internal naming. Native Windows case/hard-link/cycle and
package-denial coverage, proofs, native/GPU execution and pin adoption remain
separate evidence. Current-source application emission and first hotseat browser
frame have the bounded evidence below. Recheck this candidate at any source or
scope change; retire the derived copy when its diagnostic closes, or replace it
through a separately reviewed broader rebase. Rollback is to stop selecting the
derived path; neither preserved compiler needs restoration.

## Current-source browser preview

`emit-selected.mjs` loads/checks a whole selected book and emits exact public roots
through the unmodified candidate compiler API. Sequential controller, scene, menu
and chrome runs passed. Their immutable manifests bind source/import closure,
pristine/derived compiler files, stable preload, local Bun and output bytes.
Existing strict root/dependency screening is reused; no blanket free-RAM floor
is imposed. Each Worker has a300s bound and a fresh retained run directory.

`browser-tag-boundary.mjs` adapts exact hash-bound browser source literals/sites.
It retains qualified domain identity and distinguishes the two AssetResponse
constructors. Base image/list tags stay bare. It does not rewrite object graphs
or edit accepted ports. `build-preview.mjs` verifies four explicitly selected
manifest/output hashes, current source bindings and exact pristine Git provenance,
then installs both Bun plugins for helper, Worker and host. It packages existing
verified assets into a fresh ignored `2035-preview/browser-*` directory. It does
not compile during bundling, copy accepted bot Workers or use accepted prepared
frame JSON. The resulting build is explicitly a draft hotseat candidate.

Run through the repository wrapper, with Vivaldi left open:

```powershell
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2035/emit-selected.mjs --module scene
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2035/build-preview.mjs
```

The builder selects the recorded four runs rather than the newest directory; a
new selection requires explicit byte review. See the evaluation record for the
13-check real Chrome first-frame/move/import/PCM/offline/portrait result and exact
source/build identities. This is browser evidence, not compiler adoption, proof,
general Worker/native/device or subjective graphics acceptance.
