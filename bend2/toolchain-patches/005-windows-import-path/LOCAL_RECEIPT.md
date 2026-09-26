# Local receipt

Observed on Windows, 2026-09-25. Candidate HEAD was
`bc178404f4778704fa5584a73fcdf72bcdf9f32c`; it already contained the 001 arity
and adapted 002 layout changes. The pinned 2.0.27 compiler was not modified.

## Before 005

The unmodified candidate `bend.ts` had exact-byte SHA-256
`fd618ad061743b225c471c1a788b149ff86a6c73761fc6499eda696a25e5e5f7`. The
isolated fixture test in `--explain-layout` mode produced:

```text
BASELINE nested relative imports: rejected on Windows path resolution
PASS local-only named-package guard: rejected before BendHub (0 requests)
PASS local-only library-path guard: rejected before package loading (0 requests)
candidate bend.ts sha256: fd618ad061743b225c471c1a788b149ff86a6c73761fc6499eda696a25e5e5f7
```

LF-normalized SHA-256 of those four output lines, including the final newline:
`acd304bf516173b02302c4fd981926af282cefdb9021361788f1943346081432`.

## Final 005 review follow-up

`node bend2/toolchain-patches/005-windows-import-path/test.mjs` passed nested
ordinary/layout checks; named-package and library-path local-only denials; a
valid cached named package; the junctioned canonical `BEND_LIB` fence; Bun's
dual-spelling same-file fixture; provider-free package-file assembly; the
case-variant self-import cycle and `PROOF.bend`/`LAWS.bend` gate; and explicit
synthetic different-drive and different-UNC-share rejection. The local HTTP
trap saw zero requests. Output:

```text
PASS nested relative imports: ordinary --check-only
PASS nested layout names: main -> left/first -> left/deep/second
PASS local-only named-package guard: rejected before BendHub (0 requests)
PASS local-only library-path guard: rejected before package loading (0 requests)
PASS valid named package resolves from isolated cache (0 requests)
PASS local-only canonical BEND_LIB junction guard (0 requests)
PASS Bun dual-spelling paths share one same-file module namespace
PASS case-variant self-import reports a cycle
PASS package-file assembly uses only filesystem path keys (no publish)
PASS PROOF import gate recognizes same-file LAWS casing
PASS cross-volume path policy: different-drive targets are rejected
PASS cross-volume path policy: different UNC shares are rejected
candidate bend.ts sha256: 9068fe33367505ba99bfaba3aa99ad66c1dc9e7799c014ec1f042a598ac888a2
candidate source stack sha256: 3983a328f7f912e12cd2404d000c86ee6da05498b57ce2bc31275e34f113e7ce
005 patch sha256: 2a2c4c5c0061080d35815849fd37cdace7c6949e8bf99c5cc6b566d30dfb8d0d
```

LF-normalized SHA-256 of those fifteen output lines, including the final
newline: `c60b7045618ad6a20eb23f76aa65256cd5e441bd0de6309e741e5452682fe743`.
The test prints this digest as its last line, excluding that line from the
digest.

The test pins the full base commit, exact modified-file set, canonical LF
hashes for all modified compiler sources, and the patch bytes:

```text
bend2/bend.ts  9068fe33367505ba99bfaba3aa99ad66c1dc9e7799c014ec1f042a598ac888a2
bend2/comp.ts  950b582dbf47f50cfe7974d40aa5e09ae503f9987357b3f3a543bcb7abc3a7b3
bend2/main.ts  bd7218bc60e4da73be2fdb3c56b8325dd4f0344c771e7a1a6788bb27f9dfb7ec
005 patch      2a2c4c5c0061080d35815849fd37cdace7c6949e8bf99c5cc6b566d30dfb8d0d
source stack   3983a328f7f912e12cd2404d000c86ee6da05498b57ce2bc31275e34f113e7ce
```

File IDs are held in a WeakMap side index keyed by the path-only `seen` map;
the package assembler therefore receives only filesystem paths. The proof
reader asks the same index when checking whether the required `LAWS.bend` file
was imported under a different Windows spelling. The provider-free package
assembly test calls `pkg_files` directly; it does not invoke `--publish`.

Root replaced the earlier zero-context main.ts patch with a three-context
unified diff, fixed a case-variant self-import cycle error, and rejected
different UNC-share roots discovered during review. The final patch passes
ordinary `git apply --reverse --check` against
the edited candidate. Root applied it with ordinary `git apply` to a separately
saved, LF-normalized **pre-005 candidate state** reconstructed by reversing the
previous patch. Its `bend.ts` and `main.ts` hashes before application were
`f4bcb58153ac06af6c11214b9c3d6680ffeb8ee597c04001ffe93d8ffeac248e` and
`8e8c02ef9cade0310ed098d1596e789070e7e91aabf98e24b3dd648fa849a928`;
after application they matched the current candidate exactly. The earlier
001+adapted-002 snapshot recorded different `bend.ts`/`main.ts` hashes
(`fd618ad0...`/`07b83741...`). Their intervening difference has not been
reconciled, so this is **not** a fresh checkout replay of the original
upstream+001+002+005 sequence and does not authorize pin adoption. No provider
was contacted.

The cross-volume test invokes the actual exported relative-path helper with
synthetic Windows `C:`/`D:` and different UNC-share roots. A live cross-volume junction import was
not run because the only visible secondary volume was cloud-backed and was
not used for fixture writes. The candidate compares volume/share roots and
also rejects a native relative-path result that remains absolute, avoiding
namespace corruption.

Linux behavior is preserved by construction: `path` is POSIX there, separator
conversion is an identity, and file-ID deduplication is Windows-only. This
lane did not run Linux, native, GPU, browser or full-toolchain suites. The
cached named-package fixture passed without network access; remote package
acquisition remains untested.
