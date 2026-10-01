# Bend 2.0.32 isolated checker candidate

This is a separately versioned, local-only candidate under `core/v3/2032/`.
It exercises only five tiny synthetic inputs; it is not wired into the frozen
v2 gate, and none of its results authorize a pin change.

## Exact run

From the repository root on the current Windows host:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/core/v3/2032/test.mjs
```

The test uses the existing local Bun 1.4.2 executable and exact clean 2.0.32
scout. The harness pins the candidate checker, shared v3 proof-authority,
compiler source files, fixtures, Bun binary, and canonical pin. Each checker
process also guards both Git checkouts and the actually loaded local source
closure. Network `fetch` is denied in the checker process; the measured fetch
count was zero.

## Receipt

The harness passed all five local controls on 2026-09-29:

| Control | Result |
| --- | --- |
| `positive` | `Bend.book_valid` passed type and affine-ownership checking; the separate promise screen found no hole/unsafe/foreign dependency. |
| `todo` | Rejected as `1 TODO/open proof holes`. |
| `unsafe` | Rejected reachable chain `leaf, caller`. |
| `foreign` | Rejected reachable chain `leaf, caller`. |
| `compilerOwned` | `Bend.book_valid` accepted the local `IO` type; `Comp.js_lib` rejected it with the exact compiler-owned-name diagnostic before emission. |

The 2.0.32 `Book` has `hols` but no `open`. The adapter passes an immutable
book view with `open: 0` to the unchanged shared v3 `proofVerdict`, which
already reads `hols + open`; this counts TODOs exactly once without editing
the shared authority. The shared function supplies the promise screen, not
the BendTT proof kernel.

The candidate also calls the public 2.0.32 `Comp.js_lib(book)` entrypoint,
which enters `file_book` and its private `book_owned` guard without source
parsing or copying compiler code. The `compilerOwned` control reaches that
guard and fails on source-owned `IO`. The other fixtures deliberately have no
`main`; for them `js_lib` returns an in-memory source string that is discarded,
not executed or persisted. This call only probes the namespace boundary; it is
not a code-generation compatibility result. The synthetic negative is one
representative `OWNED`-name case, not coverage of the full reserved-name list
or the foreign/constructor collision branch.

Exact identities bound by the passing run:

- 2.0.32: commit `573002f01ec6c52416d44489543f69a9625facf8`, tree
  `0ecfc84c5f19bbae2c0c10735129749adf7d49e8`.
- Canonical 2.0.27: commit `d37909174ebd664338ae3194799a9e0899dedd51`,
  unchanged and clean; `bend2/TOOLCHAIN.json` SHA-256
  `17419db1617fece38c72dba9136463a313db43bf2c61f657334d9fdce0ae51a6`.
- Bun 1.4.2 SHA-256
  `15277c59ccd6c6c20f8dc9716c2b59c1776320d606b6a8658f70be8799519ca4`.
- Shared `proof-authority.mjs` SHA-256
  `3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013`.
- Candidate `check.ts` SHA-256
  `942e4774c24d641c4b5f015e650e5a846d346cd938a7cfc84be2ef4c4ecaf999`;
  harness `test.mjs` SHA-256
  `afc53f80ff654957ff50c1bf197df09124f65e63deac76840be04cdd0a313a9e`.
- Compiler-owned `IO` fixture SHA-256
  `d103ff1658e4434e1fb41cf49545c1ddd3d7ab3a027997217224803bdfb42bd9`.
- Compiler source SHA-256: `bend.ts`
  `e342b14666c6fefbff988e985d3672f99d22bed5e33fbc0ad9e2d8d980b3c9d6`,
  `comp.ts`
  `84a657f11d94ed6462bfc71710fef9f798e3bb4b6b345636e30dd3c6f4e4fffc`,
  `main.ts`
  `dfc58318166dc2720e626dfc46edaae38f8a0a7a8b3753cad7a48619896b94fb`,
  `base.bend`
  `a548d71e16e3e1b19f08ab187c1b04afabb7a3cf5fefa067004b77b6eaca9ba0`.

The command emits a JSON receipt to stdout. It reports one synthetic source
checker positive and four distinct negative controls, with `passed: true`
meaning only that this bounded harness classified them as expected.

## Explicit limits

This is not a BendTT verdict, a completed mathematical proof gate, a run of
the frozen 56-file v2 closure, a mutation-suite result, compiler-emission
validation, or browser/native/GPU acceptance. This pristine-scout synthetic
checker does not repair 2.0.32's Windows nested-import path resolution
(`ArithmeticProof.bend` -> `../ProofKit.bend`); the separate derived 005 patch
handles that boundary. BendTT was not invoked or installed. The
canonical 2.0.27 pin and every frozen Law remain untouched.

## Frozen-proof source shards (diagnostic, not the aggregate gate)

`shards.mjs` checks the individual proof entries imported by frozen
`core/v2/CHECK.bend` under the exact 001→002→005→004-phase2 derived 2.0.32
compiler. It verifies the frozen v2 manifest, loaded source closure, Git
states, compiler bytes, and Node executable identity before and after each
bounded Worker. The shared proof-authority negative controls run once on the
small ArithmeticProof representative; every shard still gets its own
`book_valid` and reachable promise screen. A separate shared stage marker
attributes resource stops without sending progress as a premature result.

Run `node bend2/core/v3/2032/shards.mjs --only ArithmeticProof.bend` for a
bounded selected diagnostic. The all-shards route is also diagnostic and
cannot replace frozen aggregate `CHECK.bend`, BendTT, mutation suite, or the
guide's pin amendment. The default is 512 MiB old-generation/120 seconds;
CanonicalProof, OrderingProof, RangeBridgeProof, and RangeCompositionProof
passed with 1-GiB/raised-timeout exceptions after default-bound typecheck
stops. Heap and deadline changed together; a 512-MiB lower bound was not
isolated.
On the later Windows run, Canonical passed at 195 seconds of typechecking and
Ordering at 233 seconds, uncomfortably near their 240-second deadline. The all-shards
diagnostic then stopped at RangeBridge's old 120-second limit; its worker
exit was observed. An isolated RangeBridge check passed under the raised
bound at 135 seconds of typechecking. The three remaining small shards passed
at default bounds; RangeComposition stopped at 120 seconds then passed an
isolated raised-bound run at 177 seconds of typechecking. A second all-shards
run reached Ordering and then timed out at 240 seconds after Canonical passed
at 219 seconds; its exit was observed. Only Canonical and Ordering now get
a bounded 360-second deadline for timing headroom; the Range pair remains
at 240 seconds. These are source/promise checks only,
not CHECK/BendTT or a passed all-shards run. No Law counterexample was
observed. The script SHA-256 is reported by each exact run rather than
hard-coded here.

The next clean-source route passed Ordering but stopped at `PROOF.bend`'s
120-second typecheck deadline (observed Worker exit); that shard had passed
individually in 86 seconds. Its diagnostic deadline is now 240 seconds with
the original 512-MiB heap cap. All other shards retain 120 seconds. This
changed time only; at that checkpoint the revised route had not completed
all 18 entries.

The final clean `99d8034` Windows run of `node bend2/core/v3/2032/shards.mjs`
exited 0 with `allShardsSourcePassed: true` for all 18 frozen CHECK proof
entries. It bound frozen manifest SHA-256
`c8dcce907c3c3a6f70e9dfa12a74966879f30ea338b2734637c9acf4579943bf`,
runner SHA-256
`8be2860c4ade693913803cb5a07f60c85b29430bd4da28a5dbebaac4a7ad1aaa`,
exact CRLF compiler plus Base postimages and Node v24.12.0 executable SHA-256
`2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8`.
Canonical/Ordering used 1 GiB/360 seconds, the Range pair 1 GiB/240
seconds, PROOF 512 MiB/240 seconds, and the other thirteen 512 MiB/120
seconds; all passed without a resource stop on this sample. Canonical took
290 seconds of typechecking, illustrating host-load variance rather than a
portable performance claim. A Linux run and the actual aggregate
`CHECK.bend`/BendTT/mutation verdict remain unverified.

The runner now uses the reviewed exact LF/CRLF compiler postimage binder,
including its mixed/tampered-source negatives. The same stack can be
checked on Linux without accepting a changed compiler; no Linux shard run
has yet verified this portability.

## Separate aggregate CHECK migration candidate

`aggregate.mjs` adds a single bounded Worker for the exact frozen
`CHECK.bend` import set on the reviewed 001→002→005→phase2-004 derived
2.0.32 compiler. It binds the frozen manifest, source checkout, exact
LF/CRLF compiler and Base bytes, patch hashes, helper/runtime identity and
the complete expected transitive import cone before checking; the compiler's
actual loaded paths and their hashes are compared after checking. It reports
stage-attributed resource stops and rejects TODO/open, reachable unsafe and
foreign promises. It reaches 2.0.32's private compiler-owned namespace guard
through `Comp.js_lib` with a view retaining all checked declarations and an
empty export order. This produces only the fixed runtime, not a definition
build; its reserved-name set is not identical to the old 2.0.27 guard, and
this is not full checker parity.
The source-only `--preflight-only` mode launches no Worker; run
`node bend2/core/v3/2032/aggregate.test.mjs` on a clean checkout for exact
closure/omission, owned-name/foreign-constructor collisions, cgroup-v2
admission, exclusive lease, invalid-CLI and
read-only preflight controls.

Source-only preflight accepts exact Node 24.12.0 on Windows or Node 22.23.1
on Linux without inherited flags/preloads and exercises the compiler import/
empty-root namespace guard on that host. An aggregate Worker requires at least
12 GiB admitted free RAM, one 64-MiB-stack/8-GiB-old-generation Node
Worker, and a 900-second parent deadline. An exclusive ignored host-local
lease prevents concurrent attempts; if the Worker exit cannot be observed,
the lease remains and must not be reclaimed without host/process review.
Linux admission now additionally requires
`stat('/proc/self/ns/cgroup').ino === 0xEFFFFFFB` (the kernel's init cgroup
namespace identity). This is checked on the current process itself; PID 1
sharing a non-init namespace does not qualify it. The resolved
`/sys/fs/cgroup` path must also report `statfsSync(...).type === 0x63677270`,
the cgroup-v2 superblock magic, so a parent overmount cannot hide behind a
stale mountinfo row. The host-visible topology
must then contain exactly one `0::` process path and exactly one cgroup-v2
mount, at `/sys/fs/cgroup` with mount root `/`; the cgroup path must be
canonical. Every visible non-root ancestor must expose `memory.max` and a
numeric `memory.current`. All mountinfo entries are parsed; a stacked
non-cgroup2 mount at `/sys/fs/cgroup` or a nested mount
that is equal to or an ancestor of any inspected cgroup directory or controller
file is rejected, while a sibling-prefix or unrelated mount does not shadow
the checked ancestry. Every mountpoint is decoded and validated as an absolute
canonical path; only cgroup2 mount roots are decoded and validated that way,
since other filesystems can report kernel-specific pseudo-roots such as nsfs
`mnt:[inode]`. Those mounts still participate in overmount and nested-shadow
checks. The root's `memory.max` may be absent only when root
`cgroup.controllers` explicitly lists `memory`. Missing or malformed ancestry,
duplicate cgroup2 mounts, protected-path overmounts, inaccessible files, and
non-init cgroup namespaces all fail closed. The admitted upper bound is
the minimum of host free RAM and every finite ancestor's non-negative
`memory.max - memory.current`; receipts record the namespace inode and
verified filesystem magic with the
`init-cgroup-namespace-visible-v2-full-ancestry` mode. The Windows path and
its two physical-free-memory samples are unchanged. These checks establish
an instantaneous upper bound, not a reservation: cgroup membership or limits
can change after sampling, and the check does not prove peak Worker cost or
completion. Actual Linux aggregate and mutation Workers remain unrun.
Source-only Linux preflight does not attempt memory admission.
These are admission and safety bounds, not measured peak cost or a guarantee
that CHECK completes. No aggregate attempt has run under this candidate yet.
A pass would prove only this derived compiler's source/type/promise screening
of the complete frozen entry; it would not invoke the BendTT kernel, six
semantic mutations, conformance, native/browser/GPU, or authorize a
toolchain-pin amendment.

## Separate six-case semantic mutation source screen

`mutations.mjs` carries the six *unchanged* frozen v2 mutation anchors into
the exact 2.0.32 derived compiler without altering `mutate-v2.mjs` or any
Law. `--preflight-only` checks the frozen source, anchors, target transitive
cones, patch/compiler bytes and Node runtime without copying files or starting
a Worker. `--only <case>` selects one diagnostic; without an option all six
run sequentially. Each case copies its frozen source cone into a unique ignored
directory, checks the unmutated proof first, changes one copied target, then
requires a Bend type mismatch after a successful load and exact closure check.
The positive also checks zero holes, the successor compiler namespace guard,
and reachable unsafe/foreign promises. A parse/load, network, resource, or
liveness failure is not a semantic rejection. Each Worker exit must be
observed; an uncertain exit preserves the host-local exclusive lease. The
final receipt is written last and only after source rebinding. Do not reclaim
a retained lease by elapsed time or PID guesswork. A Worker/check failure
attempts a separate non-acceptance `positive.failure.json` or
`negative.failure.json` with stage, elapsed time and observed/uncertain exit
classification; copy/setup/final-receipt failures instead retain partial
outputs and terminal diagnostics. A failed evidence write is surfaced in the
terminal error.

On a clean checkout, run `node bend2/core/v3/2032/mutations.mjs --preflight-only`
first. Source-only preflight accepts exact Node 24.12.0 on Windows or Node
22.23.1 on Linux without inherited flags and imports the exact derived `.ts`
compiler. A mutation Worker requires at least 4 GiB admitted free RAM before
each 512-MiB or 1-GiB Worker. Linux Worker admission uses the same init-cgroup
namespace and complete visible-ancestry predicate described above; Windows
continues to use physical free RAM. The 2.0.27 mutation suite
and its historical receipt remain the canonical frozen gate. A 2.0.32 source
mutation pass would still not prove aggregate CHECK, BendTT kernel rejection,
conformance, browser/native/GPU, or permit a pin amendment. No mutation Worker
has run under this new runner yet.

## Separate full-CHECK BendTT verdict candidate

The [versioned BendTT gate](bendtt-gate/README.md) binds a successful frozen
aggregate receipt and an independently reviewed prebuilt kernel before it can
invoke the derived 2.0.32 `main.ts CHECK.bend --verdict` path. Both approval
modules are currently `null`: there is no approved Linux aggregate result or
kernel binary. Its synthetic authority, lineage, admission, receipt and
process-result tests pass, but no Bun/Lean/BendTT command was run. The
[owned Linux process-group supervisor](bendtt-supervisor.mjs) passed only
portable policy controls on Windows; its five actual Linux lifecycle cases
remain unrun. A verdict will require those controls and an exact, quiescent
host run; a source-only aggregate pass does not imply a kernel proof.
