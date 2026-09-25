# Reproduction and review order

> This is the packet's original portable-root procedure. The local package
> resides under `bend2/lib/graphics/v2/`; use its
> [integration commands](../INTEGRATION.md) for this Windows checkout. Original
> receipt paths below remain historical provenance.

All commands below run from the extracted `graphics-v2-pro-checkpoint` root unless
stated otherwise. Historical absolute paths in raw receipts describe this run;
the tools locate the delivered tree relative to their own files. Nothing below
requires changing frozen v1, grid8, the compiler or the compiler pin.

## Inspect the delivered demo without a compiler

```sh
python review-third/demo/serve.py
```

Open the loopback address printed by the server. The output includes the actual
compiler-emitted modules and build/source-closure hashes. Use the scene controls,
worker selector, timeline, visibility toggle and PNG export. Warm partial frames
and cold scene changes are different workloads. The host page intentionally owns
its visual layout and all application geometry. It is not a game distribution.

Direct `file://` opening is not the supported module-worker path. Normal HTTP
navigation could not be tested inside this container because Chromium policy
blocks every URL; actual browser execution used the in-memory fixture described
below. The included loopback server remains a local integration gate.

## Restore the exact unmodified compiler

Use the supplied Bend source checkout at the exact commit from
`bend2/TOOLCHAIN.json`: `d37909174ebd664338ae3194799a9e0899dedd51` (Bend 2.0.27).
Place the clean Git checkout at `.artifacts/toolchains/bend`, or point the
`BEND_COMPILER` environment variable to it. The checker refuses a mismatched HEAD
or dirty tracked compiler files. `.artifacts` and the compiler are not in this ZIP.
Do not initialize a made-up history or change the pin just to pass this gate.

This run used Node v22.16.0 with experimental TypeScript stripping. Pinned Bun
1.4.2 was absent, so its wrapper remains a separate local gate. The real compiler
was used; this is not the earlier source-subset harness.

## Core source, oracle and deliberate fault gates

```sh
python bend2/lib/graphics/v2/tools/verify_third.py
```

This checks all 15 new production Bend modules, the eight new proof witnesses,
native fixtures and benchmark Bend sources (24 closure checks in this delivery),
host/demo/test syntax, and four independent-oracle suites. It then copies the
library into ignored build storage, changes only one arithmetic/boundary expression
per mutant, and requires the **unchanged oracle** to fail with an assertion. It
never mutates the delivered production sources. No new exclusions are permitted.
The final receipt directory is `review-third/receipts/final-verification/`.

To repeat the unchanged preceding suite too:

```sh
python bend2/lib/graphics/v2/tools/verify_expansion.py --output review-third/receipts/baseline-rerun
```

The current pass already recorded 85/85 historical gates under
`review-third/receipts/baseline/`. `verify_third.py --baseline` can invoke that same
command as an optional final gate. Neither this run nor the old suite fills the
two historical unproved F32 candidates; those statements and failed witnesses
remain exactly as delivered before.

## JavaScript performance and pixel comparisons

Run from the compiler's `bend2` working directory so the unmodified loader resolves
its own relative runtime files. Use an absolute path to the delivered library;
replace the shell variable values with your actual extracted checkout paths.

```sh
export BEND_NO_TELEMETRY=1
export GRAPHICS_ROOT="$(pwd)"
export BEND_COMPILER="$GRAPHICS_ROOT/.artifacts/toolchains/bend"
cd "$BEND_COMPILER/bend2"
PERF_OUTPUT="$GRAPHICS_ROOT/review-third/receipts/performance-rerun.json" \
node --stack-size=8192 --experimental-strip-types --import ./main.ts \
  "$GRAPHICS_ROOT/bend2/lib/graphics/v2/bench/third.mjs"
PERF_OUTPUT="$GRAPHICS_ROOT/review-third/receipts/path-performance-rerun.json" \
node --stack-size=8192 --experimental-strip-types --import ./main.ts \
  "$GRAPHICS_ROOT/bend2/lib/graphics/v2/bench/third-path.mjs"
```

