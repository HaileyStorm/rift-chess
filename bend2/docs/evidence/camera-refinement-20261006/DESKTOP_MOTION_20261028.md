# Current desktop continuous orbit — October 28, 2026

The current application completed a real continuous-orbit and atlas-picking
journey, but **missed the desktop motion-cadence target**. This is a retained
performance failure, not full responsiveness acceptance.

The original package manifest is
`8c6b4ab2c870567bcc8496dcc6c6d4df6b562ac0a60137f0793a5423e53f93ee`.
Its exact game/Scene/browser source bytes remain current at `01b8846`; subsequent
changes concern the native producer and evidence. The package's original source
base and postimage descriptors retain their original identities and dates.
No new emission, compiler/proof/kernel or GPU operation occurred for this run.

## Actual workload and outcome

Windows x64, headless Chrome 156.0.8078.48, 1280×800, DPR1. The owning Windows
Job's final limit flags were zero: no Job affinity or CPU restriction was added.
Other host load was uncontrolled. This is a browser profile, not a physical-device
or stable repeated-run benchmark.

After initial detailed artwork and one unmeasured orbit, the driver sent 48
trusted right-drag moves targeting 16 ms spacing without waiting for Worker
responses. Actual first-to-last input spacing was 852.3 ms. The original queue
coalesced pending moves; eight move-bearing batches consumed eight observed
trusted moves. Six motion frames were drawn before release. Forty unmatched
trusted moves are consistent with coalescing, not forty proven lost inputs.

| Observed result | Value | Review target |
| --- | ---: | ---: |
| Five inter-draw intervals | 78.4, 77.4, 47.4, 99.0, 234.5 ms | p95 ≤33.3 ms |
| Sample inter-draw p95 | 234.5 ms | **Over target** |
| Latest consumed move to canvas draw-end sample p95 | 286.8 ms | Diagnostic |
| Release to matching detailed artwork | 1993.6 ms | One observation within 2000 ms |

The five-interval p95 is the largest observed interval. It does not estimate a
stable population p95, nor does canvas draw completion measure physical scanout.
The detailed-arrival result has little margin; it is not a robust timing guarantee.
Correctness and timing dispositions are recorded separately.

The actual expensive frames spent 196–198 ms constructing the preview tree.
Their ground/sprite phases took 133.5/62.3 ms and 69.0/127.3 ms respectively.
Other measured tree frames took 38–63 ms. Traversal added 6–72 ms. These timings
locate work in construction/traversal; they do not attribute the variation to
garbage collection, compilation, contention or a particular allocation source.
The next useful investigation is the actual Worker cost behind these pauses,
rather than another broad scenario or historical compiler campaign.

A separately labelled capture tail, excluded from the measured interval,
captured an actual held-right-button motion frame and the settled detailed frame
at the same view: yaw304, pitch67, zoom115. Root inspected both images. Authored
pieces remain recognizable during movement; the moving ground edges are visibly
coarser than settled edges. Motion PNG serialization itself took 147.4 ms and is
explicitly excluded from the timing samples above. Final real canvas picking
selected g1's knight; camera/selection committed no game moves. No page/console
errors or failed requests occurred.

Original parent56824 and Chrome exited0, original handles joined/closed, and the
Job settled to the supervisor alone before closing. No signals, forced cleanup,
limit-terminated processes or unknown live work remained. Observed combined Job
peak commit was 1,036,435,456 bytes; this includes the browser and observer and
is not an application-only heap bound or paired memory comparison.

## Original records

Private originals remain under
`native-gameplay-20261027-r1/desktop-motion-20261028-r1/`.

| Record | SHA256 |
| --- | --- |
| Authored actual-UI journey | `467b5b7a5d8305f266426350218e750d9b3f091ddbe1a5e06a74670fcbda1926` |
| Actual result and passive timings | `af687818839ad1902535a154a80daea6c5826e99314bdb48382ed274075365bb` |
| Original native supervisor terminal | `12c235ea22b3f8df5c2537852a972677305a9d812abce05b4b69f11f84c91d11` |
| Actual moving frame | `808b63cc92d62d36a03effa48fd79ec8b90c321de1980d56a6a5a182fcd7ae20` |
| Matching settled frame | `597c4856b761d8d0cbd67d72815327bae56eae90a621a1eb0dca4ae67a21c37d` |

No unit/integration suite or permutation matrix was introduced. Stable desktop
and constrained performance, native current-source alignment, the original GPU
criterion, broader owner visual acceptance and reviewed compiler adoption remain
open. Accepted 2.0.27, immutable laws and runtime parallelism remain unchanged.
