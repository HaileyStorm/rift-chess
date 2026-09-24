# 001: Native C arity diagnostics

This downstream patch applies only to Bend 2.0.27 at
`d37909174ebd664338ae3194799a9e0899dedd51`. It changes `bend2/comp.ts`,
not the pinned compiler checkout or any Bend source program. The compiler still
rejects every `u8` table entry over 255. The error now identifies the table,
row, exact value, source owner, and generated segment; for an oversized join
or continuation it also lists live capture names and word counts and the
return binder's word count. Constructor table errors identify the constructor.
The source owner is retained at segment creation because inlining can give the
generated segment a different prefix.

The extra capture layout is retained only for oversized segments. It is never
read by the successful C or JS emitters and does not change types, program
semantics, or emitted bytes. In a small wide join, the new error is:

```text
native C layout exceeds 255-word cap: FID_ARITY_T[4]=256, owner="join", segment=FID_MAIN_K10, captures=3 ["a":125, "b":125, "x":5] (255 words), return binder="y" (1 words)
```

To reapply, start with a fresh disposable compiler clone at the exact commit.
Keep `.artifacts/toolchains/bend` clean and use the project-pinned Bun 1.4.2
with `BEND_NO_TELEMETRY=1`. From the Rift Chess repository root in PowerShell:

```powershell
git clone --no-hardlinks .artifacts/toolchains/bend .artifacts/bend2/toolchain-patches/arity/compiler
git -C .artifacts/bend2/toolchain-patches/arity/compiler rev-parse HEAD
$patch = (Resolve-Path bend2/toolchain-patches/001-arity/0001-arity-diagnostics.patch).Path
git -C .artifacts/bend2/toolchain-patches/arity/compiler apply --check -- $patch
git -C .artifacts/bend2/toolchain-patches/arity/compiler apply -- $patch
node bend2/toolchain-patches/001-arity/test.mjs
```

The script checks the exact baseline and requires a clean pinned tree. It
generates fixtures under ignored `.artifacts/bend2/toolchain-patches/arity/tests`,
source-checks both compilers, compares emitted C/JS bytes for valid programs,
and checks the 256-word errors and absence of a failed C artifact. The
`--check-only` flag runs just the source checks. It invokes the pinned Bun
against the isolated compiler copies, since the project wrapper intentionally
rejects a modified compiler. It sets `BEND_NO_TELEMETRY=1` for each child.
For a tiny native CPU check, `native.sh` takes the two emitted `join-255` C
paths converted with `wslpath -u`, copies them to unique WSL ext4 storage,
builds both with Ubuntu `clang-18 -O0 -pthread -lm`, and compares exit/output.
The receipt records the exact C hashes and the hash of the command-substitution
output (`1` without a trailing newline). Bash strips trailing newlines during
that capture; the raw process stdout bytes were not hashed.

The 125-word wide-record case exercises the ordinary non-tail path. The fork
join reaches 255 words (125 + 125 captures, 4-word result and 1-word result)
and emits identical C/JS; its 256-word neighbor fails C and still emits
identical JS. A 256-field constructor exercises `CID_ARITY_T`. These are
compiler regressions, not graphical Native acceptance. The earlier ignored
Native diagnostic reported `ui/Commands.command_result` at 377 words
(252 captured, 125 return); a current full Native emission should be run as
a separately bounded integration probe. The tiny native CPU run does not
exercise the Window/Audio graphical path. No upstream publishing is involved.

On a future Bend pin, review and rebase this patch against the new `comp.ts`
and its table representation. Do not silently apply it to a changed compiler;
follow `bend2/docs/LOCAL_BEND_GUIDE.md` for a toolchain amendment.
