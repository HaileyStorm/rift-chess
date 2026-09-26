# Bend 2.0.28 WebWorker migration candidate

This is a **candidate**, not an adopted compiler or a new Law amendment.
`004-after-005-2.0.28.patch` modifies Bend's `bend.ts`, `comp.ts`, and
`main.ts` and adds its generic `bend2/web_runtime.js` resource. It belongs in
a disposable Bend 2.0.28 checkout **after** a separately reconciled 001 arity,
002 layout, and 005 Windows-path stack. Do not apply it to the clean pinned
2.0.27 checkout. The [receipt](LOCAL_RECEIPT.md) records exact observed
preimage and candidate source hashes, the runtime SHA, focused checks and
limitations. Its reverse replay reached the LF-normalized final-005 source
text, while ordinary Windows `git apply` rewrote some CRLF spellings; review
normalized and raw hashes explicitly on a fresh host.
The local `.gitattributes` limits trailing-whitespace lint only for patch
payload files so source-space lines remain literal; it does not relax source
checks in the disposable compiler.

The candidate adapts 004 to 2.0.28's constructor keys and effect names,
retains the plain JS/C emitter, and loads its worker runtime from the compiler
resource directory. The old 2.0.27 004 patch and its tests remain the active
pinned variant and preserved provenance. Before accepting the new stack, start
from the public 2.0.28 tag,
replay and verify each separate patch and source hash, then run the copied
worker tests with [`004-tests-after-005-2.0.28.patch`](004-tests-after-005-2.0.28.patch)
applied to the unchanged 2.0.27 test inputs, and copy the separate
[`ORACLE_2028.json`](ORACLE_2028.json) into `tests/workers/oracle_hashes_2028.json`.
The full local Node/HTML/Chrome gate passed 107/107, and the 647-fixture local
differential against a reconstructed 005 baseline passed. The historical
2.0.27 oracle stays untouched. Repeat these results from the freshly
assembled stack and on Linux, then complete the relocated resource test,
real module workers in browsers/offline, frozen proof suite,
native C/source, and full game build/playtest. Only the guide's reviewed
toolchain amendment may move `TOOLCHAIN.json`.
