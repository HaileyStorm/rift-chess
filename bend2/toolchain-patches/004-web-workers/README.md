# Bend Web Workers: downstream compiler variant

This patch adds an explicit, asynchronous worker-library target to the clean
Bend 2.0.27 pin. The ordinary JavaScript and native outputs keep their existing
entrypoints. The source syntax `f@(args)` requires an actual helper witness,
`f@N(args)` caps participation, and `f~(args)` keeps its body serial. The
automatic target observes work and may remain local. A `!` remains the native
mark; it is not a browser worker request. The checked Bend Laws and definitions
do not depend on scheduler metadata.

The tracked `004-after-001-002.patch` (generated after the final integration
checks) applies **after** 001 arity and 002 layout. `VARIANT.json` binds those
three patch bytes and the patched compiler source text (normalizing only CRLF
to LF for cross-host replay). The upstream
pin under `.artifacts/toolchains/bend` is never edited. Recreate the ignored
variant with `node bend2/tools/prepare-worker-toolchain.mjs`; a drifted or
half-patched existing directory fails closed. The optional 003 native boxing
optimization is not part of this variant.

The compiler output is five files per library: an importable `index.mjs`,
content-named program/runtime/worker modules, and `manifest.json`. Keep them
in one directory and serve `.mjs` as JavaScript. Module URLs are relative to
the entry, so a nested static URL works. `BEND_NO_TELEMETRY=1` is set in all
project emitters. The browser imports generated files only; it never invokes
the Bend compiler. `write_worker_files` rejects a nonempty destination. The
game emitter writes an additional build-only source binding, with transitive
source hashes and the exact patched compiler source hash, which the build
checks before shipping the five runtime files.

## Project commands

```powershell
node bend2/tools/prepare-worker-toolchain.mjs
node bend2/tools/emit-worker-libs.mjs
node bend2/tools/package-worker-toolchain.mjs
node --experimental-strip-types .artifacts/bend2/toolchain-patches/workers-stage2-20260925/gates/workers.mjs test
```

The portable-package smoke copies `web_runtime.js` beside Base, effects, and
the compiler, then compiles a worker library from that relocated resource
tree. It is not an upstream installer or a native compiler binary. The
generic HTML bundle supports an explicit worker-library input; see the
patched `guide/WEB_WORKERS.md` and focused Bun tests for its syntax and
asset behavior.

`browser-module-runner.mjs` serves the generated demo at a nested URL and
executes its exact 19 browser checks with module workers, not the historical
classic Blob fallback. It additionally exercises CSP denial, missing and
corrupt worker assets, wrong MIME, mixed builds, cancellation and disposal.
WebKit 26.6 executed byte-correct worker JavaScript served as `text/plain`;
the test records that tolerance rather than inventing a MIME rejection. The
corrupt-module and mixed-build cases still reject there. The app packaging
test verifies offline precache and exact asset completeness separately.

## Evidence boundaries

The September 25 Windows local gates passed 107 Node/Bun worker tests and a
639-file differential matrix with no compared outcome/emission changes. Chrome
153, Edge 153, Firefox 155 and WebKit 26.6 executed static ESM workers; the
first three plus WebKit after its MIME-tolerance classification passed all 19
checks and the negative matrix. These are local browser runs, not published
host acceptance. Required helpers won the packet's coarse CPU benchmark; the
automatic scheduler did **not** meet both acceptance margins, and cheap calls
with large immutable arguments have severe snapshot overhead. Keep such game
boundaries on the synchronous API unless a measured opt-in worker wins. An
experimental structured-clone optimization improved some direct copies but
did not establish end-to-end acceptance and was discarded.

Before promoting this patch to another Bend pin: review upstream parser,
metadata and JS emitter diffs, rebase in a new disposable worktree, replay
the 001/002 tests, 107 worker tests, 639 differential checks, Bun CLI/HTML
bundle and portable resource smoke, then rerun the three-engine browser gate
and workload measurements. Do not change frozen Laws to repair a backend
failure. The upstream public installer and GPU behavior remain separate gates.
