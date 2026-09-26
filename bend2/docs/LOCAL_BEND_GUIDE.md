# Local Bend 2 guide for Rift Chess

This guide describes the Bend compiler this project is pinned to and how this
repository uses it. It is written for the next implementation worker: every
claim is either read from the pinned source (cited by file) or was checked by a
probe under `.artifacts/probes/` on this Windows machine.

| Item | Value |
| --- | --- |
| Bend version | 2.0.27 (`bend version`) |
| Pinned commit | `d37909174ebd664338ae3194799a9e0899dedd51` ([source](https://github.com/bendlang/bend/tree/d37909174ebd664338ae3194799a9e0899dedd51)) |
| Previous pins | `6a77e1246c351055cb15031267a7c76c87036cbc` (2.0.26), reviewed amendment 005; `ff7a40cc9070a34c78399ecd2bbe46a044ad9b4b` (2.0.25), amendment 003; `a49524265bdfa5753a4bf38e25f0574a705dd868` (2.0.25), amendment 001 |
| Local checkout | `.artifacts/toolchains/bend` (git-ignored, must be clean at the pin) |
| Bun | 1.4.2, `@oven/bun-windows-x64@1.4.2` in `.artifacts/toolchains/runtime` |
| Authority for the pin | `bend2/TOOLCHAIN.json` |
| Repository | `C:\Users\Haile\OneDrive\Documents\ChatGPT\Rift Chess`, the Bend 2 port lives in `bend2/` |

Source files read for this guide: `guide/GUIDE.md`, `guide/EFFECTS.md`,
`guide/SHADERS.md`, `bend2/base.bend`, `bend2/main.ts`, `bend2/bend.ts`,
`bend2/comp.ts`, `CHANGELOG.md`, `WONTFIX.txt`, and the demos, tests and
benches listed in `SOURCE_CATALOG.md`. No CUDA, Metal or GPU code was built or
run for this guide (GPU use on this machine needs a coordinator lease, and the
upstream compiler has no Windows native target).

## What Bend 2 is

Bend combines a dependent type checker, affine resource use, proofs written as
ordinary definitions, and fork/join parallel calls. Its syntax looks Pythonic,
but evaluation is pure unless a value has an `IO` type. The compiler emits one C
file (CPU plus optional Metal or CUDA device code) or a single-threaded
JavaScript program. The checker is the authority for the typed source term; the
generated C, GPU program, JavaScript runtime, foreign code and browser host are
separate trust boundaries.

Bend 1/HVM programs do not carry over. The upstream README says the compiler is
mostly AI-written, not fully audited, and that the Lean formalization can
disagree with `bend2/bend.ts`. Treat the pin as research material whose
behavior is established by this project's own gates.

Upstream layout, for navigating the checkout:

```text
bend2/bend.ts    parser, theory, checker
bend2/comp.ts    C/Metal/CUDA/JS compiler and runtimes
bend2/main.ts    CLI and Bun/Node .bend loader
bend2/base.bend  prelude and standard library
bend2/effs/      C and JS twins of every Base effect
guide/           GUIDE.md, EFFECTS.md, SHADERS.md
demos/ bench/    complete programs and the benchmarks behind the README charts
tests/           checker/compiler tests; #| lines are expected output
gates/           upstream repository gates (not run by this project)
```

## Running the compiler here

Always go through the project wrapper from the repository root. It refuses to
run unless the checkout's HEAD equals `bend2/TOOLCHAIN.json`, the checkout has
no tracked modifications, and Bun reports the pinned version. It sets
`BEND_NO_TELEMETRY=1` for the child, turns every `.bend`/`.html` argument and
every `-o` target into an absolute forward-slash path, runs the CLI with the
compiler directory as its working directory, and applies a timeout
(`BEND_TIMEOUT_MS`, default 120 s, or 300 s for `--run`).

```powershell
$env:BEND_NO_TELEMETRY = "1"   # also stops the CLI's once-a-day version check
node bend2/tools/bend.mjs version
node bend2/tools/bend.mjs guide            # also: guide effects, guide shaders
node bend2/tools/bend.mjs base --types     # or: base Map, base List
node bend2/tools/bend.mjs path/to/file.bend --check-only
node bend2/tools/bend.mjs --run path/to/script.ts   # Bun + tools/loader.ts, cwd = repo root
```

What each CLI form does (from `bend2/main.ts`):

```text
bend f.bend --check-only    parse and check f and its imports; never runs main
bend f.bend                 check; then a pure main is normalized by the checker
                            and printed (e.g. "14", "6n"); an IO main runs
                            in-process on the JS runtime under Bun (not native);
                            no main: only the check report
bend f.bend --checkup       check and run each "import X as A" file on its own
                            (Base preloaded); takes no -o
bend f.bend -o out.js|.cjs  emit single-threaded JavaScript
bend f.bend -o out.c        emit C source only
bend f.bend -o out          build a native binary (needs clang, see below)
bend page.html -o dir       bundle a page that imports .bend through Bun.build
bend f.bend -- a b          everything after -- is returned by IO.args
```

A pure `main` is evaluated by the checker's normalizer (`term_snf`), which is
far slower than compiled code; use it for small results only. To time real
code, emit JS or give `main` an `IO` type.

Native binaries: the CLI picks the first adequate compiler among `$CC`, `clang`
and `clang-NN` on PATH: clang 14+ for a CPU build, clang 19+ (Apple clang 17)
when the program has a `!` and a GPU toolchain exists (macOS, or CUDA headers).
The GPU program is then built by running the binary with `--gpu-build`, and it
lives in a sidecar `.gpu` file beside the binary. The binary accepts
`--threads N` (N ≥ 1, default: the CPU count), `--gpu on|off|<n>GB|<n>MB`
(`--gpu on` fails when no device is found), `--help`, and `--`. The emitted JS
accepts and ignores `--threads` and `--gpu`. There is no Windows native target
upstream ("No Windows (WSL works)"). On this laptop, WSL Ubuntu with Clang 18
built and ran the 2.0.27 browser-independent CLI from pinned C; see
[`NATIVE_CLI.md`](NATIVE_CLI.md) and its Linux receipt. That proves the CLI's
actual CPU/File/IO path, not the graphical Window/Audio path or GPU speed.

### Messages you will see

All of these were produced by probes against the pin.

| Situation | Output |
| --- | --- |
| Clean check | `All terms check.` |
| Clean, but unsafe/foreign code reachable | `All terms check, but N def(s) rely on unsafe or foreign code:` then the list |
| A law with no proof, or `?TODO` | `Error: 1 TODO found.` / `The code is incomplete, and not a valid proof yet.` |
| Affine variable used twice | `- expected : xs` / `- observed : xs (consumed more than once)` |
| Non-decreasing recursion | `- expected : a decreasing self-call (arguments are read left to right: each passed unchanged until one shrinks)` |
| Match on a computed value | `a parameter or field scrutinee (a match cannot scrutinize a computed value: give it its own def)` |
| `let` before a match on a parameter | `a match on a parameter or field (this name is a def or a consumed binder: give the value its own def)` |
| Use before definition, or mutual recursion | `- expected : a defined name` / `- observed : <name>` |
| `+x` on a non-Data type | `- expected : Data` / `- observed : Type` |
| Wrong type | `- expected : U32` / `- observed : Nat` with a `Context:` of the bound names |
| Destructuring in a parallel let | `a name (a parallel or typed let binds names; destructure in its body)` |
| `!` on a local or closure | `- expected : a named def before ! (only f!(..) offloads)` |
| Checker/normalizer recursion too deep | `Error: the machine stack overflowed (a deep recursion, or a literal too large to expand)` |

Every error is followed by a `Location:` excerpt with `>|` marking the line.
Messages are terse (the README says so); when one looks wrong, the cause is
usually one line earlier: a missing parallel-let value swallows the next line,
and a parenthesized expression after a call is parsed as more arguments.

## Syntax and data model

A complete, checked example (`.artifacts/probes/guide/ok.bend`):

```python
import Base

type Shape is Data:
  Circle{r: U32}

def area(x: Shape) -> U32:
  match x:
    case Circle{+r}:
      (r * r : U32)

law area_circle:
  for r: U32
  {area(Circle{r}) == (r * r : U32) : U32}

def area_circle(r):
  {==}

def main() -> U32:
  (2 + 3 * 4 : U32)
```

It checks, and running it prints `14`.

- **Declarations.** `type` declares constructors (one per line), `def` a
  function, `law` a claim whose last line is a type. A definition must appear
  before any use: referring to a later name fails with "a defined name". This is
  also why mutual recursion is impossible.
- **Filling a law.** The proof is a `def` with the law's name and bare
  parameter names, with no types and no return type: `def area_circle(r):`. The
  law supplies the signature. Writing `def area_circle(r: U32) -> ...` for a
  declared law is a parse error. A law imported through an alias is filled as
  `def Laws.name(...)`.
- **Modules.** `import ./file.bend as M` makes its defs `M.x`; aliases are local
  to the importing file. Dots in Base names such as `U32.add` are part of the
  name.
- **Operators.** Inside `(expr : T)`, `+ - * / %` call `T.add` through `T.mod`
  with the usual precedence (`(2 + 3 * 4 : U32)` is 14), `.&. .|. .^.` are the
  bit operations, `<< >>` shift by a `Nat`, and `< <= > >=` are `T.is_lt` and
  friends. Without `: T` the operators belong to `Nat`. `&&`, `||` work on
  `Bool`, `++` on `String`. Operators need spaces on both sides. `==` exists only
  as a type, `{a == b : T}`; runtime equality is `T.is_eq(a, b)`.
- **Literals.** `42` is `U32`, `1.5` is `F32`, `3n` is `Nat`, `'c'` is `Char`,
  `"s"` is `String`. A `Nat` literal past `256n` becomes `U32.to_nat(n)`, up to
  `4294967295n`.
- **Collections.** Lists are `[]`, `[a, b]`, `h <> t`; tuples `(a, b)`; arrays
  `[v : T*n]` (n slots) or `[v : T^d]` (2^d slots), read `a[i]`, write
  `a[i] <- v`.
- **No `if`.** Match on `True{}`/`False{}`, or use `Bool.pick`, which evaluates
  both arguments.
- **Annotations.** The checker infers little. Annotate literals and operator
  chains, `{3 : U32}`, and pass Base's quantity and type arguments explicitly:
  `List.length(&1, U32, xs)`, `List.append(&2, U32, a, b)`. Print a signature
  with `bend base List` instead of guessing.

### Matching and recursion

- A `match` scrutinizes a parameter or a variable bound by a pattern, never a
  computed value (`match f(x):` is rejected). A `let` may not come before a
  match on a parameter. To match on a computed value, pass it to a helper def.
- `match a b:` matches several values; patterns nest; `_` is a wildcard.
  Scrutinees follow binder order.
- `Nat` patterns: `0n`, `1n+p` (p is the predecessor), `2n+p`, and `1n++p`,
  which is `1n+p` with a reusable binder `+p`. `+name` in any pattern rebinds
  the field as reusable, which requires a `Data` type.
- `U32` literal cases work, but lower bit by bit: the JS target can rebuild a
  32-bit word on each residual branch (see the lessons below).
- Termination: every live self-call must shrink an argument, read left to
  right, each earlier argument passed unchanged. Put the shrinking parameter
  first. Use a decreasing `Nat` fuel parameter for loops that do not shrink a
  structure. `@unsafe def` skips the check and leaves the proof boundary.
- No mutual recursion: fold both cases into one def with a selector parameter.

## Types, quantities and kinds

Bend is affine by default: a live variable is used at most once, and an unused
one may be dropped.

```text
-x  erased: available in types and proofs, removed at runtime
 x  affine: the default, at most one live use
+x  reusable: may be used many times; its type must be Data
~x  template argument: closed syntax substituted per instance
```

`Type` is `Kind(&1)` (one owner) and `Data` is `Kind(&2)` (copyable).
Quantities are `&0`, `&1`, `&2`; `a <&> b` is their minimum. Datatypes can be
parameterized by a quantity: `type List<a, -A: Kind(a)> is Kind(a)`. So
`List<U32>` means `List<&1, U32>`, which is a `Type`, and `+List<U32>` means
`List<&2, U32>`, which is `Data`. To share a list, write both the binder and the
type as reusable: `def f(+xs: +List<U32>)`. `type T is Data:` declares a
copyable type; `is Type` keeps it affine.

Dependent forms: `@x:A -> B` (dependent function), `@-x:A -> B` (erased
dependent), `&x:A -> B` (dependent pair), `A | B` (sum), `A & B` (pair),
`{a != b : T}` (disequality).

Closures are values and remain affine: even a closure that captures only `Data`
is called at most once, and `+g: A -> B` is rejected (functions are never
`Data`). Top-level defs can be called any number of times. Templates (`~g`) are
the alternative: each distinct template argument set is compiled as its own
instance, with no closure allocation. Template arguments are closed and must be
declared before the template that calls them. The browser loader does not
export templates.

Arrays are `Type`, with one owner. A read returns the array beside the value,
and a write returns the rewritten array. The `a[i]` sugar assumes
`Array<U32>`; use `Array.get`, `Array.set` or `Array.swap` otherwise. Indices
wrap by the array size. `Array.clone` copies `Data` elements. `Array.fork` and
`Array.join` are `@unsafe`, and `Array.atomic.*` are declared laws with compiler
implementations. Do not use any of them in a rules core without an
owner-approved design.

The compiler may borrow a boxed value when a def only matches it or passes it to
a borrowing function. This is an implementation choice, visible in the emitted
C: `term_peek` is a borrow, while `term_keep`, `ctr_take` and `rfc_seal` mean
reference counting. An unnecessary `+`, or a second consumer, can turn a free
borrow into counting work (atomics when the value is shared across threads).

## Base data and number semantics

`bend2/base.bend` is the source of truth; print slices with `bend base <Name>`.

| Type | Behavior at the pin |
| --- | --- |
| `Nat` | Peano `Zero`/`Succ`. `Nat.sub` saturates at zero. `Nat.divmod(a, 0n)` is `(0n, a)`. In JS it is a checked `BigInt`. |
| `U32` | Wrapping add, sub, mul and bit operations. `U32.div(a, 0)` is `0`; `U32.mod(a, 0)` is `a`. `U32.shl`/`U32.shr` shift by 1; `U32.shln`/`U32.shrn` take a `Nat` count. In JS a number (`>>> 0`, `Math.imul`). |
| `Bool` | `False{}`/`True{}`; `Bool.and`, `Bool.or`, `Bool.not`, `Bool.pick`. A JS boolean. |
| `Cmp` | `LT{}`, `EQ{}`, `GT{}`; `Cmp.is_lt/is_eq/is_gt/is_le/is_ge`. |
| `F32` | 32-bit float; its operations are declared laws (axioms), not proofs. No `F64`. A JS number. |
| `Char`/`String` | Source-level lists of code points. In JS a `Char` is a one-code-point string and a `String` is a JS string. |
| `Maybe`/`Result` | `None`/`Some` and `Fail`/`Done`; both work with `do`. |
| `List`/`Map`/`Set` | Affine or reusable by their quantity. `Map` is string-keyed and returns the map beside lookups. `List.sort` is a merge sort; `List.foldr` is not tail-recursive. |
| `Array` | A power-of-two `ALeaf`/`ANode` tree in source; a real JS array in JS. |
| `Image`/`Event` | `Pix{color}`/`Qua{tl,tr,bl,br}` quadtrees; `Key`, `Mouse`, `Move`, `Close` events. |

F32 identities, rounding, NaN behavior and cross-target bit equality are not
proved. Keep F32 out of deterministic rules state and convert at a deliberate
boundary; `F32.to_u32` and `F32.to_nat` are runtime conversions.

## Laws, proofs and the trust boundary

Keep specifications and implementations apart:

```text
LAWS.bend   human-owned claims; imports the code and states required behavior
PROOF.bend  implementation-side proofs; imports ./LAWS.bend and fills every law
```

The CLI treats a file named `PROOF.bend` specially: it must import
`./LAWS.bend`. Law syntax:

```python
law name:
  for x: A              # a parameter; also for -x (erased), for +x (reusable)
  for y: B where P(y)   # y becomes the pair (y, proof of P(y))
  exs z: C              # a witness the proof must return
  {lhs == rhs : T}      # the claim
```

Proof tools: `{==}` is reflexivity (it holds when both sides normalize to the
same term), `%e : P` rewrites the goal with the equality proof `e` and
continues on the next line, `%e@E : P; e2` is the named form, pattern matching
gives case analysis, and a recursive call is the induction hypothesis (it must
descend like any recursion). `?name` prints the goal at that point; `?TODO`
leaves it open and makes the check fail. `demos/pure_par_sum/PROOF.bend` is a
compact worked example of induction with rewrites.

The checker has two modes. Live code must be affine and well-founded. Types,
erased arguments and equations are checked in the dead mode, where terms may
diverge or inhabit `Empty`, but dead evidence is never promoted to live
evidence. This wall is what permits `Type : Type`, negative recursive types and
no positivity check; it does not make arbitrary dead terms proofs.

What a green check means: `All terms check.` says the source terms closed. It
does not say that foreign C/JS bodies, generated C/Metal/CUDA/JS, the browser,
an OS effect or a remote peer behave. `@unsafe` defs, foreign effects and F32
axioms are reported by the "rely on unsafe or foreign code" warning. Laws can
constrain pure transitions and codecs; keep an independent reference and
differential tests beside them.

Proof cost is real. The checker normalizes terms to compare them, so a large
definition used inside a law can exhaust time or the Bun stack. This project
runs its aggregate v2 proof under a pinned Node 24.12 worker with a 64 MiB stack
(`bend2/core/v2/node-check.mjs`), because Bun hit its stack limit on the
Canonical and RangeBridge proofs.

## Parallelism

This is the most important section for new work. Write code in parallel shape
by default, even though the shipped game runs on JavaScript today. A balanced
fork tree costs nothing extra on JS, is shallower than a linear recursion, and
is exactly what the native CPU pool and the GPU need.

### The two constructs

**Parallel let.** `a b c = f(x) g(y) h(z)` binds n names to n values in one
statement. The names must be plain names on the same line as `=`; the values may
continue on following lines, as in the upstream shaders:

```python
tl tr bl br = scene(e, x, y, cam) scene(e, x1, y, cam)
  scene(e, x, y1, cam) scene(e, x1, y1, cam)
Qua{tl, tr, bl, br}
```

How it is checked (`bend.ts`, "check-let"):
- Each value is checked in the outer scope, so no value can see a sibling's
  name ("a defined name" error).
- Uses add up across siblings, so passing the same affine variable to two
  values fails with "consumed more than once". Share through a `+` binder of a
  `Data` type; split affine data (lists, arrays, handles) before the fork.
- Termination still applies to every branch.
- A parallel let is not allowed inside a `do` block (the error message is the
  misleading "a name ..."). Put the fork in a pure helper def.
- A local bound by a parallel let cannot be matched directly; pass it to a def.

**The bang.** `f!(x)` marks a call to a named top-level def. The checker gives
it no meaning (typing is identical to `f(x)`); it only affects native code. On
a native build it hands that call, and every parallel call inside it, to the
GPU, or to the CPU pool when there is no GPU or `--gpu off`. `!` is rejected on
locals and closures ("only f!(..) offloads"), and `f! (x)` is a parse error.

### How it lowers (`comp.ts`)

- A parallel let **forks only if every live value is a call** to a def (or a
  closure apply). If any value is a literal, constructor, intrinsic such as
  `U32.add(f(x), 1)` or other expression, the whole let is silently rebuilt as a
  chain of ordinary lets, and the def is marked fork-free. Dead binders are
  dropped first. Precompute arguments in separate lets and make every fork
  value a plain call.
- On C, a fork allocates one join task plus one task per call under
  `if (!seq)`, and falls back to plain stack calls when running sequentially.
  The host pool grows the task frontier breadth-first to 16,384 tasks, then each
  ring drains its subtree with `seq = true`, so everything below the frontier is
  sequential. Tasks are never moved (no work stealing): unbalanced trees leave
  cores idle.
- A def is **flat** (compiled to a tight native loop) when it has no parallel
  let, no bang, no closure apply, no non-flat call and no non-tail self call.
  Flat leaves are the goal on the device, where each lane has a 2,048-word
  stack.
- A `!` on a value inside a parallel let is dropped. A bang acts on a single
  call (a tail call or a let with one value), and it is honored only on the
  host's solo path: a bang reached after host forks in the same evaluation runs
  on the CPU pool. Put the bang at the root of the tree:
  `r = render!(depth, scene)`, with the forks inside `render`.
- The C backend refuses a fork segment or join over 255 words ("an arity over
  255"); keep fork results narrow, or return a constructor.
- Arrays cannot be passed down a fork tree safely; build lists or quadtrees and
  assemble at the join.
- **JavaScript:** a parallel let becomes sequential `const` bindings, left then
  right; `f!(x)` emits byte-identical JS to `f(x)`; tail calls become `run_jump`
  trampolines (one `{$:"$JMP"}` object per iteration); non-tail calls are
  native JS recursion. `--threads` and `--gpu` do nothing.

### What this means on JavaScript (measured)

Probe `.artifacts/probes/parallel/t_*.bend`, Bun 1.4.2, a machine loaded by
proof gates, 7 interleaved runs, whole-process medians. Compare the rows with
each other, not with other machines:

| Shape (2^20 leaves, same result) | Median |
| --- | ---: |
| Balanced tree, parallel let | 424 ms |
| Balanced tree, parallel let with `!` | 493 ms (same JS; noise) |
| Balanced tree, sequential lets | 511 ms (same JS; noise) |
| Tail-recursive list build and fold | 796 ms |

On JS, parallel shape has no cost, and the tree beat the tail-recursive list
loop, which allocates a trampoline object and a `BigInt` per step. Stack depth
matters more: non-tail recursion overflowed at about 32,000 levels in Bun (about
29,000 with a parallel let per level), and Chrome is far lower (this project saw
a 5,440-deep leaf fail). A balanced tree of depth log2(n) removes that limit.
The browser build runs Bend in one Web Worker, so JS parallel shape gives no
speedup; the benefit is depth, the native path, and future targets.

### Experimental JS helper workers (downstream variant)

The clean Bend 2.0.27 pin still emits synchronous JavaScript. A separate
source-bound downstream patch, documented in
[`004-web-workers/README.md`](../toolchain-patches/004-web-workers/README.md),
adds an **explicit async library output** without changing the normal import.
Use the project preparation and emission scripts rather than editing the pin:

```powershell
node bend2/tools/prepare-worker-toolchain.mjs
node bend2/tools/emit-worker-libs.mjs
```

`f@(args)` requires actual computation in a helper, optionally `f@4(args)`
caps the number of helpers; `f~(args)` makes a serial island. Plain calls are
automatic candidates *only inside this new output*. The old native `!` mark
does not turn the ordinary browser bundle into parallel JavaScript. Worker
sessions are explicit and asynchronous; `close()` terminates owned helpers.
The generated `index.mjs`, content-named modules, and manifest travel together
under a nested static URL. The host owns worker creation and transport; Bend
owns the pure computation and checked source. See the patched compiler's
`guide/WEB_WORKERS.md`, `WEB_WORKERS_CONTRACTS.md`, and
`WEB_WORKERS_STAGE2.md` for types, policy scope, input snapshots, cancellation,
packed transport, and finite F32 restrictions.

On this Windows checkout, the worker variant passed 107 Node/Bun tests and a
639-fixture differential matrix, and its generated static ESM module workers
passed functional checks in Chrome, Edge, Firefox, and WebKit. WebKit executed
correct JavaScript served as `text/plain` while the other engines rejected it;
corrupted content and mixed builds still failed there. This is local browser
evidence, not a deployed-site claim. Auto scheduling remains conservative and
can incur a very large validation/copy cost on cheap, large-argument calls.
Keep those on the synchronous API. A required helper can win on coarse work,
but that alone does not justify enabling auto at every game boundary. The
bounded `maySuspend:false` fast-path experiment used two depth-7 Image-shaped
arguments (21,845 ADTs; 1.62 MB wire form) and found that validating without
copying still took 20–27 ms median, against sub-0.02 ms serial leaves. The
usual snapshot took 33–47 ms median. The no-copy variant retained rejection
of cycles, getters, extra fields, exotic prototypes and node-budget excess;
skipping validation would change the public host-input contract. We therefore
did not ship that compiler change. Route the game's measured coarse bot work
through its required helper, keep input/rendering serial, and use the separate
scene helper for settled artwork. These are Windows local fixture timings,
not GPU or broad-device conclusions; the ignored raw probe receipt is at
`.artifacts/bend2/toolchain-patches/workers-stage2-20260925/bench/workers/auto_fastpath-baseline.json`.
The Rift browser build packages only selected measured worker libraries, includes
their five files in its service-worker cache, and checks a build-only source
binding so an old compiler or changed Bend source cannot silently be served.

The game's **sprite helper** is a second, distinct pattern: a static browser
module worker imports the ordinary source-bound selected `BoardScene.bend`
book. It is not a `f@(...)` compiler-generated worker library. Bend supplies
asset paths/caps, decodes three RGA2 pages, renders the court and pieces, and
later issues a pure controller `refine` packet. JavaScript only schedules,
fetches bounded bytes, clones one completed immutable `Image`, rejects stale
revision/theme/placement, and presents the Bend-composed pixels. This avoids
blocking input on a costly settled render, but cloning a full Image and
duplicating a Bend book/plate in two workers are expensive. Do not send a
quadtree on every pointer move. The 128px-ground/256px-silhouette motion path
measured about 57 ms p90 pixel preparation and 126 ms p90 end-to-end reply in
one local Chrome run; detailed helper refinement was roughly 2–3.5 seconds
under loaded conditions. These timings support the scheduling choice, not a
GPU or production responsiveness claim. Source and test paths are
`platform/browser/sprite-helper.ts`, `ApplicationControl.refine`, and
`tests/sprite-helper-node.mjs`.

### Idioms

- **Balanced range split.** Index leaves by depth and offset, and make leaves
  chunks rather than single items:

  ```python
  def fold(+d: Nat, +i: U32) -> Acc:
    match d:
      case 0n:
        chunk(64n, i)                      # a flat loop over 64 items
      case 1n+p:
        a b = fold(p, i) fold(p, U32.add(i, U32.shln(64, p)))
        merge(a, b)
  ```

  `bench/runtime/mandelbrot/main.bend` (`hfold`) is the upstream model; the v2
  kernel's `legal_tree.body` (21,760 action IDs, depth 5, 32 leaves of 680) is
  this project's.
- **Quadtree images.** Recurse on `Image` quadrants with a four-way parallel
  let, returning `Pix` early for uniform tiles; `demos/app_ray_tracer_3d`
  (`Fly.scene`) and Base `Image.free` do this.
- **Scene data per tile.** Cull on the host, hand each tile a short candidate
  list, and let each leaf walk that list. Avoid one shared counted scene tree
  read by every lane.
- **Rows and sprites.** Split row ranges or sprite lists in halves; join by
  appending lists or composing `Qua` nodes.
- **Move generation and evaluation.** Split the ID range (as `legal_tree`
  does), or fork per candidate subtree in a search; combine with a pure,
  associative merge (append, min/max, sum).
- **Granularity.** Upstream advises about 4^7 leaves per bang on a 16,384-lane
  device, one per lane, with flat leaf loops. It is a benchmark heuristic, not a
  requirement; on the CPU pool, a few hundred to a few thousand leaves suffice.

### Anti-patterns

- A non-call value in a parallel let (serializes silently).
- Unbalanced splits: head/tail recursion written as a fork, or halves of very
  different cost.
- One fork per pixel or per item: fork overhead dominates.
- A bang inside a fork, inside a `do` continuation (the callee then owns and
  re-reads the data), or on a tiny call.
- Sharing large `+` structures across every lane, or pushing an `Array` down
  the tree.
- Stateful folds that thread one accumulator through every item: they cannot
  fork. Restructure as a tree reduction with an associative merge.

### Checklist for converting sequential code

1. Find the loop's independent unit (item, ID range, row, tile, subtree).
2. Replace a linear recursion with a depth-indexed split: `(depth, offset)` or
   halves of a list or quadtree.
3. Choose leaf size so there are hundreds to thousands of leaves and each leaf
   is a flat loop.
4. Make every parallel-let value a plain def call; precompute arguments above
   it.
5. Make shared inputs `+` and `Data` (or pass per-branch slices); keep affine
   handles out of the fork.
6. Merge results with an associative, pure function (append, `Qua`, sum,
   min/max). Prove or test that the tree equals the sequential version;
   `demos/pure_par_sum` proves exactly this by induction.
7. Put a single `f!(...)` at the root, only where a native build is planned.
8. Check the emitted C (`-o x.c`) for the join (`task_node`) and the emitted JS
   for the recursion depth; run the existing pixel and conformance gates.

### The serial contract

Parallel shape applies to pure computation only. In this project, input
ordering, state transitions (one accepted command at a time), host buffer
writes and presentation remain serial. Never alias an `Array` across branches
or write a shared mutable pixel buffer; produce immutable images or lists and
let the host copy them after the join.

## Effects and FFI

`IO(A)` is a pure description of an effectful computation. A `do` block
desugars onto `M.bind`/`M.pure`: `x : T <- action` binds, `x : T = v` is a pure
let, a bare term is a `Unit` step, `return v` ends. The same notation works for
`IO`, `Maybe`, `Result` or any module with `bind`/`pure`.

Base effect families: printing, environment and arguments, time, sleep and
randomness, spawn and channels (`IO.fork` returns a channel, `IO.join` receives
and closes it), files, TCP, UDP, windows, audio, and the `App` loop. Handles
(`File`, `Socket`, `Listener`, `Window`, `Audio`) are opaque affine values:
every operation returns the handle beside its result, so it cannot be forged or
reused. The event loop interleaves pure work and parks on sleep, sockets or
channels.

An effect is a def of type `IO(R)` with one C and one JS twin:

```python
def Clock.now() -> IO(U32):
  import "./clock.c"
  import "./clock.js"
```

The host function name is the def name lowercased with dots turned into
underscores (`clock_now`). The JS side returns plain JS values, or `io_done`,
`io_fail`, `io_tup`. The C side is spliced after the runtime and uses its
helpers; at this pin `EFFECTS.md` documents `io_node(e, CID_K, a, b)` for a
two-field constructor and `io_wait_on(w, fd, POLLIN, deadline, more)`, where the
deadline is `0` or an absolute `io_tick()` value. These names are
version-specific with no ABI promise: re-read `EFFECTS.md` and rebuild foreign
effects whenever the pin changes.

JavaScript effects on this machine: `IO.print` works (the probe printed
through the wrapper). `Window.open` always fails with "Window.open: no display
(build a native binary ...)". `Audio.open` returns a silent device drained by the
clock. The Base File and other libc-backed effects load `libc.so.6` or
`libSystem` through `bun:ffi`, so they fail on Windows before a program runs.
Base has no TLS, HTTP, JSON or regex library; a foreign extension would widen
the trust boundary.

## Browser integration and interop

`bend2/main.ts` is also a Bun loader: `import Game from "./main.bend"` compiles
the module. The loader exports every definition that is filled, not from Base,
not IO, not a template and not foreign. Each export is a curried JS function of
the **live** arguments only; erased (`-x`) parameters are omitted, and partial
application is allowed.

Values crossing the boundary:

| Bend | JavaScript |
| --- | --- |
| constructors | `{$: "Name", field: value}` (lists: `Con{head, tail}`/`Nil`) |
| `Nat` | `BigInt` |
| `U32`, `F32` | number |
| `Bool` | boolean |
| `Char`, `String` | string |
| `Array` | JS array (not copied) |
| closures | JS functions |

Copy an array on the host before retaining it if a Bend call may rewrite it.
Define a canonical codec for anything persisted; do not JSON-stringify runtime
objects without a schema.

This project does not use the upstream loader directly. `bend2/tools/loader.ts`
wraps it with a local Windows path adapter (tagged `BEND-WINDOWS-PATH-1`) that
normalizes backslashes before relative imports resolve, and relocates only
pinned Base foreign `tld.i` paths (`./effs/*.js`, `./effs/*.c`) to the compiler's
effect directory so `js_lib` can realpath them when `--run` keeps cwd at the
repository root. It remains needed at d379091 (imports still resolve through
`path.posix`; foreign twins remain relative), and must be rechecked on every
pin change. Run Bun scripts with
`node bend2/tools/bend.mjs --run script.ts`. The browser build is
`node bend2/tools/bend.mjs --run bend2/tools/build.ts`, which bundles
`Application.bend` into a worker and writes `bend2/dist` (git-ignored). The page
owns Canvas, WebAudio, storage and input. Do not expect `Window.open` or
`Audio.open` to become browser APIs.

The pure graphics model: `Image` is a quadtree, `Pix{color}` a uniform square
and `Qua{tl, tr, bl, br}` a subdivision. `App.run` opens a native window, calls
`view` (which returns the affine state beside the image), presents, collects
events and calls `tick`; `None{}` exits. `demos/app_win_is_bug_2d/web` shows the
browser boundary: its UI imports `../main.bend`, sends every move through
`Game.replay`, and draws the returned state on Canvas.

## Performance pitfalls

- **Strict arguments.** Every argument is evaluated, including both branches
  given to `Bool.pick`. Classify outside, inside and partial cases before
  making recursive calls; return untouched subtrees directly.
- **JS strings.** Matching `SCon` on a JS string slices it, so walking a
  `String` character by character is quadratic. Keep large text as lists of
  `U32`, or process it on the host.
- **JS arrays.** Matching `ANode` on an array slices both halves (a copy per
  level). Use `Array.get`/`Array.set`, not structural matching, on hot paths.
- **JS tail loops** allocate a trampoline object per iteration, and `Nat`
  arithmetic is `BigInt`. Prefer `U32` counters and tree-shaped reductions in
  hot code.
- **JS recursion depth.** Non-tail recursion overflows at about 30,000 levels in
  Bun and far fewer in Chrome; `List.foldr` and naive list maps are non-tail.
- **U32 patterns** can rebuild a 32-bit word on each residual branch in JS.
- **Equivalent Boolean forms lower differently.** One nested `Bool.and` test
  allocated trampolines where an equivalent disjunction lowered to direct JS.
  Inspect the emitted code (`-o x.js`) before and after optimizing.
- **Pure `main` runs in the checker's normalizer**, which is slow; do not time
  code that way.
- **Proof normalization** unfolds definitions; keep large predicates behind
  helper defs whose parameters stop unfolding, and use guard lemmas.
- **Native:** shared `+` values cost reference counts or atomics per read; big
  fork results can exceed the 255-word arity limit.

## Known compiler bugs and limits at this pin

- **Windows paths** (`BEND-WINDOWS-PATH-1`): the upstream loader resolves
  relative imports as POSIX paths; `js_lib` realpaths foreign `tld.i` twins
  from cwd. `bend2/tools/loader.ts` normalizes import slashes and resolves only
  pinned Base `./effs/*` imports against the compiler's effect directory.
  Local adapter, not an upstream patch. Its frozen loader bytes and complete
  mutation-input binding are recorded in tool-only amendment 004.
- **No Windows native target**; JS libc effects (File and friends) fail on
  Windows; JS `Window.open` always fails and JS audio is silent.
- **Full graphical C emission** remains open. An earlier 600 s attempt did not
  finish; a later exact-source 001 diagnostic timed out at 300 s and about
  6.12 GiB peak RSS without C output or a new arity offender. The optional
  001+002+003 compiler stack also reached a 480 s bound without C output.
  These are bounded timeouts, not native binaries or evidence of a memory
  failure. The text `NativeCLI.bend` did emit C and was actually built and run
  as a Linux ELF in WSL; see `NATIVE.md`, `NATIVE_CLI.md`, and the native CLI
  receipt.
- **Arity:** a C fork segment or join over 255 words is refused. The separately
  carried 001 patch reports the exact table/owner/captures; 002 adds a checked
  local-only `--explain-layout` report. The optional 003 experiment boxes only
  wide live join captures, retains raw-return rejections, and has finite
  combined-stack one/four-thread Linux CPU evidence. None changes the default
  clean pin or wrapper. See [`toolchain-patches/README.md`](../toolchain-patches/README.md)
  for application order, hashes, limitations and rebase gates.
- **JS continuation passing for non-tail calls** is listed as not implemented
  (`WONTFIX.txt`); deep non-tail folds overflow the host stack.
- **Bun stack** is too small for some proofs; use the Node proof runner.
- **Parse traps:** a missing parallel-let value swallows the next line; a
  parenthesized value after a call is glued on as arguments (wrap it in braces,
  `{(x + 7 : U32) : U32}`); a parallel let inside `do` reports a misleading
  error. Safe forward calls to unfilled defs remain rejected; datatype names
  may now be declared before their bodies and refer to one another.
- **Fixed at ff7a40c:** a second book compiled in the same process reused a stale
  probe list (bendlang/bend#976). This project's loader compiles several books
  per Bun process, so the fix applies here.

## Large Bend application and module boundaries (2026-09-24)

The draft whole-game presentation imports a large book. One phase-instrumented
`ApplicationV2.bend` run loaded 55 modules/2,229 definitions in 10.9 s and
completed `book_valid` in 57.2 s at about 5.1 GiB RSS. A separately selected
Chrome raster bundle validated in 27.5 s, then spent 411.5 s in `Comp.js_lib`
and peaked at 7.35 GiB, producing 955,681 bytes of JS. Those timings are on
this Windows/Bun host; they are not frame times or native/GPU benchmarks.
`Comp.js_lib(book, roots, exports)` can emit only named reachable entry points,
but it does not shrink the imported book that `book_valid` checks first. A
controller that imports the full painter still pays for that closure.

For an isolated browser build, compile a Bend controller (input/picking,
session, cache/detail policy and tagged render requests), the Bend board scene,
and Bend chrome raster as genuinely separate books. The generic JS host may
pass their immutable values and execute the Bend-authored requests; it must
not choose game or UI policy. A finite two-book probe in
`tests/module-interop/` passed `Data`/`Image` values between independently
compiled JS books and retained object identity. That does **not** prove affine
ownership across an untyped host call, browser equivalence, or native C
linkage. Bind every emitted bundle to the same source/toolchain closure, avoid
`structuredClone` across this boundary, and compare the real browser behavior
to the single-book reference. A native graphical entrypoint still needs its
own Bend composition and actual C build/run evidence.

The checker requires a `match` scrutinee to be a parameter or field. Matching
a computed expression or local binder is rejected: move that case split into
a helper whose formal parameter is matched. For multi-scrutinee recursion,
follow parameter order and put a structurally decreasing argument first;
the current compiler may reject an apparently decreasing later argument.
When one affine value is inspected and passed onward, mark sharing explicitly
with `+` at the relevant parameter/binding rather than relying on a local
alias. These restrictions surfaced in the v2 scene, compiler diagnostics,
and controller split; a source check is required before expensive emission.

## Changes from 6a77e12 to d379091 (2.0.27)

The checker now declares datatypes up front, so datatype names can refer to one
another and a type-level def may appear above its datatype. Safe live calls to
later defs and safe mutual recursion still fail; `@unsafe def` may call ahead,
and `def f?(...)` is its unsafe spelling. Never use this to discharge a law:
unsafe/foreign dependencies remain outside the pure proof claim. Base's `Word`,
`Pair`, and `IO` declarations were rearranged but keep their interfaces. The C
and JavaScript compiler emitter (`comp.ts`) and effect twins are unchanged.

The bundled Bend executable no longer loads a project's `bunfig.toml` or
`.env` before checking it. Our development wrapper invokes `bun bend2/main.ts`
from the pinned checkout, which does **not** inherit that bundled-executable
hardening. Keep its cwd in the reviewed compiler tree for source checks and
never use an untrusted project's Bun configuration. We do not use BendHub; the
new publishing license/terms behavior and `User-Agent: bend/2.0.27` are
documented for completeness, not exercised here. See the pinned CHANGELOG and
the reviewed toolchain amendment for exact evidence.

## Changes from ff7a40c to 6a77e12

Bend 2.0.26 (`6a77e12`) follows 2.0.25 by five commits:

1. `2665926`: `comp.ts` sheds about 2.8k tokens with the same output. The
   channel runtime moves into `effs/chan.c` and `effs/chan.js` beside the
   `Chan.*` defs in `base.bend`, and both match emitters share one table.
   Emitted C and JS are stated byte-identical except for channel programs;
   this project uses no channels, and the browser build's content version
   (`361b9895746876a71757`) was the same before and after the pin.
2. `f7dc536`, `f52f033` (#996): packages get names on the hub.
   `import <name>@<version>/file.bend as P` resolves a name once and caches the
   hash under `~/.bend/lib/names`; `--publish <name>@<version>`, `bend link` and
   `bend login` are new CLI commands. This project imports no hub packages and
   never runs publishing commands.
3. `df5c499`, `6a77e12`: README and flake version text.

Bun stays 1.4.2. Every project gate passed again under 6a77e12 (amendment
`003-bend-6a77e12`).

## Changes from a495242 to ff7a40c

Both pins are Bend 2.0.25. Upstream made three commits between them:

1. `ad424af` "A second book compiled in one process starts from a fresh probe
   list" (#976): one line, `PROBES.length = 1`, in `comp.ts` `carb_book`. It
   removes cross-compilation state leakage when one process compiles several
   modules (our browser build and Bun test scripts).
2. `ff7a40c` "The effects guide calls io_node and io_wait_on as the runtime
   declares them" (#947): documentation only. `io_node` takes no trailing `0`,
   and `io_wait_on` takes a deadline argument. No project effect is written in
   C, so nothing here changed.
3. `db06f02`: a README link to a community language server (diagnostics and
   hover; not used here).

`bend.ts`, `base.bend`, `main.ts` and the effect twins are byte-identical
between the pins. Every project gate passed again under ff7a40c (see
`../README.md` and the amendment record).

## Updating the Bend toolchain

Do this regularly (upstream moves quickly), and always as its own commit.

1. **Fetch and read.**

   ```powershell
   $old = (Get-Content bend2/TOOLCHAIN.json | ConvertFrom-Json).bendCommit
   git -C .artifacts/toolchains/bend fetch origin
   git -C .artifacts/toolchains/bend log --oneline "$old..origin/main"
   git -C .artifacts/toolchains/bend diff --stat "$old" origin/main
   ```

   Read `CHANGELOG.md` and the diffs of `bend2/bend.ts`, `comp.ts`, `main.ts`,
   `base.bend`, `effs/` and the three guides. Note anything that affects the
   loader's Windows adapter, effect ABIs, exports, or proof normalization.
2. **Pin.** `git -C .artifacts/toolchains/bend checkout main` and
   `git -C .artifacts/toolchains/bend pull --ff-only`; the tree must stay clean.
   Update `bendCommit` (and `bendVersion`) in `bend2/TOOLCHAIN.json`. If Bun
   must change, install only the official `@oven/bun-windows-x64@<version>`
   package into `.artifacts/toolchains/runtime` and update `bunVersion` and
   `bunWindowsPackage`. Update the compiler block of
   `bend2/lib/graphics/VERIFICATION.json`, adding the old pin to
   `compilerHistory`.
3. **Re-verify in draft mode** (the manifests still record the old bytes):

   ```powershell
   node bend2/tools/verify.mjs --draft                    # v1 readiness receipt
   node bend2/core/v2/check.mjs                           # v2 aggregate proof + conformance
   node bend2/tools/mutate-v2.mjs                         # six mutation controls
   cmd /c "node bend2\tools\verify-library.mjs --check > library.json"
   node bend2/tools/bend.mjs --run bend2/tools/build.ts --draft   # bend2/dist/build.json
   node bend2/tools/amend.mjs                             # lists the drifted frozen files
   ```

   Receipts must be UTF-8 without a byte-order mark. Windows PowerShell 5's
   `>` writes UTF-16 and `Out-File -Encoding utf8` adds a byte-order mark, so
   redirect through `cmd /c` as shown; `amend.mjs` rejects either encoding.

   If anything fails, fix the implementation or proofs; never weaken a law. A
   change to any `.bend`, fixture, reference, test or evidence byte cannot be
   amended and needs a new semantic version under `LAW_CHANGE_POLICY.md`. If a
   break is severe, stop and record a minimal repro.
4. **Review.** An independent reviewer checks the diff and receipts and writes
   `review.md` containing `Review disposition: accepted` and one line per
   receipt: `v1 SHA256: <hex>`, `v2 SHA256: <hex>`, `mutations SHA256: <hex>`,
   `library SHA256: <hex>`, `build SHA256: <hex>`.
5. **Record the amendment.** Write a spec with `slug`, `kind`, `rationale` and a
   `files` map giving a reason for each drifted file, then:

   ```powershell
   node bend2/tools/amend.mjs --create --spec spec.json --v1 v1.json --v2 v2.json `
     --mutations mutations.json --library library.json --build build.json --review review.md
   ```

   It refuses unless the spec lists exactly the drifted files, all of them
   substitutable (`bend2/TOOLCHAIN.json`, `bend2/tools/*.mjs|ts`,
   `bend2/docs/*.md`), every receipt passed on current bytes and the review
   binds them. It copies the evidence to
   `bend2/docs/evidence/amendments/NNN-slug/` and writes
   `bend2/laws/amendments/NNN-slug.json`, chained to the previous amendment by
   hash. Frozen manifests are never rewritten.
6. **Verify for real:** `node bend2/tools/amend.mjs`, `node bend2/tools/freeze.mjs`,
   `node bend2/tools/freeze.mjs --graphics`, `node bend2/tools/freeze-v2.mjs`,
   `node bend2/tools/verify.mjs`, a non-draft build, and the root `npm test`
   and `npx tsc --noEmit`.
7. **Update docs:** this guide's header and "Changes since" section,
   `SOURCE_CATALOG.md` links, and the README.

A frozen English document (such as `LAWS_V2.md`) is amended the same way, with a
byte-identical preserved copy of the old text listed under `preserved` in the
spec.

## A practical workflow for new Bend code here

1. Keep `LAWS.bend` files human-owned and immutable to the implementation
   worker.
2. Start with pure `Data` state and pure transitions. Use `Nat`/`U32` for rules;
   keep F32, IO handles, arrays and host objects at the boundary.
3. Write small laws for preservation, rejected actions, replay and
   serialization, and fill each law before adding features.
4. Check (`--check-only`), then run differential cases against the reference. A
   checker result does not replace reference or hostile-input tests.
5. Write computation in parallel shape (see above), and merge with pure
   functions.
6. Expose only pure functions to the browser, through `Application.bend`.
7. Measure JS startup, bundle size, transition time and frame cost; report CPU,
   GPU, browser and owner-acceptance evidence separately.

## Lessons from this adaptation

Observations from this project at the pinned compiler, not promises about later
Bend releases:

- **Check small slices early.** Record fields need destructuring or getters; a
  computed scrutinee needs a helper parameter; a pair from a computation is best
  wrapped in a small `Data` constructor with getters inside recursive bodies.
- **No mutual recursion through helpers.** Put the branch flag in the recursive
  def's parameters and match it before the smaller call.
- **Strict arguments matter for pixels.** Computing all four child images
  before `Bool.pick(outside, old, children)` still does the work.
- **Inspect emitted JavaScript when optimizing.** A U32 pattern's residual branch
  rebuilt a Word each iteration; a structural list traversal with a Boolean
  zero flag avoided the allocation.
- **A proof can be true but expensive to normalize.** Generic Boolean guard
  lemmas avoided repeated unfolding; matching the Position parameter in
  `legal_range` stopped symbolic unfolding without changing runtime meaning.
- **Split large browser books by actual import closure.** `book_valid` checks
  the whole imported book before selected-export pruning; merely selecting
  fewer roots from one monolith does not save validation cost. The current
  browser emits the Bend controller, board scene and chrome raster in separate
  supervised processes, binds each artifact to all source/toolchain bytes, and
  carries ordinary `Data`/`Image` values across those books. Test that ABI in
  an actual browser; selected JS checks alone do not prove the host seam.
- **Keep the entire visible app in Bend when that is the goal.** Here Bend owns
  menus, bitmap fonts, selection and camera policy, record validation and PCM
  synthesis. Browser TypeScript transports typed events, immutable pixels,
  storage/files and sound to devices; it never chooses a chess transition.
- **Cut reusable libraries below game semantics.** `lib/graphics` has Base-only
  modules and colocated laws, proofs, finite tests, examples and license. Camera
  limits, Rift topology, piece art and animation remain project adapters.
- **Tune GPU forks on the device, with phase timers.** The pinned
  `guide/SHADERS.md` recommends one root bang leading to roughly `4^7`
  balanced leaves, with flat work at each leaf; sweep adjacent depths rather
  than adding `!` to every child. Its CUDA path can fault managed-memory
  pages across PCIe when host preparation and checksum touch the same scene.
  A Linux RTX 5090 fixture at graphics commit `fb73a82` changed one 512px
  `Plan.render` call to `render_offload` but used `forks=1`, so at most four
  device branches preceded serial raster. The reported 28.8 s GPU versus
  0.41 s four-worker CPU median included process startup, preparation,
  16 renders, checksum and output. It proved device execution and pixel
  equality, but cannot isolate kernel, launch or readback cost, or predict a
  better fork setting. Preserve the single-core and four-worker references,
  compare exact pixels, and time cold, warm-render and readback phases before
  using a GPU tier in a game. The [source-bound host receipt](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842302700)
  identifies the one-line fixture edit, command and timing boundary.
  A corrected CUDA-enabled, phase-separated [RTX 5090 pilot](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5842986555)
  later verified actual device processes, 25 CPU and 35 device case executions,
  first-frame pixel equality and 16-frame checksum equality. Increasing the
  512-square fixture from cuts/forks `3/1` to `7/7` reduced 15 GPU warm
  render-return calls from 26,533 to 347 ms, while host checksum traversal
  rose from 132 to 1,552 ms. At `7/7` four CPU workers took 426/18 ms for
  those phases. Fork shape plainly matters; returning and consuming pixels
  remains the measured bottleneck. The pinned C runtime's GPU-preferred
  managed pages make page migration plausible, but that transfer has not been
  independently timed. Test it in isolation before changing the library or
  selecting a GPU detail tier. This is a single fixture, not game frame time.
  Native Linux `Window.frame` in the pinned `bend2/effs/window_frame.c` has a
  separate CUDA path: `window_dev` traverses the tree on-device, then
  `cuMemcpyDtoH` moves a flat `width × height × 4` output buffer. The expensive
  host quadtree checksum is therefore not a proxy for that native display
  path. Measure the real graphical ELF, first on CPU and then on GPU under a
  fresh grant, before making a native GPU policy choice.
  A later [paired-read CUDA fixture](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843393565)
  timed two CPU checksums of each returned GPU image without another render
  between them. On an RTX 5090 the first took 84–99 ms (median 97) and the
  second 2–4 ms (median 2.5) in all 16 exact-checksum rounds; CPU/four stayed
  around 0–1 ms. This supports first-touch managed-memory cost, but without a
  page-fault trace it does not prove migration. A prefetch would shift or trade
  that cost unless a source-bound full frame measurement shows otherwise.
  A later [real NativeV2 window test](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5843730674)
  confirmed why the two paths must remain separate: CPU-off and CUDA-on game
  captures matched byte-for-byte, while native CUDA window fill dropped from
  9.371 to 1.002 ms median for one 1024×640 scene. The latter includes a
  0.993 ms flat copy; 60 Hz pacing absorbed the remaining gain. Preserve CPU
  performance and measure actual input-to-present latency and heavier scenes
  before promoting an automatic native GPU tier.
- **Guard proofs and chess correctness are different evidence.** Independent
  review caught missing fresh-pawn attacks and EP-counter validation; reference
  lists and successor comparisons prevented freezing them.
- **The browser still needs play-testing**: typed hosts can mis-select, cancel,
  retain stale frames or misdecode records.
- **Balanced trees beat browser stacks.** A 21,760-deep move scan overflowed,
  and even 5,440-element leaves failed in Chrome; 32 leaves of 680 preserve the
  complete ID range.
- **Alignment matters for image reuse.** Placing a 512-square image on large
  power-of-two boundaries allowed direct subtree reuse: an offset of `(24,96)`
  forced far more work than `(0,128)`. In the newer chrome, moving desktop
  board placement from `(86,96)` to `(64,96)` and portrait from `(0,52)` to
  `(0,64)` reduced measured cached-frame Bend composition from roughly
  100–170 ms to 1–2 ms in local Chrome. Pixel traversal itself was 8–20 ms
  before alignment; do not blame transport for renderer work without timing
  the stages separately.
- **Check resolution math at every supported size.** Integer
  `U32.div(size,512)` is zero for a 256px preview; use an explicit F32 ratio
  for fractional projection and rerun camera, hole and pixel witnesses at
  256/512/1024. A quadtree has an implicit extent supplied by its depth:
  never pass a depth-8 tree as depth 9 without an exact nearest-neighbor
  pixel/embed test or a real Bend expansion.
- **A library with no `main` needs a selected-book test route.** A direct
  CLI `-o` may fail with `no main to run` even when its definitions check.
  Load/validate the book and emit selected pure functions with `Comp.js_lib`,
  binding the output to the source and pin. For direct Bend source, a `match`
  scrutinee must be a parameter/field, not a computed local; a reused affine
  binder needs `+` or a helper that receives it as a parameter.
- **Parallel syntax is not a speed claim.** A four-way let in the non-bang
  `Texture.tree` still schedules work. A true sequential child chain uses
  sequential `+` bindings. On WSL2 Clang 18, a 64-branch top pool and a
  4^7 fine pool produced identical output but were slower than that serial
  chain at one, four and eight threads, including an ext4-local rerun.
  Keep hardware-specific native CPU and GPU conclusions separate.
- **Source checking does not prove presentation.** The first whole-screen render
  exposed an embedding-depth defect missed by small uniform tests.
- **Bound replay work, not just JSON size.** Validate a bounded number of
  commands per update and keep the previous state until the candidate succeeds.
  A chosen action is staged for one visible frame, then committed serially on
  the next tick; queued presses use the post-commit board and revision.
- **Laws must not depend on implementation-owned expectations.** The v2 laws
  refer to separately authored `RuleContracts.expected`/`legal`, so a kernel
  that rejects everything fails them (a mutation control checks this).
- **Native IO contracts need source inspection.** The native audio effect takes
  interleaved stereo through a bounded ring, unlike a browser mono buffer.
- **C emission, source checking and native execution are separate evidence.**
  The 2.0.27 CLI emitted and ran as a WSL ELF with rotating file snapshots;
  the larger graphical `Native.bend` emitter instead hit a generated
  `an arity over 255` limit with no C output. Inspect the compiler table/segment
  construction in a disposable diagnostic copy, then rerun an input-bound fix
  on the clean pin; never present a checker pass as a native GUI binary.
- **A green checker or browser suite is not a frame budget.** Stage-two hosted
  post-move ticks reached 668 ms at p95 and bot replies took hundreds of
  milliseconds. Profile source lowering, legal refresh, rendering and pixel
  transport separately; use automatic detail tiers with a measured CPU fallback
  before promising a high-resolution GPU presentation.
- **Opaque artwork can cross the same Base boundary on web and native.** The
  DRAFT RGA1 codec under `lib/graphics/v2/assets` accepts a capped Bend
  `List<U32>` and returns an immutable Image. A browser worker only fetches a
  Bend-requested relative path and transfers bytes; the game chooses the theme,
  decodes the plate, and falls back on a malformed response. The native adapter
  can pass `File.read_bytes` into that same decoder. Keep the preserved source
  artwork, derivation script, exact hashes, and license outside the reusable
  library. In generated JS a Bend field named `max_bytes` is still
  `max_bytes`, not camelCase. The browser port's bounded mock test caught a
  field-name mismatch before the actual browser asset gate. A depth-9 plate
  decode retained roughly 1.2 GiB whole-process peak in the isolated scene
  test; request and retain only the active theme, and distinguish this from
  measured browser memory or native performance.
- **Inspect physical display scaling as well as source pixels.** On a 1280×800
  Chrome capture of the older 1024×640 scene, `image-rendering: auto` gave
  smoother glyph edges than `pixelated` at fractional 1.25× display scaling.
  This does not add detail or prove the redesigned scene is visually accepted;
  it is a generic browser presentation choice to compare with the actual
  high-resolution tier when that tier can meet its frame budget.

The current law and proof receipts are linked from `../README.md`. JavaScript
measurements and rendered browser checks do not establish native CPU, CUDA or
Metal speed.
