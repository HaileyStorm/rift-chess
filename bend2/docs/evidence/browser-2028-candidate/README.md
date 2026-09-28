# Disposable 2.0.28 browser candidate: bounded hotseat smoke

The authoritative browser preview remains Bend 2.0.27. A separate draft
2.0.28 candidate was built under the ignored nonce root
`.artifacts/bend2/toolchain-patches/browser-2028-candidate/run-1790518968345-22fe6f9b-e1da-4c75-b597-7e7be5cf8bec/`.
Its `dist/build.json` is explicitly `candidate: true`, `draft: true`,
`sourceDirty: true`, version `fa57f68c0bfda51e116e`, from main source
revision `4e4afbb86c6efdf8bb42d1135257c2be9b62ac0e`. It is not hosted.
The browser build has no BotAdapter worker package; bot play is unavailable
in this candidate and was not tested.

The [candidate-only build driver](../../../toolchain-patches/006-alias-equality/browser-candidate-build-2028.ts)
copies the recorded 2.0.28 compiler stack to its private directory and
applies the exact tracked 006 alias patch there. It neither edits the clean
2.0.27 pin nor invokes the normal builder or writes the normal selected-module,
worker-library or browser-dist outputs. It emits Controller, BoardScene and
MenuAA separately, uses the [in-memory ABI bridge](../../../toolchain-patches/006-alias-equality/browser-abi-transform-2028.ts)
for the worker and sprite helper, verifies source/asset hashes, and records
16 static file hashes. Its successful receipt binds 96 source inputs, compiler
file maps, patch bytes, transformed source hashes and zero denied JS fetches:
`.../run-1790518968345-22fe6f9b-e1da-4c75-b597-7e7be5cf8bec/receipt.json`
(SHA-256 `458aa4e1a4c3cbdd5b5e35ae3d3213589788e69203cde94056256e62cb1f550c`).
The exact build manifest SHA-256 is
`8135c74d993c4cc7f359c3f19cbf482261faf4bee3696e2b2c38e97a746b28e5`.
The driver checks the candidate HEAD, five key compiler files and tracked
patch-file hashes, then records the whole compiler tree. It does **not**
independently replay every earlier patch from pristine upstream; this is
source binding for a trial, not full ordered-stack provenance for amendment.

The [candidate-specific real Chrome smoke](../../../toolchain-patches/006-alias-equality/browser-candidate-smoke-2028.mjs)
serves only manifest-listed files from that private dist, verifies its build
receipt and all 16 file hashes before and after the run, and binds its own
script hash. It passed four bounded groups with zero page/console errors:
isolated build identity, rendered 1024×640 boot plus sprite-helper refinement,
Preferences menu open/close via a canvas control, and an e2–e4 move advancing
to Black with subsequent sprite refinement. The final post-move screenshot
was visually inspected; two screenshot hashes are in the receipt. Promoted
receipt:
`.../run-1790518968345-22fe6f9b-e1da-4c75-b597-7e7be5cf8bec/smoke/2026-09-27T14-34-15-533Z-e066031c/receipt.json`
(SHA-256 `b64d9a020c4d8cab8a69f1ba48933d9e8f7f2912fffeeb1a439c7687de4e026c`).
An earlier run stopped on the smoke harness's incorrect DOM selector for a
canvas-drawn button; a later green run lacked the independent dist rehash.
Their receipts remain preserved but are not the promoted smoke evidence.
The first build attempt stopped on a raw-versus-LF compiler hash assumption
before code generation; its failed receipt also remains preserved.

These initial four checks do not establish the full browser/offline scenario
matrix, exact Preferences state, candidate bot behavior, all effects or
import paths, performance, Linux native/GUI/PCM/restart, GPU parallelism, or
owner WOW acceptance. Browser external-request absence was not asserted by
the smoke. No 2.0.28 pin amendment or production ABI change follows from it.

## Later local candidate hotseat and bot gates

The same initial hotseat-only bundle subsequently passed all 13 extended
local Chrome scenario groups with zero errors, including both-color moves,
import/underpromotion, PCM, offline reload and move, Shift/Undo and portrait.
The test opt-in compared served `build.json` bytes to the local candidate
manifest and the 16 manifest file hashes were rechecked after the run.
Receipt: `.artifacts/bend2/toolchain-patches/browser-2028-candidate/run-1790518968345-22fe6f9b-e1da-4c75-b597-7e7be5cf8bec/scenarios/hotseat-extended-20280927/receipt.json`
(SHA-256 `df2e986b91e3970a33a883270cb2740b39d59688e33d607ffb0b8a14c9384620`).
That runner version predated the later receipt field `servedBuildBound`, so
its explicit invocation and byte comparison are supplementary evidence,
not a self-attesting flag in that receipt.

