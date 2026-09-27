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
