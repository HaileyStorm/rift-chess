# Local Bend 2 guide for Rift Chess

This is a source-grounded guide for the local Bend checkout used by this
project. It describes Bend 2.0.25 at commit
`a49524265bdfa5753a4bf38e25f0574a705dd868` (the local source is
`.artifacts/toolchains/bend`). The pinned upstream is
`https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868`.

The guide was read from the pinned source, including `guide/GUIDE.md`,
`guide/EFFECTS.md`, `guide/SHADERS.md`, `bend2/base.bend`, `bend2/main.ts`,
`bend2/bend.ts`, `bend2/comp.ts`, and the demos listed in
`SOURCE_CATALOG.md`. The examples below are read-derived unless the root task's
reported command evidence says otherwise; this guide does not claim a native,
GPU, browser, or release run.

## What Bend 2 is

Bend combines a dependent type checker, affine resource use, proofs written as
ordinary definitions, and fork/join parallel calls. Its syntax looks Pythonic,
but evaluation is pure unless a value has an `IO` type. The compiler emits one
C source file for CPU and optional Metal or CUDA device code, or a sequential
JavaScript target. The checker is the authority for the typed source term; the
generated C, GPU program, JavaScript runtime, foreign code, and browser host are
separate trust boundaries.

Bend 1/HVM programs do not carry over. The current implementation is young and
the upstream README says the compiler is mostly AI-written, not fully audited,
and that the Lean formalization can disagree with `bend2/bend.ts`. Treat this
checkout as pinned research material until the project owner accepts native and
browser evidence.

The upstream layout is useful when navigating the vendored copy:

```text
bend2/bend.ts   parser, theory, checker
bend2/comp.ts   C/Metal/CUDA/JS compiler and runtimes
bend2/main.ts   CLI and Bun/Node .bend loader
bend2/base.bend prelude and standard library
bend2/effs/    C and JS effect implementations
guide/          GUIDE.md, EFFECTS.md, SHADERS.md; demos/ complete examples
tests/          checker/compiler tests; #| lines are expected output
gates/          repository, test, performance, and ping gates; paper/ theory
```

## A local first pass

Do not install or update a toolchain as part of this guide. If the local source
is intentionally exercised later, run the checked-in CLI through Bun from the
repository root. The source CLI identifies itself as `2.0.25`.

```powershell
# PowerShell: opt out of the CLI's once-per-day version-check request.
$env:BEND_NO_TELEMETRY = "1"
bun .artifacts/toolchains/bend/bend2/main.ts version
bun .artifacts/toolchains/bend/bend2/main.ts guide
bun .artifacts/toolchains/bend/bend2/main.ts guide effects
bun .artifacts/toolchains/bend/bend2/main.ts guide shaders
bun .artifacts/toolchains/bend/bend2/main.ts base --types
```

Use a small progression for a new module:

```text
bend file.bend --check-only       parse and check imports, do not run main
bend file.bend                    check, then run main (IO is compiled)
bend file.bend --checkup          check each direct import in isolation
bend file.bend -o file.js         emit sequential JavaScript
bend file.bend -o file.c          emit C source only
bend file.bend -o file            compile a native binary
bend page.html -o dist            browser-bundle a page importing .bend
```

`--` ends Bend's options; later values are returned by `IO.args`. A native binary
accepts `--threads N`, `--gpu on|off|4GB`, and `--help`. A program containing
`!` creates a sidecar `.gpu`; native builds need clang 14+, and device builds
need clang 19+ (Apple clang 17 is the documented exception).

For an ordinary proof gate, keep a human-owned `LAWS.bend` beside an
AI-authored `PROOF.bend`, then run:

```text
bend PROOF.bend
```

The proof file must import the laws file. A successful closed proof prints
`All terms check.`; an open law, false proof, missing import, or checker error
fails. This is a source gate, not release, device, or owner-acceptance evidence.

The upstream test harness is not a general unit-test framework. Tests are Bend
files under `tests/<namespace>/`; expected output is taken from their `#|`
lines. `gates/test.ts` checks, interprets, emits/runs JS, and emits/runs C when
the test has the required twins. `gates/_run.ts` runs the four gates with a
30-second cap. Running those gates is a separate decision because it can build,
run device code, use cluster workers, or contact a local hub.

