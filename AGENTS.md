# Isolated Bend2 experiment

The user-authorized scope is the full sprint in `bend2/SPRINT.md`. The Bend2
experiment now lives in this main checkout beside the published TypeScript
application; keep that application working and outside `bend2/`. Root controls
integration and all Git mutations.

Read `bend2/docs/LOCAL_BEND_GUIDE.md` before Bend implementation. Upstream compiler
source under `.artifacts/toolchains/bend` is pinned; never patch it. Move the pin
only through the guide's "Updating the Bend toolchain" procedure (a reviewed
amendment). Set `BEND_NO_TELEMETRY=1` and use the local wrapper. No upstream
publishing commands.

Laws and normative dependencies become immutable once frozen. Changes require the
documented amendment procedure; never weaken them to make a proof or build pass.
Clearly distinguish proof, finite exhaustive checks, reference differential tests,
browser tests, subjective visual review, and native parallel benchmarks.

Use bounded delegated lanes with one writer per file cluster, preserving other
writers. Prefer Luna for routine work and Sol for consequential law/invariant
review; root owns design, proofs/integration and user communication. Serialize GPU
tests and shared build outputs. Keep runtime parallelism immutable and balanced.
