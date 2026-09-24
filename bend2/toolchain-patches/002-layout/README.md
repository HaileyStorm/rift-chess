# Bend 2.0.27 layout explanation (local patch 002)

`0002-explain-layout.patch` applies to the clean pinned commit
`d37909174ebd664338ae3194799a9e0899dedd51`. It changes only
`bend2/bend.ts`, `bend2/comp.ts` and `bend2/main.ts`. Patch 001 also touches `comp.ts`; apply
001 first in a separate disposable exact-pin compiler tree, then try 002 with
`git apply --check`. Resolve any overlap against the same `lay_of`, `sig_def`,
and `term_any` API, with root owning integration. Never edit the pinned
`.artifacts/toolchains/bend` checkout.

Run `bend file.bend --explain-layout` using the pinned local Bun against the
patched disposable compiler. The CLI checks the full book and local relative
imports first, prints a schema-versioned JSON report to stdout, and does not
execute `main`, compile, write output, or change source. This mode rejects
absolute, backslash, named-package and hash-package imports before resolution;
it neither contacts BendHub nor writes Bend's package cache. It also skips the
daily version-check fetch/cache even when telemetry is otherwise enabled.
Only a parsed `--explain-layout` option skips that check; a program argument or
`-o` filename with the same spelling retains ordinary CLI behavior.
The Bun host may still write its own transpiler cache under its user profile;
this is a source/output read-only compiler mode, not a claim that launching Bun
has no host cache effects.
It rejects `-o`, `--check-only`,
`--checkup`, `--publish`, HTML bundling and program arguments in this mode.
Set `BEND_NO_TELEMETRY=1`. The normal project wrapper intentionally refuses a
modified compiler, so the test script invokes local Bun with the disposable
compiler's `bend2` directory as cwd and checks its base commit and Bun pin.

`declarations` follows Bend's checked source/import order, omitting Base.
Imported names use Bend's module-qualified names (for example `module.inc`);
they can change if the relative module structure or spelling changes, but the
fixture report is byte-identical at two different absolute checkout paths.
Concrete
types include their inferred value layout; parameterized types have `value:
null`, because no single concrete instantiation exists. Constructor `node`
and field `offset` reflect the native compiler's `lay_node` payload; for a
parameterized constructor they are symbolic. Definition parameters and result
use the compiler's `sig_def`, including its 255-word wide-argument boxing.
`words` is a count of 64-bit slots; `w32` is a 32-bit value in a slot, `w64`
is a 64-bit value, and `box` is a pointer word. `boxed` means the whole value
is represented by a single box word; a constructor node with multiple `box`
fields has `boxed: false` because those fields are its payload layout.

`sites` lists typed structural parallel lets and bang calls in compiler
traversal order. Parallel lets include a count of live structural calls and each callee's
result width, plus their sum. Bang calls include the callee's parameter-width
vector and result width. These are interface slots, not post-fold emitted
segment or task counts: dead code and constant folding can remove a site, a source call
can be reached repeatedly, JavaScript is sequential, and device/CPU scheduling
depends on the native runtime. There are no estimates of allocation count,
speed, GPU occupancy, or parallel benefit. The report has no source text or
absolute paths. This does not change language syntax, runtime, affine use,
the checker, proof normalization, or output emission.

For a clean copy at the pinned commit, from the project root:

```powershell
$patch = (Resolve-Path bend2/toolchain-patches/002-layout/0002-explain-layout.patch).Path
git -C .artifacts/bend2/toolchain-patches/layout/compiler apply --check $patch
git -C .artifacts/bend2/toolchain-patches/layout/compiler apply $patch
node bend2/toolchain-patches/002-layout/test.mjs
```

The checked-in `test.mjs` assumes the disposable compiler copy at the path
above and asserts the exact original pin, three patched source hashes/status,
and Bun 1.4.2. It tests wide and recursive layouts, fork/bang widths,
repeatability, checker parity, invalid option/source failure, unchanged
fixtures, imported-module location stability, and byte-identical emitted JS/C.
It rejects absolute/named/hash/backslash imports without a report or Bend
cache writes, including forbidden imports nested inside a relative module.
The ordinary `-o --explain-layout` parse path uses an isolated version cache.
Test output is under ignored `.artifacts/bend2/`.

This is a small report facility, not a native benchmark or a full compiled
segment provenance map. Any later compiler pin needs a reviewed rebase and
fresh report/output checks.