Root reports portable Bun `@oven/bun-windows-x64@1.4.2` with
`BEND_NO_TELEMETRY=1`: both proof files passed `--check-only` with `All terms
check.`, while `pure_par_sum/LAWS.bend` alone failed with `ERROR1TODO`. An IO
run from the project directory hit Windows `lstat cwd/effs`; from upstream
`bend2` it produced `2147450880`. Keep that compiler folder as cwd and pass
absolute inputs. This is interpreter evidence, not native/GPU benchmark proof.

## Syntax and data model

Top-level declarations use a small grammar:

```python
import Base
import ./math.bend as M
type Shape is Data:
  Circle{r: U32}
def area(x: Shape) -> U32:
  match x:
    case Circle{+r}:
      (r * r : U32)
law area_nonnegative:
  for x: Shape
  {U32.is_ge(area(x), 0) == True{} : Bool}
```

`type` declares constructors, `def` declares a function, and `law` declares a
claim whose body is a type. Constructors are written `Name{fields}`. Modules
are files; an import alias is local to the importing file. Dots in names such as
`U32.add` are names, not namespaces that require a module import.

The checker performs little inference. Add a type annotation when an operator
or literal is ambiguous, for example `{3 : U32}`. Parenthesized operators use
the type before the final colon: `(a + b * c : U32)` means
`U32.add(a, U32.mul(b, c))`. `==` inside `{a == b : T}` is a proof type;
runtime value equality is `T.is_eq(a, b)`.

Lists are `[]`, `[a, b]`, and `h <> t`; tuples are `(a, b)`; constructor
patterns can nest. Arrays use `[value : T*n]` for a power-of-two number of
slots or `[value : T^depth]` for `2^depth` slots. Strings are linked lists of
`Char`, so large text processing is not a cheap primitive.

There is no `if` syntax. Match on `True{}` and `False{}`. A `match` scrutinizes
a parameter or a field bound by a pattern, never a computed expression such as
`match f(x):`. Bind the computed value in a helper definition and match on the
helper's parameter. Match order follows binder order; the source guide warns
that a `let` before a match can prevent matching the intended parameter.

Recursion is the normal loop form. A recursive call must consume a structurally
smaller field, and the shrinking parameter should be placed first. Tail calls
compile to loops. Mutual recursion is disallowed. Use a decreasing `Nat` fuel
argument for event loops, or combine mutually recursive cases into one
definition with a selector. `@unsafe def` disables the termination check and
therefore leaves the proof boundary.

## Quantities, ownership, and copying

Bend is affine by default: a live variable is consumed at most once, and an
unused affine value may be dropped. Quantities explain intent:

```text
-x  erased; available only in types and proofs, removed at runtime
 x  affine; the default, at most one live use
+x  reusable; requires the value's type to be Data
~x  template argument; syntax substituted at compile time
```

`Data` values may be copied. `Type` values have one owner. `Type` is shorthand
for `Kind(&1)` and `Data` for `Kind(&2)`; `&0`, `&1`, and `&2` are quantities,
and `a <&> b` takes the smaller quantity. A datatype can be parameterized by a
quantity and a kind, so a list of reusable data and a list of affine closures
have different types.

Closures are values but remain affine: even a closure that captures only `Data`
can be called once. Top-level definitions can be called repeatedly. Templates
are closed syntax arguments, declared before the template that calls them; each
distinct template argument set gets its own compiled instance and the template
body pays no closure allocation. A template argument cannot mention the caller's
local variable.

Arrays are `Type` and have one owner. A read returns the array beside the value,
and a write returns the rewritten array, preserving ownership. The `a[i]` sugar
assumes `Array<U32>`; use `Array.get`, `Array.set`, or `Array.swap` for other
types. Indices wrap by the array size. `Array.clone` is the explicit copy for
`Data` elements. `Array.fork`, `Array.join`, and atomic operations are marked
`@unsafe` or backed by open effect-like laws in `base.bend`; do not use them in a
rules core without an owner-approved design.

