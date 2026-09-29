# Bend 2.0.32 browser Worker phase four

This is a bounded real-browser vertical slice over the exact 2.0.32+001+002+005+phase2 derived compiler. It emits selected `required` and `never_call` exports from the existing policy fixture. A unique ephemeral `127.0.0.1` fixture serves those modules and a module-worker bootstrap with JavaScript MIME, same-origin resource policy, and a restrictive CSP. Playwright drives system Chrome; the required call uses `new Worker(..., { type: 'module' })`, while the `never` call imports and runs locally without constructing another Worker.

The preflight also feeds the fixture's statically blocked `required_arithmetic` root through the existing phase3 runtime and checks that it rejects before its Worker-created callback. This is only a pre-dispatch negative control, not a browser scheduler implementation.

Run from the repository root:

```powershell
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase4-browser/test.mjs
node bend2/toolchain-patches/004-web-workers/rebase-2032/phase4-browser/test.mjs
```

The test pins the pristine scout, canonical 2.0.27 pin, derived compiler source hashes, ordered patch hashes, source fixture, and helper/test bytes before and after execution. It also checks the bytes actually served against the emitted-module digests and the bound driver/bootstrap digests. Generated JS is confined to a uniquely named OS temporary directory; the test verifies its resolved parent and directory identity before exact cleanup. Capture and partial-write failures, plus a browser-close failure with a primary error, are injected to verify cleanup ordering and error preservation. The server binds only to loopback and an ephemeral port. CSP plus Playwright routing deny non-loopback page requests; Node and worker `fetch` are trapped.

Playwright and a Chrome/Chromium executable are required; the test never installs or downloads a browser. Set `BEND_PHASE4_CHROME` to an explicit executable path to override discovery. Otherwise it checks the platform's common Google Chrome location (Windows Program Files/LocalAppData, macOS Applications, or common Linux locations) and then Playwright's bundled Chromium executable. The receipt records only the executable basename and browser version.

This does not implement the per-call scheduler or complete 004 backend and is not the 107-case worker gate, full-game build, hosted acceptance, native execution, GPU evidence, frozen-proof acceptance, 2.0.32 pin amendment, or release claim. Preserve those separately.

## Recorded local probe

On 2026-09-29, the gate passed in system Chrome `154.0.8037.58`. It returned only the `required` export with value `40` from one real module Worker, then only `never_call` with value `42` locally and zero additional Workers. The blocked required root rejected before Worker construction. Page and worker fetch counters and outside-origin requests were zero; the exact temporary output directory was removed after the run.

Key output hashes: policy fixture `9204db93874b8c2a59ccae988211298e29d7c21945c06bae8452d6addafe9a6d`; generated required module `87d7571c0bd4094872eedcb9c2a5074b2322afbc801cf59cddf9fa97b416a8fb`; generated never module `b238299ed70f15383ace1c68a23779139f5badaadb03b7c03b004bd6fef48ed3`; driver `bee2fc220ba7afb0df6489120d3e1b092cbedc1e12b5aac11bd1fe57328b6cff`; worker bootstrap `d985e7c80e4753005e6f5c93966fb5f9a84066a03e865df55f47b25bdce98c0f`; test `089761d967c24e24cdeee670eb48008db859f8f56255c5feb7a4e4134ba4d1f2`. The emitted JSON receipt also records every bound source/compiler/patch input and the runtime request list.
