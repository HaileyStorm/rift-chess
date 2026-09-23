<!-- Amendment 002 review record. Round 1 (same AI subagent reviewer, read-only) rejected the first 2.1 draft for five prose errors: stale history diffs, gate-tool amendability overstated, Reflection lemmas described as used, two MatchLaws misclassified, and an incomplete admissibility list. All were fixed. It found no semantic law defect. Round 2 follows verbatim. -->

*I am an AI subagent reviewer working read-only. I edited and wrote no files and ran no gate or `amend.mjs --create`.*

**Round 2 result: accepted.** All five round-1 blocking findings are fixed, and so are the four suggestions you took up (6, 7, 8 and 10). The revised paragraphs introduce no new factual errors, and no law's meaning changed.

## Document and diffs

- **Final document:** `bend2/docs/LAWS_V2.md` and `.artifacts/bend2/LAWS_V2.1.md` both hash to `64043d00…df82` and contain no carriage returns.
- **Frozen original:** `history/LAWS_V2.0.md` hashes to `f5e555f2…550e`, which equals the `semantic-v2.json` entry for `LAWS_V2.md`.
- **Exact diff:** the header of `LAWS_V2.1.diff` reads `index 929475d..ac71f43`. Those are the `git hash-object` IDs of the 2.0 file and the final `LAWS_V2.md`. The file is byte-identical to a fresh in-memory `git diff --no-index` (50,677 bytes).
- **Prose diff:** `LAWS_V2.1.prose.diff` is byte-identical to a fresh `git diff --no-index --ignore-cr-at-eol` (42,459 bytes).
- **No law meaning changed:** I replicated `drift()` across all four frozen records. The only drifted file is `bend2/docs/LAWS_V2.md` (frozen hash `f5e555f2…`, recorded in `semantic-v2`). No law, proof, contract, implementation, fixture or reference bytes changed.

## Round-1 findings

1. **Stale diffs:** fixed, as confirmed above.
2. **Amendable tools:** fixed (lines 492-498). The text now says only tools under `bend2/tools/` are amendable and that `check.mjs`, `node-check.mjs` and `proof-runtime.json` are protected. This matches `amendments.mjs:21-25`.
3. **Reflection lemmas:** fixed (lines 338-341). They are described as infrastructure that no current proof uses; only `CHECK.bend` and their own proof import them.
4. **MatchProof paragraph:** fixed (lines 141-152). It now lists five ordinary laws plus eight helper-function identities, consistent with the eight `{==}` proofs (`MatchProof.bend:49-54, 103-104`) and with proof limit 3.
5. **Admissibility list:** fixed (lines 21-27). It now includes the rights bound (at most 15, `Geometry.bend:315`) and the EP pair's zero-progress condition (`Geometry.bend:107-115`). Checked against `valid_position`, "Every conjunct" in row 1 of the revision record is now accurate.
6. **Proof limit 1:** fixed (lines 238-242). The 17 rule-family conjuncts are listed, and the claim that they follow from the others is marked unproved.
7. **`no_actions_precede_all_draws`:** fixed (line 357). The statement now says "with no override", matching `MatchLaws.bend:64`.
8. **Proof limit 5:** fixed (lines 253-256). It mentions that the draw selectors are factored differently: one `C.draws` versus the kernel's `bare` and `counted` helpers.
10. **Revision record label:** fixed (lines 528-529), with the smaller rewordings disclosed.

One wording nit that doesn't block acceptance: proof limit 3 still says "the six literal-flag selector laws above", but the paragraph above now names all eight. The count of eight is still correct.

## Receipts against `create()` in `amend.mjs`

- **Spec:** the slug `laws-v2-1` is valid, `kind` and `rationale` are present, and the listed files equal the drift exactly (`LAWS_V2.md` only). That file is substitutable, and its preserved copy matches the frozen hash. None of the six `002-laws-v2-1` evidence targets exist yet.
- **`v1.json`:** schema `rift-bend-readiness/1`, not a draft, passed and unchanged. It has exactly the five gates in order (proofs, conformance, match, graphics-proof, pixels), all with exit 0 and no error. It covers every file in `semantic-v1`, `pixels-v1` and the `proof-v1` witnesses with no stale hashes. The `TOOLCHAIN.json` hash it records equals the current file's, which pins compiler `ff7a40c`.
- **`v2.json`:** schema `rift-v2-staged-check/1`, passed and unchanged. The aggregate `CHECK.bend` result is ok, `missingRequired` is empty, the module and declaration lists equal the current directory, and conformance is ok. It records the frozen `f5e555f2…` hash for `LAWS_V2.md`, which `current()` accepts, and has no stale hashes across all `semantic-v2` files.
- **`mutations.json`:** passed and unchanged. All six required controls are positive and rejected, with no stale hashes.
- **`library.json`:** ok and checked with four checks. Its compiler commit matches the pin, and the first two checks output `All terms check.` The file has no byte-order mark.
- **`build.json`:** schema `rift-bend-browser/2`, not a draft, and its toolchain commit matches the pin.
- **All five receipts** are UTF-8 without a byte-order mark.

v1 SHA256: 091462711121b8ea3ca0c8eaee795d5b32b9dda70846802be536df3938091958
v2 SHA256: b1c3e38a85ba5ee6f8967a0adfcb2e9d3b78609baed234480c890d614455b2e9
mutations SHA256: 794742a0fd2fbb2524619ccd5a147c54527eccb276c51d166bd2195c0f4bdf13
library SHA256: a579a4b46b20e7656302d543a55013b9cac22ea99fce170ce92217f11d3daaba
build SHA256: d9b7b2cb81f72d15244671b7f586109aa8a62369eed94669c2de39cea82756bc

Review disposition: accepted