The compiler may borrow a boxed value when a definition only matches or passes
it to a borrowing function, but this is an implementation decision. Inspect
emitted C when performance or aliasing matters: `term_peek` is a borrow, while
`term_keep`, `ctr_take`, and `rfc_seal` indicate counts. In the shader reference,
an unnecessary `+` or a second consumer can turn a cheap borrow into repeated
reference-count work.

## Parallel calls and runtime shape

A parallel let has one value per name, for example `a b = f(x) g(y)`. The
compiler forks the calls and joins their results. It promises independence and
expects roughly balanced work; purity and affine use make independence easy,
but uneven branches waste the scheduler.

`f!(x)` marks the call and nested bangs for GPU execution in a native build.
Without a GPU, bangs run on the CPU pool. JavaScript ignores bangs and is
sequential. There is one GPU per program, one event loop, and no automatic
multi-machine execution. Shared `+` values cost atomics; scene data should be
partitioned into short lists rather than read through a shared counted tree.

The pinned shader guide's practical shape is a single fork tree ending in flat
loops: build/cull a scene on the host, hand each tile a short candidate list,
and let each lane walk that list. It advises roughly `4^7` leaves for a 16,384
lane device cube, but that is a benchmark heuristic from the M4 reference, not
a Rift Chess requirement. Read `guide/SHADERS.md` before choosing a parallel
renderer.

## Base data and number semantics

`bend2/base.bend` is the standard library and the source of truth for these
constructors and helper names.

| Type | Meaning in the pinned source |
| --- | --- |
| `Nat` | Peano `Zero`/`Succ`; `Nat.sub` saturates at zero; `Nat.divmod(a, 0n)` returns `(0n, a)`. |
| `U32` | 32-bit unsigned word; add/sub/mul and bit operations wrap; `U32.div(a, 0)` is `0`, `U32.mod(a, 0)` is `a`. |
| `Bool` | `False{}` and `True{}`; use `Bool.and`, `Bool.or`, `Bool.not`, and pattern matching. |
| `Cmp` | `LT{}`, `EQ{}`, `GT{}`; convert with `Cmp.is_lt/is_eq/is_gt/is_le/is_ge`. |
| `F32` | 32-bit float operations and foreign math; no `F64`; values are not computationally proof-reducible. |
| `Char`/`String` | A `Char` wraps a `U32`; a `String` is a linked list of chars. |
| `Maybe`/`Result` | `None`/`Some`, and `Fail`/`Done`; both support `do` notation. |
| `List`/`Map`/`Set` | Affine or reusable according to their element kind; `Map` is string-keyed and returns the map beside lookups. |
| `Image`/`Event` | Pure `Pix`/`Qua` image trees and `Key`, `Mouse`, `Move`, `Close` events. |

`Nat` literals use the `n` suffix. The parser represents an ordinary numeric
literal as `U32`; a `Nat` literal is `3n`. The guide notes that a `Nat` literal
past `256n` is represented through `U32.to_nat`, up to `4294967295n`, so use
explicit construction and tests for larger or generated naturals.

F32 operations in `base.bend` are laws with no ordinary proof body. That makes
them useful for rendering but does not prove floating-point identities,
rounding, NaN behavior, or cross-target bit-for-bit equality. Keep F32 out of
deterministic rules state; convert at a deliberate boundary. `F32.to_u32` and
`F32.to_nat` are runtime conversions, not exact mathematical coercions.

The standard library's naming pattern is predictable: `Nat.add`, `U32.mul`,
`F32.sin`, `T.is_eq`, `T.show`, `T.read`, and `T.to_nat`/`T.from_nat`. Print a
focused slice with `bend base Map` or `bend base --types` instead of guessing a
helper's exact affine signature.

## Laws, proofs, and the trust boundary

Keep specifications and implementations separate:

```text
LAWS.bend   human-owned claims; import the code and state required behavior
PROOF.bend  implementation/proof file; import LAWS.bend and fill every law
```

The paired definition has the law's name (a namespaced import can fill it as
`Laws.name`). A proposition is a type; a proof is a definition returning that
type. Equality is `{a == b : T}`, reflexivity is `{==}`, and `%e : P` rewrites a
goal using an equality proof `e`. Pattern matching supplies case analysis and a
recursive call supplies the induction hypothesis. `exs x: T` in a law asks for
a witness and its proof. `?name` prints a goal; `?TODO` leaves an open hole and
must never be accepted as a closed gate.

