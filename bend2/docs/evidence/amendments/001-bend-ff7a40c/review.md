<!-- Amendment 001 review record. Round 1 (same AI subagent reviewer) rejected the first library receipt because it was UTF-16 encoded; the receipt was regenerated as UTF-8 and the amendment tooling hardened per its findings. Round 2 follows verbatim. -->

# Re-review: amendment 001 (`bend-ff7a40c`)

*This is an AI subagent reviewer. I only read files and ran read-only commands (`node --check` and verify-only `amend.mjs`); I edited nothing and did not run `--create`.*

I'm accepting it. The one blocking issue from last time is fixed: `library.json` is now UTF-8 without a byte-order mark and its content passes. The hardened checks are correct. I found nothing that would make a valid chain fail or an invalid one pass today.
- Both tool files pass `node --check`.
- Verify-only `amend.mjs` still reports drift in exactly `bend2/TOOLCHAIN.json`, `bend2/tools/freeze-v2.mjs` and `bend2/tools/freeze.mjs`.
- Neither `bend2/laws/amendments/` nor `bend2/docs/evidence/amendments/` exists yet, so `--create` won't hit leftover evidence.

## Findings

1. **Resolved, previously blocking: the library receipt encoding.** The file now begins with `{` (byte `7b`), has no carriage returns, and parses the way `amend.mjs` reads it. The new `readReceipt` would reject the old UTF-16 file.

2. **Non-blocking, checked and correct: evidence ordering.** `evidenceFiles(stem)` returns the five receipts in `receiptKeys` order (`v1`, `v2`, `mutations`, `library`, `build`), then `review.md`.
   - At verify time, `receiptKeys[j]` is paired with `required[j]`, and the review is read from `required.at(-1)`.
   - `--create` writes its sources in the same order, `[...receiptKeys â†’ receipts, review]` into `targets[i]`.
   - For stem `001-bend-ff7a40c` the paths are `bend2/docs/evidence/amendments/001-bend-ff7a40c/{v1,v2,mutations,library,build}.json` and `review.md`. The stem is `name.slice(0, -5)` at verify time and `name` at create, which agree.

3. **Non-blocking, checked and correct: the review regex.** I ran `reviewBinds` against synthetic reviews:
   - A correct review passes.
   - A review with a missing hash line fails.
   - A review that says `rejected` fails.
   - A review with indented hash lines fails.
   - CRLF line endings are accepted.

   The key names and hex hashes contain no regex metacharacters.

4. **Non-blocking, checked and correct: other verify-time checks.**
   - The `NNN` in the file name must equal the sequence number.
   - `records` must list exactly the four law manifests, each at its current hash.
   - At least one substitution is required.
   - `substitutable` reads `a || b || (c && d)`, so the `LAW_CHANGE_POLICY.md` exclusion applies only to the docs pattern. My spot checks gave true for `TOOLCHAIN.json`, `freeze*.mjs` and `LAWS_V2.md`, and false for `LAW_CHANGE_POLICY.md`, `docs/evidence/*.md`, `.bend` files and `tools/sub/*`.
   - Any substituted `.md` must have a preserved copy that hashes to its `from` value. Copies under `bend2/docs/history/` fall outside the substitutable pattern, so they are themselves protected.

5. **Non-blocking, checked and correct: `--create` hardening.**
   - It checks v1 gate names and order, exit codes and `error`.
   - It requires v1 to cover every `semantic-v1` and `pixels-v1` file plus the `proof-v1` witnesses, and v2 to cover every `semantic-v2` file.
   - Mutations must be `unchanged` and cover the substituted files.
   - It compares the v2 `CHECK.bend` module and declaration lists against the directory.
   - `drift()` now throws if two manifests disagree about a file, and records every manifest a file appears in.
   - All validation runs before anything is written, and it refuses existing evidence.

   Run against the current receipts, every one of these checks passes (see receipt results).

