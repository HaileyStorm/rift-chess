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