The source checker uses two modes. Live code must satisfy affine use and
well-founded recursion. Types, erased arguments, and equations are checked in
the dead mode; dead code may diverge or inhabit `Empty`, but dead evidence is
never promoted to live evidence. This deliberate wall permits the current
one-universe theory (`Type : Type`), negative recursive types, and no positivity
check. It does not make arbitrary dead terms executable proofs.

`@unsafe` definitions skip termination checking. A foreign definition has its
type checked, but its imported C or JS body is a host promise; the checker does
not verify that body. The CLI propagates this information and prints a warning
like `All terms check, but ... relies on unsafe or foreign code` when a checked
definition depends on either. A plain `All terms check.` therefore means the
source terms closed, not that foreign code, generated C/Metal/CUDA/JS, the
browser, or a remote peer is honest.

The same boundary applies to effects and F32 axioms. Laws can constrain pure
state transitions and codecs, but they do not prove OS behavior, network
delivery, GPU scheduling, compiler correctness, human input, or WebGL output.
Retain an independent reference and differential tests when a game core is
ported.

## Effects and FFI

`IO(A)` is a pure description of an effectful computation. A `do` block uses
`M.bind` for `x : T <- action`, `M.pure` for `return value`, and a typed `=` for
a pure local binding. The same notation works for `IO`, `Maybe`, `Result`, or a
custom pair of `bind`/`pure` definitions.

Built-in effect families in the pinned Base include printing, environment and
arguments, time/sleep/randomness, spawn/channels, files, TCP, UDP, windows,
audio, and the `App` loop. Handles (`File`, `Socket`, `Listener`, `Window`,
`Audio`) are opaque affine values. Every operation hands a handle back beside
its result; a program cannot forge or reuse one. `IO.fork` starts a computation
and returns a channel; `IO.join` receives and closes it. The event loop
interleaves pure work and parks on sleep, sockets, or channels.

An effect definition has `IO(R)` type and imports one C and one JS twin:

```python
def Clock.now() -> IO(U32):
  import "./clock.c"
  import "./clock.js"
```

The host name is lowercase with dots changed to underscores (`clock_now`). The
C side is spliced after the runtime and registers an effect with runtime
helpers; the JS side returns plain JS values and uses `io_done`, `io_fail`, or
`io_tup` for results. Blocking effects use the runtime's work or wait helpers.
`guide/EFFECTS.md` calls these internals version-specific and gives no ABI
promise: rebuild and review foreign effects whenever the compiler pin changes.

The current Base has no TLS, HTTP, JSON, or regex library. Those can be foreign
extensions, but that extends the trust boundary and is not a proof of protocol
semantics. Do not add an effect to the rules core merely to avoid an explicit
host adapter.

## Browser integration and pixel graphics

`bend2/main.ts` is both CLI and loader. A Bun page can `import Game from
"../main.bend"`; the loader compiles the imported Bend module and exposes every
filled non-Base, non-IO definition. Constructors cross as
`{$: "Name", field: value}`, `Nat` crosses as `BigInt`, `Bool` as a JS boolean,
and arrays cross without a copy. Copy an array in the host before retaining it
if a Bend call may rewrite it.

`bend page.html -o dist` calls `Bun.build` with a browser target and the Bend
loader plugin. This is a static bundle path and fits a browser-first host, but
the JS target is sequential and the README says it has no graphics or audio
backend. A browser page therefore owns Canvas/WebGL/WebAudio and calls pure
Bend functions, or translates a Bend `Image`/scene description into host draw
commands. Do not assume `Window.open` or `Audio.open` becomes a browser API.

The pure graphics model is small and useful for experiments:

```python
def view(s: State) -> State & Image:
  (s, Pix{0})

def tick(events: List<Event>, s: State) -> IO(Maybe<State>):
  IO.pure(Maybe<State>, Some{s})
```

