# Current-visual NativeV2 source/type gate

This separately versioned Linux gate checks the current source commit
`45d7041ea1e11db48017db96b886b24b60d501d3` (`5fe960b1ccbedf97c2460c4b7c2a63a124a3ce24`)
with exactly one change: the pinned `0001-native-v2-events.patch` applied to
`bend2/NativeV2.bend`. It is not the older `216567d9` candidate. The original
NativeV2 SHA-256, event-patch SHA-256, and postimage SHA-256 remain unchanged.

The source commit contains 303 tracked `.bend` files: the earlier 284-file
set plus 19 subsequently added fixtures/modules. The gate checks all 303 files
against the exact commit and explicitly pins the current visual sources
`graphics/Picking.bend`, `graphics/Scene.bend`, and
`graphics/v2game/BoardScene.bend`. The exact commit/tree additionally binds all
other tracked source and current-tree metadata; the candidate worktree must
have only the NativeV2 modification and no index/untracked changes. The gate
compares its diff hunks to the exact patch and checks the patch in reverse
without modifying the candidate.

The source/type check reuses the reviewed event source Worker unchanged: a
requested 8192 MiB old-generation heap, 64 MiB stack, 120-second owned timeout,
empty Worker `execArgv`, `BEND_NO_TELEMETRY=1`-only Worker environment,
network-fetch denial, and exit/result observation. It also retains the exact
Node 22.23.1 binary, LF-derived compiler/Base, pristine 2.0.32 scout, canonical
2.0.27 pin, imported source closure, and post-worker source-identity checks.
The receipt states configured resource limits, not independently measured
effective heap.

Run the portable pins/path/lifecycle controls from any working directory:

```sh
node bend2/toolchain-patches/native-v2-2032/events/current-visual/test.mjs
```

Run the source/type gate only on the admitted Linux host, with the root
checkout clean and the candidate at the exact source commit above, after
applying the event patch:

```sh
BEND_NO_TELEMETRY=1 node --max-old-space-size=8192 bend2/toolchain-patches/native-v2-2032/events/current-visual/source-check.mjs /absolute/current-visual-event-patched-checkout
```

This gate proves only that the derived compiler loaded and type-checked the
exact patched NativeV2 source with zero holes and fetches. It does not perform
C emission/build, native execution, GUI or PCM/restart interaction, GPU work,
proof checks, a toolchain pin amendment, or release acceptance. Those Linux
gates remain separate.
