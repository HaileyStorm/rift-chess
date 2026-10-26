# Reviewed BendTT 2.0.35 kernel build

Review disposition: accepted
BendTT kernel SHA256: 72e11a86f44563e9decb26fe1c586ed7d5465e98ca282ada5ae8753b1156cad5
BendTT source Git blob: 536080934799f258fb17cf9259f1a77dcbc8866e
BendTT source commit: 79df8d9c40722ee9507a1e253f283b51025f9d6c
BendTT source tree: 0545e537656df3931dbc32e5d0611305ab9b6f6a
BendTT source SHA256: e15042434e73aab07ab05cea4b77b5619082c00a6d4924ea2d4a2cdec05facce
BendTT safe.ts Git blob: 3d4bc68eadd54b0164d7c2e9c8b7031b6c05d71f
BendTT safe.ts SHA256: 54cb3a534ab7cc9ee313bf6383b3948ccdcac022469b3020e00745bbfe6f7e04
Lean exact version: Lean (version 4.34.0, x86_64-unknown-linux-gnu, commit 293d5d0c0c3f3dded4688b3ccd6a33939ac5102b, Release)
Lean executable SHA256: e8baaa71855a616dc351028f3ad2200051b0671f423a1696a100e809302d5550
leanc exact version: clang version 22.1.4 (https://github.com/llvm/llvm-project 35990504507d79e0b9deb809c8ee5e1b34ceef20)
leanc executable SHA256: 68a45f8329e2d79133cdcc7b1fa494e37844282d7b5f8908ce1deda7cfdf161a
Lean build command: ["/home/hailey/.elan/toolchains/leanprover--lean4---v4.34.0/bin/lean","-c","bendtt.c","bendtt.lean"]
leanc build command: ["/home/hailey/.elan/toolchains/leanprover--lean4---v4.34.0/bin/leanc","-O3","-DNDEBUG","bendtt.c","-o","bendtt"]

The native Linux build finished at `2026-10-26T00:39:45.571685+00:00`.
Its exact reviewed package INDEX SHA256 is
`ed4c4dd0e1a1a32d0149c6e038f8427ac78c1aaa9183924a973a0aefb87b02b6`.
Both commands used `LEAN_STACK_SIZE_KB=4194304`. All four original children
(two version reads and two build commands) exited zero. Original version
streams match the recorded version fields; both build commands produced no
stdout or stderr. The original outer result records exit zero and no observer
error. Its stdout exactly equals the retained producer result, with empty stderr.

Independent read-only Linux file retrieval authenticated the original producer
result (12,139 bytes, SHA256
`6f1253cc6264ae6e2e85583fc66b1af001dbc03f59f3928591dd81cf56e61696`),
the four child-result records, all original streams, tool files, source, generated
C and candidate ELF. Parsed producer content also matches the complete
human-forwarded report: canonical JSON SHA256
`5a4edf49fa0f9f5138e2b7ff6177e1adbde26b37daae302886715c02efc01b30`.
The original outer-result SHA256 is
`b817ba9aa567d53d60d69b9de76ba7d1731358ef7735ac515c9c274fbfa868f1`.
All inspected files were regular, non-symlink files with stable identities
during reads. The binary is 5,477,728 bytes, ELF64 little-endian x86-64 ET_DYN;
the generated C SHA256 is
`76ef8506238e2b587dd5c717223e7fcb7e5a37b0a0875c2219901f05bc36b048`.

Root reviewed these original identities against `contracts.mjs`'s prebuilt
kernel contract. A separate read-only review found no source/tool/command
mismatch. No rebuild or synthetic campaign was needed.

This accepts the prebuilt binary's build/provenance for subsequent separately
admitted use. The producer never invoked this kernel. This review establishes
no `ALL PROOFS CHECK` verdict, Linux Safe runtime approval, full consumer
execution, semantic mutation result, native/device acceptance or compiler
adoption. Existing null approvals and historical source fences remain unchanged.
Current source and exact Linux runtime approvals, genuine native ownership,
both full-ancestry 12 GiB admissions and original process-group settlement are
still required for the actual full consumer.
