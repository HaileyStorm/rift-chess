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
not compile during bundling or use accepted prepared frame JSON. The current
builder also verifies and packages the isolated2035
[general Worker port](workers/README.md), including its exact diagnostic/source
binding, installed runtime and five public artifact bytes. The source-binding
receipt remains outside the public package. The result is explicitly a draft
candidate with hotseat and bot play; accepted2.0.27 is unchanged.

Run through the repository wrapper, with Vivaldi left open:

```powershell
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2035/emit-selected.mjs --module scene
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2035/build-preview.mjs
```

The builder selects the recorded four runs rather than the newest directory; a
new selection requires explicit byte review. See the evaluation record for the
current24-scenario/689-check Chrome reference result and exact source/build
identities, actual required-helper bot/controller result and cold-offline bot
loading. These are browser/Windows Worker results, not compiler adoption, proof,
native/device or owner graphics acceptance.

The 2026-10-06 KnightR2 integration adds view-bound knight textures and bounded
mask identities/offers so queued inputs and held touches retain the pixels they
actually reference. Current scene/controller/menu emissions passed with the RAM
floor removed. A fresh Chrome emission hit an actual out-of-memory error; its
unchanged retained emission is reused through one reviewed registry transition.
The consumer permits only the three added scene exports at exact old/new registry
hashes, requires all other module/compiler/runtime inputs to match, and records
the current compatibility digest separately from the original emission receipt.
Unknown changes still reject; no historical receipt is rewritten.

The existing host fixture and helper checks passed. A draft integrated package
rendered four actual Chrome views with no page errors or external requests.
One actual Chrome race also passed: while A remained displayed and a genuine
settled B reply was held, the queued A-mask click selected White Knight b1 where
board-only picking would target another square. A remained retained through the
reply; the genuine B refinement deferred and then discarded. Observer setup
failures remain retained separately. Retention pressure still needs its own check.
Knight appearance remains on hold: the foreshortened mesh is weak beside the
existing upright atlas pieces. Performance, native/device results and adoption
remain separate requirements.

### Readable knight artwork and current browser evidence (2026-10-06)

KnightMesh now prepares geometry, culling, depth and alpha with one continuous
artwork basis: yaw30 degrees times sin(real yaw), pitch capped at40 degrees.
Actual board centers retain the real camera. This intentionally upright pose
fits the other atlas pieces; the same posed texture supplies display and picking.
The mesh and materials are unchanged. Independent source review found no blocker;
actual emitted-JS comparison and current default/top captures show readable horse
profiles. This is subjective improvement, not owner WOW or device acceptance.

Only affected scene/controller books were emitted and fully checked. Scene passed
in8.440s, controller in30.372s; current controller JS was byte-identical but its
source binding is fresh. Menu/Chrome sources are unchanged; the previously reviewed
exact Chrome registry compatibility is retained. The final package browser-HGsUqA,
version95918f05bb6f0969fdf2, build manifest SHA-256
f89f4c65b8bc34c961143897b8284bd07f68622e49bbf8eaea3c2f9decce933f,
built in12.855s at de7ce08 with sourceDirty=true. It is not retagged by publication.

Four actual Chrome views passed without page errors in12.936s. The real queued
atlas race passed in11.544s: displayed A345/35/115 mask2/offer3 retained through
the queued White Knight b1 click at462,403; board fallback would target10. Held
B90/90/115 had distinct mask3. A's muzzle point is beyond B's entire source-bounded
alpha including two texels of padding. Genuine refinements deferred/discarded2/2;
A retired after reply with offer4. The earlier .30 reference failed the conservative
exclusion guard and remains preserved; the .31 point passed without weakening it.

The same exact package passed all13 existing extended browser scenarios in33.397s:
both-side moves/persistence, undo consent, two themes, settings/help/new match,
capture/import, knight underpromotion, bounded browser PCM, offline reload/play,
Shift topology/undo refinement and portrait Black selection. Served bytes were
bound to the build manifest; no page/console errors. This is distinct from the
historical24-scenario/689-reference suite. Native PCM/device, pressure8 retention,
broader orbit/motion, stable performance, proofs/adoption and owner WOW remain open.
Owned supervisors observed exit0, closed native handles/Jobs and unchanged source
bindings. Immutable raw evidence is under knight-r2-integration-r2-20261006, with
scenario receipt under current-scenarios-20261006/art-pose-r1; no failed run was erased.

The enrolled host-message lane was also exercised once with a bounded read-only
Rift request983f9f90ffa74f2f8f1d8fca2deadf91, completed on Linux. Seven retained
regular files were stable during independent Linux reads; C/ELF/trace hashes matched
the existing inventory. Emitted gpu_pass calls cuCtxSynchronize, while the retained
tracer has zero hooks for it. No raw artifacts were transferred/rehashed on Windows;
no build, install, GPU lease/run or desktop steering occurred. The original250ms
CUDA-on FAIL and231.063ms unattributed host gap remain unchanged.
