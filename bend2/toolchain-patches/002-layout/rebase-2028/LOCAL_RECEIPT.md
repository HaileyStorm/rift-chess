# Fresh ordered-stack replay, 2026-09-26

Root created a new disposable checkout at the upstream 2.0.28 tag
`bc178404f4778704fa5584a73fcdf72bcdf9f32c`, separately from both the
clean pinned 2.0.27 compiler and the earlier disposable 2.0.28 candidate.
Ordinary `git apply --check` and `git apply` succeeded in the order:

1. Maintained 001 arity diagnostics.
2. `002-after-001-2.0.28.patch`, SHA-256
   `21fa3dbbf542147289d7efec92db0867bdbae36ecfb6e1b436ab87cd16a1a469`.
3. Maintained candidate 005 Windows import paths.
4. Candidate 004 Web Workers, including its unchanged runtime resource.

Immediately after step 2, the LF-normalized
`bend.ts`/`comp.ts`/`main.ts` hashes were respectively
`f4bcb58153ac06af6c11214b9c3d6680ffeb8ee597c04001ffe93d8ffeac248e`,
`950b582dbf47f50cfe7974d40aa5e09ae503f9987357b3f3a543bcb7abc3a7b3`,
and `8e8c02ef9cade0310ed098d1596e789070e7e91aabf98e24b3dd648fa849a928`.
These reconcile the earlier pre-005 source ambiguity. The final four
LF-normalized source/resource files match the earlier 004 candidate exactly;
`git diff --check` and the reverse-check of 004 passed.

The 2.0.28-specific [`test.mjs`](test.mjs) binds that exact upstream commit,
the three intermediate source hashes, and Bun 1.4.2. It ran against the
separate intermediate compiler and the pristine tag: the report repeated
byte-identically, its wide and recursive layouts, fork and bang sites, option
and local-import denials passed, source fixtures remained unchanged, and
ordinary JS/C emitted byte-identically before and after 002 (JS
`990568b69421fcf98b822f71e3d510e080c7681f948a4390417092431cce9c5d`,
C `3908e7d5f5b368008e569717b403d7aeac226136940a10e179c85989a43661f5`).
Upstream 2.0.28's Windows nested relative-import failure is observed at this
stage, so its relocated-import and nested-negative assertions run only on
POSIX. The final 005 fixture below verifies the repaired Windows path and
nested local-only denials. Neither stage alone implies the other's behavior.

The full 107/107 Node/Bun/HTML/Chrome worker gate passed with zero skips on
this freshly assembled stack. Reversing 004 for the separately pinned 005
fixture yielded its exact expected final-005 source hash; that fixture passed
ordinary and nested imports, named/library/junction denials, case identity,
proof-import gating, and synthetic cross-volume boundaries with **zero
provider requests**. The canonical junction denial belongs to 005; 002 alone
does not close that path. Reapplying 004 succeeded. A separately emitted static
worker demo served under `/nested/build/` passed all 19 functional and six
negative/lifecycle cases in Chrome 153.0.8010.53 and Edge 154.0.4258.37,
without page errors or failed requests. Ignored browser receipt SHA-256 values:
Chrome `dd73947d3f6cf7dee59723064987d77a0e9eef86b2bfad4b255d153129b7c2bb`,
Edge `35e21946ec5e296dc9aa004285fddd5a5291d9fa63643f201bd4e447d3f3438e`.
The first attempt to launch Playwright's absent bundled Chromium made no
browser claim; reruns used the installed browser executables.
The same generated demo subsequently passed 19/19 and all six
negative/lifecycle cases in Firefox 155.0 and WebKit 26.6, again with zero
page errors or failed requests. Receipt SHA-256 values: Firefox
`c9a6012b695d5ae9e53a4639b988995496a2b0a9936a6678774dff7347ba930e`,
WebKit `059299e3d1a1fda7a7e52f95c71fb57bf427eac4f97cfc55250fce189afdbc5d`.
WebKit executed the exact valid worker served as `text/plain`; its corrupt and
mixed-build workers were rejected. The other three engines rejected wrong MIME.

A separate relocated-resource smoke copied the candidate compiler's `bend2`
resource tree into an ignored portable directory (95 files, including the
worker runtime) and used that copy's `main.ts` to emit a strict required-only
worker library from a Bend fixture. The output manifest declared the expected
worker backend. This is resource relocation, not an upstream installer or
native binary; only the local source tree was moved, and no provider was
contacted.

The copied 2.0.28 regression matrix compared the **fresh** 004 stack against
the separately reconstructed final-005 source baseline across 647 parse,
check, compile, proof, show, and comptime fixture files. There were zero
check/normalized JS/C differences; ignored report SHA-256
`5dfb4add4708b0c00481bc9f27653152a4ab045047c6e882f4c6c43f3939dda1`.
This is source comparison, not execution of all test programs or a Linux
native/GPU run.

The replay supports source composition and those local gates. It does not
establish Linux parity, execution of the complete proof/application suites, portable
resource packaging, native C/ELF or GPU behavior, application acceptance, or
the reviewed pin amendment.
