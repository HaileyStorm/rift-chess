# Camera-facing wall bands during active orbit: local draft

The [published composition checkpoint](../v2-composition/README.md) has
settled topology-aware walls, but its 128px active-orbit ground is flat.
This source-dirty Bend 2.0.27 draft adds only camera-facing exposed wall
facets during orbit, at the outer perimeter and rifts. It keeps the
existing one-pass `SpatialFast` tile tops. A dedicated
[`MotionWall.bend`](../../../graphics/v2game/MotionWall.bend) clips each
projected wall to the same inverse affine/presence mask used by the tops;
present tile pixels are not overwritten. Full wall coverage at oblique
angles replaces a rejected endpoint-trim/one-tile-repair heuristic that
spilled at other pitches and zooms. The frozen laws, generic graphics
primitives, runtime parallelism and original TypeScript site are unchanged.

The strengthened BoardEdgesTest checks facing edge colors at nine yaws,
sampled rift and perimeter top masks at 128px and 512px, and a 288-view
camera sweep (24 yaws × four pitches × three zooms) with zero sampled
spills. An independent review found that opened-vs-closed image comparison
could hide common perimeter overdraw. Absolute palette top-center checks
now cover all present squares: 27,260 centers across that sweep plus 160
near-cardinal/alternate-hole/two-theme variant views, all passing. These
are finite selected-JS pixel checks, not a geometry proof or native device
differential. The pinned checker reports `All terms check.`

The local draft browser build is `4ac79468f49425b6fec3` from a dirty
checkout, with BoardScene SHA-256
`4dd35c46c8e0e6310f91979628163f70e0117641d5cb3cf26740909be35c4150`
and MotionWall SHA-256
`bc5e059d021327596e32b9f1ce8449fc1085dfbb1229a428ae49990003558f86`.
A real Chrome held-pointer drag passed, with eight input events, ten rendered
frames, zero page errors and a sampled 47.9 ms pixel p90 in the drag reply.
The ignored local motion capture
`.artifacts/bend2/v2-preview/orbit-mask-4ac-20260927/browser-v2-orbit-motion.png`
was visually compared with the old flat capture; its SHA-256 is
`e6e8ea3dac15d354844fca7998f27b6adeae1e5cacbb0e3319856995eff01831`.
The board has visible dark outer/rift bands during drag but still uses
intentionally coarse proxy sprites until the settled refinement. The
local settled desktop PNG remains byte-identical to the published
composition capture (`e0f4f125954f6dee919cbe735141254c9ce718ffe71949d09f39a44e1b85cf93`). The
extended local Chrome scenario bound served `build.json` and passed all
13 groups with zero errors, including offline, audio, themes, Shift,
promotion and portrait. Its ignored receipt is
`.artifacts/bend2/v2-preview/scenarios/orbit-mask-4ac-20260927/receipt.json`,
SHA-256 `7e06e0802c1015095db2d9a2731b88918e632c87d32e098924180fe64f77633e`.
The compact-vs-expanded composed image gate matched 60,817,408 bytes;
root TypeScript checking and 62/62 original app tests passed.

At this draft checkpoint it had not been published, run on Linux native
CPU/GPU, or approved by the owner. One warm selected-JS 128px ground-construction sample had
median 33.16 ms and p90 50.23 ms across 25 iterations; it is not a stable
browser frame budget. The exact earlier Linux result applies only to the
older published composition source `4f6e52f`.

## Clean build and hosted preview

