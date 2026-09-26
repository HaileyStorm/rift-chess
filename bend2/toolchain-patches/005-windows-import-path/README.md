# Bend 2.0.28 Windows nested-import path fix

`005-after-001-002.patch` is a downstream candidate patch for upstream Bend
2.0.28 at `bc178404f4778704fa5584a73fcdf72bcdf9f32c`. Apply it after the
maintained 001 arity patch and adapted 002 layout patch. It changes only
the candidate `bend2/bend.ts` and `bend2/main.ts`; it does not edit the pinned
compiler at `.artifacts/toolchains/bend`, the toolchain declaration, or any
laws/proofs.

The loader receives canonical file names from `fs.realpathSync`. On Windows,
those names use backslashes, so `path.posix.resolve` and
`path.posix.relative` treated a nested import as a non-filesystem path. The
patch uses Node's native path operations for filesystem resolution, then
converts canonical paths to forward slashes when deriving Bend module names.
On Linux, `path` is POSIX, the separator conversion is an identity, and the
same resolutions and namespace names are retained.

Local-only mode still rejects package imports before package lookup. Its
library boundary now checks both the lexical `BEND_LIB` path and its canonical
real path, closing junction and symlink aliases. The focused test uses
temporary nested `.bend` files and a local `127.0.0.1` HTTP trap as `BEND_HUB`;
it exercises those denials and a valid named package already present in the
isolated cache, with zero trap requests. It sets `BEND_NO_TELEMETRY=1` for
each compiler process and never contacts BendHub or another provider.

For a candidate replay, use a fresh disposable 2.0.28 checkout with 001 and a
reviewed adapted 002 already applied. Confirm that pre-005 `bend.ts` and
`main.ts` match the baseline hashes recorded in [LOCAL_RECEIPT.md](LOCAL_RECEIPT.md)
before applying. The earlier adapted-002 snapshot differs, so a fresh full
stack rebase is still required. Do not apply this patch to the pinned checkout:

```powershell
$candidate = 'C:\path\to\fresh\bend-2.0.28-candidate'
$patch = (Resolve-Path 'bend2/toolchain-patches/005-windows-import-path/005-after-001-002.patch').Path
git -C $candidate apply --check $patch
git -C $candidate apply $patch
$env:BEND_CANDIDATE_DIR = $candidate
node bend2/toolchain-patches/005-windows-import-path/test.mjs
```

The test defaults to ignored
`.artifacts/bend2/toolchain-patches/update-2028`; set `BEND_CANDIDATE_DIR` to the
fresh checkout path when replaying elsewhere. It verifies the full 2.0.28
commit, exact modified-file set, canonical hashes for all three compiler
sources and the 005 patch, creates and removes its fixtures under the OS
temporary directory, and hashes its deterministic output. The baseline and
passing Windows result are recorded in [LOCAL_RECEIPT.md](LOCAL_RECEIPT.md).

The case-variant test uses distinct Bun `realpathSync` spellings and verifies
they share a Windows file ID before checking that Bend binds both aliases to
one namespace and rejects a differently cased self-import cycle. File IDs live
in a side map keyed by the current `seen` map, so
`seen` remains a map of filesystem paths for package assembly. A provider-free
test calls `pkg_files` directly and verifies the assembled package files; it
does not invoke `--publish`. The proof reader uses the same identity-aware
lookup for a case-variant `LAWS.bend` import. Cross-volume imports are
explicitly rejected when Windows volume/share roots differ or the native
relative path remains absolute. The test exercises that policy with synthetic
different-drive and different-UNC-share paths; it does not create a junction
on another volume or share.

The patch remains upstream-friendly in shape: it uses Node's built-in path and
file-ID APIs, keeps filesystem paths separate from Bend's slash-based module
names, and adds focused nested-import and identity fixtures. Remote package
fetch and live cross-volume junction behavior were not exercised. This
candidate patch does not constitute upstream acceptance or a toolchain-pin
amendment.