6. **Non-blocking: adding a law manifest later would break this amendment.** `records` must list exactly the manifests in `lawManifests`, and the evidence set must match `receiptKeys` exactly. If a future change adds a fifth law manifest (for example `semantic-v3.json`) or a new receipt kind, amendment 001 would fail verification even though it's valid. It fails closed, so nothing unsafe gets through. When that happens, version these requirements per amendment `schema`, or check each amendment against the manifest set it recorded.

7. **Non-blocking: smaller gaps.**
   - `reviewBinds` requires an `accepted` line but doesn't forbid a `rejected` line as well.
   - `--create` doesn't check the library receipt's `schema` or `toolchainSha256`, or the build receipt's `files`. I verified all three by hand below.
   - If a write fails partway through, the leftover evidence blocks a retry. That fails closed but needs manual cleanup.

8. **Informational: `bend2/docs/history/` has been added.** It contains:
   - `LAWS_V2.0.md`, byte-identical to the current, still-frozen `LAWS_V2.md` (`f5e555f2â€¦`).
   - Two `.diff` files.

   `LAWS_V2.md` hasn't changed, so it isn't part of amendment 001. A future `LAWS_V2` amendment is outside this review.

9. **Tooling hashes I reviewed:**
   - `amendments.mjs`: `fde126541451c483f922920744fc7fbe35d9c0103fee466b166c8c4ab2c75c6e`
   - `amend.mjs`: `e6b095784e48c9de1ef08bf5277da363419b32926f8df6dd7c1b9dcc2cf8f240`

   Confirm both are unchanged when you run `--create`, since `tools` records them at that moment. My earlier conclusions are unchanged:
   - `freeze.mjs` and `freeze-v2.mjs` only add hash resolution through the chain.
   - The upstream compiler change affects code generation only, not law meaning.

## Receipt check results

- **`v1.json`:** same bytes as last time. All 22 file hashes match current bytes, and the five gates pass in order.
- **`v2.json`:** same bytes as last time. All 87 hashes match current bytes, the key set equals the `semantic-v2` file list, and the aggregate proof passes over 18 modules and 18 declaration files.
- **`mutations.json`:** same bytes as last time. All 73 hashes match current bytes, including `TOOLCHAIN.json` (`8832b35eâ€¦`), `freeze.mjs` (`1338c267â€¦`) and `freeze-v2.mjs` (`ede59552â€¦`). All six controls are rejected.
- **`library.json`:** regenerated, 2281 bytes, UTF-8 without a byte-order mark.
  - `ok` and `checked` are true, and the schema is `rift-bend-library-graphics/1`.
  - 4 checks: two "All terms check.", 121 font checks and 6588 raster checks.
  - `compiler.bendCommit` is `ff7a40cc9070a34c78399ecd2bbe46a044ad9b4b`, and `toolchainSha256` matches the current `TOOLCHAIN.json`.
  - The four library copies are byte-identical to their originals, and the `sourceFreeze` digest `5b19540câ€¦` matches.
- **`build.json`:** same bytes as last time. `bendCommit` is ff7a40c, all 7 output files match `bend2/dist`, and `graphicsManifestSha256` matches the current `VERIFICATION.json`.
- **`spec.json`:** unchanged (`9b821cd0â€¦`).

v1 SHA256: 8150a33d3261d8c5069709198622c5788d1db0a77a725a938a02e437e5ec8179
v2 SHA256: 790926a61d2c1d37687ae6a262748ac2d452baa847ff79a851e09b60f5886cdf
mutations SHA256: c7607ed409a8ac7237513fc26b7268716476f549b2e4c72a1abd1a8936271c35
library SHA256: a579a4b46b20e7656302d543a55013b9cac22ea99fce170ce92217f11d3daaba
build SHA256: 31d2b248f0315180c21c519f5bdf0dd4b900ad8978b06d7a3c680d148c4b417e

Review disposition: accepted
