# 2032-2 rendered browser smoke candidate

This is a separately versioned rendered-browser candidate for the local static
preview emitted by
[`browser-preview-v2/pack-static.mjs`](../../toolchain-patches/2032/browser-preview-v2/pack-static.mjs).
It does not change the 2032-1 gate, game source, or static packer.

[`approved-static-build.mjs`](approved-static-build.mjs) is deliberately
`null`. A real browser run remains disarmed until a separate review binds one
ignored static preview's canonical `build.json` path, raw SHA-256, version,
bundle source commit/tree, packer commit/tree, and exact scope in that module.
Environment-provided hashes cannot arm or replace that pin. The live harness
also requires the existing cached Playwright 1.63.0 / Chromium byte and tree
bindings from `browser-v2-runtime.mjs`.

The source-only contract suite is:

```powershell
node bend2/tests/browser-v2-live-2032/test.mjs
```

It exercises 2032-2 schema and reviewed-pin matching, exact manifest bytes,
package file path/hash validation, dedicated origin/run-path negatives, and
failure diagnostics on both navigation and first-frame settling. It
does not launch a browser, build a package, contact a network, or mutate Git.

After the static preview pin has been separately reviewed, committed, and the
workspace is in the exact state expected by that pin, serve that one directory
on a dedicated loopback port other than 4184/4185. Set
`BEND_2032_LIVE_URL` to its root URL and provide every
`BEND_LIVE_PLAYWRIGHT_*` / `BEND_LIVE_BROWSER_*` value required by
`browser-v2-runtime.mjs`. Then run:

```powershell
node bend2/tests/browser-v2-live-2032/live.mjs
```

Each run requires a fresh `BEND_2032_LIVE_RUN` name (or uses a unique generated
one), a new isolated persistent browser profile, and a new artifact directory
under `.artifacts/bend2/2032-browser-live-v2/`. It re-reads the pinned local
manifest, requires byte-identical served `build.json`, fetches and SHA-256
checks every file in the manifest, and blocks non-loopback page requests. The
interaction scope is the first frame, desktop hotseat `e2-e4` with persisted
action `3980`, an orbit drag that changes the presented view and refines that
same view, then selection/settings by mouse at a narrow viewport (not touch).
Navigation and first-frame failures retain JSON and a screenshot when possible;
success writes `result.json` with screenshot hashes and rejects page errors,
failed requests and outside-origin page requests. A passing smoke remains
local first-render evidence only; it is not browser acceptance, offline
or touch-device acceptance, native/GPU evidence, publication, or release
readiness. Source/served-file prehashes are not an atomic attestation of bytes
consumed if the local server mutates during navigation; use an owned quiescent
server and preserve its process/evidence binding.
