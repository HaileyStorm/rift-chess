# Dense nearest source experiment — 2026-10-29

The exclusively owned dense-source candidate is shelved. Actual source checking,
selected Scene/Controller emission and browser packaging passed, and the real
orbit → release → g1 selection journey retained identical motion/settled PNG
bytes, final views, selection and saved history. Whole-frame responsiveness did
not improve reliably, so the active renderer was restored exactly.

The candidate prepared full-U32 Morton-order color and mask arrays once per
accepted pose, then threaded their exclusive owners through the existing serial
sprite painter. It retained both original paint rounds, clipping, fallback and
canonical picking/settled textures. Existing parallel ground branches, compiler,
frozen laws and proof meanings were unchanged. The observed preparation cost was
10.2 ms; preparation cost was zero during the measured orbit.

| Actual pair | Baseline cadence p95 | Candidate cadence p95 | Baseline detail arrival | Candidate detail arrival |
| --- | ---: | ---: | ---: | ---: |
| Original candidate first | 115.5 ms | 252.7 ms | 632.3 ms | 1,641.3 ms |
| Original baseline first | 85.0 ms | 90.9 ms | 551.6 ms | 437.3 ms |
| Reduced-allocation baseline first | 90.2 ms | 215.7 ms | 648.6 ms | 1,517.1 ms |

Each pair used fresh contexts in one hidden Chrome launch, the same retained
baseline package and the same actual continuous drag/release/pick journey.
Cadence uses the few presented motion frames; these are variable-load diagnostics,
not stable performance estimates. The reversed original pair reduced median
sprite work from roughly 33 to 20 ms and median tree work from roughly 58 to
41 ms, but did not close the end-to-end target. Unchanged ground work also
varied substantially. No GC or other causal explanation is established.

Inspection of actual emitted JavaScript found a temporary Buffer and result
tuple per sampled leaf. The next source revision removed those two wrappers,
keeping the arrays directly in the traversal state and reconstructing the
public Buffer once at completion. It passed actual source checking and the same
E2E parity, but its measured pair still did not justify shipping it. No further
microbenchmark or scenario campaign was added.

All original processes and browser Jobs closed positively. Initial parser,
affinity and stale-boundary build failures remain alongside their corrected
attempts. Exact retained final source manifest SHA256:
`253cca55e166d0708e70f44b910e86eb190a8a05f7e49243adffc13c0d507567`.
The private original source, packages, measurements and raw streams remain
recoverable; they are not active alternatives in the application.

This establishes scoped browser parity and a rejected optimization decision.
It establishes no new formal proof, native/device result, performance acceptance
or compiler adoption. The existing renderer and accepted toolchain remain active.