After source commit `68411c4a6103dd88560cbf71dd5d5812df97a872`
(tree `c2193270a28dff5476cefe9f304d593e8d177aa6`), the clean
non-draft pinned-2.0.27 build reproduced the exact draft content version
`4ac79468f49425b6fec3` with `sourceDirty: false`. Its `build.json`
SHA-256 is `c9a049cd6fa9e67c93ebe9e24b0172161d7e2ff0e2240e2e58f4351b9b1e4bab`.
The separate free [Bend browser preview](https://haileystorm.github.io/rift-chess-bend2/)
now serves Pages commit `2252b0ae89bcb9bb5098cd6bae86d17a55ce983b`.
Older hashed assets were retained for previous visitors. The first public
check ran before Pages finished and saw the old deployment; its failed
receipt is preserved at
`.artifacts/bend2/publication/2026-09-27T22-15-28-045Z-f68850ad/`.
The subsequent ignored receipt
`.artifacts/bend2/publication/2026-09-27T22-16-09-158Z-6e84e22e/receipt.json`
(SHA-256 `26d9fc146c1728c0fc8869459124bff111dff777828192af2753a36664187532`)
verified all 22 manifest-listed live files and two unchanged original
TypeScript-site baseline files. The hosted real Chrome scenario bound
served `build.json` to the clean local manifest and passed all 13 groups
with zero errors, including offline, PCM, themes, Shift, promotion and
portrait. Its ignored receipt is
`.artifacts/bend2/v2-preview/scenarios/hosted-orbit-mask-4ac-2252b0a-20260927/receipt.json`
(SHA-256 `56a5905961d36423f7b41aeac46c39633386bb700bafe54dc9e4aa673bd2f63e`).
The hosted initial desktop PNG is byte-identical to the prior settled
composition capture. These are public-browser facts, not the owner's
subjective approval, native source-parity, or GPU performance.
One [CPU-only Linux retest request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5860391255)
now binds exact clean source `68411c4`, its tree, new `MotionWall` and scene
hashes, builder/pin/camera/record/probe bytes, the 88 GiB admission gate and
one fresh native package/X.Org/PCM/restart probe. It explicitly excludes
CUDA/GPU and a 2.0.32 pin move. At request time no response had been treated
as acceptance.

## Exact-source Linux CPU/X.Org/PCM/orbit result

The [one-run Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5860542619)
binds clean source `68411c4` and tree `c2193270`, all seven requested file
pins and the clean 2.0.27 compiler. Its read-only preflight passed the
147-file source closure, seven runtime assets, X11/ALSA link and 88 GiB
admission floor; the least observed host MemAvailable before C emission was
114,307,133,440 bytes. Five visible nonroot cgroup ancestors were unbounded,
but an unseen stricter ancestor cannot be ruled out. One CPU package build
passed in 455.73 seconds with 71,639,564 KiB (68.321 GiB) peak RSS.
Package receipt SHA-256 is
`70cd357681f454ca6702c6392b1bb142748ace993019dad427db14b740c6d4a7`;
C SHA-256 `1c02fb42883aad3c3c56f5e30189ad8bf5b01fba44e1cfa72eab2bfc7448e7e4`;
ELF SHA-256 `1931d4a658b2273ce136b95fea3e6bd2b7ff059dd56cc969932d161432ba5a02`.
All package and receipt files matched their size/hash records.

The receipt-bound ELF passed a real X.Org :1 1024×640 window, g1
select/deselect, g1-h3, Escape live, WM close, and relaunch from the same
fresh data directory showing Black to move and a knight at h3. A bounded
held-right-button orbit produced a coarse motion PPM SHA-256
`a663feb1800779f54ff9ebe065a441234755cbcc65ccf31686caaacad38157a6`
and settled full-detail PPM SHA-256
`0fdab15a0e4988e98859b9bc21e9f55477875675d4efeb46749e01b4a4d46d4c`.
The 56.818 ms motion and 206.552 ms release-to-stable observations include
20 ms polling, intentional waits and XGetImage overhead, not pure render
latency or a throughput guarantee. The host visually inspected those frames.
The PipeWire HDMI monitor captured idle silence and 12,762 nonzero 48 kHz
stereo s16 move samples with no clips, not physical audibility.

This closes the requested exact-source Linux CPU/window/routed-PCM/orbit
pilot, not Windows-native acceptance, owner visual approval, or GPU parity.
The earlier source's C, ELF and frames were not reused. One separate
[CUDA pilot request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5860739585)
requires a fresh coordinator grant before any device execution and may
reuse only the new receipt-bound C after independent hash checks.

## Exact-source leased CUDA presentation pilot

The [one-run Linux GPU result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5860926260)
verified that CPU receipt/C/ELF/asset closure, acquired a fresh GPU
coordinator lease, then reused only the new C to link a CUDA ELF (SHA-256
`da8b3ecae0e0eb3e0edec9a67154243ee98c94fa360cfe2cc93f00af12a219c7`)
and build its sidecar (SHA-256
`f6f6463d3b5819a18383c12c9fc4bbc324dd311b27c662655e1691814eb49044`).
`nvidia-smi` matched the exact process under `--gpu on` on an RTX 5090
(driver 595.84, CUDA 13). The 36 lease checks authorized while working;
the lease was withdrawn and post-withdrawal validation denied further use.
Linux-local evidence SHA-256 is
`8f7049050bdcc8c65aca1863d8a705a399f87f7b80346afdc1f0be3693c61be3`,
with separate lease-closure SHA-256
`98f116b804f3559a055b4cfb480f619be6597ff79a488b17d4e716a83d0adb78`.

The receipt-bound CPU ELF, CUDA ELF `--gpu off`, and CUDA ELF `--gpu on`
matched initial, selected, completed g1-h3 and held-orbit/settled 1024×640
frame bytes on real X.Org. The ordinary synthetic 250 ms second-click
deselection capture **failed on GPU-on**: it remained selected while CPU/off
returned to initial. This reproduced; a diagnostic helper waiting 1,000 ms
after each click passed on GPU-on. It proves eventual matching state under
that slower cadence, not original-cadence input/presentation parity. The
held and settled orbit PPM hashes matched the CPU pilot exactly. Direct ELF
comparison required explicit `--gpu off/on`; the package launcher separately
sets its documented default-off policy. Whole-process and X11 capture times
include startup, waits and transfer overhead; device fill/readback were not
separately timed for this source. Do not infer a speedup, delivered FPS,
default automatic GPU policy or owner visual approval. The 250 ms finding
remains open for input-versus-presentation timing diagnosis under a future
fresh lease, not a reason to weaken the check.
One [observer-only diagnostic request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5861118746)
now asks the Linux owner to reuse that exact ELF/sidecar under a new lease,
timestamp the second-click event consumption and submitted frame, and poll
a bounded g1 region through one second. It does not authorize a new build or
turn the original 250 ms failure into a pass. No diagnostic result is yet
claimed.
