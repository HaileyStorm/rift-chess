# Bend 2.0.32-2 browser Worker bundler candidate

This is a separate candidate for bundling the existing browser Worker and
sprite-helper entrypoints with the four explicitly selected Bend caches. It
uses `cache-set-v2/verify.mjs` and the `rift-bend-selected-cache/2032-2`
manifest contract; the canonical 2.0.27 loader, the historical 2032-1 bundle
candidate and static packer, and their receipts are unchanged. A separately
versioned browser-preview-v2 packer candidate now consumes this bundle format.
The cache receipt pin is armed below; a real cache-bound bundle passed on
Linux. The static packer's exact bundle pin is armed only on this pre-height
diagnostic branch. No static package or rendered browser gate has run.

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
silently accepted as evidence for the new verifier. The
[same-source Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5929482307)
verified the exact four-cache outputs and ran one Bun 1.4.2 Worker/helper
bundle; the [independent readback](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5930184246)
then checked the complete manifest and retained inputs/outputs. Do not infer
browser rendering, static packaging or current-height visual parity from it.

The runner also retains the local Bun version/executable binding, cache-only
loader, fetch-denial guard (not complete network isolation), clean versioned-source binding, two-output
`Bun.build` configuration, unique ignored run directory, exclusive
identity-checked lease, `wx` output creation, cache/source/output rechecks,
and no-overwrite final-manifest commit. It emits only a Worker and its sprite
helper to ignored `.artifacts/bend2/2032-browser-probe-v2/`. It does not
generate Bend caches, render a page, execute a browser, or make a static app
package. This successful bundle does not prove browser behavior,
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

For a separately authorized replay, invoke with
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
clean. No browser render or static package is part of this gate.
