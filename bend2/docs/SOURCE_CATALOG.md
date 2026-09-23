# Bend 2 source catalog

All entries in this catalog refer to the local vendored source at
`.artifacts/toolchains/bend`, pinned to
`6a77e1246c351055cb15031267a7c76c87036cbc` (`2.0.26`, as reported by
`bend version`). Links are immutable GitHub commit links:

`https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc`

The previous pin was `ff7a40cc9070a34c78399ecd2bbe46a044ad9b4b` (2.0.25); see
"Changes since ff7a40c" in `LOCAL_BEND_GUIDE.md` for what differs.

The catalog records what was read for `LOCAL_BEND_GUIDE.md`. The guide's probes
cover source checks, JS emission and JS runs; this catalog does not turn those
into native-binary, GPU, browser, release, or owner-acceptance claims.

## Primary references

| Local path | What it establishes | Pinned source |
| --- | --- | --- |
| `AGENTS.md` | Upstream ownership map: `bend.ts` checker, `comp.ts` compiler/runtime, `main.ts` CLI/loader, `base.bend` prelude, `tests/`, `gates/`, and `demos/`. | [AGENTS.md](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/AGENTS.md) |
| `guide/GUIDE.md` | Language tutorial and syntax reference: affine quantities, kinds, termination, parallel calls, arrays, laws, IO, apps, modules, CLI, runtime model, and limitations. | [GUIDE.md](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/guide/GUIDE.md) |
| `guide/EFFECTS.md` | Version-specific C/JS foreign-effect shape, handle ownership, blocking work, and the explicit no-ABI guarantee. | [EFFECTS.md](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/guide/EFFECTS.md) |
| `guide/SHADERS.md` | Measured GPU/CPU fork-tree shape, tile lists, ownership/count costs, flat loops, and rendering gotchas from the 3D demo. | [SHADERS.md](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/guide/SHADERS.md) |
| `README.md` | Public limitations: no Windows native target, JS is one-core/no graphics or audio, no TLS/HTTP/JSON/regex, young compiler, and Lean/checker mismatch. | [README.md](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/README.md) |
| `bend2/base.bend` | Exact constructors and signatures for `Nat`, `U32`, `F32`, `Bool`, lists, arrays, maps, IO, windows, audio, `Image`, `Event`, and equality lemmas. | [base.bend](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/bend2/base.bend) |
| `bend2/main.ts` | CLI version `2.0.26`, check/run/build/publish/link/login/page commands, Bun loader, browser bundling, telemetry opt-out, and unsafe/foreign dependency reporting. | [main.ts](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/bend2/main.ts) |
| `bend2/bend.ts` | Parser grammar, syntax sugar, dead/live checker wall, affine quantities, match restrictions, holes, and termination rules. | [bend.ts](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/bend2/bend.ts) |
| `bend2/comp.ts` | Native and JS lowering, numeric intrinsics, C runtime, GPU flags, and the JS runtime's one-thread/no-GPU behavior. | [comp.ts](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/bend2/comp.ts) |
| `bend2/bend.lean` | Lean mechanization of the core; use only as a comparison because the README says it can lag `bend.ts`. | [bend.lean](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/bend2/bend.lean) |
| `gates/test.ts` | Test contract: `#|` expected lines, check/interpreter/JS/C lanes, and build/run behavior. | [gates/test.ts](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/gates/test.ts) |
| `gates/_run.ts` | The four-gate 30-second cap and the fact that gates can run builds and external workers. | [_run.ts](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/gates/_run.ts) |
| `CHANGELOG.md` | Per-release behavior changes, including fork-free leaves, bang spines, the 255-word join refusal and the Array-fork caveat. | [CHANGELOG.md](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/CHANGELOG.md) |
| `WONTFIX.txt` | Known unimplemented items, including continuation passing for non-tail calls on the JS lane. | [WONTFIX.txt](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/WONTFIX.txt) |
| `bend2/effs/` | The C and JS twins of Base effects: JS `window_open` always fails, JS audio is a silent clock, JS file effects use `bun:ffi` libc. | [effs](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/bend2/effs) |
| `bench/runtime/mandelbrot/main.bend` | The chunked balanced fold (`hfold`) used as the parallel range-split idiom. | [main.bend](https://github.com/bendlang/bend/blob/6a77e1246c351055cb15031267a7c76c87036cbc/bench/runtime/mandelbrot/main.bend) |
| `tests/compile/`, `tests/parse/`, `tests/run/` | Pinned behavior of forks and bangs: `fork_width`, `fork_operand`, `fork_value_free`, `gpu_mark_inert`, `bang_intrinsic_closure`, `computed_mark_nonname`. | [tests](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/tests) |

## Read example catalog

The first six rows are the minimum proof/data/app set for a new rules or UI
author. The remaining rows cover browser, 3D, and network boundaries that are
easy to misread as part of the language guarantee.

| Demo path | What it teaches | Source pin |
| --- | --- | --- |
| `demos/proof_insertion_sort/{main,LAWS,PROOF}.bend` | Data-kind lists, dependent `LE`, comparison evidence, insertion sort, sortedness/permutation laws, and `.fin` helpers for matching computed verdicts. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/proof_insertion_sort) |
| `demos/proof_numerics/{main,LAWS,PROOF}.bend` | Structural `Nat` arithmetic, existential `exs` witnesses, rewrite chains, and a certified Euclidean `divmod` with explicit zero-divisor behavior. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/proof_numerics) |
| `demos/pure_par_sum/{main,LAWS,PROOF}.bend` | A fork/join sum, `sum!`, balanced parallel work, and an induction law connecting the tree to a sequential specification. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/pure_par_sum) |
| `demos/app_pong_game_2d/{main,LAWS,PROOF}.bend` | A pure `Pong` state, event folding, affine state returned beside an `Image`, quadtree early-out, and laws for Esc and last-key-wins. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/app_pong_game_2d) |
| `demos/app_triangle_2d/{main,LAWS,PROOF}.bend` | Pixel classification with `Pix`/`Qua`, mouse events, a state counter, and proof by rewriting `inside` hypotheses. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/app_triangle_2d) |
| `demos/app_win_is_bug_2d/{main,LAWS,PROOF}.bend` | The strongest laws boundary: a human law forbids winning for every move list, while the proof carries a safe-cell invariant and finite reflected certificate. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/app_win_is_bug_2d) |
| `demos/app_win_is_bug_2d/web/{index.html,main.js,bunfig.toml}` | Browser loader integration: JS imports `../main.bend`, passes constructors/`BigInt`, delegates every move to Bend, and owns Canvas rendering and input. | [web directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/app_win_is_bug_2d/web) |
| `demos/app_ray_tracer_3d/{main,LAWS,PROOF}.bend` | F32 ray marching, a single `scene!` image bang, recursive quadtree pixels, and the deliberate choice to law-check input handling while leaving F32 rendering unclaimed. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/app_ray_tracer_3d) |
| `demos/app_slash_boss_3d/{main,LAWS,PROOF,bend3d}.bend` | A larger pure simulation plus Bend3D scene hooks, audio effects, paused-state laws, event laws, probes, and the shader guide's reference renderer. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/app_slash_boss_3d) |
| `demos/io_rollback_netcode/{README,netcode,walkers_demo,walkers_test}.bend` | Pure `step(state, inputs)`, UDP effect boundaries, stamped input logs, prediction/rollback/replay, and headless hash agreement; it is a network design example, not a proof of delivery. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/io_rollback_netcode) |
| `demos/pure_par_sort/{main,LAWS,PROOF}.bend` | Parallel sorting shape and proof obligations for order/permutation when a workload is recursively partitioned. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/pure_par_sort) |
| `demos/proof_typed_eval/{main,LAWS,PROOF}.bend` | Dependent typed evaluation and how a proof can make an interpreter's output relation explicit. | [directory](https://github.com/bendlang/bend/tree/6a77e1246c351055cb15031267a7c76c87036cbc/demos/proof_typed_eval) |

## How to use this catalog

1. Read the pinned guide and Base signatures before copying an example.
2. Read the demo's `main.bend` first, then `LAWS.bend`, then `PROOF.bend`.
3. Treat `web/`, `.c`, and `.js` files as host/foreign code with their own
   review and test obligations.
4. Keep the commit hash with any excerpt, measurement, or generated artifact.
5. Do not infer a Rift Chess law, game architecture, GPU result, browser
   release, or owner acceptance from these examples. They are language and
   boundary references only.