A second nonce-private 2.0.28+006 build emitted the actual BotAdapter worker
library with `bend-web-workers-2`, strict required-only scheduling and five
source-bound module files. Bundle `99cc8727f69083203003` remains draft and
dirty at source revision `ba6d73271b942236df176a2589cb84fba83cf1cf`.
Its build receipt SHA-256 is
`b3ca25adf377ac3521c4c92bbca50b9dffd75fb704ba3f3ebd208e8756067e2a`.
Node 24.12.0 warmed that exact worker library and its `choose` matched the
candidate serial scorer (receipt SHA-256
`939f3c0ad659f3317f8eb1e2c8c4408fa4c808e621327e91ec77bf909111fcea`).
The first real Chrome online/offline test returned two commands and fetched
worker modules, but review found the app could have taken its serial fallback.
That receipt is preserved and its route is **unverified**, not worker proof.

A source-hash/unique-anchor, candidate-only diagnostic rebuild instrumented
the worker's ready, `choose`, applied and fallback seams without editing the
production worker. The final cleaned diagnostic dist is
`.artifacts/bend2/toolchain-patches/browser-2028-candidate/run-1790525700080-40b86220-830e-4d05-98a0-8488e7d7b73e/dist`, version
`dd12190580053aa42647`. It excludes the unused predecessor host/worker
bundles from its manifest and service-worker cache while preserving the
origin run. Build receipt SHA-256 is
`4bce0c4d6cc1b76a09f54031ae313d5403f565c9d45476ea045eddee25a2cd32`.
The strict real Chrome online and cold-offline route receipt is
`.../run-1790525700080-40b86220-830e-4d05-98a0-8488e7d7b73e/chrome-bot-online-offline/1790525744479-52ccbca4-dcf6-4839-9c7f-0bdd5517bf8c.json`
(SHA-256 `ce8cf566f4156339ce7b42a103957473f609ccd5b120980b93406efe144b4d23`).
Each phase recorded ordered `session-ready → choose → applied`, no fallback,
`completed: 1`, `remoteJobs: 3`, `requiredWitnesses: 1`, legal choice 20065
and `bot_apply_at` revision 1→2 matching the persisted command. All nine
bot module responses per phase had HTTP 200 and JavaScript MIME; the offline
set came from the service worker. Independent review found no blocking
false-pass for that bounded instrumented route.

The diagnostic route is not the unchanged production worker bundle, a
published 2.0.28 build, Linux native parity, a GPU benchmark, full device
coverage, or a reviewed pin amendment. The BotAdapter bundle above precedes
the later board-edge source edit; its source-closure binding must not be
reinterpreted as coverage of that newer scene.

## Current published visual-source trial

After the clean 2.0.27 visual preview source commit `4f6e52f`, a new
nonce-private 2.0.28+006 candidate was built from clean main HEAD
`e3e8f3ddb904285e13b093502a8710cc6d8eed05` (the later commit only adds
publication evidence). The candidate driver conservatively marks every run
`draft: true, sourceDirty: true`; this does not assert the main checkout is
dirty. It does not write the pinned compiler, normal build or published site.
Run root:
`.artifacts/bend2/toolchain-patches/browser-2028-candidate/run-1790534551076-db18c563-001c-4a7c-8329-806cfb070330/`.
Build version `e03b14a30ebcf59973a8`, `build.json` SHA-256
`8b8533d0c16497d45e33544e193b5ae7b1529c3fd3c34731f04d58ef356556e5`,
build receipt SHA-256
`28eed190c9b1d4644ef9b582fd07dcdf133b4fc8ed63d5c98978ab4f09b85997`.
All 21 manifest files matched after the run. The real Chrome hotseat matrix
passed all 13 groups with served build bytes bound, zero errors, offline
move, PCM, Shift/Undo, promotion and portrait. Receipt SHA-256
`00a04f2a064f42a1ba250df2487e92b48e9efbc8be1d4c752dfe22dba697e969`
at `scenarios/final-visual-hotseat-20260927/receipt.json` under that run.

The candidate composition capture at `composition/receipt.json` (SHA-256
`2a66191512528d62006b39e905ef219524c859468e9c8dc557b74e620c6a8baa`)
passed the default, 330°, Front and old-saved-default reload views. All four
PNG hashes matched the corresponding pinned 2.0.27 clean source captures,
including default SHA-256
`e0f4f125954f6dee919cbe735141254c9ce718ffe71949d09f39a44e1b85cf93`.
This is finite rendered-pixel parity at those views, not every frame or device.

