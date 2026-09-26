# Bend 2.0.28 layout report candidate

`002-after-001-2.0.28.patch` adapts the maintained 002 layout report to
upstream Bend 2.0.28 (`bc178404f4778704fa5584a73fcdf72bcdf9f32c`). Apply
it **after** the separate 001 arity patch and **before** 005 Windows import
paths and 004 Web Workers. This patch touches only `bend2/bend.ts`,
`bend2/comp.ts`, and `bend2/main.ts`. It does not change the clean project pin,
Laws, proofs, or runtime scheduling.

The patch was extracted by reversing the reviewed 004 and 005 candidates in a
copy of the disposable compiler, then diffing those three files against a
fresh upstream tag plus 001. Its source changes are the 2.0.28 forms of the
original 002: a typed structural layout report, a CLI-only report option,
and a local-only import guard. This derivation is **not** itself replay proof;
the fresh ordered replay and focused checks are recorded in
[`LOCAL_RECEIPT.md`](LOCAL_RECEIPT.md).

For a new replay, use a disposable checkout of the exact public tag. Apply
the maintained 001 patch, then this one with ordinary `git apply --check` and
`git apply`. Check the three LF-normalized source hashes in the receipt before
applying 005. Keep the pinned `.artifacts/toolchains/bend` checkout clean.
Do not use whitespace-ignoring patch flags. This 002-only guard rejects direct
lexical library paths and named/hash imports before a package lookup, but the
canonical alias of a junctioned library root is closed by the later 005 patch.
Repeat those denials on the **combined** stack with a loopback provider trap,
as well as the fixture's deterministic report and ordinary C/JS emissions.
Run [`test.mjs`](test.mjs) on the exact intermediate 001+002 checkout before
005: it binds source hashes and compares the 002 output with pristine 2.0.28.
The 2.0.28 Windows nested-import defect prevents a meaningful nested fixture
there; the combined 005 test covers that repaired path.
The report is structural evidence, not measured parallel runtime behavior.

The candidate has not been adopted. The project guide's reviewed toolchain
amendment, frozen proofs, full application gates, and Linux/native checks still
control any future pin move.
