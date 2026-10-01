# Bend 2.0.32-2 browser Worker bundler candidate

This is a separate candidate for bundling the existing browser Worker and
sprite-helper entrypoints with the four explicitly selected Bend caches. It
uses `cache-set-v2/verify.mjs` and the `rift-bend-selected-cache/2032-2`
manifest contract; the canonical 2.0.27 loader, the historical 2032-1 bundle
candidate and static packer, and their receipts are unchanged. A separately
versioned browser-preview-v2 packer candidate now consumes this bundle format.
The cache receipt pin is armed below; the static packer's separate bundle pin
remains unarmed. A real cache-bound bundle has now run on Linux; no static
package or rendered browser gate has run on that 2.0.32 output.

The reviewed [four-cache receipt](receipts/stable-tag-41e48d9.json) records the
independent Linux host-local readback from
[comment 5924179844](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5924179844).
[`approved-receipt.mjs`](approved-receipt.mjs) separately pins its committed
raw bytes and source revision/tree. A caller's receipt plus caller-computed
hash alone cannot arm the bundler. The receipt names each exact
repository-relative manifest path, raw manifest SHA-256, output byte count and
SHA-256, plus the common cache source commit and tree (repeated per module so
mixed bindings fail closed). The runner requires both `--receipt` and
`--receipt-sha256`; it rejects an untracked/modified, non-regular, reparse, or
mislocated receipt. The four paths passed as `--menu`, `--controller`,
`--scene`, and `--chrome` must match that receipt byte-for-byte.

The older Linux receipt belongs to the historical cache path and is not
silently accepted as evidence for the new verifier. The corrected same-source
four-cache [Linux bundle result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5929482307)
verified the exact policy-floor ancestry, passed 28 cache-set tamper controls,
and ran the real v2 verifier and one Bun 1.4.2 Worker/helper bundle. Independent
host-local readback bound its 6,061-byte manifest SHA-256
`ccdaf2e4048f9278e4db4436d646d508b5bdc87533446212dd5eb62ca67b6656`
and both output hashes. This is CPU bundle evidence, not static packaging,
browser rendering, or approval of the separate static-bundle pin.

The runner also retains the local Bun version/executable binding, cache-only
loader, fetch-denial guard (not complete network isolation), clean versioned-source binding, two-output
`Bun.build` configuration, unique ignored run directory, exclusive
identity-checked lease, `wx` output creation, cache/source/output rechecks,
and no-overwrite final-manifest commit. It emits only a Worker and its sprite
helper to ignored `.artifacts/bend2/2032-browser-probe-v2/`. It does not
generate Bend caches, render a page, execute a browser, or make a static app
package. The successful bundle does not prove browser behavior,
application compatibility, offline completeness, native/GPU behavior,
publication, or pin adoption.

The provider-free input contract check is:

```powershell
node bend2/toolchain-patches/2032/browser-loader-v2/test.mjs
```

It covers missing and malformed receipt inputs, duplicate manifest paths, and
mixed source commit/tree bindings. Its synthetic data exercises receipt shape,
unarmed pin rejection, and in-memory cache-result matching only; it does not
invoke the cache verifier or claim a real positive cache result. The recorded
source-file list includes direct Worker/helper TypeScript imports and the
wrapper/preload; clean HEAD/tree and pre/post checks bind the wider checkout.
They do not make a mutable filesystem an atomic input snapshot against
transient swaps.

For a separately authorized replay after the 2032-2 receipt and reviewed pin, invoke with
the repository-local Bun 1.4.2 through the project wrapper:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/tools/bend.mjs --run bend2/toolchain-patches/2032/browser-loader-v2/bundle-real.mjs `
  --receipt bend2/toolchain-patches/2032/browser-loader-v2/receipts/<receipt>.json `
  --receipt-sha256 <independently-read-raw-receipt-sha256> `
  --menu <menu-manifest> --controller <controller-manifest> `
  --scene <scene-manifest> --chrome <chrome-manifest>
```

The candidate requires its source and receipt to be committed and the checkout
clean. Do not rerun the passed one-shot merely to exercise this command. No
browser render or static package is part of this gate.
