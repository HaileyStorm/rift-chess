# Bend 2.0.32-2 static browser packer candidate

This is an isolated follow-on to the 2032-1 static preview packer. It verifies
the `rift-bend-selected-cache/2032-2` manifests with
[`cache-set-v2/verify.mjs`](../cache-set-v2/verify.mjs), requires the
`browser-loader-v2/receipt.mjs` receipt contract, and accepts only the
`rift-bend-2032-worker-bundle-probe-v2/1` Worker manifest from the v2 bundler.
It reuses the v1 packer's safe file and asset helpers; the v1 packer and shared
`bend2/platform/browser/sw.js` are unchanged.

Two independent source pins must be reviewed before packaging can run:

- [`browser-loader-v2/approved-receipt.mjs`](../browser-loader-v2/approved-receipt.mjs)
  must bind a real four-cache receipt, its exact raw SHA-256, and cache source.
- [`approved-bundle.mjs`](approved-bundle.mjs) must bind the generated Worker
  manifest path, raw SHA-256, source revision/tree, and cache source.

Both are deliberately `null` here. A caller-supplied `--manifest` and
`--sha256` cannot arm the bundle pin, and a self-computed receipt hash cannot
arm the cache pin. The packer derives the four manifest paths from the approved
receipt, re-runs the v2 verifier, and matches the resulting raw manifests and
outputs to the receipt and Worker manifest before packaging.

The pure synthetic contract checks are:

```powershell
node bend2/toolchain-patches/2032/browser-preview-v2/test.mjs
```

They exercise receipt and bundle shape, pins, exact paths/hashes, output/source
bytes, source-tree ancestry, and isolated service-worker activation against
synthetic scopes without reading real cache artifacts/assets, contacting a
provider, or invoking a bundler.

After the independent receipts and source pins have been reviewed, committed,
and the checkout is clean, the real static packer entry point is:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2032/browser-preview-v2/pack-static.mjs `
  --manifest .artifacts/bend2/2032-browser-probe-v2/<run>/worker-v2.manifest.json `
  --sha256 <independently-read-raw-worker-manifest-sha256>
```

It writes a new, ignored, no-overwrite run beneath
`.artifacts/bend2/2032-static-preview-v2/`. The emitted `sw.js` comes from the
v2-only template and qualifies its `rift-bend-v2-` cache namespace by the
registration scope, so one v2 run cannot evict another run's CacheStorage
entry **under a different scope**; an upgrade at the same scope intentionally
evicts its older v2 cache. Use a dedicated loopback origin and fresh browser
profile for each
playtest anyway: registering a new worker at the **same scope** can replace a
v1 worker even though the v1 cache bytes remain. The origin-global v1 worker
and its template are not changed here. The pre/post source snapshots do not
exclude a transient same-path swap during Bun's host build; use an owned,
quiescent source checkout and do not claim atomic source capture from them.

No real 2032-2 receipt or approved pin is present, so real cache verification,
asset/license packaging, host `Bun.build`, static output creation, browser
rendering, and offline behavior remain unrun. The existing
`browser-v2-live.mjs` accepts only static schema `2032-1`; a separate v2 live
browser gate is required for first render. A future successful package
would still not prove browser acceptance, native/GPU behavior, publication, or
release readiness.
