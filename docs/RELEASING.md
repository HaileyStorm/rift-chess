# Reproducing a release

Development was verified with Node 24.12.0/npm 11.19.1 on Windows 11 x64. Run `npm ci`, `npm test`, then `npm run build`. The browser bundle is `dist/`; `node scripts/headless.mjs` consumes bounded UTF-8 NDJSON using its built `api.js` entry.

Run `node scripts/package-electron.mjs` after a successful build (or `npm run package` to build first). It requires the installed Windows Electron runtime and refuses existing versioned output paths. Preserve or relocate your own previous output before rebuilding; never overwrite a released artifact. The resulting portable ZIP includes the runtime and a narrowly allowlisted application archive. The executable is unsigned and retains Electron's stock PE metadata.

Verify the exact ZIP checksum, unpack its complete versioned folder and launch `Rift Chess.exe`. `scripts/native-playtest.mjs` accepts `RIFT_ELECTRON_PATH` and `RIFT_NATIVE_RUN`, and exercises an isolated profile through the actual packaged runtime. Native offline checks use Electron session network emulation. Browser checks run against a static production preview, using the documented script environment variables and an installed Chrome.

For GitHub Pages, copy only the verified `dist/` into a separate staging directory, add `.nojekyll` and byte-preserving `.gitattributes`, then commit/push it to `codex/pages`. No Git worktree or application checkout switch is needed. Configure repository Pages to publish the root of that branch. Its deployment pipeline is hosting infrastructure; it is not hosted test evidence. Compare every live asset with the local build manifest and run the public-origin cold offline-restart check before claiming the site works.

Tag the source revision and upload the tested ZIP plus its `.sha256` file to the corresponding GitHub release. Preserve the published build hash manifest, native receipt and replayable UI evidence. v1.0.0's static branch commit is `650e87d8b5d106651cf2045d45c02faf6bb362dc`, built from source commit `9c0d8b01535f04d22bde93dfe22641aedd0c7ebc`; subsequent source changes before the tag contain publication evidence and documentation only.

The package verifier under `reference/verify_package.py` rewrites fixtures and receipts: run it in an isolated copy. The original ZIP and its manifest remain provenance. Do not rewrite them as release receipts.
