# Reproduce the expansion checks and visuals

> This is the packet's original portable-root procedure. The local package
> resides under `bend2/lib/graphics/v2/`; use its
> [integration commands](../INTEGRATION.md) for this Windows checkout. Original
> receipt paths below remain historical provenance.

## Exact inputs and environment

This pass starts from `graphics-v2-library-review-436313f9.zip`, the previous
portable delivery, not from a live game/native checkout. The additionally supplied
Bend source checkout resolves to the existing pin:
`d37909174ebd664338ae3194799a9e0899dedd51` (Bend 2.0.27). Its tracked files were not
patched and `bend2/TOOLCHAIN.json` is unchanged. The included source archive had
line-ending differences in its working tree; execution used a separate clean
checkout from its Git objects, not a compiler-source repair.

The pinned **Bun 1.4.2 was not present**. This pass used Node v22.16.0 with
experimental TypeScript stripping to invoke the unmodified upstream checker,
ownership checker, emitter and module loader. These are actual compiler results,
not the previous portable source-subset harness. They are not a claim that the
normal pinned-Bun wrapper has run. Node warns about its experimental host feature;
that warning is retained in raw stderr receipts.

Example preparation from the supplied compiler Git checkout, in a POSIX shell:

```sh
# Run from this portable tree. Substitute the path to your supplied checkout.
git clone --local --no-hardlinks --no-checkout /path/to/supplied/bend \
  .artifacts/toolchains/bend
git -C .artifacts/toolchains/bend -c core.autocrlf=false checkout --detach \
  d37909174ebd664338ae3194799a9e0899dedd51
export BEND_NO_TELEMETRY=1
```

`BEND_COMPILER` can instead select another **clean checkout of that exact commit**.
The adapter verifies commit identity and rejects tracked source dirtiness. It
checks the complete import closure, sibling Laws, ownership, open holes and
non-Base unsafe/foreign definitions. It does not modify the compiler or approve a
pin update. Paths in raw receipts reflect the execution container; source hashes
and scripts make them relocatable.

## Required library gates

```sh
python bend2/lib/graphics/v2/tools/verify_expansion.py
```

This executes five completed proof entrypoints; original library/asset/grid8
finite regressions; new renderer, sampling, material, text, utility, stroke,
host-boundary and native-reference tests; original offline asset tests; and actual
source checks for production modules and existing Bend examples. It writes
`review-expansion/receipts/required-gates/summary.json` and both streams per gate.
It never substitutes the historical surrogate for a missing compiler.

Standalone unfilled `contracts/expansion/presentation/LAWS.bend` is deliberately
**not a completed proof entrypoint**. Its original two meanings are preserved;
failed witnesses and the F32 normalization discriminator are retained. Consult
the contract ledger before interpreting the 62 completed declarations.

An optional local font test may be enabled with `REVIEW_FONT_PATH`. For example,
set that environment variable to a font you are entitled to use, then run the
same command. The font test hashes its input, exercises pin rejection, regenerates
masks and retains provenance. It does not bundle or install a font.

The initial broad scan also launched the unchanged `grid8/tests/delta.ts` demo
**benchmark**, which has no correctness assertions. The Node loader worker
exhausted its heap in this 4-GiB-limited container before producing a benchmark
result. That failed attempt remains in `receipts/final-gates/` and is not relabeled
as passing. Required-gate selection now keeps this historical demo behind
`--historical-benchmarks`; its source, arguments and assertions were not altered.
This is not a weakened pixel test or a repaired grid8 implementation.

## Direct source and finite entrypoints

```sh
V="$PWD/bend2/lib/graphics/v2"
node --experimental-strip-types "$V/tools/actual_compiler.mjs" check \
  "$V/contracts/expansion/PROOF.bend"

# Follow the upstream loader's working-directory convention.
cd .artifacts/toolchains/bend/bend2
node --stack-size=8192 --experimental-strip-types --import ./main.ts \
  "$V/tests/expansion/sampling.mjs"
```

The adapter also supports `js input.bend output.mjs` and
`c input.bend output.c`. All paths supplied to it should be absolute, because
compiler effects/Base paths resolve from the upstream compiler directory.

## Negative controls

```sh
python bend2/lib/graphics/v2/tools/negative_expansion.py
```

The tool copies only library source into a disposable directory, mutates the
alpha-rounding constant or painter order, and runs the **unchanged assertions**
through the real compiler. A control counts only when an AssertionError is
reached; import/typecheck failures are not accepted. Production sources are never
modified. Exact mutations and before/after hashes are in the receipt.

## Native CPU and offload fallback

```sh
python bend2/lib/graphics/v2/tools/native_expansion.py --samples 5
```

