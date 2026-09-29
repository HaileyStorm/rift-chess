# Bend 2.0.32 arity-diagnostic rebase candidate

This is a separately versioned candidate for downstream patch 001, not the
canonical compiler. It is based on pristine upstream 2.0.32 commit
`573002f01ec6c52416d44489543f69a9625facf8` (`comp.ts` SHA-256
`84a657f11d94ed6462bfc71710fef9f798e3bb4b6b345636e30dd3c6f4e4fffc`).
The patch SHA-256 is
`98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db`;
it changes only the isolated derived compiler's `bend2/comp.ts`, to SHA-256
`a067bd0fae6111e500f16db33697ed7f1347be7e20c4fb90d9996484489a1038`.
The clean 2.0.32 scout and the canonical 2.0.27 pin remain untouched.

The previous 2.0.27 patch fails `git apply --check` on 2.0.32 at
`comp.ts:1615`; this patch was rebased by inspecting the changed tables, not
forced. The source still rejects FID_T segments when `params.length > WIDE`
with 2.0.32's `WIDE=247`, and separately rejects encoded CID_T arities
greater than 255. The added source-owner/capture/result metadata is read only
on the failure path; ordinary C/JS emission does not use it. The 2.0.27
`FID_ARITY_T`/`CID_ARITY_T` wording and 255-word fixture were not relabeled
as 2.0.32 evidence.

`node bend2/toolchain-patches/001-arity/rebase-2032/test.mjs` compares clean
2.0.32 against the exact one-file derived checkout using the local Bun and
`BEND_NO_TELEMETRY=1`. Both compilers source-check the 247/248 join and
247/248/255/256 constructor fixtures;
successful 247-word C and JS and the 248-word JS are byte-identical. Both
reject 248-word C; the candidate reports FID_T row, owner `join`, three live
capture widths and source return binder `y` (one word). The four constructor
widths compile to identical C and JS bytes against pristine 2.0.32, including
its padded layout above 247. The ignored receipt at
`.artifacts/bend2/toolchain-patches/arity-2032/1790671114761-12708/receipt.json`
has SHA-256 `28165a55fe8a97d1d1452affc8c58b3b5e44ce0c5f1819ebf33381ad1558ee31`.
The test script SHA-256 is
`01eaf6314392d37515a8227f0784a16b7f0d5f3ea3ac49e174c2a10196b6415e`.

This narrow test does not independently reach the 2.0.32 CID_T encoded-byte
overflow branch (requiring an extreme padded source width), prove every
source-owner case, or establish a full compiler matrix,
worker backend, Windows imports, BendTT proof, browser/native/GPU behavior,
or pin amendment. Patch 002 must be separately rebased after review of this
001 candidate, followed by 005 and 004; upstream already supplies the alias
distinction from historical 006. Experimental 003 is not in the main stack.