`Image` is a quadtree: `Pix{color}` is a uniform square and `Qua{tl, tr, bl,
br}` subdivides it. `App.run` opens a native window, calls `view`, presents a
frame, collects events, and calls `tick`; `None{}` exits. Since state is affine,
`view` returns the state beside the image. The 2D demos use cell-uniform tests
to stop recursion early; the 3D demos build camera/scene data and then recurse
over image tiles.

`demos/app_win_is_bug_2d/web` shows the browser boundary precisely: its JS UI
imports `../main.bend`, asks Bend for `grid`, sends every move through
`Game.replay`, and renders the returned state on Canvas. The page's `bunfig.toml`
preloads `bend2/main.ts`. The browser never reimplements the rules, but Canvas
animation and input remain JavaScript responsibilities.

## A practical workflow for a future rules core

1. Pin the Bend source commit and record the compiler version in the source
   catalog. Keep `LAWS.bend` immutable to the implementation agent.
2. Start with a pure `Data` state and pure transitions. Use `Nat`/`U32` for
   deterministic rules; keep F32, IO handles, arrays, and host objects at the
   boundary.
3. Write small laws for constructor preservation, rejected actions, replay,
   and serialization. Add a proof definition for every law before adding a
   feature.
4. Check `PROOF.bend`, then run differential cases against the existing
   reference. A checker result does not replace reference or hostile-input
   tests.
5. Expose only pure functions to the browser loader. Define a canonical codec
   for `Nat` (`BigInt`) and constructors; do not JSON-stringify runtime objects
   without a schema.
6. Add rendering as a separate host adapter or as a pure `Image` experiment.
   Measure browser startup, bundle bytes, transition time, and frame cost on
   every target before choosing a rewrite.
7. For native experiments, inspect emitted C and `.gpu` artifacts, keep the
   source hash beside measurements, and report CPU, GPU, browser, packaging,
   and owner-acceptance evidence separately.

## Gotchas worth checking before blaming the compiler

- `+` is a type/ownership promise, not a borrow annotation. Extra sharing can
  add reference counts or atomics.
- `==` is an equality type, not a boolean operator. Use `T.is_eq` for a value.
- `U32` arithmetic wraps. `Nat.sub` saturates. Division by zero has explicit
  Base behavior and must be included in laws if it matters.
- F32 laws are axioms/foreign operations; do not claim exact proofs over them.
- `Array` reads and writes return the array. Losing the returned array loses the
  owner in the source program.
- JS ignores `!`; a native GPU result cannot be inferred from a browser run.
- Native `!` builds a sidecar `.gpu`; moving only the binary is incomplete.
- A browser bundle does not provide a native Window, Audio, CUDA, or Metal path.
- Effects use compiler-private C/JS ABI names; pin and rebuild together.
- `@unsafe`, imported foreigns, open `?TODO`s, and untested generated code all
  weaken the evidence behind a source proof.
- `bend` may perform a daily version check unless `BEND_NO_TELEMETRY=1` is set;
  local reproducibility should set it explicitly.
- The upstream README says there is no Windows native target; WSL is the
  documented route. A browser bundle in a Windows desktop shell is a distinct
  option, not a native Bend Windows build.
- Keep laws, proofs, compiler pins, generated output, and rendered captures
  tied to exact commits. A local green check is not a release claim.

## Lessons from this actual adaptation

The project now has a checked rules kernel and immutable pixel library. These
are practical observations from this pinned version, not promises about a newer
Bend release:

- **Check small slices early.** Record fields need destructuring or explicit
  getters. A computed scrutinee needs a helper parameter. A pair produced by a
  computation cannot simply be destructured in the middle of a recursive body;
  a small Data constructor with getters can keep recursion structurally clear.
- **Helpers do not permit mutual recursion.** A recursive loop cannot call a
  helper that calls the loop back. Put the Boolean branch flag in the recursive
  function's parameters, then match it before making the smaller call.
- **Strict arguments matter for pixels.** Computing all four child images before
  `Bool.pick(outside, old, children)` still performs the work. Classify outside,
  inside and partial nodes before recursive calls. Untouched subtrees should
  return directly. The same lesson applies to cheap legality rejection before
  candidate validation.
