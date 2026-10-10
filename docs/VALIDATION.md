# Validation policy

The October 10 owner direction is zero active unit/integration tests, minimal
real E2E acceptance, and unchanged formal proofs. Do not add a replacement
synthetic matrix, per-edit broad suite, scenario quota or readiness-review stack.

For an application change, build once and exercise the smallest actual user
journey that can expose its failure. Launch/play/Shift and view/settings belong
in the same rendered session where practical. Persistence and cold offline
restart require their real lifecycle. Native/audio/GPU evidence is required
only for the corresponding promised result and must use the real runtime/device.
Reuse unchanged evidence; a documentation change does not warrant browser runs.

The retained TypeScript E2E entrypoints include `scripts/playtest.mjs`,
`scripts/offline-restart.mjs` and `scripts/native-playtest.mjs`. Use an explicit
`RIFT_TEST_URL` and fresh `RIFT_TEST_RUN` for browser evidence; native runs require
the actual packaged `RIFT_ELECTRON_PATH` and fresh `RIFT_NATIVE_RUN`. These are
available entrypoints, not a mandatory list to run together. Specialized upgrade,
lifecycle and mode runners are selected only for a changed, unresolved obligation.
Use the existing quiet-launch and artifact-budget safeguards before execution.

The current99 Bend browser replacement must exercise a small real journey through
launch/play/Shift, Worker response/cancellation, view/settings/picking and
persistence/offline. The unexecuted 24-scenario/689-check draft is retired. Do not
hide its permutations under fewer scenario labels. Formal rules obligations stay
in the proof cone; synthetic module and reference comparisons are not E2E.

Thirteen TypeScript/Python unit/integration files, pytest-only setup and the
isolated audio review runner were removed. Their synthetic URL, PNG, audio,
geometry and randomized-reference predicates are no longer independently tested;
E2E does not imply every removed predicate. Existing receipts remain historical.

`bend2/laws/semantic-v2.json` freezes the original `package.json` and lockfile.
They remain byte-identical, so Vitest and its old script remain dormant support.
`vite.config.ts` has empty test discovery. `npm test` and root pytest are retired,
not successful acceptance commands. Removing that frozen support belongs to the
existing new-version procedure; this cleanup does not rewrite the manifest.
Frozen reference documentation may describe original test commands; it is
historical creation evidence and does not reactivate them. Original release
manifests, legacy sources and frozen test-looking proof dependencies are retained.

Frozen laws, full formal checker/kernel obligations, semantic mutation controls,
toolchain provenance and required native/device outcomes remain intact. Build
identity guards and actual ownership/access/stop/settlement safeguards remain
runtime duties. Keep proof, finite comparisons, E2E, subjective review and native
measurements distinct in reports.