The first benchmark reports sprite preparation, cached full redraw, cache-miss
prepare-and-draw, retained JS object-node counts and complete blur-pipeline times.
The second compares balanced versus retained left-deep contour traversal, checks
every grid point outside timing and rotates timing order. The final path receipt
is `path-performance-final.json`; the earlier `path-performance.json` is preserved
as the first measurement with aggregate sweep checks and separate oracle tests.
No noisy microsecond test has a wall-clock pass threshold.

## Native CPU execution

Install a local C11 clang and run:

```sh
python bend2/lib/graphics/v2/tools/native_third.py --output review-third/receipts/native-rerun
```

The script emits with the unmodified compiler, builds with
`clang -std=c11 -O3 ... -lpthread -lm`, compares complete fixture pixels at one and
four workers, then performs five rotated whole-process samples per configuration.
It records commands, stdout/stderr, source/C/binary hashes, host model, CPU affinity
and container limits. Native binaries and generated C live only under ignored
`.artifacts`. `--gpu off` is intentional: explicit offload is tested as CPU fallback,
not device execution. The final run here is `receipts/native-final/`; the initial
`receipts/native/` run is also preserved.

## Regenerate browser modules and run actual browser tests

```sh
python bend2/lib/graphics/v2/tools/build_third_demo.py
python bend2/lib/graphics/v2/tools/browser_third.py --chromium /usr/bin/chromium
```

The Python runner requires Playwright and a locally installed Chromium. The
provided `--chromium` path is this container's executable; pass the appropriate
local path on another machine. `--skip-showcase` runs the real worker/Canvas gates
without the slower visual gallery. No downloads are attempted by these tools.

The browser fixture runs in about:blank because the environment rejects every URL
navigation. Static ESM import locations and application task endpoint injection
are rebased to in-memory data URLs. **Real module workers** execute the actual
compiled Bend fixture, transfer real output buffers and compare against the native
pixel reference; separate scalar tasks inject malformed results, timeouts, setup
failures, stale requests and cancellation. Real Canvas2D bytes are read back.
No browser policy is changed, no fake worker is substituted, and no GPU is claimed.
The rebasing/source hashes and this limitation are in the receipt. HTTP serving,
CSP and production cache behavior still require a normal-browser integration run.

The historical native reference required by this script is already in the ZIP at
`review-third/receipts/native/reference.json`; its pixels match the final native
reference. Rebuilding native tests can refresh it deliberately. Do not confuse
stored expected bytes with a new device execution result.

## Native type/effects plate without distributing a font

The sixth visual uses a local font through Pillow only to produce native 8-bit
coverage and metrics. The PMA ink, signed-bearing placement, all composition,
shadows, blur and material masking run through compiled Bend. Supply your own font:

```sh
python bend2/lib/graphics/v2/tools/render_third_plate.py --font /absolute/path/to/your-font.ttf
```

`--expected-sha256` can pin the local font. Exact font hash, name, Pillow version,
render-source hash and final PNG hash from this run are in
`receipts/effects-plate.json`. Coverage data exists only in ignored temporary
storage. Neither a font binary nor reusable generated glyph data is in the ZIP.
Using a different font is expected to change the visual artifact; it is not a
regression oracle or a proof of text shaping.

## Delivery integrity and review patch

Run `python verify_third_delivery.py` before review. Its separate third-pass
manifest covers the full delivered payload. Older manifests and receipts retain
their original historical scope; they were not rewritten to include new files.
`review-third/third-code.patch` contains the new reviewable source/tests/tools/docs;
receipts, compiled output and PNGs accompany it as payload rather than text hunks.
The patch is against the exact **second delivery**, not the original first-pass
archive. See `review-third/PATCH_REVIEW.md` for its path inventory and application
receipt. The full integrated tree is already ready for review—applying its patch
to that same tree a second time is not required.