A fresh diagnostic-only bot re-bundle from that exact candidate lives under
`run-1790534821546-dcf083d9-37f0-471e-bab2-2f36c557a637/`, version
`1dc38b836d17f8b83a12`. Its receipt SHA-256 is
`500b2d2ce68c8f2d8db6b0ce0b34fc42de59eb8489c18ed7a44f3e7d9057b37f`.
The strict Chrome online and cold-offline route receipt SHA-256 is
`70a8ed570e7a802674fd98fc3bb72e6b3dceae355d7fabd740fdb2890af0fa48`.
Each phase recorded `session-ready → choose → applied`, no fallback,
`completed: 1`, `remoteJobs: 3`, `requiredWitnesses: 1`, legal choice 20065,
and persisted `bot_apply_at` revision 1→2; 18 module requests were observed.
This is still instrumented candidate-only proof, not the unchanged production
worker, a pin amendment, native/GPU parity or owner acceptance.

## Current orbit-wall visual-source trial

After clean source commit `18d9a8c9d494fc705755d1fee6481d79bbbd5054`
(the game scene bytes remain the published `68411c4` composition), a fresh
nonce-private 2.0.28+006 candidate copied the reviewed 004-stage compiler,
applied exact patch 006 and emitted the current Controller, BoardScene and
MenuAA books. `BoardScene`'s source closure includes `MotionWall.bend`;
the scene selected-book source-closure SHA-256 is
`75b3d81ac9edfafe48f31b07209cae8a6ce26d256b6524e8d5fdf0125897a7dd`.
The candidate driver conservatively marks the draft `sourceDirty: true`
even when the main source checkout is clean. Run root:
`.artifacts/bend2/toolchain-patches/browser-2028-candidate/run-1790554560597-45af775d-1b3d-45d4-a3cf-8e0d5124cb8a/`.
Build version `29085fc058e2095cbf11`, build manifest SHA-256
`ca5c4e5d8b36d4d96bf1f760037156cef7953435d8e4f759df353d5e64b5f2e1`,
receipt SHA-256 `2ad7fa18d0ee7b169d8049f13b742f1ad206671650e1db9e76aa7f1f4fae0eb1`.
All 21 manifest files were source-bound locally; nothing was hosted or
written to the pinned compiler/normal browser build.

Real Chrome at `127.0.0.1:4190` bound served `build.json` to the candidate
manifest and passed all 13 extended hotseat groups with zero errors, offline
move, both-color actions, PCM, Shift/Undo, promotion and portrait. The
scenario receipt SHA-256 is
`c5807c8af881f042bfdf61a50563d84acafa4b5adf56a8cec1926ea077e50218`.
A held-pointer browser probe also passed; its motion PNG SHA-256
`e6e8ea3dac15d354844fca7998f27b6adeae1e5cacbb0e3319856995eff01831`
and settled orbit PNG SHA-256
`0da7e0106a7ca106f348a7d4fccf071fdca2a3f6de186f8e4ddf481df3b17ec9`
are byte-identical to the pinned 2.0.27 local captures for this source.
That finite pixel parity is not a browser latency or native/device claim.

A separate source-bound diagnostic bot re-bundle from this exact candidate
has version `0cfacb15177f3c5455b3`, receipt SHA-256
`3061a492ebdf39f5e2d2bd6aef6241561fcc72542bc080eb0e11ccbb402acfe6`.
The strict online/cold-offline Chrome route receipt SHA-256
`5a8757df1281000b0988dbc3b37eb3569d53cf89fcf8a9bb548c6dca9bd7ba3a`
recorded `session-ready → choose → applied`, no fallback, one completion,
three remote jobs and one required witness in each phase, with legal choice
20065 committed at revision 1→2; 18 module requests were observed. This is
still an instrumented candidate route, not an unchanged production bundle.
The candidate build derives from the 004-stage copy plus exact patch 006;
the later final-clone source replay and 647-case matrix bind equivalent
canonical compiler source, but this bundle did not execute directly from
that exact replay clone. The direct final-clone aggregate proof timed out;
a later full-tree-pinned short-path snapshot passed the candidate aggregate
proof separately. Candidate-native/GPU/host ABI promotion and reviewed pin
amendment remain open. Keep the public 2.0.27 preview authoritative.

## Current published piece/wall visual source trial

