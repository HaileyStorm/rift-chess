# Retained background across menu close — October 28, 2026

The browser Worker previously discarded its one menu-background entry on every
gameplay frame, including a simple Close followed by reopening the same menu.
It now retains that entry while depth, size, fonts, board image and base image
identities match. Every dirty render evicts it immediately if any identity
changes. Actual menu reuse still requires the existing Bend presentation
predicate; controls repaint from current data. Boot and disposal still clear it.

This extends the [panel-cache change](../stationary-motion-20261006/MENU_PANEL_20261028.md)
without another cache entry, compiler emission, artwork change or rules change.
The memory tradeoff is a longer lifetime for one composed menu image and its
presentation/plan. The entry cannot retain an obsolete board/base after an
identity change. Collection and constrained-device memory remain unmeasured.

One actual paired browser journey opened Settings, enabled Move Hints, closed
and reopened Settings, played e2–e4 and reopened Settings over the changed board.
Five complete canvas checkpoints, summaries, views and command records matched
exactly. The candidate actually reused its background on unchanged reopening
and rejected reuse after the move. A reverse-order pair addressed the first
pair's unrelated timing variation; no scenario matrix or unit suite was added.

| Reopen observation | Baseline | Candidate |
| --- | ---: | ---: |
| Input to canvas, baseline-first pair | 145.6 ms | 57.2 ms |
| Composition, baseline-first pair | 100.8 ms | 17.9 ms |
| Input to canvas, candidate-first pair | 121.9 ms | 64.3 ms |
| Composition, candidate-first pair | 80.8 ms | 17.2 ms |

These are small uncontrolled Chrome 156.0.8078.48 samples on Windows x64,
headless, 1280×800 viewport, scale 1, fresh contexts, Astral/default camera.
They support the scoped reopening improvement, not stable p95 or physical
scanout. Other timings varied: first-open baseline/candidate was 136.0/163.5 ms,
then 138.4/83.3 ms in reverse order; post-move opening was 68.0/131.7 ms, then
101.8/50.1 ms. No general speed claim follows. End-of-journey main-page heap was
higher in the second context in both orders, regardless of candidate identity;
uncontrolled collection does not establish memory neutrality or a leak.

Controller, Scene, Menu, sprite helper, bot and prepared ground were reused
without compiler execution. The canonical tag adapter now matches the executed
private adapter after restoring its relative import of the same dependency.
Its guards bind current Worker/PieceSprites sources and assert that the five
input-leaf comparison names stay unchanged; constructor transformations are
unchanged. Its separate diagnostic/binding facade was not freshly executed.

| Bound source or original record | SHA256 |
| --- | --- |
| Worker source | `681412cee7b9588d07af0da4d2bf4bef902e202867999055816e3d75fd24d248` |
| Maintained canonical adapter | `d27b60ffe1cce9b191275e5e12a97a086880c4e4f75a6e8703de2502b247c8c0` |
| Candidate package manifest | `7d04e20b723de00c1f3745691883e77632a9bb5aef08ca696217478a65bbca92` |
| Baseline-first result | `68136b68c50007a4eb9b6f95ae1df58189f5f0f09829295b36b30b024fe00030` |
| Baseline-first process terminal | `aee08aae73cea848f6c59f228bec6d7cb43b2e58138e16d50757fa175c8ee901` |
| Candidate-first result | `cc5e86b17c73f523df916d4cf331f9402747e627d6c15d56ba2cd3a95a6f77bb` |
| Candidate-first process terminal | `3a79aafcc47da4bc6692b72583fba71d3944f87f157d811fd62f193960f564e3` |

Private originals are retained under `menu-reopen-r1` and
`menu-reopen-journey-r1/r2` in the owning task's artifact directory. Both original
Chrome/parent handles exited 0, servers closed, and Jobs settled and closed
without signals or forced cleanup. This accepts the scoped browser optimization;
it does not extend formal, native, GPU, compiler-pin or hosted acceptance.
