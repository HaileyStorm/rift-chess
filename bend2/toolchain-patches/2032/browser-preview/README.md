# Bend 2.0.32 local static browser preview packer

This separately versioned local packer accepts one `worker.manifest.json` from
`bundle-real.mjs` and the manifest's SHA-256 obtained independently of this
command. It verifies the raw manifest bytes, its source/cache/runtime bindings,
both content-named JS outputs and their regular-file paths, then makes a new,
ignored run directory under `.artifacts/bend2/2032-static-preview/`.
The bundle's source commit/tree are checked separately from the packer checkout;
the bundle commit must be its ancestor and `bend2/platform/browser` must be
unchanged between them. `build.json` records both revision/tree pairs and the
separate selected-cache source commit.

It uses the pinned local Bun runtime to bundle only
`bend2/platform/browser/host.ts`, with `__BEND_WORKER__` pointing at the copied
worker. The output includes the sprite helper, source-bound observatory assets,
packed font, three interactive piece pages, CSS, HTML, the original service
worker template with an exact output-file precache list, and applicable
notices/licenses. `build.json` contains the output byte map and provenance.
Existing paths are never overwritten. A failed run leaves its uniquely named
partial directory in place; the final `build.json` is committed last with a
verified no-overwrite link after input/output rechecks. There is no cleanup
or publication step.

The preview deliberately omits prepared ground and the bot worker library.
Its only intended next probe is a local hotseat first-render smoke. It is not
rendered or browser-accepted by the packer, and is not an offline-completeness,
bot, native/GPU, release, hosting, or publication claim. The cache manifest
paths and hashes are compared with the independent Linux emission/readback
receipt and the cache-set verifier; this Windows checkout does not establish
that the Linux artifacts are locally present or cross-host identical.
Serve only on a dedicated local origin/browser profile for the first online
smoke: the inherited service worker uses an origin-global `rift-bend-v1-*`
cache family and can evict another Bend preview's offline cache on the same
origin. Offline behavior is intentionally not accepted here.

Run the single active preview contract and shared packaging-helper suite with:

```powershell
node bend2/toolchain-patches/2032/browser-preview-v2/test.mjs
```

The superseded v1 executable suite and its unused bundle-fixture machinery were
removed after migrating asset packaging/provenance, runtime size/hash tampering,
no-overwrite writes and actual output-symlink rejection into v2. OS-denied file
symlink creation is an explicit skip. Synthetic packaging does not accept a real
static package or browser run. Retain this packer and its exported file/asset
helpers: the v2 packer imports them. Historical v1 receipts and the runtime
provenance below remain unchanged.

After a real source-bound worker bundle and cache set are available on the
machine doing the pack, provide both inputs explicitly. On Windows, the Bend
wrapper selects the pinned local Bun executable:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2032/browser-preview/pack-static.mjs --manifest <bundle-manifest-path> --sha256 <independently-supplied-manifest-sha256>
```

On Linux, that wrapper defaults to the Windows executable path. Set `BUN_BIN`
to the verified local runtime or invoke it directly:

```sh
BEND_NO_TELEMETRY=1 BUN_BIN=.artifacts/toolchains/runtime/bin/bun node bend2/tools/bend.mjs --run bend2/toolchain-patches/2032/browser-preview/pack-static.mjs --manifest <bundle-manifest-path> --sha256 <independently-supplied-manifest-sha256>
```

The expected SHA must come from a separate trusted readback, not be computed
from the selected manifest by the packer. The output path is printed only after
the complete local package and byte map have been written.

## Guarded local browser runtime alternative

The first Linux browser request stopped before launch: the isolated clone had
neither a resolvable Playwright package nor a Chrome channel. Cached Chromium
and Playwright in another local project are *not* silently substituted. The
existing `bend2/tests/browser-v2-live.mjs` keeps its project-local Playwright/
system-Chrome default. Its optional cached-runtime path requires nine explicit
inputs: `BEND_LIVE_PLAYWRIGHT_ENTRY`, `BEND_LIVE_PLAYWRIGHT_SHA256`,
`BEND_LIVE_PLAYWRIGHT_PACKAGE_SHA256`, `BEND_LIVE_PLAYWRIGHT_TREE_SHA256`,
`BEND_LIVE_PLAYWRIGHT_CORE_DIR`, `BEND_LIVE_PLAYWRIGHT_CORE_TREE_SHA256`,
`BEND_LIVE_BROWSER_EXECUTABLE`, `BEND_LIVE_BROWSER_SHA256`, and
`BEND_LIVE_BROWSER_VERSION`. Both complete local package trees are bounded,
hashed before import and rechecked after. The runtime must be an explicitly
reviewed stable host-local dependency tree, not a remote supply-chain proof.

This mode also requires an absolute exact `BEND_LIVE_BUILD_JSON` path,
`BEND_LIVE_BUILD_SHA256`, and `BEND_EXPECTED_BUILD`; a fresh absolute
`BEND_LIVE_ARTIFACT` direct child of ignored
`.artifacts/bend2/2032-browser-live/`; and `BEND_TEST_URL` on a new non-default
`127.0.0.1` loopback port. It checks served `build.json` and every package
file hash before browser launch. Older cached Chromium may be incompatible
with Playwright 1.63, and this package lacks prepared ground and bot Worker
libraries. `node bend2/tests/browser-v2-runtime.test.mjs` tests only module
selection and byte guards; it does not launch or accept a browser, canvas,
offline mode, hosted release, or device performance. The explicit path needs
exact Linux identities and a fresh bounded run request.