After clean source commit `0cf3d101ee4f74cbaf10b221a99d660bc7e81926`
(the game-scene bytes are the published `041932b` composition), a new
nonce-private 2.0.28+006 candidate copied the reviewed 004-stage compiler,
applied exact patch 006 and emitted the current Controller, BoardScene and
MenuAA books. Run root:
`.artifacts/bend2/toolchain-patches/browser-2028-candidate/run-current-piece-wall-20260928-0328-7d9e/`.
The candidate build version is `bdac80195a7bb7902008`, `build.json`
SHA-256 `d1ddd7e46304e78a50e01d459be288e12be1f385c39b11cb3285586ba9da10d6`,
and source-bound build receipt SHA-256
`347871f4452e2bd01855f7122d7d7654ca2afdd4b496fd37ceed58bbd3d85cad`.
The driver conservatively records `sourceDirty: true` even on this clean
checkout; the candidate is not the published or pinned build.

Real local Chrome bound the served candidate manifest and passed all 13
extended hotseat groups with zero page/console errors, including selection,
both-color moves, themes, PCM, Shift/Undo, promotion and cold-offline move.
The ignored scenario receipt SHA-256 is
`51a3e577916ccfff1c63bdababe2eb77373ef29537c9b2712af91312097f1733`.
Initial desktop, selected knight, both-color e4/e5, warm court and portrait
PNGs are byte-identical to the exact-source hosted 2.0.27 captures; the warm
PNG SHA-256 is
`cb5cc53fbff79606ca5ae7fb1c41d4069412b7aa022a3b9b0b64efcbe60c96af`.
Those five finite captures do not prove every frame or native behavior.

A separate source-bound diagnostic re-bundle version
`0490a471c98fb8339c54` has receipt SHA-256
`41017b5865421fc1087c9b72f7658aa13528ff67f1b5fc1cb6728ae0e0092a26`.
Its strict online/cold-offline Chrome bot-route receipt SHA-256
`70be14b131846f49c7b3b76f8adf543426cb8400b0524c7ee59a5d74dacca4ac`
recorded `session-ready → choose → applied`, no serial fallback, three
remote jobs and one required witness in each phase, with legal choice 20065
committed at revision 1→2. This remains an instrumented candidate, not the
unchanged production worker. The candidate build derives from a reviewed
004-stage copy plus exact patch 006; the final replay and 647-case matrix bind
equivalent canonical compiler source, but these Chrome runs did not execute
directly from that exact final replay clone. The final-stack aggregate proof
has a separate full-tree-pinned short-path passing receipt. Candidate-native,
GPU, complete host ABI migration, owner visual acceptance and the reviewed
pin amendment remain open.

## Published match-status/resume source trial

After the clean match-status and bot-resume source commit `c30d312`, and the
evidence-only successor `d63fc5a29a74dbac5e8782df713612d83c4d8c16`, a
new nonce-private 2.0.28+006 candidate was built without touching the pinned
2.0.27 checkout. The builder verified its recorded upstream tag, reviewed
004-stage stack and exact patch 006, then emitted current Controller, scene,
menu and BotAdapter books. Its run is
`.artifacts/bend2/toolchain-patches/browser-2028-candidate/run-1790581636033-9301fe54-319f-442c-b98e-5c83ce1dad4d/`.
Candidate version `7820dc19839fbc82889a` has `build.json` SHA-256
`769b9606743f1392ec64af5dade2d05e5861c72ff122ef9bc7f84dc056cfd547`;
the successful source-bound build receipt is SHA-256
`82246132214c71b9ab8e5fb66fb8b46bcf112fb727d9eab32bae0fa9ca45eff5`.
The builder deliberately records `sourceDirty: true` conservatively. Its
separate bounded rendered boot/preferences/move smoke passed (receipt SHA-256
`8309f7e6fdc2f9b24db2fe14ee6e5346b415bdbba4c636cc6cfdaee56b97f10`).

A diagnostic re-bundle `bf626de2cf0b5878bb01` has source-bound receipt
SHA-256 `a292f1f00896e73d3b126dc08a5d1da7c493349cccf38891cad7ac4a6b2520a3`.
Its online/cold-offline strict bot-route Chrome run passed with worker
`session-ready → choose → applied`, one required witness per phase, three
remote jobs per phase, choice 20065 applied at revision 1→2, and no serial
fallback (receipt SHA-256
`13c8cc3b4e56289b24e7c1b3472d7981995416ead8ae4068a7d69a50a67c6e41`).
The uninstrumented candidate build also passed the existing 13-group local
Chrome suite, including both themes, offline play, promotion, Shift/Undo,
portrait and browser PCM (receipt SHA-256
`ad3784ce36da9deb14950cd92dc22d0fba26ddb0621a30d38bb49ef98765e861`).
A focused rendered draw-actions/undo run then passed the actual resignation
and bot-resume repair with zero defects (summary SHA-256
`7d534740529cf6ba866ceb32a1f950f9e700aa04cd5d2fa578f22ab00f79f48d`).
All those served manifests were byte-bound to their nonce-private dist.

