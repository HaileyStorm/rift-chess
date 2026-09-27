# Isolated Bend 2.0.28 ordered patch replay

The pinned application compiler remains Bend 2.0.27 at
`d37909174ebd664338ae3194799a9e0899dedd51`. The tracked
[`replay-2028-stack.mjs`](../../../toolchain-patches/replay-2028-stack.mjs)
locally clones exact upstream 2.0.28 HEAD
`bc178404f4778704fa5584a73fcdf72bcdf9f32c` (tree
`71328f11e629467db41034257b668d9cc6a932ce`) from an ignored source
checkout. It does not alter the pinned compiler. Seven hash-pinned patch
inputs are copied into a unique ignored run directory and applied in order:
001, adapted 002, 005, adapted 004 compiler, the filtered maintained 004
worker fixtures, the adapted 004 test adapter, and 006. Each application
has `git apply --check`, exact target-set checks, canonical source hashes,
and a whitespace check. Git's global config and hooks are disabled,
`core.autocrlf=true` binds the Windows CRLF fixture oracle, Git transport
is file-only, and the clone's remote is removed before replay.

The successful 2026-09-27 run receipt is ignored local evidence at
`.artifacts/bend2/toolchain-patches/replay-2028-stack/2026-09-27T22-06-39-801Z-28608-fa355796-dd12-424a-8ed9-eabeb7ba84ed/receipt.json`;
SHA-256 `a71ce32941c74abef1762bebb30d8526f115fc905bbb084722b3d6a4b2d7af01`.
It records eight source stages, seven unchanged frozen patch inputs, the
final compiler/test/fixture file hashes before and after the gate, and
107/107 worker checks with zero failures or skips. The gate clears inherited
`BUN_BIN`, `CHROME_BIN`, and `NODE_OPTIONS`, sets the local Bun 1.4.2 and
installed Chrome executable paths, and records their exact SHA-256 plus
the Node runtime SHA-256, rechecking all three after the gate. An earlier receipt failed on a Windows Chrome
`--version` subprocess timeout before the worker gate; the successful run
uses the Chrome executable hash instead. An independent read-only review
confirmed the previous patch/gate provenance findings were closed, then
identified the executable-override gap that this final run addressed.

This is a local compiler composition and worker test result. The declared
zero-direct-provider command path is not network instrumentation. It does
not establish the full frozen proof, graphics, browser, native CPU/GPU,
owner, or pin-amendment gates. The later 2.0.32 release has material JS and
proof changes and requires a new, separate replay and review.
