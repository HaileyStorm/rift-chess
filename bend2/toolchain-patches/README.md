# Bend 2 downstream patch stack

These are source patches against the clean upstream Bend 2.0.27 commit
`d37909174ebd664338ae3194799a9e0899dedd51`. The pinned compiler at
`.artifacts/toolchains/bend` must remain clean. Each patch has its own test,
receipt, and maintenance notes; no patch is an accepted replacement for the
project toolchain merely because it applies or passes a small fixture.

| Order | Patch | Scope |
| --- | --- | --- |
| 001 | [Arity diagnostics](001-arity/README.md) | Explain an over-255 C segment/table with exact ownership and word counts; no successful-output change. |
| 002 | [Layout explanation](002-layout/README.md) | Read-only `--explain-layout` structural report; no execution or successful-output change. |
| 003 | [Join-capture boxing](003-join-boxing/README.md) (experimental) | Optional compiler optimization; capture-only, with raw wide returns still rejected and GPU/full Native unverified. |
| 004 | [Web Worker backend](004-web-workers/README.md) | Separate async JavaScript library output, source require/never policies, static module hosting and an explicit multi-artifact HTML bundle; replay after 001+002. |

The final 001+002 combination passes [the required stack gate](stack-receipt.json)
with byte-identical successful C and JS. The separate
[001+002+003 CPU receipt](003-join-boxing/combined-optional-receipt.json) ties
all optional fixtures to one compiler revision: eight C programs build and
match JS on one and four Linux threads, while a raw-return overflow rejects.
The full graphical `Native.bend` C emission timed out after 480 seconds without
an output file. Patch 003 remains experimental and is not used by the default
project wrapper; native GUI and device validation remain open.

## Carrying the stack across Bend updates

1. Fetch and review upstream's changelog and compiler diffs. Record the new
   upstream commit and whether it already solves an item. Keep the current pin
   and its evidence intact while assessing the successor.
2. Create a **separate disposable checkout** at the exact proposed upstream
   commit under ignored `.artifacts/bend2/toolchain-patches/`. Check its HEAD and
   clean status. Apply 001, then 002, then any accepted 003 with `git apply
   --check` before each `git apply`. A conflict is a review event, never a
   reason to force or silently drop a hunk. Rebase one patch at a time and
   record the old/new source and patch hashes.
3. Run each patch's deterministic fixtures on the isolated compiler. For the
   required 001+002 combination, run `node bend2/toolchain-patches/verify-stack.mjs
   <disposable-compiler-directory>` after 001's fixture generator; the exact
   final source hashes and small combined smoke are in
   [stack-receipt.json](stack-receipt.json). The older, pre-review 002 smoke is
   preserved separately in `stack-receipt-pre-review.json`. If 003 is included,
   create a distinct stacked receipt and repeat its CPU, ownership, and device
   gates; 001+002 evidence does not qualify it. Repeat the full Rift Chess proof, conformance,
   mutation, browser-build, and native gates on the intended compiler variant,
   and compare successful C/JS output where a patch promises byte identity.
   A layout report or source check does not prove native, browser, or GPU speed.
4. Only if the variant is adopted for normal project builds, update the local
   toolchain contract and wrapper through the reviewed amendment procedure in
   [the Local Bend Guide](../docs/LOCAL_BEND_GUIDE.md). Preserve the untouched
   upstream pin and old receipts; bind the ordered patch bytes and applied-tree
   hash. Never edit the pinned upstream checkout in place or make a patched
   tree look like the unmodified upstream commit.

Set `BEND_NO_TELEMETRY=1`. Do not run upstream publishing commands. The
individual README and receipt state exact tests and limitations; this index
is not a substitute for their evidence.