- **Inspect emitted JavaScript when optimizing.** A U32 pattern's residual
  branch can reconstruct a 32-bit Word on every iteration. A structural list
  traversal with a separate Boolean zero flag retained numeric indices and
  avoided that allocation hotspot. Do not assume a shorter Bend expression is
  faster after lowering.
- **A proof can be true but expensive to normalize.** The pinned comparator
  unfolds weak heads before comparing them. Generic Boolean guard lemmas reduced
  repeated expansion of large predicates. Explicitly matching a Position
  parameter in `Spec.legal_range` left a symbolic call stuck at that parameter,
  making exact enumeration refinement practical without changing runtime meaning
  or weakening the law. Earlier timeout/stack failures were retained.
- **Use one browser facade import.** The initial `App.bend` facade collected core
  and rendering APIs; the current `Application.bend` owns the complete portable
  application. This avoids repeatedly compiling overlapping books through concurrent Bun
  module loads. `tools/loader.ts` also normalizes backslashes before the pinned
  loader resolves relative imports; this is a local Windows adapter, not a
  modification to the upstream compiler.
- **Guard proofs and chess correctness are different evidence.** A proof that
  accepted results pass `valid` and `post` does not establish that those
  predicates capture every intended rule. Independent review caught missing
  fresh-pawn attacks and EP-counter validation; complete reference lists and
  successor comparisons prevented those mistakes from being frozen.
- **The browser still needs play-testing.** A typed host can contain a wrong DOM
  selector, cancel a click with a later hover, retain an animation's old frame or
  misdecode an Undo record. The host serializes input, tags worker sessions and
  treats its own storage/animation checks as separate from the Bend source laws.

The current law and proof receipts are linked from `../README.md`. JavaScript
runtime measurements and rendered browser checks do not establish native CPU,
CUDA or Metal speed.

## Whole-application lessons from the second sprint

The full UI now uses Bend images and a project-authored bitmap font, with generic
browser IO. The graphical `Native.bend` Base-effects entry point checks as source,
but its full C emitter exceeded a bounded local run. A smaller `NativeCLI.bend`
entry point uses Base `IO.args` and `File` to provide a browser-independent ASCII
game through the same v2 rules and record codec. Read `PORTABLE_APPLICATION.md`,
`NATIVE.md`, and `NATIVE_CLI.md` for the distinct boundaries.

- Browser recursion limits differ from Bun's. A 21,760-element non-tail move scan
  overflowed; even 5,440-element leaves failed Chrome. A balanced tree with
  680-element leaves preserves the complete ID range and avoids that stack depth.
- Alignment matters to immutable image composition: placing a 512-square image
  on large power-of-two boundaries allows direct subtree reuse. An offset of
  `(24,96)` forced much more work than `(0,128)`. This changes placement, not pixels.
- Inspect generated code after an equivalent Boolean rewrite. In the pinned
  compiler, one nested `Bool.and` rectangle test allocated trampolines while the
  equivalent disjunction of boundary violations lowered to direct JavaScript.
  Preserve pixel comparisons when making this kind of optimization.
- Source checking does not prove browser presentation. The first whole-screen
  render exposed an embedding-depth defect missed by small uniform-image tests;
  dense translated images and inspected screenshots were added.
- JSON schema limits do not bound replay work. Parse within a size bound, then
  validate a bounded number of commands per update, keeping the previous accepted
  state until the entire candidate succeeds. A Move/Undo loop is a useful
  adversarial case because its visible board history stays small.
- A closed law can accidentally depend on an implementation-owned expectation.
  The v2 completeness law instead refers to a separately authored normative
  `RuleContracts.expected` and `RuleContracts.legal`. Changing the implementation
  to reject every action must fail the law, not silently shrink its premise.
- Native IO contracts need source inspection. The pinned audio effect consumes
  interleaved stereo samples through a bounded ring; it is not interchangeable
  with a browser's mono AudioBuffer. File and audio handles remain affine even
  though application state and pixels are ordinary immutable data.
- A C emission check is separate from source checking and actual native binary
  execution. The full graphical book grew past a 600-second bounded emitter run
  on this host. The smaller text client is a practical export target, but a C
  source file alone cannot validate a supported OS, terminal, audio device or
  native CPU performance.
