# Bend 2 source catalog

All entries in this catalog refer to the local vendored source at
`.artifacts/toolchains/bend`, pinned to
`a49524265bdfa5753a4bf38e25f0574a705dd868` (`2.0.25`, from the pinned
`flake.nix`). Links are immutable GitHub commit links:

`https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868`

The catalog records what was read for `LOCAL_BEND_GUIDE.md`. The guide records
limited root-reported proof/interpreter checks; this catalog does not turn those
checks into native-binary, GPU, browser, release, or owner-acceptance claims.

## Primary references

| Local path | What it establishes | Pinned source |
| --- | --- | --- |
| `AGENTS.md` | Upstream ownership map: `bend.ts` checker, `comp.ts` compiler/runtime, `main.ts` CLI/loader, `base.bend` prelude, `tests/`, `gates/`, and `demos/`. | [AGENTS.md](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/AGENTS.md) |
| `guide/GUIDE.md` | Language tutorial and syntax reference: affine quantities, kinds, termination, parallel calls, arrays, laws, IO, apps, modules, CLI, runtime model, and limitations. | [GUIDE.md](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/guide/GUIDE.md) |
| `guide/EFFECTS.md` | Version-specific C/JS foreign-effect shape, handle ownership, blocking work, and the explicit no-ABI guarantee. | [EFFECTS.md](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/guide/EFFECTS.md) |
| `guide/SHADERS.md` | Measured GPU/CPU fork-tree shape, tile lists, ownership/count costs, flat loops, and rendering gotchas from the 3D demo. | [SHADERS.md](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/guide/SHADERS.md) |
| `README.md` | Public limitations: no Windows native target, JS is one-core/no graphics or audio, no TLS/HTTP/JSON/regex, young compiler, and Lean/checker mismatch. | [README.md](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/README.md) |
| `bend2/base.bend` | Exact constructors and signatures for `Nat`, `U32`, `F32`, `Bool`, lists, arrays, maps, IO, windows, audio, `Image`, `Event`, and equality lemmas. | [base.bend](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/bend2/base.bend) |
| `bend2/main.ts` | CLI version `2.0.25`, check/run/build/publish/page commands, Bun loader, browser bundling, telemetry opt-out, and unsafe/foreign dependency reporting. | [main.ts](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/bend2/main.ts) |
| `bend2/bend.ts` | Parser grammar, syntax sugar, dead/live checker wall, affine quantities, match restrictions, holes, and termination rules. | [bend.ts](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/bend2/bend.ts) |
| `bend2/comp.ts` | Native and JS lowering, numeric intrinsics, C runtime, GPU flags, and the JS runtime's one-thread/no-GPU behavior. | [comp.ts](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/bend2/comp.ts) |
| `bend2/bend.lean` | Lean mechanization of the core; use only as a comparison because the README says it can lag `bend.ts`. | [bend.lean](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/bend2/bend.lean) |
| `gates/test.ts` | Test contract: `#|` expected lines, check/interpreter/JS/C lanes, and build/run behavior. | [gates/test.ts](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/gates/test.ts) |
| `gates/_run.ts` | The four-gate 30-second cap and the fact that gates can run builds and external workers. | [_run.ts](https://github.com/bendlang/bend/blob/a49524265bdfa5753a4bf38e25f0574a705dd868/gates/_run.ts) |

## Read example catalog

The first six rows are the minimum proof/data/app set for a new rules or UI
author. The remaining rows cover browser, 3D, and network boundaries that are
easy to misread as part of the language guarantee.

| Demo path | What it teaches | Source pin |
| --- | --- | --- |
| `demos/proof_insertion_sort/{main,LAWS,PROOF}.bend` | Data-kind lists, dependent `LE`, comparison evidence, insertion sort, sortedness/permutation laws, and `.fin` helpers for matching computed verdicts. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/proof_insertion_sort) |
| `demos/proof_numerics/{main,LAWS,PROOF}.bend` | Structural `Nat` arithmetic, existential `exs` witnesses, rewrite chains, and a certified Euclidean `divmod` with explicit zero-divisor behavior. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/proof_numerics) |
| `demos/pure_par_sum/{main,LAWS,PROOF}.bend` | A fork/join sum, `sum!`, balanced parallel work, and an induction law connecting the tree to a sequential specification. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/pure_par_sum) |
| `demos/app_pong_game_2d/{main,LAWS,PROOF}.bend` | A pure `Pong` state, event folding, affine state returned beside an `Image`, quadtree early-out, and laws for Esc and last-key-wins. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/app_pong_game_2d) |
| `demos/app_triangle_2d/{main,LAWS,PROOF}.bend` | Pixel classification with `Pix`/`Qua`, mouse events, a state counter, and proof by rewriting `inside` hypotheses. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/app_triangle_2d) |
| `demos/app_win_is_bug_2d/{main,LAWS,PROOF}.bend` | The strongest laws boundary: a human law forbids winning for every move list, while the proof carries a safe-cell invariant and finite reflected certificate. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/app_win_is_bug_2d) |
| `demos/app_win_is_bug_2d/web/{index.html,main.js,bunfig.toml}` | Browser loader integration: JS imports `../main.bend`, passes constructors/`BigInt`, delegates every move to Bend, and owns Canvas rendering and input. | [web directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/app_win_is_bug_2d/web) |
| `demos/app_ray_tracer_3d/{main,LAWS,PROOF}.bend` | F32 ray marching, a single `scene!` image bang, recursive quadtree pixels, and the deliberate choice to law-check input handling while leaving F32 rendering unclaimed. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/app_ray_tracer_3d) |
| `demos/app_slash_boss_3d/{main,LAWS,PROOF,bend3d}.bend` | A larger pure simulation plus Bend3D scene hooks, audio effects, paused-state laws, event laws, probes, and the shader guide's reference renderer. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/app_slash_boss_3d) |
| `demos/io_rollback_netcode/{README,netcode,walkers_demo,walkers_test}.bend` | Pure `step(state, inputs)`, UDP effect boundaries, stamped input logs, prediction/rollback/replay, and headless hash agreement; it is a network design example, not a proof of delivery. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/io_rollback_netcode) |
| `demos/pure_par_sort/{main,LAWS,PROOF}.bend` | Parallel sorting shape and proof obligations for order/permutation when a workload is recursively partitioned. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/pure_par_sort) |
| `demos/proof_typed_eval/{main,LAWS,PROOF}.bend` | Dependent typed evaluation and how a proof can make an interpreter's output relation explicit. | [directory](https://github.com/bendlang/bend/tree/a49524265bdfa5753a4bf38e25f0574a705dd868/demos/proof_typed_eval) |

## How to use this catalog

1. Read the pinned guide and Base signatures before copying an example.
2. Read the demo's `main.bend` first, then `LAWS.bend`, then `PROOF.bend`.
3. Treat `web/`, `.c`, and `.js` files as host/foreign code with their own
   review and test obligations.
4. Keep the commit hash with any excerpt, measurement, or generated artifact.
5. Do not infer a Rift Chess law, game architecture, GPU result, browser
   release, or owner acceptance from these examples. They are language and
   boundary references only.