Requires clang and a native CPU runtime supported by the supplied compiler. The
recorded host used clang 17.0.0, generic `-std=c11 -O3 -lpthread -lm`, four allowed
CPUs and a four-CPU cgroup quota. No fast-math or GPU execution is requested.
On systems without `taskset`, the script records that no explicit affinity was
set. Adapt these platform-specific build commands deliberately; Windows/macOS
native execution was not tested in this container.

It emits/builds three complete-pixel fixture variants and runs them with 1 and 4
threads. All 4096 pixels per variant/configuration must equal actual emitted-JS
reference output. The explicit offload entrypoint is executed with `--gpu off`:
that verifies a **CPU fallback**, not a GPU device implementation.

For performance, an isolated library copy substitutes only the retained
four-root-walk sampler for the current Gather sampler; all other source is held
constant. Both variants and fork configurations perform the same 16-frame
512-square, 64-mapped-image workload with full-image checksums. Timing starts
outside each process and includes startup, immutable scene preparation, 16
render/checksum rounds and output. One warmup precedes five measured samples;
configuration order rotates/reverses across rounds. Never divide this workload
into an advertised input-to-paint frame rate.

Generated C, binaries and the before-variant copy go under ignored `.artifacts`.
They are intentionally absent from the ZIP. Source closure, exact C/binary hashes,
commands, raw timing samples and outputs are retained in `native-final/`.

## Prepared versus immediate API benchmark

From the compiler's `bend2` directory, as above:

```sh
node --stack-size=8192 --experimental-strip-types --import ./main.ts \
  "$V/bench/prepared-vs-immediate.mjs"
```

This compares retained `MaskedStamp` immediate calls against new prepared full
render and genuine one-sprite movement/damage repaint. Source generation and
command creation are outside the timing. Tile preparation, render-only,
prepare-plus-repaint and typed-array readback are reported separately. The
aligned-grid case displaces one sprite: it is not a claim that every measured
sprite remains aligned. There are seven samples after three warmups, with rotated
execution order, exact full-raster checks and all raw times retained. It does not
measure Canvas upload or a browser event loop.

The earlier `bench/expansion.mjs` belongs to exploratory receipts. Its original
`opaque-aligned` pose formula was incorrect (`%(size-63)`); those rows cannot be
used for alignment claims. The rejected uniform-mask specialization is no longer
production code. Read PERFORMANCE.md before using any exploratory numbers.

## Actual library-rendered visual artifacts

`examples/render-expansion.mjs` creates five app-neutral specimens with actual
emitted Bend modules. Scene layout is deliberately example-owned. No reference
artwork or browser text draw is substituted for library pixels. PNG encoding and
RGBA readback are separately timed. These one-off capture times are not benchmark
medians or browser screenshots.

The supplied PNGs use temporary, hash-pinned Lato Medium native glyph bakes at
24 and 40 pixels. Only their provenance and rendered images are included—**no
font binaries or generated font-data modules**. To regenerate, provide a local
licensed font, select its SHA explicitly, and run:

```sh
R="$PWD"
V="$R/bend2/lib/graphics/v2"
FONT=/path/to/your/local/font.ttf
SHA=$(sha256sum "$FONT" | cut -d' ' -f1)
mkdir -p "$R/.artifacts/visual-fonts"
python "$V/tools/bake_font_native.py" "$FONT" \
  "$R/.artifacts/visual-fonts/Native24.bend" --sha256 "$SHA" --px 24 --alpha-bits 8
python "$V/tools/bake_font_native.py" "$FONT" \
  "$R/.artifacts/visual-fonts/Native40.bend" --sha256 "$SHA" --px 40 --alpha-bits 8
cd "$R/.artifacts/toolchains/bend/bend2"
VISUAL_FONTS="$R/.artifacts/visual-fonts" \
VISUAL_OUTPUT="$R/review-expansion/visuals" \
node --stack-size=8192 --experimental-strip-types --import ./main.ts \
  "$V/examples/render-expansion.mjs"
```

Font source, rasterizer version or platform changes can change pixels. The
native-font/old-atlas specimen deliberately labels different font/rendering
paths; it is not a controlled same-font, same-size alpha-bit-depth comparison.
Source filenames and hashes are retained in each native-font provenance JSON.

## Delivery integrity

Run the new top-level `verify_expansion_delivery.py` after extraction. The previous
`MANIFEST.json`, `DELIVERY_MANIFEST.json`, `changes.patch`, `REVIEW.md` and `review/`
remain untouched historical artifacts. The new manifest describes this expansion;
old manifests do not define its new files. `expansion-code.patch` applies to the
previous delivery's portable tree and intentionally excludes generated receipts
and PNGs, which are supplied directly. The packaging receipt verifies patch
application and byte equality for every patched payload file.
