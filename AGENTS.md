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
writers. Root owns design, proofs/integration and user communication. Serialize
GPU tests and shared build outputs. Keep runtime parallelism immutable and balanced.

## Inherited Codex defaults

- Run `npm run artifacts:check` before large artifact-producing runs and at handoff.
  The default `.artifacts` budget is 12 GiB; an exceeded budget requires cleanup
  before further bulk generation. Use bounded outputs and avoid repeated compiler
  copies. Preserve pinned toolchains, active/unknown runs, claims, recovery inputs,
  and unique evidence. Retire historical screenshots or sealed logs only through
  an exact reviewed plan and `scripts/artifact-store.py`, which records original
  paths and hashes and verifies lossless payloads before removing loose files.
  Restore archived evidence with `python scripts/artifact-store.py restore
  archive-20261007 <artifact-relative-path>`. Never use age-based recursive cleanup.

Read `<CODEX_HOME>/HARNESS_OPERATIONS.md` when provider, sentinel, recovery, or host-boundary safeguards apply; this summary does not replace it.

- Inherit the global model routing, adaptive-effort, cache-aware switching, context defaults, and multi-agent workflow. Scalar role efforts are strong startup preferences; preserve explicit user/task choices and frozen experiment requirements.
- Keep prompts and child packets lean and checkpoint before context pressure.
- On unexpected auto-compact or a fresh-task rollover (even without a manual
  handoff), reread the request, current workspace/Git state, durable tracker or
  checkpoint, and recent test evidence. A successor reconstructs status itself;
  summaries/history do not prove progress, permissions, claims, or completion.
  Checkpoint objective/acceptance, owner/task/host, checkout/base/ref,
  scope/status, tests/evidence, risks, and next action.
- Reuse a suitable checkout for read-only or single-writer work; create managed
  worktrees only for meaningful writer isolation, never as a permission boundary
  or bypass. Before a write or takeover, verify resolved cwd/root, worktree list,
  branch/HEAD/base, dirty/staged/untracked/ignored paths, active writers, exact
  claim, and effective permissions. Acquire exact scopes with
  `working_sentinel.py` and request only needed access. A predecessor releases
  its own claims before the successor verifies state and acquires fresh ones;
  never impersonate, copy claims, blindly retry failed setup, or force-cleanup.
