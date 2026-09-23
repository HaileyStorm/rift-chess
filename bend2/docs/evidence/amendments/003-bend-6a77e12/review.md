# Independent review: amendment 003 (`bend-6a77e12`)

I am an AI subagent reviewer and did not author this amendment. I performed a read-only review and wrote only this review file. I did not run a build, gate, `amend.mjs --create`, Git mutation, fetch/pull/checkout, upstream publishing command, or modify the upstream checkout.

## Commands and checks run

- Read `bend2/docs/LOCAL_BEND_GUIDE.md`, the amendment 001 review, `spec.json`, all five receipts, `bend2/tools/amend.mjs`, `bend2/tools/amendments.mjs`, `bend2/tools/verify-library.mjs`, and `bend2/tools/loader.ts`.
- Ran the requested upstream `git log` and scoped `git diff`, plus read-only status, revision, stat, export, channel-runtime, and diff-integrity checks.
- Inspected repository status/diffs and frozen-law status; searched project Bend and tool/test sources for `Chan.` and name-at-version imports.
- Recomputed SHA-256 for every path recorded by v1, v2, and mutation receipts, every library provenance pair, every browser output, both pin manifests, the graphics source-freeze object, and each receipt itself.
- Strictly decoded every draft JSON receipt/spec as UTF-8, checked for BOMs, parsed them, and compared `.artifacts/amend-003/build.json` byte-for-byte with `bend2/dist/build.json`.
- Set `BEND_NO_TELEMETRY=1` for Node and ran verify-only `node bend2/tools/amend.mjs`; it reported exactly `bend2/TOOLCHAIN.json` as the open frozen drift.
- Exercised `reviewBinds` with the hashes below; the prospective binding is accepted by the current amendment tooling.

## Findings

### Blocking

None.

### Non-blocking

1. The upstream checkout is clean at `6a77e1246c351055cb15031267a7c76c87036cbc`. The five commits after `ff7a40c` are the compiler-output refactor/channel relocation, named hub packages and commands, README addition, 2.0.26 release, and flake version update.

2. The semantic surface relevant to this project is unchanged. `bend.ts` adds only name-at-version package resolution; `main.ts` adds the related login/link/publish CLI surface and version string. `base.bend` redirects the four channel effects to shared files. The large `comp.ts` change refactors emitters/runtime assembly and relocates channel runtime code; its public APIs used by `bend2/tools/loader.ts` remain available (`book_owned`, `io_base`, and `js_lib`), with only a type-alias signature spelling change visible for `js_lib`. I found no checker/proof-normalization change. The project has no `Chan.` use and no name-at-version Bend import, so the channel and hub-name behavior is outside its exercised source cone.

3. Repository tracked changes are exactly `bend2/TOOLCHAIN.json` and `bend2/lib/graphics/VERIFICATION.json`. The former accurately moves Bend 2.0.25/`ff7a40c` to Bend 2.0.26/`6a77e12`; the latter binds the new compiler/toolchain hash and appends the old pin with `replacedBy` set to amendment 003. No `.bend`, law manifest, proof, implementation, test, fixture, or reference byte is changed. All four frozen law manifests are unchanged.

4. `spec.json` accurately lists the sole frozen drift, `bend2/TOOLCHAIN.json`, and its reason/rationale match the inspected changes. `VERIFICATION.json` is not a frozen-record substitution, so omitting it from the spec is correct.

5. All six JSON files are valid UTF-8 without BOM. The current `TOOLCHAIN.json` hash is `7d7e5005b273c3737ee7f0585b82b8354f59149aa63e903e9a63cb127d775e10`. All 22 v1 hashes, 87 v2 hashes, 73 mutation hashes, four library provenance pairs, and seven build-output hashes match current bytes. V1 and v2 report passed/unchanged, all six mutation controls are positive and rejected, and the library receipt reports ok/checked with four successful checks. Compiler fields consistently name Bend 2.0.26 at `6a77e12`.

6. The library source-freeze digest, compiler history, toolchain binding, and graphics manifest hash all match current bytes. The draft build receipt is byte-identical to `bend2/dist/build.json`; its seven files match `bend2/dist`, and its dirty state is explained by the two pin-manifest edits.

7. The stated pre-pin content version `361b9895746876a71757` is not retained in the amendment evidence, so I could not independently hash that historical output without rerunning a forbidden build. This is not blocking: the new-pin build is complete and current, upstream states non-channel output is byte-identical, this project uses no channels, and the full proof/conformance/mutation/library receipts passed on unchanged project sources. The matching historical content-version observation is adequate corroboration but is not itself cryptographically bound by these five receipts.

8. The amendment tooling would accept these receipts once this review is supplied: the spec exactly matches drift; required receipt schemas, gates, modules/declarations, controls, current hashes, compiler pin, and review binding satisfy the create-time checks. Verify-only failure before creation is the expected single `TOOLCHAIN.json` drift.

v1 SHA256: 8551511084cba4b1770f5bbebe5a5807cf4ad2f557eb3cb613ba044aac5a4a19
v2 SHA256: 392d4a20af5459f34ca49aa6ab2e6d394c87db6acbae9264ca3c0486330fbb70
mutations SHA256: a1ed214c391b72e70a2fba45b8ee5e8e2b53d9859f2512dd70c7c82b93c561e5
library SHA256: 67df3f4821b7e087b09a05e503e19334728c018ec7c9ad14f78b37f02b98e4ad
build SHA256: 80e34a4eba7203af318887f4411c57839a79fb74ed0eefc69f846a6501a244ed

Review disposition: accepted
