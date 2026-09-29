# 2.0.32 selected browser library adapter

`selected-library.mjs` translates explicit browser export roots to the 2.0.32
`js_lib(book, mod)` API by reusing the reviewed selected-root adapter. It never
passes an export array as a truthy module flag or allows an empty/all-roots
selection.

Run `node --check bend2/toolchain-patches/2032/build-adapter/test.mjs`, then the
test with the repository-local Bun executable. The gate compiles the real
`MenuAA.font_byte_cap` through a source wrapper, evaluates the selected library,
checks compiler-owned and foreign/constructor collisions, and compares raw
no-suffix JavaScript against an independent exact 001→002→005→phase2 replay.
It also carries the selected-root key-order, hidden-export and invalid-root
controls on the current phase2 compiler. The older
`004-web-workers/rebase-2032/test.mjs` is bound to the pre-phase2 source and is
historical for this derived compiler; use its phase-two planner test and this
adapter gate for current-source checks.

Before loading either Bend source, the test snapshots both local Bend import
closures plus the explicit foreign fixture, helper/adapter/test bytes, patch
bytes, and derived compiler files. It verifies the exact same binding again
before writing the receipt.
The derived compiler and canonical pin are checked read-only. This is a focused
consumer fixture, not `build.ts` integration or whole-app/browser acceptance.
