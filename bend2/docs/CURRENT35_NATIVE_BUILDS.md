# Current35 native CPU builds

The ordinary build API is
[`active-native-build.mjs`](../toolchain-patches/2035/active-native-build.mjs).
It uses the retained effective99 current35 compiler and the existing Event
overlay, validates the whole book, emits C in a dedicated Worker, links the CPU
ELF and packages the existing assets. It never invokes that ELF or CUDA.

Production selection remains guarded by `resolveActive` and the owning adoption
review. An unarmed descriptor still rejects production. Building the next UI
candidate must be possible before that candidate's native acceptance exists:
`buildCandidateNative2035({selection,inputRef,outputDirectory})` therefore accepts
a distinct, narrowly reviewed candidate record through the same build body.
It neither promotes the descriptor nor fills missing adoption evidence.

## Candidate caller contract

`selection` supplies `repositoryRoot`, `packetRoot`, `descriptorRef`,
`candidateRef`, `trustedReviewSha256`, `hostId` and `originalLaunchRef`.
References use `{base,path,bytes,sha256}`. The owning caller authenticates the
trusted review digest; reading an arbitrary review file is not authentication.

The `rift-candidate-native-build/1` record contains exactly:

```text
schema, purpose:"nativeBuild", adopted:false, descriptor,
hostRuntime, adapter, application:{sourceRevision,inputs},
buildConfig, outputDirectory, originalLaunch, review
```

The candidate binds one actual Linux/Node runtime, the executing native adapter,
the exact current99 inventory/lineage, selected source/helper/asset inputs, one
`rift-current35-native-build-input/1` config and one fresh repository-relative
output beneath `.artifacts/bend2/`. The config itself must be among the selected
inputs. The owning Linux launcher supplies live claims, the actual containment
unit and prospective original launch arguments. Stable launch paths avoid a
digest cycle; the launch record must match the actual process, not a fabricated
completed launch.

Future production and candidate configs using this API also require
`compilerResources: { directory, inventory }` in the existing
`rift-current35-native-build-input/1` schema. `directory` is the absolute,
canonical compiler resource directory; `inventory` is an exact selected
`{base,path,bytes,sha256}` reference to JSON containing that same `root` and
`files: [{path,kind:"file",bytes,sha256}]`. File paths are unique and relative to
the resource root. The API checks regular files, exact membership, hashes and
directory identities before linking and through receipt publication. Inventories
are bounded to 1 MiB, 4,096 positive-length files and 256 MiB total, with a
128 MiB per-file limit and bounded traversal.

The reviewed installed CPU compiler is `/usr/lib/llvm-18/bin/clang`, with its
matching default resource directory `/usr/lib/llvm-18/lib/clang/18`. Its retained
inventory has 355 files and 57,632,520 bytes; those counts describe that intake,
not universal required values. The matching default-directory relationship is
an owning reviewed compiler/intake fact. This API performs no Clang discovery
query, adds no resource flags and retains its inherited-environment rejection.
The receipt records the bound Clang identity, resource directory and inventory
reference. A resource directory by itself does not prove compiler compatibility.

The added field applies to future calls of this API. Consumed b836 configs,
their original API bytes and failed receipts remain unchanged; the separately
reviewed frozen-C link continuation keeps its own source/config and provenance.

The review has schema `rift-candidate-native-build-review/1`, disposition
`accepted-for-one-current35-native-cpu-build`, Root reviewer identity,
`descriptorSha256` and `recordSubjectSha256`. Compute the latter with
`candidateNativeBuildSubjectSha256(record)`, which omits only `review`.
The resolver binds the runtime executable and original argv/cwd, reads the
selected inputs and returns candidate authority only. Production activation
and its existing assurance requirements are unchanged.

The shared implementation retains exact source/overlay fences, an exclusive
output/intent/lock, Worker settlement, original Clang process-group settlement,
bounded logs and finalized receipt readback. A failed or consumed intent is not
reset or replayed. Its 72 GiB service cap, zero swap and 8 GiB outside reserve
are containment limits, not a measured claim that a build requires 72 or 88 GiB.
Both remaining-growth admissions still use the real full cgroup ancestry.

Successful candidate packages use schema
`rift-current35-native-cpu-candidate-package/1`, kind
`candidate-nonadopted-native-cpu-build` and `adopted:false`. Candidate intents,
results and failures also retain that classification. An actual build receipt
establishes source validation/C emission/CPU link/assets; a subsequent bounded
native UI journey establishes only the behavior it actually exercises.

For the October29 UI change, exactly three retained native project rows changed;
the other 84, canonical NativeV2 and the Event overlay remain unchanged. Refresh
one CPU package and one desktop UI journey. Preserve original PCM/restart/GPU and
formal receipts with their original source scope; do not replay those campaigns
or invent production acceptance to obtain a candidate build.

The original UI build validated 3,268 definitions with zero holes and emitted
the retained C, then failed because its Clang22 default resources lacked
`stdbool.h`. A distinct C-only continuation used installed Clang18 with its
matching resource inventory. Its exact command linked successfully, with empty
streams, no signals/retries and positive original process/service settlement.
The new receipt SHA256 is
`7c19141aebac29bd23a19362d786c35ffb47c9dd0408a6f0c4824f2927ef3ccc`;
the 6,310,496-byte ELF SHA256 is
`8481d75b58777133bf6ae79397fca4b7ca8cbbab58238a9bf297d88426959483`.
That composite receipt preserves the actual e225 source and original emission;
it claims no fresh Worker or successful old build. The ELF has not yet been
invoked. Native UI, matching CUDA/device acceptance and adoption remain separate.
