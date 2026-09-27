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

These checks do not establish the full browser/offline scenario matrix,
exact Preferences state, candidate bot behavior, all effects or import paths,
performance, Linux native/GUI/PCM/restart, GPU parallelism, or owner WOW
acceptance. Browser external-request absence was not asserted by the smoke.
No 2.0.28 pin amendment or production ABI change follows from this result.
