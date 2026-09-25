# Pro graphics expansion and third pass — local DRAFT integration

The reusable library owns these additions. All prior v2 modules and all prior
Law/Proof files remain unchanged; the two historical F32 presentation
candidates remain unfilled. The 12 expansion and eight third-pass declarations
and their proof bodies were copied byte-for-byte from the supplied third-pass
packet. They are DRAFT. The source scheduling equalities are not browser, native
runtime, or GPU-device correctness theorems.

The packet originally put `review-expansion/`, `review-third/`, and the two
top-level review documents at its portable root. The overview documents now
live inside their corresponding review directories, and those directories live
beside this document. The library carries its own API, design, evidence, reproduction
notes, visual studies and complete historical receipts. The packet's original
paths and commands in those receipts are historical provenance, not current
repository paths. Prefix their `review-*` references with
`bend2/lib/graphics/v2/` when running from the repository root. No archived
receipt was relabeled as local evidence. The original extracted packet remains
under ignored `.artifacts/intake-20260925/third/graphics-v2-pro-checkpoint/`.

The static demo's 12 compiled modules were regenerated from the current local
source closure using the clean pinned compiler under Node 24.12. The local
`review-third/demo/compiled/BUILD.json` hashes every current source closure;
`BUILD.pro-review.json` preserves the original Pro build receipt. Pro's raw
demo-build streams remain in `review-third/receipts/demo-build/`, while locally
regenerated streams use `review-third/receipts/demo-build-local/`. The compiler
itself was not patched. Relative imports in the demo, test fixture, and library
tools now point inside this package; the loopback server serves `.mjs` with a
JavaScript MIME type for real module workers. Windows finite-test gates use the
project's pinned Bun wrapper because upstream Node's `.bend` loader mishandles
backslash paths. The legacy test output strings that say “under Node” describe
Pro's original run, not the host used by a local Bun-wrapper rerun.

Run these from the repository root with `BEND_NO_TELEMETRY=1`:

```powershell
node bend2/tools/bend.mjs bend2/lib/graphics/v2/contracts/expansion/PROOF.bend --check-only
node bend2/tools/bend.mjs bend2/lib/graphics/v2/contracts/third/PROOF.bend --check-only
python bend2/lib/graphics/v2/tools/verify_expansion.py --output .artifacts/graphics-expansion-local
python bend2/lib/graphics/v2/tools/verify_third.py --output .artifacts/graphics-third-local
python bend2/lib/graphics/v2/tools/build_third_demo.py
python bend2/lib/graphics/v2/review-third/demo/serve.py --port 8979
```

In another terminal, `node bend2/lib/graphics/v2/tools/browser_http.mjs 8979`
exercises the independent HTTP module-worker protocol, compiled Bend fixture,
Canvas2D readback and failure/cancellation paths in installed Chrome. The
loopback demo is at `http://127.0.0.1:8979/review-third/demo/`. Its scene design
belongs to the example application, while the pixel functions and worker host
remain reusable. No GPU-device execution, browser performance commitment, or
Rift Chess application adoption follows from this library-only gate.

The original complete PNGs, source/negative-control receipts and native Linux
receipts are retained within the review directories for comparison. The latter
describe the Pro machine, not this Windows host. Current local receipts are
written under ignored `.artifacts/` and should be reviewed independently before
promoting any acceptance claim.