Five sampled Chrome PNGs (initial, selected, both-color moves, warm court,
portrait) matched the exact-source hosted pinned-2.0.27 captures byte-for-byte.
The manifest-bound local server used only this isolated candidate directory;
its tracked source SHA-256 is
`9ae96e9c77719b395d7c6c59a97e6f340289e33c36e0bf4b0e592fd7fa4ebebf`.
This is finite local browser and instrumented bot evidence. It does not turn
the source-equivalent compiler copy into an execution from the exact final
replay clone, prove Linux native C/ELF/X.Org/PCM/restart or GPU parity, or
authorize a pin amendment. The previous Linux candidate package stopped at
its 88 GiB guard before compilation; a fresh read-only headroom observation
was [requested separately](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865659311),
not a retry.

The [read-only Linux reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865876967)
later measured 103.204 GiB MemAvailable without starting any build. A
separate [exact-source CPU candidate request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865910914)
and its [replay-receipt SHA correction](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865920136)
preserve two fresh 88 GiB admission gates and a one-attempt bound. The
observation and request are not CPU package/runtime evidence.

## Deep candidate browser replay

The same nonce-private, uninstrumented candidate version
`7820dc19839fbc82889a` also ran the longer reference-checked browser paths.
The first combined bot run reported zero position/journal defects, but its
Black game inherited the White game's mutable random-choice seed, reached
the 180-ply test cap and was ended by a **test-forced resignation**. Its
ignored summary SHA-256 is
`f2ea09a3d988960fc8419a587b69ded8fb0075d770f86fd296c225238e2b156e`.
Preserve that misleading terminal sample; it is not a naturally finished
Black game or compiler divergence. The playtest driver now resets its seed
per game and asserts a natural outcome before any cleanup resignation.
The candidate Black rerun reached a natural checkmate after 45 bot replies,
with zero defects, summary SHA-256
`459f8fb23a4baeb6b08659f8150d125150320a794addcc8956d1b2745db7eb44`.
The prior White game had reached a natural threefold draw after 52 replies.

`draw-terminals` and `draw-prompt` then passed independently on the same
served candidate manifest, with zero defects and 30 plus eight checks;
the 304-action policy imports took 566 and 334.6 seconds in those runs.
Their ignored summary SHA-256 is
`af62b13c7e961bf781bfa74d6c1e11dad601483cc1a04b745586498938cf0200`.
These are bounded rendered/reference differential cases, not a universal
rules proof, stable speed result, native/GPU gate or pin amendment.

## Published shorter-piece source trial

After the 2.0.27 [piece-proportion preview](../v2-piece-proportions/README.md)
was published, a fresh nonce-private 2.0.28+006 candidate bound the current
source (game bytes at `cafc934`, build revision `cf38634`) without editing the
clean pin or canonical browser output. Candidate version
`fc1c3a1b33c3d54064ab` has build receipt SHA-256
`e0f34f238bd38ad817f3a68f55a5ca0d5b9beee72fb9e07274513ecffefd8323`
and `build.json` SHA-256
`bc6cd5d7faed0bb9e577ad125a004eb4dc46e63b62ec3b7a789e8208000711f7`.
The exact-manifest-bound 13-group local Chrome run passed online/offline
refinement, themes, selection, import/promotion, PCM, Shift/Undo and portrait
with no browser errors (receipt SHA-256
`db6653e09e8a6b15d02c54066b06d18d4d56b1b860e5d7f8d66b8a97ab41b21a`).
The focused default/Front rendered start passed with zero defects (summary
SHA-256 `d00d95241be445705c55b6f9d067e8a671372af3e2e104f4ac2ed29f3fafd8d7`).
Seven sampled PNGs, including those two refined views, were byte-identical
to the separately hosted pinned-2.0.27 visual source. This is local draft
compiler/browser compatibility. It does not re-prove the strict bot-worker
route, native GPU/CPU on this newer source, canonical proof gates, or the
currently blocked reviewed pin amendment.
